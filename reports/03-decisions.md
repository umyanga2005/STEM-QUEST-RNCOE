# 03 – Decisions

Architectural and technical decisions log. Each entry has a stable ID and a
status (`DECIDED` / `OPEN`). Update this file whenever a decision is made or
revised. Do not overwrite history – append or amend entries with a note.

---

## D-001 – Use Vite as the React scaffold/toolchain

- **Status:** DECIDED (2026-08-11)
- **Decision:** Initialize the React project with Vite (React 19 + oxlint +
  `@vitejs/plugin-react`).
- **Why:** Modern, fast, minimal, standard for new React apps; produces a
  clean foundation with almost no boilerplate; npm scripts map directly to
  dev/build/lint/preview.
- **Consequence:** ES modules throughout; Vite config lives in
  `vite.config.js`.

## D-002 – Frontend framework is React

- **Status:** DECIDED (2026-08-11)
- **Decision:** React is the frontend framework (per project direction).
- **Why:** Specified in the project direction; large ecosystem; fits a rich
  interactive SPA with many UI states (game, admin, leaderboards).
- **Note:** Exact companion libraries (routing, state, styling, animation)
  remain OPEN – see D-004.

## D-003 – Architecture must remain Supabase Free Tier compatible

- **Status:** DECIDED (2026-08-11)
- **Decision:** Every design choice must stay viable on the Supabase Free
  Tier (PostgreSQL, Auth, Storage, Realtime).
- **Why:** Explicit project requirement.
- **Consequence:** Constrains storage usage (photo/asset size caps, resizing),
  schema size/index strategy, Realtime listener count, and where heavy
  aggregation runs.

## D-004 – Exact frontend/backend libraries (SUPERSEDED)

- **Status:** RESOLVED (2026-08-11). Superseded by individual decisions
  D-014 … D-020.
- **Original:** routing, state, styling, animation, API framework, and
  deployment were open until the architecture review.

## D-005 – Student identity model

- **Status:** DECIDED (2026-08-11)
- **Decision:** Students are **normal application records**, NOT Supabase Auth
  users. Admin authentication uses Supabase Auth separately.
- **Why:** Students have minimal registration data (initials, name, school,
  grade) and the public leaderboard must be privacy-conscious. Using Auth
  users would add Free Tier user limits and complexity for no functional need
  in the exhibition/game flow.
- **Consequence:** A lightweight student session mechanism will be designed in
  Stage 2 (no password; simple session key / player code). Admin is the only
  Auth-backed role.

## D-006 – Server-side game authority

- **Status:** DECIDED (2026-08-11, proposed in architecture)
- **Decision:** Session question selection (random 3 of ≥100), answer
  validation, and scoring are authoritative in the Node.js backend, not in the
  browser.
- **Why:** Prevents tampering with "random" selection and scores; keeps rules
  consistent for all clients; supports admin overrides cleanly.
- **Consequence:** Frontend calls the API for game sessions; a thin client.

## D-007 – Public leaderboard identity is privacy-conscious

- **Status:** DECIDED (2026-08-11, proposed in architecture)
- **Decision:** Public surfaces (Top 10 leaderboards) display only a safe
  format such as initials + name, never unnecessary personal data.
- **Why:** Students are Grade 6–11; exhibition displays are public.
- **Consequence:** A presentation/display mapping will exist between stored
  student data and public display data.

## D-008 – Activity engine architecture (SUPERSEDED)

- **Status:** RESOLVED (2026-08-11). Superseded by D-021 and the detailed
  design in `05-activity-engine-design.md`.
- **Original:** intended as a pluggable registry of activity types (Drag and
  Drop, Matching, Ordering, Sorting, Fill/Complete, Image Interaction, Pattern,
  Memory, Scenario Challenge, Number/Logic Challenge), each defining
  question-data schema, interaction, validation, and scoring.

## D-009 – Scoring formula (SUPERSEDED)

- **Status:** RESOLVED (2026-08-11). Superseded by D-023.
- **Original:** per-session scoring model not yet defined (weights per activity
  type, time bonus, streaks, etc.); depended on the activity engine contract
  (D-008).

## D-010 – Leaderboard aggregation strategy

- **Status:** DECIDED (2026-08-11, Stage 2). Resolved by the database design.
- **Decision:** Materialise the best score per (student, stream) in a
  `leaderboard_entries` table (privacy-safe `display_name` only). Top-10 =
  `ORDER BY score DESC, completion_time_ms ASC, achieved_at ASC LIMIT 10`
  served by a covering index. Supabase Realtime broadcasts changes to this
  table.
- **Why:** Avoids repeated aggregation over session history, supports live
  Realtime cleanly (rows are display-safe), and keeps Free-Tier reads cheap.
  See `06-database-architecture.md` §10.

## D-011 – Certificate generation approach

- **Status:** DECIDED (2026-08-11, Stage 2). Resolved by the database design.
- **Decision:** Certificates are **database records** (source of truth) with a
  verification code; PDFs are **generated on demand** with a short TTL in
  Storage and are not permanently stored.
- **Why:** A permanent PDF archive is unnecessary weight on Free-Tier Storage;
  records + on-demand rendering cover issuance, verification, and revocation.
  See `06-database-architecture.md` §12.

## D-012 – Database schema

- **Status:** DESIGN COMPLETE — NOT implemented (2026-08-11, Stage 2).
- **Decision:** The full schema (21 tables) is designed in
  `06-database-architecture.md`. No tables created, no migrations written, no
  SQL executed.
- **Why:** Per instruction, implementation is a later controlled stage
  awaiting review.

## D-013 – Secrets never in frontend env vars

- **Status:** DECIDED (2026-08-11)
- **Decision:** Admin credentials must not be stored in frontend environment
  variables. `VITE_*` vars only carry public, non-secret values (project URL,
  anon key). Real secrets live server-side.
- **Why:** Explicit project rule; `.gitignore` now blocks `.env`.
- **Consequence:** `.env.example` documents placeholders; real `.env` is
  git-ignored.

---

# Stage 1 Architecture Review Decisions (2026-08-11)

## D-014 – React Router v7 for routing

- **Status:** DECIDED (2026-08-11)
- **Decision:** Use React Router v7 for SPA routing.
- **Why:** Industry standard, declarative, nested routes map to the app's
  feature areas (student game, admin, leaderboard); `lazy()` enables route
  code-splitting → smaller initial bundle on mobile data. TanStack Router was
  considered but adds type-safe complexity we do not need.
- **Consequence:** Routes will be feature-based and lazy-loaded.

## D-015 – Zustand for client state

- **Status:** DECIDED (2026-08-11)
- **Decision:** Use Zustand for local/UI/game-session client state.
- **Why:** Game rounds carry fast-changing state (current round, score,
  timer). Zustand (~1 kB) updates only subscribed slices, avoids context
  re-render storms, and works outside React (usable in game logic).
- **Consequence:** Server-derived data lives in TanStack Query (D-016), not
  Zustand; Zustand is for ephemeral UI + session-state only.

## D-016 – TanStack Query for server state / data fetching

- **Status:** DECIDED (2026-08-11)
- **Decision:** Use TanStack Query for all server data (API + Supabase).
- **Why:** Caching, deduplication, retries, stale-while-revalidate, and
  optimistic updates. Reduces network traffic and Supabase load (Free Tier
  friendly), and improves perceived speed on mobile.
- **Consequence:** All data access goes through query keys; invalidation
  strategy defined during implementation.

## D-017 – Tailwind CSS v4 + design tokens for styling

- **Status:** DECIDED (2026-08-11)
- **Decision:** Use Tailwind CSS v4 with a CSS custom-property design-token
  layer for the dark, futuristic, game-like theme.
- **Why:** Utility-first + tokens enables a consistent premium UI quickly;
  mobile-first breakpoints built in; compiles to tree-shaken CSS (no runtime
  cost). Alternative (CSS Modules + custom properties) kept as a zero-dep
  fallback.
- **Consequence:** Theme lives in tokens; components stay small; strict
  mobile-first development.

## D-018 – Framer Motion (motion) for animation, CSS for simple effects

- **Status:** DECIDED (2026-08-11)
- **Decision:** Use Framer Motion (package `motion`) for game-feel animations
  and CSS transitions for simple effects.
- **Why:** Declarative spring/layout animations deliver the required
  game-like feel; animates transform/opacity on the compositor (GPU-friendly,
  mobile-safe), respects `prefers-reduced-motion`.
- **Consequence:** Bundle grows ~30–40 kB gzip — acceptable; CSS used for
  cheap effects; heavy animation kept off main thread; reduced-motion honored.

## D-019 – Hono (Node.js) as the API framework

- **Status:** DECIDED (2026-08-11)
- **Decision:** Use Hono on the Node.js runtime for the backend API.
- **Why:** Ultra-light (~14 kB, minimal deps), fast cold starts (fits free
  hosting), TypeScript-first, clean middleware (auth validation, error
  handling). Fastify considered (solid, heavier); NestJS rejected (overkill).
- **Consequence:** API is a small, focused service for game logic + admin ops.

## D-020 – Vercel serverless hosting for the API

- **Status:** DECIDED (2026-08-11) — revisit at the budget/deployment check.
- **Decision:** Deploy the Hono API on Vercel (serverless functions, hobby
  free tier).
- **Why:** Generous free tier, zero maintenance, auto-HTTPS, per-request
  scaling — fits a school-project budget. Leaderboards use Supabase Realtime
  directly (DB-level), so API cold starts do not affect the live exhibition
  display.
- **Alternatives if budget/needs change:** Render free tier (cold-sleeps),
  Supabase Edge Functions (same provider but Deno runtime).
- **Consequence:** API surface kept minimal; cache-heavy reads via TanStack
  Query to reduce function invocations.

## D-021 – Activity engine plugin contract

- **Status:** DECIDED (2026-08-11; amended 2026-08-11 final consistency pass)
- **Decision:** The Activity Engine is a registry of self-contained activity
  type plugins (render · validatePayload · validateAnswer · **scoringInputs** ·
  buildHints · feedback · availableOn). Plugins validate answers and report
  normalized scoring inputs; they **never compute final scores** (see D-041).
  The game engine is activity-agnostic; the Central Scoring Service owns all
  final arithmetic.
- **Why:** Allows new activity types to be added later without rewriting the
  game; keeps question authoring validated per type; supports server-side
  authority (correct answers never reach the client) and a single,
  auditable, server-authoritative scoring point.
- **Consequence:** Full contract in `05-activity-engine-design.md` §3.
  Final scoring is centralized (D-023/D-041); `scoring(ctx): number` was
  removed from the plugin interface.

## D-022 – 3-of-100 question selection algorithm

- **Status:** DECIDED (2026-08-11)
- **Decision:** Server-side seeded random selection of exactly 3 questions
  with a strict activity-diversity pass (3 distinct types when the pool allows)
  and avoidance of the student's last-5-session questions.
- **Why:** Satisfies the fixed game rule, ensures activity diversity, and
  gives controlled, reproducible randomization (session seed stored for
  fairness/debugging).
- **Consequence:** Full algorithm + edge cases in `05-activity-engine-design.md`
  §8.

## D-023 – Central scoring formula (final, server-authoritative)

- **Status:** DECIDED (2026-08-11, corrected in the Stage 2 review pass)
- **Decision:** The central scoring formula is final and applied only by the
  Node/Hono backend (D-006/D-027), never in the browser:

  ```
  Per question:
    Earned Base = round(Base Points (100 max) × correctnessFraction)
    Question Score = Earned Base
                   − Hint Deduction
                   − Attempt Deduction
                   − Overtime Deduction
    Clamp: min 0, max 100.

  Per session (3 questions):
    Session Score = Question 1 + Question 2 + Question 3
    Maximum session score = 300.
  ```

  A score can never become negative (floor 0 at the data layer too, D-038).
  Overtime penalties and default timers are data-driven per level (D-034):

  | Level | Default timer | Overtime penalty |
  | --- | --- | --- |
  | 1 | 90 s | 1 pt/sec |
  | 2 | 75 s | 2 pt/sec |
  | 3 | 60 s | 3 pt/sec |
  | 4 | 50 s | 4 pt/sec |
  | 5 | 45 s | 5 pt/sec |

  Individual questions may override the level's default timer via
  `timer_override_seconds`.
- **Correctness / partial credit (D-041):** the activity plugin reports a
  `correctnessFraction` (0–1) normalized from its activity-specific
  validation — fully correct = 1, partially correct = (0,1) (preserves the
  engine's existing partial-credit capability), incorrect = 0. The Central
  Scoring Service multiplies it against Base Points to get the Earned Base
  before deductions. All approved ceilings and floor are unchanged.
- **Why:** Fixes the previously-open weighting question with explicit, bounded
  rules that fit the game (base 100, 3 questions, max 300) and stay auditable.
- **Configurable game settings (only these remain tunable):** the exact
  values for **hint deduction** and **attempt deduction** are not yet
  finalised; they are isolated as `game_settings` rows
  (`scoring.hint_deduction`, `scoring.attempt_deduction`) rather than keeping
  the whole formula open. Overtime penalty and default timer already live on
  `levels` (D-034).
- **Consequence:** Full formula and integration notes in
  `06-database-architecture.md` §18.

---

# Stage 2 Database Architecture Decisions (2026-08-11)

## D-024 – BIGINT identity primary keys (UUID only for admins)

- **Status:** DECIDED
- **Decision:** App tables use `BIGINT GENERATED ALWAYS AS IDENTITY` PKs;
  `admins.id` is `UUID` because it references `auth.users(id)`.
- **Why:** Compact, index-friendly, fast hot paths (sessions, scores,
  leaderboard). UUID not needed — there is no distributed write requirement.

## D-025 – Single reusable `questions` table

- **Status:** DECIDED
- **Decision:** All questions (all streams, all levels) live in one `questions`
  table with `stream_id`, `level_id`, and `activity_type_id` FKs. **No**
  per-stream tables such as `science_questions`.
- **Why:** Reusable content model; selection and analytics query one table;
  adding a stream needs no schema change.

## D-026 – JSONB scope: payload/correct-answer/answers/settings vs relational scalars

- **Status:** DECIDED
- **Decision:** JSONB only for type-specific structures (`payload`,
  `correct_answer`, hints, answer snapshots, validation detail, settings
  values, criteria, metadata, round breakdown). Identifiers and game-relevant
  scalars (stream/level/activity FKs, prompt, base_points, timer, difficulty,
  grade range, status, version, scores, timestamps) are normal relational
  columns. App-level caps (payload ≤ ~8 KB).
- **Why:** Keeps one reusable model while preserving indexable, constrained,
  queryable fields. See `06-database-architecture.md` §8.

## D-027 – No direct Supabase access for students; backend-mediated writes

- **Status:** DECIDED
- **Decision:** Students are application records with a lightweight token
  session (`student_sessions`, hashed tokens). All student data flows through
  the Node/Hono backend (service role). Students can never directly modify
  scores, XP, progression, leaderboard, correct answers, the question bank,
  special access, or certificates.
- **Why:** Satisfies the security requirement with the chosen identity model
  (D-005) and keeps RLS surface minimal.

## D-028 – RLS model: three access modes, enabled everywhere

- **Status:** DECIDED
- **Decision:** (1) Backend service role for all trusted writes; (2) Admin via
  Supabase Auth with `auth.uid()` policies keyed on `admins`; (3) Public anon
  read only on `streams`, `levels`, `activity_types`, `badges`,
  `leaderboard_entries`, and published media. RLS enabled on every table.
  `questions.correct_answer` never exposed to non-service roles (a
  `questions_public` security-definer view proposed for admin previews).
- **Why:** Defence-in-depth; clear least-privilege boundaries; leaderboard is
  broadcastable by construction.

## D-029 – Leaderboard materialised in `leaderboard_entries`

- **Status:** DECIDED
- **Decision:** One row per (student, stream) holding the best score +
  tie-break data (`completion_time_ms`, `achieved_at`) + privacy-safe
  `display_name`. Updated only when a new best occurs; Realtime broadcasts on
  this table.
- **Why:** Top-10 queries are a single covering-index scan; Realtime works
  cleanly; rows are privacy-safe; writes are rare (Free-Tier friendly).

## D-030 – `scores` ledger table

- **Status:** DECIDED
- **Decision:** A `scores` table records one row per completed session
  (score, level, stream, breakdown), separate from the `game_sessions` header.
- **Why:** Read-optimised for leaderboard/progress/analytics without scanning
  `session_rounds`/`game_sessions`; small, justified denormalisation.

## D-031 – Certificates as records + on-demand PDF

- **Status:** DECIDED
- **Decision:** `certificates` records are the source of truth; PDFs are
  generated on demand with a short TTL and not stored permanently. Revocation
  via `revoked` flag; verification via `certificate_code`.
- **Why:** Avoids permanent PDF weight on Free-Tier Storage; meets the
  certificate requirements without PDF bloat.

## D-032 – Session audit model

- **Status:** DECIDED
- **Decision:** `game_sessions` stores `seed` + `selected_question_ids`
  (`bigint[]`, CHECK cardinality = 3) plus per-round rows and per-attempt
  answer rows, so every session is fully reproducible and auditable.
- **Why:** Supports anti-cheat analysis, replay, and the "fixed for the
  session" rule. Correct answers never leave the server.

## D-033 – Special access model

- **Status:** DECIDED
- **Decision:** `special_access` rows grant a student a stream-wide and/or
  level-specific access with optional expiry, audit (granted_by, reason),
  activation, and partial-unique anti-duplicate constraints. Access is checked
  at session start; does not alter the student's grade or normal progression.
- **Why:** Matches the admin special-access requirement without touching
  progression data.

## D-034 – Timers and overtime penalties data-driven per level

- **Status:** DECIDED
- **Decision:** Default question time and overtime penalty-per-second live on
  `levels` (90/75/60/50/45 s and 1/2/3/4/5 pts respectively); `questions`
  may override time via `timer_override_seconds`.
- **Why:** Game rules become admin-configurable data instead of code; single
  source of truth; score floor of 0 enforced at scoring.

## D-035 – `game_settings` key-value (JSONB) configuration

- **Status:** DECIDED
- **Decision:** Runtime game settings (e.g. `session.questions_per_session`,
  `leaderboard.top_n`, `exhibition.mode`) are rows in `game_settings`.
- **Why:** Admin controls game settings without code changes; auditable via
  `updated_by`.

## D-036 – Soft archive + retention/cleanup policy

- **Status:** DECIDED
- **Decision:** Students/content soft-archive by default; abandoned sessions
  purged after a configurable interval; completed session/answer history
  retained then archived per policy; certificate PDFs TTL-cleaned.
- **Why:** Keeps the Free-Tier database and Storage lean while preserving
  auditability.

## D-037 – Activity types data-driven; no executable code in the DB

- **Status:** DECIDED
- **Decision:** `activity_types` is a catalogue (slug, name, active). The
  database stores no functions/triggers implementing game logic or activity
  mechanics; the backend Activity Engine maps `slug → plugin`.
- **Why:** Keeps logic in the application layer, extensible and testable; DB
  stays simple and Free-Tier friendly.

## D-038 – Base points fixed at 100; session max 300

- **Status:** DECIDED
- **Decision:** `questions.base_points` defaults to 100 (1–100 range);
  3 questions ⇒ maximum session score 300. Overtime/hints/attempts only deduct
  or scale; a question score can never go negative (floor 0).
- **Why:** Implements the stated scoring ceiling with a hard constraint at
  the data layer.

## D-039 – Stream/level referential integrity (composite foreign keys)

- **Status:** DECIDED (2026-08-11, Stage 2 review pass)
- **Decision:** `levels` gains a `UNIQUE (id, stream_id)` constraint. Every
  table that stores **both** `stream_id` and `level_id` references them
  together with a composite foreign key:

  ```
  FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)
  ```

  so the stored level can never belong to a different stream than the stored
  `stream_id` (prevents e.g. `stream_id = Science` with
  `level_id = Technology Level 3`). Applied at minimum to `questions`,
  `game_sessions`, `scores`, `student_level_progress`, and `special_access`
  (level-specific grants). `session_rounds` and `student_answers` do **not**
  store a stream/level pair of their own — they inherit it through
  `game_sessions`, so the session's composite FK covers them with no
  duplicated data.
- **Why:** A plain FK on `level_id` alone cannot detect stream/level
  mismatches; the composite FK makes impossible combinations unrepresentable
  at the DDL level. It avoids duplicating stream data (no extra columns, no
  redundant pair) while keeping any row that does carry both values provably
  consistent.
- **Consequence:** See `06-database-architecture.md` §6 (constraints) and the
  per-table definitions in §4.

## D-040 – Student login security requirements (API-level, not implemented)

- **Status:** DECIDED (2026-08-11, Stage 2 review pass) — documented as
  requirements only; implementation is a later stage.
- **Decision:** The student `login_code` flow must enforce, at the API level:
  1. **Rate limiting** on login attempts per source/IP and per student.
  2. **Failed-attempt protection** (attempt counters, escalating backoff, and
     lockout/cooldown).
  3. **Token expiration** — student session tokens are time-limited
     (`student_sessions.expires_at`).
  4. **Token revocation** — revoke on logout/admin action/compromise
     (`revoked_at`), checked on every request.
  5. **Secure token generation** — cryptographically random (e.g.
     `crypto.getRandomValues`, ≥ 128-bit).
  6. **Hashed token storage** — only the SHA-256 hash is stored
     (`student_sessions.token_hash`); plaintext tokens never persist.
- **Why:** Students are not Supabase Auth users (D-005/D-027), so the login
  surface is hardened in our own Hono API instead of relying on Supabase Auth.
- **Consequence:** Full requirements live in `06-database-architecture.md`
  §9.1. No code is written in this pass.

## D-041 – Scoring boundary: plugins report inputs, central service scores

- **Status:** DECIDED (2026-08-11, final consistency pass)
- **Decision:** `ActivityTypePlugin` has **no `scoring()` method** and never
  computes final points (the earlier `scoring(ctx): number` draft is removed).
  A plugin's responsibility ends at:
  1. `validateAnswer` — activity-specific validation (per-part correctness).
  2. `scoringInputs` — normalizing that validation into a `correctnessFraction`
     (0–1) plus attempts/hints/time/bonus flags.
  The **Central Scoring Service** (part of the backend, D-006/D-027) owns all
  final arithmetic:
  ```
  earnedBasePoints  = round(basePoints × correctnessFraction)   // basePoints ≤ 100
  questionScore     = earnedBasePoints − hintDeduction − attemptDeduction − overtimeDeduction
  questionScore     = clamp(questionScore, 0, 100)
  sessionScore      = Q1 + Q2 + Q3                              // max 300
  ```
- **Correctness / partial credit:** `correctnessFraction` = 1 for fully
  correct, (0,1) for partially correct (existing partial-credit capability),
  0 for incorrect. Deductions are applied centrally after correctness scales
  the earned base; scores never go negative and never exceed 100/300.
- **Why:** Final scoring must be centralized and server-authoritative
  (D-006/D-023). Letting plugins compute points would split the rule across
  modules and make scores unauditable. A normalized fraction keeps partial
  credit while keeping `base_points` and all deductions centralized.
- **Consequence:** Plugin contract updated in `05-activity-engine-design.md`
  §3; correctness representation in §6; flows in §3/§7; D-021 amended and
  D-023 clarified. No code is written in this pass.

## D-042 – Storage security model + bucket naming (Task 2.12)

- **Status:** DECIDED (2026-08-11)
- **Decision:**
  1. **Buckets:** `student-avatars` (optional profile photos, PRIVATE) and
     `question-media` (question/activity images, PRIVATE). Both STANDARD type.
     No `certificates` bucket — on-demand PDFs only, no permanent archive
     (D-031). Bucket-level `file_size_limit` + `allowed_mime_types` enforce
     size/MIME server-side: avatars ≤ 200 KB; media ≤ 1 MB; jpeg/png/webp only.
  2. **Access:** Storage follows the D-027/D-028 model. No anon or non-admin
     authenticated policies (default-deny). Only explicit policies are
     `SELECT` for authenticated admins via `public.is_admin()` on both buckets.
     All writes and signed-URL generation run as the trusted service role
     (backend). Admin uploads go through the backend API, not direct upload.
     Students never touch Storage directly (no ownership-based policies).
  3. **Path design:** avatars at `student-avatars/{numeric-student-id}/profile.webp`
     — numeric id, never the student's name (privacy, D-005).
  4. **Upload validation:** client-side checks are UX-only; the backend is
     authoritative (MIME sniff, extension whitelist, size, path, identity,
     ownership, bucket, operation). Never trust browser MIME.
- **Naming note:** the Task 2.12 instruction names the avatar bucket
  `student-avatars`; architecture §13 listed `student-photos`. The task spec
  is authoritative. A docs-only consistency tweak to
  `06-database-architecture.md` §13 is recommended (align bucket name with
  `student-avatars`).
- **Why:** Minimal RLS surface, defence-in-depth, Free-Tier-conservative
  (no duplicate/oversized media, resizing planned at upload).

## D-043 – Question content model: relational + payload + correct_answer + future meta

- **Status:** DECIDED (2026-08-11, Task 3.1)
- **Decision:** Authoring concerns that are not game scalars (educational
  objective, per-state feedback templates, presentational media refs,
  provenance incl. AI seed/content hash, review bookkeeping) will live in one
  small JSONB `questions.meta` (target ≤ ~2 KB). Game scalars stay relational
  (existing schema, D-026). Activity-specific structures stay in `payload`;
  server-side validation stays in `correct_answer`. Taxonomy = controlled
  vocabulary in `tags[]` (`topic:<slug>`, `subtopic:<slug>`).
- **Why:** Keeps the current schema untouched and indexable while giving
  authors/reviewers/analytics everything they need. Full spec in
  `07-task-3.1-content-model.md` §2.
- **Status note:** `meta` is **not** migrated now; OD-2 in the spec decides
  timing (recommended at Admin Question Builder build time).

## D-044 – Question lifecycle + versioning (snapshot-safe editing)

- **Status:** DECIDED (2026-08-11, Task 3.1)
- **Decision:** 5-state workflow Draft → Review → Approved → Published →
  Archived. With the current `status` enum (3 values), Review/Approved are
  modelled via `meta.review` + `admin_actions` audit; only `published` reaches
  students. Editing a published question bumps `version`, returns it to Draft,
  and requires re-approval — historical sessions are unaffected because rounds
  snapshot the played payload (`session_rounds.activity_snapshot`).
- **Why:** Professional content governance with zero schema change; audit-safe;
  prevents silent changes to recorded game results. Spec §2b.

## D-045 – Difficulty: level tier + in-level difficulty; level ≠ grade

- **Status:** DECIDED (2026-08-11, Task 3.1)
- **Decision:** Level (L1–L5) is the primary difficulty tier, defined by
  reasoning demand across 12 dimensions (§5.1). `questions.difficulty` (1–5)
  is a *within-level* item difficulty used for ordering/analytics (§5.3
  distribution). `grade_min..grade_max` is a suitability range, NOT a gameplay
  gate — level progression + `special_access` govern play (grade range is
  metadata for authors/analytics).
- **Why:** Separates progression difficulty from grade appropriateness; allows
  a Grade 6 student to attempt a Level 3 challenge via special access while
  keeping content age-appropriate. Spec §4/§5.

## D-046 – Activity JSON Schemas (draft 2020-12) as the authoring contract

- **Status:** DECIDED (2026-08-12, Task 3.2)
- **Decision:** All 10 activity types are contracted with JSON Schema draft
  2020-12: one `payload.schema.json` (student-facing) + one
  `correct-answer.schema.json` (server-only) per type, plus 4 common schemas
  (`ids`, `media`, `question`, `meta`). Schemas live in `schemas/` with a
  stable `$id` under `https://stem-quest.dev/schemas/...`. Payloads contain
  only what students see; correct answers are never sent to the client
  (continues D-041/D-026).
- **Why:** Machine-checkable contracts catch authoring errors before content
  reaches students; they formalize the Activity Engine plugin boundary so
  plugins can be built against a stable interface; `additionalProperties:
  false` + `min/max` cardinalities + `if/then` guards keep payloads honest
  and free-form answers explicit (tolerance fields, accepted[] sets — no
  fuzzy matching).
- **Consequence:** `schemas/validate.py` (3 layers: metaschema validation,
  example conformance, cross-file semantic pairs) is the authoring gate.
  Semantic reference rules (ids must exist across payload↔correct-answer)
  live in the validator now and must be ported to the Activity Engine's
  authoring-time validation in Stage 4. `question.schema.json`/`meta.schema.json`
  wrappers are ready for the Admin Question Builder (Task 3.1 §16).

## D-047 – Partial credit as scoring behavior, not schema shape

- **Status:** DECIDED (2026-08-12, Task 3.2)
- **Decision:** Correct-answer schemas are structured per scorable unit
  (item/pair/blank/hotspot/group/position/step/part/path node). Partial
  credit is computed by the central scoring service as
  `correctnessFraction = correct units ÷ total units` (D-041); the schema
  shape is identical for full and partial credit — demonstrated by the
  `partial-credit.json` examples being structurally identical to
  `valid-correct-answer.json`.
- **Why:** Keeps one answer representation, moves all scoring math server-side
  (tamper-safe, single source of truth), and lets the same correct-answer
  power both full and fractional awarding.

## D-048 – Activity Engine as a plugin-driven core with client/server facades

- **Status:** DECIDED (2026-08-12, Task 4.1)
- **Decision:** The Activity Engine is a plugin-driven JavaScript core
  (`src/features/activity-engine/`) with two facades. A plugin declares 7
  methods (render, validatePayload, validateAnswer, scoringInputs, buildHints,
  feedback, availableOn); the engine owns schema loading, submission shape
  checking, scoring-input guarding, availability, and client/server gating.
  `createClientActivityEngine()` structurally lacks `validateAnswer`,
  `scoringInputs`, `feedback`, and correct-answer schemas; only
  `createServerActivityEngine()` wires them in. Correct-answer schemas are
  statically imported by `server.js` alone so they never enter the client
  bundle.
- **Why:** Reuses one contract across render + validation, keeps correct
  answers server-only by construction (D-041/D-026, verified by build probes),
  and gives drag-drop et al. a proven, ready path for future plugins.

## D-049 – AJV 2020-12 as the in-engine JSON Schema validator

- **Status:** DECIDED (2026-08-12, Task 4.1)
- **Decision:** Use `ajv` (draft 2020-12 build) + `ajv-formats` inside the
  engine's `SchemaRegistry` to compile payload and correct-answer schemas,
  with common schemas registered by `$id` for `$ref` resolution. `ajv` and
  `ajv-formats` moved from `devDependencies` to `dependencies` because the
  engine now imports them at runtime in every environment (Node tests, Vite
  dev, production build). No new packages installed; tests use Node's built-in
  `node --test`.
- **Why:** AJV is the de-facto JS validator, supports draft 2020-12
  (`with { type: 'json' }` static imports resolve identically in all
  environments), and was already verified against these schemas in Task 3.2
  probing. Direct JSON imports remove filesystem/`$ref` fragility; the same
  code runs in the test runner, dev server, and build.

## D-050 – Plugin semantics live in the plugin; answer integrity checked server-side

- **Status:** DECIDED (2026-08-12, Task 4.2)
- **Decision:** The salt-and-pepper semantic rules from `schemas/validate.py`
  (which need **both** documents) are ported into the drag-drop plugin as
  `validateMappings(payload, correctAnswer)` and enforced by the server-only
  `validateAnswer` guard (throws `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`); the
  payload-only rules (id uniqueness, item/zone id disjointness,
  single-target ⇒ one zone) run in the plugin's `validatePayload`.
- **Why:** JSON Schema validates documents in isolation; catalog rules like
  "every mapping references an existing zone" and "every item is covered" are
  only checkable where both documents exist (server). Doing this in the plugin
  reuses the semantic-rule infrastructure (D-048) and keeps the engine
  activity-agnostic, while the strict guard prevents
  schema-valid-but-wrong answer documents from producing false scores.
- **Consequence:** `validateMappings` is the single source of truth for
  authoring integrity and is also usable by authoring tooling. The client
  never runs it — it has no payload↔answer pair by construction (D-041/D-026).

## D-051 – One plugin object per activity (7-method registry contract) keeps server-only source in the client bundle; data boundary unchanged

- **Status:** DECIDED (2026-08-12, Task 4.2)
- **Decision:** A single `dragDropPlugin` object implements all seven contract
  methods and is registered on both facades. Because the registry requires one
  object with all seven methods, the client production bundle necessarily
  contains the plugin's server-only method *source* (`validateAnswer`,
  `scoringInputs`, `feedback`). This is accepted: those methods are inert
  without the correct-answer document, are never invoked by the client facade,
  and are stripped from the `pluginForClient` view. The security-relevant
  boundary — correct-answer schemas and answer documents — remains absent from
  the client bundle (verified by probe greps: `correct-answer.schema.json` `$id`
  has 0 hits in the client bundle).
- **Why:** Changing the registry to accept a 4-method client plugin would be a
  core-contract change beyond this task's scope and risks the Task 4.1
  guarantees; the data boundary that actually matters is airtight today.
- **Consequence:** Recorded as future work (report 10 §29): a mode-aware
  registry could structurally exclude even the inert method source from future
  client bundles. No weakening of the correct-answer boundary is implied.

## D-052 – Game Engine core: pure, dependency-free session + selection modules

- **Status:** DECIDED (2026-08-12, Task 4.3)
- **Decision:** The Game Engine core (`src/features/game-engine/core/`) is a
  set of pure, dependency-free modules — `errors.js` (student-safe error
  model), `prng.js` (seeded PRNG), `selection.js` (D-022 §8 3-of-100), and
  `session.js` (lifecycle state machine). No repository, no I/O, no Activity
  Engine import. Repository adapters (Supabase), answer validation, and the
  Central Scoring Service are injected by callers later.
- **Why:** Mirrors the Activity Engine's testable-core pattern (D-048): all
  session rules (ownership, ordering, state transitions) are unit-testable
  without a database, and the same modules serve the Hono API later.
- **Consequence:** `submitRound` only *records* a round result; real answer
  scoring flows through the Activity Engine's `validateAnswer` →
  `scoringInputs` → Central Scoring Service (D-023/D-041), which
  `finishSession` consumes as `totalPoints` (0–300).

## D-053 – Session seed: ≥ 64-bit hex, crypto-generated, stored for reproducibility

- **Status:** DECIDED (2026-08-12, Task 4.3)
- **Decision:** `generateSessionSeed()` returns a 64-bit (16 hex char) seed via
  `crypto.getRandomValues` and is recorded on the session row. Selection uses
  `createSeededRng(seed)` (deterministic mulberry32 over a 32-bit hash of the
  seed) so the same seed + pool + constraints reproduce the exact same 3
  questions — used for debugging, retry/recovery, and A/B fairness checks
  (design §8 Controls).
- **Why:** The design requires reproducible selection without repeating
  questions; a cryptographically random ≥ 64-bit seed makes collisions across
  concurrent sessions negligible while keeping the RNG fast and dependency-free.
- **Consequence:** `selection.js` is pure over `(stream, level, pool,
  recentQuestionIds, seed)`; the session holds `questionIds` (not live
  references) so a question retired mid-session cannot corrupt a running
  session (design §8 Edge cases).

## D-054 – Matching render hides distractors inside the shuffled target pool

- **Status:** DECIDED (2026-08-13, Task 4.5)
- **Decision:** The matching `render` descriptor merges `rightItems` and
  `distractors` into one shuffled `targets` array. No target is ever marked
  `isDistractor`, `correct`, or `correctAnswer`. The client therefore cannot
  distinguish decoys from legitimate targets, so no answer-relevant marking — and
  no per-target ground truth — needs to be trusted or shipped client-side.
- **Why:** The matching payload schema intentionally exposes distractors as a
  distinct array. Merging at render time removes the only signal that would
  reveal which right cards are answers before a student tries them.
- **Consequence:** Scoring still knows the canonical sets: `validateAnswer`
  accepts any `rightId` in `rightItems ∪ distractors` as a *valid* pick (a
  distractor pick is always scored incorrect), and rejects ids outside both.

## D-055 – Missing-match submissions are rejected, not scored as incorrect

- **Status:** DECIDED (2026-08-13, Task 4.5)
- **Decision:** `validateAnswer` requires every left card to appear exactly once
  in `response.connections`; a submission that omits any left card throws
  `ACTIVITY_ANSWER_INVALID` ("missing required match for left item …"). The same
  applies to a left connected more than once (duplicate source is rejected).
- **Why:** With partial credit = correct pairs ÷ total lefts, a truncated
  response would inflate the score (a student could "skip the hard one"). Forcing
  full coverage keeps the denominator honest and matches the UI's submit gate
  (no submit until every card is matched).
- **Note:** This differs from drag-drop, where an unplaced item is scored as an
  incorrect placement; for matching, cards must be resolved before submission.

## D-056 – Matching interaction semantics live in a pure controller module

- **Status:** DECIDED (2026-08-13, Task 4.5)
- **Decision:** `matching-controller.js` is a framework-free store of pure
  functions (`createMatchState`, `toggleSelect`, `chooseTarget`, `clearMatch`,
  `resetMatches`, `allMatched`, `buildResponse`) that model the full matching
  state machine. The React renderer only maps pointer/touch/keyboard event
  handlers onto those operations.
- **Why:** The touch/keyboard/interaction requirements of Task 4.5 reduce to a
  small set of tested rules (select → pair → reassign/clear → coverage gate →
  submit). Keeping them in a DOM-free module lets Node tests cover them without a
  browser harness, and lets future activities reuse the same pattern.
- **Consequence:** The renderer holds no scoring or correctness logic; response
  serialization (`buildResponse`) is identical to what `validateAnswer` expects,
  keeping the client/server shape contract trivial to satisfy.

## D-057 – Ordering anchors are gameplay locks, never correctness hints

- **Status:** DECIDED (2026-08-13, Task 4.6)
- **Decision:** An ordering `anchor` (`{ position, itemId }`) locks an item to a
  position for the whole round: the anchored item can never be moved and the
  anchored slot can never receive another item. Anchors ship in the client-safe
  render descriptor because they are part of the **question**, not the answer —
  they convey zero correctness information. `render` never reads
  `correctAnswer.order`; only `validateSequence` (server-side) checks that the
  expected order agrees with every anchor.
- **Why:** Anchors give authors a pedagogical scaffold (e.g., "the first step is
  given") without leaking any part of the expected sequence to the client. The
  anchor position is the locked *question*; the *answer* remains the untouched
  permutation.
- **Consequence:** A submitted order that breaks an anchor is scored incorrect at
  that position — never treated as an authoring error. Rendering marks anchored
  slots as locked (`aria-disabled`, dashed styling, screen-reader announce) and
  the controller's `moveItem`/`swap` only ever re-arrange free positions.

## D-058 – Ordering is sequence construction; submissions must be complete permutations

- **Status:** DECIDED (2026-08-13, Task 4.6)
- **Decision:** Ordering models the answer as an ordered sequence of item ids:
  the position is the rank, per-position credit is awarded, and there is no
  separate `rank` field. `validateAnswer` requires `response.order` to be a
  complete permutation of the payload item ids — duplicate, unknown, missing, or
  malformed orders are rejected (`ACTIVITY_ANSWER_INVALID`) before scoring.
  Partial credit = correct positions ÷ total positions (D-047).
- **Why:** Sequence construction is what the ordering activity type actually
  asks the student to do. Requiring a complete permutation keeps the partial-
  credit denominator honest (a truncated response cannot inflate the score) and
  matches the UI submit gate (no submit until every position is filled).
- **Consequence:** `buildResponse` in the controller emits exactly `{ order }`;
  the renderer gates submit on `isComplete`; the engine's `validateAnswer` is
  the single authority for both shape and correctness.

## D-059 – Interaction-semantics pattern (pure controller) extends to ordering; flaky-test policy: assert contracts, not fixtures

- **Status:** DECIDED (2026-08-13, Task 4.6)
- **Decision:** (1) Ordering follows the D-056 pattern: all interaction rules
  live in a DOM-free pure module (`ordering-controller.js`) that the React
  renderer only maps events onto, keeping anchor/move/swap semantics
  unit-testable in Node. (2) A pre-existing flaky session test (`M52`) asserted
  a specific matching fixture's item count while the pool legitimately mixed
  3-item and 4-item questions; it was rewritten to assert the safe-descriptor
  **contract** (non-empty arrays, string `id`/`text`, no `pairs`, no
  `correctAnswer`) instead of a fixture item count.
- **Why:** Both choices keep the test surface deterministic. Pure controllers
  cover interaction rules without a browser harness; contract-level assertions
  are robust to random selection picking any valid pool question.
- **Consequence:** The game-session suite runs 58/58 across 5 consecutive runs
  (previously flaked intermittently). No selection algorithm, randomness,
  matching behavior, production scoring, or security check was changed — the fix
  is strictly test-side.

## D-060 – Sorting is classification; partial credit = correct assignments ÷ items; submissions must be complete assignments

- **Status:** DECIDED (2026-08-13, Task 4.7)
- **Decision:** (1) Sorting groups items into categories; item **position is
  irrelevant**, so the submitted response is
  `{ assignments: [{ itemId, categoryId }] }` and scoring compares assignments
  (not order). (2) Partial credit is the fraction of correctly assigned items
  (D-047). (3) A submission missing any item's assignment is rejected
  (`ACTIVITY_ANSWER_INVALID`), and an item assigned more than once is rejected,
  so a truncated/duplicated response can never inflate the partial-credit
  denominator (honesty principle, mirrors D-055).
- **Why:** A "correct" answer in sorting is a full, unambiguous mapping of every
  item; scoring anything else would leak classification expectations and reward
  incomplete work.
- **Consequence:** The plugin's `validateAssignments` also ports the catalog
  rule `sorting.assignments-cover-items` server-side (authoring-integrity
  guard); the controller's `isComplete` gate blocks submit until every item is
  placed.

## D-061 – Sorting render shuffles items only; categories keep authored order

- **Status:** DECIDED (2026-08-13, Task 4.7)
- **Decision:** When `payload.shuffle` is true, the renderer shuffles the item
  card display order; category targets are rendered in authored order.
- **Why:** The Task 3.2 `shuffle` flag specifies a target but not *what*; items
  are the answer elements, so shuffling them defeats position-copying. Category
  order adds no learning value and shuffling could confuse the group-then-scan
  reading pattern.
- **Consequence:** No schema change needed if a future requirement wants
  category shuffling — the renderer can read the same flag.

## D-062 – Fill & Complete correct-answer schema: the `answers` (text) group is optional

- **Status:** DECIDED (2026-08-14, Task 4.8)
- **Decision:** In
  `schemas/activities/fill-complete/correct-answer.schema.json`, `answers` is
  no longer required. The array keeps `minItems: 1` when present. Per-blank
  coverage and group/type matching are enforced by the engine's
  `validateBlankAnswers` (port of catalog rule `fill-complete.blanks-referenced`).
- **Why:** The Task 3.2 correct-answer contract has three parallel groups
  (`answers`/`numeric`/`expression`), and `validate.py`'s pair checks already
  validate number-only and expression-only documents. The schema's `required:
  ["answers"]` contradicted that design, so a valid number-only correct answer
  was rejected by the engine's AJV layer at runtime. This is a genuine
  contract-inconsistency fix (approved before applying), not a
  "make-the-implementation-pass" change.
- **Consequence:** Number-only and expression-only fill-complete questions are
  now valid end-to-end (validated by plugin tests and the validator, which
  stays 24/72/12/12). Authoring must still give every blank exactly one answer
  entry in the matching group.

## D-063 – Fill & Complete scoring is exact-response; normalization is never fuzzy

- **Status:** DECIDED (2026-08-14, Task 4.8)
- **Decision:** Partial credit = correct blanks ÷ total blanks. Text answers
  are trimmed and case-folded (both sides); numeric answers are parsed to a
  finite number and compared via value/tolerance or the (min, max) range —
  never string equality; expression answers are whitespace-normalized only (no
  case-fold, no arithmetic/symbolic equivalence).
- **Why:** The Task 3.2 contract explicitly forbids vague fuzzy matching
  ("explicit tolerance, no vague fuzzy matching"). True expression equivalence
  (e.g. `50` ≡ `150/3`) would require a server-side symbolic engine — agreed to
  defer.
- **Consequence:** An expression blank's accepted form must be typed as
  authored (whitespace-collapsed); arithmetic variants are marked incorrect.
  Recorded as a known limitation in the task report and as future work.

## D-064 – A fill-complete submission must answer every blank exactly once

- **Status:** DECIDED (2026-08-14, Task 4.8)
- **Decision:** `validateAnswer` rejects responses that are missing a blank,
  duplicate a blank, reference an unknown blank, or give a type-incompatible
  value — all `ACTIVITY_ANSWER_INVALID`. The controller's `isComplete` gate
  blocks submit until every blank is answered.
- **Why:** A truncated response must never inflate the partial-credit
  denominator (honesty principle, mirrors D-055). Every blank is a scored unit;
  the numerator (correct counts) and denominator (total counts) must both come
  from the same full blank set.
- **Consequence:** `buildResponse` serializes exactly one `{ blankId, value }`
  per blank, in payload order, so the renderer and the server always agree on
  the covered set.

## D-065 – Image Interaction interactions are normalized to 0–100, not screen pixels

- **Status:** DECIDED (2026-08-14, Task 4.9)
- **Decision:** The image-interaction plugin converts pointer positions to
  normalized coordinates (0–100, in the image's aspect space) before hit
  testing, and the server validates taps as numbers in [0, 100]. Circle hit
  tests scale y by height ÷ width to preserve the image aspect ratio (a circle
  is an ellipse in non-square images); rect hits use half-width/half-height.
- **Why:** A client-reported coordinate in CSS pixels is meaningless to a server
  that sees only the question payload (which holds normalized hotspot
  geometry). Normalizing at the boundary keeps the submitted response
  device-independent, deterministic, and forge-resistant (D-059 style), and
  makes the evidence comparable across viewport sizes.
- **Consequence:** A tap whose normalized point does not land on an existing
  hotspot (or is outside the closed range) is rejected as invalid, so a client
  cannot plant coordinates "between the lines". The shared `hitTestPoint` is
  used by both the renderer (live selection feedback + submit gate) and the
  server (validation).

## D-066 – Image Interaction is exact-response: taps hit required hotspots; placements are correct label→hotspot pairs

- **Status:** DECIDED (2026-08-14, Task 4.9)
- **Decision:** (1) TAP mode: a tap is correct iff it lands on a required
  hotspot; a submission is correct iff the set of tapped-points equals the
  required set (selecting a non-required hotspot never earns credit and never
  inflates the score). (2) LABEL mode: a placement is correct iff
  `labelId → hotspotId` matches the correct placements; partial credit = correct
  placements ÷ labels. (3) `validateImageInteractionAnswer` (port of catalog
  rule `image-interaction.hotspots-exist`) additionally enforces the integrity
  invariants: a tap answer requires a non-empty required-hotspot subset (no
  duplicates, all valid ids), and a label answer places every payload label
  exactly once into an existing hotspot.
- **Why:** The Task 3.2 image-interaction contract is point/placement-based
  (exact-response like fill-complete, not fuzzy). Enforcing completeness keeps
  the partial-credit denominator honest (mirrors D-055/D-064) and prevents a
  forged required-hotspot id or a distractor placement from ever scoring.
- **Consequence:** Tap submissions with a partial required set score fractionally
  (e.g. 1 of 3 → 1/3); off-target taps and malformed placements are rejected as
  invalid before scoring. Submit gating in the renderer is completeness-based
  (`isComplete`), never correctness-based.

## D-067 – The dev-server HTTP bridge must await Hono's synchronous `app.request`

- **Status:** DECIDED (2026-08-14, Task 4.9; fixes a pre-existing Task 4.4 bug)
- **Decision:** `dev-server.js`'s request handler previously chained
  `app.request(...).then(...)`. Hono 4.13.1 returns a plain `Response`
  (synchronously), not a Promise, so every API request crashed with
  `TypeError: app.request(...).then is not a function`. The bridge now awaits
  `app.request()` inside a try/catch async IIFE and maps errors to a
  `GAME_INTERNAL` JSON response.
- **Why:** The demo API server is the browser's data source for the Game Session
  flow; a bridge that crashes on the first request made the entire demo
  inoperable over HTTP (only in-process service tests exercised the API until
  now).
- **Consequence:** The demo API now serves real sessions over a real socket
  (verified by the real-HTTP smoke test in the task report, §15), and the
  bridge stays dependency-version tolerant (await works for both Response and
  Promise returns).

## D-068 – Pattern fill-missing hides `sequence[missingAt]`; the schema-literal reading governs

- **Status:** DECIDED (2026-08-14, Task 4.10)
- **Decision:** In pattern's `fill-missing` mode the hidden element is
  `sequence[missingAt]` — the student supplies the value that belongs at that
  slot. The Task 3.2 example pair `valid-payload-grade9-11.json` +
  `partial-credit.json` is internally inconsistent under this reading: the
  payload `[1, 4, 9]` with `missingAt: 2` hides the third element (9, square
  numbers), but the authored answer is `16` — the NEXT term after the hidden
  slot. This task implements the schema-literal semantics and documents the
  fixture caveat instead of changing the schema; the demo and tests use a
  self-consistent answer (`9`) for that payload.
- **Why:** The schema defines `missingAt` as "Index of the hidden element",
  so the hidden value is by definition `sequence[missingAt]`. Treating the
  answer as a separate "what continues the sequence after the hidden slot"
  question would silently change the meaning of the contract and the authored
  payload (and no schema change is permitted in this task without escalation).
- **Consequence:** The engine scores the authored numeric answer as authored
  (a question whose answer is `16` scores `16`, whatever the hidden slot is).
  Authoring is responsible for self-consistent answers; the demo/PA-series use
  the self-consistent value. The fixture caveat is recorded in the report.

## D-069 – Pattern is exact-response with multiple valid solutions: `acceptableIds` is a set

- **Status:** DECIDED (2026-08-14, Task 4.10)
- **Decision:** (1) A submitted candidate is correct iff its id is in
  `correctAnswer.acceptableIds` — the set is the full credit definition, so
  ANY acceptable candidate earns full credit for its position(s); there is no
  fuzzy matching and no inferred alternative rule. (2) Pattern is
  exact-response per unit: answer units = `constructCount` for construct-next,
  else 1; `correct` = all units correct; partial credit = correct units ÷
  required units, reported as facts to the Central Scoring Service (D-041).
  (3) The typed path resolves a submitted value to the candidate(s) that
  display it (numeric compare / text compare) and is rejected when it matches
  none or more than one — no silent coercion.
- **Why:** The Task 3.2 pattern contract explicitly allows several acceptable
  candidates per answer; treating a wrong-but-valid construction candidate as
  fully wrong would contradict the authored acceptable set. Exact per-unit
  scoring keeps the partial-credit denominator honest (mirrors D-055/D-064/
  D-066).
- **Consequence:** A multi-unit construct-next with `acceptableIds: [c1, c2]`
  scores `[c1, c2]` and `[c2, c1]` as fully correct; `[c1, x]` scores 0.5.
  `validatePatternAnswer` enforces that full credit is attainable
  (acceptable count ≥ constructCount) and that numeric/text answers cannot
  serve multi-element construction.

## D-070 – Pattern submissions are strictly one response path; forged/unexpected fields are rejected

- **Status:** DECIDED (2026-08-14, Task 4.10)
- **Decision:** The pattern submission is EITHER `{ selected: [candidateIds] }`
  (candidate path) OR `{ value }` (typed path). A response that has both,
  has neither, contains unexpected top-level fields, non-string/duplicate
  candidate ids, or non-finite numbers is rejected with
  `ACTIVITY_ANSWER_INVALID` — it is never coerced or partially ignored.
- **Why:** The two paths are mutually exclusive by design (selecting clears the
  typed value and vice-versa), and a malformed or forged response must never be
  silently repaired into a valid one (D-063 exactness). This is deliberately
  stricter than the earlier image-interaction plugin (which ignores extra
  fields); the pattern contract's two competing keys make ambiguity dangerous
  (a client could send both and have the server pick one).
- **Consequence:** Client bugs and forgeries surface as clean invalid-answer
  errors through the service (PA8), and the single path keeps `detail.submitted`
  evidence unambiguous.

## D-071 – Memory deck sizes come from the schema's deckType description; maxAttempts is a re-reveal budget

- **Status:** DECIDED (2026-08-14, Task 4.11)
- **Decision:** Two readings of the Task 3.2 memory contract that the schema
  leaves implicit are fixed explicitly:
  1. **Group sizes** follow the payload schema's own `deckType` description:
     `pairs` = groups of exactly 2; `sets` = groups of 3–4. The schema's
     4..12 card bound is independent of whether a deck can be partitioned into
     valid groups, so the deck-size invariants (pairs decks hold an even number
     of cards; sets decks hold ≥ 6, since 4–5 cannot form ≥2 groups of 3–4)
     are enforced as authoring-time semantic rules (`memory.deck-size-consistent`)
     and by the server validator (`memory.group-size-matches-deck`) — no schema
     edit.
  2. **`maxAttempts`** (1..5, schema description "optional recall-attempt
     limit") is implemented as a **re-reveal budget**: the number of times the
     student may return to the memorize phase via "Study again"
     (`revealsUsed`, `null` = unlimited). Submission attempts remain tracked by
     the server's `interactionMetrics.attemptsUsed` as in every other plugin.
- **Why:** The schema's `deckType` description is the only authoritative
  statement of group sizes (the correct-answer schema alone cannot fix them —
  its 2..4 cardIds bound is broader than "exactly 2"). And "recall-attempt
  limit" naturally maps to how many times the memorized recall may be
  re-attempted, matching the two-phase interaction (the first reveal counts as
  one).
- **Consequence:** Memory scoring is exact and honest — the server rejects any
  submission whose group sizes contradict the deck type, so a truncated or
  inflated response can never skew the partial-credit denominator. The demo and
  tests use these readings (ME-series, memory.test.js); no schema change was
  made or needed.

## D-072 – Scenario schema-key alias: schema `scenario` ↔ engine type `scenario-challenge`

- **Status:** DECIDED (2026-08-14, Task 4.12)
- **Decision:** The Task 3.2 scenario schemas live under
  `schemas/activities/scenario/` and use the schema-level type name `scenario`,
  while the engine activity type (the catalog slug) is `scenario-challenge`
  (activityTypeId 9). The engine's schema registry must resolve a plugin's
  schemas by its type string, so `PAYLOAD_SCHEMAS` and `CORRECT_ANSWER_SCHEMAS`
  now expose the scenario schemas under BOTH keys (`scenario` and
  `scenario-challenge`). The `scenario` key is retained for `schemas/validate.py`
  and schema-level tooling; the engine resolves `scenario-challenge`.
- **Why:** Unlike the previous eight plugins, whose schema directory name and
  activity-type slug coincide, the scenario contract's catalog slug and its
  schema directory/type name differ. Aliasing in the engine registry keeps the
  schema files authoritative and untouched (no duplicated/edited contracts) and
  requires no renaming of either surface.
- **Consequence:** The scenario schemas resolve for the engine and for the
  validator simultaneously; a `validatePayload`/`validateAnswer` call for a
  `scenario-challenge` activity no longer throws `SCHEMA_NOT_FOUND`. No schema
  file was modified.

## D-073 – Scenario-challenge reveal boundary: the branch tree is public, the optimal path is the answer

- **Status:** DECIDED (2026-08-14, Task 4.12)
- **Decision:** A scenario-challenge is a **progressive, consequence-driven
  decision walk, not a one-screen multiple-choice pick.** The render descriptor
  carries the full PUBLIC tree (mission, every decision, every option, and the
  public navigation data `nextDecision` + `outcomeText`) because a student must
  see the branches to choose; the renderer shows only the current decision's
  2–4 options and advances via the chosen option's consequence, so the tree is
  revealed as the walk proceeds. `nextDecision`/`outcomeText` are navigation
  data, NOT the answer — knowing the tree's shape reveals nothing about which
  path is optimal. The hidden answer is `optimalPath` + `acceptableOptions`
  (server-only), scored per step as optimal-or-acceptable. The submission is
  `{ path: [{ decisionId, optionId }] }`, mirroring the optimalPath step shape,
  and the server re-validates every transition (entry, references, continuity,
  terminal end, no double-back) so a forged jump or infinite loop can never
  inflate credit.
- **Why:** A scenario's educational value is the consequence of each branch,
  so the branches themselves must be student-visible; hiding them would make
  the activity a multiple-choice quiz and violate the design. The answer model
  is therefore the choice sequence, and the security boundary is drawn between
  public tree (payload) and hidden path (correct-answer document) — the same
  D-021/D-041 boundary as every other plugin, applied to a graph instead of a
  flat answer shape.
- **Consequence:** `render` never reads `correctAnswer.*`; `validateScenarioAnswer`
  rejects author-inconsistent trees (`optimal-path-missing`,
  `optimal-path-traversable`, `acceptable-options-exist`); the bundle probe
  confirms the correct-answer schema `$id` and `acceptableOptions` are absent
  from the client bundle. Partial credit = correct steps ÷ submitted path
  length, decided only by the authored answer model (D-069/D-041).

## D-074 – Number/logic numeric model: percent/fraction/sequence are exact, authored-number semantics

- **Status:** DECIDED (2026-08-14, Task 4.13)
- **Decision:** Number / Logic Challenge scoring is **exact and
  author-decided**, never fuzzy:
  - **Percent** — `parsePercentValue` strips ONE optional trailing `%` (plus
    surrounding whitespace); the authored `value` IS the percentage number, so
    `50`, `50%`, and ` 50 % ` all match `value: 50`. The `%` is a student-facing
    suffix, not part of the numeric value.
  - **Fraction** — `parseFractionString("a/b")` requires two integer parts,
    reduced to lowest terms by integer GCD with the denominator sign normalized
    positive. `6/8` == `3/4` (and `30/40`, `-3/-4`); `3/-4`, `0.75`, `3`,
    `3/0` are rejected (not scored). Non-integer components are author bugs
    (`fraction-integer-components`).
  - **Sequence** — element-wise comparison against `values[]` with `tolerance`
    (default 0); a wrong element count is rejected, one unit per element.
  - **Accepted-set (expression)** — `normalizeExpression` (trim + collapse
    internal whitespace) then exact string match against the authored
    `accepted[]` forms; **NO eval, no closeness, no inferred alternatives**.
    Internal spacing is significant (`x ^ 2` ≠ `x^2`).
- **Why:** Every prior plugin decided correctness only by the authored answer
  model (D-041, D-069). Percent-as-authored-number and lowest-term fractions
  are the least-surprise conventions for school-level numeric work; sequence
  element-wise matching preserves per-element partial credit (D-047); accepted-
  set exact matching keeps "multiple valid answers" EXPLICIT and prevents any
  hidden eval surface.
- **Consequence:** `validateNumberLogicAnswer` enforces `answer-format-
  compatible`, `tolerance-valid`, `range-ordered`, `fraction-integer-
  components`, `accepted-nonblank`, `sequence-values-valid`, and
  `numeric-fields-finite` so the server never scores against an author-broken
  document. Response `{ value }` is strict `===` for exact, `|n − value| ≤
  tolerance` for tolerance, and `min ≤ n ≤ max` (inclusive) for range.

## D-075 – Number/logic multi-part answers: the per-part specs are the only scoring surface

- **Status:** DECIDED (2026-08-14, Task 4.13)
- **Decision:** For a multi-step number-logic challenge (`payload.parts[]`),
  the correct-answer document's **`parts[]` entries are the only scoring
  surface** — the top-level `type`/`value`/`tolerance`/etc. fields on the same
  document are IGNORED for scoring. Every part is evaluated independently with
  its own type (integer, fraction, sequence, …); the response must be
  `{ parts: [{ partId, value }] }` with every payload part answered exactly
  once (unknown/missing/duplicate `partId` rejected, `ACTIVITY_ANSWER_INVALID`).
  The response shape must also match the answer type: `{ values }` for
  `sequence` answers, `{ value }` otherwise — a mismatch is rejected, never
  coerced. Partial credit = correct units ÷ required units across all parts
  (a sequence part contributes one unit per element).
- **Why:** The Task 3.2 `partial-credit.json` fixture carries BOTH a top-level
  answer and per-part answers; treating the top-level as authoritative would
  make per-part credit impossible, while treating it as a second scoring
  surface would double-count. The parts-only rule keeps the fixture valid and
  the scoring unambiguous.
- **Consequence:** `validateNumberLogicAnswer` enforces `parts-match`
  (multi-part payload ⟺ per-part answer, answer part ids exactly the payload
  part ids) — the semantic port of the validate.py `number-logic.parts-match`
  pair rule. `validateAnswer` rejects a single-value response to a multi-part
  challenge and vice versa.
