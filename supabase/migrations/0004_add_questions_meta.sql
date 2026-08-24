-- =============================================================================
-- STEM QUEST — 0004_add_questions_meta.sql
-- Admin Question Builder authoring metadata (Task 5.10).
-- Source of truth: reports/07-task-3.1-content-model.md OD-2 (meta reservation)
-- + D-043 (future meta JSONB, timing recommended at Admin Question Builder
-- build time) + D-046 (meta.schema.json wrapper ready for the builder).
--
-- WHAT THIS ADDS
--   * public.questions.meta jsonb — the authoring/review metadata envelope
--     (objective, feedback templates, presentational media refs, authoring
--     provenance, review bookkeeping). Validated server-side against
--     schemas/common/meta.schema.json; the game engine never reads it.
--
-- WHAT THIS DOES NOT CHANGE
--   * No new table, no index (meta is small, never filtered; "skip if unused").
--   * RLS: questions RLS stays enabled exactly as 0001; NO new admin policies.
--     The Question Builder writes through the service-role client (D-027/D-028),
--     which bypasses RLS — the same management model as every other admin
--     surface. `questions_public` (security-definer, student-safe preview view)
--     is left UNCHANGED so meta stays out of that surface.
--   * correct_answer protection is untouched.
-- Idempotent and non-destructive: re-running is safe.
-- =============================================================================

begin;

alter table public.questions add column if not exists meta jsonb;

comment on column public.questions.meta is
  'Admin authoring metadata (D-043 OD-2): objective, feedback templates, presentational media refs, authoring provenance, review bookkeeping. Validated against schemas/common/meta.schema.json. Never read by the game engine; never exposed via questions_public.';

commit;
