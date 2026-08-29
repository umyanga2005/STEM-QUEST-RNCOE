-- STEM Quest 500-Question PostgreSQL Seed Pack
-- 500 questions: 4 STEM streams × 5 levels × 25 questions.
-- Science: levels 1-5 | Technology: levels 6-10 | Engineering: levels 11-15 | Mathematics: levels 16-20.
-- Image interaction: 20 total (5 per stream).
-- Memory game: 20 total, only in Levels 4/5 of each stream (2 in Level 4 + 3 in Level 5 per stream).
-- Other activity types: 460 total, balanced as evenly as possible across types 1,2,3,4,5,7,9,10.
BEGIN;

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 6, 'Tap the part of the diagram that represents cell membrane.', NULL, 'The target represents cell membrane: controls what enters and leaves a cell.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating cell membrane","ref":"question-media/science/biology/science_biology_1.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"cell membrane","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents cell membrane.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 1, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: science_biology_1.png
   Prompt: High-detail educational vector diagram of cell membrane, showing the key structures or process needed to understand that controls what enters and leaves a cell. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'nucleus means contains most of a cell''s genetic material. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"nucleus"},{"id":"i2","label":"mitochondria"},{"id":"i3","label":"chlorophyll"}],"zones":[{"id":"z1","label":"contains most of a cell''s genetic material"},{"id":"z2","label":"release usable energy from food during cellular respiration"},{"id":"z3","label":"absorbs light energy for photosynthesis"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 2, 'Match each science term with its correct description.', NULL, 'mitochondria is correctly paired with its description: release usable energy from food during cellular respiration.',
  '{"leftItems":[{"id":"l1","text":"mitochondria"},{"id":"l2","text":"chlorophyll"},{"id":"l3","text":"photosynthesis"}],"rightItems":[{"id":"r1","text":"release usable energy from food during cellular respiration"},{"id":"r2","text":"absorbs light energy for photosynthesis"},{"id":"r3","text":"plants use light, carbon dioxide, and water to make glucose and oxygen"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 4, 'Sort the terms by role: place photosynthesis in the focal-concept category and the other terms in related-concept.', NULL, 'photosynthesis is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"photosynthesis"},{"id":"i2","label":"evaporation"},{"id":"i3","label":"condensation"},{"id":"i4","label":"melting"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place photosynthesis in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 5, 'A laboratory records 9 samples in each of 2 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 9 × 2 = 18.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 9 samples in each of 2 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":18,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 9 samples in each of 2 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 7, 'Complete the number pattern: 7, 11, 15, 19, ___.', NULL, 'Each term increases by 4, so the next number is 23.',
  '{"sequence":[{"id":"e1","number":7},{"id":"e2","number":11},{"id":"e3","number":15},{"id":"e4","number":19}],"candidates":[{"id":"c1","number":23},{"id":"c2","number":24},{"id":"c3","number":22}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 7, 11, 15, 19, ___.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 9, 'Scenario: A learner must explain melting during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: solid changes into liquid.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of melting.","decisions":[{"id":"d1","text":"Choose the accurate explanation of melting.","options":[{"id":"opt1","text":"Solid changes into liquid."},{"id":"opt2","text":"Melting has the opposite meaning."},{"id":"opt3","text":"Melting is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain melting during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 10, 'A laboratory records 12 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 12 × 5 = 60.',
  '{"problem":"A laboratory records 12 samples in each of 5 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":60}', '[{"text":"Focus on the key idea behind A laboratory records 12 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'gravity means attractive force between masses. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"gravity"},{"id":"i2","label":"friction"},{"id":"i3","label":"mass"}],"zones":[{"id":"z1","label":"attractive force between masses"},{"id":"z2","label":"force that opposes relative motion between surfaces"},{"id":"z3","label":"amount of matter in an object"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 2, 'Match each science term with its correct description.', NULL, 'friction is correctly paired with its description: force that opposes relative motion between surfaces.',
  '{"leftItems":[{"id":"l1","text":"friction"},{"id":"l2","text":"mass"},{"id":"l3","text":"density"}],"rightItems":[{"id":"r1","text":"force that opposes relative motion between surfaces"},{"id":"r2","text":"amount of matter in an object"},{"id":"r3","text":"mass per unit volume"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 4, 'Sort the terms by role: place density in the focal-concept category and the other terms in related-concept.', NULL, 'density is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"density"},{"id":"i2","label":"atom"},{"id":"i3","label":"molecule"},{"id":"i4","label":"element"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place density in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 5, 'A laboratory records 17 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 17 × 5 = 85.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 17 samples in each of 5 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":85,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 17 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 7, 'Complete the number pattern: 6, 10, 14, 18, ___.', NULL, 'Each term increases by 4, so the next number is 22.',
  '{"sequence":[{"id":"e1","number":6},{"id":"e2","number":10},{"id":"e3","number":14},{"id":"e4","number":18}],"candidates":[{"id":"c1","number":22},{"id":"c2","number":23},{"id":"c3","number":21}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 6, 10, 14, 18, ___.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 9, 'Scenario: A learner must explain element during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: pure substance made of one type of atom.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of element.","decisions":[{"id":"d1","text":"Choose the accurate explanation of element.","options":[{"id":"opt1","text":"Pure substance made of one type of atom."},{"id":"opt2","text":"Element has the opposite meaning."},{"id":"opt3","text":"Element is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain element during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 10, 'A laboratory records 20 samples in each of 3 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 20 × 3 = 60.',
  '{"problem":"A laboratory records 20 samples in each of 3 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":60}', '[{"text":"Focus on the key idea behind A laboratory records 20 samples in each of 3 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'pH means scale commonly used to describe acidity or alkalinity. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"pH"},{"id":"i2","label":"electric current"},{"id":"i3","label":"conductor"}],"zones":[{"id":"z1","label":"scale commonly used to describe acidity or alkalinity"},{"id":"z2","label":"rate of flow of electric charge"},{"id":"z3","label":"material that allows electric charge to move relatively easily"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 2, 'Match each science term with its correct description.', NULL, 'electric current is correctly paired with its description: rate of flow of electric charge.',
  '{"leftItems":[{"id":"l1","text":"electric current"},{"id":"l2","text":"conductor"},{"id":"l3","text":"insulator"}],"rightItems":[{"id":"r1","text":"rate of flow of electric charge"},{"id":"r2","text":"material that allows electric charge to move relatively easily"},{"id":"r3","text":"material that strongly resists electric charge flow"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 4, 'Sort the terms by role: place insulator in the focal-concept category and the other terms in related-concept.', NULL, 'insulator is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"insulator"},{"id":"i2","label":"reflection"},{"id":"i3","label":"refraction"},{"id":"i4","label":"food chain"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place insulator in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 5, 'A laboratory records 25 samples in each of 3 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 25 × 3 = 75.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 25 samples in each of 3 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":75,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 25 samples in each of 3 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 7, 'Complete the number pattern: 5, 9, 13, 17, ___.', NULL, 'Each term increases by 4, so the next number is 21.',
  '{"sequence":[{"id":"e1","number":5},{"id":"e2","number":9},{"id":"e3","number":13},{"id":"e4","number":17}],"candidates":[{"id":"c1","number":21},{"id":"c2","number":22},{"id":"c3","number":20}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 5, 9, 13, 17, ___.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 9, 'Scenario: A learner must explain food chain during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: sequence showing transfer of energy as organisms eat one another.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of food chain.","decisions":[{"id":"d1","text":"Choose the accurate explanation of food chain.","options":[{"id":"opt1","text":"Sequence showing transfer of energy as organisms eat one another."},{"id":"opt2","text":"Food chain has the opposite meaning."},{"id":"opt3","text":"Food chain is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain food chain during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 1, 10, 'A laboratory records 28 samples in each of 6 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 28 × 6 = 168.',
  '{"problem":"A laboratory records 28 samples in each of 6 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":168}', '[{"text":"Focus on the key idea behind A laboratory records 28 samples in each of 6 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 6, 'Tap the part of the diagram that represents nucleus.', NULL, 'The target represents nucleus: contains most of a cell''s genetic material.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating nucleus","ref":"question-media/science/biology/science_biology_2.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"nucleus","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents nucleus.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 2, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: science_biology_2.png
   Prompt: High-detail educational vector diagram of nucleus, showing the key structures or process needed to understand that contains most of a cell's genetic material. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'nucleus means contains most of a cell''s genetic material. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"nucleus"},{"id":"i2","label":"mitochondria"},{"id":"i3","label":"chlorophyll"}],"zones":[{"id":"z1","label":"contains most of a cell''s genetic material"},{"id":"z2","label":"release usable energy from food during cellular respiration"},{"id":"z3","label":"absorbs light energy for photosynthesis"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 2, 'Match each science term with its correct description.', NULL, 'mitochondria is correctly paired with its description: release usable energy from food during cellular respiration.',
  '{"leftItems":[{"id":"l1","text":"mitochondria"},{"id":"l2","text":"chlorophyll"},{"id":"l3","text":"photosynthesis"}],"rightItems":[{"id":"r1","text":"release usable energy from food during cellular respiration"},{"id":"r2","text":"absorbs light energy for photosynthesis"},{"id":"r3","text":"plants use light, carbon dioxide, and water to make glucose and oxygen"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 4, 'Sort the terms by role: place photosynthesis in the focal-concept category and the other terms in related-concept.', NULL, 'photosynthesis is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"photosynthesis"},{"id":"i2","label":"evaporation"},{"id":"i3","label":"condensation"},{"id":"i4","label":"melting"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place photosynthesis in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 5, 'A laboratory records 10 samples in each of 2 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 10 × 2 = 20.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 10 samples in each of 2 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":20,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 10 samples in each of 2 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 7, 'Complete the number pattern: 8, 12, 16, 20, ___.', NULL, 'Each term increases by 4, so the next number is 24.',
  '{"sequence":[{"id":"e1","number":8},{"id":"e2","number":12},{"id":"e3","number":16},{"id":"e4","number":20}],"candidates":[{"id":"c1","number":24},{"id":"c2","number":25},{"id":"c3","number":23}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 8, 12, 16, 20, ___.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 9, 'Scenario: A learner must explain melting during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: solid changes into liquid.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of melting.","decisions":[{"id":"d1","text":"Choose the accurate explanation of melting.","options":[{"id":"opt1","text":"Solid changes into liquid."},{"id":"opt2","text":"Melting has the opposite meaning."},{"id":"opt3","text":"Melting is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain melting during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 10, 'A laboratory records 13 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 13 × 5 = 65.',
  '{"problem":"A laboratory records 13 samples in each of 5 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":65}', '[{"text":"Focus on the key idea behind A laboratory records 13 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'gravity means attractive force between masses. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"gravity"},{"id":"i2","label":"friction"},{"id":"i3","label":"mass"}],"zones":[{"id":"z1","label":"attractive force between masses"},{"id":"z2","label":"force that opposes relative motion between surfaces"},{"id":"z3","label":"amount of matter in an object"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 2, 'Match each science term with its correct description.', NULL, 'friction is correctly paired with its description: force that opposes relative motion between surfaces.',
  '{"leftItems":[{"id":"l1","text":"friction"},{"id":"l2","text":"mass"},{"id":"l3","text":"density"}],"rightItems":[{"id":"r1","text":"force that opposes relative motion between surfaces"},{"id":"r2","text":"amount of matter in an object"},{"id":"r3","text":"mass per unit volume"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 4, 'Sort the terms by role: place density in the focal-concept category and the other terms in related-concept.', NULL, 'density is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"density"},{"id":"i2","label":"atom"},{"id":"i3","label":"molecule"},{"id":"i4","label":"element"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place density in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 5, 'A laboratory records 18 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 18 × 5 = 90.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 18 samples in each of 5 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":90,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 18 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 7, 'Complete the number pattern: 7, 11, 15, 19, ___.', NULL, 'Each term increases by 4, so the next number is 23.',
  '{"sequence":[{"id":"e1","number":7},{"id":"e2","number":11},{"id":"e3","number":15},{"id":"e4","number":19}],"candidates":[{"id":"c1","number":23},{"id":"c2","number":24},{"id":"c3","number":22}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 7, 11, 15, 19, ___.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 9, 'Scenario: A learner must explain element during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: pure substance made of one type of atom.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of element.","decisions":[{"id":"d1","text":"Choose the accurate explanation of element.","options":[{"id":"opt1","text":"Pure substance made of one type of atom."},{"id":"opt2","text":"Element has the opposite meaning."},{"id":"opt3","text":"Element is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain element during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 10, 'A laboratory records 21 samples in each of 3 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 21 × 3 = 63.',
  '{"problem":"A laboratory records 21 samples in each of 3 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":63}', '[{"text":"Focus on the key idea behind A laboratory records 21 samples in each of 3 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'pH means scale commonly used to describe acidity or alkalinity. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"pH"},{"id":"i2","label":"electric current"},{"id":"i3","label":"conductor"}],"zones":[{"id":"z1","label":"scale commonly used to describe acidity or alkalinity"},{"id":"z2","label":"rate of flow of electric charge"},{"id":"z3","label":"material that allows electric charge to move relatively easily"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 2, 'Match each science term with its correct description.', NULL, 'electric current is correctly paired with its description: rate of flow of electric charge.',
  '{"leftItems":[{"id":"l1","text":"electric current"},{"id":"l2","text":"conductor"},{"id":"l3","text":"insulator"}],"rightItems":[{"id":"r1","text":"rate of flow of electric charge"},{"id":"r2","text":"material that allows electric charge to move relatively easily"},{"id":"r3","text":"material that strongly resists electric charge flow"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 4, 'Sort the terms by role: place insulator in the focal-concept category and the other terms in related-concept.', NULL, 'insulator is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"insulator"},{"id":"i2","label":"reflection"},{"id":"i3","label":"refraction"},{"id":"i4","label":"food chain"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place insulator in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 5, 'A laboratory records 26 samples in each of 3 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 26 × 3 = 78.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 26 samples in each of 3 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":78,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 26 samples in each of 3 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 7, 'Complete the number pattern: 6, 10, 14, 18, ___.', NULL, 'Each term increases by 4, so the next number is 22.',
  '{"sequence":[{"id":"e1","number":6},{"id":"e2","number":10},{"id":"e3","number":14},{"id":"e4","number":18}],"candidates":[{"id":"c1","number":22},{"id":"c2","number":23},{"id":"c3","number":21}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 6, 10, 14, 18, ___.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 9, 'Scenario: A learner must explain food chain during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: sequence showing transfer of energy as organisms eat one another.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of food chain.","decisions":[{"id":"d1","text":"Choose the accurate explanation of food chain.","options":[{"id":"opt1","text":"Sequence showing transfer of energy as organisms eat one another."},{"id":"opt2","text":"Food chain has the opposite meaning."},{"id":"opt3","text":"Food chain is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain food chain during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 2, 10, 'A laboratory records 29 samples in each of 6 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 29 × 6 = 174.',
  '{"problem":"A laboratory records 29 samples in each of 6 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":174}', '[{"text":"Focus on the key idea behind A laboratory records 29 samples in each of 6 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 6, 'Tap the part of the diagram that represents mitochondria.', NULL, 'The target represents mitochondria: release usable energy from food during cellular respiration.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating mitochondria","ref":"question-media/science/biology/science_biology_3.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"mitochondria","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents mitochondria.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 3, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: science_biology_3.png
   Prompt: High-detail educational vector diagram of mitochondria, showing the key structures or process needed to understand that release usable energy from food during cellular respiration. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'nucleus means contains most of a cell''s genetic material. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"nucleus"},{"id":"i2","label":"mitochondria"},{"id":"i3","label":"chlorophyll"}],"zones":[{"id":"z1","label":"contains most of a cell''s genetic material"},{"id":"z2","label":"release usable energy from food during cellular respiration"},{"id":"z3","label":"absorbs light energy for photosynthesis"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 2, 'Match each science term with its correct description.', NULL, 'mitochondria is correctly paired with its description: release usable energy from food during cellular respiration.',
  '{"leftItems":[{"id":"l1","text":"mitochondria"},{"id":"l2","text":"chlorophyll"},{"id":"l3","text":"photosynthesis"}],"rightItems":[{"id":"r1","text":"release usable energy from food during cellular respiration"},{"id":"r2","text":"absorbs light energy for photosynthesis"},{"id":"r3","text":"plants use light, carbon dioxide, and water to make glucose and oxygen"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:biology','subtopic:biology'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 4, 'Sort the terms by role: place photosynthesis in the focal-concept category and the other terms in related-concept.', NULL, 'photosynthesis is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"photosynthesis"},{"id":"i2","label":"evaporation"},{"id":"i3","label":"condensation"},{"id":"i4","label":"melting"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place photosynthesis in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 5, 'A laboratory records 11 samples in each of 2 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 11 × 2 = 22.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 11 samples in each of 2 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":22,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 11 samples in each of 2 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 7, 'Complete the number pattern: 9, 13, 17, 21, ___.', NULL, 'Each term increases by 4, so the next number is 25.',
  '{"sequence":[{"id":"e1","number":9},{"id":"e2","number":13},{"id":"e3","number":17},{"id":"e4","number":21}],"candidates":[{"id":"c1","number":25},{"id":"c2","number":26},{"id":"c3","number":24}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 9, 13, 17, 21, ___.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 9, 'Scenario: A learner must explain melting during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: solid changes into liquid.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of melting.","decisions":[{"id":"d1","text":"Choose the accurate explanation of melting.","options":[{"id":"opt1","text":"Solid changes into liquid."},{"id":"opt2","text":"Melting has the opposite meaning."},{"id":"opt3","text":"Melting is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain melting during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 10, 'A laboratory records 14 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 14 × 5 = 70.',
  '{"problem":"A laboratory records 14 samples in each of 5 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":70}', '[{"text":"Focus on the key idea behind A laboratory records 14 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'gravity means attractive force between masses. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"gravity"},{"id":"i2","label":"friction"},{"id":"i3","label":"mass"}],"zones":[{"id":"z1","label":"attractive force between masses"},{"id":"z2","label":"force that opposes relative motion between surfaces"},{"id":"z3","label":"amount of matter in an object"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 2, 'Match each science term with its correct description.', NULL, 'friction is correctly paired with its description: force that opposes relative motion between surfaces.',
  '{"leftItems":[{"id":"l1","text":"friction"},{"id":"l2","text":"mass"},{"id":"l3","text":"density"}],"rightItems":[{"id":"r1","text":"force that opposes relative motion between surfaces"},{"id":"r2","text":"amount of matter in an object"},{"id":"r3","text":"mass per unit volume"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 4, 'Sort the terms by role: place density in the focal-concept category and the other terms in related-concept.', NULL, 'density is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"density"},{"id":"i2","label":"atom"},{"id":"i3","label":"molecule"},{"id":"i4","label":"element"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place density in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 5, 'A laboratory records 19 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 19 × 5 = 95.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 19 samples in each of 5 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":95,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 19 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 7, 'Complete the number pattern: 8, 12, 16, 20, ___.', NULL, 'Each term increases by 4, so the next number is 24.',
  '{"sequence":[{"id":"e1","number":8},{"id":"e2","number":12},{"id":"e3","number":16},{"id":"e4","number":20}],"candidates":[{"id":"c1","number":24},{"id":"c2","number":25},{"id":"c3","number":23}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 8, 12, 16, 20, ___.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 9, 'Scenario: A learner must explain element during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: pure substance made of one type of atom.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of element.","decisions":[{"id":"d1","text":"Choose the accurate explanation of element.","options":[{"id":"opt1","text":"Pure substance made of one type of atom."},{"id":"opt2","text":"Element has the opposite meaning."},{"id":"opt3","text":"Element is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain element during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 10, 'A laboratory records 22 samples in each of 3 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 22 × 3 = 66.',
  '{"problem":"A laboratory records 22 samples in each of 3 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":66}', '[{"text":"Focus on the key idea behind A laboratory records 22 samples in each of 3 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'pH means scale commonly used to describe acidity or alkalinity. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"pH"},{"id":"i2","label":"electric current"},{"id":"i3","label":"conductor"}],"zones":[{"id":"z1","label":"scale commonly used to describe acidity or alkalinity"},{"id":"z2","label":"rate of flow of electric charge"},{"id":"z3","label":"material that allows electric charge to move relatively easily"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 2, 'Match each science term with its correct description.', NULL, 'electric current is correctly paired with its description: rate of flow of electric charge.',
  '{"leftItems":[{"id":"l1","text":"electric current"},{"id":"l2","text":"conductor"},{"id":"l3","text":"insulator"}],"rightItems":[{"id":"r1","text":"rate of flow of electric charge"},{"id":"r2","text":"material that allows electric charge to move relatively easily"},{"id":"r3","text":"material that strongly resists electric charge flow"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Some energy is lost as heat"},{"id":"o2","label":"Energy is transferred to the consumer"},{"id":"o3","label":"Chemical energy is released"},{"id":"o4","label":"Food is eaten by an organism"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 4, 'Sort the terms by role: place insulator in the focal-concept category and the other terms in related-concept.', NULL, 'insulator is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"insulator"},{"id":"i2","label":"reflection"},{"id":"i3","label":"refraction"},{"id":"i4","label":"food chain"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place insulator in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 5, 'A laboratory records 27 samples in each of 3 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 27 × 3 = 81.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 27 samples in each of 3 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":81,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 27 samples in each of 3 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 7, 'Complete the number pattern: 7, 11, 15, 19, ___.', NULL, 'Each term increases by 4, so the next number is 23.',
  '{"sequence":[{"id":"e1","number":7},{"id":"e2","number":11},{"id":"e3","number":15},{"id":"e4","number":19}],"candidates":[{"id":"c1","number":23},{"id":"c2","number":24},{"id":"c3","number":22}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 7, 11, 15, 19, ___.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 9, 'Scenario: A learner must explain food chain during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: sequence showing transfer of energy as organisms eat one another.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of food chain.","decisions":[{"id":"d1","text":"Choose the accurate explanation of food chain.","options":[{"id":"opt1","text":"Sequence showing transfer of energy as organisms eat one another."},{"id":"opt2","text":"Food chain has the opposite meaning."},{"id":"opt3","text":"Food chain is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain food chain during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 3, 10, 'A laboratory records 30 samples in each of 6 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 30 × 6 = 180.',
  '{"problem":"A laboratory records 30 samples in each of 6 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":180}', '[{"text":"Focus on the key idea behind A laboratory records 30 samples in each of 6 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 6, 'Tap the part of the diagram that represents chlorophyll.', NULL, 'The target represents chlorophyll: absorbs light energy for photosynthesis.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating chlorophyll","ref":"question-media/science/plants/science_plants_4.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"chlorophyll","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents chlorophyll.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 4, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: science_plants_4.png
   Prompt: High-detail educational vector diagram of chlorophyll, showing the key structures or process needed to understand that absorbs light energy for photosynthesis. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 8, 'Match the memory cards to form correct science term-definition pairs.', NULL, 'evaporation pairs with its definition: liquid changes into gas at the surface. friction pairs with force that opposes relative motion between surfaces.',
  '{"cards":[{"id":"c1","text":"evaporation"},{"id":"c2","text":"liquid changes into gas at the surface"},{"id":"c3","text":"friction"},{"id":"c4","text":"force that opposes relative motion between surfaces"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct science term-definition pairs.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 8, 'Match the memory cards to form correct science term-definition pairs.', NULL, 'condensation pairs with its definition: gas changes into liquid. mass pairs with amount of matter in an object.',
  '{"cards":[{"id":"c1","text":"condensation"},{"id":"c2","text":"gas changes into liquid"},{"id":"c3","text":"mass"},{"id":"c4","text":"amount of matter in an object"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct science term-definition pairs.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'chlorophyll means absorbs light energy for photosynthesis. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"chlorophyll"},{"id":"i2","label":"photosynthesis"},{"id":"i3","label":"evaporation"}],"zones":[{"id":"z1","label":"absorbs light energy for photosynthesis"},{"id":"z2","label":"plants use light, carbon dioxide, and water to make glucose and oxygen"},{"id":"z3","label":"liquid changes into gas at the surface"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 2, 'Match each science term with its correct description.', NULL, 'photosynthesis is correctly paired with its description: plants use light, carbon dioxide, and water to make glucose and oxygen.',
  '{"leftItems":[{"id":"l1","text":"photosynthesis"},{"id":"l2","text":"evaporation"},{"id":"l3","text":"condensation"}],"rightItems":[{"id":"r1","text":"plants use light, carbon dioxide, and water to make glucose and oxygen"},{"id":"r2","text":"liquid changes into gas at the surface"},{"id":"r3","text":"gas changes into liquid"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Cooling can later cause condensation"},{"id":"o2","label":"Water vapour enters the air"},{"id":"o3","label":"Particles escape from the surface"},{"id":"o4","label":"Liquid water gains energy"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 4, 'Sort the terms by role: place condensation in the focal-concept category and the other terms in related-concept.', NULL, 'condensation is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"condensation"},{"id":"i2","label":"melting"},{"id":"i3","label":"boiling"},{"id":"i4","label":"gravity"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place condensation in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 5, 'A laboratory records 14 samples in each of 4 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 14 × 4 = 56.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 14 samples in each of 4 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":56,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 14 samples in each of 4 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 7, 'Complete the number pattern: 12, 14, 16, 18, ___.', NULL, 'Each term increases by 2, so the next number is 20.',
  '{"sequence":[{"id":"e1","number":12},{"id":"e2","number":14},{"id":"e3","number":16},{"id":"e4","number":18}],"candidates":[{"id":"c1","number":20},{"id":"c2","number":21},{"id":"c3","number":19}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 12, 14, 16, 18, ___.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 9, 'Scenario: A learner must explain gravity during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: attractive force between masses.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of gravity.","decisions":[{"id":"d1","text":"Choose the accurate explanation of gravity.","options":[{"id":"opt1","text":"Attractive force between masses."},{"id":"opt2","text":"Gravity has the opposite meaning."},{"id":"opt3","text":"Gravity is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain gravity during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 10, 'A laboratory records 17 samples in each of 2 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 17 × 2 = 34.',
  '{"problem":"A laboratory records 17 samples in each of 2 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":34}', '[{"text":"Focus on the key idea behind A laboratory records 17 samples in each of 2 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'mass means amount of matter in an object. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"mass"},{"id":"i2","label":"density"},{"id":"i3","label":"atom"}],"zones":[{"id":"z1","label":"amount of matter in an object"},{"id":"z2","label":"mass per unit volume"},{"id":"z3","label":"smallest unit of an element that retains its chemical identity"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 2, 'Match each science term with its correct description.', NULL, 'density is correctly paired with its description: mass per unit volume.',
  '{"leftItems":[{"id":"l1","text":"density"},{"id":"l2","text":"atom"},{"id":"l3","text":"molecule"}],"rightItems":[{"id":"r1","text":"mass per unit volume"},{"id":"r2","text":"smallest unit of an element that retains its chemical identity"},{"id":"r3","text":"two or more atoms chemically bonded together"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Cooling can later cause condensation"},{"id":"o2","label":"Water vapour enters the air"},{"id":"o3","label":"Particles escape from the surface"},{"id":"o4","label":"Liquid water gains energy"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 4, 'Sort the terms by role: place molecule in the focal-concept category and the other terms in related-concept.', NULL, 'molecule is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"molecule"},{"id":"i2","label":"element"},{"id":"i3","label":"compound"},{"id":"i4","label":"pH"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place molecule in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 5, 'A laboratory records 22 samples in each of 2 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 22 × 2 = 44.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 22 samples in each of 2 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":44,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 22 samples in each of 2 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 7, 'Complete the number pattern: 11, 13, 15, 17, ___.', NULL, 'Each term increases by 2, so the next number is 19.',
  '{"sequence":[{"id":"e1","number":11},{"id":"e2","number":13},{"id":"e3","number":15},{"id":"e4","number":17}],"candidates":[{"id":"c1","number":19},{"id":"c2","number":20},{"id":"c3","number":18}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 11, 13, 15, 17, ___.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 9, 'Scenario: A learner must explain pH during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: scale commonly used to describe acidity or alkalinity.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of pH.","decisions":[{"id":"d1","text":"Choose the accurate explanation of pH.","options":[{"id":"opt1","text":"Scale commonly used to describe acidity or alkalinity."},{"id":"opt2","text":"Ph has the opposite meaning."},{"id":"opt3","text":"Ph is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain pH during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 10, 'A laboratory records 25 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 25 × 5 = 125.',
  '{"problem":"A laboratory records 25 samples in each of 5 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":125}', '[{"text":"Focus on the key idea behind A laboratory records 25 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'conductor means material that allows electric charge to move relatively easily. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"conductor"},{"id":"i2","label":"insulator"},{"id":"i3","label":"reflection"}],"zones":[{"id":"z1","label":"material that allows electric charge to move relatively easily"},{"id":"z2","label":"material that strongly resists electric charge flow"},{"id":"z3","label":"bouncing of light from a surface"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 2, 'Match each science term with its correct description.', NULL, 'insulator is correctly paired with its description: material that strongly resists electric charge flow.',
  '{"leftItems":[{"id":"l1","text":"insulator"},{"id":"l2","text":"reflection"},{"id":"l3","text":"refraction"}],"rightItems":[{"id":"r1","text":"material that strongly resists electric charge flow"},{"id":"r2","text":"bouncing of light from a surface"},{"id":"r3","text":"change in direction of light as it enters a different medium"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Cooling can later cause condensation"},{"id":"o2","label":"Water vapour enters the air"},{"id":"o3","label":"Particles escape from the surface"},{"id":"o4","label":"Liquid water gains energy"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 4, 'Sort the terms by role: place refraction in the focal-concept category and the other terms in related-concept.', NULL, 'refraction is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"refraction"},{"id":"i2","label":"food chain"},{"id":"i3","label":"ecosystem"},{"id":"i4","label":"cell membrane"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place refraction in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 5, 'A laboratory records 30 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 30 × 5 = 150.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 30 samples in each of 5 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":150,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 30 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 4, 7, 'Complete the number pattern: 10, 12, 14, 16, ___.', NULL, 'Each term increases by 2, so the next number is 18.',
  '{"sequence":[{"id":"e1","number":10},{"id":"e2","number":12},{"id":"e3","number":14},{"id":"e4","number":16}],"candidates":[{"id":"c1","number":18},{"id":"c2","number":19},{"id":"c3","number":17}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 10, 12, 14, 16, ___.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 6, 'Tap the part of the diagram that represents photosynthesis.', NULL, 'The target represents photosynthesis: plants use light, carbon dioxide, and water to make glucose and oxygen.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating photosynthesis","ref":"question-media/science/plants/science_plants_5.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"photosynthesis","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents photosynthesis.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 5, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: science_plants_5.png
   Prompt: High-detail educational vector diagram of photosynthesis, showing the key structures or process needed to understand that plants use light, carbon dioxide, and water to make glucose and oxygen. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 8, 'Match the memory cards to form correct science term-definition pairs.', NULL, 'condensation pairs with its definition: gas changes into liquid. mass pairs with amount of matter in an object.',
  '{"cards":[{"id":"c1","text":"condensation"},{"id":"c2","text":"gas changes into liquid"},{"id":"c3","text":"mass"},{"id":"c4","text":"amount of matter in an object"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct science term-definition pairs.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 8, 'Match the memory cards to form correct science term-definition pairs.', NULL, 'melting pairs with its definition: solid changes into liquid. density pairs with mass per unit volume.',
  '{"cards":[{"id":"c1","text":"melting"},{"id":"c2","text":"solid changes into liquid"},{"id":"c3","text":"density"},{"id":"c4","text":"mass per unit volume"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct science term-definition pairs.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 8, 'Match the memory cards to form correct science term-definition pairs.', NULL, 'boiling pairs with its definition: liquid changes to gas throughout the liquid at its boiling point. atom pairs with smallest unit of an element that retains its chemical identity.',
  '{"cards":[{"id":"c1","text":"boiling"},{"id":"c2","text":"liquid changes to gas throughout the liquid at its boiling point"},{"id":"c3","text":"atom"},{"id":"c4","text":"smallest unit of an element that retains its chemical identity"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct science term-definition pairs.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 9, 'Scenario: A learner must explain photosynthesis during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: plants use light, carbon dioxide, and water to make glucose and oxygen.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of photosynthesis.","decisions":[{"id":"d1","text":"Choose the accurate explanation of photosynthesis.","options":[{"id":"opt1","text":"Plants use light, carbon dioxide, and water to make glucose and oxygen."},{"id":"opt2","text":"Photosynthesis has the opposite meaning."},{"id":"opt3","text":"Photosynthesis is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain photosynthesis during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:plants','subtopic:plants'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 10, 'A laboratory records 13 samples in each of 2 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 13 × 2 = 26.',
  '{"problem":"A laboratory records 13 samples in each of 2 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":26}', '[{"text":"Focus on the key idea behind A laboratory records 13 samples in each of 2 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'condensation means gas changes into liquid. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"condensation"},{"id":"i2","label":"melting"},{"id":"i3","label":"boiling"}],"zones":[{"id":"z1","label":"gas changes into liquid"},{"id":"z2","label":"solid changes into liquid"},{"id":"z3","label":"liquid changes to gas throughout the liquid at its boiling point"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 2, 'Match each science term with its correct description.', NULL, 'melting is correctly paired with its description: solid changes into liquid.',
  '{"leftItems":[{"id":"l1","text":"melting"},{"id":"l2","text":"boiling"},{"id":"l3","text":"gravity"}],"rightItems":[{"id":"r1","text":"solid changes into liquid"},{"id":"r2","text":"liquid changes to gas throughout the liquid at its boiling point"},{"id":"r3","text":"attractive force between masses"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Oxygen is released"},{"id":"o2","label":"Glucose is produced"},{"id":"o3","label":"Carbon dioxide and water are available"},{"id":"o4","label":"Sunlight reaches chlorophyll"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:states-of-matter','subtopic:states-of-matter'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 4, 'Sort the terms by role: place gravity in the focal-concept category and the other terms in related-concept.', NULL, 'gravity is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"gravity"},{"id":"i2","label":"friction"},{"id":"i3","label":"mass"},{"id":"i4","label":"density"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place gravity in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 5, 'A laboratory records 18 samples in each of 2 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 18 × 2 = 36.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 18 samples in each of 2 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":36,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 18 samples in each of 2 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:forces','subtopic:forces'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 7, 'Complete the number pattern: 7, 12, 17, 22, ___.', NULL, 'Each term increases by 5, so the next number is 27.',
  '{"sequence":[{"id":"e1","number":7},{"id":"e2","number":12},{"id":"e3","number":17},{"id":"e4","number":22}],"candidates":[{"id":"c1","number":27},{"id":"c2","number":28},{"id":"c3","number":26}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 7, 12, 17, 22, ___.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 9, 'Scenario: A learner must explain density during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: mass per unit volume.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of density.","decisions":[{"id":"d1","text":"Choose the accurate explanation of density.","options":[{"id":"opt1","text":"Mass per unit volume."},{"id":"opt2","text":"Density has the opposite meaning."},{"id":"opt3","text":"Density is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain density during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:measurement','subtopic:measurement'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 10, 'A laboratory records 21 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 21 × 5 = 105.',
  '{"problem":"A laboratory records 21 samples in each of 5 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":105}', '[{"text":"Focus on the key idea behind A laboratory records 21 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'molecule means two or more atoms chemically bonded together. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"molecule"},{"id":"i2","label":"element"},{"id":"i3","label":"compound"}],"zones":[{"id":"z1","label":"two or more atoms chemically bonded together"},{"id":"z2","label":"pure substance made of one type of atom"},{"id":"z3","label":"substance made from elements chemically combined"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 2, 'Match each science term with its correct description.', NULL, 'element is correctly paired with its description: pure substance made of one type of atom.',
  '{"leftItems":[{"id":"l1","text":"element"},{"id":"l2","text":"compound"},{"id":"l3","text":"pH"}],"rightItems":[{"id":"r1","text":"pure substance made of one type of atom"},{"id":"r2","text":"substance made from elements chemically combined"},{"id":"r3","text":"scale commonly used to describe acidity or alkalinity"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Oxygen is released"},{"id":"o2","label":"Glucose is produced"},{"id":"o3","label":"Carbon dioxide and water are available"},{"id":"o4","label":"Sunlight reaches chlorophyll"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 4, 'Sort the terms by role: place pH in the focal-concept category and the other terms in related-concept.', NULL, 'pH is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"pH"},{"id":"i2","label":"electric current"},{"id":"i3","label":"conductor"},{"id":"i4","label":"insulator"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place pH in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:chemistry','subtopic:chemistry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 5, 'A laboratory records 26 samples in each of 5 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 26 × 5 = 130.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A laboratory records 26 samples in each of 5 equal groups. How many samples are recorded in total? Answer: ___"}', '{"numeric":[{"value":130,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A laboratory records 26 samples in each of 5 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 7, 'Complete the number pattern: 6, 11, 16, 21, ___.', NULL, 'Each term increases by 5, so the next number is 26.',
  '{"sequence":[{"id":"e1","number":6},{"id":"e2","number":11},{"id":"e3","number":16},{"id":"e4","number":21}],"candidates":[{"id":"c1","number":26},{"id":"c2","number":27},{"id":"c3","number":25}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 6, 11, 16, 21, ___.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 9, 'Scenario: A learner must explain insulator during a science activity. Which choice is best?', NULL, 'The correct choice states the key idea: material that strongly resists electric charge flow.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of insulator.","decisions":[{"id":"d1","text":"Choose the accurate explanation of insulator.","options":[{"id":"opt1","text":"Material that strongly resists electric charge flow."},{"id":"opt2","text":"Insulator has the opposite meaning."},{"id":"opt3","text":"Insulator is unrelated to science."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain insulator during a science activity. Which choice is best?.","level":1}]', ARRAY['topic:electricity','subtopic:electricity'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 10, 'A laboratory records 29 samples in each of 3 equal groups. How many samples are recorded in total?', NULL, 'Multiply the number in each group by the number of groups: 29 × 3 = 87.',
  '{"problem":"A laboratory records 29 samples in each of 3 equal groups. How many samples are recorded in total?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":87}', '[{"text":"Focus on the key idea behind A laboratory records 29 samples in each of 3 equal groups. How many samples are recorded in total?.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'refraction means change in direction of light as it enters a different medium. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"refraction"},{"id":"i2","label":"food chain"},{"id":"i3","label":"ecosystem"}],"zones":[{"id":"z1","label":"change in direction of light as it enters a different medium"},{"id":"z2","label":"sequence showing transfer of energy as organisms eat one another"},{"id":"z3","label":"community of organisms interacting with each other and their physical environment"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:light','subtopic:light'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 2, 'Match each science term with its correct description.', NULL, 'food chain is correctly paired with its description: sequence showing transfer of energy as organisms eat one another.',
  '{"leftItems":[{"id":"l1","text":"food chain"},{"id":"l2","text":"ecosystem"},{"id":"l3","text":"cell membrane"}],"rightItems":[{"id":"r1","text":"sequence showing transfer of energy as organisms eat one another"},{"id":"r2","text":"community of organisms interacting with each other and their physical environment"},{"id":"r3","text":"controls what enters and leaves a cell"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each science term with its correct description.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  1, 5, 3, 'Put these steps in the correct order for a science process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Oxygen is released"},{"id":"o2","label":"Glucose is produced"},{"id":"o3","label":"Carbon dioxide and water are available"},{"id":"o4","label":"Sunlight reaches chlorophyll"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a science process.","level":1}]', ARRAY['topic:ecology','subtopic:ecology'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 6, 'Tap the part of the diagram that represents variable.', NULL, 'The target represents variable: named storage location whose value can change during program execution.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating variable","ref":"question-media/technology/programming/technology_programming_6.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"variable","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents variable.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 1, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: technology_programming_6.png
   Prompt: High-detail educational vector diagram of variable, showing the key structures or process needed to understand that named storage location whose value can change during program execution. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 4, 'Sort the terms by role: place RAM in the focal-concept category and the other terms in related-concept.', NULL, 'RAM is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"RAM"},{"id":"i2","label":"storage drive"},{"id":"i3","label":"operating system"},{"id":"i4","label":"algorithm"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place RAM in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:hardware','subtopic:hardware'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 5, 'A program processes 12 records and then receives 5 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 12 + 5 = 17.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 12 records and then receives 5 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":17,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 12 records and then receives 5 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:hardware','subtopic:hardware'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 7, 'Complete the number pattern: 9, 14, 19, 24, ___.', NULL, 'Each term increases by 5, so the next number is 29.',
  '{"sequence":[{"id":"e1","number":9},{"id":"e2","number":14},{"id":"e3","number":19},{"id":"e4","number":24}],"candidates":[{"id":"c1","number":29},{"id":"c2","number":30},{"id":"c3","number":28}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 9, 14, 19, 24, ___.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 9, 'Scenario: A learner must explain algorithm during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: finite set of steps for solving a problem.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of algorithm.","decisions":[{"id":"d1","text":"Choose the accurate explanation of algorithm.","options":[{"id":"opt1","text":"Finite set of steps for solving a problem."},{"id":"opt2","text":"Algorithm has the opposite meaning."},{"id":"opt3","text":"Algorithm is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain algorithm during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 10, 'A program processes 15 records and then receives 8 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 15 + 8 = 23.',
  '{"problem":"A program processes 15 records and then receives 8 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":23}', '[{"text":"Focus on the key idea behind A program processes 15 records and then receives 8 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'loop means repeats a block of instructions. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"loop"},{"id":"i2","label":"conditional"},{"id":"i3","label":"function"}],"zones":[{"id":"z1","label":"repeats a block of instructions"},{"id":"z2","label":"runs instructions based on a Boolean condition"},{"id":"z3","label":"reusable block of code that performs a defined task"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 2, 'Match each technology term with its correct description.', NULL, 'conditional is correctly paired with its description: runs instructions based on a Boolean condition.',
  '{"leftItems":[{"id":"l1","text":"conditional"},{"id":"l2","text":"function"},{"id":"l3","text":"binary"}],"rightItems":[{"id":"r1","text":"runs instructions based on a Boolean condition"},{"id":"r2","text":"reusable block of code that performs a defined task"},{"id":"r3","text":"number system using only 0 and 1"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 4, 'Sort the terms by role: place binary in the focal-concept category and the other terms in related-concept.', NULL, 'binary is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"binary"},{"id":"i2","label":"IP address"},{"id":"i3","label":"router"},{"id":"i4","label":"switch"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place binary in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:data','subtopic:data'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 5, 'A program processes 20 records and then receives 7 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 20 + 7 = 27.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 20 records and then receives 7 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":27,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 20 records and then receives 7 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 7, 'Complete the number pattern: 8, 13, 18, 23, ___.', NULL, 'Each term increases by 5, so the next number is 28.',
  '{"sequence":[{"id":"e1","number":8},{"id":"e2","number":13},{"id":"e3","number":18},{"id":"e4","number":23}],"candidates":[{"id":"c1","number":28},{"id":"c2","number":29},{"id":"c3","number":27}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 8, 13, 18, 23, ___.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 9, 'Scenario: A learner must explain switch during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: connects devices within a local network and forwards frames.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of switch.","decisions":[{"id":"d1","text":"Choose the accurate explanation of switch.","options":[{"id":"opt1","text":"Connects devices within a local network and forwards frames."},{"id":"opt2","text":"Switch has the opposite meaning."},{"id":"opt3","text":"Switch is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain switch during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 10, 'A program processes 23 records and then receives 4 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 23 + 4 = 27.',
  '{"problem":"A program processes 23 records and then receives 4 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":27}', '[{"text":"Focus on the key idea behind A program processes 23 records and then receives 4 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'HTTP means application-layer protocol commonly used to transfer web resources. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"HTTP"},{"id":"i2","label":"HTTPS"},{"id":"i3","label":"database"}],"zones":[{"id":"z1","label":"application-layer protocol commonly used to transfer web resources"},{"id":"z2","label":"HTTP protected with TLS encryption"},{"id":"z3","label":"organized collection of data designed for storage and retrieval"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 2, 'Match each technology term with its correct description.', NULL, 'HTTPS is correctly paired with its description: HTTP protected with TLS encryption.',
  '{"leftItems":[{"id":"l1","text":"HTTPS"},{"id":"l2","text":"database"},{"id":"l3","text":"SQL"}],"rightItems":[{"id":"r1","text":"HTTP protected with TLS encryption"},{"id":"r2","text":"organized collection of data designed for storage and retrieval"},{"id":"r3","text":"language commonly used to query and manipulate relational databases"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 4, 'Sort the terms by role: place SQL in the focal-concept category and the other terms in related-concept.', NULL, 'SQL is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"SQL"},{"id":"i2","label":"primary key"},{"id":"i3","label":"API"},{"id":"i4","label":"encryption"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place SQL in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 5, 'A program processes 28 records and then receives 3 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 28 + 3 = 31.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 28 records and then receives 3 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":31,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 28 records and then receives 3 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 7, 'Complete the number pattern: 7, 12, 17, 22, ___.', NULL, 'Each term increases by 5, so the next number is 27.',
  '{"sequence":[{"id":"e1","number":7},{"id":"e2","number":12},{"id":"e3","number":17},{"id":"e4","number":22}],"candidates":[{"id":"c1","number":27},{"id":"c2","number":28},{"id":"c3","number":26}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 7, 12, 17, 22, ___.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 9, 'Scenario: A learner must explain encryption during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: transforms readable data into protected ciphertext using a cryptographic method.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of encryption.","decisions":[{"id":"d1","text":"Choose the accurate explanation of encryption.","options":[{"id":"opt1","text":"Transforms readable data into protected ciphertext using a cryptographic method."},{"id":"opt2","text":"Encryption has the opposite meaning."},{"id":"opt3","text":"Encryption is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain encryption during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 10, 'A program processes 31 records and then receives 6 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 31 + 6 = 37.',
  '{"problem":"A program processes 31 records and then receives 6 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":37}', '[{"text":"Focus on the key idea behind A program processes 31 records and then receives 6 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'firewall means controls network traffic according to defined rules. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"firewall"},{"id":"i2","label":"version control"},{"id":"i3","label":"cloud computing"}],"zones":[{"id":"z1","label":"controls network traffic according to defined rules"},{"id":"z2","label":"records changes to files so work can be tracked and recovered"},{"id":"z3","label":"on-demand delivery of computing resources over a network"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 2, 'Match each technology term with its correct description.', NULL, 'version control is correctly paired with its description: records changes to files so work can be tracked and recovered.',
  '{"leftItems":[{"id":"l1","text":"version control"},{"id":"l2","text":"cloud computing"},{"id":"l3","text":"CPU"}],"rightItems":[{"id":"r1","text":"records changes to files so work can be tracked and recovered"},{"id":"r2","text":"on-demand delivery of computing resources over a network"},{"id":"r3","text":"executes instructions and performs calculations in a computer"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:development','subtopic:development'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 6, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:cloud','subtopic:cloud'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 6, 'Tap the part of the diagram that represents loop.', NULL, 'The target represents loop: repeats a block of instructions.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating loop","ref":"question-media/technology/programming/technology_programming_7.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"loop","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents loop.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 2, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: technology_programming_7.png
   Prompt: High-detail educational vector diagram of loop, showing the key structures or process needed to understand that repeats a block of instructions. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 4, 'Sort the terms by role: place RAM in the focal-concept category and the other terms in related-concept.', NULL, 'RAM is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"RAM"},{"id":"i2","label":"storage drive"},{"id":"i3","label":"operating system"},{"id":"i4","label":"algorithm"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place RAM in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:hardware','subtopic:hardware'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 5, 'A program processes 13 records and then receives 5 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 13 + 5 = 18.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 13 records and then receives 5 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":18,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 13 records and then receives 5 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:hardware','subtopic:hardware'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 7, 'Complete the number pattern: 10, 15, 20, 25, ___.', NULL, 'Each term increases by 5, so the next number is 30.',
  '{"sequence":[{"id":"e1","number":10},{"id":"e2","number":15},{"id":"e3","number":20},{"id":"e4","number":25}],"candidates":[{"id":"c1","number":30},{"id":"c2","number":31},{"id":"c3","number":29}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 10, 15, 20, 25, ___.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 9, 'Scenario: A learner must explain algorithm during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: finite set of steps for solving a problem.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of algorithm.","decisions":[{"id":"d1","text":"Choose the accurate explanation of algorithm.","options":[{"id":"opt1","text":"Finite set of steps for solving a problem."},{"id":"opt2","text":"Algorithm has the opposite meaning."},{"id":"opt3","text":"Algorithm is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain algorithm during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 10, 'A program processes 16 records and then receives 8 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 16 + 8 = 24.',
  '{"problem":"A program processes 16 records and then receives 8 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":24}', '[{"text":"Focus on the key idea behind A program processes 16 records and then receives 8 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'loop means repeats a block of instructions. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"loop"},{"id":"i2","label":"conditional"},{"id":"i3","label":"function"}],"zones":[{"id":"z1","label":"repeats a block of instructions"},{"id":"z2","label":"runs instructions based on a Boolean condition"},{"id":"z3","label":"reusable block of code that performs a defined task"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 2, 'Match each technology term with its correct description.', NULL, 'conditional is correctly paired with its description: runs instructions based on a Boolean condition.',
  '{"leftItems":[{"id":"l1","text":"conditional"},{"id":"l2","text":"function"},{"id":"l3","text":"binary"}],"rightItems":[{"id":"r1","text":"runs instructions based on a Boolean condition"},{"id":"r2","text":"reusable block of code that performs a defined task"},{"id":"r3","text":"number system using only 0 and 1"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 4, 'Sort the terms by role: place binary in the focal-concept category and the other terms in related-concept.', NULL, 'binary is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"binary"},{"id":"i2","label":"IP address"},{"id":"i3","label":"router"},{"id":"i4","label":"switch"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place binary in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:data','subtopic:data'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 5, 'A program processes 21 records and then receives 7 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 21 + 7 = 28.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 21 records and then receives 7 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":28,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 21 records and then receives 7 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 7, 'Complete the number pattern: 9, 14, 19, 24, ___.', NULL, 'Each term increases by 5, so the next number is 29.',
  '{"sequence":[{"id":"e1","number":9},{"id":"e2","number":14},{"id":"e3","number":19},{"id":"e4","number":24}],"candidates":[{"id":"c1","number":29},{"id":"c2","number":30},{"id":"c3","number":28}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 9, 14, 19, 24, ___.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 9, 'Scenario: A learner must explain switch during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: connects devices within a local network and forwards frames.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of switch.","decisions":[{"id":"d1","text":"Choose the accurate explanation of switch.","options":[{"id":"opt1","text":"Connects devices within a local network and forwards frames."},{"id":"opt2","text":"Switch has the opposite meaning."},{"id":"opt3","text":"Switch is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain switch during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 10, 'A program processes 24 records and then receives 4 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 24 + 4 = 28.',
  '{"problem":"A program processes 24 records and then receives 4 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":28}', '[{"text":"Focus on the key idea behind A program processes 24 records and then receives 4 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'HTTP means application-layer protocol commonly used to transfer web resources. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"HTTP"},{"id":"i2","label":"HTTPS"},{"id":"i3","label":"database"}],"zones":[{"id":"z1","label":"application-layer protocol commonly used to transfer web resources"},{"id":"z2","label":"HTTP protected with TLS encryption"},{"id":"z3","label":"organized collection of data designed for storage and retrieval"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 2, 'Match each technology term with its correct description.', NULL, 'HTTPS is correctly paired with its description: HTTP protected with TLS encryption.',
  '{"leftItems":[{"id":"l1","text":"HTTPS"},{"id":"l2","text":"database"},{"id":"l3","text":"SQL"}],"rightItems":[{"id":"r1","text":"HTTP protected with TLS encryption"},{"id":"r2","text":"organized collection of data designed for storage and retrieval"},{"id":"r3","text":"language commonly used to query and manipulate relational databases"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 4, 'Sort the terms by role: place SQL in the focal-concept category and the other terms in related-concept.', NULL, 'SQL is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"SQL"},{"id":"i2","label":"primary key"},{"id":"i3","label":"API"},{"id":"i4","label":"encryption"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place SQL in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 5, 'A program processes 29 records and then receives 3 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 29 + 3 = 32.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 29 records and then receives 3 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":32,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 29 records and then receives 3 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 7, 'Complete the number pattern: 8, 13, 18, 23, ___.', NULL, 'Each term increases by 5, so the next number is 28.',
  '{"sequence":[{"id":"e1","number":8},{"id":"e2","number":13},{"id":"e3","number":18},{"id":"e4","number":23}],"candidates":[{"id":"c1","number":28},{"id":"c2","number":29},{"id":"c3","number":27}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 8, 13, 18, 23, ___.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 9, 'Scenario: A learner must explain encryption during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: transforms readable data into protected ciphertext using a cryptographic method.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of encryption.","decisions":[{"id":"d1","text":"Choose the accurate explanation of encryption.","options":[{"id":"opt1","text":"Transforms readable data into protected ciphertext using a cryptographic method."},{"id":"opt2","text":"Encryption has the opposite meaning."},{"id":"opt3","text":"Encryption is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain encryption during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 10, 'A program processes 32 records and then receives 6 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 32 + 6 = 38.',
  '{"problem":"A program processes 32 records and then receives 6 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":38}', '[{"text":"Focus on the key idea behind A program processes 32 records and then receives 6 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'firewall means controls network traffic according to defined rules. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"firewall"},{"id":"i2","label":"version control"},{"id":"i3","label":"cloud computing"}],"zones":[{"id":"z1","label":"controls network traffic according to defined rules"},{"id":"z2","label":"records changes to files so work can be tracked and recovered"},{"id":"z3","label":"on-demand delivery of computing resources over a network"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 2, 'Match each technology term with its correct description.', NULL, 'version control is correctly paired with its description: records changes to files so work can be tracked and recovered.',
  '{"leftItems":[{"id":"l1","text":"version control"},{"id":"l2","text":"cloud computing"},{"id":"l3","text":"CPU"}],"rightItems":[{"id":"r1","text":"records changes to files so work can be tracked and recovered"},{"id":"r2","text":"on-demand delivery of computing resources over a network"},{"id":"r3","text":"executes instructions and performs calculations in a computer"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:development','subtopic:development'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 7, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:cloud','subtopic:cloud'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 6, 'Tap the part of the diagram that represents conditional.', NULL, 'The target represents conditional: runs instructions based on a Boolean condition.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating conditional","ref":"question-media/technology/programming/technology_programming_8.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"conditional","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents conditional.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 3, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: technology_programming_8.png
   Prompt: High-detail educational vector diagram of conditional, showing the key structures or process needed to understand that runs instructions based on a Boolean condition. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 4, 'Sort the terms by role: place RAM in the focal-concept category and the other terms in related-concept.', NULL, 'RAM is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"RAM"},{"id":"i2","label":"storage drive"},{"id":"i3","label":"operating system"},{"id":"i4","label":"algorithm"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place RAM in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:hardware','subtopic:hardware'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 5, 'A program processes 14 records and then receives 5 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 14 + 5 = 19.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 14 records and then receives 5 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":19,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 14 records and then receives 5 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:hardware','subtopic:hardware'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 7, 'Complete the number pattern: 11, 16, 21, 26, ___.', NULL, 'Each term increases by 5, so the next number is 31.',
  '{"sequence":[{"id":"e1","number":11},{"id":"e2","number":16},{"id":"e3","number":21},{"id":"e4","number":26}],"candidates":[{"id":"c1","number":31},{"id":"c2","number":32},{"id":"c3","number":30}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 11, 16, 21, 26, ___.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 9, 'Scenario: A learner must explain algorithm during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: finite set of steps for solving a problem.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of algorithm.","decisions":[{"id":"d1","text":"Choose the accurate explanation of algorithm.","options":[{"id":"opt1","text":"Finite set of steps for solving a problem."},{"id":"opt2","text":"Algorithm has the opposite meaning."},{"id":"opt3","text":"Algorithm is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain algorithm during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 10, 'A program processes 17 records and then receives 8 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 17 + 8 = 25.',
  '{"problem":"A program processes 17 records and then receives 8 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":25}', '[{"text":"Focus on the key idea behind A program processes 17 records and then receives 8 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'loop means repeats a block of instructions. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"loop"},{"id":"i2","label":"conditional"},{"id":"i3","label":"function"}],"zones":[{"id":"z1","label":"repeats a block of instructions"},{"id":"z2","label":"runs instructions based on a Boolean condition"},{"id":"z3","label":"reusable block of code that performs a defined task"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 2, 'Match each technology term with its correct description.', NULL, 'conditional is correctly paired with its description: runs instructions based on a Boolean condition.',
  '{"leftItems":[{"id":"l1","text":"conditional"},{"id":"l2","text":"function"},{"id":"l3","text":"binary"}],"rightItems":[{"id":"r1","text":"runs instructions based on a Boolean condition"},{"id":"r2","text":"reusable block of code that performs a defined task"},{"id":"r3","text":"number system using only 0 and 1"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 4, 'Sort the terms by role: place binary in the focal-concept category and the other terms in related-concept.', NULL, 'binary is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"binary"},{"id":"i2","label":"IP address"},{"id":"i3","label":"router"},{"id":"i4","label":"switch"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place binary in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:data','subtopic:data'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 5, 'A program processes 22 records and then receives 7 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 22 + 7 = 29.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 22 records and then receives 7 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":29,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 22 records and then receives 7 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 7, 'Complete the number pattern: 10, 15, 20, 25, ___.', NULL, 'Each term increases by 5, so the next number is 30.',
  '{"sequence":[{"id":"e1","number":10},{"id":"e2","number":15},{"id":"e3","number":20},{"id":"e4","number":25}],"candidates":[{"id":"c1","number":30},{"id":"c2","number":31},{"id":"c3","number":29}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 10, 15, 20, 25, ___.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 9, 'Scenario: A learner must explain switch during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: connects devices within a local network and forwards frames.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of switch.","decisions":[{"id":"d1","text":"Choose the accurate explanation of switch.","options":[{"id":"opt1","text":"Connects devices within a local network and forwards frames."},{"id":"opt2","text":"Switch has the opposite meaning."},{"id":"opt3","text":"Switch is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain switch during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 10, 'A program processes 25 records and then receives 4 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 25 + 4 = 29.',
  '{"problem":"A program processes 25 records and then receives 4 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":29}', '[{"text":"Focus on the key idea behind A program processes 25 records and then receives 4 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'HTTP means application-layer protocol commonly used to transfer web resources. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"HTTP"},{"id":"i2","label":"HTTPS"},{"id":"i3","label":"database"}],"zones":[{"id":"z1","label":"application-layer protocol commonly used to transfer web resources"},{"id":"z2","label":"HTTP protected with TLS encryption"},{"id":"z3","label":"organized collection of data designed for storage and retrieval"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 2, 'Match each technology term with its correct description.', NULL, 'HTTPS is correctly paired with its description: HTTP protected with TLS encryption.',
  '{"leftItems":[{"id":"l1","text":"HTTPS"},{"id":"l2","text":"database"},{"id":"l3","text":"SQL"}],"rightItems":[{"id":"r1","text":"HTTP protected with TLS encryption"},{"id":"r2","text":"organized collection of data designed for storage and retrieval"},{"id":"r3","text":"language commonly used to query and manipulate relational databases"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 4, 'Sort the terms by role: place SQL in the focal-concept category and the other terms in related-concept.', NULL, 'SQL is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"SQL"},{"id":"i2","label":"primary key"},{"id":"i3","label":"API"},{"id":"i4","label":"encryption"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place SQL in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 5, 'A program processes 30 records and then receives 3 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 30 + 3 = 33.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 30 records and then receives 3 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":33,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 30 records and then receives 3 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 7, 'Complete the number pattern: 9, 14, 19, 24, ___.', NULL, 'Each term increases by 5, so the next number is 29.',
  '{"sequence":[{"id":"e1","number":9},{"id":"e2","number":14},{"id":"e3","number":19},{"id":"e4","number":24}],"candidates":[{"id":"c1","number":29},{"id":"c2","number":30},{"id":"c3","number":28}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 9, 14, 19, 24, ___.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 9, 'Scenario: A learner must explain encryption during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: transforms readable data into protected ciphertext using a cryptographic method.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of encryption.","decisions":[{"id":"d1","text":"Choose the accurate explanation of encryption.","options":[{"id":"opt1","text":"Transforms readable data into protected ciphertext using a cryptographic method."},{"id":"opt2","text":"Encryption has the opposite meaning."},{"id":"opt3","text":"Encryption is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain encryption during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 10, 'A program processes 33 records and then receives 6 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 33 + 6 = 39.',
  '{"problem":"A program processes 33 records and then receives 6 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":39}', '[{"text":"Focus on the key idea behind A program processes 33 records and then receives 6 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'firewall means controls network traffic according to defined rules. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"firewall"},{"id":"i2","label":"version control"},{"id":"i3","label":"cloud computing"}],"zones":[{"id":"z1","label":"controls network traffic according to defined rules"},{"id":"z2","label":"records changes to files so work can be tracked and recovered"},{"id":"z3","label":"on-demand delivery of computing resources over a network"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 2, 'Match each technology term with its correct description.', NULL, 'version control is correctly paired with its description: records changes to files so work can be tracked and recovered.',
  '{"leftItems":[{"id":"l1","text":"version control"},{"id":"l2","text":"cloud computing"},{"id":"l3","text":"CPU"}],"rightItems":[{"id":"r1","text":"records changes to files so work can be tracked and recovered"},{"id":"r2","text":"on-demand delivery of computing resources over a network"},{"id":"r3","text":"executes instructions and performs calculations in a computer"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:development','subtopic:development'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 8, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The client connects to the destination"},{"id":"o2","label":"An IP address is returned"},{"id":"o3","label":"DNS is queried"},{"id":"o4","label":"A user enters a domain name"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:cloud','subtopic:cloud'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 6, 'Tap the part of the diagram that represents function.', NULL, 'The target represents function: reusable block of code that performs a defined task.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating function","ref":"question-media/technology/programming/technology_programming_9.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"function","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents function.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 4, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: technology_programming_9.png
   Prompt: High-detail educational vector diagram of function, showing the key structures or process needed to understand that reusable block of code that performs a defined task. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 8, 'Match the memory cards to form correct technology term-definition pairs.', NULL, 'IP address pairs with its definition: logical address used to identify a device or interface on a network. HTTPS pairs with HTTP protected with TLS encryption.',
  '{"cards":[{"id":"c1","text":"IP address"},{"id":"c2","text":"logical address used to identify a device or interface on a network"},{"id":"c3","text":"HTTPS"},{"id":"c4","text":"HTTP protected with TLS encryption"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct technology term-definition pairs.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 8, 'Match the memory cards to form correct technology term-definition pairs.', NULL, 'router pairs with its definition: forwards packets between networks. database pairs with organized collection of data designed for storage and retrieval.',
  '{"cards":[{"id":"c1","text":"router"},{"id":"c2","text":"forwards packets between networks"},{"id":"c3","text":"database"},{"id":"c4","text":"organized collection of data designed for storage and retrieval"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct technology term-definition pairs.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 4, 'Sort the terms by role: place operating system in the focal-concept category and the other terms in related-concept.', NULL, 'operating system is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"operating system"},{"id":"i2","label":"algorithm"},{"id":"i3","label":"variable"},{"id":"i4","label":"loop"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place operating system in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 5, 'A program processes 17 records and then receives 7 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 17 + 7 = 24.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 17 records and then receives 7 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":24,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 17 records and then receives 7 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 7, 'Complete the number pattern: 14, 17, 20, 23, ___.', NULL, 'Each term increases by 3, so the next number is 26.',
  '{"sequence":[{"id":"e1","number":14},{"id":"e2","number":17},{"id":"e3","number":20},{"id":"e4","number":23}],"candidates":[{"id":"c1","number":26},{"id":"c2","number":27},{"id":"c3","number":25}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 14, 17, 20, 23, ___.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 9, 'Scenario: A learner must explain loop during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: repeats a block of instructions.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of loop.","decisions":[{"id":"d1","text":"Choose the accurate explanation of loop.","options":[{"id":"opt1","text":"Repeats a block of instructions."},{"id":"opt2","text":"Loop has the opposite meaning."},{"id":"opt3","text":"Loop is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain loop during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 10, 'A program processes 20 records and then receives 4 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 20 + 4 = 24.',
  '{"problem":"A program processes 20 records and then receives 4 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":24}', '[{"text":"Focus on the key idea behind A program processes 20 records and then receives 4 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'function means reusable block of code that performs a defined task. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"function"},{"id":"i2","label":"binary"},{"id":"i3","label":"IP address"}],"zones":[{"id":"z1","label":"reusable block of code that performs a defined task"},{"id":"z2","label":"number system using only 0 and 1"},{"id":"z3","label":"logical address used to identify a device or interface on a network"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 2, 'Match each technology term with its correct description.', NULL, 'binary is correctly paired with its description: number system using only 0 and 1.',
  '{"leftItems":[{"id":"l1","text":"binary"},{"id":"l2","text":"IP address"},{"id":"l3","text":"router"}],"rightItems":[{"id":"r1","text":"number system using only 0 and 1"},{"id":"r2","text":"logical address used to identify a device or interface on a network"},{"id":"r3","text":"forwards packets between networks"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:data','subtopic:data'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is returned securely"},{"id":"o2","label":"The server processes the request"},{"id":"o3","label":"TLS protects the connection"},{"id":"o4","label":"A client sends an HTTPS request"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 4, 'Sort the terms by role: place router in the focal-concept category and the other terms in related-concept.', NULL, 'router is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"router"},{"id":"i2","label":"switch"},{"id":"i3","label":"DNS"},{"id":"i4","label":"HTTP"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place router in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 5, 'A program processes 25 records and then receives 3 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 25 + 3 = 28.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 25 records and then receives 3 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":28,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 25 records and then receives 3 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 7, 'Complete the number pattern: 13, 16, 19, 22, ___.', NULL, 'Each term increases by 3, so the next number is 25.',
  '{"sequence":[{"id":"e1","number":13},{"id":"e2","number":16},{"id":"e3","number":19},{"id":"e4","number":22}],"candidates":[{"id":"c1","number":25},{"id":"c2","number":26},{"id":"c3","number":24}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 13, 16, 19, 22, ___.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 9, 'Scenario: A learner must explain HTTP during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: application-layer protocol commonly used to transfer web resources.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of HTTP.","decisions":[{"id":"d1","text":"Choose the accurate explanation of HTTP.","options":[{"id":"opt1","text":"Application-layer protocol commonly used to transfer web resources."},{"id":"opt2","text":"Http has the opposite meaning."},{"id":"opt3","text":"Http is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain HTTP during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 10, 'A program processes 28 records and then receives 6 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 28 + 6 = 34.',
  '{"problem":"A program processes 28 records and then receives 6 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":34}', '[{"text":"Focus on the key idea behind A program processes 28 records and then receives 6 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'database means organized collection of data designed for storage and retrieval. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"database"},{"id":"i2","label":"SQL"},{"id":"i3","label":"primary key"}],"zones":[{"id":"z1","label":"organized collection of data designed for storage and retrieval"},{"id":"z2","label":"language commonly used to query and manipulate relational databases"},{"id":"z3","label":"column or set of columns that uniquely identifies a row"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 2, 'Match each technology term with its correct description.', NULL, 'SQL is correctly paired with its description: language commonly used to query and manipulate relational databases.',
  '{"leftItems":[{"id":"l1","text":"SQL"},{"id":"l2","text":"primary key"},{"id":"l3","text":"API"}],"rightItems":[{"id":"r1","text":"language commonly used to query and manipulate relational databases"},{"id":"r2","text":"column or set of columns that uniquely identifies a row"},{"id":"r3","text":"defined interface through which software components communicate"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is returned securely"},{"id":"o2","label":"The server processes the request"},{"id":"o3","label":"TLS protects the connection"},{"id":"o4","label":"A client sends an HTTPS request"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 4, 'Sort the terms by role: place API in the focal-concept category and the other terms in related-concept.', NULL, 'API is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"API"},{"id":"i2","label":"encryption"},{"id":"i3","label":"authentication"},{"id":"i4","label":"firewall"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place API in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 5, 'A program processes 33 records and then receives 5 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 33 + 5 = 38.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 33 records and then receives 5 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":38,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 33 records and then receives 5 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 7, 'Complete the number pattern: 12, 15, 18, 21, ___.', NULL, 'Each term increases by 3, so the next number is 24.',
  '{"sequence":[{"id":"e1","number":12},{"id":"e2","number":15},{"id":"e3","number":18},{"id":"e4","number":21}],"candidates":[{"id":"c1","number":24},{"id":"c2","number":25},{"id":"c3","number":23}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 12, 15, 18, 21, ___.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 9, 'Scenario: A learner must explain firewall during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: controls network traffic according to defined rules.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of firewall.","decisions":[{"id":"d1","text":"Choose the accurate explanation of firewall.","options":[{"id":"opt1","text":"Controls network traffic according to defined rules."},{"id":"opt2","text":"Firewall has the opposite meaning."},{"id":"opt3","text":"Firewall is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain firewall during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 10, 'A program processes 36 records and then receives 8 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 36 + 8 = 44.',
  '{"problem":"A program processes 36 records and then receives 8 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":44}', '[{"text":"Focus on the key idea behind A program processes 36 records and then receives 8 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:development','subtopic:development'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 9, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'cloud computing means on-demand delivery of computing resources over a network. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"cloud computing"},{"id":"i2","label":"CPU"},{"id":"i3","label":"RAM"}],"zones":[{"id":"z1","label":"on-demand delivery of computing resources over a network"},{"id":"z2","label":"executes instructions and performs calculations in a computer"},{"id":"z3","label":"temporary working memory used by running programs"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:cloud','subtopic:cloud'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 6, 'Tap the part of the diagram that represents binary.', NULL, 'The target represents binary: number system using only 0 and 1.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating binary","ref":"question-media/technology/data/technology_data_10.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"binary","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents binary.","level":1}]', ARRAY['topic:data','subtopic:data'], 6, 9, 5, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: technology_data_10.png
   Prompt: High-detail educational vector diagram of binary, showing the key structures or process needed to understand that number system using only 0 and 1. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 8, 'Match the memory cards to form correct technology term-definition pairs.', NULL, 'router pairs with its definition: forwards packets between networks. database pairs with organized collection of data designed for storage and retrieval.',
  '{"cards":[{"id":"c1","text":"router"},{"id":"c2","text":"forwards packets between networks"},{"id":"c3","text":"database"},{"id":"c4","text":"organized collection of data designed for storage and retrieval"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct technology term-definition pairs.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 8, 'Match the memory cards to form correct technology term-definition pairs.', NULL, 'switch pairs with its definition: connects devices within a local network and forwards frames. SQL pairs with language commonly used to query and manipulate relational databases.',
  '{"cards":[{"id":"c1","text":"switch"},{"id":"c2","text":"connects devices within a local network and forwards frames"},{"id":"c3","text":"SQL"},{"id":"c4","text":"language commonly used to query and manipulate relational databases"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct technology term-definition pairs.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 8, 'Match the memory cards to form correct technology term-definition pairs.', NULL, 'DNS pairs with its definition: translates domain names into IP addresses. primary key pairs with column or set of columns that uniquely identifies a row.',
  '{"cards":[{"id":"c1","text":"DNS"},{"id":"c2","text":"translates domain names into IP addresses"},{"id":"c3","text":"primary key"},{"id":"c4","text":"column or set of columns that uniquely identifies a row"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct technology term-definition pairs.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 2, 'Match each technology term with its correct description.', NULL, 'algorithm is correctly paired with its description: finite set of steps for solving a problem.',
  '{"leftItems":[{"id":"l1","text":"algorithm"},{"id":"l2","text":"variable"},{"id":"l3","text":"loop"}],"rightItems":[{"id":"r1","text":"finite set of steps for solving a problem"},{"id":"r2","text":"named storage location whose value can change during program execution"},{"id":"r3","text":"repeats a block of instructions"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The repository records the new version"},{"id":"o2","label":"The change is committed"},{"id":"o3","label":"The change is tested"},{"id":"o4","label":"Source code is changed"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 4, 'Sort the terms by role: place loop in the focal-concept category and the other terms in related-concept.', NULL, 'loop is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"loop"},{"id":"i2","label":"conditional"},{"id":"i3","label":"function"},{"id":"i4","label":"binary"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place loop in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 5, 'A program processes 21 records and then receives 4 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 21 + 4 = 25.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 21 records and then receives 4 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":25,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 21 records and then receives 4 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 7, 'Complete the number pattern: 18, 20, 22, 24, ___.', NULL, 'Each term increases by 2, so the next number is 26.',
  '{"sequence":[{"id":"e1","number":18},{"id":"e2","number":20},{"id":"e3","number":22},{"id":"e4","number":24}],"candidates":[{"id":"c1","number":26},{"id":"c2","number":27},{"id":"c3","number":25}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 18, 20, 22, 24, ___.","level":1}]', ARRAY['topic:programming','subtopic:programming'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 9, 'Scenario: A learner must explain binary during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: number system using only 0 and 1.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of binary.","decisions":[{"id":"d1","text":"Choose the accurate explanation of binary.","options":[{"id":"opt1","text":"Number system using only 0 and 1."},{"id":"opt2","text":"Binary has the opposite meaning."},{"id":"opt3","text":"Binary is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain binary during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:data','subtopic:data'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 10, 'A program processes 24 records and then receives 7 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 24 + 7 = 31.',
  '{"problem":"A program processes 24 records and then receives 7 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":31}', '[{"text":"Focus on the key idea behind A program processes 24 records and then receives 7 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'router means forwards packets between networks. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"router"},{"id":"i2","label":"switch"},{"id":"i3","label":"DNS"}],"zones":[{"id":"z1","label":"forwards packets between networks"},{"id":"z2","label":"connects devices within a local network and forwards frames"},{"id":"z3","label":"translates domain names into IP addresses"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 2, 'Match each technology term with its correct description.', NULL, 'switch is correctly paired with its description: connects devices within a local network and forwards frames.',
  '{"leftItems":[{"id":"l1","text":"switch"},{"id":"l2","text":"DNS"},{"id":"l3","text":"HTTP"}],"rightItems":[{"id":"r1","text":"connects devices within a local network and forwards frames"},{"id":"r2","text":"translates domain names into IP addresses"},{"id":"r3","text":"application-layer protocol commonly used to transfer web resources"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The repository records the new version"},{"id":"o2","label":"The change is committed"},{"id":"o3","label":"The change is tested"},{"id":"o4","label":"Source code is changed"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:networks','subtopic:networks'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 4, 'Sort the terms by role: place HTTP in the focal-concept category and the other terms in related-concept.', NULL, 'HTTP is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"HTTP"},{"id":"i2","label":"HTTPS"},{"id":"i3","label":"database"},{"id":"i4","label":"SQL"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place HTTP in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 5, 'A program processes 29 records and then receives 6 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 29 + 6 = 35.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 29 records and then receives 6 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":35,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 29 records and then receives 6 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:web','subtopic:web'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 7, 'Complete the number pattern: 17, 19, 21, 23, ___.', NULL, 'Each term increases by 2, so the next number is 25.',
  '{"sequence":[{"id":"e1","number":17},{"id":"e2","number":19},{"id":"e3","number":21},{"id":"e4","number":23}],"candidates":[{"id":"c1","number":25},{"id":"c2","number":26},{"id":"c3","number":24}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 17, 19, 21, 23, ___.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 9, 'Scenario: A learner must explain SQL during a technology activity. Which choice is best?', NULL, 'The correct choice states the key idea: language commonly used to query and manipulate relational databases.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of SQL.","decisions":[{"id":"d1","text":"Choose the accurate explanation of SQL.","options":[{"id":"opt1","text":"Language commonly used to query and manipulate relational databases."},{"id":"opt2","text":"Sql has the opposite meaning."},{"id":"opt3","text":"Sql is unrelated to technology."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain SQL during a technology activity. Which choice is best?.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 10, 'A program processes 32 records and then receives 3 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 32 + 3 = 35.',
  '{"problem":"A program processes 32 records and then receives 3 more records. How many records does it process altogether?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":35}', '[{"text":"Focus on the key idea behind A program processes 32 records and then receives 3 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:databases','subtopic:databases'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'API means defined interface through which software components communicate. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"API"},{"id":"i2","label":"encryption"},{"id":"i3","label":"authentication"}],"zones":[{"id":"z1","label":"defined interface through which software components communicate"},{"id":"z2","label":"transforms readable data into protected ciphertext using a cryptographic method"},{"id":"z3","label":"process of verifying an identity"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:software','subtopic:software'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 2, 'Match each technology term with its correct description.', NULL, 'encryption is correctly paired with its description: transforms readable data into protected ciphertext using a cryptographic method.',
  '{"leftItems":[{"id":"l1","text":"encryption"},{"id":"l2","text":"authentication"},{"id":"l3","text":"firewall"}],"rightItems":[{"id":"r1","text":"transforms readable data into protected ciphertext using a cryptographic method"},{"id":"r2","text":"process of verifying an identity"},{"id":"r3","text":"controls network traffic according to defined rules"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each technology term with its correct description.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 3, 'Put these steps in the correct order for a technology process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The repository records the new version"},{"id":"o2","label":"The change is committed"},{"id":"o3","label":"The change is tested"},{"id":"o4","label":"Source code is changed"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a technology process.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 4, 'Sort the terms by role: place firewall in the focal-concept category and the other terms in related-concept.', NULL, 'firewall is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"firewall"},{"id":"i2","label":"version control"},{"id":"i3","label":"cloud computing"},{"id":"i4","label":"CPU"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place firewall in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:security','subtopic:security'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 5, 'A program processes 37 records and then receives 8 more records. How many records does it process altogether?', NULL, 'Add the two quantities: 37 + 8 = 45.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"A program processes 37 records and then receives 8 more records. How many records does it process altogether? Answer: ___"}', '{"numeric":[{"value":45,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind A program processes 37 records and then receives 8 more records. How many records does it process altogether?.","level":1}]', ARRAY['topic:development','subtopic:development'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  2, 10, 7, 'Complete the number pattern: 16, 18, 20, 22, ___.', NULL, 'Each term increases by 2, so the next number is 24.',
  '{"sequence":[{"id":"e1","number":16},{"id":"e2","number":18},{"id":"e3","number":20},{"id":"e4","number":22}],"candidates":[{"id":"c1","number":24},{"id":"c2","number":25},{"id":"c3","number":23}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 16, 18, 20, 22, ___.","level":1}]', ARRAY['topic:cloud','subtopic:cloud'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 6, 'Tap the part of the diagram that represents gear.', NULL, 'The target represents gear: toothed wheel used to transmit motion and torque.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating gear","ref":"question-media/engineering/machines/engineering_machines_11.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"gear","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents gear.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 1, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: engineering_machines_11.png
   Prompt: High-detail educational vector diagram of gear, showing the key structures or process needed to understand that toothed wheel used to transmit motion and torque. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 9, 'Scenario: A learner must explain column during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: vertical structural member that mainly carries compression.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of column.","decisions":[{"id":"d1","text":"Choose the accurate explanation of column.","options":[{"id":"opt1","text":"Vertical structural member that mainly carries compression."},{"id":"opt2","text":"Column has the opposite meaning."},{"id":"opt3","text":"Column is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain column during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 10, 'An engineer applies a constant force of 23 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 23 × 4 = 92 J.',
  '{"problem":"An engineer applies a constant force of 23 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":92}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 23 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'foundation means part of a structure that transfers loads to the ground. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"foundation"},{"id":"i2","label":"stress"},{"id":"i3","label":"strain"}],"zones":[{"id":"z1","label":"part of a structure that transfers loads to the ground"},{"id":"z2","label":"internal force per unit area in a material"},{"id":"z3","label":"deformation relative to original dimension"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 2, 'Match each engineering term with its correct description.', NULL, 'stress is correctly paired with its description: internal force per unit area in a material.',
  '{"leftItems":[{"id":"l1","text":"stress"},{"id":"l2","text":"strain"},{"id":"l3","text":"elasticity"}],"rightItems":[{"id":"r1","text":"internal force per unit area in a material"},{"id":"r2","text":"deformation relative to original dimension"},{"id":"r3","text":"ability to return toward original shape after load is removed"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 4, 'Sort the terms by role: place elasticity in the focal-concept category and the other terms in related-concept.', NULL, 'elasticity is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"elasticity"},{"id":"i2","label":"density"},{"id":"i3","label":"lever"},{"id":"i4","label":"pulley"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place elasticity in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 5, 'An engineer applies a constant force of 28 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 28 × 5 = 140 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 28 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":140,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 28 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 7, 'Complete the number pattern: 19, 21, 23, 25, ___.', NULL, 'Each term increases by 2, so the next number is 27.',
  '{"sequence":[{"id":"e1","number":19},{"id":"e2","number":21},{"id":"e3","number":23},{"id":"e4","number":25}],"candidates":[{"id":"c1","number":27},{"id":"c2","number":28},{"id":"c3","number":26}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 19, 21, 23, 25, ___.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 9, 'Scenario: A learner must explain pulley during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: wheel with a groove used with a rope or belt to transmit force or motion.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of pulley.","decisions":[{"id":"d1","text":"Choose the accurate explanation of pulley.","options":[{"id":"opt1","text":"Wheel with a groove used with a rope or belt to transmit force or motion."},{"id":"opt2","text":"Pulley has the opposite meaning."},{"id":"opt3","text":"Pulley is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain pulley during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 10, 'An engineer applies a constant force of 31 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 31 × 4 = 124 J.',
  '{"problem":"An engineer applies a constant force of 31 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":124}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 31 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'torque means turning effect of a force about an axis. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"torque"},{"id":"i2","label":"velocity"},{"id":"i3","label":"acceleration"}],"zones":[{"id":"z1","label":"turning effect of a force about an axis"},{"id":"z2","label":"rate of change of displacement with time"},{"id":"z3","label":"rate of change of velocity with time"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 2, 'Match each engineering term with its correct description.', NULL, 'velocity is correctly paired with its description: rate of change of displacement with time.',
  '{"leftItems":[{"id":"l1","text":"velocity"},{"id":"l2","text":"acceleration"},{"id":"l3","text":"work"}],"rightItems":[{"id":"r1","text":"rate of change of displacement with time"},{"id":"r2","text":"rate of change of velocity with time"},{"id":"r3","text":"energy transferred when a force causes displacement in its direction"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 4, 'Sort the terms by role: place work in the focal-concept category and the other terms in related-concept.', NULL, 'work is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"work"},{"id":"i2","label":"power"},{"id":"i3","label":"efficiency"},{"id":"i4","label":"renewable energy"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place work in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 5, 'An engineer applies a constant force of 36 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 36 × 5 = 180 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 36 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":180,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 36 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 7, 'Complete the number pattern: 18, 20, 22, 24, ___.', NULL, 'Each term increases by 2, so the next number is 26.',
  '{"sequence":[{"id":"e1","number":18},{"id":"e2","number":20},{"id":"e3","number":22},{"id":"e4","number":24}],"candidates":[{"id":"c1","number":26},{"id":"c2","number":27},{"id":"c3","number":25}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 18, 20, 22, 24, ___.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 9, 'Scenario: A learner must explain renewable energy during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: energy from sources naturally replenished on a human timescale.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of renewable energy.","decisions":[{"id":"d1","text":"Choose the accurate explanation of renewable energy.","options":[{"id":"opt1","text":"Energy from sources naturally replenished on a human timescale."},{"id":"opt2","text":"Renewable energy has the opposite meaning."},{"id":"opt3","text":"Renewable energy is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain renewable energy during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 10, 'An engineer applies a constant force of 39 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 39 × 4 = 156 J.',
  '{"problem":"An engineer applies a constant force of 39 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":156}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 39 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'hydraulic system means system that uses pressurized fluid to transmit force. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"hydraulic system"},{"id":"i2","label":"pneumatic system"},{"id":"i3","label":"sensor"}],"zones":[{"id":"z1","label":"system that uses pressurized fluid to transmit force"},{"id":"z2","label":"system that uses compressed gas to transmit power"},{"id":"z3","label":"device that detects a physical quantity and produces a usable signal"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 2, 'Match each engineering term with its correct description.', NULL, 'pneumatic system is correctly paired with its description: system that uses compressed gas to transmit power.',
  '{"leftItems":[{"id":"l1","text":"pneumatic system"},{"id":"l2","text":"sensor"},{"id":"l3","text":"feedback"}],"rightItems":[{"id":"r1","text":"system that uses compressed gas to transmit power"},{"id":"r2","text":"device that detects a physical quantity and produces a usable signal"},{"id":"r3","text":"information about system output used to influence later behavior"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 4, 'Sort the terms by role: place feedback in the focal-concept category and the other terms in related-concept.', NULL, 'feedback is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"feedback"},{"id":"i2","label":"prototype"},{"id":"i3","label":"tolerance"},{"id":"i4","label":"beam"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place feedback in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 5, 'An engineer applies a constant force of 44 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 44 × 5 = 220 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 44 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":220,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 44 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:design','subtopic:design'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 11, 7, 'Complete the number pattern: 17, 19, 21, 23, ___.', NULL, 'Each term increases by 2, so the next number is 25.',
  '{"sequence":[{"id":"e1","number":17},{"id":"e2","number":19},{"id":"e3","number":21},{"id":"e4","number":23}],"candidates":[{"id":"c1","number":25},{"id":"c2","number":26},{"id":"c3","number":24}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 17, 19, 21, 23, ___.","level":1}]', ARRAY['topic:manufacturing','subtopic:manufacturing'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 6, 'Tap the part of the diagram that represents torque.', NULL, 'The target represents torque: turning effect of a force about an axis.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating torque","ref":"question-media/engineering/mechanics/engineering_mechanics_12.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"torque","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents torque.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 2, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: engineering_mechanics_12.png
   Prompt: High-detail educational vector diagram of torque, showing the key structures or process needed to understand that turning effect of a force about an axis. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 9, 'Scenario: A learner must explain column during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: vertical structural member that mainly carries compression.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of column.","decisions":[{"id":"d1","text":"Choose the accurate explanation of column.","options":[{"id":"opt1","text":"Vertical structural member that mainly carries compression."},{"id":"opt2","text":"Column has the opposite meaning."},{"id":"opt3","text":"Column is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain column during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 10, 'An engineer applies a constant force of 24 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 24 × 4 = 96 J.',
  '{"problem":"An engineer applies a constant force of 24 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":96}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 24 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'foundation means part of a structure that transfers loads to the ground. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"foundation"},{"id":"i2","label":"stress"},{"id":"i3","label":"strain"}],"zones":[{"id":"z1","label":"part of a structure that transfers loads to the ground"},{"id":"z2","label":"internal force per unit area in a material"},{"id":"z3","label":"deformation relative to original dimension"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 2, 'Match each engineering term with its correct description.', NULL, 'stress is correctly paired with its description: internal force per unit area in a material.',
  '{"leftItems":[{"id":"l1","text":"stress"},{"id":"l2","text":"strain"},{"id":"l3","text":"elasticity"}],"rightItems":[{"id":"r1","text":"internal force per unit area in a material"},{"id":"r2","text":"deformation relative to original dimension"},{"id":"r3","text":"ability to return toward original shape after load is removed"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 4, 'Sort the terms by role: place elasticity in the focal-concept category and the other terms in related-concept.', NULL, 'elasticity is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"elasticity"},{"id":"i2","label":"density"},{"id":"i3","label":"lever"},{"id":"i4","label":"pulley"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place elasticity in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 5, 'An engineer applies a constant force of 29 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 29 × 5 = 145 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 29 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":145,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 29 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 7, 'Complete the number pattern: 20, 22, 24, 26, ___.', NULL, 'Each term increases by 2, so the next number is 28.',
  '{"sequence":[{"id":"e1","number":20},{"id":"e2","number":22},{"id":"e3","number":24},{"id":"e4","number":26}],"candidates":[{"id":"c1","number":28},{"id":"c2","number":29},{"id":"c3","number":27}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 20, 22, 24, 26, ___.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 9, 'Scenario: A learner must explain pulley during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: wheel with a groove used with a rope or belt to transmit force or motion.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of pulley.","decisions":[{"id":"d1","text":"Choose the accurate explanation of pulley.","options":[{"id":"opt1","text":"Wheel with a groove used with a rope or belt to transmit force or motion."},{"id":"opt2","text":"Pulley has the opposite meaning."},{"id":"opt3","text":"Pulley is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain pulley during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 10, 'An engineer applies a constant force of 32 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 32 × 4 = 128 J.',
  '{"problem":"An engineer applies a constant force of 32 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":128}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 32 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'torque means turning effect of a force about an axis. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"torque"},{"id":"i2","label":"velocity"},{"id":"i3","label":"acceleration"}],"zones":[{"id":"z1","label":"turning effect of a force about an axis"},{"id":"z2","label":"rate of change of displacement with time"},{"id":"z3","label":"rate of change of velocity with time"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 2, 'Match each engineering term with its correct description.', NULL, 'velocity is correctly paired with its description: rate of change of displacement with time.',
  '{"leftItems":[{"id":"l1","text":"velocity"},{"id":"l2","text":"acceleration"},{"id":"l3","text":"work"}],"rightItems":[{"id":"r1","text":"rate of change of displacement with time"},{"id":"r2","text":"rate of change of velocity with time"},{"id":"r3","text":"energy transferred when a force causes displacement in its direction"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 4, 'Sort the terms by role: place work in the focal-concept category and the other terms in related-concept.', NULL, 'work is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"work"},{"id":"i2","label":"power"},{"id":"i3","label":"efficiency"},{"id":"i4","label":"renewable energy"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place work in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 5, 'An engineer applies a constant force of 37 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 37 × 5 = 185 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 37 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":185,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 37 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 7, 'Complete the number pattern: 19, 21, 23, 25, ___.', NULL, 'Each term increases by 2, so the next number is 27.',
  '{"sequence":[{"id":"e1","number":19},{"id":"e2","number":21},{"id":"e3","number":23},{"id":"e4","number":25}],"candidates":[{"id":"c1","number":27},{"id":"c2","number":28},{"id":"c3","number":26}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 19, 21, 23, 25, ___.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 9, 'Scenario: A learner must explain renewable energy during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: energy from sources naturally replenished on a human timescale.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of renewable energy.","decisions":[{"id":"d1","text":"Choose the accurate explanation of renewable energy.","options":[{"id":"opt1","text":"Energy from sources naturally replenished on a human timescale."},{"id":"opt2","text":"Renewable energy has the opposite meaning."},{"id":"opt3","text":"Renewable energy is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain renewable energy during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 10, 'An engineer applies a constant force of 40 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 40 × 4 = 160 J.',
  '{"problem":"An engineer applies a constant force of 40 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":160}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 40 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'hydraulic system means system that uses pressurized fluid to transmit force. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"hydraulic system"},{"id":"i2","label":"pneumatic system"},{"id":"i3","label":"sensor"}],"zones":[{"id":"z1","label":"system that uses pressurized fluid to transmit force"},{"id":"z2","label":"system that uses compressed gas to transmit power"},{"id":"z3","label":"device that detects a physical quantity and produces a usable signal"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 2, 'Match each engineering term with its correct description.', NULL, 'pneumatic system is correctly paired with its description: system that uses compressed gas to transmit power.',
  '{"leftItems":[{"id":"l1","text":"pneumatic system"},{"id":"l2","text":"sensor"},{"id":"l3","text":"feedback"}],"rightItems":[{"id":"r1","text":"system that uses compressed gas to transmit power"},{"id":"r2","text":"device that detects a physical quantity and produces a usable signal"},{"id":"r3","text":"information about system output used to influence later behavior"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 4, 'Sort the terms by role: place feedback in the focal-concept category and the other terms in related-concept.', NULL, 'feedback is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"feedback"},{"id":"i2","label":"prototype"},{"id":"i3","label":"tolerance"},{"id":"i4","label":"beam"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place feedback in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 5, 'An engineer applies a constant force of 45 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 45 × 5 = 225 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 45 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":225,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 45 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:design','subtopic:design'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 12, 7, 'Complete the number pattern: 18, 20, 22, 24, ___.', NULL, 'Each term increases by 2, so the next number is 26.',
  '{"sequence":[{"id":"e1","number":18},{"id":"e2","number":20},{"id":"e3","number":22},{"id":"e4","number":24}],"candidates":[{"id":"c1","number":26},{"id":"c2","number":27},{"id":"c3","number":25}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 18, 20, 22, 24, ___.","level":1}]', ARRAY['topic:manufacturing','subtopic:manufacturing'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 6, 'Tap the part of the diagram that represents velocity.', NULL, 'The target represents velocity: rate of change of displacement with time.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating velocity","ref":"question-media/engineering/mechanics/engineering_mechanics_13.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"velocity","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents velocity.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 3, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: engineering_mechanics_13.png
   Prompt: High-detail educational vector diagram of velocity, showing the key structures or process needed to understand that rate of change of displacement with time. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 9, 'Scenario: A learner must explain column during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: vertical structural member that mainly carries compression.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of column.","decisions":[{"id":"d1","text":"Choose the accurate explanation of column.","options":[{"id":"opt1","text":"Vertical structural member that mainly carries compression."},{"id":"opt2","text":"Column has the opposite meaning."},{"id":"opt3","text":"Column is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain column during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 10, 'An engineer applies a constant force of 25 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 25 × 4 = 100 J.',
  '{"problem":"An engineer applies a constant force of 25 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":100}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 25 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'foundation means part of a structure that transfers loads to the ground. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"foundation"},{"id":"i2","label":"stress"},{"id":"i3","label":"strain"}],"zones":[{"id":"z1","label":"part of a structure that transfers loads to the ground"},{"id":"z2","label":"internal force per unit area in a material"},{"id":"z3","label":"deformation relative to original dimension"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 2, 'Match each engineering term with its correct description.', NULL, 'stress is correctly paired with its description: internal force per unit area in a material.',
  '{"leftItems":[{"id":"l1","text":"stress"},{"id":"l2","text":"strain"},{"id":"l3","text":"elasticity"}],"rightItems":[{"id":"r1","text":"internal force per unit area in a material"},{"id":"r2","text":"deformation relative to original dimension"},{"id":"r3","text":"ability to return toward original shape after load is removed"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 4, 'Sort the terms by role: place elasticity in the focal-concept category and the other terms in related-concept.', NULL, 'elasticity is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"elasticity"},{"id":"i2","label":"density"},{"id":"i3","label":"lever"},{"id":"i4","label":"pulley"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place elasticity in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 5, 'An engineer applies a constant force of 30 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 30 × 5 = 150 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 30 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":150,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 30 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 7, 'Complete the number pattern: 21, 23, 25, 27, ___.', NULL, 'Each term increases by 2, so the next number is 29.',
  '{"sequence":[{"id":"e1","number":21},{"id":"e2","number":23},{"id":"e3","number":25},{"id":"e4","number":27}],"candidates":[{"id":"c1","number":29},{"id":"c2","number":30},{"id":"c3","number":28}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 21, 23, 25, 27, ___.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 9, 'Scenario: A learner must explain pulley during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: wheel with a groove used with a rope or belt to transmit force or motion.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of pulley.","decisions":[{"id":"d1","text":"Choose the accurate explanation of pulley.","options":[{"id":"opt1","text":"Wheel with a groove used with a rope or belt to transmit force or motion."},{"id":"opt2","text":"Pulley has the opposite meaning."},{"id":"opt3","text":"Pulley is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain pulley during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 10, 'An engineer applies a constant force of 33 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 33 × 4 = 132 J.',
  '{"problem":"An engineer applies a constant force of 33 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":132}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 33 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'torque means turning effect of a force about an axis. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"torque"},{"id":"i2","label":"velocity"},{"id":"i3","label":"acceleration"}],"zones":[{"id":"z1","label":"turning effect of a force about an axis"},{"id":"z2","label":"rate of change of displacement with time"},{"id":"z3","label":"rate of change of velocity with time"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 2, 'Match each engineering term with its correct description.', NULL, 'velocity is correctly paired with its description: rate of change of displacement with time.',
  '{"leftItems":[{"id":"l1","text":"velocity"},{"id":"l2","text":"acceleration"},{"id":"l3","text":"work"}],"rightItems":[{"id":"r1","text":"rate of change of displacement with time"},{"id":"r2","text":"rate of change of velocity with time"},{"id":"r3","text":"energy transferred when a force causes displacement in its direction"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 4, 'Sort the terms by role: place work in the focal-concept category and the other terms in related-concept.', NULL, 'work is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"work"},{"id":"i2","label":"power"},{"id":"i3","label":"efficiency"},{"id":"i4","label":"renewable energy"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place work in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 5, 'An engineer applies a constant force of 38 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 38 × 5 = 190 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 38 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":190,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 38 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 7, 'Complete the number pattern: 20, 22, 24, 26, ___.', NULL, 'Each term increases by 2, so the next number is 28.',
  '{"sequence":[{"id":"e1","number":20},{"id":"e2","number":22},{"id":"e3","number":24},{"id":"e4","number":26}],"candidates":[{"id":"c1","number":28},{"id":"c2","number":29},{"id":"c3","number":27}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 20, 22, 24, 26, ___.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 9, 'Scenario: A learner must explain renewable energy during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: energy from sources naturally replenished on a human timescale.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of renewable energy.","decisions":[{"id":"d1","text":"Choose the accurate explanation of renewable energy.","options":[{"id":"opt1","text":"Energy from sources naturally replenished on a human timescale."},{"id":"opt2","text":"Renewable energy has the opposite meaning."},{"id":"opt3","text":"Renewable energy is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain renewable energy during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 10, 'An engineer applies a constant force of 41 N through a distance of 4 m in the same direction. What work is done?', NULL, 'Work = force × distance = 41 × 4 = 164 J.',
  '{"problem":"An engineer applies a constant force of 41 N through a distance of 4 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":164}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 41 N through a distance of 4 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'hydraulic system means system that uses pressurized fluid to transmit force. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"hydraulic system"},{"id":"i2","label":"pneumatic system"},{"id":"i3","label":"sensor"}],"zones":[{"id":"z1","label":"system that uses pressurized fluid to transmit force"},{"id":"z2","label":"system that uses compressed gas to transmit power"},{"id":"z3","label":"device that detects a physical quantity and produces a usable signal"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 2, 'Match each engineering term with its correct description.', NULL, 'pneumatic system is correctly paired with its description: system that uses compressed gas to transmit power.',
  '{"leftItems":[{"id":"l1","text":"pneumatic system"},{"id":"l2","text":"sensor"},{"id":"l3","text":"feedback"}],"rightItems":[{"id":"r1","text":"system that uses compressed gas to transmit power"},{"id":"r2","text":"device that detects a physical quantity and produces a usable signal"},{"id":"r3","text":"information about system output used to influence later behavior"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"The response is evaluated against limits"},{"id":"o2","label":"The material deforms"},{"id":"o3","label":"The member experiences internal stress"},{"id":"o4","label":"A force is applied"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 4, 'Sort the terms by role: place feedback in the focal-concept category and the other terms in related-concept.', NULL, 'feedback is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"feedback"},{"id":"i2","label":"prototype"},{"id":"i3","label":"tolerance"},{"id":"i4","label":"beam"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place feedback in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 5, 'An engineer applies a constant force of 46 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 46 × 5 = 230 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 46 N through a distance of 5 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":230,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 46 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:design','subtopic:design'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 13, 7, 'Complete the number pattern: 19, 21, 23, 25, ___.', NULL, 'Each term increases by 2, so the next number is 27.',
  '{"sequence":[{"id":"e1","number":19},{"id":"e2","number":21},{"id":"e3","number":23},{"id":"e4","number":25}],"candidates":[{"id":"c1","number":27},{"id":"c2","number":28},{"id":"c3","number":26}],"interaction":"complete-sequence"}', '{"rule":"Add 2","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 19, 21, 23, 25, ___.","level":1}]', ARRAY['topic:manufacturing','subtopic:manufacturing'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 6, 'Tap the part of the diagram that represents acceleration.', NULL, 'The target represents acceleration: rate of change of velocity with time.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating acceleration","ref":"question-media/engineering/mechanics/engineering_mechanics_14.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"acceleration","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents acceleration.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 4, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: engineering_mechanics_14.png
   Prompt: High-detail educational vector diagram of acceleration, showing the key structures or process needed to understand that rate of change of velocity with time. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 8, 'Match the memory cards to form correct engineering term-definition pairs.', NULL, 'power pairs with its definition: rate at which work is done or energy is transferred. pneumatic system pairs with system that uses compressed gas to transmit power.',
  '{"cards":[{"id":"c1","text":"power"},{"id":"c2","text":"rate at which work is done or energy is transferred"},{"id":"c3","text":"pneumatic system"},{"id":"c4","text":"system that uses compressed gas to transmit power"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct engineering term-definition pairs.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 8, 'Match the memory cards to form correct engineering term-definition pairs.', NULL, 'efficiency pairs with its definition: useful output divided by total input, often expressed as a percentage. sensor pairs with device that detects a physical quantity and produces a usable signal.',
  '{"cards":[{"id":"c1","text":"efficiency"},{"id":"c2","text":"useful output divided by total input, often expressed as a percentage"},{"id":"c3","text":"sensor"},{"id":"c4","text":"device that detects a physical quantity and produces a usable signal"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct engineering term-definition pairs.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 9, 'Scenario: A learner must explain foundation during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: part of a structure that transfers loads to the ground.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of foundation.","decisions":[{"id":"d1","text":"Choose the accurate explanation of foundation.","options":[{"id":"opt1","text":"Part of a structure that transfers loads to the ground."},{"id":"opt2","text":"Foundation has the opposite meaning."},{"id":"opt3","text":"Foundation is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain foundation during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:structures','subtopic:structures'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 10, 'An engineer applies a constant force of 28 N through a distance of 2 m in the same direction. What work is done?', NULL, 'Work = force × distance = 28 × 2 = 56 J.',
  '{"problem":"An engineer applies a constant force of 28 N through a distance of 2 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":56}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 28 N through a distance of 2 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'strain means deformation relative to original dimension. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"strain"},{"id":"i2","label":"elasticity"},{"id":"i3","label":"density"}],"zones":[{"id":"z1","label":"deformation relative to original dimension"},{"id":"z2","label":"ability to return toward original shape after load is removed"},{"id":"z3","label":"mass per unit volume of a material"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 2, 'Match each engineering term with its correct description.', NULL, 'elasticity is correctly paired with its description: ability to return toward original shape after load is removed.',
  '{"leftItems":[{"id":"l1","text":"elasticity"},{"id":"l2","text":"density"},{"id":"l3","text":"lever"}],"rightItems":[{"id":"r1","text":"ability to return toward original shape after load is removed"},{"id":"r2","text":"mass per unit volume of a material"},{"id":"r3","text":"rigid bar that rotates about a fulcrum"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"An actuator or output responds"},{"id":"o2","label":"A controller evaluates feedback"},{"id":"o3","label":"The signal is processed"},{"id":"o4","label":"A sensor detects a quantity"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 4, 'Sort the terms by role: place lever in the focal-concept category and the other terms in related-concept.', NULL, 'lever is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"lever"},{"id":"i2","label":"pulley"},{"id":"i3","label":"gear"},{"id":"i4","label":"torque"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place lever in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 5, 'An engineer applies a constant force of 33 N through a distance of 3 m in the same direction. What work is done?', NULL, 'Work = force × distance = 33 × 3 = 99 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 33 N through a distance of 3 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":99,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 33 N through a distance of 3 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 7, 'Complete the number pattern: 15, 19, 23, 27, ___.', NULL, 'Each term increases by 4, so the next number is 31.',
  '{"sequence":[{"id":"e1","number":15},{"id":"e2","number":19},{"id":"e3","number":23},{"id":"e4","number":27}],"candidates":[{"id":"c1","number":31},{"id":"c2","number":32},{"id":"c3","number":30}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 15, 19, 23, 27, ___.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 9, 'Scenario: A learner must explain torque during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: turning effect of a force about an axis.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of torque.","decisions":[{"id":"d1","text":"Choose the accurate explanation of torque.","options":[{"id":"opt1","text":"Turning effect of a force about an axis."},{"id":"opt2","text":"Torque has the opposite meaning."},{"id":"opt3","text":"Torque is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain torque during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 10, 'An engineer applies a constant force of 36 N through a distance of 2 m in the same direction. What work is done?', NULL, 'Work = force × distance = 36 × 2 = 72 J.',
  '{"problem":"An engineer applies a constant force of 36 N through a distance of 2 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":72}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 36 N through a distance of 2 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'acceleration means rate of change of velocity with time. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"acceleration"},{"id":"i2","label":"work"},{"id":"i3","label":"power"}],"zones":[{"id":"z1","label":"rate of change of velocity with time"},{"id":"z2","label":"energy transferred when a force causes displacement in its direction"},{"id":"z3","label":"rate at which work is done or energy is transferred"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 2, 'Match each engineering term with its correct description.', NULL, 'work is correctly paired with its description: energy transferred when a force causes displacement in its direction.',
  '{"leftItems":[{"id":"l1","text":"work"},{"id":"l2","text":"power"},{"id":"l3","text":"efficiency"}],"rightItems":[{"id":"r1","text":"energy transferred when a force causes displacement in its direction"},{"id":"r2","text":"rate at which work is done or energy is transferred"},{"id":"r3","text":"useful output divided by total input, often expressed as a percentage"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"An actuator or output responds"},{"id":"o2","label":"A controller evaluates feedback"},{"id":"o3","label":"The signal is processed"},{"id":"o4","label":"A sensor detects a quantity"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 4, 'Sort the terms by role: place efficiency in the focal-concept category and the other terms in related-concept.', NULL, 'efficiency is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"efficiency"},{"id":"i2","label":"renewable energy"},{"id":"i3","label":"solar panel"},{"id":"i4","label":"hydraulic system"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place efficiency in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 5, 'An engineer applies a constant force of 41 N through a distance of 3 m in the same direction. What work is done?', NULL, 'Work = force × distance = 41 × 3 = 123 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 41 N through a distance of 3 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":123,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 41 N through a distance of 3 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 7, 'Complete the number pattern: 14, 18, 22, 26, ___.', NULL, 'Each term increases by 4, so the next number is 30.',
  '{"sequence":[{"id":"e1","number":14},{"id":"e2","number":18},{"id":"e3","number":22},{"id":"e4","number":26}],"candidates":[{"id":"c1","number":30},{"id":"c2","number":31},{"id":"c3","number":29}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 14, 18, 22, 26, ___.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 9, 'Scenario: A learner must explain hydraulic system during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: system that uses pressurized fluid to transmit force.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of hydraulic system.","decisions":[{"id":"d1","text":"Choose the accurate explanation of hydraulic system.","options":[{"id":"opt1","text":"System that uses pressurized fluid to transmit force."},{"id":"opt2","text":"Hydraulic system has the opposite meaning."},{"id":"opt3","text":"Hydraulic system is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain hydraulic system during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 10, 'An engineer applies a constant force of 44 N through a distance of 2 m in the same direction. What work is done?', NULL, 'Work = force × distance = 44 × 2 = 88 J.',
  '{"problem":"An engineer applies a constant force of 44 N through a distance of 2 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":88}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 44 N through a distance of 2 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'sensor means device that detects a physical quantity and produces a usable signal. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"sensor"},{"id":"i2","label":"feedback"},{"id":"i3","label":"prototype"}],"zones":[{"id":"z1","label":"device that detects a physical quantity and produces a usable signal"},{"id":"z2","label":"information about system output used to influence later behavior"},{"id":"z3","label":"early model built to test a design concept"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 2, 'Match each engineering term with its correct description.', NULL, 'feedback is correctly paired with its description: information about system output used to influence later behavior.',
  '{"leftItems":[{"id":"l1","text":"feedback"},{"id":"l2","text":"prototype"},{"id":"l3","text":"tolerance"}],"rightItems":[{"id":"r1","text":"information about system output used to influence later behavior"},{"id":"r2","text":"early model built to test a design concept"},{"id":"r3","text":"permitted variation from a specified dimension or value"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"An actuator or output responds"},{"id":"o2","label":"A controller evaluates feedback"},{"id":"o3","label":"The signal is processed"},{"id":"o4","label":"A sensor detects a quantity"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:design','subtopic:design'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 14, 4, 'Sort the terms by role: place tolerance in the focal-concept category and the other terms in related-concept.', NULL, 'tolerance is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"tolerance"},{"id":"i2","label":"beam"},{"id":"i3","label":"column"},{"id":"i4","label":"truss"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place tolerance in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:manufacturing','subtopic:manufacturing'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 6, 'Tap the part of the diagram that represents work.', NULL, 'The target represents work: energy transferred when a force causes displacement in its direction.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating work","ref":"question-media/engineering/energy/engineering_energy_15.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"work","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents work.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: engineering_energy_15.png
   Prompt: High-detail educational vector diagram of work, showing the key structures or process needed to understand that energy transferred when a force causes displacement in its direction. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 8, 'Match the memory cards to form correct engineering term-definition pairs.', NULL, 'efficiency pairs with its definition: useful output divided by total input, often expressed as a percentage. sensor pairs with device that detects a physical quantity and produces a usable signal.',
  '{"cards":[{"id":"c1","text":"efficiency"},{"id":"c2","text":"useful output divided by total input, often expressed as a percentage"},{"id":"c3","text":"sensor"},{"id":"c4","text":"device that detects a physical quantity and produces a usable signal"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct engineering term-definition pairs.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 8, 'Match the memory cards to form correct engineering term-definition pairs.', NULL, 'renewable energy pairs with its definition: energy from sources naturally replenished on a human timescale. feedback pairs with information about system output used to influence later behavior.',
  '{"cards":[{"id":"c1","text":"renewable energy"},{"id":"c2","text":"energy from sources naturally replenished on a human timescale"},{"id":"c3","text":"feedback"},{"id":"c4","text":"information about system output used to influence later behavior"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct engineering term-definition pairs.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 8, 'Match the memory cards to form correct engineering term-definition pairs.', NULL, 'solar panel pairs with its definition: device that converts sunlight into electrical energy. prototype pairs with early model built to test a design concept.',
  '{"cards":[{"id":"c1","text":"solar panel"},{"id":"c2","text":"device that converts sunlight into electrical energy"},{"id":"c3","text":"prototype"},{"id":"c4","text":"early model built to test a design concept"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct engineering term-definition pairs.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 5, 'An engineer applies a constant force of 29 N through a distance of 2 m in the same direction. What work is done?', NULL, 'Work = force × distance = 29 × 2 = 58 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 29 N through a distance of 2 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":58,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 29 N through a distance of 2 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 7, 'Complete the number pattern: 20, 23, 26, 29, ___.', NULL, 'Each term increases by 3, so the next number is 32.',
  '{"sequence":[{"id":"e1","number":20},{"id":"e2","number":23},{"id":"e3","number":26},{"id":"e4","number":29}],"candidates":[{"id":"c1","number":32},{"id":"c2","number":33},{"id":"c3","number":31}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 20, 23, 26, 29, ___.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 9, 'Scenario: A learner must explain elasticity during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: ability to return toward original shape after load is removed.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of elasticity.","decisions":[{"id":"d1","text":"Choose the accurate explanation of elasticity.","options":[{"id":"opt1","text":"Ability to return toward original shape after load is removed."},{"id":"opt2","text":"Elasticity has the opposite meaning."},{"id":"opt3","text":"Elasticity is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain elasticity during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 10, 'An engineer applies a constant force of 32 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 32 × 5 = 160 J.',
  '{"problem":"An engineer applies a constant force of 32 N through a distance of 5 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":160}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 32 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:materials','subtopic:materials'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'lever means rigid bar that rotates about a fulcrum. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"lever"},{"id":"i2","label":"pulley"},{"id":"i3","label":"gear"}],"zones":[{"id":"z1","label":"rigid bar that rotates about a fulcrum"},{"id":"z2","label":"wheel with a groove used with a rope or belt to transmit force or motion"},{"id":"z3","label":"toothed wheel used to transmit motion and torque"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 2, 'Match each engineering term with its correct description.', NULL, 'pulley is correctly paired with its description: wheel with a groove used with a rope or belt to transmit force or motion.',
  '{"leftItems":[{"id":"l1","text":"pulley"},{"id":"l2","text":"gear"},{"id":"l3","text":"torque"}],"rightItems":[{"id":"r1","text":"wheel with a groove used with a rope or belt to transmit force or motion"},{"id":"r2","text":"toothed wheel used to transmit motion and torque"},{"id":"r3","text":"turning effect of a force about an axis"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Losses are accounted for"},{"id":"o2","label":"Useful output is produced"},{"id":"o3","label":"A useful transformation occurs"},{"id":"o4","label":"Energy enters a system"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:machines','subtopic:machines'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 4, 'Sort the terms by role: place torque in the focal-concept category and the other terms in related-concept.', NULL, 'torque is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"torque"},{"id":"i2","label":"velocity"},{"id":"i3","label":"acceleration"},{"id":"i4","label":"work"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place torque in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 5, 'An engineer applies a constant force of 37 N through a distance of 2 m in the same direction. What work is done?', NULL, 'Work = force × distance = 37 × 2 = 74 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 37 N through a distance of 2 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":74,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 37 N through a distance of 2 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 7, 'Complete the number pattern: 19, 22, 25, 28, ___.', NULL, 'Each term increases by 3, so the next number is 31.',
  '{"sequence":[{"id":"e1","number":19},{"id":"e2","number":22},{"id":"e3","number":25},{"id":"e4","number":28}],"candidates":[{"id":"c1","number":31},{"id":"c2","number":32},{"id":"c3","number":30}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 19, 22, 25, 28, ___.","level":1}]', ARRAY['topic:mechanics','subtopic:mechanics'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 9, 'Scenario: A learner must explain work during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: energy transferred when a force causes displacement in its direction.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of work.","decisions":[{"id":"d1","text":"Choose the accurate explanation of work.","options":[{"id":"opt1","text":"Energy transferred when a force causes displacement in its direction."},{"id":"opt2","text":"Work has the opposite meaning."},{"id":"opt3","text":"Work is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain work during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 10, 'An engineer applies a constant force of 40 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 40 × 5 = 200 J.',
  '{"problem":"An engineer applies a constant force of 40 N through a distance of 5 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":200}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 40 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'efficiency means useful output divided by total input, often expressed as a percentage. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"efficiency"},{"id":"i2","label":"renewable energy"},{"id":"i3","label":"solar panel"}],"zones":[{"id":"z1","label":"useful output divided by total input, often expressed as a percentage"},{"id":"z2","label":"energy from sources naturally replenished on a human timescale"},{"id":"z3","label":"device that converts sunlight into electrical energy"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 2, 'Match each engineering term with its correct description.', NULL, 'renewable energy is correctly paired with its description: energy from sources naturally replenished on a human timescale.',
  '{"leftItems":[{"id":"l1","text":"renewable energy"},{"id":"l2","text":"solar panel"},{"id":"l3","text":"hydraulic system"}],"rightItems":[{"id":"r1","text":"energy from sources naturally replenished on a human timescale"},{"id":"r2","text":"device that converts sunlight into electrical energy"},{"id":"r3","text":"system that uses pressurized fluid to transmit force"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each engineering term with its correct description.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 3, 'Put these steps in the correct order for a engineering process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Losses are accounted for"},{"id":"o2","label":"Useful output is produced"},{"id":"o3","label":"A useful transformation occurs"},{"id":"o4","label":"Energy enters a system"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a engineering process.","level":1}]', ARRAY['topic:energy','subtopic:energy'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 4, 'Sort the terms by role: place hydraulic system in the focal-concept category and the other terms in related-concept.', NULL, 'hydraulic system is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"hydraulic system"},{"id":"i2","label":"pneumatic system"},{"id":"i3","label":"sensor"},{"id":"i4","label":"feedback"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place hydraulic system in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 5, 'An engineer applies a constant force of 45 N through a distance of 2 m in the same direction. What work is done?', NULL, 'Work = force × distance = 45 × 2 = 90 J.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An engineer applies a constant force of 45 N through a distance of 2 m in the same direction. What work is done? Answer: ___"}', '{"numeric":[{"value":90,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 45 N through a distance of 2 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:fluids','subtopic:fluids'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 7, 'Complete the number pattern: 18, 21, 24, 27, ___.', NULL, 'Each term increases by 3, so the next number is 30.',
  '{"sequence":[{"id":"e1","number":18},{"id":"e2","number":21},{"id":"e3","number":24},{"id":"e4","number":27}],"candidates":[{"id":"c1","number":30},{"id":"c2","number":31},{"id":"c3","number":29}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 18, 21, 24, 27, ___.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 9, 'Scenario: A learner must explain feedback during a engineering activity. Which choice is best?', NULL, 'The correct choice states the key idea: information about system output used to influence later behavior.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of feedback.","decisions":[{"id":"d1","text":"Choose the accurate explanation of feedback.","options":[{"id":"opt1","text":"Information about system output used to influence later behavior."},{"id":"opt2","text":"Feedback has the opposite meaning."},{"id":"opt3","text":"Feedback is unrelated to engineering."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain feedback during a engineering activity. Which choice is best?.","level":1}]', ARRAY['topic:systems','subtopic:systems'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 10, 'An engineer applies a constant force of 48 N through a distance of 5 m in the same direction. What work is done?', NULL, 'Work = force × distance = 48 × 5 = 240 J.',
  '{"problem":"An engineer applies a constant force of 48 N through a distance of 5 m in the same direction. What work is done?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":240}', '[{"text":"Focus on the key idea behind An engineer applies a constant force of 48 N through a distance of 5 m in the same direction. What work is done?.","level":1}]', ARRAY['topic:design','subtopic:design'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  3, 15, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'tolerance means permitted variation from a specified dimension or value. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"tolerance"},{"id":"i2","label":"beam"},{"id":"i3","label":"column"}],"zones":[{"id":"z1","label":"permitted variation from a specified dimension or value"},{"id":"z2","label":"structural member designed mainly to resist bending"},{"id":"z3","label":"vertical structural member that mainly carries compression"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:manufacturing','subtopic:manufacturing'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 6, 'Tap the part of the diagram that represents angle.', NULL, 'The target represents angle: figure formed by two rays sharing an endpoint.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating angle","ref":"question-media/mathematics/geometry/mathematics_geometry_16.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"angle","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents angle.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: mathematics_geometry_16.png
   Prompt: High-detail educational vector diagram of angle, showing the key structures or process needed to understand that figure formed by two rays sharing an endpoint. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 2, 'Match each mathematics term with its correct description.', NULL, 'factor is correctly paired with its description: whole number that divides another number exactly.',
  '{"leftItems":[{"id":"l1","text":"factor"},{"id":"l2","text":"multiple"},{"id":"l3","text":"prime number"}],"rightItems":[{"id":"r1","text":"whole number that divides another number exactly"},{"id":"r2","text":"result of multiplying a number by an integer"},{"id":"r3","text":"whole number greater than 1 with exactly two positive factors"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 4, 'Sort the terms by role: place prime number in the focal-concept category and the other terms in related-concept.', NULL, 'prime number is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"prime number"},{"id":"i2","label":"fraction"},{"id":"i3","label":"ratio"},{"id":"i4","label":"percentage"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place prime number in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 5, 'An arithmetic exercise starts with 25 and subtracts 6. What is the result?', NULL, 'Subtract 6 from 25: 25 − 6 = 19.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 25 and subtracts 6. What is the result? Answer: ___"}', '{"numeric":[{"value":19,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 25 and subtracts 6. What is the result?.","level":1}]', ARRAY['topic:fractions','subtopic:fractions'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 7, 'Complete the number pattern: 21, 24, 27, 30, ___.', NULL, 'Each term increases by 3, so the next number is 33.',
  '{"sequence":[{"id":"e1","number":21},{"id":"e2","number":24},{"id":"e3","number":27},{"id":"e4","number":30}],"candidates":[{"id":"c1","number":33},{"id":"c2","number":34},{"id":"c3","number":32}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 21, 24, 27, 30, ___.","level":1}]', ARRAY['topic:ratios','subtopic:ratios'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 9, 'Scenario: A learner must explain percentage during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: number expressed as a fraction of 100.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of percentage.","decisions":[{"id":"d1","text":"Choose the accurate explanation of percentage.","options":[{"id":"opt1","text":"Number expressed as a fraction of 100."},{"id":"opt2","text":"Percentage has the opposite meaning."},{"id":"opt3","text":"Percentage is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain percentage during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:percentages','subtopic:percentages'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 10, 'An arithmetic exercise starts with 28 and subtracts 2. What is the result?', NULL, 'Subtract 2 from 28: 28 − 2 = 26.',
  '{"problem":"An arithmetic exercise starts with 28 and subtracts 2. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":26}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 28 and subtracts 2. What is the result?.","level":1}]', ARRAY['topic:number-systems','subtopic:number-systems'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'variable means symbol representing a value that can change. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"variable"},{"id":"i2","label":"coefficient"},{"id":"i3","label":"equation"}],"zones":[{"id":"z1","label":"symbol representing a value that can change"},{"id":"z2","label":"number multiplying a variable or algebraic term"},{"id":"z3","label":"statement that two expressions are equal"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 2, 'Match each mathematics term with its correct description.', NULL, 'coefficient is correctly paired with its description: number multiplying a variable or algebraic term.',
  '{"leftItems":[{"id":"l1","text":"coefficient"},{"id":"l2","text":"equation"},{"id":"l3","text":"inequality"}],"rightItems":[{"id":"r1","text":"number multiplying a variable or algebraic term"},{"id":"r2","text":"statement that two expressions are equal"},{"id":"r3","text":"statement comparing quantities using symbols such as < or >"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 4, 'Sort the terms by role: place inequality in the focal-concept category and the other terms in related-concept.', NULL, 'inequality is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"inequality"},{"id":"i2","label":"perimeter"},{"id":"i3","label":"area"},{"id":"i4","label":"volume"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place inequality in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 5, 'An arithmetic exercise starts with 33 and subtracts 7. What is the result?', NULL, 'Subtract 7 from 33: 33 − 7 = 26.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 33 and subtracts 7. What is the result? Answer: ___"}', '{"numeric":[{"value":26,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 33 and subtracts 7. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 7, 'Complete the number pattern: 20, 23, 26, 29, ___.', NULL, 'Each term increases by 3, so the next number is 32.',
  '{"sequence":[{"id":"e1","number":20},{"id":"e2","number":23},{"id":"e3","number":26},{"id":"e4","number":29}],"candidates":[{"id":"c1","number":32},{"id":"c2","number":33},{"id":"c3","number":31}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 20, 23, 26, 29, ___.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 9, 'Scenario: A learner must explain volume during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: amount of three-dimensional space occupied by an object.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of volume.","decisions":[{"id":"d1","text":"Choose the accurate explanation of volume.","options":[{"id":"opt1","text":"Amount of three-dimensional space occupied by an object."},{"id":"opt2","text":"Volume has the opposite meaning."},{"id":"opt3","text":"Volume is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain volume during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 10, 'An arithmetic exercise starts with 36 and subtracts 3. What is the result?', NULL, 'Subtract 3 from 36: 36 − 3 = 33.',
  '{"problem":"An arithmetic exercise starts with 36 and subtracts 3. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":33}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 36 and subtracts 3. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'triangle means polygon with three sides. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"triangle"},{"id":"i2","label":"mean"},{"id":"i3","label":"median"}],"zones":[{"id":"z1","label":"polygon with three sides"},{"id":"z2","label":"sum of values divided by the number of values"},{"id":"z3","label":"middle value when ordered, or average of two middle values"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 2, 'Match each mathematics term with its correct description.', NULL, 'mean is correctly paired with its description: sum of values divided by the number of values.',
  '{"leftItems":[{"id":"l1","text":"mean"},{"id":"l2","text":"median"},{"id":"l3","text":"mode"}],"rightItems":[{"id":"r1","text":"sum of values divided by the number of values"},{"id":"r2","text":"middle value when ordered, or average of two middle values"},{"id":"r3","text":"most frequently occurring value"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 4, 'Sort the terms by role: place mode in the focal-concept category and the other terms in related-concept.', NULL, 'mode is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"mode"},{"id":"i2","label":"probability"},{"id":"i3","label":"coordinate"},{"id":"i4","label":"slope"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place mode in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 5, 'An arithmetic exercise starts with 41 and subtracts 8. What is the result?', NULL, 'Subtract 8 from 41: 41 − 8 = 33.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 41 and subtracts 8. What is the result? Answer: ___"}', '{"numeric":[{"value":33,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 41 and subtracts 8. What is the result?.","level":1}]', ARRAY['topic:probability','subtopic:probability'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 7, 'Complete the number pattern: 19, 22, 25, 28, ___.', NULL, 'Each term increases by 3, so the next number is 31.',
  '{"sequence":[{"id":"e1","number":19},{"id":"e2","number":22},{"id":"e3","number":25},{"id":"e4","number":28}],"candidates":[{"id":"c1","number":31},{"id":"c2","number":32},{"id":"c3","number":30}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 19, 22, 25, 28, ___.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 9, 'Scenario: A learner must explain slope during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: rate of change, often rise divided by run.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of slope.","decisions":[{"id":"d1","text":"Choose the accurate explanation of slope.","options":[{"id":"opt1","text":"Rate of change, often rise divided by run."},{"id":"opt2","text":"Slope has the opposite meaning."},{"id":"opt3","text":"Slope is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain slope during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 10, 'An arithmetic exercise starts with 44 and subtracts 4. What is the result?', NULL, 'Subtract 4 from 44: 44 − 4 = 40.',
  '{"problem":"An arithmetic exercise starts with 44 and subtracts 4. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":40}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 44 and subtracts 4. What is the result?.","level":1}]', ARRAY['topic:patterns','subtopic:patterns'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 16, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'symmetry means property in which parts correspond in a balanced way. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"symmetry"},{"id":"i2","label":"place value"},{"id":"i3","label":"factor"}],"zones":[{"id":"z1","label":"property in which parts correspond in a balanced way"},{"id":"z2","label":"value represented by a digit because of its position in a number"},{"id":"z3","label":"whole number that divides another number exactly"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 1, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 6, 'Tap the part of the diagram that represents triangle.', NULL, 'The target represents triangle: polygon with three sides.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating triangle","ref":"question-media/mathematics/geometry/mathematics_geometry_17.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"triangle","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents triangle.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: mathematics_geometry_17.png
   Prompt: High-detail educational vector diagram of triangle, showing the key structures or process needed to understand that polygon with three sides. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 2, 'Match each mathematics term with its correct description.', NULL, 'factor is correctly paired with its description: whole number that divides another number exactly.',
  '{"leftItems":[{"id":"l1","text":"factor"},{"id":"l2","text":"multiple"},{"id":"l3","text":"prime number"}],"rightItems":[{"id":"r1","text":"whole number that divides another number exactly"},{"id":"r2","text":"result of multiplying a number by an integer"},{"id":"r3","text":"whole number greater than 1 with exactly two positive factors"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 4, 'Sort the terms by role: place prime number in the focal-concept category and the other terms in related-concept.', NULL, 'prime number is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"prime number"},{"id":"i2","label":"fraction"},{"id":"i3","label":"ratio"},{"id":"i4","label":"percentage"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place prime number in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 5, 'An arithmetic exercise starts with 26 and subtracts 6. What is the result?', NULL, 'Subtract 6 from 26: 26 − 6 = 20.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 26 and subtracts 6. What is the result? Answer: ___"}', '{"numeric":[{"value":20,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 26 and subtracts 6. What is the result?.","level":1}]', ARRAY['topic:fractions','subtopic:fractions'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 7, 'Complete the number pattern: 22, 25, 28, 31, ___.', NULL, 'Each term increases by 3, so the next number is 34.',
  '{"sequence":[{"id":"e1","number":22},{"id":"e2","number":25},{"id":"e3","number":28},{"id":"e4","number":31}],"candidates":[{"id":"c1","number":34},{"id":"c2","number":35},{"id":"c3","number":33}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 22, 25, 28, 31, ___.","level":1}]', ARRAY['topic:ratios','subtopic:ratios'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 9, 'Scenario: A learner must explain percentage during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: number expressed as a fraction of 100.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of percentage.","decisions":[{"id":"d1","text":"Choose the accurate explanation of percentage.","options":[{"id":"opt1","text":"Number expressed as a fraction of 100."},{"id":"opt2","text":"Percentage has the opposite meaning."},{"id":"opt3","text":"Percentage is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain percentage during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:percentages','subtopic:percentages'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 10, 'An arithmetic exercise starts with 29 and subtracts 2. What is the result?', NULL, 'Subtract 2 from 29: 29 − 2 = 27.',
  '{"problem":"An arithmetic exercise starts with 29 and subtracts 2. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":27}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 29 and subtracts 2. What is the result?.","level":1}]', ARRAY['topic:number-systems','subtopic:number-systems'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'variable means symbol representing a value that can change. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"variable"},{"id":"i2","label":"coefficient"},{"id":"i3","label":"equation"}],"zones":[{"id":"z1","label":"symbol representing a value that can change"},{"id":"z2","label":"number multiplying a variable or algebraic term"},{"id":"z3","label":"statement that two expressions are equal"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 2, 'Match each mathematics term with its correct description.', NULL, 'coefficient is correctly paired with its description: number multiplying a variable or algebraic term.',
  '{"leftItems":[{"id":"l1","text":"coefficient"},{"id":"l2","text":"equation"},{"id":"l3","text":"inequality"}],"rightItems":[{"id":"r1","text":"number multiplying a variable or algebraic term"},{"id":"r2","text":"statement that two expressions are equal"},{"id":"r3","text":"statement comparing quantities using symbols such as < or >"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 4, 'Sort the terms by role: place inequality in the focal-concept category and the other terms in related-concept.', NULL, 'inequality is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"inequality"},{"id":"i2","label":"perimeter"},{"id":"i3","label":"area"},{"id":"i4","label":"volume"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place inequality in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 5, 'An arithmetic exercise starts with 34 and subtracts 7. What is the result?', NULL, 'Subtract 7 from 34: 34 − 7 = 27.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 34 and subtracts 7. What is the result? Answer: ___"}', '{"numeric":[{"value":27,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 34 and subtracts 7. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 7, 'Complete the number pattern: 21, 24, 27, 30, ___.', NULL, 'Each term increases by 3, so the next number is 33.',
  '{"sequence":[{"id":"e1","number":21},{"id":"e2","number":24},{"id":"e3","number":27},{"id":"e4","number":30}],"candidates":[{"id":"c1","number":33},{"id":"c2","number":34},{"id":"c3","number":32}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 21, 24, 27, 30, ___.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 9, 'Scenario: A learner must explain volume during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: amount of three-dimensional space occupied by an object.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of volume.","decisions":[{"id":"d1","text":"Choose the accurate explanation of volume.","options":[{"id":"opt1","text":"Amount of three-dimensional space occupied by an object."},{"id":"opt2","text":"Volume has the opposite meaning."},{"id":"opt3","text":"Volume is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain volume during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 10, 'An arithmetic exercise starts with 37 and subtracts 3. What is the result?', NULL, 'Subtract 3 from 37: 37 − 3 = 34.',
  '{"problem":"An arithmetic exercise starts with 37 and subtracts 3. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":34}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 37 and subtracts 3. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'triangle means polygon with three sides. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"triangle"},{"id":"i2","label":"mean"},{"id":"i3","label":"median"}],"zones":[{"id":"z1","label":"polygon with three sides"},{"id":"z2","label":"sum of values divided by the number of values"},{"id":"z3","label":"middle value when ordered, or average of two middle values"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 2, 'Match each mathematics term with its correct description.', NULL, 'mean is correctly paired with its description: sum of values divided by the number of values.',
  '{"leftItems":[{"id":"l1","text":"mean"},{"id":"l2","text":"median"},{"id":"l3","text":"mode"}],"rightItems":[{"id":"r1","text":"sum of values divided by the number of values"},{"id":"r2","text":"middle value when ordered, or average of two middle values"},{"id":"r3","text":"most frequently occurring value"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 4, 'Sort the terms by role: place mode in the focal-concept category and the other terms in related-concept.', NULL, 'mode is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"mode"},{"id":"i2","label":"probability"},{"id":"i3","label":"coordinate"},{"id":"i4","label":"slope"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place mode in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 5, 'An arithmetic exercise starts with 42 and subtracts 8. What is the result?', NULL, 'Subtract 8 from 42: 42 − 8 = 34.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 42 and subtracts 8. What is the result? Answer: ___"}', '{"numeric":[{"value":34,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 42 and subtracts 8. What is the result?.","level":1}]', ARRAY['topic:probability','subtopic:probability'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 7, 'Complete the number pattern: 20, 23, 26, 29, ___.', NULL, 'Each term increases by 3, so the next number is 32.',
  '{"sequence":[{"id":"e1","number":20},{"id":"e2","number":23},{"id":"e3","number":26},{"id":"e4","number":29}],"candidates":[{"id":"c1","number":32},{"id":"c2","number":33},{"id":"c3","number":31}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 20, 23, 26, 29, ___.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 9, 'Scenario: A learner must explain slope during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: rate of change, often rise divided by run.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of slope.","decisions":[{"id":"d1","text":"Choose the accurate explanation of slope.","options":[{"id":"opt1","text":"Rate of change, often rise divided by run."},{"id":"opt2","text":"Slope has the opposite meaning."},{"id":"opt3","text":"Slope is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain slope during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 10, 'An arithmetic exercise starts with 45 and subtracts 4. What is the result?', NULL, 'Subtract 4 from 45: 45 − 4 = 41.',
  '{"problem":"An arithmetic exercise starts with 45 and subtracts 4. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":41}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 45 and subtracts 4. What is the result?.","level":1}]', ARRAY['topic:patterns','subtopic:patterns'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 17, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'symmetry means property in which parts correspond in a balanced way. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"symmetry"},{"id":"i2","label":"place value"},{"id":"i3","label":"factor"}],"zones":[{"id":"z1","label":"property in which parts correspond in a balanced way"},{"id":"z2","label":"value represented by a digit because of its position in a number"},{"id":"z3","label":"whole number that divides another number exactly"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 2, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 6, 'Tap the part of the diagram that represents mean.', NULL, 'The target represents mean: sum of values divided by the number of values.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating mean","ref":"question-media/mathematics/statistics/mathematics_statistics_18.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"mean","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents mean.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 3, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: mathematics_statistics_18.png
   Prompt: High-detail educational vector diagram of mean, showing the key structures or process needed to understand that sum of values divided by the number of values. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 2, 'Match each mathematics term with its correct description.', NULL, 'factor is correctly paired with its description: whole number that divides another number exactly.',
  '{"leftItems":[{"id":"l1","text":"factor"},{"id":"l2","text":"multiple"},{"id":"l3","text":"prime number"}],"rightItems":[{"id":"r1","text":"whole number that divides another number exactly"},{"id":"r2","text":"result of multiplying a number by an integer"},{"id":"r3","text":"whole number greater than 1 with exactly two positive factors"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 4, 'Sort the terms by role: place prime number in the focal-concept category and the other terms in related-concept.', NULL, 'prime number is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"prime number"},{"id":"i2","label":"fraction"},{"id":"i3","label":"ratio"},{"id":"i4","label":"percentage"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place prime number in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 5, 'An arithmetic exercise starts with 27 and subtracts 6. What is the result?', NULL, 'Subtract 6 from 27: 27 − 6 = 21.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 27 and subtracts 6. What is the result? Answer: ___"}', '{"numeric":[{"value":21,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 27 and subtracts 6. What is the result?.","level":1}]', ARRAY['topic:fractions','subtopic:fractions'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 7, 'Complete the number pattern: 23, 26, 29, 32, ___.', NULL, 'Each term increases by 3, so the next number is 35.',
  '{"sequence":[{"id":"e1","number":23},{"id":"e2","number":26},{"id":"e3","number":29},{"id":"e4","number":32}],"candidates":[{"id":"c1","number":35},{"id":"c2","number":36},{"id":"c3","number":34}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 23, 26, 29, 32, ___.","level":1}]', ARRAY['topic:ratios','subtopic:ratios'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 9, 'Scenario: A learner must explain percentage during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: number expressed as a fraction of 100.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of percentage.","decisions":[{"id":"d1","text":"Choose the accurate explanation of percentage.","options":[{"id":"opt1","text":"Number expressed as a fraction of 100."},{"id":"opt2","text":"Percentage has the opposite meaning."},{"id":"opt3","text":"Percentage is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain percentage during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:percentages','subtopic:percentages'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 10, 'An arithmetic exercise starts with 30 and subtracts 2. What is the result?', NULL, 'Subtract 2 from 30: 30 − 2 = 28.',
  '{"problem":"An arithmetic exercise starts with 30 and subtracts 2. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":28}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 30 and subtracts 2. What is the result?.","level":1}]', ARRAY['topic:number-systems','subtopic:number-systems'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'variable means symbol representing a value that can change. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"variable"},{"id":"i2","label":"coefficient"},{"id":"i3","label":"equation"}],"zones":[{"id":"z1","label":"symbol representing a value that can change"},{"id":"z2","label":"number multiplying a variable or algebraic term"},{"id":"z3","label":"statement that two expressions are equal"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 2, 'Match each mathematics term with its correct description.', NULL, 'coefficient is correctly paired with its description: number multiplying a variable or algebraic term.',
  '{"leftItems":[{"id":"l1","text":"coefficient"},{"id":"l2","text":"equation"},{"id":"l3","text":"inequality"}],"rightItems":[{"id":"r1","text":"number multiplying a variable or algebraic term"},{"id":"r2","text":"statement that two expressions are equal"},{"id":"r3","text":"statement comparing quantities using symbols such as < or >"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 4, 'Sort the terms by role: place inequality in the focal-concept category and the other terms in related-concept.', NULL, 'inequality is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"inequality"},{"id":"i2","label":"perimeter"},{"id":"i3","label":"area"},{"id":"i4","label":"volume"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place inequality in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 5, 'An arithmetic exercise starts with 35 and subtracts 7. What is the result?', NULL, 'Subtract 7 from 35: 35 − 7 = 28.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 35 and subtracts 7. What is the result? Answer: ___"}', '{"numeric":[{"value":28,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 35 and subtracts 7. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 7, 'Complete the number pattern: 22, 25, 28, 31, ___.', NULL, 'Each term increases by 3, so the next number is 34.',
  '{"sequence":[{"id":"e1","number":22},{"id":"e2","number":25},{"id":"e3","number":28},{"id":"e4","number":31}],"candidates":[{"id":"c1","number":34},{"id":"c2","number":35},{"id":"c3","number":33}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 22, 25, 28, 31, ___.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 9, 'Scenario: A learner must explain volume during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: amount of three-dimensional space occupied by an object.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of volume.","decisions":[{"id":"d1","text":"Choose the accurate explanation of volume.","options":[{"id":"opt1","text":"Amount of three-dimensional space occupied by an object."},{"id":"opt2","text":"Volume has the opposite meaning."},{"id":"opt3","text":"Volume is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain volume during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 10, 'An arithmetic exercise starts with 38 and subtracts 3. What is the result?', NULL, 'Subtract 3 from 38: 38 − 3 = 35.',
  '{"problem":"An arithmetic exercise starts with 38 and subtracts 3. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":35}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 38 and subtracts 3. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'triangle means polygon with three sides. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"triangle"},{"id":"i2","label":"mean"},{"id":"i3","label":"median"}],"zones":[{"id":"z1","label":"polygon with three sides"},{"id":"z2","label":"sum of values divided by the number of values"},{"id":"z3","label":"middle value when ordered, or average of two middle values"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 2, 'Match each mathematics term with its correct description.', NULL, 'mean is correctly paired with its description: sum of values divided by the number of values.',
  '{"leftItems":[{"id":"l1","text":"mean"},{"id":"l2","text":"median"},{"id":"l3","text":"mode"}],"rightItems":[{"id":"r1","text":"sum of values divided by the number of values"},{"id":"r2","text":"middle value when ordered, or average of two middle values"},{"id":"r3","text":"most frequently occurring value"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and state the unit"},{"id":"o2","label":"Substitute known measurements"},{"id":"o3","label":"Select the relevant formula"},{"id":"o4","label":"Identify the shape"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 4, 'Sort the terms by role: place mode in the focal-concept category and the other terms in related-concept.', NULL, 'mode is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"mode"},{"id":"i2","label":"probability"},{"id":"i3","label":"coordinate"},{"id":"i4","label":"slope"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place mode in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 5, 'An arithmetic exercise starts with 43 and subtracts 8. What is the result?', NULL, 'Subtract 8 from 43: 43 − 8 = 35.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 43 and subtracts 8. What is the result? Answer: ___"}', '{"numeric":[{"value":35,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 43 and subtracts 8. What is the result?.","level":1}]', ARRAY['topic:probability','subtopic:probability'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 7, 'Complete the number pattern: 21, 24, 27, 30, ___.', NULL, 'Each term increases by 3, so the next number is 33.',
  '{"sequence":[{"id":"e1","number":21},{"id":"e2","number":24},{"id":"e3","number":27},{"id":"e4","number":30}],"candidates":[{"id":"c1","number":33},{"id":"c2","number":34},{"id":"c3","number":32}],"interaction":"complete-sequence"}', '{"rule":"Add 3","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 21, 24, 27, 30, ___.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 9, 'Scenario: A learner must explain slope during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: rate of change, often rise divided by run.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of slope.","decisions":[{"id":"d1","text":"Choose the accurate explanation of slope.","options":[{"id":"opt1","text":"Rate of change, often rise divided by run."},{"id":"opt2","text":"Slope has the opposite meaning."},{"id":"opt3","text":"Slope is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain slope during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 10, 'An arithmetic exercise starts with 46 and subtracts 4. What is the result?', NULL, 'Subtract 4 from 46: 46 − 4 = 42.',
  '{"problem":"An arithmetic exercise starts with 46 and subtracts 4. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":42}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 46 and subtracts 4. What is the result?.","level":1}]', ARRAY['topic:patterns','subtopic:patterns'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 18, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'symmetry means property in which parts correspond in a balanced way. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"symmetry"},{"id":"i2","label":"place value"},{"id":"i3","label":"factor"}],"zones":[{"id":"z1","label":"property in which parts correspond in a balanced way"},{"id":"z2","label":"value represented by a digit because of its position in a number"},{"id":"z3","label":"whole number that divides another number exactly"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 3, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 6, 'Tap the part of the diagram that represents median.', NULL, 'The target represents median: middle value when ordered, or average of two middle values.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating median","ref":"question-media/mathematics/statistics/mathematics_statistics_19.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"median","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents median.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 4, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: mathematics_statistics_19.png
   Prompt: High-detail educational vector diagram of median, showing the key structures or process needed to understand that middle value when ordered, or average of two middle values. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 8, 'Match the memory cards to form correct mathematics term-definition pairs.', NULL, 'probability pairs with its definition: measure of how likely an event is to occur. place value pairs with value represented by a digit because of its position in a number.',
  '{"cards":[{"id":"c1","text":"probability"},{"id":"c2","text":"measure of how likely an event is to occur"},{"id":"c3","text":"place value"},{"id":"c4","text":"value represented by a digit because of its position in a number"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct mathematics term-definition pairs.","level":1}]', ARRAY['topic:probability','subtopic:probability'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 8, 'Match the memory cards to form correct mathematics term-definition pairs.', NULL, 'coordinate pairs with its definition: ordered values locating a point in a coordinate system. factor pairs with whole number that divides another number exactly.',
  '{"cards":[{"id":"c1","text":"coordinate"},{"id":"c2","text":"ordered values locating a point in a coordinate system"},{"id":"c3","text":"factor"},{"id":"c4","text":"whole number that divides another number exactly"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct mathematics term-definition pairs.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 2, 'Match each mathematics term with its correct description.', NULL, 'prime number is correctly paired with its description: whole number greater than 1 with exactly two positive factors.',
  '{"leftItems":[{"id":"l1","text":"prime number"},{"id":"l2","text":"fraction"},{"id":"l3","text":"ratio"}],"rightItems":[{"id":"r1","text":"whole number greater than 1 with exactly two positive factors"},{"id":"r2","text":"number representing a part of a whole or a ratio"},{"id":"r3","text":"comparison of two quantities by division"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:number-theory','subtopic:number-theory'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and check the result"},{"id":"o2","label":"Choose a suitable operation or formula"},{"id":"o3","label":"Identify known quantities"},{"id":"o4","label":"Read the problem carefully"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:fractions','subtopic:fractions'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 4, 'Sort the terms by role: place ratio in the focal-concept category and the other terms in related-concept.', NULL, 'ratio is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"ratio"},{"id":"i2","label":"percentage"},{"id":"i3","label":"integer"},{"id":"i4","label":"variable"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place ratio in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:ratios','subtopic:ratios'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 5, 'An arithmetic exercise starts with 30 and subtracts 8. What is the result?', NULL, 'Subtract 8 from 30: 30 − 8 = 22.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 30 and subtracts 8. What is the result? Answer: ___"}', '{"numeric":[{"value":22,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 30 and subtracts 8. What is the result?.","level":1}]', ARRAY['topic:percentages','subtopic:percentages'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 7, 'Complete the number pattern: 26, 31, 36, 41, ___.', NULL, 'Each term increases by 5, so the next number is 46.',
  '{"sequence":[{"id":"e1","number":26},{"id":"e2","number":31},{"id":"e3","number":36},{"id":"e4","number":41}],"candidates":[{"id":"c1","number":46},{"id":"c2","number":47},{"id":"c3","number":45}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 26, 31, 36, 41, ___.","level":1}]', ARRAY['topic:number-systems','subtopic:number-systems'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 9, 'Scenario: A learner must explain variable during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: symbol representing a value that can change.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of variable.","decisions":[{"id":"d1","text":"Choose the accurate explanation of variable.","options":[{"id":"opt1","text":"Symbol representing a value that can change."},{"id":"opt2","text":"Variable has the opposite meaning."},{"id":"opt3","text":"Variable is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain variable during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 10, 'An arithmetic exercise starts with 33 and subtracts 4. What is the result?', NULL, 'Subtract 4 from 33: 33 − 4 = 29.',
  '{"problem":"An arithmetic exercise starts with 33 and subtracts 4. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":29}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 33 and subtracts 4. What is the result?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'equation means statement that two expressions are equal. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"equation"},{"id":"i2","label":"inequality"},{"id":"i3","label":"perimeter"}],"zones":[{"id":"z1","label":"statement that two expressions are equal"},{"id":"z2","label":"statement comparing quantities using symbols such as < or >"},{"id":"z3","label":"distance around a two-dimensional shape"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 2, 'Match each mathematics term with its correct description.', NULL, 'inequality is correctly paired with its description: statement comparing quantities using symbols such as < or >.',
  '{"leftItems":[{"id":"l1","text":"inequality"},{"id":"l2","text":"perimeter"},{"id":"l3","text":"area"}],"rightItems":[{"id":"r1","text":"statement comparing quantities using symbols such as < or >"},{"id":"r2","text":"distance around a two-dimensional shape"},{"id":"r3","text":"amount of two-dimensional surface inside a boundary"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and check the result"},{"id":"o2","label":"Choose a suitable operation or formula"},{"id":"o3","label":"Identify known quantities"},{"id":"o4","label":"Read the problem carefully"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 4, 'Sort the terms by role: place area in the focal-concept category and the other terms in related-concept.', NULL, 'area is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"area"},{"id":"i2","label":"volume"},{"id":"i3","label":"angle"},{"id":"i4","label":"triangle"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place area in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 5, 'An arithmetic exercise starts with 38 and subtracts 2. What is the result?', NULL, 'Subtract 2 from 38: 38 − 2 = 36.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 38 and subtracts 2. What is the result? Answer: ___"}', '{"numeric":[{"value":36,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 38 and subtracts 2. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 7, 'Complete the number pattern: 25, 30, 35, 40, ___.', NULL, 'Each term increases by 5, so the next number is 45.',
  '{"sequence":[{"id":"e1","number":25},{"id":"e2","number":30},{"id":"e3","number":35},{"id":"e4","number":40}],"candidates":[{"id":"c1","number":45},{"id":"c2","number":46},{"id":"c3","number":44}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 25, 30, 35, 40, ___.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 9, 'Scenario: A learner must explain triangle during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: polygon with three sides.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of triangle.","decisions":[{"id":"d1","text":"Choose the accurate explanation of triangle.","options":[{"id":"opt1","text":"Polygon with three sides."},{"id":"opt2","text":"Triangle has the opposite meaning."},{"id":"opt3","text":"Triangle is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain triangle during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 10, 'An arithmetic exercise starts with 41 and subtracts 5. What is the result?', NULL, 'Subtract 5 from 41: 41 − 5 = 36.',
  '{"problem":"An arithmetic exercise starts with 41 and subtracts 5. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":36}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 41 and subtracts 5. What is the result?.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'median means middle value when ordered, or average of two middle values. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"median"},{"id":"i2","label":"mode"},{"id":"i3","label":"probability"}],"zones":[{"id":"z1","label":"middle value when ordered, or average of two middle values"},{"id":"z2","label":"most frequently occurring value"},{"id":"z3","label":"measure of how likely an event is to occur"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 2, 'Match each mathematics term with its correct description.', NULL, 'mode is correctly paired with its description: most frequently occurring value.',
  '{"leftItems":[{"id":"l1","text":"mode"},{"id":"l2","text":"probability"},{"id":"l3","text":"coordinate"}],"rightItems":[{"id":"r1","text":"most frequently occurring value"},{"id":"r2","text":"measure of how likely an event is to occur"},{"id":"r3","text":"ordered values locating a point in a coordinate system"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Calculate and check the result"},{"id":"o2","label":"Choose a suitable operation or formula"},{"id":"o3","label":"Identify known quantities"},{"id":"o4","label":"Read the problem carefully"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:probability','subtopic:probability'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 4, 'Sort the terms by role: place coordinate in the focal-concept category and the other terms in related-concept.', NULL, 'coordinate is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"coordinate"},{"id":"i2","label":"slope"},{"id":"i3","label":"sequence"},{"id":"i4","label":"symmetry"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place coordinate in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 5, 'An arithmetic exercise starts with 46 and subtracts 3. What is the result?', NULL, 'Subtract 3 from 46: 46 − 3 = 43.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 46 and subtracts 3. What is the result? Answer: ___"}', '{"numeric":[{"value":43,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 46 and subtracts 3. What is the result?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 7, 'Complete the number pattern: 24, 29, 34, 39, ___.', NULL, 'Each term increases by 5, so the next number is 44.',
  '{"sequence":[{"id":"e1","number":24},{"id":"e2","number":29},{"id":"e3","number":34},{"id":"e4","number":39}],"candidates":[{"id":"c1","number":44},{"id":"c2","number":45},{"id":"c3","number":43}],"interaction":"complete-sequence"}', '{"rule":"Add 5","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 24, 29, 34, 39, ___.","level":1}]', ARRAY['topic:patterns','subtopic:patterns'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 19, 9, 'Scenario: A learner must explain symmetry during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: property in which parts correspond in a balanced way.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of symmetry.","decisions":[{"id":"d1","text":"Choose the accurate explanation of symmetry.","options":[{"id":"opt1","text":"Property in which parts correspond in a balanced way."},{"id":"opt2","text":"Symmetry has the opposite meaning."},{"id":"opt3","text":"Symmetry is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain symmetry during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 4, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 6, 'Tap the part of the diagram that represents mode.', NULL, 'The target represents mode: most frequently occurring value.',
  '{"mode":"tap","image":{"alt":"Diagram illustrating mode","ref":"question-media/mathematics/statistics/mathematics_statistics_20.png","role":"diagram","width":400,"height":300},"hotspots":[{"x":50,"y":50,"id":"h1","label":"mode","radius":15}],"imageWidth":400,"imageHeight":300}', '{"mode":"tap","requiredHotspots":["h1"]}', '[{"text":"Focus on the key idea behind Tap the part of the diagram that represents mode.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 5, 100, 'published', 1
);
/* IMAGE GENERATION PROMPT:
   Filename: mathematics_statistics_20.png
   Prompt: High-detail educational vector diagram of mode, showing the key structures or process needed to understand that most frequently occurring value. Clean scientific/technical geometry, classroom-friendly, dark STEM game interface aesthetic, luminous cyan and amber accents, strong visual hierarchy, no text, no labels, no letters, no numbers, no watermark, 4:3 composition.
 */

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 8, 'Match the memory cards to form correct mathematics term-definition pairs.', NULL, 'coordinate pairs with its definition: ordered values locating a point in a coordinate system. factor pairs with whole number that divides another number exactly.',
  '{"cards":[{"id":"c1","text":"coordinate"},{"id":"c2","text":"ordered values locating a point in a coordinate system"},{"id":"c3","text":"factor"},{"id":"c4","text":"whole number that divides another number exactly"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct mathematics term-definition pairs.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 8, 'Match the memory cards to form correct mathematics term-definition pairs.', NULL, 'slope pairs with its definition: rate of change, often rise divided by run. multiple pairs with result of multiplying a number by an integer.',
  '{"cards":[{"id":"c1","text":"slope"},{"id":"c2","text":"rate of change, often rise divided by run"},{"id":"c3","text":"multiple"},{"id":"c4","text":"result of multiplying a number by an integer"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct mathematics term-definition pairs.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 8, 'Match the memory cards to form correct mathematics term-definition pairs.', NULL, 'sequence pairs with its definition: ordered list of numbers or objects following a rule. prime number pairs with whole number greater than 1 with exactly two positive factors.',
  '{"cards":[{"id":"c1","text":"sequence"},{"id":"c2","text":"ordered list of numbers or objects following a rule"},{"id":"c3","text":"prime number"},{"id":"c4","text":"whole number greater than 1 with exactly two positive factors"}],"deckType":"pairs","revealSeconds":10}', '{"groups":[{"cardIds":["c1","c2"],"groupId":"g1"},{"cardIds":["c3","c4"],"groupId":"g2"}]}', '[{"text":"Focus on the key idea behind Match the memory cards to form correct mathematics term-definition pairs.","level":1}]', ARRAY['topic:patterns','subtopic:patterns'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 10, 'An arithmetic exercise starts with 29 and subtracts 6. What is the result?', NULL, 'Subtract 6 from 29: 29 − 6 = 23.',
  '{"problem":"An arithmetic exercise starts with 29 and subtracts 6. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":23}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 29 and subtracts 6. What is the result?.","level":1}]', ARRAY['topic:fractions','subtopic:fractions'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'ratio means comparison of two quantities by division. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"ratio"},{"id":"i2","label":"percentage"},{"id":"i3","label":"integer"}],"zones":[{"id":"z1","label":"comparison of two quantities by division"},{"id":"z2","label":"number expressed as a fraction of 100"},{"id":"z3","label":"whole number that may be positive, negative, or zero"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:ratios','subtopic:ratios'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 2, 'Match each mathematics term with its correct description.', NULL, 'percentage is correctly paired with its description: number expressed as a fraction of 100.',
  '{"leftItems":[{"id":"l1","text":"percentage"},{"id":"l2","text":"integer"},{"id":"l3","text":"variable"}],"rightItems":[{"id":"r1","text":"number expressed as a fraction of 100"},{"id":"r2","text":"whole number that may be positive, negative, or zero"},{"id":"r3","text":"symbol representing a value that can change"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:percentages','subtopic:percentages'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Apply the rule to the next term"},{"id":"o2","label":"Determine the rule"},{"id":"o3","label":"Compare consecutive terms"},{"id":"o4","label":"Identify the pattern"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:number-systems','subtopic:number-systems'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 4, 'Sort the terms by role: place variable in the focal-concept category and the other terms in related-concept.', NULL, 'variable is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"variable"},{"id":"i2","label":"coefficient"},{"id":"i3","label":"equation"},{"id":"i4","label":"inequality"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place variable in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 5, 'An arithmetic exercise starts with 34 and subtracts 4. What is the result?', NULL, 'Subtract 4 from 34: 34 − 4 = 30.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 34 and subtracts 4. What is the result? Answer: ___"}', '{"numeric":[{"value":30,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 34 and subtracts 4. What is the result?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 7, 'Complete the number pattern: 21, 25, 29, 33, ___.', NULL, 'Each term increases by 4, so the next number is 37.',
  '{"sequence":[{"id":"e1","number":21},{"id":"e2","number":25},{"id":"e3","number":29},{"id":"e4","number":33}],"candidates":[{"id":"c1","number":37},{"id":"c2","number":38},{"id":"c3","number":36}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 21, 25, 29, 33, ___.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 9, 'Scenario: A learner must explain inequality during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: statement comparing quantities using symbols such as < or >.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of inequality.","decisions":[{"id":"d1","text":"Choose the accurate explanation of inequality.","options":[{"id":"opt1","text":"Statement comparing quantities using symbols such as < or >."},{"id":"opt2","text":"Inequality has the opposite meaning."},{"id":"opt3","text":"Inequality is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain inequality during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 10, 'An arithmetic exercise starts with 37 and subtracts 7. What is the result?', NULL, 'Subtract 7 from 37: 37 − 7 = 30.',
  '{"problem":"An arithmetic exercise starts with 37 and subtracts 7. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":30}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 37 and subtracts 7. What is the result?.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'area means amount of two-dimensional surface inside a boundary. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"area"},{"id":"i2","label":"volume"},{"id":"i3","label":"angle"}],"zones":[{"id":"z1","label":"amount of two-dimensional surface inside a boundary"},{"id":"z2","label":"amount of three-dimensional space occupied by an object"},{"id":"z3","label":"figure formed by two rays sharing an endpoint"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 2, 'Match each mathematics term with its correct description.', NULL, 'volume is correctly paired with its description: amount of three-dimensional space occupied by an object.',
  '{"leftItems":[{"id":"l1","text":"volume"},{"id":"l2","text":"angle"},{"id":"l3","text":"triangle"}],"rightItems":[{"id":"r1","text":"amount of three-dimensional space occupied by an object"},{"id":"r2","text":"figure formed by two rays sharing an endpoint"},{"id":"r3","text":"polygon with three sides"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Apply the rule to the next term"},{"id":"o2","label":"Determine the rule"},{"id":"o3","label":"Compare consecutive terms"},{"id":"o4","label":"Identify the pattern"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 4, 'Sort the terms by role: place triangle in the focal-concept category and the other terms in related-concept.', NULL, 'triangle is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"triangle"},{"id":"i2","label":"mean"},{"id":"i3","label":"median"},{"id":"i4","label":"mode"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place triangle in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 5, 'An arithmetic exercise starts with 42 and subtracts 5. What is the result?', NULL, 'Subtract 5 from 42: 42 − 5 = 37.',
  '{"blanks":[{"id":"b1","type":"number","label":"Answer"}],"template":"An arithmetic exercise starts with 42 and subtracts 5. What is the result? Answer: ___"}', '{"numeric":[{"value":37,"blankId":"b1","tolerance":0}]}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 42 and subtracts 5. What is the result?.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 7, 'Complete the number pattern: 20, 24, 28, 32, ___.', NULL, 'Each term increases by 4, so the next number is 36.',
  '{"sequence":[{"id":"e1","number":20},{"id":"e2","number":24},{"id":"e3","number":28},{"id":"e4","number":32}],"candidates":[{"id":"c1","number":36},{"id":"c2","number":37},{"id":"c3","number":35}],"interaction":"complete-sequence"}', '{"rule":"Add 4","type":"candidate","acceptableIds":["c1"]}', '[{"text":"Focus on the key idea behind Complete the number pattern: 20, 24, 28, 32, ___.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 9, 'Scenario: A learner must explain mode during a mathematics activity. Which choice is best?', NULL, 'The correct choice states the key idea: most frequently occurring value.',
  '{"scenarioText":"The learner is asked to select the accurate explanation of mode.","decisions":[{"id":"d1","text":"Choose the accurate explanation of mode.","options":[{"id":"opt1","text":"Most frequently occurring value."},{"id":"opt2","text":"Mode has the opposite meaning."},{"id":"opt3","text":"Mode is unrelated to mathematics."}]}]}', '{"optimalPath":[{"optionId":"opt1","decisionId":"d1"}]}', '[{"text":"Focus on the key idea behind Scenario: A learner must explain mode during a mathematics activity. Which choice is best?.","level":1}]', ARRAY['topic:statistics','subtopic:statistics'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 10, 'An arithmetic exercise starts with 45 and subtracts 8. What is the result?', NULL, 'Subtract 8 from 45: 45 − 8 = 37.',
  '{"problem":"An arithmetic exercise starts with 45 and subtracts 8. What is the result?","inputMode":"numeric","answerFormat":"integer"}', '{"type":"exact","value":37}', '[{"text":"Focus on the key idea behind An arithmetic exercise starts with 45 and subtracts 8. What is the result?.","level":1}]', ARRAY['topic:probability','subtopic:probability'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 1, 'Drag each STEM term to the definition that matches it.', NULL, 'coordinate means ordered values locating a point in a coordinate system. The other terms match their own definitions.',
  '{"mode":"multi-target","items":[{"id":"i1","label":"coordinate"},{"id":"i2","label":"slope"},{"id":"i3","label":"sequence"}],"zones":[{"id":"z1","label":"ordered values locating a point in a coordinate system"},{"id":"z2","label":"rate of change, often rise divided by run"},{"id":"z3","label":"ordered list of numbers or objects following a rule"}]}', '{"mappings":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"},{"itemId":"i3","zoneId":"z3"}]}', '[{"text":"Focus on the key idea behind Drag each STEM term to the definition that matches it.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 2, 'Match each mathematics term with its correct description.', NULL, 'slope is correctly paired with its description: rate of change, often rise divided by run.',
  '{"leftItems":[{"id":"l1","text":"slope"},{"id":"l2","text":"sequence"},{"id":"l3","text":"symmetry"}],"rightItems":[{"id":"r1","text":"rate of change, often rise divided by run"},{"id":"r2","text":"ordered list of numbers or objects following a rule"},{"id":"r3","text":"property in which parts correspond in a balanced way"}]}', '{"pairs":[{"leftId":"l1","rightId":"r1"},{"leftId":"l2","rightId":"r2"},{"leftId":"l3","rightId":"r3"}]}', '[{"text":"Focus on the key idea behind Match each mathematics term with its correct description.","level":1}]', ARRAY['topic:algebra','subtopic:algebra'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 3, 'Put these steps in the correct order for a mathematics process.', NULL, 'The steps should progress from the starting condition through the transformation to the resulting outcome.',
  '{"items":[{"id":"o1","label":"Apply the rule to the next term"},{"id":"o2","label":"Determine the rule"},{"id":"o3","label":"Compare consecutive terms"},{"id":"o4","label":"Identify the pattern"}]}', '{"order":["o4","o3","o2","o1"]}', '[{"text":"Focus on the key idea behind Put these steps in the correct order for a mathematics process.","level":1}]', ARRAY['topic:patterns','subtopic:patterns'], 6, 9, 5, 100, 'published', 1
);

INSERT INTO "public"."questions" (
  "stream_id", "level_id", "activity_type_id", "prompt", "instructions", "explanation",
  "payload", "correct_answer", "hints", "tags", "grade_min", "grade_max", "difficulty",
  "base_points", "status", "version"
) VALUES (
  4, 20, 4, 'Sort the terms by role: place symmetry in the focal-concept category and the other terms in related-concept.', NULL, 'symmetry is the focal concept for this question; the remaining terms provide related examples.',
  '{"items":[{"id":"i1","label":"symmetry"},{"id":"i2","label":"place value"},{"id":"i3","label":"factor"},{"id":"i4","label":"multiple"}],"categories":[{"id":"c1","label":"Focal concept"},{"id":"c2","label":"Related concept"}]}', '{"assignments":[{"itemId":"i1","categoryId":"c1"},{"itemId":"i2","categoryId":"c2"},{"itemId":"i3","categoryId":"c2"},{"itemId":"i4","categoryId":"c2"}]}', '[{"text":"Focus on the key idea behind Sort the terms by role: place symmetry in the focal-concept category and the other terms in related-concept.","level":1}]', ARRAY['topic:geometry','subtopic:geometry'], 6, 9, 5, 100, 'published', 1
);

COMMIT;
