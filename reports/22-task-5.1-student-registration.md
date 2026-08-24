# 22 – Task 5.1: Student Registration & Lightweight Session Foundation

> Status: **COMPLETE** (2026-08-15). Verified end-to-end: 851/851 tests, lint
> clean, build clean, real HTTP smoke pass, client-bundle security probe 0
> leaks. No Supabase schema/RLS/Storage changes. Task 5.2 (stream/level
> selection) NOT started.

## 1. Task status

**COMPLETE.** Student registration, student identity, and the lightweight
student session required by the approved architecture are implemented and
verified. The foundation is test-backed (66 new student tests) and fully
documented.

## 2. Scope

This task delivered only:

- Student registration (`/student/register` real page)
- Student identity (students as normal application records)
- Lightweight student session (opaque token, hashed at rest)
- Optional profile-photo foundation (server-side upload, private bucket)
- Registration + session + avatar backend APIs
- Frontend API layer, TanStack Query `/me`, minimal token storage
- Tests, HTTP smoke, bundle probe, report

NOT started (task boundary): stream/level selection UI (5.2), game UI,
leaderboard UI, certificate UI, admin panel, question builder, production
question authoring, exhibition polish, full profile editing, realtime
leaderboard, badges, certificate generation.

## 3. Student identity model

Students are **normal application records** in `public.students` (D-005).
They are **NOT** Supabase Auth users — only administrators use Supabase Auth.
Students never access Supabase directly; every student data operation flows
through the Hono backend, which uses the service role (D-027). The browser
holds only a lightweight opaque session token.

Public identity is privacy-conscious: `initials + name` on all public
surfaces. Registration asks for nothing beyond Initials, Name, School, Grade
(no email, password, phone, address, date of birth).

## 4. Registration fields

| Field | Required | Notes |
| --- | --- | --- |
| `initials` | yes | 1–5 chars (DB CHECK `char_length BETWEEN 1 AND 5`), trimmed |
| `name` | yes | `full_name` column, trimmed, ≤ 100 chars, Unicode-safe |
| `school` | yes | resolved to `schools.id` (find-or-create by trimmed name, case-insensitive), ≤ 120 chars |
| `grade` | yes | `smallint` 6–11 (DB CHECK `BETWEEN 6 AND 11`), integer only |
| `photo` | no | optional profile photo, never required |

The server also generates a unique kiosk `login_code` (6 chars, unambiguous
alphabet) for the future kiosk rejoin flow — stored only, never shown to the
browser in privileged contexts beyond the one-time success screen.

## 5. Validation rules

`src/features/student/validation.js` is the single shared validator
(client-friendly messages, server-authoritative enforcement):

- **Initials:** required, trimmed, blank rejected, max 5 chars.
- **Name:** required, trimmed, blank rejected, max 100 chars.
- **School:** required, trimmed, blank rejected, max 120 chars.
- **Grade:** required; integer only; `6 ≤ grade ≤ 11`. Accepts a JS number or
  an integer numeric string (`'7'`, `'07'`); rejects `5`, `12`, `6.5`,
  `'abc'`, `''`, `null`.
- **Strict field gate:** a registration request may contain ONLY
  `{ initials, name, school, grade }`. Any other (privileged) field — e.g.
  `scores`, `progression`, `isAdmin`, `token`, `specialAccess`,
  `leaderboardScore` — is rejected with `STUDENT_UNEXPECTED_FIELD` (400),
  never silently trusted.
- **Unicode:** names and schools are not restricted to ASCII (Sri Lankan
  names supported; verified with Sinhala test data).
- Server-side validation is authoritative; the client uses the same module
  for inline feedback only.

## 6. Session mechanism

Registration → backend creates `students` + `schools` rows → backend creates
one `student_sessions` row → the browser receives the raw opaque token once →
the browser sends it as `Authorization: Bearer <token>` → the backend hashes
it and resolves the student. Token lifetime default 3600 s (overridable via
`game_settings` key `auth.session_ttl_seconds`). Expired, revoked, or unknown
tokens are rejected; disabled students are rejected. This uses the existing
`student_sessions` table exactly — no new table, no duplicate session system.

## 7. Token security

- CSPRNG generation via Node `crypto.randomBytes(32)` = 256 bits
  (≥ 128-bit requirement, D-040) — no `Math.random()`, no predictable ids, no
  student id as token, no timestamp-only tokens.
- Only the **SHA-256 hash** (`token_hash`) is stored, on the UNIQUE
  `token_hash` column. The raw token is returned once to the client.
- Raw tokens and hashes are never logged and never returned again (verified
  by tests that capture `console` output and assert no leak).
- No service-role key, Supabase secret, or admin credential ever reaches the
  browser.

## 8. API endpoints

Composed into the existing Hono demo server (`createStackedApp`, URL-prefix
composition — the game API keeps its own behaviour):

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/student/register` | POST | none | register; returns `{ token, expiresAt, loginCode, student }` |
| `/api/student/me` | GET | `Bearer <token>` | safe profile `{ id, initials, name, school, grade, avatarUrl }` |
| `/api/student/me/avatar` | PUT | `Bearer <token>` | optional photo upload (multipart field `photo`) |

`/me` never exposes token, token hash, login code, admin data, scores,
progression, storage internals, or audit fields.

## 9. Frontend architecture

- `src/features/student/api/client.js` — the ONLY student surface React may
  touch. Pure `fetch` against the Hono API; no Supabase calls in the browser.
- `src/features/student/api/queries.js` — TanStack Query hooks (server data).
- `src/features/student/session/token-storage.js` — minimal `sessionStorage`
  helper storing only the opaque token (session-scoped — right for a shared
  exhibition kiosk; cleared when the tab closes).
- `src/features/student/registration/controller.js` — framework-free flow
  controller (submit → token store → optional avatar → success/error),
  unit-testable without a DOM.
- `src/pages/StudentRegisterPage.jsx` — the real `/student/register` page
  (replaces the route placeholder for this route only).
- `/student/game` remains a placeholder (`NEXT_STEP_PATH = '/student/game'`
  is used only as the next-step redirect after success — Task 5.2 not
  started).

## 10. TanStack Query usage

`useStudentMe(token)` in `src/features/student/api/queries.js` owns the
authenticated `/me` server data (query key `['student','me',token]`, enabled
only when a token exists, `staleTime` 60 s, retry 1). Registration is a
mutation handled by the controller + API client (separate and clear — no
server state for an unregistered visitor). Server-owned student data is NOT
put into a global Zustand store.

## 11. Zustand usage

The existing `src/stores/ui-store.js` is unchanged (ephemeral toast UI only).
No student/session data was added to Zustand — server data belongs to TanStack
Query, and the token lives in the minimal storage helper. The Activity Engine
state was not touched.

## 12. Registration UI

`/student/register` renders the STEM QUEST visual language (dark, futuristic,
gradient accents), mobile-first:

- Header: **STEM QUEST / Student Registration**
- Progress strip: 1 · Register → 2 · Choose your stream → 3 · Begin the
  mission (upcoming steps clearly marked as future)
- Four fields: Initials *, Name *, School *, Grade * (select with options
  Grade 6–11 and a "Choose your grade" prompt)
- Profile photo (optional) block
- Primary submit: **Start Your STEM Quest** (disabled + "Starting your
  mission…" while submitting)
- Footnote: no email/password needed
- Success panel: welcome, login code display, optional photo confirmation,
  "Continue to your mission" → redirect to the Task 5.2 placeholder route
- Returning-session banner: a stored token verified via `/me` offers
  "Continue your mission" or "Start a new registration"

## 13. Profile photo behavior

- Optional — never required; the student can always continue without it.
- UX: `Profile photo (optional)` label, Choose Photo button, live preview,
  size/format hint, Remove photo button.
- If upload fails after registration, the student is NOT left with a broken
  profile: registration completes and a non-blocking warning explains the
  photo was skipped (optional).

## 14. Storage behavior

- Bucket: private `student-avatars` (existing, migration 0003 — ≤ 200 KB,
  JPEG/PNG/WebP enforced at bucket level).
- Backend/service-role upload only; **no direct browser upload** to Supabase.
- Server-side MIME whitelist, size cap (200 KB), and empty-file checks before
  any write (`security/avatar.js`).
- Storage path is `{numeric-student-id}/profile.{ext}` — built from the
  numeric id + validated MIME-derived extension, never from a user-controlled
  filename; path traversal is impossible.
- `students.profile_photo_path` stores the path only (never binary). `/me`
  returns a short-lived signed URL via the backend.
- No image conversion library was added (backend has none) — accepted source
  formats within the bucket rules; normalization documented as a later step.

## 15. Accessibility

- Labels connected to inputs (`htmlFor`/`id`), semantic `<form>`/`<main>`,
  keyboard navigable, visible `:focus-visible` focus rings.
- `aria-invalid` + `aria-describedby` on validated controls; per-field error
  messages with `role="alert"`.
- `aria-live="polite"` status region for submission/error announcements.
- Controls ≥ 44 px min-height (48 px inputs, 52 px primary button, 44 px
  secondary buttons).
- Errors never rely on color alone (icon + text). `prefers-reduced-motion`
  disables animation.
- Verified by a static SSR render of the real page asserting the a11y
  contract (labels connected, aria-live present, submit present, optional
  photo, no privileged fields).

## 16. Responsive behavior

Mobile-first single-column card (max-width 460–480 px) with `clamp()`
typography, flex-wrap on progress strip / photo / buttons, and a 768px
media-query widening. Layout is card-contained so there is no horizontal
overflow at 320 px. Suitable for phones, tablets, laptops, and exhibition
touchscreens (large touch targets).

## 17. Animation

Motion (`motion/react`) used purposefully: page/card entrance (fade + slide),
success transition (fade + scale), preview image. All gated on
`useReducedMotion()`, plus a CSS `prefers-reduced-motion: reduce` override.
No distracting/looping animation.

## 18. Security model

- Students never touch Supabase; all writes flow through the trusted Hono
  backend (service role). The service-role key lives only in server env
  (`SUPABASE_SERVICE_ROLE_KEY`, never `VITE_*`), enforced by
  `game-session/repositories/supabase-client.js`.
- Registration is a strict field gate — privileged fields (scores,
  progression, special access, admin, leaderboard score, token) are rejected.
- Protected APIs require a valid, unexpired, unrevoked session for an active
  student.
- Session tokens CSPRNG + SHA-256 hashed at rest; raw token returned once.
- `errorToHttp` maps only student-safe public messages; internals never leak
  (no "PostgREST error 23505" style output).
- Verified by security tests (see §19) covering unauthenticated access,
  invalid/expired/revoked/malformed tokens, no token/hash leaks, no
  privileged-field acceptance, no service-role/credentials in the client
  bundle (§21).

## 19. Tests

`npm test` = **851 pass / 0 fail** (was 785 before Task 5.1; **+66 new
student tests**):

| Suite | Count |
| --- | --- |
| `student/testing/student-service.test.js` | 32 |
| `student/testing/frontend-registration.test.js` | 22 |
| `student/testing/student-api.test.js` | 12 |

Coverage highlights: valid registration; missing/blank/overlong initials,
name, school; grade 5 / 12 / decimal / text / missing rejected; Unicode names
and schools; whitespace trimming; unexpected privileged fields rejected;
duplicate name+school allowed (schema has no uniqueness on it); session
created with hashed token; valid session accepted; invalid / expired /
revoked / malformed token rejected; safe `/me` response (exact key set, no
token/hash/login-code leak); no token/hash in logs; avatar valid
JPEG/PNG/WebP accepted; SVG / executable / octet-stream / HTML MIME rejected;
> 200 KB rejected; exact-200 KB accepted; empty uploads rejected; path
ownership (`{id}/profile.{ext}`) enforced; storage failure → safe internal
error; mismatched stored path rejected; frontend controller phases,
token-storage tolerance, API-client fetch contract (JSON + Bearer + multipart),
and a static SSR a11y render of the real page.

`npm run lint` — **clean** (oxlint). `npm run build` — **clean**.
`python3 schemas/validate.py` — still 24/72/12/12 PASS (unaffected).

## 20. HTTP smoke

Real HTTP against the composed demo server (in-memory repositories):

| Request | Result |
| --- | --- |
| `GET /` (Vite dev) | 200 |
| `GET /student/register` (Vite dev SPA) | 200 |
| `POST /api/student/register` | 201, token + loginCode + safe student |
| `POST /api/student/register` via Vite proxy | 201 (token issued) |
| `GET /api/student/me` (valid token) | 200, safe profile |
| `GET /api/student/me` (no/invalid token) | 401 |
| `POST` register with `scores` field | 400 `STUDENT_UNEXPECTED_FIELD` |
| Unknown `/api/student/*` route | 404 |

## 21. Bundle security

Production `dist/assets/*.js` probed for the service-role key
(`service_role`, `SUPABASE_SERVICE`), any Supabase project reference
(`supabase.co`), Supabase env-var names/values (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`, `VITE_*=http`, `VITE_*=eyJ`),
`tokenHash`/`token_hash`, `sha256`, `secret`, `apikey`, `anon`, and the raw
smoke-test session token — **0 real hits**. The only substring matches are
benign by design: `correctAnswer` appears solely as the Activity Engine
security-guard identifiers `SECURITY_CORRECT_ANSWER_EXPOSED` /
`correctAnswerExposed()` (the boundary that rejects correct-answer access in
client mode — no correct-answer schema or answer data present), and `vite__`
is Vite's own module-runtime helper name (`__vite__mapDeps`), not an
environment variable. The server-only Supabase client is kept off the client
bundle by design (dynamic import). The student page ships as a lazy chunk
`StudentRegisterPage-*.js` (20.36 kB, gzip 7.11 kB); main `index-*.js`
391.58 kB (gzip 116.55 kB).

## 22. Files created

- `src/features/student/errors.js` — StudentError model + stable codes
- `src/features/student/validation.js` — shared authoritative validation
- `src/features/student/registration/registration-fields.js` — form model
- `src/features/student/registration/controller.js` — flow controller
- `src/features/student/security/tokens.js` — CSPRNG tokens + SHA-256 hashing
- `src/features/student/security/avatar.js` — avatar guardrails + safe paths
- `src/features/student/session/token-storage.js` — sessionStorage helper
- `src/features/student/service/student-service.js` — server orchestration
- `src/features/student/repositories/contracts.js` — repository contracts
- `src/features/student/repositories/index.js` — repository factory
- `src/features/student/repositories/memory.js` — in-memory repos (tests/demo)
- `src/features/student/repositories/supabase.js` — service-role adapters
- `src/features/student/api/client.js` — browser API client
- `src/features/student/api/queries.js` — TanStack Query `/me`
- `src/features/student/api/server.js` — Hono student API
- `src/features/student/testing/student-service.test.js`
- `src/features/student/testing/student-api.test.js`
- `src/features/student/testing/frontend-registration.test.js`
- `src/pages/StudentRegisterPage.jsx` — real `/student/register` page
- `src/pages/student-register.css` — page styling
- `reports/22-task-5.1-student-registration.md` — this report

## 23. Files modified

- `src/pages/StudentRegisterPage.jsx` — fixed feature imports
  (`../../features/` → `../features/`; the page lives in `src/pages/`).
- `src/features/student/testing/frontend-registration.test.js` — SSR test now
  imports `react`/`react-dom/server`/`react-router`/`@tanstack/react-query`
  directly (React 19 is CJS; Vite 8 module-runner `ssrLoadModule('react')`
  threw `module is not defined`). Page itself still loaded via
  `ssrLoadModule`; render verified.
- `src/features/game-session/api/dev-server.js` — composes the student API by
  URL prefix (`createStackedApp`) so the demo serves both APIs.
- `package.json` — test glob extended to include
  `src/features/{activity-engine,game-engine,game-session,student}/testing/**/*.test.js`.

## 24. Packages installed

**None.** All dependencies (Hono, Supabase JS, TanStack Query, Motion, etc.)
were already installed in prior stages. No image-conversion library was added
(accepted source formats are stored as-is within bucket rules).

## 25. Supabase changes

**None.** No migration, no new table, no RLS changes, no Storage policy
changes, no seed changes. The existing `students`, `student_sessions`,
`student-avatars` architecture (migrations 0001/0003) is used exactly as
defined. No conflict between schema and architecture was found.

## 26. Test-data cleanup

All HTTP smoke tests ran against the demo API's **in-memory** repositories —
no Supabase students, sessions, schools, or avatars were created, so there is
nothing to clean up and the remote project was untouched.

## 27. Known limitations

- Avatar files are stored as-is (JPEG/PNG/WebP ≤ 200 KB); normalization/
  resizing to a canonical `profile.webp` is deferred until an image library
  is added (not needed for this task).
- Session TTL is 3600 s by default (configurable via `game_settings`); there
  is no auto-refresh/rotation yet (not required by this task).
- Kiosk `login_code` is generated and returned once at registration; the
  code-based rejoin flow is a later task.
- The next-step redirect targets the `/student/game` placeholder (Task 5.2
  intentionally not started).

## 28. Next task

**Task 5.2 — Stream/Level Selection UI.** Build the "Choose your stream"
stage on top of this foundation: the authenticated student (via the stored
session token) selects a stream and level, backed by the streams/levels API
and the game-session service. Do not begin it as part of Task 5.1.