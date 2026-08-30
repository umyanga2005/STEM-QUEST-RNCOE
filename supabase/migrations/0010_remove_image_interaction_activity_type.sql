-- =============================================================================
-- STEM QUEST — 0010_remove_image_interaction_activity_type.sql
-- Task 6: retire the image-interaction activity type. The plugin, its admin
-- form, its payload/correct-answer schemas and every registration site have
-- already been removed from the codebase in this change. This migration
-- removes the matching questions and the activity_types row so the DB stays
-- consistent with the code (an orphaned activity_type_id would otherwise
-- break question selection for any stream/level pool that still contained
-- image-interaction questions).
--
-- Review before applying: run the SELECT COUNT(*) below first and confirm
-- the row count matches what you expect for your environment (the original
-- seed shipped 20 image-interaction questions at activity_type_id = 6).
-- =============================================================================

-- Sanity check — run manually and confirm the count before applying the
-- DELETEs below in a fresh session/transaction if you want to double-check.
-- SELECT COUNT(*) FROM questions WHERE activity_type_id = (
--   SELECT id FROM activity_types WHERE slug = 'image-interaction'
-- );

BEGIN;

DELETE FROM questions
WHERE activity_type_id = (SELECT id FROM activity_types WHERE slug = 'image-interaction');

DELETE FROM activity_types
WHERE slug = 'image-interaction';

COMMIT;

-- Verify (expect 0 rows / no such activity type):
-- SELECT COUNT(*) FROM questions WHERE activity_type_id = (
--   SELECT id FROM activity_types WHERE slug = 'image-interaction'
-- );
-- SELECT id FROM activity_types WHERE slug = 'image-interaction'; -- expect no rows
