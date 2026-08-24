# 25 – Task 5.4: Production Supabase Integration

## 1. Task status

**DONE.** The Tasks 5.1–5.3 student + game system now runs against the real
linked Supabase project (`fmauqixvdpdgrghuapfs`) through a production server:
one service-role Supabase client wires the existing `GameSessionService`,
`StudentService` and mission services to the authoritative PostgREST
repository adapters (student → game session → 3 rounds → student answers →
server scoring → scores ledger), reusing existing contracts, the browser UI and
the activity/game engines unchanged, with no new schema and no new packages.
Verified: `npm test` **927/927**, `npm run lint` clean, `npm run build` clean,
`python3 schemas/validate.py` PASS, live HTTP smoke **35/35** against the real
Supabase project, bundle security probe clean, and the live database restored
to its exact baseline (questions/students/schools/sessions/scores/answers = 0).

## 2. Scope

- Serve the token-authenticated student flow from Tasks 5.1–5.3
  (`/api/student/*`, `/api/student/mission/*`, `/api/student/game/*`) on top
  of Supabase repositories — no in-memory stores in the production path.
- Reuse the existing service layer, contracts, activity engine and game engine
  **unchanged** (D-016, D-022, D-028, D-052). Task 5.4 is a composition and
  verification task, not a redesign.
- Full `.env` support (user request): server reads `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` from `.env` (gitignored) via `node --env-file`.
- Persist sessions, rounds, student answers and scores via the existing
  repositories and contracts. **Documented deferral:** `student_progress` /
  `student_level_progress` recording is deferred to the later progression task;
  the repos already exist and are read by special-access, but no progress rows
  are written by this task.
- Do **not** start Task 5.5+.

## 3. Production composition

`src/features/game-session/api/production-server.js` — the only new production
composition file.

- `createProductionApi({ client })` — optional injected client for tests; when
  omitted it awaits `getSupabaseServerClient()` (service-role, one instance
  shared by all three feature repository sets). It builds:
  - `gameRepos` — `createRepositories({ mode: 'supabase', client })` from
    `game-session/repositories/index.js`
  - `studentRepos` — `createStudentRepositories({ mode: 'supabase', client })`
    from `student/repositories/index.js`
  - `missionRepos` — `createMissionRepositories({ mode: 'supabase', client })`
    from `mission/repositories/index.js`
  - `gameService` / `studentService` / `missionService` via the existing
    service factories with those repos
  - `app` — Hono app composing, in order: mission → game → student → core, so
    the shared student identity facade from Task 5.3 is preserved.
- `handle(app, req, res)` — a **binary-safe** Node HTTP bridge for Supabase's
  host (avatar multipart uploads carry raw binary). It reconstructs the raw
  body when the content-type is multipart, passes string bodies otherwise, and
  writes the Hono response back with the correct status + headers.
- `runProductionServer({ app, port })` — default `PORT` env or **4101**;
  `isMain` guard runs the server when executed directly.

## 4. Environment & secrets (.env)

User decision: create `.env` (gitignored) and make the full system support it.

- `.env` — `SUPABASE_URL=https://fmauqixvdpdgrghuapfs.supabase.co` +
  `SUPABASE_SERVICE_ROLE_KEY` (real key, retrieved once via
  `supabase projects api-keys --project-ref … --reveal`). Never printed in
  logs, reports, README or git.
- `.env.example` — documents both variables with the "server-only" warning
  (never `VITE_*`, never the browser).
- Loading: `node --env-file=.env` in the `api:production` and
  `smoke:production` scripts (Node ≥ 20.6; project runs Node v24). No dotenv
  dependency.
- `.env` is in `.gitignore`; `git status` confirms no secret is tracked.

## 5. Service-role client fix (latent production bug)

`src/features/game-session/repositories/supabase-client.js`:

- `getSupabaseServerClient` was **synchronous** and destructured `createClient`
  from the dynamic-import Promise *without awaiting* it. The value was a
  Promise, so the first real call failed with `createClient is not a function`.
  The in-memory dev path never exercised it, so 915 tests could not see it.
- Now `export async function getSupabaseServerClient(env)` that
  `await requireSupabase()` first. All four call sites await it:
  `game-session/repositories/index.js`, `student/repositories/index.js`,
  `mission/repositories/index.js`, `production-server.js`.

## 6. Production-hardening fixes found by the live smoke

The deterministic fake client (below) could not reproduce three PostgREST
behaviours; the live smoke exposed them and they were fixed in
`game-session/repositories/supabase.js`:

| # | Bug (live behaviour) | Fix |
| --- | --- | --- |
| 1 | `createRoundsForSession` `.insert().select()` returned rounds in arbitrary order, so a freshly started session could report round 3 as the "current" round | `.order('round_number', { ascending: true })` on the insert-select; `findBySessionId` already ordered. |
| 2 | `sessionPatchToColumns` ran `toIso()` on `total_time_ms` → PostgREST error `invalid input syntax for type bigint: "1970-01-01T00:00:08.602Z"` | `total_time_ms` is a plain bigint of milliseconds; only `completed_at` is ISO-serialized. |
| 3 | Non-numeric ids (`streamId: 'x'`, garbage `sessionId`) serialized as a literal `NaN` → `invalid input syntax for type bigint: "NaN"` (500) instead of a clean 409/404 | `finiteId()` guard in the supabase repos: `findLevel`, game-session `findById`, round `findById`, question `getById` return `null` (service maps to the same 409/404 the memory stores produce, D-052); mission stream `findById` likewise. |

The production API tests now assert `total_time_ms` persists as a finite
number and that rounds always come back ordered by `round_number`.

## 7. Deterministic test double

`src/features/game-session/testing/fake-supabase-client.js` — a PostgREST-shaped
fake (not an in-memory service reimplementation) so the *real* supabase
repository code and the *real* service composition are what get tested:

- `createFakeSupabaseClient()` → `{ client, db }` where `db.tables.*.rows` are
  queryable for assertions and `client.from(table)` returns a chained Builder
  (`select/eq/ilike/in/or/limit/order/maybeSingle/single/insert/update/delete`
  + `then()`), matching the exact call shapes the repositories use.
- `INSERT_DEFAULTS` mirror Postgres defaults (schools `is_active`, students
  `status`/`is_archived`, `game_sessions` `status`/`total_score`,
  `session_rounds` status/attempts/hints/overtime/points, `student_answers`
  `points_earned`, progress tables), so rows round-trip like real Postgres rows.
- Embedded join `activity_types(slug)` resolves the same way PostgREST does.
- `questionFixtureToRow(q)` maps demo fixtures to snake_case questions rows.
- Storage `upload`/`createSignedUrl` back a real object list per student.

## 8. Repositories exercised (existing adapters, now under test)

The three feature repository sets already existed (authored in earlier stages);
Task 5.4 is the first time they are exercised in a supabase mode with tests:

- `game-session/repositories/supabase.js` — question, game-session, round,
  special-access, level, settings repositories (`QuestionRepository`,
  `GameSessionRepository`, `SessionRoundRepository`,
  `SpecialAccessRepository`, `StudentRepository`, `LevelRepository`,
  `SettingsRepository`).
- `student/repositories/supabase.js` — student store, session store, avatar
  upload, token hashing.
- `mission/repositories/supabase.js` — stream, level, progress repos (progress
  read-only in this task).

All are wired in `createProductionApi` with the shared service-role client.

## 9. No schema change (verified)

Migration 0001 already defines every table the services write
(`students`, `schools`, `game_sessions`, `session_rounds`, `student_answers`,
`scores`, `student_sessions`, `student_progress`, `student_level_progress`,
`special_access`, `questions`, `levels`, `streams`, `activity_types`,
`game_settings`). No new migration, no new tables, no RLS/Storage policy
changes. The 3 migrations remain applied (0001/0002/0003).

## 10. Env contract

| Var | Where | Example |
| --- | --- | --- |
| `SUPABASE_URL` | `.env`, `SUPABASE_URL` (server-only) | `https://fmauqixvdpdgrghuapfs.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` (server-only) | `sb_secret_…` (never committed/printed) |
| `PORT` | optional | default 4101 |

## 11. API surface (unchanged, now backed by Supabase)

| Method | Path | Action |
| --- | --- | --- |
| POST | `/api/student/register` | register student + issue hashed opaque token |
| GET | `/api/student/me` | safe identity (+ avatar URL) |
| PUT | `/api/student/me/avatar` | upload photo to private `student-avatars` |
| GET | `/api/student/mission/streams` | 4 streams |
| GET | `/api/student/mission/streams/:streamId/levels` | levels + access |
| POST | `/api/student/game/session` | start / resume → safe descriptor |
| GET | `/api/student/game/session/:sessionId/current` | current round / null |
| POST | `/api/student/game/session/:sessionId/rounds/:roundId/submit` | validate + score |
| POST | `/api/student/game/session/:sessionId/finish` | complete + scores ledger |

## 12. Security model (verified end-to-end)

- `correctAnswer` and all scoring internals (`scoringInputs`,
  `correctnessFraction`, deductions) are computed and kept server-side.
- The browser posts only the student's response + interaction metrics.
- `studentId` is always derived from the opaque token via `StudentService.getMe`;
  `x-student-id` remains legacy demo-only (Task 4.4).
- The service-role key exists only in `.env`, is never `VITE_*`, and the bundle
  probe confirms it is absent from `dist/assets`.
- Error mapping keeps the student API map (401 missing/bogus token, 403 foreign
  session, 404 unknown session/round, 409 locked level / wrong state / malformed
  input).

## 13. Test strategy

- **Contract tests** (`testing/supabase-repositories.test.js`, 7) run the real
  supabase repository classes over the fake client: question repo
  (eligible-by-level, published-only, embedded activity slug), the game-session
  lifecycle (create → rounds → answers → update total → complete + ledger),
  session-round repo, special access, student + level + settings repos, and the
  student/mission repo sets.
- **Production API tests** (`testing/production-api.test.js`, 5) run the real
  `createProductionApi` composition over the fake client: full flow
  (register → me → streams → start → 3 submits → current → finish) with
  exactly one session, 3 answered rounds, 3 `student_answers` rows and one
  score row persisted; resume determinism; auth/authorization matrix
  (401/403); state/availability errors (404/409/400); and the no-leak boundary
  (`correctAnswer` absent from every payload).

## 14. Live smoke test

`scripts/smoke-production.mjs` (`npm run smoke:production`, uses `.env`) runs
against the **real** production Supabase project and is fully idempotent:

- Pre-run cleanup removes any leftover smoke fixtures (idempotent re-runs).
- Seeds 3 published drag-drop questions tagged `smoke-test`, registers a real
  student + school, uploads a real private avatar, runs the full session flow,
  exercises the error matrix, asserts the live DB rows (completed session,
  3 answered rounds, 3 answers, score ledger, hashed token, private avatar,
  server-side-only correct answers), then deletes everything and verifies the
  DB returns to the exact baseline.
- Cleanup runs in a `finally`, so an aborted mid-run failure never leaks
  fixtures; the pre-run cleanup also removes anything left by earlier aborted
  runs. FK-safe order: scores → game_sessions (cascade rounds/answers) →
  progress/access/sessions → students → schools → questions last (rounds
  reference questions with RESTRICT).

**Result: 35/35 PASS**, and the live DB is back to
`questions=0 students=0 schools=0 sessions=0 scores=0 answers=0`.

## 15. Error matrix (live-verified)

| Case | Expected | Live result |
| --- | --- | --- |
| missing token | 401 `STUDENT_UNAUTHORIZED` | PASS |
| bogus token | 401 `STUDENT_INVALID_TOKEN` | PASS |
| foreign student reads session | 403 `GAME_SESSION_WRONG_STUDENT` | PASS |
| locked level (level 2, no grant) | 409 `GAME_LEVEL_LOCKED` | PASS |
| unknown round on active session | 404 `GAME_ROUND_NOT_FOUND` | PASS |
| unknown session | 404 `GAME_SESSION_NOT_FOUND` | PASS |
| finish before all rounds answered | 409 `GAME_SESSION_INVALID_STATE` | PASS |
| malformed stream/level ids | 409 (level-locked path, no PostgREST NaN error) | PASS |

## 16. Package script additions

`package.json`:

- `api:production` → `node --env-file=.env src/features/game-session/api/production-server.js`
- `smoke:production` → `node --env-file=.env scripts/smoke-production.mjs`

## 17. Tests

`npm test` = **927 pass / 0 fail** (baseline 915 + **12 new**):

| Suite | Count |
| --- | --- |
| `game-session/testing/supabase-repositories.test.js` | 7 |
| `game-session/testing/production-api.test.js` | 5 |

Regression assertions added for the two fake-masked bugs (bigint
`total_time_ms`, ordered rounds) so the offline suite would catch them. A
pre-existing flaky assertion was also hardened (D-059): `student-game-api` and
`production-api` asserted the level-1 timer is exactly 90s, but demo question
id 4 carries `timerOverrideSeconds: 45` and the seeded-random selection can
put it first — the timer assertion now derives the expected value from the
selected question's override instead of hardcoding a fixture value.

`npm run lint` — clean. `npm run build` — clean (StudentGamePage lazy chunk
24.58 kB / gzip 7.72 kB, unchanged). `python3 schemas/validate.py` — PASS
(unaffected).

## 18. Bundle security probe

Three-way probe over `dist/assets`:

- **A. Credentials** (`SUPABASE_SERVICE_ROLE_KEY`, `service.role`, `VITE_SUPABASE`,
  `sb_secret_`): **0 files** — the service-role key never reaches the bundle.
- **B. Actual answer data** (demo answer fixtures such as `Classify each energy
  source` / `Sunlight`, or a `correct_answer:` JSON object): **0 files** — no
  correct-answer payload is ever bundled.
- **C. Informational prose** — the field *names* appear exactly once each as
  static text: the Activity Engine's schema semantic-check registry
  descriptions (`"requiredHotspots/placements must reference known hotspot/label
  ids."`, `"acceptableIds must reference known candidates; missingAt in range."`,
  `"…optimalPath/acceptedOption must exist."`, all marked
  `implementedIn: validate.py only`) and the `SECURITY_CORRECT_ANSWER_EXPOSED`
  guard error (`"Correct-answer data must never reach the render context."`).
  These are developer-facing error/description strings and the security guard
  itself — not answer data. The drag-drop renderer's `placements` array is the
  client building its submission from the *public* descriptor items/zones.

Note: earlier stages reported a blanket "0 files" probe using `rg`, which is
not installed in this environment; those probes were false passes. Task 5.4
uses the accurate three-way probe above: **no credentials, no answer data,
prose only.**

## 19. Live database state

Before: 21 tables, RLS on all 21, 3 migrations, seed intact (streams=4,
levels=20, activity_types=10, badges=4, game_settings=8), 0 questions.
After the smoke: identical — every seeded question/student/school/session/
score/answer created by the test was removed (verified by direct query).

## 20. Files created

- `src/features/game-session/api/production-server.js` — production composition + binary-safe bridge + runner
- `src/features/game-session/testing/fake-supabase-client.js` — deterministic PostgREST fake + `questionFixtureToRow`
- `src/features/game-session/testing/supabase-repositories.test.js` — 7 repo contract tests
- `src/features/game-session/testing/production-api.test.js` — 5 production API tests
- `scripts/smoke-production.mjs` — live smoke + idempotent cleanup
- `.env` (gitignored) — real project URL + service-role key
- `reports/25-task-5.4-production-supabase-integration.md` — this report

## 21. Files modified

- `src/features/game-session/repositories/supabase-client.js` — async `getSupabaseServerClient` (await `requireSupabase()`).
- `src/features/game-session/repositories/index.js`, `student/repositories/index.js`, `mission/repositories/index.js` — `await getSupabaseServerClient()` in supabase mode.
- `src/features/game-session/repositories/supabase.js` — round ordering on insert-select; `total_time_ms` bigint (no `toIso`); `finiteId` guards.
- `src/features/mission/repositories/supabase.js` — `findById` NaN guard.
- `package.json` — `api:production`, `smoke:production` scripts.
- `.env.example` — server-only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` section.
- `reports/04-todo.md`, `reports/README.md`, `reports/02-development-log.md`, `reports/03-decisions.md`, `README.md` — tracking updates.

## 22. Packages installed

**None.** No new packages.

## 23. Supabase changes

**None.** No migration, no table, no RLS, no Storage policy, no seed changes.
Everything uses the existing 0001 schema and the existing private buckets.

## 24. Progress persistence (documented deferral)

Per user decision, Task 5.4 persists the session ledger (sessions, rounds,
answers, scores) only. `student_progress` / `student_level_progress` reading is
supported (special-access + mission progress repos), but **writing** progress
rows is deferred to the progression task — no service or contract changes were
made for it here.

## 25. Known limitations

- Progress rows are not yet written (documented deferral, §24).
- Demo/game content (`smoke-test` tagged) is only ever present during a smoke
  run and is removed by cleanup; the production question bank is still
  authored separately.
- The Task 4.4 `x-student-id` demo boundary remains legacy demo-only.
- `.env` must be provisioned with the real key on each deploy host; the file is
  gitignored by design.

## 26. Next task

**Task 5.5+ — not started.** Backlog candidates: progression backend work
(D-076, including `student_progress` writes now deferred by decision), real
content authoring pipeline, and any remaining game/UI polish. Not begun per
plan.