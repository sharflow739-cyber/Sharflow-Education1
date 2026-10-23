-- =====================================================================
-- ABACUS PARENT TRAINING - SECURE SCHEMA (idempotent, safe to re-run)
-- Owner email: rssharifu@gmail.com
-- Run once in Supabase -> SQL Editor.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (SECURITY DEFINER avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------
create or replace function public.owner_email() returns text
language sql immutable as $$ select 'rssharifu@gmail.com'::text $$;

-- profiles table (kept compatible with the old one)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  phone text,
  role text not null default 'parent' check (role in ('parent','admin')),
  is_active boolean not null default true,
  child_name text,
  child_age integer,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active
  )
$$;

-- owner = admin AND the signed JWT email equals the owner email
create or replace function public.is_owner() returns boolean
language sql security definer stable set search_path = public as $$
  select public.is_admin()
     and lower(coalesce(auth.jwt() ->> 'email', '')) = public.owner_email()
$$;

create or replace function public.is_active_user() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active)
$$;

-- ---------------------------------------------------------------------
-- 2. SIGNUP TRIGGER: role is NEVER taken from client metadata.
--    Only the owner email becomes admin. Everyone else is 'parent'.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, is_active, child_name, child_age)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'অভিভাবক'),
    new.raw_user_meta_data ->> 'phone',
    case when lower(new.email) = public.owner_email() then 'admin' else 'parent' end,
    true,
    new.raw_user_meta_data ->> 'child_name',
    nullif(new.raw_user_meta_data ->> 'child_age', '')::int
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. GUARD: normal users cannot change role / is_active / email.
--    Only the owner can change roles. The owner can never be demoted.
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email
       or new.id is distinct from old.id then
      raise exception 'Not allowed to change role, status or email';
    end if;
  end if;
  if auth.uid() is not null and new.role is distinct from old.role and not public.is_owner() then
    raise exception 'Only the owner can change roles';
  end if;
  if lower(old.email) = public.owner_email() and (new.role <> 'admin' or new.is_active = false) then
    raise exception 'The owner account cannot be demoted or deactivated';
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- 4. ADMIN ACCESS REQUESTS (pending until the owner approves)
-- ---------------------------------------------------------------------
create table if not exists public.admin_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  email text not null,
  full_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create or replace function public.request_admin_access() returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid() and is_active;
  if p.id is null then raise exception 'Not signed in'; end if;
  if p.role = 'admin' then return; end if;
  insert into public.admin_requests (user_id, email, full_name)
  values (p.id, p.email, p.full_name)
  on conflict (user_id) do update
    set status = 'pending', decided_at = null
    where public.admin_requests.status = 'rejected';
end $$;

create or replace function public.decide_admin_request(req_id uuid, approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare r public.admin_requests;
begin
  if not public.is_owner() then raise exception 'Only the owner can decide admin requests'; end if;
  select * into r from public.admin_requests where id = req_id;
  if r.id is null then raise exception 'Request not found'; end if;
  update public.admin_requests
     set status = case when approve then 'approved' else 'rejected' end,
         decided_at = now()
   where id = req_id;
  update public.profiles
     set role = case when approve then 'admin' else 'parent' end
   where id = r.user_id;
end $$;

-- ---------------------------------------------------------------------
-- 5. SITE SETTINGS (editable from the admin panel; single row)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------
-- 6. CLASSES: migrate to the columns the app really uses
-- ---------------------------------------------------------------------
create table if not exists public.classes (
  id text primary key,
  class_number int not null,
  title text not null
);
alter table public.classes add column if not exists description text not null default '';
alter table public.classes add column if not exists video_url text not null default '';
alter table public.classes add column if not exists is_published boolean not null default true;
alter table public.classes add column if not exists created_at timestamptz default now();

-- old schema had many NOT NULL columns the app never fills; relax them
do $$
declare c record;
begin
  for c in
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'classes' and is_nullable = 'NO'
      and column_name not in ('id','class_number','title','description','video_url','is_published')
  loop
    execute format('alter table public.classes alter column %I drop not null', c.column_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.admin_requests enable row level security;
alter table public.site_settings enable row level security;
alter table public.classes enable row level security;

-- drop every old policy (names from the previous schema + new names)
do $$
declare pol record;
begin
  for pol in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','admin_requests','site_settings','classes',
                        'courses','progress','homework_submissions','announcements')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- admin_requests: read own, owner reads all; writes only through the two functions
create policy admin_requests_select on public.admin_requests for select to authenticated
  using (user_id = auth.uid() or public.is_owner());

-- site_settings: public read (login page + footer need it), admin write
create policy site_settings_read on public.site_settings for select to anon, authenticated
  using (true);
create policy site_settings_insert on public.site_settings for insert to authenticated
  with check (public.is_admin());
create policy site_settings_update on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- classes: only active signed-in users see PUBLISHED classes; admins see/manage all
create policy classes_read on public.classes for select to authenticated
  using (public.is_active_user() and (is_published or public.is_admin()));
create policy classes_admin_write on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- legacy tables (unused by the app now) - keep them locked down
do $$
begin
  if to_regclass('public.courses') is not null then
    execute 'alter table public.courses enable row level security';
    execute 'create policy courses_read on public.courses for select to authenticated using (public.is_active_user())';
    execute 'create policy courses_admin on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
  if to_regclass('public.progress') is not null then
    execute 'alter table public.progress enable row level security';
    execute 'create policy progress_own on public.progress for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin())';
  end if;
  if to_regclass('public.homework_submissions') is not null then
    execute 'alter table public.homework_submissions enable row level security';
    execute 'create policy homework_own on public.homework_submissions for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin())';
  end if;
  if to_regclass('public.announcements') is not null then
    execute 'alter table public.announcements enable row level security';
    execute 'create policy announcements_read on public.announcements for select to authenticated using (public.is_active_user())';
    execute 'create policy announcements_admin on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. ONE-TIME: if the owner already has an account, promote it now
-- ---------------------------------------------------------------------
update public.profiles set role = 'admin', is_active = true
where lower(email) = public.owner_email();
