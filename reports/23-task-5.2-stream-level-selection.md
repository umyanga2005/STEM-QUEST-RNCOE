# 23 – Task 5.2: Student Stream & Level Selection UI

> Status: **COMPLETE** (2026-08-15). Verified end-to-end: 889/889 tests, lint
> clean, build clean, schema validator PASS, real HTTP smoke pass. No Supabase
> schema/RLS/Storage changes. Task 5.3 (student game UI) NOT started.

## 1. Task status

**COMPLETE.** The "Choose your stream" stage is implemented on top of the
Task 5.1 foundation: an authenticated student (via the stored opaque session
token) picks one of the four STEM streams, then one of the five levels, then
begins a mission. The selection is backed by real streams/levels API endpoints
that mirror the authoritative game-session unlock rule. 38 new mission tests
bring the suite to **889 pass / 0 fail**.

## 2. Scope

This task delivered only:

- `GET /api/student/mission/streams` — active streams with selection summaries
- `GET /api/student/mission/streams/:streamId/levels` — one stream + resolved
  level cards
- Pure access resolver (unlock/status model) + read-only mission service
- In-memory + service-role Supabase repositories (read-only catalogue +
  progression sources)
- Frontend API methods, TanStack Query hooks, pure selection-state reducer,
  expired-session guard, `useMissionSelection` hook
- Real `/student/mission` page (stream picker → level picker → begin),
  stream icons, styling
- `/student/register` success now routes here (`NEXT_STEP_PATH`)
- Begin Mission navigates to `/student/game` (still a placeholder) with the
  chosen `{ streamId, levelId }` in router state
- Tests (access resolver, service, API, frontend), HTTP smoke, report

NOT started (task boundary): game UI (5.3), leaderboard UI, certificate UI,
admin panel, question builder, production question authoring, exhibition
polish, badge/realtime work.

## 3. Stream model

The stream picker renders exactly the **four approved streams** (existing
`streams` catalogue rows, migration 0001 — no new data):

| id | slug | name | display order |
| --- | --- | --- | --- |
| 1 | `science` | Science | 1 |
| 2 | `technology` | Technology | 2 |
| 3 | `engineering` | Engineering | 3 |
| 4 | `mathematics` | Mathematics | 4 |

Each stream summary (from `buildStreamSummary`) carries: `id`, `slug`, `name`,
`description` (nullable, production text is Task 3.x content; only the demo
seed carries approved student-friendly descriptions), `themeColor` (nullable,
frontend has per-slug glyph fallbacks), `levelCount`, `unlockedCount`, and
`completedCount`. The picker shows exactly these four — no admin-defined
"extra" streams can appear unless the `streams` catalogue gains one.

## 4. Level model

Exactly **five levels per stream**, from the `levels` catalogue (migration
0001), ordered by `number` 1..5:

| number | name |
| --- | --- |
| 1 | Beginner |
| 2 | Easy |
| 3 | Intermediate |
| 4 | Advanced |
| 5 | Hard |

Level names/timers are data-driven (D-034); the selection UI only surfaces
`id`, `number`, `name` plus the derived access/status fields. Inactive levels
are excluded. The composite FK D-039 guarantees a level can never belong to a
different stream than its `stream_id`, so the resolver never needs to double
check stream membership.

## 5. Access / unlock model

The UI is a **mirror, never a gate** (D-027/D-033): play entitlement is
re-checked by `GameSessionService.applyUnlockRule` at session start. The
resolver mirrors that rule exactly (`resolveLevelAccess`):

- `level.number === 1` → **`available`** (always open, matching the backend).
- Levels 2..5 are covered when an **active** special-access grant matches
  `grant.streamId === level.streamId` **or** `grant.levelId === level.id`
  → **`special`**.
- Otherwise → **`locked`** (not selectable).

Semantic note recorded as decision D-076: the current backend rule treats ANY
grant whose `stream_id` matches as covering the whole stream (the `streamId OR
levelId` check), and the composite FK D-039 always pairs a `level_id` with its
`stream_id` — so level-specific-only coverage is not reachable today. The
architecture's §11 previous-level-completion progression is designed but not
yet backend-enforced; the UI documents it as future work, not as a local gate.

## 6. Progression status model

Read-only, derived from `student_level_progress` (`resolveLevelStatus`):

- `bestScore` row with `isCompleted = true` → **`completed`** (replayable —
  `replayable: true`, still selectable).
- `attempts > 0`, not completed → **`in-progress`**.
- never attempted / no row → **`not-started`**.

The status is display only; nothing here writes progression.

## 7. Grade ≠ level

Grade is **suitability metadata only** (D-045). The level context carries no
grade field and no grade-based gating exists anywhere in the resolver or
service (verified by tests: `'grade' in levelContext === false` and grade is
not part of access resolution).

## 8. API endpoints

Composed into the existing demo server (`createStackedApp`, URL-prefix
composition — the mission prefix is mounted **before** the generic student
prefix so its routes win):

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/student/mission/streams` | GET | `Bearer <token>` | `{ streams: [...] }` summaries |
| `/api/student/mission/streams/:streamId/levels` | GET | `Bearer <token>` | `{ stream, levels: [...] }` resolved cards |

Auth reuses `StudentService.getMe` (the SAME Task 5.1 session — no second
auth system). Errors map: `StudentError` → student HTTP mapping (401 etc.),
`MissionError` → 400 invalid input / 404 unavailable / 401 (defensive) / 500.
Responses contain only selection-safe data — no scores beyond progression
flags, no tokens, no admin data.

## 9. Access resolver (pure)

`src/features/mission/access/access-resolver.js` — dependency-free functions:
`resolveLevelAccess`, `resolveLevelStatus`, `selectableAccess`,
`buildLevelContext`, `buildStreamSummary`. No I/O, no React, no side effects;
unit-tested in isolation.

## 10. Mission service

`src/features/mission/service/mission-service.js` — server-only orchestration
composing the read-only repositories through the resolver. `getMissionOverview
({ studentId })` returns all active streams with summaries; `getMissionLevels
({ studentId, streamId })` validates the stream (404 unavailable if unknown,
inactive, or empty), then returns the stream + resolved level cards. The
service is NOT an identity boundary — authentication happens upstream via
`StudentService.getMe` and the student object is passed in.

## 11. Repositories

- `contracts.js` — domain typedefs + repository interfaces (read-only):
  `StreamRepository.listActive/findById`, `LevelRepository.listForStream`,
  `ProgressRepository.getStudentProgress`,
  `SpecialAccessRepository.getActiveGrants`.
- `memory.js` — store-backed implementations for tests + demo.
- `supabase.js` — service-role PostgREST adapters over the existing
  `getSupabaseServerClient`; column names match migration 0001 exactly
  (`streams`, `levels`, `student_progress`, `student_level_progress`,
  `special_access`). `special_access` active+not-expired filtering mirrors
  how the backend resolves grants.
- `index.js` — `mode: 'memory' | 'supabase'` factory (mirrors student repos).

## 12. Frontend architecture

- `src/features/student/api/client.js` — extended with `getMissionStreams`
  and `getMissionLevels` (same Bearer-token client; the only student surface
  React may touch).
- `src/features/mission/api/queries.js` — `useMissionStreams(token)` (key
  `['mission','streams',token]`) and `useMissionLevels(token, streamId)` (key
  `['mission','levels',token,streamId]`, enabled only once a stream is chosen
  so levels fetch scoped, never all).
- `src/features/mission/selection/selection-state.js` — pure reducer
  (streams → levels → ready, back navigation, locked-level refusal).
- `src/features/mission/selection/use-mission-selection.js` — hook composing
  state + queries for one screen.
- `src/features/mission/session-guard.js` — pure `isExpiredSession(query,
  token)` (401 + active token → redirect to `/student/register`; the server
  decides expiry, the UI only reacts).
- `src/pages/StudentMissionPage.jsx` + `student-mission.css` +
  `stream-icons.jsx` — the real `/student/mission` page.
- `src/router.jsx` — `/student/mission` route (lazy) added to `APP_ROUTES`.

## 13. TanStack Query usage

All server-owned selection data lives in TanStack Query (D-016), keyed by
token so each student's summaries stay isolated. Ephemeral selection state is
local React state (`useState` in the hook); nothing is put into a global
Zustand store.

## 14. Zustand usage

Unchanged. `src/stores/ui-store.js` is untouched (ephemeral toasts only). No
stream/level/session data was added to Zustand.

## 15. Selection state model

`SELECTION_STEP = { streams, levels, ready }`:

```
STREAMS --chooseStream--> LEVELS --chooseLevel--> READY
   ^                          |                      |
   +-------All streams--------+    Change level -----+
```

`selectLevel` refuses `selectable === false` levels (returns the same state);
`chooseStream` clears any prior level choice; `canBegin` is true only in
`ready` with both ids set. Pure and unit-tested.

## 16. Session guard / redirect

- No stored token → `<Navigate to="/student/register" replace />` (page is
  fully gated — static-render test asserts no picker markup renders).
- `useEffect` detects `isExpiredSession(streamsQuery, token)` (401) → clears
  the token storage → redirect. The server is the only expiry authority
  (`StudentService.getMe`); there is no local TTL copy.

## 17. UI

`/student/mission` follows the STEM QUEST visual language (dark, gradient,
mobile-first):

- Header: **STEM QUEST** + greeting from the safe public `/me` name.
- Progress strip (mirrors registration): 1 · Register → 2 · Choose your
  stream → 3 · Begin the mission; step 2 active on the picker, step 3 on the
  ready panel.
- **Stream picker** — a responsive grid of four buttons, each with an inline
  SVG glyph (science atom / technology chip / engineering gear / mathematics
  π), name, student-friendly description (demo), and "X of 5 levels open"
  meta. Buttons carry a descriptive `aria-label`.
- **Level picker** — five rows (number badge, name, status label New / In
  progress / Completed, or Locked for locked levels). Locked rows are
  `disabled` + `aria-disabled`; selectable rows include the arrow affordance.
  "← All streams" returns to the picker.
- **Ready panel** — stream glyph + "Stream · Level N · Name" summary,
  primary **Begin the mission**, plus Change level / Change stream.
- Begin → `navigate('/student/game', { state: { streamId, levelId } })` —
  React Router `state` is the approved mechanism (no fake localStorage flags,
  no hard-coded student ids). `/student/game` remains the Task 5.3
  placeholder.
- Loading and non-auth error states with retry (no premature redirect on
  5xx — only 401 expires the session).

## 18. Accessibility

- Real `<button>` elements everywhere (keyboard reachable; static-render
  test asserts `type="button"`).
- `aria-label` on stream cards, `aria-disabled` on locked levels,
  `aria-hidden` on icons/decor, `role="presentation"` on the progress strip,
  `role="status"`/`role="alert"` for loading/errors.
- Status labels are text (never color-only); `:focus-visible` rings on all
  interactive controls; touch targets ≥ 44 px.
- `prefers-reduced-motion` disables entrance animation (verified: reduced
  render emits `transform:none`, no `transition`).

## 19. Responsive behavior

Mobile-first single card (max-width 720–760 px), `grid-template-columns:
repeat(auto-fit, minmax(200px, 1fr))` for the stream grid, flex column for
levels, `clamp()` typography, flex-wrap on the progress strip and ready
actions. No horizontal overflow at 320 px; card-contained layout scales to
phones, tablets, laptops, and exhibition touchscreens.

## 20. Animation

Motion (`motion/react`) entrance fade + slide on each step, gated on
`useReducedMotion()` plus the CSS `prefers-reduced-motion: reduce` override.
No looping/distracting animation.

## 21. Security model

- No Supabase in the browser — the mission routes require the Bearer token
  and authenticate via `StudentService.getMe` (D-027); responses never expose
  tokens, hashes, admin data, or raw internals.
- `MissionError.toPublic()` maps to stable, safe messages by category;
  `errorToHttp` never leaks PostgREST/console internals (500s log server-side
  only).
- The play gate is NOT moved to the client: locked states are UX mirrors and
  `GameSessionService.applyUnlockRule` remains authoritative at session start.
- No new packages, no schema/RLS/Storage changes, no hard-coded student ids,
  no fake localStorage flags.

## 22. Tests

`npm test` = **889 pass / 0 fail** (was 851; **+38 new mission tests**):

| Suite | Count |
| --- | --- |
| `mission/testing/access-resolver.test.js` | 12 |
| `mission/testing/mission-service.test.js` | 12 |
| `mission/testing/mission-api.test.js` | 7 |
| `mission/testing/frontend-mission.test.js` | 7 |

Coverage highlights: level 1 always open; levels 2..5 locked without grants;
stream-wide grant unlocks all; level-specific grant covers the whole stream
(backend `applyUnlockRule` semantics, D-076); cross-stream grants never leak
(D-039 composite); expired/inactive grants ignored; status derivation
(not-started / in-progress / completed) and replayability; grade is never a
level gate; inactive levels excluded; unknown/inactive streams → 404; invalid
student id → 400; missing/bogus/expired tokens → 401 (`STUDENT_UNAUTHORIZED` /
`STUDENT_INVALID_TOKEN` / `STUDENT_TOKEN_EXPIRED`); unknown mission route →
404; selection reducer flow + locked refusal + back navigation; `isExpiredSession`
only reacts to 401 from an active token; client fetch contract (Bearers,
paths, expirable errors); static SSR renders of the real page (no-token gate,
4 streams + descriptions + aria-labels, level step with 5 rows + locked
disabled + statuses, ready step with begin action, keyboard-reachable
buttons + reduced motion).

`npm run lint` — **clean** (oxlint). `npm run build` — **clean**
(StudentMissionPage lazy chunk 8.90 kB / gzip 2.63 kB + 5.41 kB CSS).
`python3 schemas/validate.py` — 24/72/12/12 PASS (unaffected).

## 23. HTTP smoke

Real HTTP against the composed demo server (in-memory repositories) + Vite
dev server:

| Request | Result |
| --- | --- |
| `GET /` (Vite dev) | 200 |
| `GET /student/register`, `/student/mission`, `/student/game`, `/leaderboards`, `/admin/questions` | 200 (SPA) |
| `POST /api/student/register` | 201 (token) |
| `GET /api/student/mission/streams` (valid token) | 200, 4 streams (science/technology/engineering/mathematics), counts 1/5 unlocked each |
| `GET /api/student/mission/streams/1/levels` (valid token) | 200, `1:available 2:locked 3:locked 4:locked 5:locked` |
| `GET /api/student/mission/streams` (no token) | 401 |
| `GET /api/student/mission/streams` (bogus token) | 401 |

## 24. Files created

- `src/features/mission/errors.js` — MissionError + stable codes + public messages
- `src/features/mission/access/access-resolver.js` — pure unlock/status resolver
- `src/features/mission/service/mission-service.js` — server orchestration
- `src/features/mission/repositories/contracts.js` — read-only repo contracts
- `src/features/mission/repositories/index.js` — repository factory
- `src/features/mission/repositories/memory.js` — in-memory repos (tests/demo)
- `src/features/mission/repositories/supabase.js` — service-role adapters
- `src/features/mission/api/server.js` — Hono mission routes + error map
- `src/features/mission/api/queries.js` — TanStack Query hooks
- `src/features/mission/selection/selection-state.js` — pure selection reducer
- `src/features/mission/selection/use-mission-selection.js` — selection hook
- `src/features/mission/session-guard.js` — expired-session helper
- `src/features/mission/demo/seed.js` — demo stream descriptions
- `src/features/mission/testing/access-resolver.test.js`
- `src/features/mission/testing/mission-service.test.js`
- `src/features/mission/testing/mission-api.test.js`
- `src/features/mission/testing/frontend-mission.test.js`
- `src/pages/StudentMissionPage.jsx` — real `/student/mission` page
- `src/pages/student-mission.css` — page styling
- `src/pages/stream-icons.jsx` — inline SVG stream glyphs
- `reports/23-task-5.2-stream-level-selection.md` — this report

## 25. Files modified

- `src/features/student/api/client.js` — added `getMissionStreams` /
  `getMissionLevels` (reuses the single student client surface).
- `src/features/student/registration/registration-fields.js` —
  `NEXT_STEP_PATH` `'/student/game'` → `'/student/mission'` (this task
  legitimately owns that contract).
- `src/features/student/testing/frontend-registration.test.js` — the two
  `NEXT_STEP_PATH`/`nextStep()` assertions updated to `/student/mission`
  (not weakened).
- `src/features/game-session/api/dev-server.js` — mission app composed into
  `createStackedApp` (mounted before the student prefix), mission memory
  repos seeded from `demoBaseData()` + approved descriptions; `createDemoApi`
  returns `missionService`.
- `src/router.jsx` — `/student/mission` lazy route added.
- `package.json` — test glob extended to include
  `src/features/{activity-engine,game-engine,game-session,student,mission}/testing/**/*.test.js`.
- `reports/04-todo.md`, `reports/README.md`, `reports/02-development-log.md`,
  `reports/03-decisions.md` (D-076), `README.md` — tracking updates.

## 26. Packages installed

**None.** No new packages were added.

## 27. Supabase changes

**None.** No migration, no new table, no RLS changes, no Storage policy
changes, no seed changes. The mission repositories READ the existing
`streams`, `levels`, `student_progress`, `student_level_progress`, and
`special_access` tables exactly as defined in migration 0001.

## 28. Known limitations

- **§11 previous-level-completion progression is not backend-enforced.**
  The UI mirrors the current backend rule (level 1 open, grants unlock), so
  levels 2..5 stay locked for a fresh student even after completing level 1.
  Unlocking by "previous level completed" is designed in the architecture
  (§11) and recorded as decision D-076 / future backend work — the UI is
  already built to render whatever the backend resolves.
- Stream descriptions only exist in the demo seed; production `streams`
  descriptions are content (Task 3.x) and remain null in the picker until
  authored.
- `themeColor` is null in the demo; stream glyphs use per-slug fallback
  styling, so the picker still differentiates streams.
- `/student/game` is still a placeholder — Begin Mission passes
  `{ streamId, levelId }` in router state for Task 5.3 to consume.

## 29. Next task

**Task 5.3 — Student Game UI.** The mission-selection page already hands the
game page `{ streamId, levelId }` via router state; the next stage builds the
session screen on top of the existing Game Session API. Do not begin it as
part of Task 5.2.