# 26 – Task 5.5: Student Progression Backend + Level Unlock Persistence

## 1. Task status

**COMPLETED** (2026-08-15). The deferred progression system from D-076 is now
implemented entirely in the backend: finishing a session writes the
`student_progress` + `student_level_progress` rows, session start enforces the
authoritative unlock rule (level N requires level N−1 completed for the same
stream, **or** an active special-access grant), and the Mission selection UI
mirrors the rule truthfully (level N+1 renders `available` after level N is
completed). Task 5.6 and beyond are **NOT started**.

## 2. Scope

- New `src/features/progression/` — `ProgressionService` (pure logic),
  repository contracts + memory/Supabase implementations, factory index.
- Game Session: `startSession` unlock enforcement via `ProgressionService`,
  `finishSession` deferred completion writes + idempotent re-finish.
- Mission: `resolveLevelAccess`/`buildLevelContext` extended with the
  previous-level context (backward compatible); `MissionService` threads the
  same-stream previous level into every card.
- New progression tests (service, memory+Supabase repos, game integration
  E2E, mission access), deterministic PostgREST fake `upsert`, live smoke
  extended to a two-level progression flow, bundle security probe.

Out of scope (per plan): leaderboards, admin UI, Question Builder, production
question content, any Activity Engine / Game Engine / Central Scoring / plugin
changes.

## 3. Progression rules (authoritative, D-076)

- **Level 1** is always available to every active student (no rows needed).
- **Level N** (2..5) is unlocked when the same-stream previous level N−1 has a
  `student_level_progress.is_completed = true` row, **or** an active
  `special_access` grant covers the stream or level.
- **Stream-specific**: completing level 1 in Science never unlocks level 2 in
  Technology.
- **Level ≠ grade**: `questions.grade_min/grade_max` remain suitability
  metadata and never gate play.
- **Special access is independent**: a grant opens a level for play but never
  fabricates a completion record — only `finishSession` writes progression.
- **Backend authoritative**: the client/Mission UI never invents unlocks; the
  session-start gate (`ProgressionService.assertLevelUnlocked`) re-checks the
  real entitlement.

## 4. Deferred completion writes

`GameSessionService.finishSession` (active, all rounds answered) computes the
server-side score and persists in order: session completion → scores ledger →
`ProgressionService.recordCompletion`. `recordCompletion`:

1. **Level row** — `student_level_progress` UPSERT on `(student_id, level_id)`:
   `best_score = max(existing, score)` (monotonic), `attempts + 1`,
   `is_completed = true`, `completed_at` kept from the first completion,
   `last_played_at = completedAt`.
2. **Stream aggregate** — recomputes from the (student, stream) level rows and
   UPSERTs `student_progress` on `(student_id, stream_id)`:
   `current_level = clamp(maxCompletedNumber + 1, 1, 5)`,
   `completed_levels = count(is_completed)`, `stream_completed = all 5 done`.

The max/clamp/attempt logic lives in the service (it needs the existing row,
which PostgREST's `ON CONFLICT DO UPDATE` cannot compute); repositories stay
dumb adapters. Idempotency comes from the table unique keys.

## 5. Idempotent re-finish

`finishSession` on an already-`completed` session now returns the stored
completion payload (same `sessionScore`/`result`/`roundBreakdown`) **without
any writes** — no duplicate score rows, no attempt double-counting. Submits
and `current` on a completed session still fail with the same 409/404
behaviour as before (`loadAndGuardSession` unchanged for those routes).

## 6. Session-start enforcement

`startSession` step 3 now calls `ProgressionService.assertLevelUnlocked`
instead of the old grant-only `applyUnlockRule` (removed). Fresh students:
level 1 → 201, levels 2..5 → `409 GAME_LEVEL_LOCKED`. After completing level
1: level 2 → 201; level 3 stays locked until level 2 is completed (chain, no
leapfrog). A grant bypasses the chain for play but still writes a normal
completion on finish.

## 7. Mission UI truthfulness

`resolveLevelAccess({ level, grants, previousLevel, previousLevelProgress })`:
level 1 → `available`; grant-covered → `special`; previous-level-completed →
`available`; else `locked`. `MissionService` computes `previousLevel` (same
stream, `number − 1`) per card. Backward compatible: callers that pass no
previous-level context keep the exact old behaviour (existing resolver/service
tests run unchanged). Progression internals (`best_score`, `attempts`,
`is_completed`) never leave the server.

## 8. Files created

- `src/features/progression/repositories/contracts.js`
- `src/features/progression/repositories/memory.js`
- `src/features/progression/repositories/supabase.js`
- `src/features/progression/repositories/index.js`
- `src/features/progression/service/progression-service.js`
- `src/features/progression/testing/progression-service.test.js`
- `src/features/progression/testing/progression-supabase-repositories.test.js`
- `src/features/game-session/testing/progression-game.test.js`
- `src/features/mission/testing/progression-access.test.js`

## 9. Files modified

- `src/features/game-session/service/game-session-service.js` — unlock gate,
  idempotent `finishSession`, progression write, removed `applyUnlockRule`.
- `src/features/game-session/repositories/memory.js` — store arrays +
  `MemoryProgressionRepository` + `LevelRepository.listForStream`.
- `src/features/game-session/repositories/supabase.js` — `SupabaseProgressionRepository`
  wiring + `SupabaseLevelRepository.listForStream`.
- `src/features/game-session/repositories/contracts.js` — `ProgressionRepository`
  typedef + `LevelRepository.listForStream`.
- `src/features/mission/access/access-resolver.js` — previous-level unlock.
- `src/features/mission/service/mission-service.js` — threads previous level.
- `src/features/game-session/testing/fake-supabase-client.js` — `upsert`
  (insert-or-update on `onConflict` columns).
- `scripts/smoke-production.mjs` — two-level progression flow + DB assertions
  + progression tables in baseline restore.
- `package.json` — `progression` added to the test glob.

## 10. Packages installed

None. No new dependencies.

## 11. Migrations / schema

None. Both tables already exist from `0001_initial_schema.sql`
(`student_progress`, `student_level_progress`); only their write paths are now
used. `schemas/validate.py` PASS (24/72/12/12).

## 12. Tests

39 new tests, total suite 927 → **966**:

- `progression-service.test.js` (16): unlock matrix, grants, cross-stream
  isolation, completion recording, monotonic best score, first-completion
  timestamp, idempotent aggregates, stream completion at 5, per-student
  isolation, no fabricated completions, malformed-id defence, no data leak.
- `progression-game.test.js` (9): full HTTP flow over the student API —
  fresh-lock, complete L1 → unlock L2 + rows written, idempotent re-finish,
  stream-specific isolation, special-access play writes a normal completion,
  cross-student isolation, payload secrecy, chain (no leapfrog), replay.
- `progression-supabase-repositories.test.js` (6): `get/list/upsert`
  round-trips, UPSERT idempotency on both unique keys, malformed-id guard,
  `listForStream` ordering, factory wiring.
- `progression-access.test.js` (8): Mission picker mirrors progression —
  L2 `available` after L1, chain gating, stream specificity, replay,
  special stays `special`, overview counts, backward compatibility, attempted
  ≠ completed.

Security assertions across these files cover: no scoring secrets / progression
internals in any API payload, per-student isolation of unlocks and rows,
foreign-student 403, fresh-student 409 chains, and no client-invented unlocks.

## 13. Verification gates

- `npm test`: **966/966**, three consecutive full runs (stable).
- `npm run lint` (oxlint): clean.
- `npm run build` (vite): clean.
- `python3 schemas/validate.py`: PASS.
- Live smoke `npm run smoke:production`: **49/49** against
  `fmauqixvdpdgrghuapfs`.

## 14. Live smoke (progression flow)

Extended from 35 → 49 checks: level-1 finish writes
`student_level_progress` (attempts 1, best score) + `student_progress`
(current_level 2); level 2 start is then **201** (progression unlock, no
grant); level-2 finish advances the aggregate to current_level 3; level 3 then
passes the unlock gate (fails only on the missing level-3 pool —
`GAME_INSUFFICIENT_POOL`, not `GAME_LEVEL_LOCKED`); re-finish returns the same
payload; a fresh student stays `GAME_LEVEL_LOCKED` on levels 2 and 3. DB
baseline (incl. both progression tables) fully restored after cleanup:
questions=0 students=0 schools=0 sessions=0 scores=0 answers=0
level_progress=0 stream_progress=0.

## 15. Bundle security probe

Three-way `grep` over `dist/assets` (built fresh; `rg` is not installed here):

- **A. Credentials** (`SUPABASE_SERVICE_ROLE_KEY` / `service.role` /
  `VITE_SUPABASE` / `sb_secret_`): **0** files.
- **B. Actual answer data** (`"mappings"` JSON keys, demo fixture answer
  content like `Renewable`, `"zones":[...]` / `"items":[...]`): **0** files.
- **C. Informational prose only**: the tokens `correctAnswer` /
  `acceptableIds` appear once each as static strings — the
  `SECURITY_CORRECT_ANSWER_EXPOSED` guard message and the schema-check
  registry description (`implementedIn: validate.py only`) — the guard
  itself, not answer data.

## 16. Bugs found / fixed

- Smoke check #29 was initially written incorrectly ("level 3 still locked
  after level 2") — after completing level 2, level 3 is legitimately
  unlocked; reworded to assert the gate passed (pool-limited only).
- No production runtime bugs surfaced by this task; the live two-level flow
  passed on the first clean run.

## 17. Live database state

Baseline + after-run (post-cleanup): all tables empty (see §14). No smoke
fixtures left behind.

## 18. Docs updated

- `reports/26-task-5.5-student-progression.md` (this report).
- `reports/02-development-log.md` — Task 5.5 entry.
- `reports/03-decisions.md` — D-078 (progression authority + idempotent
  completion); D-076 consequence updated to reference the implemented rule.
- `reports/04-todo.md` — Task 5.5 marked DONE.
- `reports/README.md` — index row 26.
- Root `README.md` — current integration text, test count 966, reports list,
  decisions D-001…D-078.

## 19. Known limitations

- `student_progress`/`student_level_progress` have no RLS (service-role only,
  browser never touches PostgREST — D-027).
- No admin tooling to grant/revoke special access or view progression yet
  (deferred by plan).
- Re-finish returns the persisted result; it does not re-score (round data is
  frozen at submit, by design).

## 20. Next task

Task 5.6+ **not started**. Backlog candidates: leaderboards, admin/progression
viewing, real content authoring, remaining polish.