-- =====================================================================
-- STANDALONE ADDITIVE MIGRATION: AUTHENTICATED E-BOOK LIBRARY & READER
-- Safe to run on top of existing schema. DO NOT rerun global schema.
-- =====================================================================

-- 1. EBOOKS TABLE
create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  pdf_storage_path text not null,
  cover_storage_path text,
  file_size_bytes bigint,
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2. PER-ACCOUNT PER-BOOK READING PROGRESS & BOOKMARKS TABLE
create table if not exists public.ebook_reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  last_page int not null default 1 check (last_page >= 1),
  total_pages int check (total_pages is null or total_pages >= 1),
  bookmarks int[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, ebook_id)
);

create index if not exists idx_ebooks_published_sort
  on public.ebooks (is_published, sort_order, created_at desc);

create index if not exists idx_ebook_progress_user_book
  on public.ebook_reading_progress (user_id, ebook_id);

-- 3. ENABLE ROW LEVEL SECURITY
alter table public.ebooks enable row level security;
alter table public.ebook_reading_progress enable row level security;

-- Drop only policies on these new tables for idempotency
drop policy if exists ebooks_select on public.ebooks;
drop policy if exists ebooks_admin_insert on public.ebooks;
drop policy if exists ebooks_admin_update on public.ebooks;
drop policy if exists ebooks_admin_delete on public.ebooks;

create policy ebooks_select on public.ebooks
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_active_user() and is_published = true)
  );

create policy ebooks_admin_insert on public.ebooks
  for insert to authenticated
  with check (public.is_admin());

create policy ebooks_admin_update on public.ebooks
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy ebooks_admin_delete on public.ebooks
  for delete to authenticated
  using (public.is_admin());

drop policy if exists ebook_progress_select on public.ebook_reading_progress;
drop policy if exists ebook_progress_insert on public.ebook_reading_progress;
drop policy if exists ebook_progress_update on public.ebook_reading_progress;
drop policy if exists ebook_progress_delete on public.ebook_reading_progress;

create policy ebook_progress_select on public.ebook_reading_progress
  for select to authenticated
  using (user_id = auth.uid() and public.is_active_user());

create policy ebook_progress_insert on public.ebook_reading_progress
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1 from public.ebooks e
      where e.id = ebook_id
        and (e.is_published = true or public.is_admin())
    )
  );

create policy ebook_progress_update on public.ebook_reading_progress
  for update to authenticated
  using (user_id = auth.uid() and public.is_active_user())
  with check (
    user_id = auth.uid()
    and public.is_active_user()
    and exists (
      select 1 from public.ebooks e
      where e.id = ebook_id
        and (e.is_published = true or public.is_admin())
    )
  );

create policy ebook_progress_delete on public.ebook_reading_progress
  for delete to authenticated
  using (user_id = auth.uid() and public.is_active_user());

-- Defense-in-depth: block anon completely at table privilege level, allow authenticated (enforced by RLS)
revoke all on public.ebooks from anon;
revoke all on public.ebook_reading_progress from anon;
grant select, insert, update, delete on public.ebooks to authenticated;
grant select, insert, update, delete on public.ebook_reading_progress to authenticated;

-- 4. PRIVATE STORAGE BUCKET FOR EBOOK PDFs & COVERS
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ebooks',
  'ebooks',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800,
      allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 5. STORAGE OBJECT POLICIES SCOPED STRICTLY TO 'ebooks' BUCKET
drop policy if exists ebooks_storage_select on storage.objects;
drop policy if exists ebooks_storage_admin_insert on storage.objects;
drop policy if exists ebooks_storage_admin_update on storage.objects;
drop policy if exists ebooks_storage_admin_delete on storage.objects;

create policy ebooks_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ebooks'
    and (
      public.is_admin()
      or (
        public.is_active_user()
        and exists (
          select 1 from public.ebooks e
          where e.is_published = true
            and (e.pdf_storage_path = name or e.cover_storage_path = name)
        )
      )
    )
  );

create policy ebooks_storage_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ebooks' and public.is_admin());

create policy ebooks_storage_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'ebooks' and public.is_admin())
  with check (bucket_id = 'ebooks' and public.is_admin());

create policy ebooks_storage_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'ebooks' and public.is_admin());
