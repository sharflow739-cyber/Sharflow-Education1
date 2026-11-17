-- =====================================================================
-- STANDALONE ADDITIVE MIGRATION: MANUAL bKash / NAGAD PAYMENT SYSTEM
-- Safe to run on top of existing schema. DO NOT rerun global schema.
-- Provides:
--   1. Admin-configured per-provider payment settings (BDT price, number, exact method)
--   2. Signed-in user manual payment claims (no PIN/OTP, private self-read only)
--   3. Atomic admin approval RPC (verifies pending claim + ledger amount,
--      enforces unique accepted provider+TrxID constraint, grants course access)
--   4. Admin rejection RPC with explicit reason
-- =====================================================================

-- 0. Ensure profiles has enrollment status columns (idempotent / safe no-op if present)
alter table public.profiles
  add column if not exists enrollment_status text not null default 'pending'
  check (enrollment_status in ('pending', 'approved', 'rejected'));

alter table public.profiles
  add column if not exists reviewed_at timestamptz;

alter table public.profiles
  add column if not exists reject_reason text;

-- 1. PROVIDER CONFIGURATION TABLE (Unconfigured & closed by default)
create table if not exists public.manual_payment_providers (
  provider text primary key check (provider in ('bkash', 'nagad')),
  is_enabled boolean not null default false,
  price_bdt integer check (price_bdt is null or price_bdt > 0),
  recipient_number text not null default '',
  payment_method text not null default '' check (payment_method in ('', 'send_money', 'payment', 'cash_out')),
  instructions text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint manual_payment_providers_enabled_complete check (
    not is_enabled
    or (
      price_bdt is not null
      and price_bdt > 0
      and recipient_number ~ '^01[3-9][0-9]{8}$'
      and payment_method in ('send_money', 'payment', 'cash_out')
    )
  )
);

-- Seed closed, unconfigured rows with no guessed defaults
insert into public.manual_payment_providers (provider, is_enabled, price_bdt, recipient_number, payment_method, instructions)
values
  ('bkash', false, null, '', '', ''),
  ('nagad', false, null, '', '', '')
on conflict (provider) do nothing;

alter table public.manual_payment_providers enable row level security;

drop policy if exists manual_payment_providers_select on public.manual_payment_providers;
drop policy if exists manual_payment_providers_admin_insert on public.manual_payment_providers;
drop policy if exists manual_payment_providers_admin_update on public.manual_payment_providers;

-- Unconfigured or disabled providers stay closed and hidden from non-admins
create policy manual_payment_providers_select on public.manual_payment_providers
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      is_enabled = true
      and price_bdt is not null
      and price_bdt > 0
      and recipient_number ~ '^01[3-9][0-9]{8}$'
      and payment_method in ('send_money', 'payment', 'cash_out')
    )
  );

create policy manual_payment_providers_admin_insert on public.manual_payment_providers
  for insert to authenticated
  with check (public.is_admin());

create policy manual_payment_providers_admin_update on public.manual_payment_providers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.manual_payment_providers from anon;
revoke all on public.manual_payment_providers from authenticated;
grant select on public.manual_payment_providers to anon, authenticated;
grant insert, update on public.manual_payment_providers to authenticated;

-- 2. MANUAL PAYMENT CLAIMS TABLE
create table if not exists public.manual_payment_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null constraint manual_payment_claims_user_id_fkey references public.profiles(id) on delete cascade default auth.uid(),
  provider text not null check (provider in ('bkash', 'nagad')),
  payment_method text not null check (payment_method in ('send_money', 'payment', 'cash_out')),
  recipient_number text not null check (recipient_number ~ '^01[3-9][0-9]{8}$'),
  trx_id text not null,
  trx_id_normalized text not null check (trx_id_normalized ~ '^[A-Z0-9]{6,32}$'),
  payer_number text not null check (payer_number ~ '^01[3-9][0-9]{8}$'),
  submitted_amount_bdt integer not null check (submitted_amount_bdt > 0),
  expected_amount_bdt integer not null check (expected_amount_bdt > 0),
  verified_amount_bdt integer check (verified_amount_bdt is null or verified_amount_bdt > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_manual_payment_claims_user_created
  on public.manual_payment_claims (user_id, created_at desc);

create index if not exists idx_manual_payment_claims_status_created
  on public.manual_payment_claims (status, created_at asc);

-- Prevent duplicate accepted (provider + TrxID) globally at DB constraint level
create unique index if not exists uq_manual_payment_claims_approved_provider_trx
  on public.manual_payment_claims (provider, trx_id_normalized)
  where status = 'approved';

-- Prevent duplicate identical pending claim from the same user
create unique index if not exists uq_manual_payment_claims_user_pending_trx
  on public.manual_payment_claims (user_id, provider, trx_id_normalized)
  where status = 'pending';

alter table public.manual_payment_claims enable row level security;

drop policy if exists manual_payment_claims_select on public.manual_payment_claims;

-- Private self-read only for signed-in active users; admins read all for review
create policy manual_payment_claims_select on public.manual_payment_claims
  for select to authenticated
  using (
    public.is_admin()
    or (user_id = auth.uid() and public.is_active_user())
  );

-- Direct client INSERT/UPDATE/DELETE blocked; all state transitions go via RPCs below
revoke all on public.manual_payment_claims from anon;
revoke all on public.manual_payment_claims from authenticated;
grant select on public.manual_payment_claims to authenticated;

-- 3. RPC: SIGNED-IN USER SUBMITS MANUAL PAYMENT CLAIM
create or replace function public.submit_manual_payment_claim(
  p_provider text,
  p_trx_id text,
  p_payer_number text,
  p_amount_bdt integer
)
returns public.manual_payment_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_enrollment_status text;
  v_config public.manual_payment_providers;
  v_trx_clean text;
  v_payer_digits text;
  v_payer_clean text;
  v_pending_count int;
  v_recent_count int;
  v_created public.manual_payment_claims;
begin
  v_uid := auth.uid();
  if v_uid is null or not public.is_active_user() then
    raise exception 'পেমেন্ট জমা দিতে অনুগ্রহ করে সক্রিয় অ্যাকাউন্টে লগইন করুন।';
  end if;

  select p.enrollment_status
    into v_enrollment_status
    from public.profiles p
   where p.id = v_uid;

  if v_enrollment_status = 'approved' then
    raise exception 'আপনার অ্যাকাউন্টে ইতিমধ্যেই প্রিমিয়াম কোর্স এক্সেস সক্রিয় আছে।';
  end if;

  if p_provider not in ('bkash', 'nagad') then
    raise exception 'অবৈধ পেমেন্ট মাধ্যম নির্বাচন করা হয়েছে।';
  end if;

  select *
    into v_config
    from public.manual_payment_providers
   where provider = p_provider;

  if v_config.provider is null
     or not v_config.is_enabled
     or v_config.price_bdt is null
     or v_config.price_bdt <= 0
     or v_config.recipient_number !~ '^01[3-9][0-9]{8}$'
     or v_config.payment_method not in ('send_money', 'payment', 'cash_out') then
    raise exception 'এই পেমেন্ট মাধ্যমটি বর্তমানে চালু বা কনফিগার করা নেই।';
  end if;

  v_trx_clean := upper(regexp_replace(trim(coalesce(p_trx_id, '')), '\s+', '', 'g'));
  if v_trx_clean !~ '^[A-Z0-9]{6,32}$' then
    raise exception 'সঠিক ট্রানজ্যাকশন আইডি (TrxID) দিন (৬-৩২ অক্ষরের ইংরেজি বর্ণ ও সংখ্যা)।';
  end if;

  v_payer_digits := regexp_replace(trim(coalesce(p_payer_number, '')), '[^0-9]', '', 'g');
  if v_payer_digits ~ '^8801[3-9][0-9]{8}$' then
    v_payer_clean := substring(v_payer_digits from 3);
  elsif v_payer_digits ~ '^01[3-9][0-9]{8}$' then
    v_payer_clean := v_payer_digits;
  else
    raise exception 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)।';
  end if;

  if p_amount_bdt is null or p_amount_bdt <= 0 then
    raise exception 'সঠিক টাকার পরিমাণ দিন।';
  end if;

  if p_amount_bdt <> v_config.price_bdt then
    raise exception 'নির্ধারিত ফি ৳% এর সাথে আপনার প্রদত্ত পরিমাণ (৳%) মিলছে না।', v_config.price_bdt, p_amount_bdt;
  end if;

  if exists (
    select 1 from public.manual_payment_claims c
    where c.provider = p_provider
      and c.trx_id_normalized = v_trx_clean
      and c.status = 'approved'
  ) then
    raise exception 'এই ট্রানজ্যাকশন আইডি (TrxID) ইতিমধ্যেই যাচাই ও অনুমোদিত হয়েছে।';
  end if;

  if exists (
    select 1 from public.manual_payment_claims c
    where c.user_id = v_uid
      and c.provider = p_provider
      and c.trx_id_normalized = v_trx_clean
      and c.status = 'pending'
  ) then
    raise exception 'এই ট্রানজ্যাকশন আইডি (TrxID) দিয়ে আপনার একটি আবেদন ইতিমধ্যেই যাচাইয়ের অপেক্ষায় আছে।';
  end if;

  select count(*)
    into v_pending_count
    from public.manual_payment_claims c
   where c.user_id = v_uid
     and c.status = 'pending';

  if v_pending_count >= 2 then
    raise exception 'আপনার ইতিমধ্যেই অপেক্ষমাণ পেমেন্ট আবেদন রয়েছে। যাচাই সম্পন্ন হওয়া পর্যন্ত অপেক্ষা করুন।';
  end if;

  select count(*)
    into v_recent_count
    from public.manual_payment_claims c
   where c.user_id = v_uid
     and c.created_at >= timezone('utc', now()) - interval '24 hours';

  if v_recent_count >= 8 then
    raise exception 'দৈনিক পেমেন্ট আবেদন সীমা অতিক্রম করেছে। সাহায্যের জন্য সাপোর্টে যোগাযোগ করুন।';
  end if;

  insert into public.manual_payment_claims (
    user_id,
    provider,
    payment_method,
    recipient_number,
    trx_id,
    trx_id_normalized,
    payer_number,
    submitted_amount_bdt,
    expected_amount_bdt,
    status
  )
  values (
    v_uid,
    p_provider,
    v_config.payment_method,
    v_config.recipient_number,
    trim(p_trx_id),
    v_trx_clean,
    v_payer_clean,
    p_amount_bdt,
    v_config.price_bdt,
    'pending'
  )
  returning * into v_created;

  return v_created;
end;
$$;

-- 4. RPC: ADMIN-ONLY ATOMIC APPROVAL (verifies pending claim + ledger amount + unique TrxID + grants access)
create or replace function public.approve_manual_payment_claim(
  p_claim_id uuid,
  p_verified_amount_bdt integer,
  p_admin_note text default null
)
returns public.manual_payment_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.manual_payment_claims;
  v_updated public.manual_payment_claims;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধুমাত্র অনুমোদিত এডমিন পেমেন্ট অনুমোদন করতে পারবেন।';
  end if;

  if p_claim_id is null then
    raise exception 'পেমেন্ট আবেদন আইডি পাওয়া যায়নি।';
  end if;

  if p_verified_amount_bdt is null or p_verified_amount_bdt <= 0 then
    raise exception 'ভেরিফায়েড লেজার টাকার পরিমাণ সঠিক নয়।';
  end if;

  select *
    into v_claim
    from public.manual_payment_claims
   where id = p_claim_id
   for update;

  if v_claim.id is null then
    raise exception 'পেমেন্ট আবেদনটি খুঁজে পাওয়া যায়নি।';
  end if;

  if v_claim.status <> 'pending' then
    raise exception 'শুধুমাত্র অপেক্ষমাণ (Pending) পেমেন্ট আবেদন অনুমোদন করা যায়।';
  end if;

  if v_claim.submitted_amount_bdt <> v_claim.expected_amount_bdt then
    raise exception 'আবেদনে প্রদত্ত পরিমাণ (৳%) নির্ধারিত ফি (৳%) এর সাথে মিলছে না।',
      v_claim.submitted_amount_bdt, v_claim.expected_amount_bdt;
  end if;

  if p_verified_amount_bdt <> v_claim.expected_amount_bdt then
    raise exception 'ভেরিফায়েড লেজার পরিমাণ (৳%) নির্ধারিত ফি (৳%) এর সাথে মিলছে না।',
      p_verified_amount_bdt, v_claim.expected_amount_bdt;
  end if;

  begin
    update public.manual_payment_claims
       set status = 'approved',
           verified_amount_bdt = p_verified_amount_bdt,
           admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
           reject_reason = null,
           reviewed_by = auth.uid(),
           reviewed_at = timezone('utc', now()),
           updated_at = timezone('utc', now())
     where id = v_claim.id
     returning * into v_updated;
  exception
    when unique_violation then
      raise exception 'এই মাধ্যম ও TrxID (%) ইতিমধ্যেই অন্য একটি অনুমোদিত পেমেন্টে ব্যবহৃত হয়েছে।',
        v_claim.trx_id_normalized;
  end;

  update public.profiles
     set enrollment_status = 'approved',
         reviewed_at = timezone('utc', now()),
         reject_reason = null
   where id = v_claim.user_id;

  if not found then
    raise exception 'ব্যবহারকারীর প্রোফাইল খুঁজে পাওয়া যায়নি।';
  end if;

  return v_updated;
end;
$$;

-- 5. RPC: ADMIN-ONLY REJECTION
create or replace function public.reject_manual_payment_claim(
  p_claim_id uuid,
  p_reject_reason text,
  p_admin_note text default null
)
returns public.manual_payment_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.manual_payment_claims;
  v_reason text;
  v_updated public.manual_payment_claims;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধুমাত্র অনুমোদিত এডমিন পেমেন্ট প্রত্যাখ্যান করতে পারবেন।';
  end if;

  if p_claim_id is null then
    raise exception 'পেমেন্ট আবেদন আইডি পাওয়া যায়নি।';
  end if;

  v_reason := trim(coalesce(p_reject_reason, ''));
  if v_reason = '' then
    raise exception 'প্রত্যাখ্যানের কারণ উল্লেখ করা আবশ্যক।';
  end if;

  select *
    into v_claim
    from public.manual_payment_claims
   where id = p_claim_id
   for update;

  if v_claim.id is null then
    raise exception 'পেমেন্ট আবেদনটি খুঁজে পাওয়া যায়নি।';
  end if;

  if v_claim.status <> 'pending' then
    raise exception 'শুধুমাত্র অপেক্ষমাণ (Pending) পেমেন্ট আবেদন প্রত্যাখ্যান করা যায়।';
  end if;

  update public.manual_payment_claims
     set status = 'rejected',
         reject_reason = v_reason,
         admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
         reviewed_by = auth.uid(),
         reviewed_at = timezone('utc', now()),
         updated_at = timezone('utc', now())
   where id = v_claim.id
   returning * into v_updated;

  return v_updated;
end;
$$;

revoke all on function public.submit_manual_payment_claim(text, text, text, integer) from public, anon;
grant execute on function public.submit_manual_payment_claim(text, text, text, integer) to authenticated;

revoke all on function public.approve_manual_payment_claim(uuid, integer, text) from public, anon;
grant execute on function public.approve_manual_payment_claim(uuid, integer, text) to authenticated;

revoke all on function public.reject_manual_payment_claim(uuid, text, text) from public, anon;
grant execute on function public.reject_manual_payment_claim(uuid, text, text) to authenticated;
