-- =====================================================================
-- STANDALONE ADDITIVE MIGRATION: COURSE CHAPTERS & CLASS ORGANIZATION
-- Safe to run on top of existing schema. DO NOT rerun global schema.
-- Preserves all existing class IDs, video links, worksheets,
-- publication states, and free/premium settings.
-- =====================================================================

-- 1. COURSE CHAPTERS TABLE
create table if not exists public.course_chapters (
  id text primary key,
  title text not null,
  subtitle text not null default '',
  sort_order int not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Seed the core course chapters idempotently
insert into public.course_chapters (id, title, subtitle, sort_order, is_default)
values
  ('direct', 'সরাসরি যোগ-বিয়োগ', 'Without Complement', 1, true),
  ('five-complement', '৫-এর বন্ধু', 'Five Complement', 2, true),
  ('ten-complement', '১০-এর বন্ধু', 'Ten Complement', 3, true),
  ('mixed-complement', 'মিশ্র নিয়ম', 'Mixed Complement', 4, true)
on conflict (id) do nothing;

-- 2. ADD NULLABLE CHAPTER REFERENCE TO EXISTING CLASSES TABLE
alter table public.classes
  add column if not exists chapter_id text references public.course_chapters(id) on delete set null;

create index if not exists idx_classes_chapter_order
  on public.classes (chapter_id, class_number);

-- 3. CONSERVATIVE, UNAMBIGUOUS BACKFILL FOR EXISTING CLASSES ONLY
-- Leaves general intro, counting, or mental-math classes uncategorized (NULL -> অন্যান্য)
-- until an administrator assigns them explicitly.
update public.classes
   set chapter_id = case
     when (
       title ilike '%সরাসরি যোগ%'
       or title ilike '%সরাসরি বিয়োগ%'
       or title ilike '%সরাসরি বিয়োগ%'
       or title ilike '%without complement%'
       or title ilike '%direct addition%'
       or title ilike '%direct subtraction%'
     ) then 'direct'
     when (
       title ilike '%৫-এর বন্ধু%'
       or title ilike '%৫ এর বন্ধু%'
       or title ilike '%৫-এর পরিপূরক%'
       or title ilike '%স্মল ফ্রেন্ড%'
       or title ilike '%five complement%'
       or title ilike '%small friend%'
       or description ilike '%৫-এর পরিপূরক%'
       or description ilike '%small friend%'
     ) then 'five-complement'
     when (
       title ilike '%১০-এর বন্ধু%'
       or title ilike '%১০ এর বন্ধু%'
       or title ilike '%১০-এর পরিপূরক%'
       or title ilike '%বিগ ফ্রেন্ড%'
       or title ilike '%ten complement%'
       or title ilike '%big friend%'
       or description ilike '%১০-এর পরিপূরক%'
       or description ilike '%big friend%'
     ) then 'ten-complement'
     when (
       title ilike '%মিশ্র নিয়ম%'
       or title ilike '%মিশ্র নিয়ম%'
       or title ilike '%mixed complement%'
       or title ilike '%combination%'
     ) then 'mixed-complement'
     else null
   end
 where chapter_id is null;

-- 4. ROW LEVEL SECURITY FOR COURSE CHAPTERS
alter table public.course_chapters enable row level security;

drop policy if exists course_chapters_select on public.course_chapters;
drop policy if exists course_chapters_admin_insert on public.course_chapters;
drop policy if exists course_chapters_admin_update on public.course_chapters;
drop policy if exists course_chapters_admin_delete on public.course_chapters;

create policy course_chapters_select on public.course_chapters
  for select to authenticated
  using (public.is_admin() or public.is_active_user());

create policy course_chapters_admin_insert on public.course_chapters
  for insert to authenticated
  with check (public.is_admin());

create policy course_chapters_admin_update on public.course_chapters
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy course_chapters_admin_delete on public.course_chapters
  for delete to authenticated
  using (public.is_admin());

-- Block anon access and allow authenticated access enforced by RLS
revoke all on public.course_chapters from anon;
grant select, insert, update, delete on public.course_chapters to authenticated;
