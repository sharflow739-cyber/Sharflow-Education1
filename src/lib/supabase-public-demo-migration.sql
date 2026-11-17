-- =====================================================================
-- ADDITIVE MIGRATION: PUBLIC DEMO VIDEO READ POLICY (/demo)
-- Makes ONLY public.demo_settings (the designated /demo video URL)
-- readable before login while keeping classes, class_videos, ebooks,
-- profiles, and manual_payment_claims strictly gated.
-- =====================================================================

begin;

drop policy if exists demo_settings_read on public.demo_settings;

create policy demo_settings_read
  on public.demo_settings
  for select
  to anon, authenticated
  using (true);

commit;
