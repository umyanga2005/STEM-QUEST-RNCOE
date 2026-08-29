-- =============================================================================
-- STEM QUEST — 0007_scoring_pass_threshold_setting.sql
-- FIX: P2-007 (STEM QUEST Master Fix Prompt, 2026-08-28)
--
-- game-session-service.js finishSession() hardcodes
-- `totalScore >= 150 ? 'passed' : 'attempted'`. 150 is 50% of the max
-- possible score (3 questions/session x 100 base points), but it lives only
-- in application code, so it cannot be tuned without a deploy. This adds it
-- to game_settings alongside the other scoring.* keys (hint_deduction,
-- attempt_deduction) already read by the settings repositories, following
-- the same key-naming convention.
-- Idempotent: ON CONFLICT DO NOTHING, safe to re-run.
-- =============================================================================

begin;

insert into game_settings (key, value, description)
values (
  'scoring.pass_threshold',
  '150',
  'Minimum total session score to record the session result as "passed" (vs "attempted").'
)
on conflict (key) do nothing;

commit;
