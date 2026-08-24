# 27 – Task 5.6: Student Profile + Progress Dashboard

## 1. Task status

**COMPLETED** (2026-08-16). Students can now edit their four editable profile
fields (`initials`, `name`, `school`, `grade`) and view a safe, server-derived
progress dashboard at `/student/profile` — per-stream cards (completed /
in-progress / locked, level pips, best score, next level) plus overall
statistics — with the same session model, security boundary and error
conventions as Tasks 5.1–5.5. Task 5.7 and beyond are **NOT started**.

## 2. Scope

- **Backend profile editing**: `StudentService.updateProfile` over the
  existing strict registration gate — only the four editable fields, identity
  always from the session token, `school` resolved to `school_id` via the
  existing school repository.
- **Progress overview**: `ProgressionService.getStudentOverview({ studentId })`
  — a read-only, safe projection over the D-078 progression rows (never raw
  attempts/best score per level, never scoring/answer data).
- **API**: `PUT /api/student/me` (full profile update) and
  `GET /api/student/me/progress` (safe overview) on the existing student Hono
  app; `createStudentApi` gains an optional `progressionService` dependency.
- **Client**: `studentApiClient.updateProfile`/`getProgress` + TanStack Query
  hooks (`useStudentProgress`, `useUpdateProfile`, `useUploadAvatar`), both
  mutations invalidating `['student','me',token]`.
- **Frontend**: real `/student/profile` page — photo halo, edit form
  (validated, a11y), progress overview, per-stream cards, statistics,
  Continue mission / back to mission navigation, session-expiry guard. Entry
  points added on the register success screen and the mission header.
- **Wiring**: dev + production servers pass the mission `streamRepository`
  into a `profileProgressionService`.
- Tests (40 new), live smoke (58 checks), bundle probe, docs.

Out of scope (per plan): leaderboards, admin UI, Question Builder, production
question content, any Activity Engine / Game Engine / Central Scoring changes.

## 3. Profile editing rules

`updateProfile({ token, body })`:

1. **Identity from the token only** — the student is resolved via
   `StudentService.getMe`/`#resolveStudentFromToken`; a forged `studentId` in
   the body is rejected, never used.
2. **Strict field gate** — `body` is the raw JSON body run through the exact
   same `validateRegistrationInput` used at registration. Foreign/privileged
   fields (`score`, `studentId`, `token`, …) → `400 STUDENT_UNEXPECTED_FIELD`;
   blank/oversized values → `400 STUDENT_INVALID_INPUT`. Only
   `initials/name/school/grade` are ever read.
3. **School resolution** — `school` name resolved to `school_id` through the
   existing `schoolRepository` (case-insensitive reuse, create-if-missing),
   identical to registration.
4. **Minimal write** — the repository `updateProfile` updates exactly the
   editable 0001 columns (`initials`, `full_name`, `school_id`, `grade`);
   `login_code` and `profile_photo_path` are never touched (proven by tests).
5. **Safe response** — returns the public student shape (no token hash, no
   login code, no school_id); the avatar URL is re-derived.

## 4. Progress overview projection

`ProgressionService.getStudentOverview({ studentId })` (requires the optional
`streamRepository`; `createStudentApi` throws `500 STUDENT_INTERNAL` if the
API is mounted without it):

- Reads the same-stream level catalogue (`streamRepository.listActive()`) +
  the student's `student_level_progress` rows.
- For each of the four streams builds an approved **level surface** — exactly
  `{ id, number, name, status, access, replayable }` per level (access via the
  D-076 `buildLevelContext`) — and safe aggregates:
  - `completedLevels` / `totalLevels` / `completionPercent` / `completed`;
  - `currentLevel = clamp(maxCompletedNumber + 1, 1, totalLevels)`;
  - `inProgress` = not completed and any attempt exists;
  - `bestScore` (max over completed rows) and `totalAttempts` at the stream
    level only — **never per level**;
  - `nextLevel` = first non-completed, non-locked level context (skips levels
    already completed, so after level 1 the next is level 2).
- `overall = { totalLevels, completedLevels, completedStreams, totalAttempts,
  bestScore }` across all streams.
- No progression internals, no per-level attempts/best score, no scoring
  secrets, no special-access internals ever leave the server (asserted by
  tests and the live smoke).

## 5. API

- `PUT /api/student/me` — `{ initials, name, school, grade }`, Bearer token;
  `200 { student }`. Foreign fields → `400 STUDENT_UNEXPECTED_FIELD`; missing
  token → `401`.
- `GET /api/student/me/progress` — Bearer token; `200 { streams[], overall }`.
  Resolves the student id from the token (never a query/body value).
- `createStudentApi({ service, progressionService = null })` — backward
  compatible; every existing call site (`student-api.test.js`, dev +
  production servers) unchanged.

## 6. Frontend

`/student/profile` (lazy route) renders: photo halo (signed avatar URL or
initials), name, school · grade · initials, "Edit profile" (inline validated
form: initials ≤ 5, name ≤ 100, school ≤ 120, grade 6–11 select, photo
optional), Continue mission, Back to mission, then the progress overview:
one `role="progressbar"` per stream + the overall bar, five level pips per
stream, next-level chips, per-stream best score / attempts, and overall
statistics (levels completed, streams completed, attempts, best score
×300 / ×450). No token → `Navigate` back to register (the mission/register
pages already guard the same way). Entry points: register success panel and
returning-student panel gain "View your profile"; the mission header gains a
profile link.

## 7. Files created

- `src/pages/StudentProfilePage.jsx` — page + exported `ProgressOverview`,
  `StreamCard`, `Statistics`, `PhotoHalo`, `ProfileEditForm`.
- `src/pages/student-profile.css` — page styles.
- `src/features/student/testing/profile-service.test.js` (12)
- `src/features/student/testing/profile-api.test.js` (12)
- `src/features/student/testing/frontend-profile.test.js` (8)
- `src/features/progression/testing/progression-overview.test.js` (8)

## 8. Files modified

- `src/features/student/service/student-service.js` — `updateProfile`.
- `src/features/student/repositories/contracts.js` — `updateProfile` on the
  `StudentRepository` typedef.
- `src/features/student/repositories/memory.js` / `supabase.js` — memory +
  service-role Supabase `updateProfile` (editable columns only).
- `src/features/student/api/server.js` — `PUT /me`, `GET /me/progress`,
  optional `progressionService`.
- `src/features/progression/service/progression-service.js` —
  `getStudentOverview` + optional `streamRepository` (D-078 unchanged).
- `src/features/game-session/api/dev-server.js` / `production-server.js` —
  `profileProgressionService` wiring.
- `src/features/student/api/client.js` / `queries.js` — `updateProfile`,
  `getProgress`, `useStudentProgress`, `useUpdateProfile`, `useUploadAvatar`.
- `src/router.jsx` — `/student/profile` lazy route.
- `src/pages/StudentRegisterPage.jsx`, `src/pages/StudentMissionPage.jsx` —
  profile entry points.
- `scripts/smoke-production.mjs` — profile + progress flow (see §13).

## 9. Packages installed

None. No new dependencies.

## 10. Migrations / schema

None. Reuses the existing `students`, `schools`, `student_level_progress`,
`student_progress` tables and the 0001 constraints. `schemas/validate.py`
PASS (24/72/12/12).

## 11. Tests

40 new tests, total suite 966 → **1006**:

- `profile-service.test.js` (12): token identity, strict field gate
  (foreign fields, blank, oversized), school reuse case-insensitive +
  create-if-missing, grade validation, only the 4 editable columns written
  (login code untouched), missing-student safe error, safe public response.
- `profile-api.test.js` (12): PUT `/me` happy path, 400/401/404 matrix,
  foreign-field and forged-studentId rejection, `GET /me/progress` happy path
  + missing-progression 500, stacked demo-app integration, no token leakage.
- `progression-overview.test.js` (8): fresh zero overview, truthful advance
  after level 1 (next level 2), completed-stream clamp + null next, special
  access, per-level surface safety, per-student isolation, cross-stream
  isolation, malformed-id defence.
- `frontend-profile.test.js` (8): client fetch contract for `updateProfile`
  (PUT `/me`, Bearer, four fields) + `getProgress`; SSR page gated without a
  token; SSR page renders identity / progress / stream cards / statistics with
  five `role="progressbar"` and correct `aria-valuenow`; SSR markup contains
  no loginCode / studentId / answer / special-access / credential data; edit
  form labelled fields + `aria-invalid` + `role="alert"`; stream card next
  level vs completed; avatar MIME/size policy.

## 12. Verification gates

- `npm test`: **1006/1006**, two consecutive full runs (stable).
- `npm run lint` (oxlint): clean.
- `npm run build` (vite): clean (StudentProfilePage chunk 10.98 kB).
- `python3 schemas/validate.py`: PASS.
- Live smoke `npm run smoke:production`: **58/58** against
  `fmauqixvdpdgrghuapfs`.

## 13. Live smoke (profile + progress flow)

Extended from 49 → 58 checks. Profile update moves the student to a second
smoke school (`… Profile`), `me` reflects it, foreign `score` and forged
`studentId` bodies are rejected with `400 STUDENT_UNEXPECTED_FIELD`. Progress
overview starts all-zero for a fresh student (4 streams, level 1 next),
advances truthfully after each level completion (after level 1: science 1/5,
current 2, next 2, best = session score; after level 2: 2/5, current 3), per
level rows expose exactly `{ id, number, name, status, access, replayable }`
(no attempts/bestScore), and student B stays zero while A advances. Cleanup
switched to the ilike `STEM QUEST Smoke %` pattern so BOTH smoke schools are
removed; DB restored to exact baseline: questions=0 students=0 schools=0
sessions=0 scores=0 answers=0 level_progress=0 stream_progress=0.

## 14. Bundle security probe

Three-way `grep` over `dist/assets` (built fresh; `rg` is not installed here):

- **A. Credentials** (`SUPABASE_SERVICE_ROLE_KEY` / `service_role` /
  `VITE_SUPABASE` / `sb_secret_`): **0** files.
- **B. JWT material** (any `eyJ…` JWT): **0** files.
- **C. Answer data**: **0** files — the only `correctAnswer` token is the
  `correctAnswerExposed` security-guard **error name**, not data.

## 15. Bugs found / fixed

- Two smoke assertions initially expected `400 STUDENT_INVALID_INPUT` for
  foreign fields; the implemented gate correctly returns the distinct
  `STUDENT_UNEXPECTED_FIELD` (still 400). Smoke assertions corrected to the
  real contract.
- A `Number(x) ?? 0` constant-nullishness lint warning in the overview
  aggregation was fixed to `Number(x) || 0` (handles `NaN`).
- `nextLevel` originally picked the first non-locked level (always level 1);
  corrected to skip completed levels so it reports the true next playable
  level (level 2 after completing level 1).

## 16. Live database state

Baseline + after-run (post-cleanup): all tables empty (see §13). No smoke
fixtures left behind.

## 17. Docs updated

- `reports/27-task-5.6-student-profile-progress.md` (this report).
- `reports/02-development-log.md` — Task 5.6 entry.
- `reports/03-decisions.md` — D-079 (profile edit gate + safe overview
  projection).
- `reports/04-todo.md` — Task 5.6 marked DONE; "Full profile editing" removed
  from the backlog.
- `reports/README.md` — index row 27.
- Root `README.md` — profile feature text, test count 1006, decisions
  D-001…D-079, reports list.

## 18. Known limitations

- Avatar **upload** replaces an existing photo; no delete/removal toggle yet.
- Editing the student's name/school/grade does not revoke their active
  session tokens (sessions are per-student, not per-profile-fields).
- `student_progress`/`student_level_progress` remain service-role only (no
  RLS; browser never touches PostgREST — D-027).
- No admin tooling to grant/revoke special access or view progression yet
  (deferred by plan).

## 19. Next task

Task 5.7+ **not started**. Backlog candidates: leaderboards, admin/progression
viewing, real content authoring, remaining polish.