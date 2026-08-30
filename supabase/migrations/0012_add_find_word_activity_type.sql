-- =============================================================================
-- STEM QUEST — 0012_add_find_word_activity_type.sql
-- Task 9: register the new "Find the Word" activity type. The plugin,
-- payload/correct-answer schemas, admin authoring form and student renderer
-- have already been added to the codebase in this change; this migration
-- adds the matching activity_types row so questions can be authored against
-- it.
-- =============================================================================

INSERT INTO activity_types (slug, name, description)
VALUES (
  'find-word',
  'Find the Word',
  'Letter-grid word search — students find hidden STEM vocabulary terms in the grid.'
)
ON CONFLICT (slug) DO NOTHING;

-- Note the new id for reference:
-- SELECT id, slug FROM activity_types WHERE slug = 'find-word';
