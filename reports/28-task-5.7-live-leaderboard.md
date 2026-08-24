# 28 – Task 5.7: Live Stream Leaderboard

## 1. Task status

**COMPLETED** (2026-08-16). Four stream Top-10 leaderboards with live
Realtime updates, served from the existing `leaderboard_entries` table (0001
§20, no schema change). Students are ranked by best score per (student,
stream) — strictly-better upsert (D-010/D-029), tie-break on completion time
then achieved-at — and see their own highlighted rank. A public
`/leaderboards` page renders all four boards with per-stream tabs, and the
student mission page links to it. The browser→Supabase Realtime channel is
the single approved exception (D-080) and degrades gracefully to "Live
updates off" when VITE env vars are absent.

## 2. Scope

- **Leaderboard service**: `LeaderboardService` (`recordBestScore` +
  `getTopForStream` + `getAllLeaderboards`) with the exported pure helpers
  `isBetterScore` and `TOP_N = 10`. The write path validates input (score
  0–300 integer), derives `displayName` as `${initials} ${fullName}` from
  the student record, and upserts only when strictly better.
- **Repositories**: `MemoryLeaderboardRepository` (dev/tests) and
  `SupabaseLeaderboardRepository` (production) over the 0001 columns; the
  production path uses one covered read on `leaderboard_top10_idx`, one
  point read for the existing best, and a single `(student_id, stream_id)`
  upsert — Free-Tier-lean.
- **API** (Hono, on the shared student app):
  `GET /api/student/leaderboards` and `GET /api/student/leaderboards/:streamId`
  — public (optional Bearer token), mounted before `/api/student/*` in
  `createStackedApp`; auth only upgrades the response with `self: true`.
  Errors map to `LeaderboardError` codes.
- **Best-effort hook**: `GameSessionService.finishSession` calls
  `recordBestScore` after the completion is recorded; failures are caught
  and logged (`console.warn`), never 500 the finish. The next better
  attempt repairs the row.
- **Realtime**: `createLeaderboardRealtimeController` (refcounted — one
  socket regardless of subscribers) over `@supabase/realtime-js` on channel
  `leaderboard_entries`; `useLiveLeaderboard` invalidates the `['leaderboard']`
  query prefix on `POSTGRES_CHANGES` so the board refreshes on any score
  write. `realtimeConfig()` reads `import.meta.env?.VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` at runtime; when absent the controller reports
  `UNAVAILABLE` and the UI shows "Live updates off" (no `.env` change — the
  public anon key remains a deploy-time configuration step).
- **Frontend**: real `/leaderboards` page (`LeaderboardPage.jsx` +
  `leaderboard.css`) with reusable exports (`LeaderboardBoard`,
  `LeaderboardTable`, `LeaderboardSkeleton`, `LeaderboardStatus`,
  `LeaderboardError`, `LiveBadge`), tabs, self-row highlight, retry action,
  a11y (aria-live, keyboard tabs) and reduced-motion support. Entry point
  "View live leaderboards" added to the mission page.
- **Dependency**: `@supabase/realtime-js@^2.112.3` added (browser Realtime
  only; the service-role client stays server-side).
- Tests (50 new), live smoke (69 checks), bundle probe, docs.

Out of scope (per plan): admin UI, Question Builder, certificates,
production question content, Activity/Game Engine changes.

## 3. Ranking & write rules (D-010/D-029)

`leaderboard_entries` is unique per `(student_id, stream_id)`. The stored row
holds the student's **best** score; a candidate is applied only when
`isBetterScore(existing, candidate)`:

1. higher `score` wins;
2. equal score → lower `completionTimeMs` wins (nulls last);
3. equal score + equal time → earlier `achievedAt` wins;
4. otherwise the candidate is a no-op.

Reads sort by `score DESC, completion_time_ms ASC NULLS LAST, achieved_at
ASC` and LIMIT 10. Replays that score lower never overwrite the stored best;
a later equal-score faster attempt does. `TOP_N` is also enforced by the
service for any repository.

## 4. Privacy boundary

The browser can only ever see the public projection:
`{ rank, displayName, score, self }` plus stream identity (id + slug + name).
`studentId` is internal only — the API attaches the viewer's student id from
the token and then strips it via `toPublicEntry`, so `self` works without
ever exposing the identifier (or the login code, token hash, school id or
grade). The page is fully public; the token only enables the self highlight.
Realtime broadcasts only the RLS-visible anon projection of
`leaderboard_entries` (the table already has `anon select` enabled, 0001).

## 5. Realtime design (D-080)

- **One channel, refcounted**: `createLeaderboardRealtimeController` holds a
  single `RealtimeClient` + one `channel('leaderboard_entries')` subscription
  shared by every `useLiveLeaderboard` subscriber; `subscribe`/`unsubscribe`
  refcount so the socket tears down when the page is left.
- **Config**: `realtimeConfig()` returns
  `{ supabaseUrl, anonKey, channelName: 'leaderboard_entries', table: 'leaderboard_entries' }`
  from VITE env vars, or `null` in Node (no `import.meta.env`). The client
  factory is injectable for tests.
- **Status model**: `UNAVAILABLE` (no config) → `CONNECTING` →
  `SUBSCRIBED` (live) → `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` (reconnecting);
  `liveStatusOf` maps it for the `LiveBadge`.
- **Degradation**: with VITE vars unset the page still fully works
  (query-based boards), badge shows "Live updates off". Turning live on is a
  config step only — no code change, no secret exposure.

## 6. Implementation notes

- `createStackedApp` gained a `leaderboardApp` param mounted at
  `/api/student/leaderboards/*` **before** the `/api/student/*` catch-all; in
  the dev server the mission repos must be built before the leaderboard
  service (TDZ order).
- `finishSession` keeps progression as the authoritative record; the
  leaderboard write is derived and best-effort (D-077 style: reads cheap,
  writes idempotent).
- The fake PostgREST client gained the `leaderboard_entries` table and
  multi-column `.order()` with Postgres null semantics (NULLS LAST for
  ascending, NULLS FIRST for descending), so repo/service tests run against
  the real sort contract.

## 7. Tests

50 new tests in `src/features/leaderboard/testing/`:
- `leaderboard-repository.test.js` — memory repo contract + composite sort,
  Supabase repo contract over the deterministic PostgREST fake (read order,
  point read, upsert mapping).
- `leaderboard-service.test.js` — `isBetterScore` matrix (score / time /
  achieved-at, nulls), input validation, display-name derivation, missing
  student skip, 404 stream handling, TOP_N cap with 15 students.
- `leaderboard-api.test.js` — public access, optional-token self flag,
  unknown-stream 404, error mapping, no-private-field payloads.
- `leaderboard-realtime.test.js` — refcounting, status transitions,
  `realtimeConfig`/env handling, event invalidation wiring.
- `leaderboard-session-hook.test.js` — finishSession best-effort write
  (success and failure paths never break finish).
- `frontend-leaderboard.test.js` — SSR page (four public tabs, top-10 board,
  self row, skeleton), `LeaderboardStatus` error/empty states, reduced-motion
  board markup.

`npm test` **1056/1056** (50 new), lint clean, build clean, schema validator
PASS.

## 8. Live smoke (production, 69 checks)

Extended `scripts/smoke-production.mjs` with a leaderboard section against
`fmauqixvdpdgrghuapfs` (real Supabase, real DB), then DB restored to exact
baseline (`leaderboard_entries` back to 0). New checks: all-four-streams
endpoint, science board with A's best 300 at rank 1 + `self:true`, stream
isolation (technology empty), public no-token access (`self:false`), student B
(never played) has no entry, DB row materialised with derived display name,
**best-score rule** (a lower-scoring replay does not overwrite; still a single
row), 404 for an unknown stream, and no private fields leak.

## 9. Bundle security probe

Three-way `grep` over `dist/assets`:

- **A. Credentials**: service-role key — **0 files**.
- **B. JWT material**: no `SUPABASE_JWT_SECRET` exists anywhere in the app
  (student sessions are app-level, Task 5.1); nothing to leak.
- **C. Answer/scoring data**: 0 answer fixtures (no `zone-a`/`zone-b`, no
  correct-answer payloads); the only `scoring`/`correctnessFraction`
  matches are the server-response display strings ("waiting for server
  scoring.", `roundResult?.correctnessFraction ?? 0` for the result panel)
  and error prose — same class as the prior clean probes.

## 10. Warnings / errors

1. **Production bug caught by smoke**: the Supabase upsert wrote the ISO
   string `1970-01-01T00:00:18.088Z` into the `bigint` `completion_time_ms`
   column (`toIso` instead of `toMs`) — every best-score write skipped.
   Fixed in `repositories/supabase.js`; smoke re-ran green (69/69) with the
   leaderboard rows verified live.
2. **SSR test quirk**: react-query v5 renders an optimistic `pending` for an
   errored, no-data query during `renderToStaticMarkup`, so the page-level
   error assertion could never pass. Extracted a pure `LeaderboardStatus`
   gate and tested its error/empty branches directly (client-side error
   rendering is unchanged and correct).
3. **Class-count regexes**: tab/row assertions counted only the non-active
   `class="lb-tab"`/`class="lb-row"` strings; widened to `(?= |")` so
   active/self variants count too.
4. **Local smoke noise**: parallel smoke runs left an orphan server on port
   4101 (EADDRINUSE) and interleaved logs; not a product issue. Clean runs
   with no contention pass 69/69.

## 11. Files created

- `src/features/leaderboard/contracts/contracts.js`
- `src/features/leaderboard/errors.js`
- `src/features/leaderboard/repositories/memory.js`, `supabase.js`, `index.js`
- `src/features/leaderboard/service/leaderboard-service.js`
- `src/features/leaderboard/api/server.js`
- `src/features/leaderboard/client/client.js`
- `src/features/leaderboard/queries/queries.js`
- `src/features/leaderboard/realtime/realtime.js`
- `src/pages/LeaderboardPage.jsx`, `src/pages/leaderboard.css`
- `src/features/leaderboard/testing/leaderboard-repository.test.js`
- `src/features/leaderboard/testing/leaderboard-service.test.js`
- `src/features/leaderboard/testing/leaderboard-api.test.js`
- `src/features/leaderboard/testing/leaderboard-realtime.test.js`
- `src/features/leaderboard/testing/leaderboard-session-hook.test.js`
- `src/features/leaderboard/testing/frontend-leaderboard.test.js`
- `reports/28-task-5.7-live-leaderboard.md` (this report)

## 12. Files modified

- `src/features/game-session/service/game-session-service.js` — optional
  `leaderboardService` + best-effort finish hook.
- `src/features/game-session/api/dev-server.js` / `production-server.js` —
  leaderboard wiring + `createStackedApp` mount order.
- `src/features/game-session/testing/fake-supabase-client.js` —
  `leaderboard_entries` table + multi-column `order()` (Postgres null
  semantics).
- `src/router.jsx` — `/leaderboards` lazy route, title "Live Leaderboards".
- `src/pages/StudentMissionPage.jsx` — "View live leaderboards" entry point.
- `package.json` — `@supabase/realtime-js@^2.112.3`; leaderboard test glob.
- `scripts/smoke-production.mjs` — leaderboard flow + baseline/cleanup.
- `reports/04-todo.md`, `reports/README.md`, `reports/02-development-log.md`,
  `reports/03-decisions.md` (D-080), root `README.md`.

## 13. Live database state

Baseline + after-run (post-cleanup): all tables empty (see §8). No smoke
fixtures left behind; `leaderboard_entries` restored to its exact baseline
count.

## 14. Known limitations

- Live updates require `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` at
  build/deploy time (deliberately NOT added to `.env`); until then the page
  shows "Live updates off" but remains fully functional via queries.
- Top 10 is the fixed board (D-010); there is no "see my rank" modal or
  full-rank list yet.
- No admin visibility into the leaderboards; no question content changes.

## 15. Next task

Task 5.8+ **not started** (per plan). Backlog candidates: admin/progression
viewing, real content authoring, remaining polish.