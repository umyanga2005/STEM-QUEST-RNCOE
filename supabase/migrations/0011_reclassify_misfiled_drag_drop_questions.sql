-- =============================================================================
-- STEM QUEST — 0011_reclassify_misfiled_drag_drop_questions.sql
-- Task 8: some questions are stored under activity_type_id = fill-complete but
-- carry a drag-drop shaped payload ("zones" + "items" keys). The admin editor
-- and the student activity renderer both key their form/component purely off
-- activity_type_id (verified in code — the dropdown and renderer already map
-- values correctly), so a misclassified row renders the fill-complete text
-- input for what is actually a drag-drop question. This is a data fix only.
--
-- Run the audit queries first and eyeball the results before applying the
-- UPDATE.
-- =============================================================================

-- Audit: every fill-complete question, for a quick eyeball scan.
-- SELECT q.id, q.stream_id, q.level_id, at.slug AS current_type,
--        LEFT(q.payload::text, 120) AS payload_preview
-- FROM questions q
-- JOIN activity_types at ON at.id = q.activity_type_id
-- WHERE at.slug = 'fill-complete'
-- ORDER BY q.stream_id, q.level_id;

-- Audit: fill-complete rows whose payload actually looks like drag-drop.
-- SELECT id FROM questions
-- WHERE activity_type_id = (SELECT id FROM activity_types WHERE slug = 'fill-complete')
--   AND payload::text LIKE '%"zones"%'
--   AND payload::text LIKE '%"items"%';

BEGIN;

UPDATE questions
SET activity_type_id = (SELECT id FROM activity_types WHERE slug = 'drag-drop')
WHERE activity_type_id = (SELECT id FROM activity_types WHERE slug = 'fill-complete')
  AND payload::text LIKE '%"zones"%'
  AND payload::text LIKE '%"items"%';

COMMIT;

-- Verify (expect 0 rows left misclassified):
-- SELECT id FROM questions
-- WHERE activity_type_id = (SELECT id FROM activity_types WHERE slug = 'fill-complete')
--   AND payload::text LIKE '%"zones"%'
--   AND payload::text LIKE '%"items"%';
