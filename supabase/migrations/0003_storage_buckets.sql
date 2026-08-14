-- =============================================================================
-- STEM QUEST — 0003_storage_buckets.sql
-- Supabase Storage buckets + policies (Task 2.12).
-- Source of truth: reports/06-database-architecture.md §13 (Task 2.6, DONE),
-- refined by the Task 2.12 instructions.
-- Idempotent and non-destructive: re-running is safe.
--   * student-avatars  — optional profile photos. PRIVATE. Backend writes via
--                        service role; signed-URL reads; authenticated admins
--                        may read via RLS (is_admin()). Path design:
--                        student-avatars/{student-id}/profile.webp
--                        (numeric student id, NEVER student name).
--   * question-media   — images for interactive question/activity content.
--                        PRIVATE. Trusted backend/admin workflows only. No anon
--                        and no authenticated INSERT/UPDATE/DELETE policies:
--                        writes happen through the backend service role.
--   * certificates     — NOT created (on-demand PDFs, no permanent archive;
--                        D-031). Documented, not provisioned.
-- Enforced server-side at the bucket level (Storage API): file_size_limit in
-- bytes and allowed_mime_types. Only jpeg/png/webp accepted. No anonymous
-- upload/read/delete; no student-to-student access; default-deny otherwise.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Buckets (private). on conflict (id) do nothing => never overwrite.
--    file_size_limit: 200 KB = 204800 B (avatars), 1 MB = 1048576 B (media).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-avatars', 'student-avatars', false, 204800, array['image/jpeg','image/png','image/webp']::text[]),
  ('question-media',  'question-media',  false, 1048576, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Policies on storage.objects.
--    Default-deny for anon and non-admin authenticated (no SELECT/INSERT/
--    UPDATE/DELETE policies for them, so Storage API refuses those requests).
--    The only explicit policies are read access for authenticated admins,
--    keyed on the existing public.is_admin() RLS helper (D-028 admin mode).
--    All writes and signed-URL generation run as the trusted service role,
--    which bypasses RLS (D-027/D-028). Admin uploads go through the backend.
-- ---------------------------------------------------------------------------
drop policy if exists student_avatars_select_admin on storage.objects;
create policy student_avatars_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'student-avatars' and public.is_admin());

drop policy if exists question_media_select_admin on storage.objects;
create policy question_media_select_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'question-media' and public.is_admin());

commit;
