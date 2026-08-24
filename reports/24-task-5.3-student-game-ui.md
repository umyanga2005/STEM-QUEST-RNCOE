# 24 – Task 5.3: Student Game UI (Session Screen)

## 1. Task status

**DONE.** The real student game screen at `/student/game` (3-question STEM
QUEST session) is implemented as a thin token-authenticated client over the
existing authoritative `GameSessionService`. Verified: `npm test` **915/915**,
`npm run lint` clean, `npm run build` clean, `python3 schemas/validate.py`
PASS, HTTP smoke **20/20**, client-bundle security probe clean. No production
questions, no Supabase changes, no new packages. Task 5.4 not started.

## 2. Scope

- Render the real 3-round session for the chosen stream/level (mission page
  already hands `{ streamId, levelId }` via router state).
- Authenticate every request with the Task 5.1 opaque Bearer token through
  `StudentService.getMe`; `studentId` is derived from the token, never from
  the client (the Task 4.4 `x-student-id` header remains demo-only).
- Server stays authoritative for selection, correctness, correctnessFraction,
  scores, deductions, unlock, and completion. The browser only renders safe
  descriptors and posts the student's response + interaction metrics.
- 3-question session flow: start → current → submit ×3 → finish, with a
  display-only timer, round results, and a completion panel.
- All ten activity renderers reachable through one `RoundActivity` boundary.
- Resume + refresh recovery via a session-scoped choice storage; navigation
  guard warns before discarding an active mission.

## 3. Backend authority (non-negotiable)

The client never decides:

- question selection / which round is next (Game Engine D-022 selection),
- whether an answer is correct or its `correctnessFraction`,
- points earned, deductions (hints/attempts/overtime), running total,
- unlock/completion or `result` (`passed` / `attempted`).

The page consumes only `buildSafeRoundDescriptor` output and server result
payloads; scoring inputs are normalized server-side (`scoringInputs`) with the
fraction guarded to [0,1]. The GameSessionService is used unchanged.

## 4. Student game API (`/api/student/game`)

`src/features/game-session/api/student-server.js` — `createStudentGameApi`.

| Method | Path | Action |
| --- | --- | --- |
| POST | `/api/student/game/session` | start (or resume active session for stream) → `201 { session, currentRound }` |
| GET | `/api/student/game/session/:sessionId/current` | current round descriptor (or `currentRound: null`) |
| POST | `/api/student/game/session/:sessionId/rounds/:roundId/submit` | validate + score → `{ roundResult, feedback, progress, score, nextRound }` |
| POST | `/api/student/game/session/:sessionId/finish` | → `{ sessionId, sessionCode, sessionScore, totalTimeMs, status, result, roundBreakdown }` |

Every route authenticates via `studentService.getMe({ token: bearer })`.
Error mapping composes the game API map (`errorToHttp` from `game-session/api/server.js`, exported on the default export object) with the student API map, so game 401/403/404/409/400 map consistently with the rest of the student flow and `isExpiredSession` keeps working.

## 5. Composition

`src/features/game-session/api/dev-server.js`:

- `createStackedApp` mounts, in order: `/api/student/mission/*` → `/api/student/game/*` → `/api/student/*` → `/api/*`.
- **Single source of student identity:** the game service's `studentRepository` is a facade that reads the student feature store first, then falls back to the game demo store (legacy Task 4.4 `x-student-id` demo). Without this, a registered student with id ≥ 2 could not start a session (the game store only seeded the demo student). Registered students are `status: 'active'`, satisfying the service guard.

## 6. Client

- `src/features/game-session/api/student-client.js` — `gameStudentClient` (`POST /session`, `GET /session/:id/current`, `POST .../rounds/:roundId/submit`, `POST .../finish`), Bearer header, reuses `StudentApiError` so 401s surface as expirable errors.
- `src/features/game-session/api/queries.js` — `useStartSession`, `useSubmitRound`, `useFinishSession` mutations + `useCurrentRound` query.
- `src/features/game-session/round/round-lifecycle.js` — pure lifecycle: `ROUND_PHASE` `IDLE → STARTING → PLAYING ⇄ SUBMITTING → ROUND_RESULT → (next → PLAYING | finish → SESSION_COMPLETE)` with an internal `FINISHING` phase; `ACTIVE_SESSION_PHASES` and `hasActiveSession` drive the guard.
- `src/features/game-session/round/round-store.js` — minimal Zustand wrapper over the reducer; holds only server-returned data (no catalogue data, no scoring).
- `src/features/game-session/session/choice-storage.js` — sessionStorage `stemquest.student.game`, validated on read; keeps the chosen mission across a refresh so the resume request can be re-issued deterministically.
- `src/features/game-session/timer/use-countdown.js` — `useCountdown({ allowedSeconds, running, resetKey })` → `{ remaining, fraction, tone, expired }`; critical ≤ 5s, warning ≤ 15s or ≤ 25% fraction. Display-only.

## 7. Activity boundary (all ten types)

- `src/features/game-session/activity/activity-registry.js` — `ACTIVITY_RENDERERS` for all ten approved types, `ACTIVITY_TYPES`, `activityComponentFor`.
- `src/features/game-session/activity/activity-renderer.jsx` — `RoundActivity` maps a descriptor's `activity.kind` to the plugin renderer; unknown kinds render an unavailable surface.
- Split into `.js` registry + `.jsx` renderer to keep oxlint `react(only-export-components)` clean.
- **Vite SSR module-runner fix:** six plugin entry `index.js` files (`fill-complete`, `image-interaction`, `memory`, `number-logic`, `pattern`, `scenario-challenge`) used pure `export { … } from` statements and failed to load under Vite's SSR module runner (`FillCompleteActivity is not defined`). Added the same top-level `import` statements the four older entries (`drag-drop`, `matching`, `ordering`, `sorting`) already had — behaviour unchanged, SSR loading fixed.

## 8. Demo content: ordering completes the ten-type pool

The demo pool previously covered nine types. Added `src/features/game-session/demo/ordering-demo-questions.js` (3 published ordering questions, ids 14–16, built from the Task 3.2 ordering schema fixtures) and composed it into the dev-server pool, the API test `ALL_TEN_DEMO_QUESTIONS`, and the frontend ten-type render test, so every renderer is exercisable in the demo.

## 9. Page

`src/pages/StudentGamePage.jsx` + `src/pages/student-game.css`:

- Reads the token from `tokenStorage`; no token → redirect to `/student/register`; no choice → redirect to `/student/mission`.
- Mission header: greeting, stream glyph, stream + level names, HUD (progress `Question x of 3`, running score, timer with `role="timer"` live region).
- Idle shell ("Preparing your mission…") waits for the server start; STARTING/FINISHING statuses; PLAYING renders `RoundActivity`; SUBMITTING renders it disabled + "Scoring your answer…".
- `RoundResultPanel` (exported): pass/partial/fail badge, points earned, running total, feedback (title/message/explanation/guidance), Next / See results.
- `SessionCompletePanel` (exported): pass/attempted seal, final score / 300, session code, duration, per-round breakdown (attempts, hints, overtime), Play again / Back to mission.
- Auto-start ONCE per choice (`autoStartedRef`); refresh with an active session resumes it; resume edge (no pending round but active session) finishes the session.
- 401 anywhere → clear token + choice and redirect to registration.
- Navigation guard (`useBlocker`): blocks leaving while an active session exists, with a Stay / Leave dialog. The browser only warns — the server remains the authority.

## 10. Router

`src/router.jsx` — `/student/game` lazy route → `StudentGamePage`.

## 11. Round lifecycle (mandated)

`IDLE→STARTING→PLAYING⇄SUBMITTING→ROUND_RESULT→(next→PLAYING | finish→SESSION_COMPLETE)`. `hasActiveSession` is true for `STARTING/PLAYING/SUBMITTING/FINISHING` (not `ROUND_RESULT`/`SESSION_COMPLETE`). Timer is display-only; the server decides overtime via its own timestamps.

## 12. Resume & refresh recovery

`startSession` resumes the student's existing active session for the stream (partial index D-028 prevents concurrent active sessions). The stored choice only re-issues the resume request; no session state is persisted client-side beyond the choice, and no invented persistence was added — this is the same router-state choice, session-scoped.

## 13. UI details

- `student-game.css` — dark gradient shell, glow background, game HUD, result/complete panels, guard dialog; `student-game` class prefixes; brand + greeting header.
- Stream glyph reused from `src/pages/stream-icons.jsx`.

## 14. Accessibility

- Timer is a live region (`role="timer"`, `aria-live="polite"`).
- Progress uses `aria-live="polite"`.
- Guard dialog is `role="alertdialog"` + `aria-modal` + labelled by a title.
- Status changes use `role="status"` / `role="alert"`.
- Activity plugin renderers already expose labelled inputs/buttons (from Task 4.x); `RoundActivity` passes `reducedMotion`.

## 15. Responsive behavior

`student-game.css` uses fluid layouts (flex + clamp), the HUD collapses gracefully, and buttons remain tappable targets at mobile widths — consistent with the mission page.

## 16. Animation

`motion/react` (M `motion.section`) for stage transitions and panel entrances; every animated element honours `useReducedMotion` (`initial={false}` or disabled entrance). No infinite/performance-heavy animations.

## 17. Security model

- Bearer token from `tokenStorage`; `studentId` always derived server-side.
- Safe descriptors built by `buildSafeRoundDescriptor` — never include `correctAnswer`, scoring internals, or hints about correctness.
- Submit response + `interactionMetrics` posted as-is; the engine validates shape and rejects forged fields (`GAME_INVALID_INPUT`), so the client cannot smuggle correctness.
- Error paths: 401 → clear + redirect; 403 foreign session; 404/409 state errors surface in the page error branch.
- Client bundle probe: no `correctAnswer`/`acceptableIds`/`optimalPath`/`requiredHotspots`/scoring strings in `dist/assets`.

## 18. Tests

`npm test` = **915 pass / 0 fail** (baseline 889 + **26 new**):

| Suite | Count |
| --- | --- |
| `game-session/testing/round-lifecycle.test.js` | 8 |
| `game-session/testing/student-game-api.test.js` | 6 |
| `game-session/testing/frontend-game.test.js` | 12 |

Coverage highlights: full API flow (start → 3 submits → finish) with correct
drag-drop answers built from the store; resume determinism; mixed ten-type
pool start returns a safe descriptor; error mapping 401/403/404/409/400
(forged student ids ignored, foreign-session 403, insufficient pool 409,
wrong-state 409); client fetch contract; choice-storage round-trip + garbage
rejection; registry = exactly the ten types; every renderer statically
rendered from a real `buildSafeRoundDescriptor` through
`createDefaultServerActivityEngine` with no `correctAnswer` leakage; SSR page
renders (no-token gate, no-choice redirect, mission shell, playing shell with
HUD + timer + activity, result panels, completion panel). The playing-shell
SSR test seeds the store's *initial* state in place because Zustand v5 SSR
snapshots read `getInitialState()` (hydration-safe), not the current state.

`npm run lint` — clean. `npm run build` — clean (StudentGamePage lazy chunk
24.58 kB / gzip 7.72 kB). `python3 schemas/validate.py` — PASS (unaffected).

## 19. HTTP smoke

Real HTTP against the composed demo server (in-memory repos):

| Check | Result |
| --- | --- |
| register | 201 (token) |
| mission streams + levels (Bearer) | 200 |
| start session → 201, safe descriptor, no `correctAnswer` | PASS |
| start again → same active session resumed | PASS |
| bad token → 401 | PASS |
| submit rounds (drag-drop, pattern, ordering) → 200, server-scored | PASS |
| no scoring secrets in submit payloads | PASS |
| finish → score + code + breakdown | PASS |
| other student reads foreign session → 403 | PASS |

**20/20.**

## 20. Bundle security probe

`rg` over `dist/assets` for `correctAnswer|acceptableIds|optimalPath|requiredHotspots|scoring` and demo answer fixtures: **none found**.

## 21. Files created

- `src/features/game-session/api/student-server.js` — student-authenticated game Hono app
- `src/features/game-session/api/student-client.js` — browser fetch client
- `src/features/game-session/api/queries.js` — TanStack Query hooks
- `src/features/game-session/round/round-lifecycle.js` — pure lifecycle reducer
- `src/features/game-session/round/round-store.js` — Zustand wrapper
- `src/features/game-session/session/choice-storage.js` — session choice storage
- `src/features/game-session/timer/use-countdown.js` — display-only countdown
- `src/features/game-session/activity/activity-registry.js` — 10-type render map
- `src/features/game-session/activity/activity-renderer.jsx` — `RoundActivity`
- `src/features/game-session/demo/ordering-demo-questions.js` — ordering demo content (completes ten-type pool)
- `src/features/game-session/testing/round-lifecycle.test.js`
- `src/features/game-session/testing/student-game-api.test.js`
- `src/features/game-session/testing/frontend-game.test.js`
- `src/pages/StudentGamePage.jsx` — real `/student/game` page (+ `RoundResultPanel`, `SessionCompletePanel` exports)
- `src/pages/student-game.css`
- `reports/24-task-5.3-student-game-ui.md` — this report

## 22. Files modified

- `src/features/game-session/api/dev-server.js` — student game app composed; shared student identity facade.
- `src/router.jsx` — `/student/game` lazy route.
- `src/features/activity-engine/plugins/{fill-complete,image-interaction,memory,number-logic,pattern,scenario-challenge}/index.js` — added top-level imports so the entries load under Vite's SSR module runner (behaviour unchanged).
- `reports/04-todo.md`, `reports/README.md`, `reports/02-development-log.md`, `README.md` — tracking updates. `reports/03-decisions.md` — updated only if this task introduced a decision (none warranted beyond existing D-016/D-028/D-052/D-076).

## 23. Packages installed

**None.** No new packages.

## 24. Supabase changes

**None.** No migration, no table, no RLS, no Storage policy, no seed changes. The game service continues to read the existing session/round/activity tables exactly as defined in migration 0001.

## 25. Known limitations

- Demo question content is dev-server-only; ordering demo content is new but built strictly from the Task 3.2 ordering schema fixtures.
- The Task 4.4 `x-student-id` demo boundary still exists at `/api/*` (legacy); Task 5.3's `/api/student/game/*` is the token-authenticated path.
- Timer is display-only by design; the server owns time.
- D-076 (§11 previous-level-completion progression) remains deferred backend work; the page renders whatever the backend resolves.
- The demo's demo-student identity in the game store remains as a legacy fallback; the registered-student store is the single source for the student flow.

## 26. Next task

**Task 5.4 — not started.** Backlog candidates: Supabase repository adapters for the game-session service, real content authoring, or progression backend work (D-076). Not begun per plan.