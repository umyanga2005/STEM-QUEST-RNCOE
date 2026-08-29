-- =============================================================================
-- STEM QUEST — 0009_scenario_challenge_entry_decision_backfill.sql
-- FIX: P1-005 root cause (found during investigation, broader than the
-- 2026-08-28 audit described).
--
-- All 100 scenario-challenge questions (activity_type_id = 9) were missing
-- payload.entryDecision, a field the scenario-challenge plugin's render()
-- and controller require to identify the starting decision node
-- (src/features/activity-engine/plugins/scenario-challenge/plugin.js:315,
-- scenario-challenge-controller.js createScenarioState/currentDecision).
-- Without it, currentDecisionId is null, currentDecision() never matches
-- any real decision id, and the whole decision/options section never
-- renders — students see the scenario text and a "Decision 1 of N" label
-- but no option buttons at all. This affected the LIVE STUDENT GAME, not
-- just the admin preview the audit focused on.
--
-- Backfilled from each question's own first authored decision id
-- (payload.decisions[0].id) — verified all 100 rows have one.
-- Idempotent: only touches rows still missing entryDecision.
-- =============================================================================

begin;

update questions
set payload = jsonb_set(payload, '{entryDecision}', payload->'decisions'->0->'id')
where activity_type_id = 9 and not (payload ? 'entryDecision');

commit;
