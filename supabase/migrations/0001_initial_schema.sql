-- =============================================================================
-- STEM QUEST — 0001_initial_schema.sql
-- Supabase PostgreSQL initial schema (21 tables).
-- Source of truth: reports/06-database-architecture.md (Stage 2, APPROVED).
-- Decisions implemented: D-024…D-041.
-- Notes:
--   * No seed data (questions/content seeded in a later stage).
--   * No game-logic functions/triggers (D-037). The only function is an RLS
--     support helper (`public.is_admin()`); no `updated_at` trigger is used —
--     the backend service role writes `updated_at` explicitly.
--   * Optional indexes deliberately skipped (architecture: "skip if unused"):
--     `questions GIN (tags)` and `schools` trigram GIN on `name`.
--   * `questions.correct_answer` is protected: the table has no admin SELECT
--     policy; admins preview via the security-definer view `questions_public`
--     (excludes `correct_answer`). Full management runs through the backend.
--   * Round score columns (`session_rounds.base_points`, `points_earned`;
--     `student_answers.points_earned`) are CHECK `>= 0` only: the 0–100
--     question ceiling is a service-layer clamp (D-023), not a data CHECK.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. admins — the only Supabase Auth-backed identity (D-005, D-028)
-- ---------------------------------------------------------------------------
create table public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('superadmin', 'admin', 'content_editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Admin may read their own row (used for session checks). Uses auth.uid()
-- directly, NOT is_admin(), to avoid RLS recursion on this table.
create policy admins_select_own on public.admins
  for select to public
  using (auth.uid() = id and is_active);

-- ---------------------------------------------------------------------------
-- RLS support helper (not game logic; D-037 does not forbid RLS plumbing).
-- True only when the caller is an active admin row.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins a
    where a.id = auth.uid() and a.is_active
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. admin_actions — immutable audit trail of privileged admin operations
-- ---------------------------------------------------------------------------
create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

create policy admin_actions_select on public.admin_actions
  for select to authenticated using (public.is_admin());
create policy admin_actions_insert on public.admin_actions
  for insert to authenticated with check (public.is_admin());

create index admin_actions_admin_id_idx on public.admin_actions (admin_id);
create index admin_actions_action_idx on public.admin_actions (action);
create index admin_actions_created_at_desc_idx on public.admin_actions (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. schools
-- ---------------------------------------------------------------------------
create table public.schools (
  id bigint generated always as identity primary key,
  name text not null,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schools enable row level security;

create policy schools_admin_select on public.schools
  for select to authenticated using (public.is_admin());
create policy schools_admin_insert on public.schools
  for insert to authenticated with check (public.is_admin());
create policy schools_admin_update on public.schools
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy schools_admin_delete on public.schools
  for delete to authenticated using (public.is_admin());

create index schools_name_idx on public.schools (name);

-- ---------------------------------------------------------------------------
-- 4. students — application records, NOT Supabase Auth users (D-005)
-- ---------------------------------------------------------------------------
create table public.students (
  id bigint generated always as identity primary key,
  initials text not null check (char_length(initials) between 1 and 5),
  full_name text not null,
  school_id bigint not null references public.schools (id) on delete restrict,
  grade smallint not null check (grade between 6 and 11),
  login_code text not null unique,
  profile_photo_path text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

create policy students_admin_select on public.students
  for select to authenticated using (public.is_admin());
create policy students_admin_insert on public.students
  for insert to authenticated with check (public.is_admin());
create policy students_admin_update on public.students
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy students_admin_delete on public.students
  for delete to authenticated using (public.is_admin());

create index students_school_id_idx on public.students (school_id);
create index students_full_name_idx on public.students (full_name);

-- ---------------------------------------------------------------------------
-- 5. student_sessions — hashed login tokens only; backend only (D-040)
-- ---------------------------------------------------------------------------
create table public.student_sessions (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  token_hash text not null unique,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

alter table public.student_sessions enable row level security;

create index student_sessions_student_id_idx on public.student_sessions (student_id);
create index student_sessions_expires_at_idx on public.student_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 6. streams — the four STEM streams
-- ---------------------------------------------------------------------------
create table public.streams (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  display_order int not null default 0,
  theme_color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.streams enable row level security;

create policy streams_anon_select on public.streams
  for select to anon using (true);
create policy streams_admin_select on public.streams
  for select to authenticated using (public.is_admin());
create policy streams_admin_insert on public.streams
  for insert to authenticated with check (public.is_admin());
create policy streams_admin_update on public.streams
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy streams_admin_delete on public.streams
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. levels — 5 per stream + data-driven timer/overtime rules (D-034)
--    UNIQUE (id, stream_id) backs the composite-FK integrity strategy (D-039)
-- ---------------------------------------------------------------------------
create table public.levels (
  id bigint generated always as identity primary key,
  stream_id bigint not null references public.streams (id) on delete cascade,
  number smallint not null check (number between 1 and 5),
  name text not null,
  default_time_seconds int not null check (default_time_seconds > 0),
  overtime_penalty_per_second int not null check (overtime_penalty_per_second > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_levels_stream_number unique (stream_id, number),
  constraint uq_levels_stream_name unique (stream_id, name),
  constraint uq_levels_id_stream unique (id, stream_id)
);

alter table public.levels enable row level security;

create policy levels_anon_select on public.levels
  for select to anon using (true);
create policy levels_admin_select on public.levels
  for select to authenticated using (public.is_admin());
create policy levels_admin_insert on public.levels
  for insert to authenticated with check (public.is_admin());
create policy levels_admin_update on public.levels
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy levels_admin_delete on public.levels
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. activity_types — data-driven catalogue only; no executable code (D-037)
-- ---------------------------------------------------------------------------
create table public.activity_types (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activity_types enable row level security;

create policy activity_types_anon_select on public.activity_types
  for select to anon using (true);
create policy activity_types_admin_select on public.activity_types
  for select to authenticated using (public.is_admin());
create policy activity_types_admin_insert on public.activity_types
  for insert to authenticated with check (public.is_admin());
create policy activity_types_admin_update on public.activity_types
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy activity_types_admin_delete on public.activity_types
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. questions — single reusable content model (D-025/D-026)
--    Composite FK (level_id, stream_id) → levels(id, stream_id) (D-039).
--    correct_answer stays server-side; no admin direct table SELECT (D-028).
-- ---------------------------------------------------------------------------
create table public.questions (
  id bigint generated always as identity primary key,
  stream_id bigint not null references public.streams (id) on delete restrict,
  level_id bigint not null,
  activity_type_id bigint not null references public.activity_types (id) on delete restrict,
  prompt text not null,
  instructions text,
  explanation text,
  payload jsonb not null,
  correct_answer jsonb not null,
  hints jsonb,
  tags text[],
  grade_min smallint not null default 6 check (grade_min between 6 and 11),
  grade_max smallint not null default 11
    check (grade_max between 6 and 11 and grade_max >= grade_min),
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  base_points int not null default 100 check (base_points between 1 and 100),
  timer_override_seconds int check (timer_override_seconds is null or timer_override_seconds > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_flagged boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_questions_level_stream
    foreign key (level_id, stream_id) references public.levels (id, stream_id) on delete restrict
);

alter table public.questions enable row level security;

create index questions_stream_level_idx on public.questions (stream_id, level_id);
create index questions_activity_type_idx on public.questions (activity_type_id);
create index questions_selection_idx
  on public.questions (stream_id, level_id, status) where status = 'published';
create index questions_status_idx on public.questions (status);

-- Admin preview view WITHOUT correct_answer (security-definer, D-028).
-- Runs as the view owner (postgres), bypassing RLS on questions.
create view public.questions_public as
  select id, stream_id, level_id, activity_type_id, prompt, instructions,
         explanation, payload, hints, tags, grade_min, grade_max, difficulty,
         base_points, timer_override_seconds, status, is_flagged, version,
         created_at, updated_at
  from public.questions;

revoke all on public.questions_public from public;
grant select on public.questions_public to authenticated;

-- ---------------------------------------------------------------------------
-- 10. game_sessions — session audit: seed + exactly 3 question ids (D-032)
-- ---------------------------------------------------------------------------
create table public.game_sessions (
  id bigint generated always as identity primary key,
  session_code text not null unique,
  student_id bigint not null references public.students (id) on delete restrict,
  stream_id bigint not null references public.streams (id) on delete restrict,
  level_id bigint not null,
  seed text not null,
  selected_question_ids bigint[] not null check (cardinality(selected_question_ids) = 3),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned', 'error')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_score int not null default 0 check (total_score >= 0),
  total_time_ms bigint,
  result text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_game_sessions_level_stream
    foreign key (level_id, stream_id) references public.levels (id, stream_id) on delete restrict
);

alter table public.game_sessions enable row level security;

create policy game_sessions_admin_select on public.game_sessions
  for select to authenticated using (public.is_admin());

create index game_sessions_student_created_idx on public.game_sessions (student_id, created_at desc);
create index game_sessions_active_idx
  on public.game_sessions (student_id, stream_id, status) where status = 'active';
create index game_sessions_stream_level_idx on public.game_sessions (stream_id, level_id);
create index game_sessions_status_idx on public.game_sessions (status);

-- ---------------------------------------------------------------------------
-- 11. session_rounds — one row per round (3) with score snapshot
-- ---------------------------------------------------------------------------
create table public.session_rounds (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.game_sessions (id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 3),
  question_id bigint not null references public.questions (id) on delete restrict,
  activity_type_id bigint not null references public.activity_types (id),
  base_points int not null default 100 check (base_points >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'skipped', 'timed_out', 'abandoned')),
  attempts int not null default 0 check (attempts >= 0),
  hints_used int not null default 0 check (hints_used >= 0),
  overtime_seconds int not null default 0 check (overtime_seconds >= 0),
  points_earned int not null default 0 check (points_earned >= 0),
  time_taken_ms bigint,
  answer_data jsonb,
  validation_result jsonb,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_session_rounds_round unique (session_id, round_number)
);

alter table public.session_rounds enable row level security;

create index session_rounds_session_id_idx on public.session_rounds (session_id);
create index session_rounds_question_id_idx on public.session_rounds (question_id);
create index session_rounds_activity_type_id_idx on public.session_rounds (activity_type_id);

-- ---------------------------------------------------------------------------
-- 12. student_answers — full attempt audit (least-privilege surface)
-- ---------------------------------------------------------------------------
create table public.student_answers (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.game_sessions (id) on delete cascade,
  round_id bigint not null references public.session_rounds (id) on delete cascade,
  question_id bigint not null references public.questions (id) on delete restrict,
  attempt_number smallint not null check (attempt_number >= 1),
  answer jsonb not null,
  validation jsonb,
  was_correct boolean,
  points_earned int not null default 0 check (points_earned >= 0),
  time_taken_ms bigint,
  submitted_at timestamptz not null default now(),
  constraint uq_student_answers_attempt unique (round_id, attempt_number)
);

alter table public.student_answers enable row level security;

create index student_answers_round_id_idx on public.student_answers (round_id);
create index student_answers_question_id_idx on public.student_answers (question_id);
create index student_answers_session_id_idx on public.student_answers (session_id);

-- ---------------------------------------------------------------------------
-- 13. scores — canonical final-score ledger, 0–300 (D-030)
-- ---------------------------------------------------------------------------
create table public.scores (
  id bigint generated always as identity primary key,
  session_id bigint not null unique references public.game_sessions (id) on delete cascade,
  student_id bigint not null references public.students (id) on delete restrict,
  stream_id bigint not null references public.streams (id) on delete restrict,
  level_id bigint not null,
  score int not null check (score between 0 and 300),
  total_time_ms bigint,
  round_breakdown jsonb,
  created_at timestamptz not null default now(),
  constraint fk_scores_level_stream
    foreign key (level_id, stream_id) references public.levels (id, stream_id) on delete restrict
);

alter table public.scores enable row level security;

create policy scores_admin_select on public.scores
  for select to authenticated using (public.is_admin());

create index scores_student_id_idx on public.scores (student_id);
create index scores_stream_score_idx on public.scores (stream_id, score desc);
create index scores_level_id_idx on public.scores (level_id);

-- ---------------------------------------------------------------------------
-- 14. student_progress — per-stream aggregate (backend written)
-- ---------------------------------------------------------------------------
create table public.student_progress (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  stream_id bigint not null references public.streams (id) on delete cascade,
  current_level smallint not null default 1 check (current_level between 1 and 5),
  completed_levels smallint not null default 0 check (completed_levels between 0 and 5),
  stream_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint uq_student_progress_student_stream unique (student_id, stream_id)
);

alter table public.student_progress enable row level security;

create policy student_progress_admin_select on public.student_progress
  for select to authenticated using (public.is_admin());

create index student_progress_student_id_idx on public.student_progress (student_id);

-- ---------------------------------------------------------------------------
-- 15. student_level_progress — per-level detail (backend written)
-- ---------------------------------------------------------------------------
create table public.student_level_progress (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  stream_id bigint not null references public.streams (id) on delete cascade,
  level_id bigint not null,
  best_score int not null default 0 check (best_score between 0 and 300),
  attempts int not null default 0 check (attempts >= 0),
  is_completed boolean not null default false,
  completed_at timestamptz,
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_student_level_progress_student_level unique (student_id, level_id),
  constraint fk_student_level_progress_level_stream
    foreign key (level_id, stream_id) references public.levels (id, stream_id) on delete cascade
);

alter table public.student_level_progress enable row level security;

create index student_level_progress_student_stream_idx
  on public.student_level_progress (student_id, stream_id);

-- ---------------------------------------------------------------------------
-- 16. special_access — admin-granted stream and/or level access (D-033)
-- ---------------------------------------------------------------------------
create table public.special_access (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  stream_id bigint references public.streams (id) on delete cascade,
  level_id bigint,
  granted_by uuid references auth.users (id) on delete set null,
  reason text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  constraint chk_special_access_has_target check (stream_id is not null or level_id is not null),
  constraint chk_special_access_level_needs_stream check (not (level_id is not null and stream_id is null)),
  constraint fk_special_access_level_stream
    foreign key (level_id, stream_id) references public.levels (id, stream_id) on delete cascade
);

alter table public.special_access enable row level security;

create policy special_access_admin_select on public.special_access
  for select to authenticated using (public.is_admin());
create policy special_access_admin_insert on public.special_access
  for insert to authenticated with check (public.is_admin());
create policy special_access_admin_update on public.special_access
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy special_access_admin_delete on public.special_access
  for delete to authenticated using (public.is_admin());

create index special_access_student_id_idx on public.special_access (student_id);
create index special_access_active_idx on public.special_access (student_id, stream_id, is_active);

-- One active grant per (student, stream) at the stream level, and one per
-- (student, stream, level) at the level level.
create unique index uq_special_access_stream
  on public.special_access (student_id, stream_id)
  where level_id is null and is_active;
create unique index uq_special_access_level
  on public.special_access (student_id, stream_id, level_id)
  where level_id is not null and is_active;

-- ---------------------------------------------------------------------------
-- 17. badges — data-driven catalogue
-- ---------------------------------------------------------------------------
create table public.badges (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  criteria jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy badges_anon_select on public.badges
  for select to anon using (true);
create policy badges_admin_select on public.badges
  for select to authenticated using (public.is_admin());
create policy badges_admin_insert on public.badges
  for insert to authenticated with check (public.is_admin());
create policy badges_admin_update on public.badges
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy badges_admin_delete on public.badges
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 18. student_badges
-- ---------------------------------------------------------------------------
create table public.student_badges (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  badge_id bigint not null references public.badges (id) on delete restrict,
  awarded_by uuid references auth.users (id) on delete set null,
  awarded_at timestamptz not null default now(),
  metadata jsonb,
  constraint uq_student_badges_student_badge unique (student_id, badge_id)
);

alter table public.student_badges enable row level security;

create policy student_badges_admin_select on public.student_badges
  for select to authenticated using (public.is_admin());
create policy student_badges_admin_insert on public.student_badges
  for insert to authenticated with check (public.is_admin());
create policy student_badges_admin_update on public.student_badges
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy student_badges_admin_delete on public.student_badges
  for delete to authenticated using (public.is_admin());

create index student_badges_student_id_idx on public.student_badges (student_id);

-- ---------------------------------------------------------------------------
-- 19. certificates — records as source of truth; PDFs on demand (D-031)
-- ---------------------------------------------------------------------------
create table public.certificates (
  id bigint generated always as identity primary key,
  certificate_code text not null unique,
  student_id bigint not null references public.students (id) on delete cascade,
  stream_id bigint not null references public.streams (id) on delete restrict,
  title text not null,
  earned_at timestamptz not null default now(),
  document_path text,
  generated_at timestamptz,
  revoked boolean not null default false,
  revoked_at timestamptz,
  constraint uq_certificates_student_stream unique (student_id, stream_id)
);

alter table public.certificates enable row level security;

create policy certificates_admin_select on public.certificates
  for select to authenticated using (public.is_admin());
create policy certificates_admin_insert on public.certificates
  for insert to authenticated with check (public.is_admin());
create policy certificates_admin_update on public.certificates
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy certificates_admin_delete on public.certificates
  for delete to authenticated using (public.is_admin());

create index certificates_student_id_idx on public.certificates (student_id);
create index certificates_stream_id_idx on public.certificates (stream_id);

-- ---------------------------------------------------------------------------
-- 20. leaderboard_entries — materialised best score per (student, stream)
--     Privacy-safe; the only Realtime-broadcast table (D-029)
-- ---------------------------------------------------------------------------
create table public.leaderboard_entries (
  id bigint generated always as identity primary key,
  student_id bigint not null references public.students (id) on delete cascade,
  stream_id bigint not null references public.streams (id) on delete cascade,
  score int not null check (score >= 0),
  completion_time_ms bigint,
  achieved_at timestamptz not null,
  display_name text not null,
  updated_at timestamptz not null default now(),
  constraint uq_leaderboard_student_stream unique (student_id, stream_id)
);

alter table public.leaderboard_entries enable row level security;

create policy leaderboard_entries_anon_select on public.leaderboard_entries
  for select to anon using (true);
create policy leaderboard_entries_admin_select on public.leaderboard_entries
  for select to authenticated using (public.is_admin());

create index leaderboard_top10_idx
  on public.leaderboard_entries (stream_id, score desc, completion_time_ms asc, achieved_at asc);

-- ---------------------------------------------------------------------------
-- 21. game_settings — key/value runtime configuration
-- ---------------------------------------------------------------------------
create table public.game_settings (
  id bigint generated always as identity primary key,
  key text not null unique,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.game_settings enable row level security;

create policy game_settings_admin_select on public.game_settings
  for select to authenticated using (public.is_admin());
create policy game_settings_admin_insert on public.game_settings
  for insert to authenticated with check (public.is_admin());
create policy game_settings_admin_update on public.game_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy game_settings_admin_delete on public.game_settings
  for delete to authenticated using (public.is_admin());
