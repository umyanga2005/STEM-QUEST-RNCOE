# STEM QUEST – The Educational Treasure Hunt

A responsive, mobile-first, web-based educational gaming platform that teaches
STEM (Science, Technology, Engineering, Mathematics) to Grade 6–11 students
through interactive activities — not traditional MCQ quizzes.

## Project status

**Stages 0–4 partially complete.** The app is scaffolded and buildable with
all ten production activity plugins shipping end-to-end. The Activity Engine,
Game Engine, Game Session service, schema contracts, and the database schema
are designed and implemented in controlled stages (see `reports/`). Current
integration: **Drag & Drop, Matching, Ordering, Sorting, Fill/Complete,
Image Interaction, Pattern, Memory, Scenario Challenge, and Number / Logic
Challenge** activity plugins, server-owned correctness + central scoring, and
a session flow that follows a student through 3 randomly selected questions
to a 0–300 score.

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
npm run api      # local demo API on :4100 (Vite dev proxy forwards /api)
```

Tests & schema validation:

```bash
npm test                       # Node test runner (785 tests)
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

## Key features (planned)

- Student registration: initials, name, school, grade (+ optional photo)
- Admin panel (Supabase Auth; no secrets in frontend env vars)
- Live exhibition leaderboards (Top 10 per stream, privacy-conscious display)
- Badges and certificates
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
├── features/     # feature modules: student, admin, game, leaderboard (future)
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
- `03-decisions.md` – architectural & technical decisions (D-001…D-075)
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

**`DEVELOPMENT_RULES.md`** at the root contains the project rules that must
always be followed.

## Configuration

Copy `.env.example` to `.env` and fill in values once Supabase is provisioned.
Real secrets must never be committed; `.env` is git-ignored.
