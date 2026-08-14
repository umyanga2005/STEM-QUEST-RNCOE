-- =============================================================================
-- STEM QUEST — 0002_seed_base_data.sql
-- Stable base/reference data for the approved schema.
-- Source of truth: reports/06-database-architecture.md + reports/05-activity-engine-design.md.
-- Idempotent: safe to run more than once (ON CONFLICT DO NOTHING everywhere).
--   * 4 streams          (documented: overview §Scope, architecture §4.6)
--   * 20 levels (4×5)    (documented: timers/penalties from D-034 table)
--   * 10 activity types  (documented: architecture §4.8 slug list / activity engine §5)
--   * 4 badges           (PROPOSED: architecture says "4 badge types" (§15) awarded on
--                         stream completion (§11); exact slugs/names are NOT documented.
--                         CONFIRM before applying.)
--   * game_settings      (keys from architecture §4.21/D-023/D-035/D-040; two values are
--                         fixed product rules (3 questions, Top 10); the rest are
--                         PROPOSED initial values — CONFIRM before applying.)
-- Does NOT seed questions (Stage 3), students, sessions, or any game data.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- streams — 4 approved STEM streams (UNIQUE slug)
-- ---------------------------------------------------------------------------
insert into public.streams (slug, name, description, display_order, theme_color)
values
  ('science',       'Science',       'Scientific inquiry, physics, chemistry, biology and earth science.', 1, '#22d3ee'),
  ('technology',    'Technology',    'Computing, digital systems, software and information technology.',     2, '#a78bfa'),
  ('engineering',   'Engineering',   'Design, building, materials and the engineering design cycle.',       3, '#f472b6'),
  ('mathematics',   'Mathematics',   'Number sense, algebra, geometry, statistics and logical reasoning.',   4, '#facc15')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- levels — 5 per stream; timers/overtime per D-034 (UNIQUE (stream_id, number))
-- ---------------------------------------------------------------------------
insert into public.levels (stream_id, number, name, default_time_seconds, overtime_penalty_per_second)
select s.id, l.num, l.nm, l.dt, l.op
from public.streams s
cross join (
  values
    (1, 'Beginner',     90, 1),
    (2, 'Easy',         75, 2),
    (3, 'Intermediate', 60, 3),
    (4, 'Advanced',     50, 4),
    (5, 'Hard',         45, 5)
) as l(num, nm, dt, op)
on conflict (stream_id, number) do nothing;

-- ---------------------------------------------------------------------------
-- activity_types — the 10 approved activity types (UNIQUE slug; D-037/D-021)
-- ---------------------------------------------------------------------------
insert into public.activity_types (slug, name, description)
values
  ('drag-drop',          'Drag & Drop',            'Associate/categorise/position items by moving them to targets.'),
  ('matching',           'Matching',               'Pair terms with definitions, functions, formulas or units.'),
  ('ordering',           'Ordering',               'Sequence steps, events, magnitudes or priorities.'),
  ('sorting',            'Sorting',                'Classify items into categories by a shared property.'),
  ('fill-complete',      'Fill / Complete',        'Complete blanks, equations, definitions or short answers.'),
  ('image-interaction',  'Image Interaction',      'Analyse diagrams: label parts, find hotspots, select regions.'),
  ('pattern',            'Pattern',                'Recognise and extrapolate sequences and series.'),
  ('memory',             'Memory',                 'Recall facts, pairs or positions after a short exposure.'),
  ('scenario-challenge', 'Scenario Challenge',     'Applied problem-solving in realistic STEM contexts.'),
  ('number-logic',       'Number / Logic Challenge','Mental arithmetic, numeric reasoning and logical deduction.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- badges — PROPOSED DEFAULTS (see header). 4 badge types, one per stream,
-- awarded on stream completion (architecture §11, §15).
-- ---------------------------------------------------------------------------
insert into public.badges (slug, name, description, criteria)
values
  ('science-completion',       'Science Completion',       'Completed all 5 Science levels.',       '{"type":"stream_completion","stream":"science"}'::jsonb),
  ('technology-completion',    'Technology Completion',    'Completed all 5 Technology levels.',    '{"type":"stream_completion","stream":"technology"}'::jsonb),
  ('engineering-completion',   'Engineering Completion',   'Completed all 5 Engineering levels.',   '{"type":"stream_completion","stream":"engineering"}'::jsonb),
  ('mathematics-completion',   'Mathematics Completion',   'Completed all 5 Mathematics levels.',   '{"type":"stream_completion","stream":"mathematics"}'::jsonb)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- game_settings — key/value (UNIQUE key). Values marked "FIXED RULE" reflect
-- product rules; others are PROPOSED initial values.
-- ---------------------------------------------------------------------------
insert into public.game_settings (key, value, description)
values
  ('session.questions_per_session', '3',                     'FIXED RULE — exactly 3 questions per game session.'),
  ('leaderboard.top_n',             '10',                    'FIXED RULE — Top 10 students per stream on public leaderboards.'),
  ('exhibition.mode',               'false',                 'PROPOSED — exhibition leaderboard mode (false until deployed).'),
  ('scoring.hint_deduction',        '5',                     'PROPOSED — points deducted per hint used (D-023 tuning value, NOT finalised).'),
  ('scoring.attempt_deduction',     '10',                    'PROPOSED — points deducted per extra attempt (D-023 tuning value, NOT finalised).'),
  ('auth.max_failed_attempts',      '5',                     'PROPOSED — failed login attempts before cooldown (D-040).'),
  ('auth.lockout_seconds',          '300',                   'PROPOSED — lockout/cooldown after too many failed logins (D-040).'),
  ('auth.session_ttl_seconds',      '3600',                  'PROPOSED — student session token lifetime (D-040). Key name not specified in design.')
on conflict (key) do nothing;

commit;
