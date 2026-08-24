# STEM QUEST – The Educational Treasure Hunt

A responsive, mobile-first, web-based educational gaming platform that teaches
STEM (Science, Technology, Engineering, Mathematics) to Grade 6–11 students
through interactive activities — not traditional MCQ quizzes.

## Project status

**Stages 0–5 partially complete.** The app is scaffolded and buildable with
all ten production activity plugins shipping end-to-end. The Activity Engine,
Game Engine, Game Session service, schema contracts, the database schema, and
the student registration + lightweight session foundation are designed and
implemented in controlled stages (see `reports/`). Current integration:
**Drag & Drop, Matching, Ordering, Sorting, Fill/Complete,
Image Interaction, Pattern, Memory, Scenario Challenge, and Number / Logic
Challenge** activity plugins, server-owned correctness + central scoring, a
session flow that follows a student through 3 randomly selected questions to a
0–300 score, and **student registration** (initials, name, school, grade +
optional photo) with a lightweight opaque-token session, plus the **stream &
level selection UI** (Choose your stream → Choose a level → Begin mission),
the **production Supabase integration** (one service-role client wires the
student + game + mission flow to the real linked Supabase project via
`.env`), the **progression backend + profile/progress dashboard**, the
**live stream leaderboards**, and **badges & certificates** (stream
completion awards a badge and issues a certificate with an on-demand,
dependency-free PDF and public code verification).

## Quick start

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

Run the demo API (correct answers stay server-side):

```bash
npm run api            # local demo API on :4100 (Vite dev proxy forwards /api)
npm run api:production # production API on :4101 backed by the real Supabase
                       # project (needs .env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
npm run smoke:production # live end-to-end smoke against real Supabase (69 checks)
```

Tests & schema validation:

```bash
npm test                       # Node test runner (1056 tests)
python3 schemas/validate.py    # JSON Schema meta/example/semantic validation
```

## Streams & levels

- **4 streams:** Science, Technology, Engineering, Mathematics
- **5 levels per stream:** Beginner, Easy, Intermediate, Advanced, Hard
- **≥100 questions per level** (2,000 questions minimum in total)

## Game rule

A level contains 100 questions. When a student starts a level, the system
randomly selects exactly **3 questions** for that game session. The student
completes those 3 interactive activities and receives a score.

## Key features (built so far)

- **Activity Engine** — plugin contract (7 methods), client/server facades,
  schema + semantic validation, custom errors
- **Drag & Drop plugin** — pointer/touch/keyboard renderer, semantic rules,
  partial credit
- **Matching plugin** — pure interaction controller, shared-target +
  distractor support, merged decoy pool, partial credit
- **Ordering plugin** — anchored-sequence interaction, pure controller,
  partial credit
- **Sorting plugin** — tap-group classification, pure controller, partial
  credit
- **Fill/Complete plugin** — per-type native inputs, exact-response
  normalization, partial credit
- **Image Interaction plugin** — normalized 0–100 hit testing, tap + label
  modes, exact-response scoring
- **Pattern plugin** — sequence reasoning (construct-next / fill-missing /
  complete-sequence), candidate bank + native entry, explicit multiple valid
  solutions, partial credit
- **Memory plugin** — two-phase memorize/recall, reveal budget, unordered-set
  exact scoring, partial credit
- **Scenario Challenge plugin** — progressive consequence-driven decision
  walk (not an MCQ), per-step optimal-or-acceptable scoring, partial credit
- **Number / Logic Challenge plugin** — constructed entry (not MCQ): six
  answer formats × seven correct-answer types under one exact correctness
  model (percent-as-authored-number, lowest-term fractions, element-wise
  sequences, explicit accepted-set, no eval), multi-step per-part credit,
  partial credit
- **Game Engine** — seeded 3-of-100 selection (strict diversity), session
  lifecycle state machine
- **Game Session service** — start → safe descriptor → submit (validate →
  score) → finish (0–300), fully server-authoritative
- **Student registration & session foundation** — students are normal
  application records (never Supabase Auth users); strict-field registration
  (initials, name, school, grade 6–11, Unicode-safe); CSPRNG session tokens
  stored as SHA-256 hashes; real `/student/register` page; Hono
  `POST /api/student/register`, `GET /api/student/me`,
  `PUT /api/student/me/avatar`; optional profile photo via the private
  `student-avatars` bucket (≤ 200 KB, jpeg/png/webp, backend-only); TanStack
  Query `/me`; minimal session-scoped token storage
- **Stream & level selection UI** — real `/student/mission` page; choose one
  of the four STEM streams then one of the five levels, then begin a mission;
  exactly the four approved streams × five levels (D-039); pure access
  resolver mirrors the server unlock rule (level 1 open; active special-access
  grants unlock levels 2–5, and completing level N unlocks level N+1 via the
  backend progression); progression status shown (completed / in
  progress / new); grade never gates a level; Hono
  `GET /api/student/mission/streams` + `GET /api/student/mission/streams/:id/levels`;
  expired-session guard redirects to `/student/register`; Begin Mission hands
  `{ streamId, levelId }` to `/student/game`
- **Student game UI (session screen)** — real `/student/game`; runs a 3-question
  session over the authoritative `GameSessionService`; token-authenticated
  `POST /api/student/game/session` (start/resume), `GET .../session/:id/current`,
  `POST .../rounds/:roundId/submit`, `POST .../finish` (student id derived from
  the token, never the client); HUD (progress, running score, display-only
  timer), round-result and session-complete panels, refresh recovery via a
  session-scoped choice, navigation guard for active missions; all ten activity
  types render through one boundary
- **Student progression backend** — `ProgressionService` is the single
  authority for level unlocking (D-076): every session start re-checks the
  rule server-side (level 1 open; level N needs level N−1 completed for the
  same stream or an active special-access grant), and `POST .../finish`
  writes the deferred `student_progress` + `student_level_progress` rows
  (UPSERTs on the unique keys; best-score max, attempts, first-completion
  timestamp preserved). Re-finishing is idempotent. Special access opens play
  but never fabricates a completion. The Mission UI mirrors the rule so a
  progression-unlocked level renders `available`.
- **Student profile + progress dashboard** — real `/student/profile` page;
  edit the four editable fields (initials, name, school, grade) with identity
  derived from the session token and the raw body gated by the exact
  registration validator (foreign fields like `score`/`studentId` →
  `400 STUDENT_UNEXPECTED_FIELD`); safe server-derived progress overview
  (`GET /api/student/me/progress`) with per-stream cards (level pips,
  completion, best score, next level) and overall statistics, exposing
  nothing beyond the approved level surface.

- **Live stream leaderboards** — public `/leaderboards` page with four
  stream Top-10 boards (score DESC, completion-time ASC nulls-last,
  achieved-at ASC; strictly-better upsert per D-010/D-029 — lower replays
  never overwrite); `GET /api/student/leaderboards(/`:streamId)` exposing
  only `{ rank, displayName, score, self }` + stream identity (a Bearer
  token only enables the self highlight, never private fields); live updates
  via the single approved browser Supabase Realtime channel (D-080) that
  degrades to "Live updates off" until `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are configured. Leaderboard writes are
  best-effort from `finishSession` and never break a completed game.
- **Badges & certificates** — backend-authoritative achievements
  (`src/features/achievements/`): completing a stream awards its badge and
  issues a certificate through the single `awardForCompletion` hook in
  `finishSession`, gated on the trusted `student_progress.stream_completed`
  read (idempotent, best-effort — never breaks a completed game). Real
  `/student/achievements` page shows the 4-badge catalogue with awarded
  state, the student's certificates, and one-tap **Download PDF**: the PDF is
  a hand-rolled minimal generator (D-081, zero dependencies) produced on
  demand and never stored. Every certificate carries a unique public code
  (`SQ-XXXXXX-XXXXXX`) verifiable at `GET /api/certificates/verify/:code`
  (safe surface only — no private fields), and revocation makes the PDF 410
  and verification `valid:false`.

## Key features (planned)

- Admin panel (Supabase Auth; no secrets in frontend env vars)
- Fully responsive: phones, tablets, laptops, exhibition displays

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React (Vite) + React Router v7, Zustand, TanStack Query, Tailwind CSS v4, Motion |
| Backend | Node.js / API architecture |
| Database | Supabase PostgreSQL (Free Tier) |
| Auth (Admin) | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |

## Repository layout

```
src/
├── components/   # shared UI primitives (future)
├── features/     # feature modules: student (live), leaderboard (live), achievements (live), admin (future)
├── hooks/        # reusable React hooks (future)
├── lib/          # utilities & clients (query-client ready)
├── pages/        # route-level pages (placeholders wired)
├── stores/       # Zustand stores (ephemeral UI store ready)
└── assets/       # static assets
```

## Documentation

All project documentation lives in `reports/` — start with
`reports/README.md`.

- `00-project-overview.md` – vision, scope, game rules, constraints
- `01-initial-architecture.md` – initial architecture (DRAFT)
- `02-development-log.md` – chronological log of development actions
- `03-decisions.md` – architectural & technical decisions (D-001…D-081)
- `04-todo.md` – completed and pending tasks
- `05-activity-engine-design.md` – Activity Engine design (10 types, plugin contract)
- `06-database-architecture.md` – Supabase PostgreSQL schema design
- `07-task-3.1-content-model.md` – 2,000-question content model
- `08-task-3.2-schemas.md` – JSON Schema contracts + validator
- `09-task-4.1-activity-engine-core.md` – Activity Engine core
- `10-task-4.2-drag-drop.md` – Drag & Drop plugin
- `11-task-4.3-game-engine-core.md` – Game Engine core
- `12-task-4.5-matching.md` – Matching plugin
- `13-task-4.6-ordering.md` – Ordering plugin
- `14-task-4.7-sorting.md` – Sorting plugin
- `15-task-4.8-fill-complete.md` – Fill/Complete plugin
- `16-task-4.9-image-interaction.md` – Image Interaction plugin
- `17-task-4.10-pattern.md` – Pattern plugin
- `18-task-4.11-memory.md` – Memory plugin
- `19-task-4.12-scenario-challenge.md` – Scenario Challenge plugin
- `20-task-4.13-number-logic.md` – Number / Logic Challenge plugin
- `21-task-1.10-frontend-libraries.md` – Frontend libraries installed & verified
- `22-task-5.1-student-registration.md` – Student registration & lightweight session foundation
- `23-task-5.2-stream-level-selection.md` – Stream & level selection UI
- `24-task-5.3-student-game-ui.md` – Student game UI (session screen)
- `25-task-5.4-production-supabase-integration.md` – Production Supabase integration
- `26-task-5.5-student-progression.md` – Student progression backend + level unlock persistence
- `27-task-5.6-student-profile-progress.md` – Student profile + progress dashboard
- `28-task-5.7-live-leaderboard.md` – Live stream leaderboard
- `29-task-5.8-badges-certificates.md` – Badges & certificates
- `30-task-5.9-admin-panel-foundation.md` – Admin panel foundation + Supabase Auth

**`DEVELOPMENT_RULES.md`** at the root contains the project rules that must
always be followed.

## Configuration

Copy `.env.example` to `.env` and fill in values once Supabase is provisioned.
Real secrets must never be committed; `.env` is git-ignored.
