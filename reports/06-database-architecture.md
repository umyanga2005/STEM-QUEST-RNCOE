# 06 – Database Architecture (Supabase PostgreSQL)

> **Status:** DESIGN REVIEWED — APPROVED FOR MIGRATION PLANNING
> (Stage 2, corrected 2026-08-11).
> Correction pass applied: scoring formula finalized (D-023), stream/level
> referential integrity added (D-039), student login security requirements
> documented (D-040).
> **Still NOT implemented.** No tables created, no migrations, no SQL executed.
> Decisions referenced (D-xxx) live in `03-decisions.md`.

## 1. Database Overview

- **Engine:** Supabase PostgreSQL (Free Tier).
- **Naming:** `snake_case`, plural table names, columns lower-case.
- **Primary keys:** `id BIGINT GENERATED ALWAYS AS IDENTITY` for app tables
  (compact, index-friendly, fast hot paths). `admins.id` is `UUID` because it
  must reference `auth.users(id)`. (Decision D-024.)
- **Soft delete / archive** is the default for students and content; hard
  deletes are explicit admin/backend actions (D-036).
- **Server authority:** all trusted writes flow through the Node/Hono backend
  using the Supabase **service role** (server-only secret). Students have no
  direct Supabase access. RLS is enabled on every table as defence-in-depth.
- **Sizes are small:** ~2,000 questions, tens of students-to-thousands,
  sessions retained per policy. Fits Free Tier with lean indexes (D-015 note:
  TanStack Query caching further reduces DB load).

## 2. Entity Relationship Overview

```
auth.users ──1:1── admins ───┬──1:N── admin_actions (audit)
                             ├──1:N── special_access.granted_by (audit)
                             └──1:N── certificates.revoked_by (audit)

schools ──1:N── students ──1:N── student_sessions (login tokens)
students ──1:N── game_sessions ──1:N── session_rounds ──1:N── student_answers
students ──1:N── scores
students ──1:N── student_progress (per stream aggregate)
students ──1:N── student_level_progress (per level detail)
students ──1:N── special_access
students ──1:N── student_badges
students ──1:N── certificates
students ──1:N── leaderboard_entries

streams ──1:N── levels ──1:N── questions
activity_types ──1:N── questions
questions ──1:N── session_rounds / student_answers (read-only links)

badges ──1:N── student_badges
game_settings (key-value)
```

## 3. Table List

| # | Table | Domain |
| --- | --- | --- |
| 1 | `admins` | Admin / Roles |
| 2 | `admin_actions` | Audit / Admin Activity |
| 3 | `schools` | Schools |
| 4 | `students` | Students |
| 5 | `student_sessions` | Students (login tokens) |
| 6 | `streams` | Streams |
| 7 | `levels` | Levels |
| 8 | `activity_types` | Activity Types |
| 9 | `questions` | Questions |
| 10 | `game_sessions` | Game Sessions |
| 11 | `session_rounds` | Session Rounds / Questions |
| 12 | `student_answers` | Student Answers |
| 13 | `scores` | Scores |
| 14 | `student_progress` | Student Progress (stream aggregate) |
| 15 | `student_level_progress` | Student Progress (level detail) |
| 16 | `special_access` | Special Student Access |
| 17 | `badges` | Badges |
| 18 | `student_badges` | Student Badges |
| 19 | `certificates` | Certificates |
| 20 | `leaderboard_entries` | Leaderboard-related data |
| 21 | `game_settings` | Game Settings |

> Convention: PK on each table is `id BIGINT GENERATED ALWAYS AS IDENTITY`;
> `created_at`/`updated_at` are `timestamptz NOT NULL DEFAULT now()` where
> relevant (abbreviated below). FKs are `BIGINT` referencing parent `id`.

---

## 4. Detailed Table Definitions

### 4.1 `admins`

- **Purpose:** links Supabase Auth users to the admin role/permissions. The
  only Auth-backed identity.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | uuid | NO | PK; `REFERENCES auth.users(id) ON DELETE CASCADE` |
| display_name | text | NO | |
| role | text | NO | `'superadmin'`, `'admin'`, `'content_editor'`, `'viewer'`; CHECK in list |
| is_active | boolean | NO | `true` |
| created_at | timestamptz | NO | `now()` |
| updated_at | timestamptz | NO | `now()` |

- **Indexes:** PK only (uuid).
- **Constraints:** `CHECK (role IN (...))`.
- **RLS:** SELECT for `auth.uid()` present in this table and `is_active`.
  Writes via backend service role / SQL editor.

### 4.2 `admin_actions`

- **Purpose:** immutable audit trail of privileged admin operations.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| admin_id | uuid | YES | FK `auth.users(id)` `ON DELETE SET NULL` |
| action | text | NO | e.g. `special_access.grant`, `question.publish`, `certificate.revoke`, `settings.update` |
| target_type | text | YES | entity type |
| target_id | text | YES | entity id (string form) |
| details | jsonb | YES | contextual data |
| created_at | timestamptz | NO | `now()` |

- **Indexes:** `(admin_id)`, `(action)`, `(created_at DESC)`.
- **Constraints:** none beyond FK.
- **RLS:** SELECT/INSERT for authenticated admins.

### 4.3 `schools`

- **Purpose:** the school a student belongs to (registration field).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| name | text | NO | |
| city | text | YES | |
| is_active | boolean | NO | `true` |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:** `(name)` for admin search; optional trigram GIN on `name`.
- **Constraints:** none (name duplicates are permitted; admin dedupes).
- **RLS:** admin manage; anon never (school names are not public).

### 4.4 `students`

- **Purpose:** core student application record (NOT a Supabase Auth user).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| initials | text | NO | CHECK `char_length(initials) BETWEEN 1 AND 5` |
| full_name | text | NO | |
| school_id | bigint | NO | FK `schools.id` `ON DELETE RESTRICT` |
| grade | smallint | NO | CHECK `grade BETWEEN 6 AND 11` |
| login_code | text | NO | UNIQUE; short kiosk code (e.g. 6 chars) |
| profile_photo_path | text | YES | storage path only, never binary |
| status | text | NO | `'active'` | CHECK `('active','disabled')` |
| is_archived | boolean | NO | `false` |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(login_code)`; `(school_id)`; `(full_name)` for search.
- **Constraints:** grade range; initials length; status list.
- **RLS:** admin manage; NO student/anonymous access. Backend mediates all
  student reads/writes via service role.

### 4.5 `student_sessions`

- **Purpose:** lightweight login/session tokens for students (they have no
  Auth account). Backend issues a token; only its hash is stored.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| student_id | bigint | NO | FK `students.id` `ON DELETE CASCADE` |
| token_hash | text | NO | UNIQUE; SHA-256 of token, never plaintext |
| ip_address | text | YES | |
| user_agent | text | YES | |
| created_at | timestamptz | NO | `now()` |
| expires_at | timestamptz | NO | |
| revoked_at | timestamptz | YES | |

- **Indexes:** UNIQUE `(token_hash)`; `(student_id)`; `(expires_at)`.
- **Constraints:** token lifetime enforced by backend; expired/revoked tokens
  rejected.
- **RLS:** backend only (service role).

### 4.6 `streams`

- **Purpose:** the four STEM streams.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| slug | text | NO | UNIQUE (`science`, `technology`, `engineering`, `mathematics`) |
| name | text | NO | |
| description | text | YES | |
| display_order | int | NO | `0` |
| theme_color | text | YES | UI accent |
| is_active | boolean | NO | `true` |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(slug)`.
- **RLS:** anon read (names only); admin manage.

### 4.7 `levels`

- **Purpose:** the 5 levels per stream + timing/penalty defaults (data-driven
  game rules, D-034).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| stream_id | bigint | NO | FK `streams.id` `ON DELETE CASCADE` |
| number | smallint | NO | CHECK `BETWEEN 1 AND 5` |
| name | text | NO | Beginner/Easy/Intermediate/Advanced/Hard |
| default_time_seconds | int | NO | 90/75/60/50/45 for levels 1–5; CHECK `> 0` |
| overtime_penalty_per_second | int | NO | 1/2/3/4/5 for levels 1–5; CHECK `> 0` |
| is_active | boolean | NO | `true` |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(stream_id, number)`; UNIQUE `(stream_id, name)`.
- **Constraints:** level number range; positive time/penalty.
  `UNIQUE (id, stream_id)` — supports the composite FK target used by every
  table that stores both stream and level (D-039).
- **RLS:** anon read; admin manage.

### 4.8 `activity_types`

- **Purpose:** data-driven catalogue of activity types. The DB stores
  identifiers/metadata only — **no executable code** (D-037). The backend
  Activity Engine maps `slug → plugin`.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| slug | text | NO | UNIQUE (`drag-drop`, `matching`, `ordering`, `sorting`, `fill-complete`, `image-interaction`, `pattern`, `memory`, `scenario-challenge`, `number-logic`) |
| name | text | NO | |
| description | text | YES | |
| is_active | boolean | NO | `true` |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(slug)`.
- **RLS:** anon read; admin manage.

### 4.9 `questions`

- **Purpose:** the reusable content model (2,000+ questions). One table for
  all streams — **no** per-stream question tables (D-025). Activity-specific
  data lives in `payload` (JSONB, D-026).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| stream_id | bigint | NO | FK `streams.id` `ON DELETE RESTRICT`; part of composite FK (D-039) |
| level_id | bigint | NO | FK `levels.id`; composite `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)` — level must belong to the stored stream |
| activity_type_id | bigint | NO | FK `activity_types.id` `ON DELETE RESTRICT` |
| prompt | text | NO | headline content |
| instructions | text | YES | |
| explanation | text | YES | shown after answering |
| payload | jsonb | NO | activity-type structure (validated by plugin) |
| correct_answer | jsonb | NO | server-side only; never sent to clients |
| hints | jsonb | YES | bounded array `[{level,text}]` |
| tags | text[] | YES | optional classification |
| grade_min | smallint | NO | `6` | CHECK `BETWEEN 6 AND 11` |
| grade_max | smallint | NO | `11` | CHECK `BETWEEN 6 AND 11`, `grade_max >= grade_min` |
| difficulty | smallint | NO | `1` | CHECK `BETWEEN 1 AND 5` (within-level) |
| base_points | int | NO | `100` | CHECK `BETWEEN 1 AND 100` (D-038) |
| timer_override_seconds | int | YES | NULL; CHECK `> 0`; overrides level default |
| status | text | NO | `'draft'` | CHECK `('draft','published','archived')` |
| is_flagged | boolean | NO | `false` | content-review flag |
| version | int | NO | `1` |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes (rationale in §7):**
  - `(stream_id, level_id)` — content browsing/admin.
  - `(activity_type_id)` — selection + analytics.
  - partial `(stream_id, level_id, status) WHERE status = 'published'` —
    primary game-selection index.
  - `(status)` — lifecycle filtering.
  - GIN `(tags)` — optional keyword search.
- **Constraints:** grade range, difficulty, base_points, status list, timer
  override positivity.
- **RLS:** NO anon access (question bank is protected). Admin SELECT/manage
  via backend or admin UI; backend service role reads for sessions. A
  security-definer view `questions_public` (no `correct_answer`) may serve
  admin previews (§9).

### 4.10 `game_sessions`

- **Purpose:** one row per game session; pins the exact 3 questions, the
  random seed, and the result. Enables full audit/reproduction (D-032).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| session_code | text | NO | UNIQUE; short public code |
| student_id | bigint | NO | FK `students.id` `ON DELETE RESTRICT` |
| stream_id | bigint | NO | FK `streams.id` `ON DELETE RESTRICT`; part of composite FK (D-039) |
| level_id | bigint | NO | FK `levels.id`; composite `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)` — level must belong to the stored stream |
| seed | text | NO | PRNG seed (hex) for reproducible selection |
| selected_question_ids | bigint[] | NO | CHECK `cardinality(...) = 3`; snapshot of round order |
| status | text | NO | `'active'` | CHECK `('active','completed','abandoned','error')` |
| started_at | timestamptz | NO | `now()` |
| completed_at | timestamptz | YES | |
| total_score | int | NO | `0` | CHECK `>= 0` |
| total_time_ms | bigint | YES | |
| result | text | YES | e.g. `passed`, `excellent` |
| metadata | jsonb | YES | e.g. device, session source |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:**
  - `(student_id, created_at DESC)` — session history + "recent questions"
    exclusion query.
  - `(stream_id, level_id)` — analytics.
  - `(status)` — lifecycle/cleanup.
  - partial `(student_id, stream_id, status) WHERE status = 'active'` —
    prevent concurrent active sessions for one student/stream.
- **Constraints:** exactly 3 selected questions; score non-negative; status
  list.
- **RLS:** backend service role writes/reads; admin analytics read. Never
  anonymous.

### 4.11 `session_rounds`

- **Purpose:** one row per round (each of the 3 questions) with the round
  result snapshot.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| session_id | bigint | NO | FK `game_sessions.id` `ON DELETE CASCADE` |
| round_number | smallint | NO | CHECK `BETWEEN 1 AND 3` |
| question_id | bigint | NO | FK `questions.id` `ON DELETE RESTRICT` |
| activity_type_id | bigint | NO | FK `activity_types.id` (snapshot) |
| base_points | int | NO | `100` | CHECK `>= 0` (snapshot of question) |
| status | text | NO | `'pending'` | CHECK `('pending','answered','skipped','timed_out','abandoned')` |
| attempts | int | NO | `0` | CHECK `>= 0` |
| hints_used | int | NO | `0` | CHECK `>= 0` |
| overtime_seconds | int | NO | `0` | CHECK `>= 0` |
| points_earned | int | NO | `0` | CHECK `>= 0` |
| time_taken_ms | bigint | YES | |
| answer_data | jsonb | YES | aggregated student answer snapshot |
| validation_result | jsonb | YES | server validation detail (per-part correctness) |
| started_at | timestamptz | NO | `now()` |
| answered_at | timestamptz | YES | |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:** `(session_id)`; `(question_id)`; `(activity_type_id)` for
  analytics.
- **Constraints:** UNIQUE `(session_id, round_number)`; round number range;
  non-negative counters.
- **RLS:** backend only.

### 4.12 `student_answers`

- **Purpose:** full audit of every submitted attempt within a round
  (multi-attempt rounds produce multiple rows).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| session_id | bigint | NO | FK `game_sessions.id` `ON DELETE CASCADE` |
| round_id | bigint | NO | FK `session_rounds.id` `ON DELETE CASCADE` |
| question_id | bigint | NO | FK `questions.id` `ON DELETE RESTRICT` |
| attempt_number | smallint | NO | CHECK `>= 1` |
| answer | jsonb | NO | submitted answer (activity-specific) |
| validation | jsonb | YES | server validation detail |
| was_correct | boolean | YES | |
| points_earned | int | NO | `0` | CHECK `>= 0` |
| time_taken_ms | bigint | YES | |
| submitted_at | timestamptz | NO | `now()` |

- **Indexes:** `(round_id)`; `(question_id)`; `(session_id)`.
- **Constraints:** UNIQUE `(round_id, attempt_number)`; non-negative points.
- **RLS:** backend only. This table is the least-privilege surface — answers
  and validation are never exposed to clients after submission.

### 4.13 `scores`

- **Purpose:** canonical final-score ledger, one row per completed session.
  Read-optimised for leaderboard/progress/analytics so heavy joins over
  `game_sessions`/`session_rounds` are avoided (D-030).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| session_id | bigint | NO | UNIQUE; FK `game_sessions.id` `ON DELETE CASCADE` |
| student_id | bigint | NO | FK `students.id` `ON DELETE RESTRICT` |
| stream_id | bigint | NO | FK `streams.id` `ON DELETE RESTRICT`; part of composite FK (D-039) |
| level_id | bigint | NO | FK `levels.id` `ON DELETE RESTRICT`; composite `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)` — level must belong to the stored stream |
| score | int | NO | CHECK `BETWEEN 0 AND 300` |
| total_time_ms | bigint | YES | |
| round_breakdown | jsonb | YES | per-round points/hints/attempts |
| created_at | timestamptz | NO | `now()` |

- **Indexes:** `(student_id)`; `(stream_id, score DESC)`; `(level_id)`.
- **Constraints:** session uniqueness; score bounds.
- **RLS:** backend writes; admin reads; anon never.

### 4.14 `student_progress`

- **Purpose:** per-stream aggregate for a student: current level, completed
  count, stream completion. Written only by the backend (D-032/§11).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| student_id | bigint | NO | FK `students.id` `ON DELETE CASCADE` |
| stream_id | bigint | NO | FK `streams.id` `ON DELETE CASCADE` |
| current_level | smallint | NO | `1` | CHECK `BETWEEN 1 AND 5` |
| completed_levels | smallint | NO | `0` | CHECK `BETWEEN 0 AND 5` |
| stream_completed | boolean | NO | `false` |
| updated_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(student_id, stream_id)`; `(student_id)`.
- **RLS:** backend only; admin view.

### 4.15 `student_level_progress`

- **Purpose:** per-level detail: best score, attempts, completion.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| student_id | bigint | NO | FK `students.id` `ON DELETE CASCADE` |
| stream_id | bigint | NO | FK `streams.id` (denormalised for querying); part of composite FK (D-039) |
| level_id | bigint | NO | FK `levels.id` `ON DELETE CASCADE`; composite `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)` — level must belong to the stored stream |
| best_score | int | NO | `0` | CHECK `BETWEEN 0 AND 300` |
| attempts | int | NO | `0` | CHECK `>= 0` |
| is_completed | boolean | NO | `false` |
| completed_at | timestamptz | YES | |
| last_played_at | timestamptz | YES | |
| created_at / updated_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(student_id, level_id)`; `(student_id, stream_id)`.
- **RLS:** backend only.

### 4.16 `special_access`

- **Purpose:** admin-granted access to a stream and/or level without touching
  the student's normal grade or progression.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| student_id | bigint | NO | FK `students.id` `ON DELETE CASCADE` |
| stream_id | bigint | YES | FK `streams.id`; part of composite FK (D-039) |
| level_id | bigint | YES | FK `levels.id`; composite `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)` — a level-specific grant must name the level's own stream |
| granted_by | uuid | YES | FK `auth.users(id)` `ON DELETE SET NULL` (audit) |
| reason | text | YES | |
| granted_at | timestamptz | NO | `now()` |
| expires_at | timestamptz | YES | optional expiry |
| is_active | boolean | NO | `true` |

- **Constraints:**
  - `CHECK (stream_id IS NOT NULL OR level_id IS NOT NULL)`.
  - `CHECK (NOT (level_id IS NOT NULL AND stream_id IS NULL))` — a
    level-specific grant must also name its stream.
  - Composite FK (D-039): when `level_id` is present, the pair
    `(level_id, stream_id)` must exist in `levels(id, stream_id)`, so the
    level and stream can never disagree.
- **Indexes:** `(student_id)`; partial `(student_id, stream_id, is_active)`.
- **Unique anti-duplicate (partial):**
  - `UNIQUE (student_id, stream_id) WHERE level_id IS NULL AND is_active`
  - `UNIQUE (student_id, stream_id, level_id) WHERE level_id IS NOT NULL AND is_active`
- **RLS:** backend/service-role enforcement at session start; admin manage.

### 4.17 `badges`

- **Purpose:** badge catalogue (data-driven criteria).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| slug | text | NO | UNIQUE |
| name | text | NO | |
| description | text | YES | |
| icon | text | YES | storage path / icon name |
| criteria | jsonb | YES | e.g. `{"type":"stream_completion","stream":"science"}` |
| is_active | boolean | NO | `true` |
| created_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(slug)`.
- **RLS:** anon read (name/icon); admin manage.

### 4.18 `student_badges`

- **Purpose:** which students earned which badges.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| student_id | bigint | NO | FK `students.id` `ON DELETE CASCADE` |
| badge_id | bigint | NO | FK `badges.id` `ON DELETE RESTRICT` |
| awarded_by | uuid | YES | FK `auth.users(id)` `ON DELETE SET NULL` |
| awarded_at | timestamptz | NO | `now()` |
| metadata | jsonb | YES | |

- **Indexes:** UNIQUE `(student_id, badge_id)`; `(student_id)`.
- **RLS:** backend awards; admin manage.

### 4.19 `certificates`

- **Purpose:** stream-completion certificate records. The record is the
  source of truth; PDFs are generated on demand and not kept forever (D-031).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| certificate_code | text | NO | UNIQUE; verification code |
| student_id | bigint | NO | FK `students.id` `ON DELETE CASCADE` |
| stream_id | bigint | NO | FK `streams.id` `ON DELETE RESTRICT` |
| title | text | NO | e.g. "Science Completion Certificate" |
| earned_at | timestamptz | NO | `now()` |
| document_path | text | YES | temporary/on-demand PDF path |
| generated_at | timestamptz | YES | |
| revoked | boolean | NO | `false` |
| revoked_at | timestamptz | YES | |

- **Indexes:** UNIQUE `(certificate_code)`; UNIQUE `(student_id, stream_id)`;
  `(stream_id)`.
- **RLS:** backend awards; student may view own via backend; admin manage.

### 4.20 `leaderboard_entries`

- **Purpose:** materialised best score per (student, stream) — the live Top-10
  source. Privacy-safe by construction (only `display_name`) so the whole row
  is broadcastable (D-029).
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| student_id | bigint | NO | FK `students.id` `ON DELETE CASCADE` |
| stream_id | bigint | NO | FK `streams.id` `ON DELETE CASCADE` |
| score | int | NO | CHECK `>= 0` |
| completion_time_ms | bigint | YES | of the best run |
| achieved_at | timestamptz | NO | earliest timestamp of this best score |
| display_name | text | NO | privacy-safe: initials + name |
| updated_at | timestamptz | NO | `now()` |

- **Indexes:** `(stream_id, score DESC, completion_time_ms ASC, achieved_at ASC)`
  — exact Top-10 ordering.
- **Constraints:** UNIQUE `(student_id, stream_id)`.
- **RLS:** anon SELECT allowed (rows are display-safe); writes backend only.

### 4.21 `game_settings`

- **Purpose:** data-driven runtime configuration (admin-controlled game
  settings) without code changes.
- **Columns**

| column | type | null | default / notes |
| --- | --- | --- | --- |
| id | bigint | NO | PK identity |
| key | text | NO | UNIQUE, e.g. `session.questions_per_session`, `leaderboard.top_n`, `exhibition.mode` |
| value | jsonb | NO | |
| description | text | YES | |
| updated_by | uuid | YES | FK `auth.users(id)` `ON DELETE SET NULL` |
| updated_at | timestamptz | NO | `now()` |

- **Indexes:** UNIQUE `(key)`.
- **RLS:** anon read of public keys only (via API); admin manage.

---

## 5. Relationships

- `admins.id` ↔ `auth.users.id` (1:1) — the only Auth-linked identity.
- `schools 1—N students`; `students 1—N student_sessions`.
- `students 1—N {game_sessions, scores, student_progress, student_level_progress, special_access, student_badges, certificates, leaderboard_entries}`.
- `streams 1—N levels 1—N questions`; `activity_types 1—N questions`.
- `game_sessions 1—N session_rounds 1—N student_answers`; `game_sessions 1—0..1 scores`.
- `questions 1—N session_rounds` (read-only historical links; question edits do
  not rewrite history).
- `badges 1—N student_badges`.
- Delete semantics: children of an aggregate cascade (rounds/answers ←
  session; level/stream progress ← student); historical references RESTRICT
  (student FKs on sessions/scores/answers); students use soft archive
  (`is_archived`) instead of hard delete.
- **Stream/level integrity (D-039):** `levels` owns `stream_id`, and every
  table carrying both `stream_id` and `level_id` references
  `levels(id, stream_id)` with a composite FK, so the level always belongs to
  the named stream. `session_rounds`/`student_answers` do not duplicate the
  pair; they inherit it via `game_sessions`, which is itself covered.

## 6. Constraints Summary

- **Domain integrity:** CHECKs on grade (6–11), level number (1–5), difficulty
  (1–5), base_points (1–100), question score (0–100) and session score (0–300),
  timers/penalties (> 0), exactly 3 selected questions, status/enum-style lists.
- **Referential integrity (stream/level, D-039):** `levels UNIQUE (id, stream_id)`
  plus composite `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)`
  on `questions`, `game_sessions`, `scores`, `student_level_progress`, and
  `special_access` — the stored level can never belong to a different stream
  than the stored `stream_id`. `session_rounds`/`student_answers` are covered
  transitively through `game_sessions` (no duplicated pair).
- **Uniqueness:** stream slug, level (stream,number), activity slug, student
  login_code, student_sessions token_hash, session_code,
  (student,level/stream) progress, (student,badge), (student,stream)
  leaderboard & certificate, certificate_code, game_settings key, partial
  unique special-access rows.
- **Non-nullability:** as per table definitions — all game-critical fields
  are NOT NULL; timers/expiries/optional media are NULLable.

## 7. Index Strategy

Why each index exists (no blind indexes):

1. `questions (stream_id, level_id)` — admin browsing; selection planning.
2. `questions (activity_type_id)` — diversity pass of the selection algorithm
   groups by activity type.
3. `questions (stream_id, level_id, status) WHERE status='published'` —
   **the** hot query: fetch the eligible pool for a session. Partial index
   keeps it small (only ~2,000 published rows).
4. `questions (status)` — lifecycle/cleanup and drafts filtering.
5. `questions GIN (tags)` — optional content search; skip if unused.
6. `game_sessions (student_id, created_at DESC)` — recent-session history and
   the "avoid recent questions" exclusion (joined via `session_rounds`).
7. `game_sessions (student_id, stream_id, status) WHERE status='active'` —
   cheap guard against concurrent active sessions.
8. `game_sessions (stream_id, level_id)` and `(status)` — analytics/cleanup.
9. `session_rounds (session_id)` — round lookup + cascade reads.
10. `session_rounds (question_id)` — recent-question exclusion + question
    usage analytics.
11. `student_answers (round_id)`, `(question_id)`, `(session_id)` — audit
    lookups (question_id supports exclusion and misuse analytics).
12. `scores (stream_id, score DESC)` — leaderboard feed; `(student_id)` for
    profile; `(level_id)` for level analytics.
13. `student_progress` UNIQUE `(student_id, stream_id)` — fast per-student
    state reads.
14. `student_level_progress` UNIQUE `(student_id, level_id)` — completion
    checks and best-score updates.
15. `special_access (student_id)` + partial `(student_id, stream_id, is_active)`
    — access check at session start.
16. `leaderboard_entries (stream_id, score DESC, completion_time_ms ASC,
    achieved_at ASC)` — exact Top-10 ordering; this is the only scan the
    exhibition display performs.
17. `certificates (student_id)`, `(stream_id)`, UNIQUE `(certificate_code)` —
    issuance/verification lookups.
18. `admin_actions (created_at DESC)`, `(action)`, `(admin_id)` — audit
    queries.

Avoided: indexes on `payload`/`correct_answer` JSONB (only needed if we later
index activity-specific fields; revisit with the plugin schema), and indexes
on large-text columns.

## 8. JSONB Strategy

**Relational (normalised columns):** every identifier and game-relevant scalar
— stream/level/activity FKs, prompt, instructions, explanation, base_points,
timer override, difficulty, grade range, status, version, student identity
fields, session linkage, round numbers, scores, timestamps. These must be
filterable, indexable, constrained, and queried by SQL.

**JSONB (structured, type-specific):**
- `questions.payload` — the activity-type structure (validated by the plugin
  at authoring time). JSONB avoids a wide table of nullable per-type columns
  and keeps one reusable content model.
- `questions.correct_answer` — server-side validation data; opaque to clients,
  structured per type.
- `questions.hints` — small bounded array.
- `questions.tags` — `text[]` (not JSONB) with optional GIN.
- `student_answers.answer` / `session_rounds.answer_data` — activity-specific
  answers.
- `validation` / `validation_result` — server validation detail.
- `scores.round_breakdown`, `metadata` — analytical/audit detail.
- `badges.criteria`, `game_settings.value`, `admin_actions.details` —
  heterogeneous config/audit payloads.

**Rules:** app-level size caps (payload ≤ ~8 KB, hints ≤ 3 items) to avoid
Free-Tier bloat; no binary in JSONB (Storage bucket instead); no correct
answer embedded in `payload` (kept strictly separate); identifiers never
stored only in JSONB.

## 9. RLS / Security Strategy

Three access modes (Decision D-028):

1. **Backend service role** (server-only secret, never in `VITE_*`): performs
   all trusted writes — sessions, rounds, answers, scores, progress, special
   access, certificates, leaderboard, badges. It bypasses RLS by design.
2. **Admin via Supabase Auth** (`auth.uid()` policies): the `admins` table is
   the only Auth-bound identity. Policies use `auth.uid()` on the admin's
   authenticated requests (admin panel directly reads its own tables and
   calls the API for privileged writes).
3. **Public anon read:** only `streams`, `levels`, `activity_types`, `badges`
   (names/icons), `leaderboard_entries` (privacy-safe rows), and public media
   in Storage. Nothing else is anonymous-readable.

**Critical rule:** students have **no** direct Supabase access at all. They
authenticate to the backend with a lightweight token (`student_sessions`,
stored hashed). All student data flows through the API, so students can never
directly modify scores, XP, level completion, leaderboard position, correct
answers, the question bank, special access, or certificates (D-027).

**RLS is enabled on every table** even where service role bypasses it
(defence-in-depth). `questions.correct_answer` is never exposed to any
non-service role; a `questions_public` security-definer view (excluding
`correct_answer`) is proposed for admin previews.

Profile photos: read via signed URLs generated by the backend; direct public
bucket reads limited to small, approved thumbnails.

### 9.1 Student Login Security Requirements (API-level, not implemented)

Students authenticate with a short kiosk `login_code` against the Hono API
(they are **not** Supabase Auth users — D-005/D-027). The following are
**documented requirements only**; no code is written in this pass (D-040):

1. **Rate limiting** — per-IP and per-student limits on `login` attempts
   (e.g. sliding-window token bucket in the API layer; strict limit for a
   short kiosk code). Burst beyond the limit → HTTP 429 with retry-after.
2. **Failed-attempt protection** — per-student failed-attempt counter with
   escalating cooldown/backoff and lockout (configurable via `game_settings`,
   e.g. `auth.max_failed_attempts`, `auth.lockout_seconds`); counter resets on
   successful login.
3. **Token expiration** — `student_sessions` tokens are time-limited
   (`expires_at`, e.g. session lifetime configured in `game_settings`); the
   backend rejects expired tokens on every request.
4. **Token revocation** — `student_sessions.revoked_at` set on logout, admin
   action, or compromise; revoked tokens rejected on every request. Admin
   revocation recorded in `admin_actions`.
5. **Secure token generation** — issued by the backend with a CSPRNG
   (`crypto.getRandomValues`, ≥ 128-bit entropy); never client-generated.
6. **Hashed token storage** — only `student_sessions.token_hash` (SHA-256) is
   persisted; plaintext tokens are returned once at issue and never stored or
   logged. `token_hash` is UNIQUE.

All of the above are enforced in the API/service layer and treated as part of
the §9 defence-in-depth model; they supplement (not replace) RLS and the
service-role write model.

## 10. Leaderboard Strategy

- **Source:** `leaderboard_entries` — one row per (student, stream) holding
  the **best** completed session score (never summed attempts).
- **Update:** on session completion, the backend replaces the row only when
  the new score is better, or equal score with lower `completion_time_ms`, or
  earlier `achieved_at` (tie-break order: score → time → timestamp).
- **Ranking query:** `ORDER BY score DESC, completion_time_ms ASC,
  achieved_at ASC LIMIT 10` — served by a single covering index.
- **Realtime:** Supabase Realtime broadcasts changes to
  `leaderboard_entries`; rows contain only `display_name`, so broadcasting the
  row is privacy-safe. Updates are rare (only on new bests) → few events,
  Free-Tier-friendly.
- **Privacy:** no student id, full name, school, or grade in the public table.

## 11. Progress Strategy

- `student_level_progress` = per-level truth (best_score, attempts,
  is_completed). `student_progress` = per-stream aggregate (current_level,
  completed_levels, stream_completed).
- **Unlock rule (backend-enforced):** a level is playable when the previous
  level is completed OR an active `special_access` grant covers it.
- **Advancement:** on completion, backend updates both tables in one
  transaction; recomputes `stream_completed`; when all 5 levels of a stream
  are complete, issues the stream certificate + badge and refreshes the
  leaderboard row.
- **Admin override:** admin may adjust `current_level`/grants via the API —
  recorded in `admin_actions`. Progression never depends on frontend state.

## 12. Certificate Strategy

- Awarded only on **stream completion** (all 5 levels) — level completion
  alone yields no stream certificate. Up to 4 certificates per student
  (Science, Technology, Engineering, Mathematics).
- `certificates` record is the source of truth; `certificate_code` enables
  verification.
- **PDFs are generated on demand** (request → render → temporary copy in
  Storage with a short TTL) and are not kept forever. No permanent PDF archive
  (D-031).
- Revocation sets `revoked = true`; revoked certificates are removed from
  public display and their temporary PDF deleted.

## 13. Storage Strategy (Supabase Storage)

Buckets and caps (enforced at app level before upload, plus Storage policies):

| Bucket | Contents | Access | Caps |
| --- | --- | --- | --- |
| `student-photos` | optional profile photos | backend writes; signed-URL reads | ≤ 200 KB; jpeg/webp; square-ish; auto-resize |
| `question-media` | images/audio for questions | admin writes; anon read only for published questions | images ≤ 1 MB |
| `certificates` | temporary on-demand PDFs | backend writes; signed-URL reads | TTL-cleanup |

DB stores only paths (`profile_photo_path`, `document_path`), never binaries.

## 14. Realtime Considerations

- **Only** `leaderboard_entries` (and optionally `game_settings.exhibition.mode`)
  use Realtime.
- One subscription per exhibition screen; rooms filtered by stream.
- No Realtime on high-churn tables (answers, rounds, sessions).
- Free-Tier connection limits respected (this design uses only the minimal
  Top-10 streams).

## 15. Free-Tier Considerations

- **Rows are small:** 4 streams, 20 levels, ~10 activity types, ~2,000
  questions, 4 badge types; students and sessions bounded by retention policy.
- **Lean indexes** (partial where hot) and materialised leaderboard avoid
  expensive aggregation.
- **JSONB capped** (payload ≤ ~8 KB) to keep the 500 MB database headroom.
- **Realtime limited** to the leaderboard.
- **Storage capped** and cleaned (certificate TTL, photo resizing).
- **Retention:** abandoned sessions purged; old answers archived; audit kept
  small. TanStack Query caching further reduces DB reads.

## 16. Data Lifecycle / Cleanup

- **Students:** soft archive (`is_archived`) default; hard delete only via
  explicit admin/backend action after archive.
- **Sessions:** abandoned sessions marked `abandoned` after idle timeout and
  purged after N days (N via `game_settings`); completed sessions retained for
  audit then archived after 24 months (configurable).
- **Answers/rounds:** cascade with their session; archived under the same
  policy.
- **Certificates:** records retained; temporary PDFs TTL-cleaned; revoked
  certs cleaned on revocation.
- **Admin audit:** `admin_actions` retained (small), no auto-purge.
- Cleanup runs as a scheduled backend job (cron) or Supabase pg_cron on the
  Free tier where available.

## 17. Example Data Flow — One 3-Question Session

1. **Registration:** admin (or registration flow) creates `schools` +
   `students` rows (initials, full_name, school_id, grade, login_code).
   Optional photo → `student-photos` → `profile_photo_path`.
2. **Login:** student enters login_code → backend issues token, stores its
   hash in `student_sessions`, returns the token to the client.
3. **Start session (Technology, Level 2):** backend verifies access
   (previous-level completion or active `special_access`), then queries the
   eligible pool
   (`stream_id`, `level_id`, `status='published'`), excludes question ids from
   the student's last 5 sessions (via `session_rounds` joined to recent
   `game_sessions`), groups by `activity_type_id`, and applies the seeded
   diversity algorithm → exactly 3 questions of 3 different types.
4. **Persist:** insert `game_sessions`
   (`seed`, `selected_question_ids[3]`, status `active`), then 3
   `session_rounds` (round_number 1–3, question_id, activity snapshot,
   base_points, started_at). Client receives only prompts/payload/options —
   never `correct_answer`.
5. **Play round 1:** student interacts → answer submitted → backend validates
   via the activity plugin → `student_answers` row (attempt_number, answer,
   was_correct, points) → `session_rounds` updated (attempts, points_earned,
   time_taken_ms, hints_used, overtime_seconds, status `answered`). Repeats
   for rounds 2–3. Correct answers remain server-side.
6. **Finish:** backend applies the **final** central scoring formula (§18,
   server-authoritative) → update `game_sessions`
   (total_score, completed_at, status `completed`, total_time_ms) → insert
   `scores` ledger row → update `student_level_progress` (best_score, attempts,
   is_completed) and `student_progress` (current_level, completed_levels,
   stream_completed).
7. **Rewards:** if the stream's 5 levels are now complete → insert
   `certificates` (+ code) and relevant `student_badges`.
8. **Leaderboard:** if this is a new best for the (student, stream) → upsert
   `leaderboard_entries`; Realtime notifies subscribed displays; Top-10 query
   re-reads the covering index.
9. **Client:** shows score/feedback; the whole session is reproducible from
   `seed` + `selected_question_ids` for audit or replay.

## 18. Scoring Formula (Final, Server-Authoritative)

Finalised in the Stage 2 review pass (Decision D-023). Applied **only** in the
Node/Hono backend (D-006/D-027); the browser never computes the score.

```
Per question (max 100):
    Earned Base = round(Base Points × correctnessFraction)
    Question Score = Earned Base − Hint Deduction − Attempt Deduction − Overtime Deduction
    clamped to [0, 100]

Per session (exactly 3 questions):
    Session Score = Q1 + Q2 + Q3     (max 300)
```

- **Base Points:** per question, default `100` (column `base_points`,
  CHECK 1–100, D-038). The base is the maximum a question can award.
- **Correctness / partial credit (D-041):** the activity plugin (not the
  scoring service) normalizes its activity-specific validation into a
  `correctnessFraction` (0–1): fully correct = 1, partially correct = (0,1)
  (partial-credit rounds), incorrect = 0. The Central Scoring Service computes
  `earnedBasePoints = round(basePoints × correctnessFraction)` before any
  deduction, so partial credit is preserved and the 0–100/0–300 ceilings are
  unchanged. See `05-activity-engine-design.md` §6.
- **Hint Deduction / Attempt Deduction:** per-use deductions on the question
  score. Exact per-use values are **configurable game settings**
  (`game_settings` keys `scoring.hint_deduction`, `scoring.attempt_deduction`),
  not hard-coded — tuning is decoupled from code.
- **Overtime Deduction:** data-driven per level (D-034), applied per second
  over the question's allowed time:

  | Level | Default timer | Overtime penalty |
  | --- | --- | --- |
  | 1 | 90 s | 1 pt/sec |
  | 2 | 75 s | 2 pt/sec |
  | 3 | 60 s | 3 pt/sec |
  | 4 | 50 s | 4 pt/sec |
  | 5 | 45 s | 5 pt/sec |

  A question may override its level's default timer via
  `questions.timer_override_seconds` (CHECK > 0).
- **Floor:** the score can never become negative. `session_rounds.points_earned`
  and `student_answers.points_earned` CHECK `>= 0`; `game_sessions.total_score`
  CHECK `>= 0`; `scores.score` CHECK `0–300`.
- **Round snapshot:** the inputs used at scoring time
  (`base_points`, `attempts`, `hints_used`, `overtime_seconds`,
  `points_earned`) are frozen on `session_rounds`, so later edits to a level's
  penalty or a question's base cannot rewrite history.
- **Integration:** scoring runs at `finishSession` (see §17 step 6); the
  `scores.round_breakdown` JSONB records per-round points/hints/attempts for
  audit and leaderboard tie-breaks.
