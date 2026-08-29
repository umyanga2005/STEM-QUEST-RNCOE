-- =============================================================================
-- STEM QUEST — 0006_fix_image_interaction_and_pattern_data.sql
-- FIX: P0-001 / P0-002 (STEM QUEST Master Fix Prompt, 2026-08-28)
--
-- P0-001 — All 20 image-interaction questions (activity_type_id = 6) store
-- payload.image.ref as "question-media///<stream>_level<N>_image_10.png",
-- a triple-slash malformed path that fails MEDIA_REF_PATTERN in
-- src/features/admin/questions/security/media.js. isSafeMediaRef() returns
-- false for all 20, so no signed URL is ever generated and every
-- image-interaction question renders a broken image everywhere.
--
-- The 20 malformed refs encode their originating stream + level number in
-- the filename itself (verified against `levels`/`streams`), e.g.
-- science_level1_image_10.png .. mathematics_level20_image_10.png. Only 10
-- real files exist in the question-media bucket (verified via
-- storage.objects), 4 for science, 1 for technology, 1 for engineering, 4
-- for mathematics. Each malformed ref is remapped to a real file that
-- exists for that question's own stream, cycling through the stream's
-- available files across its 5 levels. (An earlier draft of this fix
-- assigned mismatched streams — e.g. a technology question got a science
-- image — this version was checked row-by-row against the levels/streams
-- join before being applied.)
--
-- P0-002 — 5 of the 100 pattern questions (activity_type_id = 7) share one
-- identical placeholder payload: sequence [2,2,2] with candidates
-- [2,3,4] — no unique "next number" exists, so the question is unanswerable.
-- All 5 are Science Level 1 (ids 2872, 2882, 2892, 2902, 2912). Each is
-- replaced with a distinct valid arithmetic sequence. correct_answer for all
-- five already points at acceptableIds:["c1"], and c1 is kept as the correct
-- next value in every replacement below, so correct_answer.acceptableIds
-- itself needs no change — only its human-readable `rule` text (currently
-- the stale "Add 0") is updated to match.
--
-- Idempotent-ish: re-running reapplies the same target values, so it is
-- safe to run more than once.
-- =============================================================================

begin;

-- ---- P0-001: image-interaction media refs (science, 5 questions) ----------
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/science/life/food-web.png"') where id = 2876;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/science/life/plant-cell.png"') where id = 2926;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/science/earth-space/earth-layers.png"') where id = 2976;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/science/inquiry/rainfall-bar-chart.png"') where id = 3026;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/science/life/food-web.png"') where id = 3076;

-- ---- technology (5 questions, only 1 real file available) -----------------
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/technology/computing/hardware-parts.png"') where id = 3126;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/technology/computing/hardware-parts.png"') where id = 3176;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/technology/computing/hardware-parts.png"') where id = 3226;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/technology/computing/hardware-parts.png"') where id = 3276;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/technology/computing/hardware-parts.png"') where id = 3326;

-- ---- engineering (5 questions, only 1 real file available) ----------------
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/engineering/mechanisms-machines/lever-fulcrum.png"') where id = 3376;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/engineering/mechanisms-machines/lever-fulcrum.png"') where id = 3426;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/engineering/mechanisms-machines/lever-fulcrum.png"') where id = 3476;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/engineering/mechanisms-machines/lever-fulcrum.png"') where id = 3526;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/engineering/mechanisms-machines/lever-fulcrum.png"') where id = 3576;

-- ---- mathematics (5 questions) ---------------------------------------------
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/mathematics/algebra/line-slope-intercept.png"') where id = 3626;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/mathematics/algebra/parabola-vertex.png"') where id = 3676;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/mathematics/data-statistics/bar-chart-fruit.png"') where id = 3726;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/mathematics/geometry-measurement/coordinate-grid-point.png"') where id = 3776;
update questions set payload = jsonb_set(payload, '{image,ref}', '"question-media/mathematics/algebra/line-slope-intercept.png"') where id = 3826;

-- ---- P0-002: degenerate pattern sequences ----------------------------------
update questions set payload = payload
  || '{"sequence":[{"id":"e1","number":2},{"id":"e2","number":4},{"id":"e3","number":6}]}'::jsonb
  || '{"candidates":[{"id":"c1","number":8},{"id":"c2","number":5},{"id":"c3","number":7}]}'::jsonb
  where id = 2872;

update questions set payload = payload
  || '{"sequence":[{"id":"e1","number":3},{"id":"e2","number":6},{"id":"e3","number":9}]}'::jsonb
  || '{"candidates":[{"id":"c1","number":12},{"id":"c2","number":9},{"id":"c3","number":15}]}'::jsonb
  where id = 2882;

update questions set payload = payload
  || '{"sequence":[{"id":"e1","number":5},{"id":"e2","number":10},{"id":"e3","number":15}]}'::jsonb
  || '{"candidates":[{"id":"c1","number":20},{"id":"c2","number":15},{"id":"c3","number":25}]}'::jsonb
  where id = 2892;

update questions set payload = payload
  || '{"sequence":[{"id":"e1","number":1},{"id":"e2","number":3},{"id":"e3","number":5}]}'::jsonb
  || '{"candidates":[{"id":"c1","number":7},{"id":"c2","number":5},{"id":"c3","number":9}]}'::jsonb
  where id = 2902;

update questions set payload = payload
  || '{"sequence":[{"id":"e1","number":10},{"id":"e2","number":20},{"id":"e3","number":30}]}'::jsonb
  || '{"candidates":[{"id":"c1","number":40},{"id":"c2","number":30},{"id":"c3","number":50}]}'::jsonb
  where id = 2912;

-- ---- correct_answer.rule text (acceptableIds:["c1"] is already correct) ---
update questions set correct_answer = jsonb_set(correct_answer, '{rule}', '"Add 2"') where id = 2872;
update questions set correct_answer = jsonb_set(correct_answer, '{rule}', '"Add 3"') where id = 2882;
update questions set correct_answer = jsonb_set(correct_answer, '{rule}', '"Add 5"') where id = 2892;
update questions set correct_answer = jsonb_set(correct_answer, '{rule}', '"Add 2"') where id = 2902;
update questions set correct_answer = jsonb_set(correct_answer, '{rule}', '"Add 10"') where id = 2912;

commit;
