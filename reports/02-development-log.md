# 02 – Development Log

Chronological, technical record of every significant development action.
Format per entry:

```
## YYYY-MM-DD
**Stage:** ...
**Action:** ...
**Files created:** ...
**Files modified:** ...
**Packages installed:** ...
**Configuration changes:** ...
**Commands executed:** ...
**Result:** ...
**Warnings / errors:** ...
**Next recommended action:** ...
```

---

## 2026-08-11 (Task 3.1 — COMPLETED)

**Stage:** Stage 3 – Question content model & authoring architecture
(documentation only).

**Action:** Designed and documented the complete content architecture for the
2,000-question bank (4 streams × 5 levels × 100). No questions were created,
no database tables modified, no migrations written, no code/UI/plugins built,
no AI APIs called. Supabase state unchanged.

**Files created:**
- `reports/07-task-3.1-content-model.md` — the dedicated Task 3.1 report
  (850 lines, 20 sections + lifecycle): executive summary; content model
  (relational vs payload vs correct_answer vs future `meta`); lifecycle with
  snapshot-safe editing + versioning; STEM taxonomy (controlled vocab);
  grade 6–11 mapping (level ≠ grade); difficulty framework (12 dimensions +
  in-level distribution); activity distributions for all 4 streams × 5 levels
  (all rows sum to 100); the 20 × 100-question blueprints (activity, topic,
  grade-band, difficulty distributions per combination); quality checklist
  Q1–Q16; anti-duplication strategy (content hash, template/scenario ids,
  near-dup detection, media reuse); hints, feedback, media, timer, scoring
  models (architecture unchanged); authoring workflow; Admin Question Builder
  requirements; JSON-Lines bulk-import pipeline; AI-assisted generation
  policy; analytics-ready metadata; 9 open decisions (OD-1…OD-9).

**Files modified:**
- `reports/02-development-log.md` — this entry.
- `reports/03-decisions.md` — D-043 (content model split + future `meta`),
  D-044 (lifecycle + snapshot-safe versioning), D-045 (level tier vs in-level
  difficulty; level ≠ grade).
- `reports/04-todo.md` — Task 3.1 marked DONE. No later task marked DONE.

**Packages installed:** NONE.

**Configuration changes:** NONE. No Supabase resources, schema, or Storage
touched (verified against Task 2.11/2.12 state).

**Commands executed:**
- Read-only: `reports/00…06`, `DEVELOPMENT_RULES.md`,
  `supabase/migrations/0001…0002` (schema reference; previously read in
  2.11/2.12). No `supabase db` commands ran in this task.

**Result:** Task 3.1 DONE. The content architecture is fully specified so that
2,000+ questions can be authored/imported/managed without redesigning the
database, Activity Engine, or Admin Question Builder. Key outcomes:
- 20 blueprints define exactly what 100 questions each stream/level needs
  (activity + topic + grade + difficulty distributions, all summing to 100).
- Every level keeps ≥ 3 distinct activity types (engine's strict diversity
  pass in D-022) — DD/MT/OR/ST/FC/II/PA/ME/SC/NL allocated educationally.
- All 20 activity distribution rows hand-verified to sum to 100; all topic
  rows sum to 100.

**Warnings / errors:**
- Taxonomies carry `[REVIEW]` markers where curriculum mapping is uncertain
  (`data-ai`, `systems-society`) — teacher/curriculum review required before
  authoring, logged in OD-4.
- The existing `status` column supports 3 values; Review/Approved are modelled
  in `meta.review` + `admin_actions` until an optional future enum extension
  (OD-1).
- `questions.meta` is designed but NOT added as a column yet (OD-2).

**Next recommended action:**
- Wait for review of this specification, then (when approved) Task 3.2:
  define the per-activity-type payload/correct_answer authoring schemas
  (machine-readable) that the Admin Question Builder and the JSON-Lines
  importer will validate against. Do not begin content production or the
  2,000 questions until the schemas and the §6/§7 distributions are approved.

---

## 2026-08-11 (Task 2.12 — COMPLETED)

**Stage:** Stage 2 – Storage configuration (Task 2.12).

**Action:** Created the Supabase Storage configuration for the linked project
(`fmauqixvdpdgrghuapfs`) via a new migration `0003_storage_buckets.sql`.
Inspected first: remote had 0 buckets, 0 storage policies, and no local storage
config (pristine). No existing Storage resources were overwritten or deleted.
The migration was validated non-destructively (transaction + ROLLBACK dry run,
exit 0), then applied with `supabase db push`.

**Files created:**
- `supabase/migrations/0003_storage_buckets.sql` — idempotent, non-destructive.

**Files modified:**
- `reports/02-development-log.md` — this entry.
- `reports/04-todo.md` — Task 2.12 marked DONE.
- `reports/03-decisions.md` — D-042 (Storage security model + bucket naming).

**Packages installed:** NONE.

**Configuration changes:**
- Buckets (PRIVATE, `public=false`, STANDARD type):
  - `student-avatars` — `file_size_limit=204800` (200 KB),
    `allowed_mime_types={image/jpeg,image/png,image/webp}`.
  - `question-media` — `file_size_limit=1048576` (1 MB),
    `allowed_mime_types={image/jpeg,image/png,image/webp}`.
  - `certificates` bucket intentionally NOT created (on-demand PDFs, D-031).
- Policies on `storage.objects` (the only ones; default-deny otherwise):
  - `student_avatars_select_admin` — SELECT to `authenticated` where
    `bucket_id='student-avatars' and public.is_admin()`.
  - `question_media_select_admin` — SELECT to `authenticated` where
    `bucket_id='question-media' and public.is_admin()`.
- Access model: no anon/authenticated INSERT/UPDATE/DELETE policies; all
  writes + signed-URL generation via trusted service role (backend, D-027/
  D-028). Admin uploads through the backend API.

**Upload limits / allowed formats:**
- student-avatars: MAX 200 KB; image/jpeg, image/png, image/webp. Reject SVG,
  executables, arbitrary MIME, oversized. Path: `{student-id}/profile.webp`.
- question-media: MAX 1 MB; image/jpeg, image/png, image/webp.
- Server-side (authoritative) validation documented in D-042: MIME sniff, file
  extension whitelist, size, storage path, authenticated identity, ownership,
  bucket, allowed operation. Client-side validation is UX-only.

**Commands executed:**
- `supabase db query --linked` (pre-inspection): `storage.buckets` empty,
  `pg_policies` storage empty; column/type inspection of `storage.buckets`
  (`type` enum STANDARD/ANALYTICS/VECTOR, defaults confirmed).
- Dry run: migration body executed inside a transaction ending in `rollback;`
  (exit 0); verified afterward 0 buckets / 0 storage policies persisted.
- `supabase db push --yes` → applied `0003_storage_buckets.sql`.
- Post-push verification via `supabase db query --linked`:
  - Buckets: `student-avatars` (204800 B, jpeg/png/webp) and `question-media`
    (1048576 B, jpeg/png/webp), both `public=false`, STANDARD. `certificates`:
    count 0 (does NOT exist).
  - Policies: only the two admin SELECT policies, `to authenticated`.
  - RLS functional tests: `set role anon` → SELECT 0 rows, INSERT blocked
    (`new row violates row-level security policy for table "objects"`); same
    for `set role authenticated` (non-admin).
  - Migration history: 0001, 0002, 0003 recorded.
  - Existing data intact: 4 streams, 8 game_settings, 0 students (no test data).

**Result:** Task 2.12 DONE. Storage buckets, privacy, limits, formats, and
admin-read policies are configured and verified live. No student photos, no
question media, no test personal data uploaded.

**Warnings / errors:**
- The Storage API endpoint-level behaviour (signed URLs, service-role upload,
  admin reads with a real admin JWT) is verified structurally via RLS/DML and
  migration validity; an end-to-end test through the Storage REST API needs
  project anon/service keys + a real admin JWT (not available in this offline
  session) and is deferred to the API/admin-panel stage.
- Naming divergence documented (D-042): task spec uses `student-avatars`;
  architecture §13 says `student-photos`. Task spec is authoritative; docs-only
  tweak recommended.
- `supabase db dump`/`db remote commit` need Docker (not installed); all
  verification used `supabase db query --linked`.

**Free-tier considerations:**
- No public buckets; private + signed-URL reads avoid public egress.
- Bucket-level size/MIME caps prevent oversize/executable uploads server-side.
- Planned compression/resizing at upload (avoids duplicates/originals bloat).
- Expected usage: question media ≈ 500 images × ~200–300 KB ≈ 100–150 MB
  (conservative target < ~300 MB); avatars ≤ 200 KB each, bounded by student
  count with cleanup on deletion. Comfortably within the 1 GB Free-Tier
  Storage allowance.

**Next recommended action:**
- Stage 3 (question content) is NOT started. Next is Task 3.1 (content model
  for 2,000 questions) when explicitly requested; meanwhile the storage
  config is ready and the D-042 note (docs-only §13 tweak) can be folded in.

---

## 2026-08-11 (Task 2.11 — COMPLETED)

**Stage:** Stage 2 – Supabase provisioning + base seed (Task 2.11).

**Action:** Provisioned and migrated the real Supabase project. Supabase CLI
(v2.113.0) was already installed and authenticated by the user. Linked the
existing **STEM Quest Project** (ref `fmauqixvdpdgrghuapfs`, org
`jhztqvjzrofqupynybyz`, region Northeast Asia (Seoul), created 2026-08-11).
User approved: (1) link the existing project (no new project created), and
(2) the proposed badge/game_settings defaults in `0002_seed_base_data.sql` as-is.
Confirmed the remote was pristine before pushing, then applied both migrations.

**Files created:**
- `supabase/.temp/` — CLI link artifacts (project-ref, linked-project.json,
  pooler-url, postgres-version, gotrue-version, storage-version, rest-version).

**Files modified:**
- `reports/02-development-log.md` — this entry.
- `reports/04-todo.md` — Task 2.11 marked DONE.

**Packages installed:** NONE.

**Configuration changes:**
- `supabase link --project-ref fmauqixvdpdgrghuapfs` — project linked (remote
  DB untouched by the link itself). No `.env` created; DB password not needed
  (CLI provisions a temporary login role via the access token).

**Commands executed:**
- `supabase --version` → 2.113.0
- `supabase orgs list` → 1 org: STEM Quest DB (`jhztqvjzrofqupynybyz`)
- `supabase projects list` → 1 project: STEM Quest Project
  (`fmauqixvdpdgrghuapfs`, Northeast Asia/Seoul, created 2026-08-11)
- `supabase link --project-ref fmauqixvdpdgrghuapfs` → linked
- `supabase migration list` → local 0001/0002 present, remote none applied
- `supabase db query --linked` (pre-push verification): 0 tables in `public`;
  `supabase_migrations.schema_migrations` did not exist (pristine project)
- `supabase db push --yes` → applied 0001_initial_schema.sql + 0002_seed_base_data.sql
- Post-push verification via `supabase db query --linked`:
  - 21 BASE TABLE + 1 VIEW (`questions_public`) in `public`
  - RLS enabled on all 21 base tables; 0 tables without RLS
  - Seed counts: 4 streams, 20 levels, 10 activity_types, 4 badges, 8 game_settings
  - `supabase_migrations.schema_migrations`: 0001 + 0002 recorded
  - RLS spot check (`set role anon`): anon sees 4 streams; anon sees 0
    game_settings (admin-only per design)

**Result:** Task 2.11 DONE. The correct STEM QUEST Supabase project is linked
and fully migrated: schema, RLS policies, and base seed data are live. No
questions/students/game data seeded (Stage 3 + later).

**Warnings / errors:**
- None from the migration (exit 0). Minor notes:
  - `supabase db dump`/`db remote commit` require Docker (not available here);
    verification was done instead via `supabase db query --linked`.
  - Multi-statement `supabase db query` calls display only the last result;
    verification queries were run individually.
- No new project was created; the existing "STEM Quest Project" was used.

**Next recommended action:**
- Task 2.12 — Storage buckets + policies + upload validation. Storage remains
  unconfigured (no buckets exist yet on the linked project).

---

## 2026-08-11

**Stage:** Stage 0 – Project initialization (foundation only, no features).

**Action:** Initialized the STEM QUEST project foundation: scaffolded a clean
React app with Vite, defined the initial source structure, created the
`reports/` documentation system, and created the root `README.md`,
`DEVELOPMENT_RULES.md`, and the initial architecture document.

**Files created:**
- `package.json`, `package-lock.json` (generated by `npm create vite`)
- `index.html` (rewritten with project title/meta)
- `.gitignore` (Vite default + `.env` rules)
- `.oxlintrc.json` (Vite/oxlint default)
- `vite.config.js` (added `@` path alias to `src`)
- `.env.example` (Supabase/API placeholder vars, commented out)
- `public/favicon.svg` (kept from scaffold)
- `src/main.jsx`, `src/App.jsx`, `src/App.css`, `src/index.css`
- Folder scaffolding with `.gitkeep` placeholders: `src/components/`,
  `src/features/`, `src/hooks/`, `src/lib/`, `src/pages/`
- `README.md` (root, project-focused rewrite of the Vite default)
- `DEVELOPMENT_RULES.md`
- `reports/README.md`
- `reports/00-project-overview.md`
- `reports/01-initial-architecture.md`
- `reports/02-development-log.md` (this file)
- `reports/03-decisions.md`
- `reports/04-todo.md`

**Files modified:**
- `index.html` – replaced Vite demo title with "STEM QUEST – The Educational
  Treasure Hunt", added meta description, kept favicon.
- `.gitignore` – added `.env`, `.env.*`, `!.env.example` entries so secrets
  can never be committed.
- `src/App.jsx` – removed Vite counter demo; replaced with a minimal STEM
  QUEST placeholder screen.
- `src/App.css`, `src/index.css` – replaced Vite demo styles with a small
  dark/futuristic base palette (CSS custom properties) and a minimal
  placeholder layout. No component library or design system yet.
- `vite.config.js` – added `resolve.alias` `@` → `./src` (standard ESM setup
  using `node:url`).
- Removed unused scaffold demo assets: `src/assets/hero.png`,
  `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`.

**Packages installed:**
- Initial Vite React template dependencies only:
  - `react` `^19.2.8`, `react-dom` `^19.2.8`
  - dev: `vite` `^8.2.0`, `@vitejs/plugin-react` `^6.0.4`,
    `oxlint` `^1.75.0`, `@types/react` `^19.2.17`,
    `@types/react-dom` `^19.2.3`
- No additional packages were installed (deliberately none needed yet).

**Configuration changes:**
- `package.json` name is `stem-quest` (Vite sanitized the folder name
  `STEM QUEST`; folder itself keeps the display name with spaces).
- `vite.config.js` alias `@` added; npm scripts remain the Vite defaults:
  `dev`, `build`, `lint` (oxlint), `preview`.

**Commands executed:**
- `npm create vite@latest . -- --template react` (create-vite 9.1.2)
- `npm install`
- `npm run build` (baseline verification – succeeded)
- `mkdir -p src/components src/features src/hooks src/lib src/pages`
- `touch` `.gitkeep` placeholders in the new src folders
- `rm` of unused demo assets (hero.png, react.svg, vite.svg, icons.svg)

**Result:**
- Clean, buildable React 19 + Vite 8 foundation.
- Baseline `npm run build` passes (dist produced, ~193 kB JS before gzip).
- Documented architecture and reporting system in place.

**Warnings / errors:**
- None. npm reported "found 0 vulnerabilities". npm also printed a notice
  that a newer npm major version (12.0.2) is available – informational only,
  not upgraded.

**Next recommended action:**
- Architecture review to finalize: exact frontend/backend libraries, the
  activity engine contract, scoring formula, student identity model, and
  leaderboard strategy. Then proceed to the database schema design stage.

---

## 2026-08-11 (Stage 1)

**Stage:** Stage 1 – Architecture review (documentation only; no code).

**Action:** Performed the architecture review. Finalized the technology stack,
the student identity model, the Activity Engine design (10 activity types, a
reusable plugin contract), and the 3-of-100 question-selection algorithm.
Rewrote the architecture document to a reviewed baseline and recorded every
decision.

**Files created:**
- `reports/05-activity-engine-design.md` — full interactive activity engine
  design: architecture layers, plugin contract, question data model, detailed
  designs for all 10 activity types (fields A–P), scoring input model, game
  session flow, the 3-of-100 selection algorithm, and the "add a new activity
  type" checklist.

**Files modified:**
- `reports/01-initial-architecture.md` — rewritten to reviewed baseline v1.1:
  technology stack with per-library rationale (fit, performance, mobile,
  free-tier, complexity, necessity), finalized student identity model,
  activity engine / selection algorithm summaries, finalized-decision table,
  and remaining open decisions.
- `reports/03-decisions.md` — D-004 marked RESOLVED (superseded); D-005
  changed from OPEN to DECIDED (students are application records, not Auth
  users); added Stage 1 decisions D-014 (React Router v7), D-015 (Zustand),
  D-016 (TanStack Query), D-017 (Tailwind CSS v4 + tokens), D-018 (Framer
  Motion / motion), D-019 (Hono API), D-020 (Vercel hosting), D-021 (activity
  plugin contract), D-022 (3-of-100 selection), D-023 (scoring formula —
  inputs defined, formula OPEN).
- `reports/04-todo.md` — Stage 1 items updated: 1.1–1.6 DONE; 1.7–1.9 PENDING
  (scoring formula, leaderboard aggregation, certificate generation); new
  task 1.10 (install approved libraries) as the Stage 1 completion gate.
- `reports/README.md` — index updated to include `05-activity-engine-design.md`.
- `DEVELOPMENT_RULES.md` — added explicit rule: students are normal
  application records (not Supabase Auth users); only Admin uses Supabase Auth.

**Packages installed:** NONE. Documentation-only stage by instruction. No
library was installed even though libraries were decided; installation is a
separate, review-approved task (todo 1.10).

**Configuration changes:** NONE (no config files touched).

**Commands executed:** none (documentation only).

**Result:**
- All Stage 1 architecture-review deliverables are in place:
  1. Student identity model finalized.
  2. React routing, client state, server state, styling, animation, API
     framework, and deployment recommendation each evaluated and decided.
  3. Detailed Activity Engine design for all 10 activity types (A–P) in
     `reports/05-activity-engine-design.md`.
  4. Reusable plugin contract defined (activity-agnostic game engine).
  5. 3-of-100 selection algorithm with diversity + controlled randomization.
  6. No database tables, questions, game engine, admin panel, UI screens, or
     feature code created (per instruction).
  7. No packages installed.

**Warnings / errors:**
- None. Remaining OPEN decisions are deliberate (scoring formula D-023,
  leaderboard aggregation D-010, certificate generation D-011, final schema
  D-012). D-020 (Vercel) is decided but flagged to revisit at the budget/
  deployment check.

**Next recommended action:**
- Finalize the remaining OPEN decisions (1.7–1.9): scoring formula, leaderboard
  aggregation, certificate generation. When the user approves the review, run
  task 1.10: install the approved libraries and set up the base frontend
  scaffolding + API skeleton, then proceed to Stage 2 (database schema design).

---

## 2026-08-11 (Stage 2)

**Stage:** Stage 2 – Database architecture (design only; no SQL, no tables,
no migrations, no code).

**Action:** Designed and documented the complete Supabase PostgreSQL schema
(21 tables across all 19 required domains) and resolved the previously-open
leaderboard, certificate, and schema decisions.

**Files created:**
- `reports/06-database-architecture.md` — full database design:
  1. Database overview & conventions
  2. Entity relationship overview (ASCII diagram)
  3. Table list (21 tables)
  4. Detailed table definitions (columns, types, PK/FK, nullability,
     defaults, unique/check constraints, indexes, RLS per table)
  5. Relationships & delete semantics
  6. Constraints summary
  7. Index strategy with rationale for each index (no blind indexes)
  8. JSONB strategy (relational vs JSONB split, size caps)
  9. RLS/security strategy (service role / admin auth.uid / public anon;
     students have no direct Supabase access)
  10. Leaderboard strategy (materialised best-score table + Realtime)
  11. Progress strategy (level detail + stream aggregate, backend-enforced)
  12. Certificate strategy (records + on-demand PDF, not permanent storage)
  13. Storage strategy (buckets, caps, access modes)
  14. Realtime considerations
  15. Free-tier considerations
  16. Data lifecycle / cleanup policy
  17. Example data flow for a full 3-question session

**Files modified:**
- `reports/03-decisions.md` — resolved D-010 (leaderboard aggregation),
  D-011 (certificate generation), updated D-012 (schema design complete, not
  implemented); added Stage 2 decisions D-024…D-038 (BIGINT PKs, single
  `questions` table, JSONB scope, backend-mediated writes, RLS model,
  leaderboard materialisation, scores ledger, certificates, session audit,
  special access, data-driven timers/penalties, game_settings, soft archive +
  retention, data-driven activity types, base_points=100/300 cap).
- `reports/04-todo.md` — Stage 2 items updated: 2.1–2.8 DONE; 2.9 PENDING
  (await human/architect review — the gate before any SQL); 2.10–2.12 PENDING
  (migrations, Supabase provisioning, storage).

**Packages installed:** NONE (design-only stage).

**Configuration changes:** NONE.

**Commands executed:** none.

**Result:**
- Complete, reviewable database design document produced. Schema covers:
  admin/roles + audit, schools, students + login sessions, streams, levels,
  activity types, questions (single reusable content model), game sessions,
  session rounds, student answers, scores, progress (aggregate + level
  detail), special access, badges, student badges, certificates, leaderboard
  entries, game settings.
- Fixed rules encoded as data + constraints: exactly 3 selected questions
  (CHECK cardinality), session max 300 points (0–300 CHECK), grade 6–11,
  level numbers 1–5, data-driven timers/penalties per level (90/75/60/50/45 s
  and 1/2/3/4/5 pts), privacy-safe leaderboard rows (initials + name only),
  backend-only writes for scores/progress/certificates/special access.
- RLS design ensures students cannot modify their own scores, XP, completion,
  leaderboard position, correct answers, question bank, special access, or
  certificates.
- No SQL, no tables, no migrations, no application code — per instruction.

**Warnings / errors:**
- None. Remaining OPEN decision: D-023 (central scoring formula weights) —
  inputs are fixed, the weighting formula stays open for tuning. D-020
  (Vercel) still flagged for budget re-check.

**Next recommended action:**
- Await human/architect review of `06-database-architecture.md`. On approval,
  Stage 2 continues: write SQL migration DDL (2.10), provision the Supabase
  project and apply migrations + RLS policies + base seed data (2.11), and
  configure Storage buckets/policies (2.12). Then Stage 3 (question content
  model) and the approved library install (todo 1.10).

---

## 2026-08-11 (Stage 2 correction pass)

**Stage:** Stage 2 – Database architecture correction pass (documentation only;
**no SQL, no tables, no migrations, no packages**).

**Action:** Applied the approved correction pass to the database design
documentation. Finalized the scoring formula, added stream/level referential
integrity, and documented API-level student login security requirements.

**Files modified:**
- `reports/03-decisions.md` — D-023 changed **OPEN → DECIDED**: final
  server-authoritative formula (`Question = Base 100 − Hint − Attempt −
  Overtime`, clamp 0–100; `Session = Q1+Q2+Q3`, max 300; overtime 1–5 pt/sec
  and default timers 90/75/60/50/45 s for levels 1–5; question timer override
  allowed). Hint/attempt deduction values marked **configurable game settings**
  rather than leaving the whole formula open. Added **D-039** (stream/level
  composite foreign keys) and **D-040** (student login security requirements).
- `reports/06-database-architecture.md` — status header updated to
  "DESIGN REVIEWED — APPROVED FOR MIGRATION PLANNING" (SQL still NOT written).
  §4.7 `levels`: added `UNIQUE (id, stream_id)` as composite-FK target.
  §4.9/§4.10/§4.13/§4.15/§4.16 (`questions`, `game_sessions`, `scores`,
  `student_level_progress`, `special_access`): documented composite
  `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)`.
  §5/§6: relationships and constraints summary updated (D-039 rationale).
  §9.1: added "Student Login Security Requirements" (rate limiting,
  failed-attempt protection, token expiration, revocation, secure generation,
  hashed storage — requirements only). §17 step 6 now references the final
  formula. Added **§18 Scoring Formula (Final, Server-Authoritative)**.
- `reports/04-todo.md` — 1.7 (scoring formula) marked **DONE**; 2.9 (database
  review gate) marked **DONE — APPROVED / READY FOR MIGRATION**; 2.10
  (SQL migration DDL) remains PENDING.
- `reports/01-initial-architecture.md` — §9 scoring and "Remaining Open
  Decisions" updated so D-023 is no longer described as OPEN (consistency).
- `reports/05-activity-engine-design.md` — §6 scoring-input model and §10 open
  items updated so D-023 is no longer described as OPEN (consistency).

**Packages installed:** NONE.

**Configuration changes:** NONE.

**Commands executed:** none (documentation only).

**Result:**
- Scoring model finalized and recorded as a DECIDED decision with per-level
  timers/penalties, question-level timer override, and 0–100/0–300 bounds.
- Impossible `stream_id`/`level_id` combinations made unrepresentable at the
  data layer via composite FKs on all tables that store the pair
  (`questions`, `game_sessions`, `scores`, `student_level_progress`,
  `special_access`); `session_rounds`/`student_answers` are covered through
  `game_sessions` with no duplicated data.
- Student `login_code` security requirements documented (rate limiting,
  failed-attempt protection, token expiry, revocation, secure generation,
  hashed storage) — not implemented.
- Database design review gate moved to APPROVED / READY FOR MIGRATION. SQL is
  **NOT** written and migrations are **NOT** created.

**Warnings / errors:**
- None. Remaining deliberate open items: exact hint/attempt deduction values
  (now configurable `game_settings`, not OPEN); D-020 (Vercel) budget
  re-check; Stage 3 content model.

**Next recommended action:**
- Task 2.10 — write the SQL migration DDL for the approved schema (including
  the D-039 composite FKs and the D-023/D-034 scoring columns), then 2.11
  (Supabase provisioning + migrations + RLS + seed) and 2.12 (Storage).

---

## 2026-08-11 (Final Activity Engine consistency pass)

**Stage:** Pre-migration final consistency pass (documentation only;
**no SQL, no tables, no migrations, no packages**).

**Action:** Removed the remaining plugin-level final-scoring inconsistency.
`ActivityTypePlugin` no longer has a `scoring(ctx): number` method. Plugins
now validate and report normalized scoring inputs; the Central Scoring Service
computes all final points. Correctness / partial credit is defined explicitly.

**Files modified:**
- `reports/05-activity-engine-design.md` — §2 architecture diagram now shows a
  **Central Scoring Service** layer (server-only) beside the Activity Engine;
  separation-of-concerns updated. §3 plugin contract: removed `scoring(ctx)`,
  added `scoringInputs(ctx, validation): ScoringInputs` and explicit
  `ValidationResult` / `ScoringInputs` interfaces; added a note that the
  plugin never computes final points; round lifecycle and server-authority
  text updated (no `plugin.scoring`). §6 rewritten as "Scoring Input Model &
  Central Scoring": plugin-reported inputs (`correctnessFraction` 0–1,
  attempts, hints, time, bonus flags) plus the central computation
  (`earnedBase = round(basePoints × correctnessFraction)` then deductions,
  clamp 0–100; session max 300) and an explicit fully/partially/incorrect
  representation. §7 session flow updated. §10 open items updated.
- `reports/03-decisions.md` — **D-021** amended: contract list is now
  `render · validatePayload · validateAnswer · scoringInputs · buildHints ·
  feedback · availableOn` (no `scoring`); note added that plugins never
  compute final scores. **D-023** clarified: formula now shows
  `Earned Base = round(Base Points × correctnessFraction)` before deductions
  (all approved ceilings/floor unchanged) plus a correctness/partial-credit
  bullet. Added **D-041** "Scoring boundary: plugins report inputs, central
  service scores".
- `reports/01-initial-architecture.md` — §6 flow ("validate/score" → "validate
  → central scoring"); §7 Activity Engine (plugins report scoring inputs, never
  final scores); §9 Scoring (correctnessFraction + earned base + deductions);
  open-decisions section now cites D-024…D-041.
- `reports/06-database-architecture.md` — §18 formula updated to show
  `Earned Base = round(Base Points × correctnessFraction)`; added a
  "Correctness / partial credit (D-041)" bullet.
- `reports/02-development-log.md` — this entry.
- `reports/04-todo.md` — added task 2.13 recording this pass.

**Packages installed:** NONE.

**Configuration changes:** NONE.

**Commands executed:** none (documentation only).

**Result:**
- Plugin responsibility is now strictly: activity-specific validation
  (`validateAnswer`) + normalization of scoring inputs (`scoringInputs`).
- Central Scoring Service responsibility: all final arithmetic
  (`earnedBase = round(base × correctnessFraction)` minus
  hint/attempt/overtime deductions, clamp 0–100, session sum max 300).
- Correctness / partial credit: plugin reports `correctnessFraction` (0–1);
  fully correct = 1, partial = (0,1), incorrect = 0; earned base scales
  accordingly before deductions.
- D-023's approved rules (base 100, floor 0, clamp 0–100, 3 questions,
  max 300, configurable hint/attempt deductions, data-driven overtime)
  are unchanged.
- Terminology is consistent across `01`, `03`, `05`, `06`, `02`, `04`.

**Warnings / errors:**
- None. Historical log entries that reference the old `scoring` contract are
  preserved as-is (chronological record); current documents are consistent.

**Next recommended action:**
- This was the final architecture consistency check before SQL. Proceed to
  task 2.10 — write SQL migration DDL (D-039 composite FKs, D-023/D-034/D-041
  scoring columns), then 2.11 (Supabase provisioning) and 2.12 (Storage).

---

## 2026-08-11 (Task 2.10)

**Stage:** Stage 2 – SQL migration DDL (Task 2.10).

**Action:** Wrote/validated the Supabase PostgreSQL initial-schema migration for
the approved database architecture (`06-database-architecture.md`). The
migration `supabase/migrations/0001_initial_schema.sql` was already present in
the repository (a prior unlogged draft). I reviewed every table, constraint,
index, and RLS policy against the approved design, corrected one fidelity issue,
and validated it end-to-end against a throwaway local PostgreSQL 18 cluster.
**Supabase was NOT connected to, created, or modified.**

**Files created:** NONE. The migration already existed:
- `supabase/migrations/0001_initial_schema.sql` (635 lines; pre-existing draft,
  retained as the Task 2.10 deliverable).
- `supabase/migrations/` directory pre-existing.

**Files modified:**
- `supabase/migrations/0001_initial_schema.sql` — corrected the approved round
  score constraints to match the architecture exactly:
  `session_rounds.base_points` and `session_rounds.points_earned` changed from
  `CHECK (between 0 and 100)` to the approved `CHECK (>= 0)` (§4.11, §18; the
  0–100 question ceiling is a service-layer clamp per D-023, not a data CHECK).
  Header comment updated to record this decision.
- `reports/02-development-log.md` — this entry.
- `reports/04-todo.md` — Task 2.10 marked DONE (validated).

**Important schema decisions implemented (all from the approved design):**
- 21 tables, `BIGINT GENERATED ALWAYS AS IDENTITY` PKs; `admins.id UUID` →
  `auth.users(id)` (D-024).
- `levels UNIQUE (id, stream_id)` + composite
  `FOREIGN KEY (level_id, stream_id) REFERENCES levels(id, stream_id)` on
  `questions`, `game_sessions`, `scores`, `student_level_progress`,
  `special_access` (D-039) — stream/level mismatch is unrepresentable.
- Grade 6–11, level 1–5, difficulty 1–5, base_points 1–100, scores 0–300,
  `selected_question_ids` `cardinality = 3`, positive timers/penalties, all
  status lists (D-023/D-034/D-038).
- `student_sessions.token_hash` UNIQUE (SHA-256 only, never plaintext), plus
  `expires_at` / `revoked_at` (D-040).
- Leaderboard Top-10 covering index
  `(stream_id, score DESC, completion_time_ms ASC, achieved_at ASC)` + UNIQUE
  `(student_id, stream_id)` (D-029/D-010).
- Certificates: UNIQUE `certificate_code`, UNIQUE `(student_id, stream_id)`,
  `revoked`/`revoked_at` flags, `document_path` (D-031).
- `special_access` two CHECKs + two partial UNIQUE anti-duplicate indexes
  (D-033).
- `is_admin()` RLS helper (security definer, `search_path = public, pg_temp`);
  no game-logic functions/triggers (D-037). No `updated_at` trigger — backend
  writes `updated_at` explicitly.
- RLS enabled on all 21 tables (D-028): service role bypass for trusted writes;
  admin via `auth.uid()`/`is_admin()`; public anon read only on `streams`,
  `levels`, `activity_types`, `badges`, `leaderboard_entries`. Students have no
  direct access. `questions` has no admin table SELECT — admins preview via the
  security-definer view `questions_public` (excludes `correct_answer`).
- Optional indexes skipped per design ("skip if unused"): `questions GIN (tags)`
  and `schools` trigram GIN on `name`.
- No extensions required (none used). No seed data.

**Validation performed (local, isolated; real Supabase untouched):**
- Spun up a throwaway PostgreSQL 18.3 cluster in `/tmp/opencode/sq_val`
  (own user, port 55432, `initdb -A trust`). Added a Supabase-compatibility
  harness: `auth` schema + `auth.users` + `auth.uid()`, and the `anon` /
  `authenticated` / `service_role` roles (service_role with BYPASSRLS; default
  `public` grants to match Supabase defaults).
- Applied the migration with `psql -v ON_ERROR_STOP=1` — **exit 0**, no
  warnings/errors.
- Verified: 21 tables created; RLS enabled on all 21; 5 composite FKs;
  `uq_levels_id_stream`; `cardinality = 3` CHECK; scoring CHECKs
  (`>= 0` on round/answer points, `0–300` on scores); both partial UNIQUE
  special-access indexes; `questions_public` view exists without
  `correct_answer`.
- Functional smoke tests passed:
  - anon reads `streams`/`levels`/`activity_types`/`leaderboard_entries`; sees
    0 rows in `students`/`questions`.
  - authenticated non-admin sees 0 rows in `students`; can view
    `questions_public`.
  - authenticated admin (`auth.uid()` + `is_active`) reads `students`/
    `game_settings` via policies; `is_admin()` returns true.
  - service role inserts all protected rows.
  - composite FK rejected a mismatched stream/level question.
  - CHECKs rejected grade 5, score 301, and a 4-question session.
  - Full 3-round session flow inserted: `game_sessions` →
    `session_rounds` → `student_answers` → `scores` → `student_progress` /
    `student_level_progress` → `certificates` → `special_access`.
- Scratch cluster stopped and removed.

**Commands executed:**
- `rm -rf /tmp/opencode/sq_val && mkdir -p .../data`
- `/usr/lib/postgresql/18/bin/initdb -D ... -U postgres -A trust`
- `/usr/lib/postgresql/18/bin/pg_ctl -D ... -o "-p 55432 -k ..." start`
- `psql -h /tmp/opencode/sq_val -p 55432 -U postgres -f 0001_initial_schema.sql`
- smoke/flow test scripts via `psql ... -f`
- `pg_ctl ... stop -m immediate; rm -rf /tmp/opencode/sq_val`

**Warnings / errors:**
- None from the migration (exit 0). Minor notes:
  - The migration file existed unlogged before this pass; this entry records it
    as the Task 2.10 deliverable and documents its validation.
  - Architecture doc internal note: the §2 ER diagram mentions
    `certificates.revoked_by`, but the authoritative §4.19 table definition has
    no such column. The migration follows §4.19 (no `revoked_by`). No schema
    impact; recommend a future docs-only consistency tweak.
  - `game_settings` anon read is implemented as admin-only (no direct anon
    SELECT); public reads of non-secret keys are expected via the backend API
    ("via API" per §4.21 RLS), consistent with the security posture.
  - Leftover inert scratch files in `/tmp/opencode/` from a prior validation
    run were observed and left untouched.

**Confirmation:** The migration was **NOT** applied to any Supabase project.
No Supabase project exists/created. No remote tables, no seed data, no Storage
buckets, no API, no packages installed. `package.json` unchanged.

**Next recommended action:**
- Task 2.11 — provision the Supabase project, apply this migration + RLS
  policies, and seed base data (streams/levels/activity_types/badges/
  game_settings). Then 2.12 (Storage buckets + policies). Do not start yet.

---

## 2026-08-11 (Task 2.11 — BLOCKED awaiting credentials)

**Stage:** Stage 2 – Supabase provisioning + base seed (Task 2.11).

**Action:** Pre-flight checks + offline seed preparation for Task 2.11. The real
Supabase provisioning **could not proceed** because the required credentials and
tooling are not present and cannot be obtained automatically (per Task 2.11
instruction: stop and report what is needed; do not guess credentials, project
IDs, URLs, or keys).

**Files created:**
- `supabase/migrations/0002_seed_base_data.sql` — idempotent base/reference seed
  (4 streams, 20 levels, 10 activity types, 4 proposed badges, 8 game settings).
  Uses `ON CONFLICT DO NOTHING` throughout; safe to run repeatedly. Does NOT seed
  questions, students, or game data.

**Files modified:**
- `reports/02-development-log.md` — this entry.
- `reports/04-todo.md` — Task 2.11 marked BLOCKED (awaiting credentials/data
  confirmation), NOT DONE.

**Packages installed:** NONE. Supabase CLI is **not installed** (verified:
`supabase` not found on PATH; not under `~/.local/bin`).

**Configuration changes:** NONE. No `.env` created (only `.env.example` with
placeholders exists). No Supabase access token, project ref, `config.toml`, or
`~/.supabase` login state present.

**Pre-flight verification performed:**
- `supabase` CLI: not available. Node/npm/npx are available.
- `supabase/` structure: only `migrations/0001_initial_schema.sql` exists (no
  `config.toml`, no `.temp`, no linked project).
- Environment: no `SUPABASE_ACCESS_TOKEN` or any Supabase/DB env vars.
- `.env`: does not exist; only `.env.example` (placeholders, commented out).
- `~/.supabase`: does not exist (CLI never logged in).
- `0001_initial_schema.sql`: unchanged (635 lines, Task 2.10 deliverable).

**Local validation of the offline seed (scratch PostgreSQL 18.3 cluster in
`/tmp/opencode/sq_val`, own user, port 55432; real Supabase untouched):**
- Applied 0001 (exit 0), then 0002 twice:
  - Run 1: INSERT 0 4 (streams), 0 20 (levels), 0 10 (activity types),
    0 4 (badges), 0 8 (game settings).
  - Run 2 (idempotency): INSERT 0 0 for all five — no duplicates.
- Verified data: 4 streams (science/technology/engineering/mathematics, order
  1–4); 20 levels (5 per stream); per-level timers/penalties correct
  (90/75/60/50/45 s and 1/2/3/4/5 pt/s); 10 activity types; 4 badges
  (stream_completion criteria); 8 game settings.
- Verified RLS still on all 21 tables after seeding; anon can SELECT streams/
  levels/activity_types/badges/leaderboard_entries; anon sees 0 students,
  questions, game_settings; anon INSERT into students/scores/
  leaderboard_entries denied by RLS; service_role write bypass verified.
- Scratch cluster stopped and removed.

**Commands executed (offline validation only):**
- `supabase --version` → command not found.
- `env | grep -i supabase` → none.
- `initdb -D /tmp/opencode/sq_val/data -U postgres -A trust`
- `pg_ctl -D ... -o "-p 55432 -k ..." start`
- `psql ... -f 0001_initial_schema.sql`
- `psql ... -f 0002_seed_base_data.sql` (twice, idempotency)
- verification `psql -c "..."` queries (counts, anon RLS, service-role write)
- `pg_ctl ... stop; rm -rf /tmp/opencode/sq_val`

**Warnings / errors:**
- **BLOCKER:** Cannot provision the real Supabase project without:
  1. Supabase CLI (install via `npm i -g supabase` or platform binary) — requires
     user approval to install a global tool.
  2. A Supabase access token (`SUPABASE_ACCESS_TOKEN`) or an interactive
     `supabase login` (browser flow) — requires the user's Supabase account.
  3. A project decision: create a new project (`supabase projects create`) or
     link an existing project (`supabase link` + project ref).
- **Data confirmation needed (proposed, not final):** the approved docs specify
  "4 badge types" awarded on stream completion (§11/§15) but do not enumerate
  badge slugs/names; game_settings keys are listed as examples ("e.g.") and the
  hint/attempt deduction values are explicitly "not yet finalised" (D-023).
  `0002_seed_base_data.sql` therefore marks badges and several settings as
  PROPOSED defaults pending confirmation. The two fixed rules seeded are
  `session.questions_per_session=3` and `leaderboard.top_n=10`.
- No errors from the seed itself (exit 0 both runs).

**Confirmation:** No Supabase project was connected to, created, or modified.
No remote tables, no remote seed, no Storage buckets, no packages installed.
`package.json` unchanged.

**Next recommended action:**
- Provide the required inputs to unblock Task 2.11: (1) approval/command to
  install the Supabase CLI, (2) a Supabase access token or consent to an
  interactive `supabase login`, (3) project decision (create new vs. link
  existing + project ref), and (4) confirmation of the proposed badge/game
  settings defaults in `0002_seed_base_data.sql`. Then: `supabase db push`
  (applies 0001+0002), verify the 21 tables/RLS/constraints/seed counts, and
  mark 2.11 DONE. Storage (buckets) remains Task 2.12.

## 2026-08-12 (Task 3.2 — COMPLETED)

**Stage:** Stage 3 – Activity JSON Schemas & validation.

**Action:** Designed, authored, and validated machine-readable JSON Schema
(draft 2020-12) contracts for all 10 activity types, plus common schemas,
worked examples, and a 3-layer validator. Documentation only for schemas;
no plugins/UI/DB changes.

**Files created:**
- `schemas/common/` — 4 reusable schemas: `ids.schema.json` (slug id regex),
  `media.schema.json` (storage ref + alt + role + dims; fixed ref pattern),
  `question.schema.json` (full-record wrapper, Task 3.1 §2),
  `meta.schema.json` (future JSONB meta wrapper).
- `schemas/activities/<type>/payload.schema.json` +
  `correct-answer.schema.json` for all 10 types (drag-drop, fill-complete,
  image-interaction, matching, memory, number-logic, ordering, pattern,
  scenario, sorting).
- `schemas/examples/<type>/` — 7 examples per activity (70 total):
  minimal-valid, grade6-7, grade9-11 payloads; valid-correct-answer;
  partial-credit; invalid-payload; invalid-correct-answer.
- `schemas/validate.py` — 3-layer validator (metaschema check, example
  conformance with `invalid-*` expected-fail, cross-file semantic pair checks).
- `reports/08-task-3.2-schemas.md` — dedicated Task 3.2 report (11 sections).

**Files modified:**
- `reports/README.md` — indexed `08-task-3.2-schemas.md`.
- `reports/04-todo.md` — Task 3.2 marked DONE.
- `reports/03-decisions.md` — D-046, D-047 appended.

**Packages installed:** None (jsonschema 4.26 already present).

**Configuration changes:** None.

**Commands executed:**
- `python3 schemas/validate.py` → `RESULT: PASS`
  - Layer 1: 24 schemas meta-valid, 0 problems.
  - Layer 2: 70 examples conformance, 0 problems.
  - Layer 3: 10/10 payload↔correct-answer semantic pairs consistent.
- `python3 - <<...` one-off scan of media `ref` values against the pattern
  (found 4 BAD REFs, all fixed).

**Result:** All 24 schemas meta-validate, all 70 examples conformant
(20 invalid examples correctly fail), all semantic cross-file checks pass.

**Warnings / errors:** 5 authoring bugs caught and fixed by the validator:
(1) `media.schema.json` ref pattern over-escaped (`\\\\` → `\\.`) making every
media ref invalid; (2) memory minimal example had 2 cards vs schema min 4;
(3) number-logic partial-credit missing required top-level `type`;
(4) scenario grade6-7 example carried a `maxDepth` key not in the schema;
(5) several valid-correct-answer files referenced ids absent from their
paired payload (aligned in Layer 3). See `08-task-3.2-schemas.md` §9.

**Next recommended action:** Stage 4 — implement the Activity Engine. First
port the Layer-3 semantic rules into plugin authoring-time validation, wire
`question.schema.json`/`meta.schema.json` into the Admin Question Builder
(Task 3.1 §16), then build the first activity plugin (drag-drop) against the
stable schema contract.

## 2026-08-12 (Task 4.1 — COMPLETED)

**Stage:** Activity Engine core (implemented per D-021/D-041/D-046 design).

**Action:** Built the reusable JavaScript core of the Activity Engine —
plugin contract, registry, AJV schema registry, validation routing, scoring
guard, hints/feedback/availability, error model, client/server facades,
semantic-rule infrastructure + catalog, test plugin, and a 52-test suite.
No game UI, no real activity plugins, no DB changes.

**Files created (`src/features/activity-engine/`):**
- `errors/index.js` — `ActivityEngineError` + stable codes/categories +
  student-safe `toPublic()`.
- `contracts/` — `plugin.js` (7 required methods, type pattern, pluginForClient),
  `contexts.js` (render context w/ correct-answer rejection, submission,
  availability), `scoring.js` (fraction ∈ [0,1] guard), `hints.js`,
  `feedback.js` (state allow-list), `availability.js`.
- `registry/index.js` — `ActivityRegistry` (register/get/has/list/
  validateRegistration; duplicate/missing-method/invalid-identifier/
  invalid-metadata errors).
- `validation/` — `ajv.js` (Ajv2020 + formats), `schema-registry.js`
  (payload + server-only correct-answer maps, `$ref` resolution),
  `schemas/payload.js` + `schemas/correct-answer.js` (static JSON imports),
  `payload-validator.js`, `answer-validator.js`, `semantic/index.js`
  (applySemanticRules/SemanticRuleSet/createSemanticRule),
  `semantic/rules-catalog.js` (documents every `validate.py` pair rule).
- `core.js` — `createActivityEngine({ mode })`; `index.js` (client facade),
  `server.js` (server facade).
- `testing/` — `test-plugin.js` (dummy activity), `engine.test.js` (37 tests),
  `security.test.js` (15 tests).

**Files modified:**
- `package.json` — added `"test"` script (`node --test …/*.test.js`);
  moved `ajv` + `ajv-formats` to `dependencies` (runtime use; no new packages).
- `package-lock.json` — synced dependency sections.
- `reports/README.md` — indexed `09-task-4.1-activity-engine-core.md`.
- `reports/04-todo.md` — Task 4.1 DONE; fixed 1.8/1.9 statuses (D-010/D-011
  were DECIDED).
- `reports/03-decisions.md` — D-048 (engine core + facades), D-049 (AJV).

**Packages installed:** None. `ajv`/`ajv-formats` moved to `dependencies`.

**Configuration changes:** `package.json` scripts + dependency sections.

**Commands executed:**
- `npm test` → 52 tests, 52 pass (engine + security suites).
- `npm run lint` (oxlint) → clean, zero warnings.
- `npm run build` (Vite 8) → passes.
- Client/server probe builds (temporary entries) verified the bundle
  boundary: correct-answer schema `$id`s and server-only methods are ABSENT
  from the client bundle and PRESENT in the server bundle. Probes deleted.

**Result:** Engine core complete and tested; correct-answer data structurally
excluded from the client facade and bundle; semantic-rule catalog ready for
the first real activity plugin.

**Warnings / errors:** Two test bugs fixed during development: an over-corrected
JSON import depth in the test file, and two assertions corrected to match the
scoring/hints contracts. All resolved; 0 remaining.

**Next recommended action:** First real activity plugin (drag-drop) porting its
`SEMANTIC_RULES_CATALOG` rules into `validatePayload`, then the Game Engine /
session flow wiring the client facade into the UI, then the central scoring
service (D-023) consuming guarded `scoringInputs`.

## 2026-08-12 (Task 4.2 — COMPLETED)

**Stage:** Stage 4 – First real activity plugin: drag-drop.

**Action:** Implemented the first production activity plugin against the
Task 4.1 engine contract and the Task 3.2 schema contract: the 7-method
`drag-drop` plugin, a zero-dependency React renderer, a demo wired into the app
shell, and a 34-case test suite. Correct-answer data is confined to the server
path and verified absent from the client production bundle.

**Files created (`src/features/activity-engine/plugins/drag-drop/`):**
- `plugin.js` — `dragDropPlugin` (render, validatePayload, validateAnswer,
  scoringInputs, buildHints, feedback, availableOn) + `validateMappings`
  (ported catalog rules `drag-drop.mappings-cover-items` /
  `drag-drop.mappings-zone-exists`) + 4 payload-only semantic rules
  (item/zone id uniqueness, id disjointness, single-target = one zone).
- `DragDropActivity.jsx` — React renderer: pointer drag (6 px threshold),
  tap-to-select → tap-to-place fallback, full keyboard support, progressive
  hints, retry/Clear, `role="status"` server-scoring note, no drag library.
- `drag-drop.css` — mobile-first, scoped, focus-visible rings, touch targets.
- `index.js` — public entry re-exporting plugin + renderer + `registerDragDrop`.
- `drag-drop.test.js` — 34 tests (in `testing/`).

**Files modified:**
- `src/App.jsx` / `src/App.css` — demo: renders the Task 3.2
  renewable/non-renewable fixture via the client facade (registered plugin).
- `reports/README.md` — indexed `10-task-4.2-drag-drop.md`.
- `reports/04-todo.md` — Task 4.2 marked DONE.
- `reports/03-decisions.md` — D-050 (plugin semantics live in the plugin),
  D-051 (single plugin object / 7-method registry contract keeps server-method
  source in the client bundle; data boundary unchanged).

**Packages installed:** NONE.

**Configuration changes:** NONE.

**Commands executed:**
- `npm test` → 86 tests, 86 pass (engine 37 + security 15 + drag-drop 34).
- `npm run lint` (oxlint) → clean.
- `npm run build` (Vite 8) → passes (JS ~376 kB gzip 111 kB; CSS 6.5 kB).
- Client/server probe builds verified the bundle boundary again: the
  `correct-answer.schema.json` `$id` is ABSENT from the client bundle and
  PRESENT in the server bundle. Probes deleted after inspection.

**Result:** Task 4.2 DONE. The full pipeline (Task 3.2 schemas → Task 4.1
engine → real plugin → renderer → demo) is closed with the plugin semantics
enforced server-side and correct-answer data verified absent from the client
bundle.

**Warnings / errors:**
- Documented nuance (report 10 §24): the client bundle ships the plugin's
  server-only method *source* because the registry contract requires one
  7-method object; it contains NO correct-answer schema/document (verified) and
  the facade never invokes it. Structural exclusion is recorded as future work
  (mode-aware registry), not a weakening of the data boundary.

### Correction pass (same day) — unknown item/zone id rejection

During final verification of Task 4.2 against the task spec, a genuine gap was
found and fixed in the plugin's `validateAnswer`:

- **Gap:** the task requires "Do not silently accept: unknown item IDs / unknown
  zone IDs" and the automated-test list requires "invalid item ID rejected" and
  "invalid zone ID rejected". The plugin validated submission *shape* but not
  *references*: an unknown item id was silently dropped from scoring and an
  unknown zone id was treated as an ordinary incorrect placement.
- **Fix:** added a **reference guard** in `validateAnswer`
  (`src/features/activity-engine/plugins/drag-drop/plugin.js`): every
  `placement.itemId` must exist in `payload.items` and every `placement.zoneId`
  must exist in `payload.zones`, else it throws `ACTIVITY_ANSWER_INVALID` (the
  established error code — no new code introduced).
- **Tests:** added 3 cases to `drag-drop.test.js` — unknown item id rejected,
  unknown zone id rejected, and a half-correct `0.5` `correctnessFraction`
  (requirement #12 was previously only exercised at `0.75`).
- **Commands executed:** `npm test` → 89 pass (engine 37 + security 15 +
  drag-drop 37); `npm run lint` → clean; `npm run build` → passes.
- **Security re-verified:** client bundle probe again shows 0 hits for the
  correct-answer schema `$id`; server bundle shows 11 hits. Reference-guard
  strings in the client bundle are inert method source only (D-051).
- **Docs updated:** `reports/10-task-4.2-drag-drop.md` (§11 pipeline step 3,
  §22 error table, §25 test list, counts), `reports/04-todo.md` (test count).
- **Packages / config / DB:** NONE changed. Supabase unchanged.

**Next recommended action:** Task 4.3 — Game Engine / session flow wiring the
client facade into the UI (3-of-100 selection, round lifecycle, progress), and
the central scoring service (D-023) consuming guarded `scoringInputs`; then
server transport for `validateAnswer`.

## 2026-08-12 (Task 4.3 — COMPLETED)

**Stage:** Stage 4 – Game Engine core (session lifecycle + D-022 3-of-100).

**Action:** Built the reusable, pure, dependency-free core of the Game Engine:
student-safe error model, seeded PRNG (≥ 64-bit crypto session seed +
mulberry32), the exact D-022 §8 selection algorithm, and the session lifecycle
state machine — with a 26-test suite. No UI, no repository adapters, no answer
validation/scoring, no DB changes.

**Files created (`src/features/game-engine/`):**
- `core/errors.js` — `GameEngineError` + stable `GAME_ERROR_CODES`
  (SESSION_*, ROUND_*, INSUFFICIENT_POOL, LEVEL_LOCKED, INVALID_INPUT,
  INTERNAL), category mapping, student-safe `toPublic()` (pre-existing draft
  retained as the Task 4.3 deliverable).
- `core/prng.js` — `generateSessionSeed()` (64-bit / 16-hex-char via
  `crypto.getRandomValues`), `hashSeedToUint32`, `mulberry32`,
  `createSeededRng`, `shuffle` (Fisher–Yates), `pickOne`.
- `core/selection.js` — `selectRoundQuestions` porting design §8 exactly:
  pool scoped to (stream, level) → `< 3` throws `GAME_INSUFFICIENT_POOL` →
  seeded rng → shuffled type order → strict diversity pass (one per distinct
  activity type) → fill pass (same-type repeats when < 3 types exist) →
  round-order shuffle; last-5-sessions repeat avoidance with full-group
  fallback (never blocks the level); returns `{ questionIds, seed }`.
- `core/session.js` — pure lifecycle: `createGameSession` (exactly 3 unique
  questionIds, pending rounds), `guardSessionForStudent`
  (SESSION_NOT_FOUND / SESSION_WRONG_STUDENT), `getCurrentRound`,
  `submitRound` (ordered-only via ROUND_NOT_CURRENT, ROUND_NOT_FOUND,
  ROUND_ALREADY_SUBMITTED, SESSION_NOT_ACTIVE; immutable update; auto-completes
  on last round), `finishSession` (0–300 `totalPoints`, SESSION_INVALID_STATE).
- `index.js` — single entry re-exporting selection/session/prng/errors.
- `testing/selection.test.js` (15) + `testing/session.test.js` (11).

**Files modified:**
- `package.json` — test script glob widened to include the game-engine suite.
- `reports/README.md` — indexed `11-task-4.3-game-engine-core.md`.
- `reports/04-todo.md` — Task 4.3 marked DONE.
- `reports/03-decisions.md` — D-052 (pure dependency-free Game Engine core),
  D-053 (≥ 64-bit crypto session seed, stored for reproducibility).

**Packages installed:** NONE. `package.json` dependencies unchanged.

**Configuration changes:** `package.json` test script only.

**Commands executed:**
- `npm test` → 115 tests, 115 pass (activity-engine 89 + game-engine 26).
- `npm run lint` (oxlint) → clean (one unused-import warning fixed).
- `npm run build` (Vite 8) → passes.

**Result:** Task 4.3 DONE. Selection is strictly diverse when the pool allows,
deterministic per seed, repeat-avoiding (best effort), and never blocks a
playable level; session transitions are ordered and immutable; all errors are
student-safe. The Game Engine core is ready to be wired to the Activity Engine
(render → validateAnswer → scoringInputs) and the Central Scoring Service
(D-023/D-041) once those integration layers land.

**Warnings / errors:** One test-harness bug during development (pool id
collision in the stream/level-scope test) — fixed in the test, not the engine.

**Next recommended action:** Task 4.4 — integrate Game Engine + Activity Engine
facades into a session service (startSession returns renderable round
descriptors with NO correctAnswer; submitRound routes validateAnswer →
scoringInputs → Central Scoring Service; finishSession sums 0–300), plus the
repository adapter over the Supabase `game_sessions`/`session_rounds` schema.

## 2026-08-13 (Task 4.5 — COMPLETED)

**Stage:** Task 4.5 — second real activity plugin (matching), integrated into
the Game Session service.

**Action:** Implemented the matching activity plugin mirroring the drag-drop
pattern (Task 4.2): 7-method `matchingPlugin` (`render`, `validatePayload`,
`validateAnswer`, `scoringInputs`, `buildHints`, `feedback`, `availableOn`)
plus `validatePairs`, the cross-document catalog-rule port
(`matching.pairs-cover-left` / `matching.pair-right-exists`). Added a pure,
DOM-free interaction controller (`matching-controller.js`) — select / pair /
reassign / clear / reset / coverage gate / response serializer — consumed by
the React renderer `MatchingActivity.jsx` (tap/click + keyboard +
reduced-motion, progressive hints, retry, submit gate). Render hides
distractors by merging them into the shuffled target pool (D-054). `validateAnswer`
requires every left card connected (missing-match rejection, D-055), rejects
unknown left ids / invalid target ids / duplicated sources, dedupes identical
connection records, and supports shared-target correct answers, with partial
credit = correct pairs ÷ total lefts (D-047). Wired `registerMatching` into
`createDefaultServerActivityEngine()`, seeded 3 matching demo questions from the
Task 3.2 fixtures in a dev-server-only module, and extended `App.jsx` to render
matching rounds.

**Files created:**
- `src/features/activity-engine/plugins/matching/plugin.js`
- `src/features/activity-engine/plugins/matching/matching-controller.js`
- `src/features/activity-engine/plugins/matching/MatchingActivity.jsx`
- `src/features/activity-engine/plugins/matching/matching.css`
- `src/features/activity-engine/plugins/matching/index.js`
- `src/features/activity-engine/testing/matching.test.js`
- `src/features/game-session/demo/matching-demo-questions.js`
- `schemas/examples/matching/grade9-11-correct-answer.json`
- `reports/12-task-4.5-matching.md`

**Files modified:**
- `src/features/game-session/service/game-session-service.js` (register matching
  in the default engine)
- `src/features/game-session/api/dev-server.js` (seed matching demo questions)
- `src/features/game-session/testing/session-service.test.js` (M-series: 9
  integration tests — safe descriptor, full/partial/0.75 scoring, engine
  rejections, forged-fraction immunity, mixed-session 300)
- `src/App.jsx` (render `MatchingActivity` for `kind === 'matching'`)
- `schemas/validate.py` (added the matching grade9-11 semantic pair; dynamic
  pair counter)
- `reports/README.md`, `reports/04-todo.md`, `reports/03-decisions.md`

**Packages installed:** none.

**Configuration changes:** none.

**Commands executed:**
- `python3 schemas/validate.py` → PASS (24 schemas meta-valid, 71 examples
  valid, 11/11 pairs consistent; the new grade9-11 matching pair is checked)
- `npm test` → 245 passing (0 failing)
- `npm run lint` → clean (0 warnings / 0 errors)
- `npm run build` → passes; `grep -c "matching/correct-answer.schema.json"
  dist/assets/*.js` → 0 occurrences; client facade has no
  validateAnswer/scoringInputs/feedback/getCorrectAnswerSchema
- Dev-API smoke test → a matching round is served (no `pairs`/`correctAnswer` in
  the descriptor), a full 3-round session score = 300

**Result:** Matching is a fully integrated second production activity type:
schema conformance, plugin correctness, session-service partial credit,
bundle-boundary security, and the browser demo all verified. 245/245 tests
pass.

**Warnings / errors:** One test-coordination issue — the session M-series
initially assumed a specific question would land in round 1; fixed by forcing
uniform per-test pools so fractional-score assertions are deterministic. No
schema or engine defects found.

**Next recommended action:** Task 4.6 — the remaining activity plugins
(ordering, sorting, fill-complete, image-interaction, pattern, memory,
scenario-challenge, number-logic) follow the matching/drag-drop pattern, or a
mode-aware registry variant to drop server-only method source from client
bundles (D-051 future work).

## 2026-08-13 (Task 4.6 — COMPLETED)

**Stage:** Task 4.6 — third real activity plugin (ordering), integrated into the
Game Session service.

**Action:** Implemented the ordering activity plugin mirroring the
drag-drop/matching pattern: 7-method `orderingPlugin` (`render`,
`validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`, `feedback`,
`availableOn`) plus `validateSequence`, the cross-document catalog-rule port
(`ordering.order-permutation`). Ordering is sequence construction — the position
is the rank. Added a pure, DOM-free interaction controller
(`ordering-controller.js`) — create / anchor-guarded move & swap / reset /
coverage gate / response serializer — with gameplay **anchors**: an anchored
item can never change position and an anchored slot can never receive an item;
moves re-arrange only the free positions. Consumed by the React renderer
`OrderingActivity.jsx` (tap-select, pointer drag, keyboard Up/Down + arrows,
reduced-motion, locked-anchor styling/announcement, progressive hints, clear,
submit gate). `render` never reads `correctAnswer.order`; `validateAnswer`
requires a complete permutation (duplicate/unknown/missing/malformed orders
rejected before scoring) and scores per-position, partial credit = correct
positions ÷ total (D-047). Wired `registerOrdering` into
`createDefaultServerActivityEngine()`.

Also fixed a pre-existing **flaky test**: `M52` (session-service suite) asserted
`leftItems.length === 3` while the matching pool legitimately mixed a 3-item
grade and a 4-item physics question. Made it selection-agnostic (Approach B) —
asserts the safe-descriptor contract (non-empty arrays, string id/text, no
`pairs`, no `correctAnswer`, timer/hints present) instead of a fixture item
count. No selection algorithm, randomness, matching behavior, production
scoring, security check, or 3-of-100 logic changed.

**Files created:**
- `src/features/activity-engine/plugins/ordering/plugin.js`
- `src/features/activity-engine/plugins/ordering/ordering-controller.js`
- `src/features/activity-engine/plugins/ordering/OrderingActivity.jsx`
- `src/features/activity-engine/plugins/ordering/ordering.css`
- `src/features/activity-engine/plugins/ordering/index.js`
- `src/features/activity-engine/testing/ordering.test.js`
- `reports/13-task-4.6-ordering.md`

**Files modified:**
- `src/features/game-session/service/game-session-service.js` (register ordering
  in the default engine)
- `src/features/game-session/testing/session-service.test.js` (M52 flaky-test
  fix — selection-agnostic descriptor-contract assertions)
- `reports/README.md`, `reports/04-todo.md`, `reports/03-decisions.md`

**Packages installed:** none.

**Configuration changes:** none.

**Commands executed:**
- `python3 schemas/validate.py` → PASS (24 schemas meta-valid, 72 examples
  valid, 12/12 pairs consistent)
- `npm test` → 299 tests, 299 pass, 0 fail (3 consecutive full runs)
- `npm run lint` → clean (0 warnings / 0 errors)
- `npm run build` → passes; bundle probe: `activities/ordering/correct-answer.schema.json`
  and `activities/ordering/payload.schema.json` → 0 occurrences in the client
  bundle
- Game-session suite ×5 consecutive → 58/58 each run (M52 flake gone)

**Result:** Ordering is a fully integrated third production activity type:
schema conformance, plugin correctness (54 ordering tests), session-service
integration, and bundle-boundary security verified. The pre-existing M52 flake
is fixed deterministically. 299/299 tests pass; lint, build, and schema
validation all pass.

**Warnings / errors:** None. (The only failures encountered were the
pre-existing M52 flake, now fixed, and a temporary shell artifact when invoking
`node --test` on a bare directory path with a trailing slash.)

**Next recommended action:** Task 4.7 — next activity plugin (sorting), or the
mode-aware registry variant to strip server-only method source from client
bundles (D-051 future work).

## 2026-08-13 — Task 4.7: Sorting activity plugin (fourth real activity)

**Delivered:** `src/features/activity-engine/plugins/sorting/` — the fourth
production activity plugin following the Task 4.1 7-method contract:

- `plugin.js` — 7-method plugin + `validateAssignments` (port of catalog rule
  `sorting.assignments-cover-items`), 3 `validatePayload` semantic rules
  (item ids unique, category ids unique, item/category id sets disjoint),
  reference guard (unknown item/category ids rejected), completeness guard
  (missing or duplicate assignments rejected), partial credit = correct
  assignments ÷ total items.
- `sorting-controller.js` — DOM-free interaction state module (create,
  select, place/reassign, clear, reset, completion gate, `buildResponse`),
  unit-tested in Node.
- `SortingActivity.jsx` + `sorting.css` — zero-dependency React renderer:
  tap-select chip → tap category group, pointer drag (enhancement only),
  native-button keyboard (Space/Enter), reduced-motion, unassigned tray,
  per-chip remove, hints, clear, submit gate.
- `index.js` — public entry + `registerSorting`.
- Registered in `createDefaultServerActivityEngine()`; demo API seeds sorting
  demo questions from Task 3.2 fixtures; `App.jsx` renders sorting.
- `sorting.test.js` (52 tests) + S-series integration tests in
  `session-service.test.js` (7 new cases: safe descriptor, full/partial
  credit, forged-fraction ignored, unknown category, missing assignment,
  mixed drag-drop + sorting session).

**Tests:** `npm test` = 358 pass / 0 fail (2 consecutive full runs);
`npm run lint` clean; `npm run build` clean; `python3 schemas/validate.py`
PASS (12/12 pairs). Game-session suite 5×65/65 (M52 fix from Task 4.6 still
holds). Demo API smoke test: session served sorting round (safe descriptor,
no correctAnswer/assignments leak), all-correct run scored 300/300.

**Security:** Bundle probe after build — sorting correct-answer and payload
schema `$id`s both 0 occurrences in the client bundle; client facade exposes no
`validateAnswer` / `scoringInputs` / `feedback` / `getCorrectAnswerSchema`.

**Warnings / errors:** None.

**Next recommended action:** Task 4.8 — Fill & Complete activity plugin (next
in the roadmap), or the mode-aware registry variant to strip server-only
method source from client bundles (D-051 future work).

## 2026-08-14 — Task 4.8: Fill & Complete activity plugin (fifth real activity)

**Delivered:** `src/features/activity-engine/plugins/fill-complete/` — the
fifth production activity plugin (blank-completion; not MCQ) following the Task
4.1 7-method contract:

- `plugin.js` — 7-method plugin + `validateBlankAnswers` (port of catalog rule
  `fill-complete.blanks-referenced`, extended with the honest-denominator
  invariants: exactly one answer entry per blank, in the group matching its
  type, numeric entries definable via value or a (min, max) range), 2
  `validatePayload` semantic rules (blank ids unique; template placeholder
  count = blank count), reference/type/completeness guards, exact-response
  normalization (text trim+case-fold, expression whitespace-collapse only,
  numeric parse + value/tolerance or range comparison).
- `fill-complete-controller.js` — DOM-free interaction state module (create,
  set, get, clear, reset, per-blank answered gate, `isComplete`, response
  serializer), unit-tested in Node.
- `FillCompleteActivity.jsx` + `fill-complete.css` — zero-dependency React
  renderer: template split on `___`, per-type native inputs (`inputMode="decimal"`
  for numbers), prefix/suffix adornments, progress pips + `aria-live`
  "n of m completed", hint reveal, Clear, submit gate; mobile-first CSS with
  `:focus-within` accents and reduced-motion.
- `index.js` — public entry + `registerFillComplete`.
- **Schema consistency fix (approved):** `answers` removed from
  `required` in `schemas/activities/fill-complete/correct-answer.schema.json`
  (D-062) — number-only/expression-only correct answers are now valid
  end-to-end. Genuine contract fix, validated by new tests and the validator
  (still 24 schemas / 72 examples / 12/12 pairs).
- Registered in `createDefaultServerActivityEngine()`; demo API seeds
  fill-complete demo questions from Task 3.2 fixtures; `App.jsx` renders it.
- `fill-complete.test.js` (57 tests) + FC-series integration tests in
  `session-service.test.js` (10 new cases: safe descriptor, full/partial
  credit, forged-fraction ignored, unknown blank, missing blank, mixed
  drag-drop + fill-complete session).

**Tests:** `npm test` = 423 pass / 0 fail (2 consecutive full runs);
`npm run lint` clean; `npm run build` clean; `python3 schemas/validate.py`
PASS (12/12 pairs). Game-session suite 5×73/73 (M52 fix from Task 4.6 still
holds). Demo API smoke test: session served drag-drop/matching/fill-complete
rounds (safe descriptor each), all-correct run scored 300/300.

**Security:** Bundle probe after build — fill-complete correct-answer and
payload schema `$id`s both 0 occurrences in the client bundle; client facade
exposes no `validateAnswer` / `scoringInputs` / `feedback` /
`getCorrectAnswerSchema`.

**Warnings / errors:** None.

**Next recommended action:** Task 4.9 — next activity plugin
(image-interaction), or the mode-aware registry variant to strip server-only
method source from client bundles (D-051 future work).

## 2026-08-14 (Task 4.9 — COMPLETED)

**Stage:** Task 4.9 — sixth production activity plugin: image-interaction.

**Action:** Built the image-interaction activity end-to-end following the
established plugin pattern (Task 4.2/4.5/4.6/4.7/4.8):

- `plugin.js` — 7-method `imageInteractionPlugin` (`render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn`) + `validateImageInteractionAnswer` (semantic port
  of catalog rule `image-interaction.hotspots-exist`, extended with the
  honesty invariants: required-set coverage, label completeness, no answer
  beyond the board) + 6 `validatePayload` semantic rules (hotspot ids unique,
  label ids unique, hotspots/labels disjoint, label-mode requires labels,
  hit-shape defined, hotspots-exist). Two modes: `tap` (required-hotspot set)
  and `label` (correct placements). Partial credit fractional; forged
  correctness/score/requiredHotspots never believed (submission boundary
  rejects correct-answer-bearing responses).
- `image-interaction-controller.js` — pure, DOM-free state module:
  `toPercentCoordinates` (pointer → normalized 0–100), `hitTestPoint`
  (aspect-preserved circle + rect hit shapes, shared server-side),
  `findHotspotAtPoint`, tap state (`toggleTap`/`clearTap`/`selectedCount`),
  label state (`selectLabel`/`getPendingLabel`/`placeLabel`/`moveLabel`/
  `removePlacement`), completion gates, `buildResponse`.
- `ImageInteractionActivity.jsx` + `image-interaction.css` — zero-dependency
  React renderer: image surface (aspect-ratio-fixed, `ref`/`storageSrc`
  resolution, labelled fallback region), hotspot overlays with subtle markers,
  tap mode, label tray with move/remove, `aria-live` progress, hints, Clear,
  submit gate; mobile-first CSS, reduced-motion.
- `index.js` — public entry + `registerImageInteraction`.
- Registered in `createDefaultServerActivityEngine()`; demo API seeds
  image-interaction demo questions from Task 3.2 fixtures (no new production
  content); `App.jsx` renders it for `kind === 'image-interaction'`.
- `image-interaction.test.js` (71 tests) + IC-series integration tests in
  `session-service.test.js` (11 new cases: safe descriptor, no
  requiredHotspots/placements leak, full/partial credit, forged-fraction
  ignored, malformed-answer rejection, mixed drag-drop + image-interaction
  session, all-image pool run).

**Incidental fix (pre-existing):** `dev-server.js` crashed on every API
request — `app.request(...).then is not a function`. Root cause: the Task 4.4
`handle` bridge assumed Hono's `app.request()` returns a Promise, but Hono
4.13.1 returns a plain `Response` synchronously. Fixed by awaiting the request
inside a try/catch IIFE. Verified with a real-socket smoke run.

**Tests:** `npm test` = 503 pass / 0 fail (2 consecutive full runs);
`npm run lint` clean; `npm run build` clean; `python3 schemas/validate.py`
PASS (24/72/12/12). Game-session suite 5×503/503. Demo API smoke test (real
HTTP): full session 300/300; three of six runs included image-interaction
rounds (tap and label) with safe per-round descriptors.

**Security:** Bundle probe after build — image-interaction correct-answer and
payload schema `$id`s both 0 occurrences in the client bundle; client facade
exposes no `validateAnswer` / `scoringInputs` / `feedback` /
`getCorrectAnswerSchema`.

**Warnings / errors:** None.

**Next recommended action:** Remaining activity plugins (pattern, memory,
scenario-challenge, number-logic), the mode-aware registry variant to strip
server-only method source from client bundles (D-051 future work), or stage-3
production content authoring.

## 2026-08-14 (Task 4.10 — COMPLETED)

**Stage:** Task 4.10 — seventh production activity plugin: pattern.

**Action:** Built the pattern activity end-to-end following the established
plugin pattern (Task 4.2/4.5/4.6/4.7/4.8/4.9):

- `plugin.js` — 7-method `patternPlugin` (`render`, `validatePayload`,
  `validateAnswer`, `scoringInputs`, `buildHints`, `feedback`, `availableOn`)
  + `validatePatternAnswer` (semantic port of catalog rule
  `pattern.acceptable-ids-exist`, extended: `construct-count-attainable`,
  `construct-next-single-value`, `numeric-range-valid`,
  `accepted-values-nonblank`) + 4 `validatePayload` semantic rules
  (sequence-ids-unique, candidate-ids-unique, sequence-candidates-disjoint,
  fill-missing-missing-at-in-range). Three modes: `construct-next`
  (`constructCount` 1..3), `fill-missing` (hidden element = `sequence[missingAt]`,
  D-068), `complete-sequence` (one next element). Answer via candidate bank
  AND/OR typed value (mutually exclusive paths). Multiple valid solutions are
  explicit: `acceptableIds` is a set (D-069). Partial credit = correct units ÷
  required units. Strict response-shape gate rejects forged/unexpected fields
  (D-070).
- `pattern-controller.js` — pure, DOM-free state module:
  `normalizeTextAnswer` / `parseNumericValue`, `createPatternState`,
  `selectCandidate` (toggle; single-unit replace; multi-unit append then
  replace-most-recent), `deselectCandidate`, `clearSelection`, `setValue`
  (string only), `getValue`, `isComplete` (generous gate), `clear`/`reset`,
  `buildResponse` (`{ selected }` or `{ value }`).
- `PatternActivity.jsx` + `pattern.css` — zero-dependency React renderer:
  sequence surface (number/text/shape-glyph/image cells with hidden/trailing
  answer slots), real-button candidate bank, native number/text entry when the
  answer is a single element and every candidate is typable, `aria-live`
  progress, hints, Clear, submit gate; mobile-first CSS, reduced-motion.
- `index.js` — public entry + `registerPattern`.
- Registered in `createDefaultServerActivityEngine()`; demo API seeds pattern
  demo questions from Task 3.2 fixtures (no new production content); `App.jsx`
  renders it for `kind === 'pattern'`.
- `pattern.test.js` (66 tests) + PA-series integration tests in
  `session-service.test.js` (8 new cases: safe descriptor, no
  acceptableIds/accepted leak, full/partial credit, forged-fraction ignored,
  malformed-answer rejection, mixed drag-drop + pattern session, all-pattern
  pool run across all three modes).

**Note (documented caveat, no schema change):** the Task 3.2 fill-missing
fixture pair (`valid-payload-grade9-11.json` + `partial-credit.json`) is
internally inconsistent — `missingAt: 2` hides `sequence[2] = 9` (square
numbers) but the authored answer is `16` (the next term after the hidden
slot). This task implements the schema-literal "hidden element =
`sequence[missingAt]`" reading (D-068) and uses a self-consistent numeric
answer (`9`) in the demo and PA-series.

**Tests:** `npm test` = 577 pass / 0 fail (2 consecutive full runs);
`npm run lint` clean; `npm run build` clean; `python3 schemas/validate.py`
PASS (24/72/12/12). Game-session suite 5×90/90. Demo API smoke test (real
HTTP): pattern-only pool, full session 300/300 with safe per-round
descriptors.

**Security:** Bundle probe after build — pattern correct-answer and payload
schema `$id`s both 0 occurrences in the client bundle; client facade exposes no
`validateAnswer` / `scoringInputs` / `feedback` / `getCorrectAnswerSchema`.

**Warnings / errors:** None.

**Next recommended action:** Remaining activity plugins (memory,
scenario-challenge, number-logic), the mode-aware registry variant to strip
server-only method source from client bundles (D-051 future work), or stage-3
production content authoring.

## 2026-08-14 (Task 4.11 — COMPLETED)

**Stage:** Task 4.11 — eighth production activity plugin: memory.

**Action:** Built the memory activity end-to-end following the established
plugin pattern (Task 4.2/4.5/4.6/4.7/4.8/4.9/4.10):

- `plugin.js` — 7-method `memoryPlugin` (`render`, `validatePayload`,
  `validateAnswer`, `scoringInputs`, `buildHints`, `feedback`, `availableOn`)
  + `validateMemoryAnswer` (semantic port of catalog rule
  `memory.groups-cover-cards`, extended: `memory.group-size-matches-deck`) +
  2 `validatePayload` semantic rules (`memory.card-ids-unique`,
  `memory.deck-size-consistent`). Pairs = groups of 2; sets = groups of 3–4
  (the schema's own deckType description). Partial credit = correct groups ÷
  total groups. Strict response-shape gate rejects forged/unexpected fields.
- `memory-controller.js` — pure, DOM-free state module: `shuffleList`
  (Fisher–Yates), `createMemoryState`, phase machine (`isMemorizing` /
  `isRecalling`, `startRecall` re-shuffles the deck, `canReviewAgain` /
  `reviewAgain` re-reveal budget), capped selection (`toggleCard`,
  `canPlaceGroup`, `placeGroup`, `removeGroup`, `clearSelection`, `clear`,
  `reset`), `isComplete` (generous, correctness-agnostic gate),
  `buildResponse` (`{ groups: [{ cardIds }] }`).
- `MemoryActivity.jsx` + `memory.css` — zero-dependency React renderer:
  memorize phase (full deck + `revealSeconds` countdown, auto-transition to
  recall, "I'm ready" skip), recall phase (re-shuffled pool of real-button
  cards, selection strip with Place-group / Clear-selection, stacked placed
  groups with per-group Remove, "Study again" while the reveal budget lasts,
  aria-live announcements), hints, Clear, submit gate; mobile-first CSS,
  reduced-motion.
- `index.js` — public entry + `registerMemory`.
- Registered in `createDefaultServerActivityEngine()`; demo API seeds memory
  demo questions (id 47..49) from Task 3.2 fixtures (no new production
  content); `App.jsx` renders it for `kind === 'memory'`.
- `memory.test.js` (62 tests) + ME-series integration tests in
  `session-service.test.js` (8 new cases: safe descriptor, no groups/groupId
  leak, full/partial credit, forged-fraction ignored, malformed/incomplete
  answer rejection, mixed drag-drop + memory session, all-memory pool run).

**Tests:** `npm test` = 647 pass / 0 fail (2 consecutive full runs);
`npm run lint` clean; `npm run build` clean; `python3 schemas/validate.py`
PASS (24/72/12/12). Game-session suite 5×98/98. Demo API smoke test (real
HTTP): memory-only pool, full session 300/300 with safe per-round
descriptors.

**Security:** Bundle probe after build — memory correct-answer schema `$id` 0
occurrences in the client bundle; `groups`/`groupId`/`cardIds` absent from any
descriptor; client facade exposes no `validateAnswer` / `scoringInputs` /
`feedback` / `getCorrectAnswerSchema`.

**Warnings / errors:** None.

**Next recommended action:** Remaining activity plugins (scenario-challenge,
number-logic), the mode-aware registry variant to strip server-only method
source from client bundles (D-051 future work), or stage-3 production content
authoring.

---

## 2026-08-14 (Task 4.12 — COMPLETED)

**Stage:** Task 4.12 — ninth production activity plugin: scenario-challenge.

**Action:** Built the scenario-challenge activity end-to-end following the
established plugin pattern (Task 4.2/4.5/4.6/4.7/4.8/4.9/4.10/4.11):

- `plugin.js` — 7-method `scenarioChallengePlugin` (`render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn`) + `validateScenarioAnswer` (semantic port of
  catalog rule `scenario.entry-decision-exists`, extended:
  `scenario.optimal-path-missing`, `scenario.optimal-path-traversable`,
  `scenario.acceptable-options-exist`) + 5 `validatePayload` semantic rules
  (`scenario.decision-ids-unique`, `scenario.option-ids-unique`,
  `scenario.entry-decision-exists`, `scenario.next-decision-exists`,
  `scenario.option-no-self-loop`). Partial credit = correct steps ÷ submitted
  path length; a step is correct iff its option is the optimal option for that
  decision OR an authored acceptable alternative. Strict response-shape gate
  (`{ path: [{ decisionId, optionId }] }`) + entry/reference/continuity/
  terminal/no-double-back checks reject forged paths.
- `scenario-challenge-controller.js` — pure, DOM-free navigation-state module:
  `findDecision`/`findOption`, `createScenarioState`, `currentDecision`,
  `currentOptions`, `selectOption` (advances via `nextDecision`, terminal
  option completes), `isComplete`, `pathTaken`, `stepCount`, `lastOutcome`,
  `reset`, `buildResponse` (`{ path }`). The controller owns navigation ONLY —
  never optimalPath/acceptableOptions/correctness.
- `ScenarioChallengeActivity.jsx` + `scenario-challenge.css` — zero-dependency
  React renderer: mission header + optional media, progressive decision walk
  (real-button branch cards, current decision only), consequence panel
  (chosen option + `outcomeText`, Continue), completion panel with Submit
  (gated on `isComplete`) + Start over, hints, aria-live announcements;
  mobile-first CSS, reduced-motion.
- `index.js` — public entry + `registerScenarioChallenge`.
- Schema-key alias: scenario schemas live under `schemas/activities/scenario/`
  (type `scenario`), but the engine activity type is `scenario-challenge` — so
  `PAYLOAD_SCHEMAS` and `CORRECT_ANSWER_SCHEMAS` now expose the scenario schema
  under BOTH keys. No schema files changed.
- Registered in `createDefaultServerActivityEngine()`; demo API seeds scenario
  demo questions (id 50..52) from Task 3.2 fixtures (no new production
  content); `App.jsx` renders it for `kind === 'scenario-challenge'`.
- `scenario-challenge.test.js` (59 tests) + SC-series integration tests in
  `session-service.test.js` (12 new cases: safe descriptor, no answer leak,
  optimal/acceptable/partial/zero credit, forged-fraction ignored, malformed
  + impossible-jump rejection, mixed drag-drop + scenario session,
  all-scenario pool run, and **nine-type coverage** across all production
  plugins).

**Tests:** `npm test` = 718 pass / 0 fail (2 consecutive full runs);
`npm run lint` clean; `npm run build` clean; `python3 schemas/validate.py`
PASS (24/72/12/12). Game-session suite 5×110/110. Demo API smoke test (real
HTTP): scenario-only pool, optimal session 300/300, wrong-branch session 0/0,
safe per-round descriptors.

**Security:** Bundle probe after build — scenario correct-answer schema `$id`
and `acceptableOptions` 0 occurrences in the client bundle; descriptor carries
only the PUBLIC tree (`nextDecision`/`outcomeText` are navigation data, not
the answer); client facade exposes no `validateAnswer` / `scoringInputs` /
`feedback` / `getCorrectAnswerSchema`.

**Warnings / errors:** None.

**Next recommended action:** The final activity plugin (number-logic), the
mode-aware registry variant to strip server-only method source from client
bundles (D-051 future work), or stage-3 production content authoring.

---

## 2026-08-14 (Task 4.13 — COMPLETED)

**Stage:** Task 4.13 — tenth and final production activity plugin:
number-logic.

**Action:** Built the Number / Logic Challenge activity end-to-end following
the established plugin pattern (Task 4.2–4.12):

- `plugin.js` — 7-method `numberLogicPlugin` (`render`, `validatePayload`,
  `validateAnswer`, `scoringInputs`, `buildHints`, `feedback`, `availableOn`)
  + `validateNumberLogicAnswer` (semantic port of catalog rules
  `number-logic.parts-match` / `number-logic.type-fields`, extended:
  `answer-format-compatible`, `range-ordered`, `tolerance-valid`,
  `fraction-integer-components`, `accepted-nonblank`,
  `sequence-values-valid`, `numeric-fields-finite`) + `validatePayload` rule
  `number-logic.part-ids-unique`. Six answer formats (`integer`, `decimal`,
  `fraction`, `percent`, `sequence`, `expression`) × seven correct-answer
  types (`exact`, `tolerance`, `range`, `fraction`, `percent`, `sequence`,
  `accepted-set`) through ONE correctness model: one atomic value = one unit;
  exact strict `===`, tolerance `|n−value| ≤ tolerance`, range inclusive,
  percent = authored number with one optional `%` suffix (D-074), fraction =
  lowest-term integer-GCD reduction (6/8 == 3/4), sequence element-wise with
  tolerance (wrong count rejected), accepted-set exact normalized match (NO
  eval). Multi-step `payload.parts[]` → per-part specs are the ONLY scoring
  surface (D-075). Strict response-shape gate (`{ value }` / `{ values }` /
  `{ parts: [{ partId, value }] }`, forged/extra fields rejected
  `ACTIVITY_ANSWER_INVALID`, sequence answers must arrive as `{ values }`).
- `number-logic-controller.js` — pure, DOM-free interaction-state module:
  `createNumberLogicState`, `setValue`, `setFraction`, `setSequenceElement`,
  `addSequenceElement`/`removeSequenceElement` (cap 12), per-part variants,
  `isComplete`, `clear`/`reset`, `buildResponse`.
- `NumberLogicActivity.jsx` + `number-logic.css` — zero-dependency React
  renderer: single-value / sequence (Add value / Remove) / multi-part
  surfaces, fraction two-input with `/` slash, percent `%` suffix, expression
  text input, non-scored `showWork` scratchpad, hints, Clear, Submit gated on
  `isComplete`; aria-live, 48px+ targets, focus-visible, reduced-motion.
- `index.js` — public entry + `registerNumberLogic`.
- No schema alias needed (`number-logic` schema key already matches the plugin
  type). No schema files changed.
- Registered in `createDefaultServerActivityEngine()`; demo API seeds
  number-logic demo questions (ids 53–55) from Task 3.2 fixtures (no new
  production content); `App.jsx` renders it for `kind === 'number-logic'`.
- `number-logic.test.js` (57 tests) + NL-series integration tests in
  `session-service.test.js` (10 new cases: safe descriptor, multi-step
  metadata-only descriptor, exact full credit, fraction-equivalent + percent
  forms, per-step partial credit, sequence per-element partial credit,
  accepted-set exact matching, malformed rejection, forged-fraction ignored,
  all-number-logic pool run) and **SC13 extended to ten-type coverage** with a
  fourth deterministic group `[number-logic, number-logic, drag-drop]`.
- `reports/03-decisions.md` — D-074 (percent/fraction/sequence numeric model)
  and D-075 (multi-part parts-only scoring surface), continued after D-073.

**Tests:** `npm test` = 785 pass / 0 fail (2 consecutive full runs);
`npm run lint` clean; `npm run build` clean (dist JS 273.95 kB / gzip
79.37 kB); `python3 schemas/validate.py` PASS (24/72/12/12). Game-session
suite 5×120/120. Demo API smoke tests (real HTTP): number-logic-only pool
(optimal 300/300, wrong 0/0, safe descriptors) and mixed 10-activity sessions
(8 mixed sessions covering all ten production types, every round fully
correct, all reaching 300).

**Security:** Bundle probe after build — `number-logic/correct-answer.schema.json`
0 occurrences in the client bundle (and no `correct-answer.schema.json` of any
type); demo content strings absent; descriptor carries only public payload
content (`problem`, `answerFormat`, `inputMode`, `showWork`, part labels);
client facade exposes no `validateAnswer` / `scoringInputs` / `feedback` /
`getCorrectAnswerSchema`.

**Warnings / errors:** None.

**Next recommended action:** No further activity plugins remain — the ten-type
plugin set is complete. Remaining roadmap items (Admin panel, Question
Builder, production content authoring, leaderboards, badges/certificates,
exhibition polish) are NOT part of this task and were not started.

---

## 2026-08-14 (Task 1.10 — COMPLETED)

**Stage:** Stage 1 – Architecture review (completion gate).

**Action:** Installed and verified the five review-approved frontend
libraries (D-014…D-018) and minimally wired them into the app. No Admin
Panel / Question Builder built, no redesign, no Supabase changes, no
production question content, no Activity/Game Engine changes. Existing Task
4.4 demo keeps working at `/`.

**Packages installed:**
- Dependencies: `react-router@7.18.2` (React Router v7, canonical package —
  deliberately the v7 line per D-014, not v8), `zustand@5.0.15`,
  `@tanstack/react-query@5.101.4`, `motion@13.1.0` (Framer Motion successor).
- DevDependencies: `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`.
- Registry was intermittently slow/ECONNRESET; installs retried against the
  npm cache until clean (`added 10 packages`, `added 26 packages`).

**Files created:**
- `src/router.jsx` — `createBrowserRouter`; `/` → existing `App`; 8 future
  placeholder routes (`/student/register`, `/student/game`, `/leaderboards`,
  `/certificate`, `/admin/login`, `/admin`, `/admin/questions`,
  `/admin/settings`) lazy-loaded via `React.lazy` + `Suspense`; `*` fallback.
- `src/pages/RoutePlaceholder.jsx` — minimal "route not implemented yet"
  screen (design tokens + one Tailwind utility pair `mt-4 inline-block` +
  small Motion fade).
- `src/lib/query-client.js` — shared `QueryClient` (`staleTime: 60s`,
  `refetchOnWindowFocus: false`, `retry: 1`).
- `src/stores/ui-store.js` — minimal ephemeral UI store (`toast` +
  `showToast`/`clearToast`), zustand `create` proven.

**Files modified:**
- `package.json` / `package-lock.json` — new deps + devDeps.
- `vite.config.js` — added `tailwindcss()` plugin (`@tailwindcss/vite`).
- `src/main.jsx` — wrapped app in `QueryClientProvider` + `RouterProvider`.
- `src/index.css` — prepended `@import 'tailwindcss';` (pre-existing `:root`
  design tokens preserved) + placeholder styles.
- `reports/21-task-1.10-frontend-libraries.md` — the dedicated Task 1.10
  report (21 sections). `reports/03-decisions.md` unchanged (no new decision
  required). `reports/04-todo.md` — Task 1.10 DONE.

**Configuration changes:** Vite plugin list; Tailwind v4 import; app
bootstrap wiring. No `tailwind.config.js`, no `postcss.config.js`, no `.env`
changes, no Supabase resources touched.

**Commands executed:** `npm install` (runtime libs, then Tailwind devDeps);
`npm run build`; `npm run lint`; `npm test`; `npm run dev -- --port 5199` +
HTTP smoke (curl `/`, `/student/register`, `/admin/questions`, module
transforms); bundle probe on `dist/assets`.

**Result:** `npm test` = 785 pass / 0 fail (Activity Engine + Game Session
suites unchanged); `npm run lint` clean; `npm run build` clean — main JS
390.76 kB (gzip 116.21 kB), lazy placeholder chunk 121.16 kB (gzip
39.24 kB), CSS 52.19 kB (gzip 8.48 kB, Tailwind preflight + utilities +
custom CSS). Dev server: `/` 200, SPA-fallback placeholder routes 200,
Tailwind pipeline proven (`.mt-4`/`.inline-block` generated in CSS, served
in dev). Lazy loading keeps Motion + placeholder out of the initial bundle.

**Security:** Bundle probe — `correct-answer.schema.json` 0 occurrences in
the client bundle; `correctAnswer` hits are only the intentional
`correctAnswerExposed()` security-guard API; `number-logic` hits are plugin/
renderer registration identifiers only. No secrets or Supabase credentials
in the bundle.

**Warnings / errors:** Tailwind v4 preflight (standard import) applies a
normalizing baseline; plugin renderers style their interactive elements via
explicit class rules so their appearance is unaffected. Vite chunk-size
advisory (>500 kB) for the combined app + router + query chunk — route
code-splitting is a later-task concern.

**Next recommended action:** The five libraries are installed and wired.
Later roadmap work (student registration/profile, stream/level selection,
game-session flow, Admin panel, Question Builder, production content) can
now use the installed foundations; none of it was started in this task.

## 2026-08-15 (Task 5.1 — COMPLETED)

**Stage:** Stage 5 – Student registration & lightweight session foundation.

**Action:** Implemented and verified student registration, student identity,
and the lightweight student session foundation, plus the optional profile
photo. Students remain normal application records (D-005), never Supabase
Auth users; the browser talks only to the Hono API, never Supabase (D-027).
Registration accepts only `{ initials, name, school, grade }` (strict field
gate); sessions use CSPRNG tokens stored as SHA-256 hashes (D-040). The
existing `students`/`student_sessions`/`student-avatars` architecture was used
exactly — NO migration, NO new table, NO RLS changes, NO Storage policy
changes. Task 5.2 (stream/level selection) was NOT started.

**Files created:**
- `src/features/student/errors.js` — StudentError + stable codes/categories
  and student-safe public messages.
- `src/features/student/validation.js` — shared authoritative validation
  (initials ≤ 5, name ≤ 100, school ≤ 120, grade integer 6–11, Unicode-safe,
  strict allowed-field gate).
- `src/features/student/registration/registration-fields.js` — form model
  (4 fields + optional photo descriptor + submit labels + next-step path).
- `src/features/student/registration/controller.js` — DOM-free flow
  controller (validate → register → token store → optional avatar →
  success/error).
- `src/features/student/security/tokens.js` — CSPRNG session token
  (`randomBytes(32)`, base64url), SHA-256 hashing, kiosk login-code generator.
- `src/features/student/security/avatar.js` — 200 KB / JPEG-PNG-WebP gate +
  safe `{numeric-id}/profile.{ext}` path builder.
- `src/features/student/session/token-storage.js` — sessionStorage helper
  storing only the opaque token (session-scoped, kiosk-appropriate).
- `src/features/student/service/student-service.js` — server orchestration
  (register + getMe + uploadAvatar; school find-or-create; TTL from
  `game_settings`; security boundary).
- `src/features/student/repositories/contracts.js` / `index.js` /
  `memory.js` / `supabase.js` — repository contracts + in-memory and
  service-role Supabase adapters (column names match 0001 exactly).
- `src/features/student/api/client.js` — browser API client (fetch only).
- `src/features/student/api/queries.js` — TanStack Query `useStudentMe`.
- `src/features/student/api/server.js` — Hono routes
  (`POST /api/student/register`, `GET /api/student/me`,
  `PUT /api/student/me/avatar`) with Bearer-token parsing + error→HTTP map.
- `src/features/student/testing/student-service.test.js` (32),
  `student-api.test.js` (12), `frontend-registration.test.js` (22).
- `src/pages/StudentRegisterPage.jsx` + `src/pages/student-register.css` —
  real `/student/register` page (mobile-first, a11y, Motion, reduced-motion).
- `reports/22-task-5.1-student-registration.md` — the dedicated Task 5.1
  report (28 sections).

**Files modified:**
- `src/pages/StudentRegisterPage.jsx` — fixed feature import paths
  (`../../features/` → `../features/`; the page lives in `src/pages/`, so the
  feature prefix is one level up). This was the root cause of the SSR page
  test failing to resolve `controller.js`.
- `src/features/student/testing/frontend-registration.test.js` — SSR test now
  imports `react`/`react-dom/server`/`react-router`/`@tanstack/react-query`
  directly instead of `vite.ssrLoadModule(...)`; React 19 is CJS and Vite 8's
  module runner throws `module is not defined` when inlining `react` directly.
  The page component is still loaded via `ssrLoadModule` and rendered to
  static markup to assert the a11y contract.
- `src/features/game-session/api/dev-server.js` — composes the student Hono
  app into the demo API by URL prefix (`createStackedApp`).
- `package.json` — test glob extended to include
  `src/features/{activity-engine,game-engine,game-session,student}/testing/**/*.test.js`.
- `reports/04-todo.md`, `reports/README.md`, `README.md` — tracking updates.

**Packages installed:** none (all dependencies pre-existed from prior stages).

**Configuration changes:** none (no `.env`, no Vite, no Tailwind changes).

**Commands executed:** `npm test` (851), `npm run lint`, `npm run build`,
`python3 schemas/validate.py` (24/72/12/12), HTTP smoke against the composed
demo API + Vite dev server (register/me/invalid-token/privileged-field/404 +
`GET /` + `GET /student/register`), `dist/` bundle security probe.

**Result:** `npm test` = **851 pass / 0 fail** (was 785; +66 student tests);
oxlint clean; `vite build` clean (StudentRegisterPage lazy chunk 20.36 kB /
gzip 7.10 kB; main index 391.58 kB / gzip 116.55 kB). HTTP smoke all green
(201 register, 200 /me, 401 invalid token, 400 unexpected field, 404 unknown
route, 200 `/` and `/student/register`). Bundle probe 0 leaks. Supabase
untouched (in-memory demo data only). Schema validator unchanged (24/72/12/12).

**Warnings / errors:** One pre-existing bug surfaced during verification: the
student page imported features with `../../features/` from `src/pages/`,
which resolves outside the repo; fixed to `../features/`. The Vite 8 SSR
`ssrLoadModule('react')` limitation (CJS React) was worked around in the test
via direct imports. No other warnings.

**Next recommended action:** Task 5.2 — stream/level selection UI on top of
this foundation (authenticated student via the stored session token chooses a
stream + level; streams/levels data + game-session service). Do not start it
inside Task 5.1.

## 2026-08-15 (Task 5.2 — COMPLETED)

**Stage:** Stage 5 – Student stream & level selection UI.

**Action:** Implemented and verified the "Choose your stream" stage. An
authenticated student (via the Task 5.1 opaque session token, authenticated
through `StudentService.getMe`) picks exactly one of the four approved streams
and one of the five levels per stream, then begins a mission. The selection UI
is a mirror of the authoritative game-session unlock rule
(`GameSessionService.applyUnlockRule`): level 1 always open; levels 2..5 need
an active special-access grant (stream-wide or level-specific — the current
backend treats any matching `stream_id` as covering the stream, recorded as
D-076). Grade is never a level gate (D-045). The architecture §11
previous-level-completion progression is documented as future backend work,
NOT a client-side gate. New mission backend (`/api/student/mission/streams` +
`/api/student/mission/streams/:streamId/levels`), read-only memory + Supabase
repositories, pure access resolver, real `/student/mission` page
(stream picker → level picker → begin → router-state `{ streamId, levelId }`
to the `/student/game` placeholder), `NEXT_STEP_PATH` now `/student/mission`,
expired-session 401 guard. NO Supabase migration/RLS/Storage changes, no new
packages. Task 5.3 (game UI) NOT started.

**Files created:**
- `src/features/mission/errors.js` — MissionError + stable codes/categories +
  safe public messages.
- `src/features/mission/access/access-resolver.js` — pure unlock/status model
  (available/special/locked; completed/in-progress/not-started;
  buildLevelContext/buildStreamSummary).
- `src/features/mission/service/mission-service.js` — read-only orchestration
  (getMissionOverview / getMissionLevels).
- `src/features/mission/repositories/contracts.js` / `index.js` / `memory.js` /
  `supabase.js` — read-only repo contracts + in-memory and service-role
  PostgREST adapters (columns match 0001 exactly).
- `src/features/mission/api/server.js` — Hono routes + StudentError/MissionError
  → HTTP map.
- `src/features/mission/api/queries.js` — TanStack Query `useMissionStreams` /
  `useMissionLevels`.
- `src/features/mission/selection/selection-state.js` — pure reducer
  (streams → levels → ready, back navigation, locked refusal).
- `src/features/mission/selection/use-mission-selection.js` — selection hook.
- `src/features/mission/session-guard.js` — `isExpiredSession` (401 → redirect).
- `src/features/mission/demo/seed.js` — approved demo stream descriptions.
- `src/features/mission/testing/access-resolver.test.js` (12),
  `mission-service.test.js` (12), `mission-api.test.js` (7),
  `frontend-mission.test.js` (7).
- `src/pages/StudentMissionPage.jsx` + `src/pages/student-mission.css` +
  `src/pages/stream-icons.jsx` — real `/student/mission` page + glyphs.
- `reports/23-task-5.2-stream-level-selection.md` — the dedicated Task 5.2
  report (29 sections).

**Files modified:**
- `src/features/student/api/client.js` — added `getMissionStreams` /
  `getMissionLevels` (single student client surface).
- `src/features/student/registration/registration-fields.js` —
  `NEXT_STEP_PATH` `'/student/game'` → `'/student/mission'`.
- `src/features/student/testing/frontend-registration.test.js` — the two
  `NEXT_STEP_PATH`/`nextStep()` assertions updated to `/student/mission`.
- `src/features/game-session/api/dev-server.js` — `createStackedApp` now
  composes the mission app (mounted before the student prefix); mission
  memory repos seeded from `demoBaseData()` + approved descriptions;
  `createDemoApi` returns `missionService`.
- `src/router.jsx` — `/student/mission` lazy route added.
- `package.json` — test glob extended to include
  `src/features/{activity-engine,game-engine,game-session,student,mission}/testing/**/*.test.js`.
- `reports/04-todo.md`, `reports/README.md`, `README.md` — tracking updates.
- `reports/03-decisions.md` — new decision D-076.

**Packages installed:** none.

**Configuration changes:** none.

**Commands executed:** `npm test` (889), `npm run lint`, `npm run build`,
`python3 schemas/validate.py` (24/72/12/12), HTTP smoke against the composed
demo API + Vite dev server (register → mission streams/levels, no-token 401,
bogus-token 401, all SPA routes 200).

**Result:** `npm test` = **889 pass / 0 fail** (was 851; +38 mission tests);
oxlint clean; `vite build` clean (StudentMissionPage lazy chunk 8.90 kB /
gzip 2.63 kB + 5.41 kB CSS). HTTP smoke all green (mission streams 200 with 4
streams, levels 200 with 1:available + 2–5:locked, 401 no/bogus token, `/`,
`/student/register`, `/student/mission`, `/student/game`, `/leaderboards`,
`/admin/questions` all 200). Supabase untouched (in-memory demo data only).
Schema validator unchanged (24/72/12/12 PASS).

**Warnings / errors:** Two lint warnings fixed during development (unused
`backToStreams` parameter → `_state`; unstable `streams` array identity in
`useMissionSelection` → module-level `EMPTY_STREAMS` constant). No other
warnings.

**Next recommended action:** Task 5.3 — student game UI on top of the Game
Session API; the mission page already hands `{ streamId, levelId }` via router
state. Do not start it inside Task 5.2.

## 2026-08-15 (Task 5.3 — COMPLETED)

**Stage:** Stage 5 – Student game UI (session screen).

**Action:** Implemented and verified the real student game screen at
`/student/game` as a thin token-authenticated client over the existing
authoritative `GameSessionService`. The mission page hands `{ streamId,
levelId }` via router state; the page authenticates with the Task 5.1 opaque
Bearer token through `StudentService.getMe` (`studentId` derived server-side,
never from the client). New student game API `/api/student/game/*`
(start/resume, current, submit, finish) composed ahead of the generic student
prefix; client fetch client + TanStack Query hooks; pure round lifecycle
(IDLE→STARTING→PLAYING⇄SUBMITTING→ROUND_RESULT→SESSION_COMPLETE) with a
minimal Zustand wrapper; session-scoped choice storage for refresh recovery;
display-only countdown timer; one `RoundActivity` boundary over all ten
activity renderers; real `StudentGamePage` with HUD (progress/score/timer),
round-result panel, completion panel, and a navigation guard for active
sessions. Also: shared student-identity facade so registered students (id ≥ 2)
can start sessions; ordering demo questions complete the ten-type demo pool;
six plugin entry files gained top-level imports so Vite's SSR module runner can
load them. NO Supabase changes, no new packages. Task 5.4 NOT started.

**Files created:**
- `src/features/game-session/api/student-server.js` — student-authenticated
  game Hono app (Bearer auth, composed game+student error map).
- `src/features/game-session/api/student-client.js` — browser fetch client
  (`gameStudentClient`).
- `src/features/game-session/api/queries.js` — `useStartSession` /
  `useSubmitRound` / `useFinishSession` / `useCurrentRound`.
- `src/features/game-session/round/round-lifecycle.js` + `round-store.js` —
  pure lifecycle reducer + Zustand wrapper.
- `src/features/game-session/session/choice-storage.js` — session choice
  storage (sessionStorage `stemquest.student.game`).
- `src/features/game-session/timer/use-countdown.js` — display-only countdown.
- `src/features/game-session/activity/activity-registry.js` +
  `activity-renderer.jsx` — 10-type render map + `RoundActivity`.
- `src/features/game-session/demo/ordering-demo-questions.js` — ordering demo
  content (ids 14–16, from Task 3.2 fixtures).
- `src/features/game-session/testing/round-lifecycle.test.js` (8),
  `student-game-api.test.js` (6), `frontend-game.test.js` (12).
- `src/pages/StudentGamePage.jsx` + `src/pages/student-game.css`.
- `reports/24-task-5.3-student-game-ui.md` — the dedicated Task 5.3 report.

**Files modified:**
- `src/features/game-session/api/dev-server.js` — student game app composed
  into `createStackedApp` (mounted before the student prefix); game service
  student identity now reads the student feature store (with the game demo
  store as a legacy fallback); ordering demo questions added to the pool.
- `src/router.jsx` — `/student/game` lazy route → `StudentGamePage`.
- `src/features/activity-engine/plugins/{fill-complete,image-interaction,
  memory,number-logic,pattern,scenario-challenge}/index.js` — added top-level
  imports so the entry modules load under Vite's SSR module runner (behaviour
  unchanged).
- `reports/04-todo.md`, `reports/README.md`, `README.md` — tracking updates.

**Packages installed:** none.

**Configuration changes:** none.

**Commands executed:** `npm test` (915), `npm run lint`, `npm run build`,
`python3 schemas/validate.py` (24/72/12/12 PASS), HTTP smoke against the
composed demo server (20/20), `rg` bundle security probe over `dist/assets`.

**Result:** `npm test` = **915 pass / 0 fail** (was 889; +26 game-session
tests). oxlint clean. `vite build` clean (StudentGamePage lazy chunk 24.58 kB /
gzip 7.72 kB). Schema validator PASS (unaffected). HTTP smoke 20/20:
register → mission → start (201, safe descriptor) → resume-same-session →
submit all 3 rounds (server-scored) → finish (score+code+breakdown), bad
token 401, foreign-session 403, no scoring secrets in any payload. Bundle
probe: no `correctAnswer`/`acceptableIds`/`optimalPath`/`requiredHotspots`/
scoring strings in `dist/assets`.

**Warnings / errors:** Two lint warnings fixed during development (unused
`repos` in a test; unused `running` in a test). The SSR module-runner load
failures for six plugin entries were root-caused and fixed (added top-level
imports, behaviour unchanged). A real composition bug was found and fixed: the
game service previously looked up students only in its own store (which seeded
just the demo student), so registered students with id ≥ 2 could not start a
session — now the student feature store is the single identity source.

**Next recommended action:** Task 5.4 — not started. Backlog candidates:
Supabase repository adapters for the game-session service, real content
authoring, or progression backend work (D-076).

## 2026-08-15 (Task 5.4 — COMPLETED)

**Stage:** Stage 5 – Production Supabase integration.

**Action:** Connected the Tasks 5.1–5.3 student + game system to the real
linked Supabase project (`fmauqixvdpdgrghuapfs`) through a production server.
One service-role client (`getSupabaseServerClient`, shared across the
game-session, student and mission repository sets) wires the existing
`GameSessionService`, `StudentService` and mission services to the existing
PostgREST adapters — student → game session → 3 rounds → student answers →
server scoring → scores ledger — reusing contracts and leaving the UI and
engines unchanged. New `createProductionApi` composition with a binary-safe
HTTP bridge (multipart avatars) and a `runProductionServer` runner (port 4101).
Full `.env` support per user request: server reads `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` from `.env` (gitignored) via `node --env-file=.env`
(`api:production` + `smoke:production` scripts). Progress writes
(`student_progress`/`student_level_progress`) documented as deferred to the
progression task by user decision. NO schema change, no new packages.

**Live smoke verification** surfaced and fixed three fake-masked production
bugs in `game-session/repositories/supabase.js`: (1) `createRoundsForSession`
insert-select returned rounds unordered → a fresh session could report round 3
as current (added `.order('round_number')`); (2) `total_time_ms` was passed
through `toIso()` → PostgREST `invalid input syntax for type bigint`
(fixed: bigint milliseconds, only `completed_at` ISO); (3) non-numeric ids
serialized as literal `NaN` → bigint syntax error instead of clean 409/404
(added `finiteId()` guards in the supabase repos; mission `findById` too). A
latent production bug was also fixed: `getSupabaseServerClient` was sync and
destructured `createClient` from the un-awaited dynamic-import Promise →
`createClient is not a function` on first live use (now async, all call sites
await it).

**Files created:**
- `src/features/game-session/api/production-server.js` — production
  composition + binary-safe `handle()` + `runProductionServer`.
- `src/features/game-session/testing/fake-supabase-client.js` — deterministic
  PostgREST-shaped fake + `questionFixtureToRow`.
- `src/features/game-session/testing/supabase-repositories.test.js` (7 repo
  contract tests), `production-api.test.js` (5 production API tests).
- `scripts/smoke-production.mjs` — idempotent live smoke (pre-cleanup,
  finally-cleanup, FK-safe order, baseline restoration check).
- `.env` (gitignored) — real project URL + service-role key.
- `reports/25-task-5.4-production-supabase-integration.md` — this report.

**Files modified:**
- `src/features/game-session/repositories/supabase-client.js` — async
  `getSupabaseServerClient`.
- `src/features/game-session/repositories/index.js`,
  `student/repositories/index.js`, `mission/repositories/index.js` — await
  the client in supabase mode.
- `src/features/game-session/repositories/supabase.js` — round ordering,
  `total_time_ms` bigint, `finiteId` guards.
- `src/features/mission/repositories/supabase.js` — `findById` NaN guard.
- `package.json` — `api:production`, `smoke:production`.
- `.env.example` — server-only Supabase vars documented.
- `reports/04-todo.md`, `reports/README.md`, `reports/03-decisions.md`,
  `README.md` — tracking updates.

**Packages installed:** none.

**Configuration changes:** `.env` (gitignored) created; scripts use
`node --env-file=.env`.

**Commands executed:** `npm test` (927), `npm run lint`, `npm run build`,
`python3 schemas/validate.py` (PASS), `npm run smoke:production` against the
real project (35/35), direct live-DB baseline query, `rg` bundle security
probe over `dist/assets`.

**Result:** `npm test` = **927 pass / 0 fail** (was 915; +12 supabase repo +
production API tests). oxlint clean. `vite build` clean. Schema validator
PASS (unaffected). Live HTTP smoke **35/35**: identity, catalogue seed intact,
pre-cleanup idempotent, 3 seeded questions, health, register, me, private
avatar, mission streams/levels, start → current round resumes → second start
resumes same session → 3 server-scored correct submits (100 pts each) → no
pending round → finish (300/300 + code + breakdown) → error matrix
(401/403/404/409) → DB assertions (completed session, 3 answered rounds, 3
student_answers, score ledger, hashed token, private avatar, server-side-only
correct answers) → cleanup restores exact baseline
(questions=0 students=0 schools=0 sessions=0 scores=0 answers=0). Bundle
probe (three-way, `grep` — `rg` is not installed here, so the blanket "0
files" probes of earlier stages were false passes and are corrected in this
report): **A. credentials** (`SUPABASE_SERVICE_ROLE_KEY`/`service.role`/
`VITE_SUPABASE`/`sb_secret_`) 0 files; **B. actual answer data** (demo
fixtures / `correct_answer:` JSON) 0 files; **C. informational prose** — the
field names appear once each as static error/description strings (schema-check
registry + `SECURITY_CORRECT_ANSWER_EXPOSED` guard), which is the security
guard itself, not answer data.

**Warnings / errors:** Three real production bugs found and fixed by the live
smoke (§ above) plus the latent `getSupabaseServerClient` async bug. One smoke
check was re-ordered: "404 unknown round" now targets a fresh active session
because `loadAndGuardSession` correctly rejects a completed session with 409
before a round lookup can 404. A pre-existing flaky assertion was hardened
(D-059): the level-1 timer assertions in `student-game-api.test.js` and
`production-api.test.js` hardcoded 90s, but demo question id 4 carries
`timerOverrideSeconds: 45` and seeded-random selection can surface it first —
the assertions now derive the expected value from the selected question's
override. Suite re-run twice: 927/927 both times.

**Next recommended action:** Task 5.5+ — not started. Backlog candidates:
progression backend work (D-076, including the now-deferred
`student_progress` writes), real content authoring pipeline, remaining
polish. Not begun per plan.

## 2026-08-15 (Task 5.5 — COMPLETED)

**Stage:** Stage 5 – Student progression backend + level unlock persistence.

**Action:** Implemented the D-076 deferred progression entirely in the backend
with a new `src/features/progression/` feature. `ProgressionService` is the
single authority: `assertLevelUnlocked` gates every session start (level 1
open; level N requires N−1 completed for the same stream **or** an active
special-access grant) and `recordCompletion` writes the deferred rows on
`finishSession` — `student_level_progress` UPSERT on `(student_id, level_id)`
(best-score max, attempts+1, first `completed_at` preserved) plus the
recomputed stream aggregate `student_progress` UPSERT on
`(student_id, stream_id)` (`current_level = clamp(max+1,1,5)`,
`completed_levels`, `stream_completed`). Re-finishing a completed session is
idempotent (stored payload returned, no writes). Game-session repos gained a
`progressionRepository` + `LevelRepository.listForStream` (memory + Supabase +
contracts); the deterministic PostgREST fake gained `upsert`. Mission
`resolveLevelAccess`/`buildLevelContext` gained optional
`previousLevel`/`previousLevelProgress` so the picker renders a
progression-unlocked level as `available` (distinct from a grant's `special`);
`MissionService` threads the same-stream previous level per card. Special
access stays independent — a grant opens play but never fabricates a
completion. Removed the old grant-only `GameSessionService.applyUnlockRule`.

**Tests:** 39 new (16 progression-service, 9 game-session E2E over the student
API, 6 supabase repo contracts, 8 mission access) covering the unlock matrix,
chain (no leapfrog), cross-stream + cross-student isolation, idempotent
re-finish, special-access interplay, payload secrecy, and the exact 0001
column names via UPSERT round-trips. `package.json` test glob extended with
`progression`. Suite 927 → **966/966** (three consecutive runs), lint clean,
build clean, `schemas/validate.py` PASS (24/72/12/12). NO schema change, no
new packages.

**Live smoke (extended 35 → 49 checks):** level-1 finish writes
`student_level_progress` (attempts 1, best) + `student_progress`
(current_level 2); level-2 start is then 201 (progression unlock, no grant);
level-2 finish advances the aggregate to current_level 3; level 3 passes the
unlock gate (pool-limited only — `GAME_INSUFFICIENT_POOL`, not locked); a
fresh student stays `GAME_LEVEL_LOCKED` on 2 and 3. 49/49 PASS, live DB
restored to exact baseline (questions=0 students=0 schools=0 sessions=0
scores=0 answers=0 level_progress=0 stream_progress=0). Bundle probe
(three-way `grep`, `rg` absent): **A.** credentials 0 files; **B.** actual
answer data (`"mappings"`, demo fixture content, `"zones":[...]`) 0 files;
**C.** informational prose only — `correctAnswer`/`acceptableIds` appear once
each as the `SECURITY_CORRECT_ANSWER_EXPOSED` guard message and a
schema-check registry description.

**Warnings / errors:** One smoke check was written incorrectly at first —
after completing level 2, level 3 is legitimately unlocked, so the "level 3
still locked" assertion was reworded to assert the unlock gate passed
(pool-limited only). No production runtime bugs surfaced.

**Next recommended action:** Task 5.6+ — not started. Backlog candidates:
leaderboards, admin/progression viewing, real content authoring, remaining
polish.

---

## 2026-08-16
**Stage:** Task 5.6 — student profile + progress dashboard.

**Action:** Built the editable profile + safe progress dashboard. Backend:
`StudentService.updateProfile` — identity from the session token only; the
raw body goes through the exact `validateRegistrationInput` gate (foreign
fields like `score`/`studentId` → `400 STUDENT_UNEXPECTED_FIELD`); school
name resolved to `school_id`; repository `updateProfile` touches exactly the
editable 0001 columns (`initials`, `full_name`, `school_id`, `grade`), never
`login_code`. `ProgressionService.getStudentOverview({ studentId })` (new
optional `streamRepository` dep) returns a read-only safe projection: per
stream exactly `{ id, number, name, status, access, replayable }` per level
(no attempts/bestScore per level) + safe aggregates (currentLevel clamp,
completion percent, stream-level bestScore/totalAttempts, nextLevel = first
non-completed non-locked level) + `overall` totals. API: `PUT /api/student/me`
and `GET /api/student/me/progress` on the student Hono app;
`createStudentApi({ service, progressionService = null })` backward
compatible; dev + production servers wire `profileProgressionService` from
the mission `streamRepository` (removed the duplicate `studentApp` const in
the dev server). Client: `studentApiClient.updateProfile`/`getProgress` +
`useStudentProgress`/`useUpdateProfile`/`useUploadAvatar` (mutations
invalidate `['student','me',token]`). Frontend: real `/student/profile` page
(`StudentProfilePage.jsx` + `student-profile.css`, exported
`ProgressOverview`, `StreamCard`, `Statistics`, `PhotoHalo`,
`ProfileEditForm`) — photo halo, validated edit form, per-stream progress
cards with five level pips + `role="progressbar"`, statistics,
Continue/Back-to-mission navigation, session-expiry guard (Navigate to
register). Entry points on the register success/returning panels and the
mission header.

**Files created:** `src/pages/StudentProfilePage.jsx`,
`src/pages/student-profile.css`,
`src/features/student/testing/profile-service.test.js`,
`src/features/student/testing/profile-api.test.js`,
`src/features/student/testing/frontend-profile.test.js`,
`src/features/progression/testing/progression-overview.test.js`,
`reports/27-task-5.6-student-profile-progress.md`.

**Files modified:** `src/features/student/service/student-service.js`,
`src/features/student/repositories/{contracts,memory,supabase}.js`,
`src/features/student/api/server.js`,
`src/features/progression/service/progression-service.js`,
`src/features/game-session/api/{dev-server,production-server}.js`,
`src/features/student/api/{client,queries}.js`, `src/router.jsx`,
`src/pages/StudentRegisterPage.jsx`, `src/pages/StudentMissionPage.jsx`,
`scripts/smoke-production.mjs`, `reports/{02-development-log,03-decisions,
04-todo,README}.md`, root `README.md`.

**Packages installed:** None. No new dependencies.

**Configuration changes:** None.

**Commands executed:** `node --test` on the four new test files (iterate),
`npm test` (twice, 1006/1006), `npm run lint` (clean), `npm run build`
(clean), `python3 schemas/validate.py` (PASS 24/72/12/12), `npm run
smoke:production` (58/58), bundle grep probe over `dist/assets`.

**Result:** 40 new tests → suite 966 → **1006/1006**. Lint clean, build
clean, schema validator PASS. Live smoke extended 49 → **58/58** against
`fmauqixvdpdgrghuapfs`: profile update persists (school + grade), `me`
reflects it, foreign `score` + forged `studentId` rejected (`400
STUDENT_UNEXPECTED_FIELD`), fresh overview all-zero, overview advances
truthfully after level 1 and level 2, per-level rows expose only the approved
level surface, student B stays zero (isolation). Cleanup switched to the
ilike `STEM QUEST Smoke %` pattern so both smoke schools are removed; DB
restored to exact baseline (questions=0 students=0 schools=0 sessions=0
scores=0 answers=0 level_progress=0 stream_progress=0). Bundle probe
(three-way `grep`): **A.** credentials 0 files; **B.** JWT material 0 files;
**C.** answer data 0 files (only the `correctAnswerExposed` guard error name
as prose). NO schema change, no new packages.

**Warnings / errors:** (1) Two smoke assertions initially expected `400
STUDENT_INVALID_INPUT` for foreign fields; the real contract is the distinct
`400 STUDENT_UNEXPECTED_FIELD` — smoke assertions corrected. (2) A
constant-nullishness lint warning (`Number(x) ?? 0`) in the overview
aggregation fixed to `Number(x) || 0`. (3) `nextLevel` originally picked the
first non-locked level (always level 1); corrected to skip completed levels
so it reports the true next playable level. No production runtime bugs
surfaced.

**Next recommended action:** Task 5.7+ — not started. Backlog candidates:
leaderboards, admin/progression viewing, real content authoring, remaining
polish.

## 2026-08-16
**Stage:** Task 5.7 — live stream leaderboard.

**Action:** Built four stream Top-10 leaderboards over the existing
`leaderboard_entries` table (0001 §20 — NO schema change, no migration).
`LeaderboardService` (`recordBestScore` + `getTopForStream` +
`getAllLeaderboards`, exported pure `isBetterScore` + `TOP_N = 10`): write
path validates score (0–300 int), derives `displayName` as `${initials}
${fullName}` from the student record, and upserts only when strictly better
(D-010/D-029: score DESC, completion_time_ms ASC NULLS LAST, achieved_at ASC,
LIMIT 10). Repositories: `MemoryLeaderboardRepository` (dev/tests) and
`SupabaseLeaderboardRepository` (prod — one covered read on
`leaderboard_top10_idx`, one point read, single `(student_id, stream_id)`
upsert). Public Hono API `GET /api/student/leaderboards` +
`/api/student/leaderboards/:streamId` mounted before `/api/student/*`;
optional Bearer token only upgrades the payload with `self: true`;
`toPublicEntry` strips `studentId` (never exposed; login code / token hash /
school id / grade never leave the server). Best-effort
`GameSessionService.finishSession` hook calls `recordBestScore` after the
completion is recorded — a failure is caught + logged, never 500s the
finish; the next better attempt repairs the row. Browser Realtime
(**D-080**): `@supabase/realtime-js@^2.112.3` added; refcounted
`createLeaderboardRealtimeController` (one socket regardless of subscribers)
on channel `leaderboard_entries`; `useLiveLeaderboard` invalidates the
`['leaderboard']` prefix; `realtimeConfig()` reads
`import.meta.env?.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at runtime
and reports `UNAVAILABLE` when absent → UI shows "Live updates off"
(**`.env` untouched** — the public anon key stays a deploy-time config
step). Frontend: real `/leaderboards` page (`LeaderboardPage.jsx` +
`leaderboard.css`, reusable exports `LeaderboardBoard`, `LeaderboardTable`,
`LeaderboardSkeleton`, `LeaderboardStatus`, `LeaderboardError`, `LiveBadge`)
— tabs, self-row highlight, retry action, aria-live, keyboard tabs,
reduced-motion; "View live leaderboards" entry point added to the mission
page. The deterministic PostgREST fake gained the `leaderboard_entries`
table + multi-column `.order()` with Postgres null semantics.

**Files created:** `src/features/leaderboard/` —
`contracts/contracts.js`, `errors.js`,
`repositories/{memory,supabase,index}.js`,
`service/leaderboard-service.js`, `api/server.js`,
`client/client.js`, `queries/queries.js`, `realtime/realtime.js`,
`testing/{leaderboard-repository,leaderboard-service,leaderboard-api,
leaderboard-realtime,leaderboard-session-hook,frontend-leaderboard}.test.js`;
`src/pages/LeaderboardPage.jsx`, `src/pages/leaderboard.css`;
`reports/28-task-5.7-live-leaderboard.md`.

**Files modified:** `src/features/game-session/service/game-session-service.js`
(optional `leaderboardService` + best-effort finish hook),
`src/features/game-session/api/{dev-server,production-server}.js`
(leaderboard wiring + `createStackedApp` mount order),
`src/features/game-session/testing/fake-supabase-client.js`,
`src/router.jsx`, `src/pages/StudentMissionPage.jsx`, `package.json`
(realtime-js dep + leaderboard test glob), `scripts/smoke-production.mjs`,
`reports/{02-development-log,03-decisions,04-todo,README}.md`, root
`README.md`.

**Packages installed:** `@supabase/realtime-js@^2.112.3` (browser Realtime
only; the service-role client stays server-side).

**Configuration changes:** None (no `.env` change; `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` optional at deploy time for live updates).

**Commands executed:** `node --test` on the six leaderboard test files
(iterate), `npm test` (1056/1056), `npm run lint` (clean), `npm run build`
(clean), `python3 schemas/validate.py` (PASS), `npm run smoke:production`
(69/69), bundle grep probe over `dist/assets`.

**Result:** 50 new tests → suite 1006 → **1056/1056**. Lint clean, build
clean, schema validator PASS. Live smoke extended 58 → **69/69** against
`fmauqixvdpdgrghuapfs`: all-four-streams endpoint; science board shows A's
best 300 at rank 1 with `self:true`; technology board isolated (empty);
public no-token access (`self:false`); student B (never played) has no
entry; DB row materialised with derived display name "SS Smoke Student";
**best-score rule verified live** — a lower-scoring replay finishes cleanly,
does NOT overwrite the 300, and keeps a single row; 404 for unknown stream;
no private fields in any payload. Cleanup: `leaderboard_entries` added to
baseline + restore; DB restored to exact baseline (leaderboard=0). Bundle
probe (three-way `grep`): **A.** credentials 0 files; **B.** JWT material —
no such secret exists in the app; **C.** answer data 0 fixtures (only the
server-response display strings `waiting for server scoring.` /
`correctnessFraction ?? 0` and error prose). NO schema change.

**Warnings / errors:** (1) **Production bug caught by smoke** — the Supabase
upsert sent the ISO string `1970-01-01T00:00:18.088Z` into the `bigint`
`completion_time_ms` column (`toIso` instead of `toMs`), silently skipping
every best-score write; fixed in `repositories/supabase.js`, smoke re-ran
green with leaderboard rows verified live. (2) **SSR test quirk** —
react-query v5 renders an optimistic `pending` for an errored no-data query
under `renderToStaticMarkup`, so the page-level error assertion could never
pass; extracted a pure `LeaderboardStatus` gate and tested its error/empty
branches directly (client-side error rendering unchanged and correct). (3)
Class-count regexes in the frontend test counted only non-active
`class="lb-tab"`/`class="lb-row"` strings; widened to `(?= |")` so
active/self variants count. (4) Local smoke noise from parallel runs left an
orphan server on port 4101 (EADDRINUSE + interleaved logs) — not a product
issue; clean runs pass 69/69.

**Next recommended action:** Task 5.8+ — not started (per plan). Backlog
candidates: admin/progression viewing, real content authoring, remaining
polish.

## 2026-08-16 (Task 5.8 — COMPLETED)

**Stage:** Stage 5 – badges & certificates.

**Action:** Built backend-authoritative badges + certificates over the
existing `badges`/`student_badges`/`certificates` tables (0001 §17–§19, 0002
4-badge seed — NO schema change, no migration, no new packages). New
`src/features/achievements/`: `AchievementsService.awardForCompletion` is the
single write path called by `GameSessionService.finishSession` (best-effort,
after the leaderboard hook); it gates on a new trusted read
`getStreamProgress` (`student_progress.stream_completed`, added to the
progression repo contract + memory + Supabase), then awards the
stream-completion badge (slug derived server-side, idempotent on UNIQUE
`(student_id, badge_id)`) and issues the stream certificate (idempotent on
UNIQUE `(student_id, stream_id)`, `SQ-XXXXXX-XXXXXX` public code via
`crypto.randomInt` with an unambiguous alphabet, `certificate_code`-collision
retry). Per the **user decision**, the certificate PDF is a **hand-rolled
minimal PDF** (`pdf-generator.js`, D-081) — single US-Letter page, base-14
Helvetica byte streams, ASCII width tables for centering, escaping +
non-ASCII neutralisation, byte-exact xref — generated ON DEMAND, never stored
(no certificates Storage bucket; `document_path`/`generated_at` stay NULL).
API (Hono, mounted before `/api/student/*` in `createStackedApp`):
`GET /api/student/achievements`, `GET /api/student/certificates`,
`GET /api/student/certificates/:id/pdf` (`application/pdf`), public
`GET /api/certificates/verify/:code` (safe surface only — no student_id,
login code, token/hash, score or answers). Revocation (service-role flag)
→ list drops it, PDF **410**, verify `valid:false`. Memory + service-role
Supabase repos mirror the 0001 columns/constraints; the fake PostgREST client
gained `badges`/`student_badges`/`certificates` + `BADGE_SEED`. Frontend:
real `/student/achievements` page (`StudentAchievementsPage.jsx` +
`student-achievements.css`, badge cards, certificate rows + download, verify
panel) + TanStack hooks + mission-page link. 50 new tests (47 achievements +
3 game-session hook tests incl. the real finishSession→award flow, idempotent
repeat finish, best-effort failure path); `npm test` **1106/1106** (2 runs),
lint clean, build clean, schema validator PASS (24/72/12/12). Live smoke
**84/84** (was 69) against `fmauqixvdpdgrghuapfs`: catalogue before/after,
hook award via service-role-seeded stream completion, DB rows, valid PDF,
public verify safe surface, **ownership isolation** (student A → C's PDF
404), revoke → list drop + 410 + `valid:false`, unknown code 404, no private
fields; DB restored to exact baseline incl. `student_badges` + `certificates`
back to 0. Bundle probe: service-role key 0 files, PDF-generation secrets 0
files (`generateCertificatePdf`/`makeCertificateCode`/`certificate_code`/
`%PDF-`), answer fixtures 0 (`correctAnswerExposed` is the client-mode guard
name); `loginCode` only on the register success panel (intended).

**Warnings / errors:** (1) Smoke killed by the shell timeout on the first run
— network-latency-bound against Supabase (~3 s/check), so it must run
detached (`nohup`) or with a long tool timeout; second run passed 84/84. (2)
Smoke upserted columns `student_progress` does not have (`best_score`,
`total_attempts`) and `current_level: 6` (CHECK 1–5); fixed to
`current_level: 5, completed_levels: 5, stream_completed: true`. (3) Smoke
called `app.achievementsService` but `createProductionApi()` returns it as a
sibling of `app`; destructured explicitly. (4) Test iteration: memory
certificate repo did not enforce `certificate_code` uniqueness (no error →
no collision retry) — added the duplicate-key guard; xref test compared a
12-char slice to a 7-char expectation — fixed the slice length; hook tests
needed the mission store seeded with the 4 streams and `register({ body })`
shape — fixed. (5) oxlint: removed unused `PAGE_H`, rewrote `escapePdfString`
char-by-char (`no-control-regex`), dropped two unused `harness` vars.

## 2026-08-16 (Task 5.9 — COMPLETED)

**Stage:** Stage 5 – admin panel foundation + Supabase Auth.

**Action:** Built browser-side Supabase Auth admin login/logout with a real
session state machine, a protected `/admin` route boundary, a server-side
`requireAdmin` middleware and a safe `GET /api/admin/me`. New server feature
`src/features/admin/`: `AdminService.resolveAdmin(token)` — service-role
client `auth.getUser(token)` establishes the authenticated identity (rejects
missing/expired JWTs and opaque student-session tokens), then
`admins.findActiveByAuthUserId(user.id)` checks the existing 0001
`public.admins` table for `id = user.id AND is_active = true` (D-082: the
callable server-side `is_admin()` equivalent, crisp 401 vs 403 — invalid/
absent token → `ADMIN_UNAUTHENTICATED`/`ADMIN_INVALID_TOKEN`, valid identity
not an active admin → `ADMIN_FORBIDDEN`). Reusable `requireAdmin` middleware
runs in front of every `/api/admin/*` route; `createAdminApi` exposes
`GET /api/admin/me` returning only `{ admin: { id, displayName, role } }`
(no token/email/secret ever). New browser feature `src/features/admin-auth/`:
anon-key Supabase client (`persistSession:false`), access token mirrored to
`sessionStorage` (kiosk-friendly, survives reloads), injectable
state-machine controller (`loading/unavailable/unauthenticated/authenticated`;
403 during restore clears the token → `unauthenticated` with no redirect
loop; 403 during signIn throws `AdminAuthForbiddenError` + best-effort
signOut), React context/provider, and `adminApiClient.getMe`. Real pages:
public `/admin/login` (`AdminLoginPage`) + guarded `/admin` parent
(`AdminAuthProvider` + `AdminShell` with placeholder nav for Dashboard,
Questions, Students, Progress, Leaderboards, Badges & Certificates, Settings)
+ `admin.css`. Wiring: `createStackedApp` gained `adminApp = null`; the
production server builds the admin repos/service/app and mounts `adminApp`
**before** `/api/student/*`; the demo server passes null (no Supabase Auth in
the demo env). Memory + service-role Supabase repos; the fake PostgREST client
gained `admins` + `auth.getUser` + `addFakeAuthUser`/`seedFakeAdmin`. NO
schema change, no migration, no new packages (`@supabase/supabase-js` already
a dependency). Question Builder / 2,000 questions explicitly NOT built (out of
scope). 37 new tests (admin API 10, admin repo 5, auth controller 14,
frontend admin-auth 8); `npm test` **1143/1143** (2 runs), lint clean, build
clean, schema validator PASS (24/72/12/12). Live smoke **91/91** (was 84)
against `fmauqixvdpdgrghuapfs`: temporary Auth admin user + `admins` row
signs in → safe `/api/admin/me` (role=admin, raw payload passes the
no-secrets probe), 401 missing/bogus, a **student session token never grants
admin (401)**, a valid non-admin identity → **403 `ADMIN_FORBIDDEN`**, the
active-admin row confirmed, and the temporary Auth users + rows cleaned up
with the DB back to its exact baseline incl. `admins=0` + the Auth user pool.
Bundle probe: service-role key 0 files, `SUPABASE_SERVICE_ROLE_KEY`/
`VITE_SERVICE_ROLE_KEY` 0, admin authz identifiers
(`public.admins`/`is_admin()`/`display_name`/`is_active`) 0, admin
credential material 0 (only login-form `password` labels + supabase-js
library storage-prefix strings — verified by context inspection).

**Warnings / errors:** (1) Live smoke seed `fetch failed` twice on first
attempts — transient network flakiness to Supabase (nothing logged by the
app); runs passed on retry; the smoke must run detached (`nohup`). (2) On
two consecutive runs every DB assertion after the admin section failed
(`total=undefined`) — diagnosed as a **smoke-script bug, not product code**:
supabase-js switches a client's effective `Authorization` to the signed-in
user's access token, so the shared client made all later `db.from()` queries
as the non-admin user → RLS-empty results. Fixed by giving the smoke a
dedicated `authDb` for `auth.admin.*`/`signInWithPassword`, keeping the
service-role data client clean; added DB-query error capture to the affected
checks for future diagnosability. (3) oxlint: no new findings — the
context/provider split keeps the router's `only-export-components` rule
satisfied; lint clean.

**Next recommended action:** Task 5.10 **not started** (per plan). Backlog
candidates: Question Builder, real content authoring, admin CRUD on the
shell's placeholder sections, remaining polish.

**Next recommended action:** Task 5.9 **not started** (per plan). Backlog
candidates: admin/progression viewing, real content authoring, remaining
polish.

## 2026-08-17 (Task 5.10 — COMPLETED)

**Stage:** Stage 5 – Admin Question Builder (foundation).

**Action:** Built the Admin Question Builder catalogue surface and editor
foundation. New server feature `src/features/admin/questions/`:
`QuestionService` is the single authority over `GET /questions` (preview
list), `GET /questions/catalogue` (4 streams × 5 level bands + available
activity types), `GET /questions/:id` (full admin surface), `POST /` (create
**draft v1** — status forced to `draft`, `version` server-managed,
`activitySchemaVersion` derived server-side), `PUT /:id` (in-place update,
**version preserved**, published/archived → 409 `QUESTION_READONLY_PUBLISHED`
per D-044), `DELETE /:id` (draft only); all behind `requireAdmin` (D-082).
Validation is **three-layer**: (A) AJV envelope
(`question.schema.json`, grade 6..11, `^[a-z][a-z0-9_]{0,31}$` ids) + payload
+ correct-answer + meta schemas (`meta.schema.json`
`additionalProperties:false`, no `hints` — hints live at the envelope top
level); (B) resolved plugin `validatePayload` semantics; (C) cross-document
plugin rules (pattern `acceptableIds` exist + schema-key alias, memory groups
cover the deck, ordering no-duplicates, fill-complete blanks → accepted
values, scenario entry/next/terminal references). Memory + service-role
Supabase repositories (forced `QUESTION_SELECT` joining streams/levels/
activity_types; row-mapper maps DTO↔row incl. `meta`). `correctAnswer`/`meta`
are **server-only**: list/catalogue project preview rows only, and the engine
render context **throws `SECURITY_CORRECT_ANSWER_EXPOSED`** if a question with
`correctAnswer`/`correct_answer`/`answerKey` is rendered — `QuestionPreview`
therefore renders a student-visible snapshot (prompt/instructions/payload)
through a new **`createDefaultClientActivityEngine()`** that registers all 10
plugins payload-only (mirroring the server registry). New browser feature
`src/features/admin-questions/`: TanStack Query hooks, `QuestionList`
(previews only, draft-only delete), `QuestionEditor` (catalogue-driven
new/edit via `/admin/questions/new` + `/admin/questions/:id/edit`,
**lazy template init** — fixes SSR under `renderToStaticMarkup`, collapsed
correct-answer block, client 3-layer advisory validation + server-error
`fields[]` display), `QuestionPreview` (per-`kind` for all 10 types), and
`schema-valid starter templates for all 10 activity types`. One required DB
change: `questions.meta jsonb` (migration `0004_add_questions_meta.sql`,
idempotent `add column if not exists`, RLS-neutral, D-043 pre-authorized) —
**user-approved** to apply in the Supabase SQL editor, **pending** at write
time (live builder smoke blocked on `column questions.meta does not exist`
until applied). 59 new tests (46 backend validation/service/api over the
production stack incl. the fake Supabase client, 13 frontend + template
validity for all 10 types + client-engine plugin registration);
`npm test` **1202/1202** (2 runs), lint clean, build clean, schema validator
PASS (24/72/12/12). Live smoke extended to **106 checks** (91 + meta-column
probe + 14 builder checks: catalogue, before-list=6 seeded, create→draft v1
with meta persisted, get full surface, list previews only, update preserves
version with `status:'draft'` in the body — the service rejects `published`
targets, invalid draft → 400 `QUESTION_VALIDATION_FAILED` with 3 field errors
**and not persisted**, 404 unknown, DELETE, list back to 6, 401 no token, no
secret keys leak); builder section verified offline against the production
stack + fake Supabase client (create 201, invalid 400/3 fields, full HTTP
round-trip via node `http`). Bundle probe: credentials/correct-answer `$id`s/
`public.admins` identifiers 0 files; `correctAnswer` only as admin-editor
response handling + shared plugin method signatures + the security guard
(D-051/D-052 baseline), `acceptableIds` only in pattern rule code. DB baseline
fully restored and re-verified this session (incl. cleaning 6 orphaned
smoke-test questions + their game sessions left by a SIGPIPE-killed `| head`
smoke run — removed in FK-safe order; questions/students/schools/
game_sessions/scores/admins all 0, Auth users 0). `reports/31-task-5.10-admin-question-builder.md`.

**Warnings / errors:** (1) Original 6 failing frontend tests — the client
activity engine registered **no plugins**, so `validateDraft`/preview hit a
missing plugin; fixed by registering all 10 in `createDefaultClientActivityEngine`.
(2) SSR: `QuestionEditor` initialized from the DB draft in `useEffect` — no
effect runs under `renderToStaticMarkup` → blank editor; fixed with lazy
`useState` init. (3) `engine.render` **threw `SECURITY_CORRECT_ANSWER_EXPOSED`**
because the draft included `correctAnswer`; `QuestionPreview` now strips it
into a student-visible snapshot. (4) Original templates used hyphenated ids
(`item-1`) violating `^[a-z][a-z0-9_]{0,31}$` and had wrong field shapes —
rewrote all 10 to be schema-valid. (5) Grade-bounds UX checks were 1..12 vs
the contract's 6..11 — aligned. (6) Hono trailing-slash gotcha: admin app is
mounted via `app.use('/api/admin/*')`, so `/api/admin/questions/` → 404
`ADMIN_UNAVAILABLE`; smoke uses exact paths (`builder('')`). (7) PUT body must
carry `status:'draft'` — the service rejects `published` targets. (8) Smoke
leftover cleanup: a `| head -30` probe killed a smoke run via SIGPIPE before
`finally` cleanup, orphaning 6 seeded questions + sessions; cleaned in
FK-safe order and baseline re-verified. (9) Live builder smoke is **blocked
until migration 0004 is applied** (`questions.meta` column missing); offline
production-stack verification passes, and check 4 of the smoke is the live
gate.

**Next recommended action:** Task 5.11 **not started** (per plan): apply
migration `0004` (user), then re-run the live smoke to green the builder
checks; backlog: per-type visual authoring forms, question-media upload
integration, publish/review workflow, real content authoring.

## 2026-08-17 (Task 5.11A — COMPLETED)

**Stage:** Stage 5 – Admin Visual Question Authoring (first four types).

**Action:** Replaced the raw-JSON authoring experience for Drag & Drop,
Matching, Ordering and Sorting with visual authoring forms. New
`src/features/admin-questions/visual-editor/`: `model.js` (pure, DOM-free:
`nextId` reusing `^[a-z][a-z0-9_]{0,31}$`, entity makers, answer builders
`buildMappings`/`buildPairs`/`buildOrder`/`buildAnchors`/`buildAssignments`
that preserve existing references and re-home dangling ones, `moveInList`),
`primitives.jsx`, four per-type forms, `registry.js` (VISUAL_FORMS,
`hasVisualForm`, advisory `checkAnswerIntegrity` reusing the exact plugin
cross-document rules — no duplicated/invented UI rules, no correct-answer
schema bundled), and `index.jsx` exporting only the `VisualFormFor` component.
`QuestionEditor` reworked into Basic information / Activity editor / Correct
answer (visual types: "derived from the visual form", no raw JSON) / Authoring
metadata / Preview / Actions; the other six types keep the raw JSON editors;
published/archived stay read-only (D-044); draft now initializes synchronously
from the query cache for deterministic SSR. `aq-*` styles added to
`src/pages/admin.css`. NO schema change, no new packages.

**Verification:** `npm test` 1229/1229 (27 new tests in
`visual-forms.test.js` — model, SSR `renderToStaticMarkup` renders, and editor
integration incl. published read-only and raw-JSON fallback, validated through
the server's `createQuestionValidator`); `npm run lint` clean (split registry
out of `index.jsx` to satisfy react fast-refresh); `npm run build` passes
(editor chunk 197.49 kB / gzip 53.92 kB); `python3 schemas/validate.py` PASS
(24/72/12/12); bundle probe clean (service-role creds, correct-answer `$id`s,
`public.admins`/`is_admin()` all 0 files; `SECURITY_CORRECT_ANSWER_EXPOSED`
guard active); live `npm run smoke:production` **106/106 PASS** (migration 0004
now applied) with DB restored to exact baseline. `reports/32-task-5.11a-visual-authoring.md`.

**Warnings / errors:** (1) First drag-drop SSR test wrongly asserted the form
does NOT include "Goes to" — the form intentionally has a per-item zone select;
asserted positively instead. (2) Editor integration test had a dead `void slug`
loop — removed. (3) Ordering-removal test removed below the 3-item schema
minimum — rewritten with a 4-step list. (4) Sorting "unassigned item" test hit
the schema minItems before the cross-doc rule — rewritten to call the exact
`validateAssignments` plugin rule directly. (5) `index.jsx` (registry +
component) tripped `react(only-export-components)` lint warnings — split
non-component exports into `registry.js`.

**Next recommended action:** Task 5.11B — visual forms for the remaining six
activity types (fill-complete, image-interaction, pattern, memory,
scenario-challenge, number-logic) using the same thin-form/model/registry
architecture, then media-upload integration and a publish/review workflow. Not
started (per the stop rule after 5.11A).

## 2026-08-17 (Task 5.11B — COMPLETED)

**Stage:** Stage 5 – Admin Visual Question Authoring (remaining six types).

**Action:** Completed visual authoring for Fill & Complete, Image Interaction,
Pattern, Memory, Scenario Challenge and Number / Logic, reusing the 5.11A
architecture unchanged. Six new thin forms under
`src/features/admin-questions/visual-editor/`: `fill-complete-form.jsx`
(template + `___` placeholders, per-blank type/label/prefix/suffix/maxLength
and accepted-answers editors; correct answer split into the `answers` /
`numeric` / `expression` groups, emitted only when non-empty),
`image-interaction-form.jsx` (tap vs label, % hotspots with circle/rect hit
regions, required toggles and label placements), `pattern-form.jsx`
(construct-next / fill-missing / complete-sequence, reorderable sequence,
candidate bank, candidate/numeric/text answer rule with per-candidate
Acceptable toggles; fresh answers default to all candidates),
`memory-form.jsx` (deck settings, cards with group selectors, group chips;
groups live only in `correctAnswer`, sizes via `groupSizeRange`),
`scenario-challenge-form.jsx` (decision tree: entry selector, nodes with
options, next-decision links, optimal-option + acceptable toggles; optimalPath
is traversable by construction), `number-logic-form.jsx` (problem, answer
format, input mode, show-work, single vs multi-part with per-part specs;
`COMPATIBLE_TYPES` exported from the plugin). `model.js` gained 18 strict
helpers (`makeBlank`/`buildBlankAnswers`, `makeHotspot`/`makeImageLabel`/
`buildImageAnswer`, `makePatternElement`/`PATTERN_SHAPES`/`withPatternKind`/
`buildPatternAnswer`, `makeMemoryCard`/`makeMemoryGroup`/`buildMemoryGroups`,
`makeDecision`/`makeScenarioOption`/`buildScenarioAnswer`,
`makeNumberLogicPart`/`buildAnswerSpec`/`buildNumberLogicAnswer`) — deleted or
renamed entities are repaired/re-homed, never left dangling. `registry.js`
now maps all ten slugs in `VISUAL_FORMS` + `INTEGRITY_RULES` (reusing the six
plugins' exact cross-document rules; no duplicated rules); `QuestionEditor`
offers raw JSON only for unknown types. Added `NumberField` primitive and
`aq-subsection`/`aq-subsection__accepted`/`aq-row--element` CSS. NO schema
change, no new packages; correct-answer schemas still absent from the bundle.

**Verification:** `npm test` 1251/1251 (22 new tests in `visual-forms.test.js`:
model tests round-tripped through the server's `createQuestionValidator`,
SSR renders for all six forms, and editor-integration updates — registry now
asserts all ten visual + unknown-only raw JSON; run twice);
`npm run lint` clean; `npm run build` passes (editor chunk 237.87 kB / gzip
62.80 kB); `python3 schemas/validate.py` PASS (24/72/12/12); bundle probe
clean (service-role creds, correct-answer `$id`s, `public.admins`/`is_admin()`
all 0 files; `SECURITY_CORRECT_ANSWER_EXPOSED` guard active); live
`npm run smoke:production` **106/106 PASS (run twice)** with DB restored to
exact baseline. `reports/33-task-5.11b-visual-authoring.md`.

**Warnings / errors:** (1) The multi-part number-logic correct answer must
carry a schema-required top-level `type` — `buildNumberLogicAnswer` now emits
a neutral `{ type: 'exact', value: 0 }` alongside the per-part specs, matching
`schemas/examples/number-logic/partial-credit.json`. (2) Three new tests
initially produced schema-invalid drafts (empty `label` on a new fill-complete
blank, empty label `text`, empty scenario option `text`) — test fixtures now
author the required non-blank content. (3) `makeBlank`/`makeImageLabel`/
`makeDecision` defaults are authoring starting points; the advisory rules
surface incompleteness until the author fills required content.

**Next recommended action:** Task 5.12 — media upload integration for the
question builder (bucket upload, path validation, alt/thumbnail flows) then a
publish/review workflow so authored drafts can move to live distribution. Not
started (per the stop rule after 5.11B).

### 2026-08-17 — Task 5.12: secure question-media upload for the Admin Question Builder

**Objective:** let the admin upload images into the private `question-media`
bucket through the backend (never the service role in the browser), reference
them in any of the ten visual authoring forms, preview them via short-lived
signed URLs, and delete them with a non-destructive lifecycle — verified live.

**Server (new):**
- `src/features/admin/questions/security/media.js` — upload guardrails:
  `QUESTION_MEDIA_BUCKET`, `QUESTION_MEDIA_MAX_BYTES = 1048576`,
  `QUESTION_MEDIA_ALLOWED_MIME` (jpeg/png/webp), `QUESTION_MEDIA_URL_TTL_SECONDS
  = 3600`, `MEDIA_REF_PATTERN` (matches the media schema contract), `isSafeMediaRef`,
  `sniffImageExtension` (magic-byte sniffing for JPEG/PNG/WebP),
  `sanitizeMediaSegment` (traversal-proof, `../evil` → `eviletc`),
  `validateQuestionMediaFile` (EMPTY / TOO_LARGE / MIME / CONTENT / MISMATCH
  codes), `buildQuestionMediaPath` → `question-media/{owner}/uploads/{uuid}.{ext}`,
  and `collectMediaRefs` (recursive ref scan of a question payload).
- `src/features/admin/questions/errors.js` — four new codes:
  `QUESTION_MEDIA_VALIDATION_FAILED` (400), `QUESTION_MEDIA_NOT_FOUND` (404),
  `QUESTION_MEDIA_IN_USE` (409), `QUESTION_MEDIA_FORBIDDEN` (403) + factory methods.
- `src/features/admin/questions/service/media-service.js` —
  `QuestionMediaService` (upload / url / remove). Ownership is proven by the
  sanitized owner segment in the ref; removal additionally requires
  `questionRepository.isMediaRefInUse(ref) === false` (D-084). No media table.
- Repos: `contracts.js` documents `isMediaRefInUse` + the `QuestionMediaRepository`
  contract; `memory.js` gained `store.media` + `MemoryQuestionMediaRepository`
  + `isMediaRefInUse`; `supabase.js` gained `SupabaseQuestionMediaRepository`
  (upload `upsert:true`, `createSignedUrl` TTL, remove) + `isMediaRefInUse` via
  a `SELECT payload` scan. Both wired into the `create*QuestionRepositories`.
- API: `admin/questions/api/server.js` registers `POST /media` (multipart field
  `file`), `GET /media/url?ref=`, `DELETE /media?ref=` BEFORE `DELETE /:id`
  (so `DELETE /media` is not shadowed); `readMediaFile` helper; `statusByCode`
  extended; `createAdminQuestionsApi({ questionService, mediaService = null })`.
  `admin/api/server.js` + `production-server.js` thread `mediaService` through
  `createAdminApi`; the exported object now also returns `mediaService`.

**Client:**
- `client.js` — `MEDIA_REF_CLIENT_PATTERN`, `requestMultipart` helper (FormData,
  no hard-coded content-type), `uploadMedia(token, file)`, `mediaUrl(token, ref)`,
  `removeMedia(token, ref)`.
- `visual-editor/primitives.jsx` — `MediaReferenceEditor` now uploads/previews/
  replaces/removes: signed-URL preview effect (guarded `tokenFor()`, SSR-safe
  placeholder), busy + error states, best-effort old-ref cleanup on
  replace/remove (409 tolerated), `PENDING_REF` placeholder ref.
- `components/QuestionPreview.jsx` — new `PreviewImage` component (signed URL
  via `mediaUrl`, ref-code placeholder fallback for SSR) used in the
  `ImagePlaceholder` and `ElementList` item thumbnails.
- `src/pages/admin.css` — `aq-media__preview`, `aq-media__actions`,
  `aq-media__error`, `aq-preview__image(-box/-img)`.
- `testing/fake-supabase-client.js` — storage `remove(paths)` + `list(folder)`.

**Tests:** new `media-api.test.js` (21): auth matrix incl. production-stack 403,
JPEG/PNG/WebP uploads, TOO_LARGE / MIME / CONTENT / MISMATCH / EMPTY, traversal
+ bucket-injection 400, signed URL, 404, cross-admin 403 `MEDIA_FORBIDDEN`,
in-use 409 (incl. published/archived), draft-removal-frees-media, no secret
leakage, and a full production-stack flow (upload → signed URL → draft
referencing media → 409 → delete draft → 200 delete → object gone).
`frontend-admin-questions.test.js` +4 (media client contract, media error
mapping, QuestionPreview image SSR, MediaReferenceEditor SSR). `npm test`
**1276/1276**, lint clean, build clean (editor chunk 239.52 kB / gzip
63.46 kB), schema validator PASS (24/72/12/12).

**Live smoke:** extended `scripts/smoke-production.mjs` to **122 checks**:
baseline "question-media empty", upload 201 + safe ref (owner prefix, no client
filename), object exists in the bucket, signed preview URL, student-token 401,
bad content 400, oversized 400 `TOO_LARGE`, path-traversal 400, cross-admin
403, draft-references-media 201, in-use 409, removing the draft leaves storage
untouched, unreferenced media deletable 200, object removed, no secret leakage.
DB **and** storage both restored to exact baseline (0 objects). Debug notes:
the object path includes the bucket prefix (`list` must target the
ref-derived folder), and the supabase-js library internals (`createSignedUrl`,
`sb_secret_`) appear in the admin bundle but are NOT our server code — the
server-only media constants and path builders are absent from `dist/assets`.

**Verification:** `npm test` 1276/1276, `npm run lint` clean, `npm run build`
passes, `python3 schemas/validate.py` PASS, `npm run smoke:production`
**122/122** (DB + storage restored to exact baseline), bundle probes clean
(service-role creds, JWT secrets, correct-answer schema `$id`s,
`public.admins`/`is_admin()`, and the new server-only media constants all
0 files). NO schema change, no migration, no new packages.
`reports/34-task-5.12-question-media-upload.md`. D-084 recorded.

**Next recommended action:** Task 5.13 — the publish/review workflow so
authored drafts can move from visual authoring to live distribution (and the
question bank content itself). Not started (per the stop rule after 5.12).

## 2026-08-17 (Task 5.13 — COMPLETED)

**Stage:** Stage 5 – Admin Question Review, Approval & Publish Workflow.

**Action:** Added the full server-authoritative review lifecycle on top of the
Task 5.10 Question Builder. The `questions.status` CHECK constraint is
UNCHANGED (`draft|published|archived`); review state lives in
`meta.review` (`state ∈ {pending,approved,rejected}`, `submittedAt`,
`submittedByAdminId`, `reviewedAt`, `reviewerAdminId`, `note`, `version`) and
every transition writes an immutable `admin_actions` row (0001 §2 — existing
table, NO migration). Service: `submitForReview`/`approve`/`reject`
(note required)/`publish`/`archive`/`createVersion`/`reviewQueue`/`audit` +
`create`/`update` now stamp `meta.authoring.createdByAdminId` and audit
(`QUESTION_CREATED`/`QUESTION_EDITED`); update forces `draft`, clears review,
preserves source chain fields; `#draftFromRow` rebuilds a schema-valid
envelope (`formatVersion` + null-safe fields) so re-validation across the
lifecycle is self-consistent. Release gates = explanation + ≥1 feedback
template + topic/subtopic + full three-layer validation + media integrity.
Stale-approval guard (409 `QUESTION_APPROVAL_STALE` when
`review.version !== row.version`); reject without a note → 400
`QUESTION_REVIEW_NOTE_REQUIRED`; invalid transitions → 409
`QUESTION_INVALID_STATE`. Clone-on-edit: `POST /:id/versions` → draft v2 via
`meta.sourceQuestionId`/`sourceVersion`; publishing v2 archives v1
(`supersededByVersion`). Errors/contracts extended (`QUESTION_REVIEW_STATES`,
`QUESTION_LIFECYCLE_ACTIONS`); `meta.schema.json` gained the review/authoring/
source fields. API: `GET /questions/review` (before `/:id`), `GET /:id/audit`,
`POST /:id/submit|approve|reject|publish|archive|versions`; `POST /` and
`PUT /:id` pass the admin context. Memory + Supabase `adminActionRepository`
(id-desc deterministic newest-first), fake client `admin_actions` table,
production wiring (also passes `mediaRepository`). Client: 8 methods + 8 Query
hooks (mutations invalidate the shared cache). UI: `ReviewQueue` (previews
only — no correctAnswer/meta) + `ReviewDetail` (admin-only answer, review
envelope, audit trail, Approve/Reject/Publish/Archive, note box) + pages +
routes `questions/review`/`questions/:id/review` + AdminShell "Review" nav +
editor "Submit for review" + list "New version" + `aq-review*` CSS. 26 new
tests (21 lifecycle incl. student-distribution regression over the game repos
+ 5 client/SSR). Student distribution gate already existed (only `published`
served) — locked in by regression tests.

**Files created:**
- `src/features/admin/questions/testing/question-lifecycle.test.js` (21 tests)
- `src/features/admin-questions/components/ReviewQueue.jsx`
- `src/features/admin-questions/components/ReviewDetail.jsx`
- `src/pages/AdminReviewQueuePage.jsx`
- `src/pages/AdminReviewDetailPage.jsx`

**Files modified:**
- `src/features/admin/questions/errors.js` — 3 codes + factories
  (`INVALID_STATE`, `REVIEW_NOTE_REQUIRED`, `APPROVAL_STALE`).
- `src/features/admin/questions/contracts.js` — review states + lifecycle actions.
- `src/features/admin/questions/service/question-service.js` — lifecycle + gates + `#draftFromRow`.
- `src/features/admin/questions/api/server.js` — review/audit routes + statusByCode.
- `src/features/admin/questions/repositories/{contracts,memory,supabase}.js` — admin-action repos.
- `src/features/game-session/api/production-server.js` — QuestionService wiring.
- `src/features/game-session/testing/fake-supabase-client.js` — `admin_actions`.
- `schemas/common/meta.schema.json` — review/authoring/source fields.
- `src/features/admin-questions/client/client.js`, `queries/queries.js`.
- `src/features/admin-questions/components/{QuestionEditor,QuestionList}.jsx`.
- `src/router.jsx`, `src/pages/AdminShell.jsx`, `src/pages/admin.css`.
- `src/features/admin-questions/testing/frontend-admin-questions.test.js` (5 new).
- `scripts/smoke-production.mjs` — review phase + `admin_actions` baseline/cleanup.
- `reports/35-task-5.13-publish-review-workflow.md`, `reports/README.md`,
  `reports/04-todo.md`, `reports/03-decisions.md` (D-085).

**Packages installed:** none.

**Configuration changes:** none.

**Commands executed:** `npm test` (1302/1302), `npm run lint` (clean),
`npm run build` (passes; editor chunk 240.07 kB / gzip 63.61 kB),
`python3 schemas/validate.py` (PASS), `npm run smoke:production`
(**141/141**, DB + storage restored to exact baseline incl. every
`admin_actions` row), bundle probes (0 files for server-only lifecycle
identifiers; `SECURITY_CORRECT_ANSWER_EXPOSED` guard active).

**Result:** All lifecycle transitions verified offline (service, API,
production-stack) and live against the real Supabase project: create → submit
→ queue → reject (note required) → re-submit → approve → publish → clone v2 →
publish v2 archives v1 → newest-first audit trail → `admin_actions` rows
persisted with the acting admin → no secret leakage. `npm test` 1302/1302.
`reports/35-task-5.13-publish-review-workflow.md`. D-085 recorded.

**Warnings / errors:** During the test pass: (a) `#draftFromRow` initially
emitted a row-derived DTO missing `formatVersion` and carrying `null`
`instructions`/`hints`, which failed envelope re-validation — fixed by
building a clean envelope (`formatVersion: FORMAT_VERSION`, omit null optionals,
defaults for taxonomy/explanation/basePoints); (b) the memory admin-action
`listByTarget` sort used `created_at` localeCompare, which is non-deterministic
within the same millisecond — switched to `id`-descending; (c) two smoke
assertions were wrong (the review queue intentionally exposes
`submittedByAdminId` inside its preview `review` envelope, and the v1 audit
is exactly 7 rows), and the cleanup left 3 `admin_actions` rows for drafts
deleted mid-run — fixed by tracking every smoke question id and sweeping their
audit rows. All resolved; smoke 141/141 with exact baseline restore.

**Next recommended action:** Task 5.14 — the question-bank content itself
(the curated pool of release-ready questions that this workflow exists to
produce and publish). Not started (per the stop rule after 5.13).

---

## 2026-08-18 (Task 5.14 — IN PROGRESS, batch 1 live)

**Stage:** Task 5.14 — Production Question Bank Content (batch 1, 182/2,000).

**Action:** Built the full offline→live question-bank pipeline and published
batch 1 (182 questions) through the Task 5.13 review workflow via
`QuestionService` only. Authored `mathematics-l1..l5` (102), `science-l1..l4`
(55), `technology-l2..l4` (12), `engineering-l2..l4` (13) records via
`content/helpers.mjs` builders; `blueprint.mjs` encodes reports/07
distributions; `content-validator.mjs` (same `createQuestionValidator`) gates
Q1–Q16 machine subset, exact/near-dups (bigram Jaccard after stem-prefix
strip), template limits (≤3 per stream/level/template) and blueprint
exceedances. `generate-images.mjs` (pure-Node PNG encoder) drew 10 diagrams;
`upload-media.mjs` stored them at the correct `question-media/`-prefixed
paths and verified signed URLs; `import.mjs` created drafts (idempotent by
canonical contentHash); `review.mjs` submitted → approved → published each
draft with a real `admin_actions` trail; `verify-bank.mjs` reported
`BANK:182 STATUS:published=182 MEDIA_MISSING:0 LIFECYCLE_ERRORS:0
RESULT: VERIFIED_OK`. Runtime check: `getEligibleQuestions` returns the
published bank (mathematics L1 → pool 21).

**Files created:**
`scripts/content-bank/{blueprint,content-validator,lib,setup-admin,upload-media,import,review,verify-bank,generate-images}.mjs`,
`scripts/content-bank/content/{helpers,mathematics-l1..l5,science-l1..l4,technology-l2..l4,engineering-l2..l4}.mjs`,
`scripts/content-bank/generated-media/**` (10 PNGs),
`scripts/content-bank/snapshots/{batch-1.ndjson,import-manifest.json,verification-batch-1.json}`,
`reports/36-task-5.14-question-bank-content.md`.

**Files modified:** `reports/README.md` (index entry for 36).

**Packages installed:** none.

**Configuration changes:** two persistent test admins created live
(`content-bank.author@stem-quest.test` / `content-bank.approver@stem-quest.test`).

**Commands executed:** `node --env-file=.env scripts/content-bank/setup-admin.mjs`,
`upload-media.mjs`, `import.mjs`, `review.mjs`, `verify-bank.mjs --json
scripts/content-bank/snapshots/verification-batch-1.json`, plus full gates:
`npm test` (1302/1302), `npm run lint`, `npm run build`,
`python3 schemas/validate.py` (PASS), content-validator CLI (`OK (publishable)`).

**Result:** 182 questions published live, all ten activity types, D1–D4,
55 approved topic/subtopic pairs, distribution within blueprint (no
over-production). 731 `admin_actions` rows (728 bank lifecycle + 3
pre-existing baseline rows untouched). No schema change, no new packages.

**Warnings / errors:** (1) first import re-run created 182 duplicate drafts —
idempotency keyed on `authorSource` without the stream suffix; fixed to key
on canonical `contentHash`, duplicates removed via `QuestionService.remove`,
their orphaned `QUESTION_CREATED` audit rows swept by target_id (the exact
convention `smoke-production.mjs` uses, lines 145–149). (2) Media upload
initially dropped the `question-media/` bucket prefix; 10 image-interaction
questions blocked at submit until re-uploaded at prefixed paths — matches how
`#assertMediaIntegrity`/`buildQuestionMediaPath` resolve refs. (3) The 141/141
live smoke is NOT re-runnable against the live bank (asserts `questions===0`,
`admins===0`, empty bucket; sweeps `@stem-quest.test` admins) — documented in
report 36 §9; `verify-bank.mjs` is the live-equivalent gate.

**Next recommended action:** Task 5.14 remains IN PROGRESS (182/2,000).
Next session: continue authoring the remaining (stream, level) pools to 100
each with the same pipeline, then run the full §10 verification including the
student 3-of-100 pool exercise. Task 5.15 must NOT be started before the
2,000-question target is verified.
