# 30 – Task 5.9: Admin Panel Foundation + Supabase Auth

## 1. Task status

**COMPLETED** (2026-08-16). Browser-side Supabase Auth admin login/logout with
a real session state machine, a protected `/admin` route boundary, a
server-side `requireAdmin` middleware, a safe `GET /api/admin/me`, and an
admin shell with placeholder navigation for Dashboard, Questions, Students,
Progress, Leaderboards, Badges & Certificates and Settings. The task is a
**foundation**: it deliberately does **not** build the Question Builder, the
2,000-question catalogue, admin CRUD, or student-UI redesigns (all out of
scope). Server authorization reuses the existing `public.admins` +
`is_admin()` model from 0001 — **no schema change, no migration, no new
packages** (`@supabase/supabase-js` was already a dependency).

## 2. Scope

- **Server feature** `src/features/admin/`: `AdminService.resolveAdmin(token)`
  (authenticated Supabase identity + active `public.admins` row),
  `createAdminApi` (Hono) with `GET /api/admin/me`, and the reusable
  `requireAdmin` middleware. Memory + service-role Supabase repositories over
  the existing `admins` table.
- **Browser feature** `src/features/admin-auth/`: anon-key Supabase client
  (`persistSession:false`), a sessionStorage token mirror, an injectable
  state-machine controller (`loading | unavailable | unauthenticated |
  authenticated`), a React context/provider, and a client API wrapper for
  `GET /api/admin/me`.
- **Pages + routing**: `/admin/login` (public) and a guarded `/admin` parent
  (`AdminAuthProvider` + `AdminShell`) with index dashboard + six placeholder
  children, plus shared `admin.css`.
- **Wiring**: `createStackedApp` accepts an optional `adminApp` (mounted
  before `/api/student/*`); the production server builds the admin repos +
  service + app; the demo server passes `adminApp = null` (no Supabase Auth in
  the demo environment).
- **Fake client**: `admins` table + `auth.getUser(token)` + helpers
  (`addFakeAuthUser`, `seedFakeAdmin`) so all admin flows are testable without
  Supabase.
- Tests (37 new), live smoke (+7 admin checks, 91 total), bundle probe, docs.

Out of scope (per plan): Question Builder, question content, admin CRUD
beyond the shell, student-UI changes, further polish.

## 3. Auth & authorization model (D-011 / D-027 / `is_admin()`)

Admins authenticate with **Supabase Auth** (email + password). Authorization
is decided **server-side** by two facts, never by a client claim:

1. `AdminService.resolveAdmin(token)` asks the server's service-role client
   `auth.getUser(token)` for the **authenticated identity** — this rejects
   missing/invalid/expired JWTs, and an opaque student session token is not a
   Supabase JWT, so it fails here.
2. It then queries `public.admins` for `id = user.id AND is_active = true`.

This is semantically identical to the existing `is_admin()` SQL function but
is callable from application code (it does not rely on the `auth.uid()`
GUC), so it runs identically in tests (memory repo), the demo server, and the
production server. The `requireAdmin` middleware wraps every `/api/admin/*`
route and attaches the resolved admin to the Hono context.

The anon key is a publishable credential by design (D-080 precedent); the
service-role key remains server-only (D-027) and never reaches the bundle.

## 4. Server-side enforcement (`requireAdmin`)

`src/features/admin/api/server.js` exposes:

- `bearerToken(c)` — reads `Authorization: Bearer <token>` (401 when absent).
- `statusByCode(code)` — `ADMIN_UNAUTHENTICATED`/`ADMIN_INVALID_TOKEN` → 401,
  `ADMIN_FORBIDDEN` → 403, `ADMIN_UNAVAILABLE`/`ADMIN_INTERNAL` → 500.
- `requireAdmin(adminService)` — runs in front of every `/api/admin/*`
  route; resolves the admin or short-circuits with a typed `AdminError`
  payload (`{ error: { code, message } }`), never raw internals.
- `createAdminApi({ adminService })` — `app.use('/api/admin/*',
  requireAdmin(...))` then `GET /api/admin/me`.

**401 vs 403**: an absent/invalid/expired JWT or a student-session token → 401
(`ADMIN_UNAUTHENTICATED` / `ADMIN_INVALID_TOKEN`); a valid Supabase identity
that is **not** an active admin → 403 (`ADMIN_FORBIDDEN`). A student session
token can never grant admin (verified live in smoke [79]).

## 5. Safe `/api/admin/me` surface

```
GET /api/admin/me
Authorization: Bearer <Supabase access token>

200 → { admin: { id, displayName, role } }
401 → ADMIN_UNAUTHENTICATED / ADMIN_INVALID_TOKEN
403 → ADMIN_FORBIDDEN
```

The payload is deliberately minimal: **id, displayName, role** — no token,
no email, no `sub`, no session, no internal columns. The live smoke probes
the raw payload for `token|password|email|service-role|access_token|
refresh_token` and asserts **zero matches** (smoke [76]).

## 6. Frontend routes & protected-route behavior

`src/router.jsx`:

- `/admin/login` — **public** `AdminLoginPage`.
- `/admin` — parent route wrapped in `AdminAuthProvider` + `AdminShell`,
  with children: index (`AdminDashboardPage`), and placeholder pages for
  questions, students, progress, leaderboards, achievements, settings.

The guard renders:

1. **`loading`** → a loading screen while the controller restores the
   session (revalidates `/api/admin/me`).
2. **`unauthenticated`** → `<Navigate to="/admin/login" replace>` with the
   target path in `state.from` (login returns there after success) — **no
   redirect loop** because `/admin/login` is outside the guarded parent.
3. **`unavailable`** (no VITE Supabase config) → redirects to the login page,
   which shows a clear "admin console unavailable" notice.
4. **`authenticated`** → renders the `AdminShell` and its children.

There is no client-side trust: the guard only gates UI; every API call still
hits `requireAdmin`.

## 7. Controller state machine

`admin-auth-controller.js`:

```
loading → unauthenticated | unavailable | authenticated
        ↺ restore()   signIn()   signOut()
```

- **restore()** — reads the sessionStorage token, calls `/api/admin/me`; a
  401/403 clears the token → `unauthenticated`; network failure keeps the
  token but surfaces an error state (retry).
- **signIn(email, password)** — calls `signInWithPassword` then `/api/admin/me`;
  a **403** (identity not an admin) throws `AdminAuthForbiddenError` and
  best-effort `signOut()` so a non-admin is not left half-authenticated.
- **signOut()** — clears sessionStorage + server session, → `unauthenticated`.
- Subscribe/unsubscribe for the provider; injectable dependencies so every
  path is unit-testable.

Session lifetime: tokens are not auto-refreshed (foundation decision); an
expired token surfaces 401 from `/api/admin/me`, which restores to
`unauthenticated` and routes to the login page.

## 8. Security model

- Server never returns credentials, tokens, email, or hashes to the browser.
- The browser holds only the Supabase **access token** in `sessionStorage`
  (key `stemquest.admin.token`), kiosk-friendly (survives full reloads).
- Authorization is always server-side; the client bundle never references the
  `admins` table, `is_admin()`, `display_name` or `is_active` (bundle probe
  §13-B: **0 files**).
- Student sessions and admin sessions are completely disjoint token spaces;
  a student token is not a Supabase JWT and yields 401 on admin routes.
- The service-role key exists only in `.env` / server env and is absent from
  `dist/assets` (bundle probe §13-A: **0 files**).

## 9. Admin shell & pages

- **AdminLoginPage** — email + password form, client validation, submits via
  `signIn`; renders the controller's error (bad credentials / forbidden /
  network) and a "console unavailable" notice when `unavailable`. On success
  navigates to `state.from ?? /admin`.
- **AdminShell** — sidebar with the seven sections (Dashboard, Questions,
  Students, Progress, Leaderboards, Badges & Certificates, Settings), the
  resolved admin identity (displayName + role), and a Sign out button.
- **AdminDashboardPage** — welcome + placeholder tiles; **AdminPlaceholderPage**
  — per-section "not built yet" placeholder. Styling in `admin.css`
  (Tailwind v4 tokens + page-specific classes).
- SSR-safe: the pages render empty/loading when the controller is not
  authenticated, so the frontend test harness passes under the same SSR
  renderer used by the other frontend suites.

## 10. Implementation notes

- **Injectability**: `AdminService` takes a repository; the controller takes
  its client, session store and API client — unit tests never touch network.
- **`createStackedApp`** gained `adminApp = null`; production builds admin
  repos from the shared service-role client and mounts `adminApp` **before**
  the `/api/student/*` catch-all so `/api/admin/*` is never shadowed.
- The demo server passes `adminApp = null` — the demo environment has no
  Supabase Auth, so `/api/admin/*` simply 404s there (by design).
- `package.json` test glob extended to `{...achievements,admin,admin-auth}`.
- oxlint: the router already carries `react/only-export-components` for the
  provider route; context (`admin-auth-context.js`) and provider
  (`admin-auth-provider.jsx`) are split so the `.jsx` exports JSX and the
  `.js` exports the context object (lint clean).

## 11. Tests

37 new tests (`npm test` **1143/1143**, up from 1106):

- `admin/testing/admin-api.test.js` (10) — over the stub and the full
  production stack: 200 with a safe identity payload (exact key set), 401
  missing token, 401 bogus JWT, 403 non-admin identity, 403 inactive admin,
  401 for an opaque student-style token, and a payload probe asserting no
  token/secret material ever leaks.
- `admin/testing/admin-repository.test.js` (5) — memory + Supabase repo
  contracts: `findActiveByAuthUserId` returns the active admin, excludes
  inactive/unknown ids, and null for no row.
- `admin-auth/testing/admin-auth-controller.test.js` (14) — restore /
  signIn / signOut state transitions; `unavailable` when config is missing;
  403 during restore clears the token → `unauthenticated` (no loop); 403
  during signIn throws `AdminAuthForbiddenError` + best-effort signOut;
  network failure preserves the token and surfaces the error; subscribe
  notifications; token persistence in the session store.
- `admin-auth/testing/frontend-admin-auth.test.js` (8) — SSR: login form
  renders; config-unavailable notice; error message after a failed sign-in;
  the shell renders nav + identity only when `authenticated`; empty render
  when `unauthenticated`; loading screen; dashboard welcome; placeholder
  pages.

Lint clean, build clean, schema validator PASS (24 schemas / 72 examples /
12 pair checks).

## 12. Live smoke (production, 91 checks)

Extended `scripts/smoke-production.mjs` against `fmauqixvdpdgrghuapfs`
(real Supabase). +7 checks (84→91): a temporary Supabase Auth admin user with
a matching `admins` row (email `smoke-admin-<ts>@stem-quest.test`, inserted
via the service role) signs in and `GET /api/admin/me` returns the safe
identity with `role=admin`; the raw payload passes the no-secrets probe; 401
missing token (`ADMIN_UNAUTHENTICATED`), 401 bogus JWT
(`ADMIN_INVALID_TOKEN`), a **student session token never grants admin (401)**,
a valid non-admin Supabase identity → **403 `ADMIN_FORBIDDEN`**, and the
`admins` row is confirmed with `role=admin` + `is_active=true`. The temporary
auth users are removed afterwards (`auth.admin.deleteUser` cascades to the
`admins` row) and the DB returns to its exact baseline incl. `admins=0`.

**Smoke bug found & fixed (smoke-only, not app code):** supabase-js switches
a client's effective `Authorization` to the signed-in user's access token, so
the original shared client made all subsequent `db.from()` queries **as the
plain (non-admin) user** → every later DB assertion returned RLS-empty. Fixed
by giving the smoke a dedicated `authDb` for `auth.admin.*` /
`signInWithPassword`, leaving the service-role data client untouched — this is
why checks [81]–[90] initially failed and now pass.

## 13. Bundle security probe

`grep` over `dist/assets` (real service-role key value, real secret names):

- **A. Credentials**: service-role key **0 files**; `SUPABASE_SERVICE_ROLE_KEY`
  **0 files**; `VITE_SERVICE_ROLE_KEY` **0 files**.
- **B. Admin authorization data**: `public.admins`, `is_admin()`,
  `display_name`, `is_active` — all **0 files** (server-only).
- **C. Admin credential material**: `admin@` / `stem-quest.test` — **0 files**.
  The only `password`/`sb_secret_` strings are the login-form labels and the
  supabase-js auth library's own storage-prefix handling — expected library/
  UI code, not credentials (verified by context inspection).

## 14. Warnings / errors

1. **Live smoke seed `fetch failed`** twice on first attempts — transient
   network flakiness to Supabase (nothing logged by the app); the runs passed
   on retry. The smoke remains network-latency-bound (~3 s/check) and must run
   detached (`nohup`) or with a long timeout.
2. **Smoke DB assertions failed after the admin section** on two consecutive
   runs — diagnosed as the supabase-js Authorization switch (see §12), not a
   product bug; fixed with a dedicated `authDb` client. Added DB-query error
   capture to the affected checks for future diagnosability.
3. **oxlint**: no new findings — the context/provider split (§10) kept the
   router's `only-export-components` rule satisfied; lint clean.

## 15. Files created

- `src/features/admin/errors.js`
- `src/features/admin/repositories/contracts.js`, `memory.js`, `supabase.js`, `index.js`
- `src/features/admin/service/admin-service.js`
- `src/features/admin/api/server.js` (`createAdminApi`, `requireAdmin`,
  `bearerToken`, `statusByCode`)
- `src/features/admin-auth/auth/admin-auth-client.js`, `admin-session.js`,
  `admin-auth-controller.js`, `admin-auth-context.js`,
  `admin-auth-provider.jsx`, `admin-auth-singleton.js`
- `src/features/admin-auth/api/client.js` (`adminApiClient`, `AdminApiError`)
- `src/pages/AdminLoginPage.jsx`, `AdminShell.jsx`, `AdminDashboardPage.jsx`,
  `AdminPlaceholderPage.jsx`
- `src/pages/admin.css`
- `src/features/admin/testing/admin-api.test.js`, `admin-repository.test.js`
- `src/features/admin-auth/testing/admin-auth-controller.test.js`,
  `frontend-admin-auth.test.js`
- `reports/30-task-5.9-admin-panel-foundation.md` (this report)

## 16. Files modified

- `src/router.jsx` — public `/admin/login` + guarded `/admin` nested routes.
- `src/features/game-session/api/dev-server.js` — `createStackedApp` gains
  `adminApp = null` (demo server uses default).
- `src/features/game-session/api/production-server.js` — builds admin
  repos/service/app and mounts `adminApp` before `/api/student/*`.
- `src/features/game-session/testing/fake-supabase-client.js` — `admins`
  table, `auth.getUser`, `addFakeAuthUser`, `seedFakeAdmin`.
- `package.json` — test glob includes `admin` + `admin-auth`.
- `scripts/smoke-production.mjs` — admin auth flow (dedicated `authDb`),
  `admins` baseline + cleanup, +7 checks.
- `reports/04-todo.md`, `reports/README.md`, `reports/02-development-log.md`,
  `reports/03-decisions.md` (D-082), root `README.md`.

## 17. Live database state

Baseline + after-run (post-cleanup): all tables empty and exact, now
including `admins` back to 0 and the Supabase Auth user pool back to its
baseline (temporary smoke users deleted). No smoke fixtures left behind.

## 18. Known limitations

- Admin sessions have **no auto-refresh**: an expired access token surfaces
  401 from `/api/admin/me` and routes to the login page (foundation scope).
  A refresh-token flow can be layered on later.
- The admin API surface is intentionally minimal (`GET /api/admin/me` only);
  Questions/Students/etc. pages are placeholders awaiting their own tasks.
- The demo server intentionally serves no `/api/admin/*` (no Supabase Auth in
  the demo environment); admin is a production-server feature.
- No question-authoring, bulk import, or admin CRUD yet (per plan).

## 19. Next task

Task 5.10 **not started** (per plan). Backlog candidates: Question Builder,
real content authoring, admin CRUD on the shell's placeholder sections,
remaining polish.

## 20. Data flow (admin sign-in)

```
Browser (anon key, persistSession:false)
  AdminLoginPage → controller.signIn(email, password)
      ├─ supabase-js signInWithPassword        → access token → sessionStorage
      └─ GET /api/admin/me (Bearer token)
Production server
  requireAdmin → AdminService.resolveAdmin(token)
      ├─ auth.getUser(token)                    → authenticated identity (401 on bad/student token)
      └─ admins.findActiveByAuthUserId(user.id) → active admin row (403 if none)
  200 → { admin: { id, displayName, role } }   (no secrets)
Shell shows identity; Sign out clears sessionStorage + Supabase session
```

## 21. Frontend pages

`/admin/login`: centered card with email + password, client validation, the
controller's error states (bad credentials / not-an-admin / network) and the
"unavailable" notice when Supabase config is absent. `/admin`: shell with the
seven-section sidebar (Dashboard, Questions, Students, Progress,
Leaderboards, Badges & Certificates, Settings), identity header (displayName +
role) and Sign out; the index shows a welcome + placeholder tiles; the other
six sections render the shared placeholder. Guard states (loading /
redirect-to-login) are described in §6. Styling lives in `admin.css`
(Tailwind v4 tokens), consistent with the other pages.

## 22. Configuration & operational notes

- **No new `.env` vars, no new packages.** The browser needs
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (already used by the
  leaderboard realtime, D-080). Without them the admin console shows the
  unavailable notice and the login is disabled (no crash).
- The production server reuses its existing service-role client for
  `auth.getUser` + the `admins` query; RLS from 0001 governs the
  `public.admins` table (admin/service-role access).
- To create an admin: a Supabase Auth user whose `public.admins` row has
  `id = auth_user_id` and `is_active = true` (the same model `is_admin()`
  checks). The shell's identity comes from `display_name` + `role`.
- Admin endpoints are mounted before `/api/student/*` in the production
  server; the demo server passes `adminApp = null`.

## 23. Verification evidence

- `npm test` **1143/1143** (2 consecutive runs), `npm run lint` clean,
  `npm run build` clean (admin-auth-provider chunk 153.10 kB / gzip 37.95 kB,
  supabase-js lazy-loaded only for admin routes), `python3 schemas/validate.py`
  PASS (24/72/12/12).
- Live smoke **91/91** against the linked project; DB restored to the exact
  baseline incl. `admins` and the Supabase Auth user pool.
- Bundle probe: service-role key 0 files; admin authz identifiers 0 files;
  no admin credential material; only library/UI `password`/`sb_secret_`
  strings present.

## 24. Revision history

- 2026-08-16 — created with Task 5.9 (D-082 server-side `is_admin()`
  equivalent decision recorded in `03-decisions.md`).