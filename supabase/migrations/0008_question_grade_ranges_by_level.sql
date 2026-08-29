-- =============================================================================
-- STEM QUEST — 0008_question_grade_ranges_by_level.sql
-- FIX: P3-004 (STEM QUEST Master Fix Prompt, 2026-08-28)
--
-- All 1001 questions were seeded with the column defaults grade_min=6,
-- grade_max=11 (see 0001_initial_schema.sql), regardless of their level's
-- difficulty tier (levels.number 1..5 per stream: Beginner..Expert). This
-- sets a per-level-tier grade band so grade-appropriate filtering has real
-- data to work with. grade_min/grade_max are constrained to [6,11] by the
-- existing check constraints, so every value below is in range.
-- Idempotent: re-running reapplies the same values.
-- =============================================================================

begin;

update questions q
set
  grade_min = case l.number
    when 1 then 6
    when 2 then 7
    when 3 then 8
    when 4 then 9
    when 5 then 10
  end,
  grade_max = case l.number
    when 1 then 7
    when 2 then 8
    when 3 then 9
    when 4 then 10
    when 5 then 11
  end
from levels l
where q.level_id = l.id;

commit;
