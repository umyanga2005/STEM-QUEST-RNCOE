# Report 21 – Task 1.10: Frontend Libraries Installed & Verified

- **Task:** 1.10 — Install the review-approved frontend libraries (React
  Router v7, Zustand, TanStack Query, Tailwind CSS v4, Motion).
- **Status:** DONE (2026-08-14)
- **Approved by:** Decisions D-014 … D-018 (`reports/03-decisions.md`).
- **Boundary respected:** No Admin Panel / Question Builder built. No
  redesign. No Supabase changes. No production question content. No Activity
  Engine / Game Engine rewrite.

---

## 1. Status

`COMPLETE` — all five review-approved libraries are installed, minimally
wired into the app, and verified. The existing Task 4.4 demo keeps working at
`/`, all 785 tests still pass, lint is clean, the production build succeeds,
and the bundle probe confirms no correct-answer data ships to the client.

## 2. Before this task

`package.json` contained only: `@supabase/supabase-js`, `ajv`,
`ajv-formats`, `hono`, `react`, `react-dom` (deps) and `@types/react`,
`@types/react-dom`, `@vitejs/plugin-react`, `oxlint`, `vite` (devDeps). The
directories `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`,
`src/assets/` existed but were empty (foundation only). No router, state,
query, styling, or animation library was present.

## 3. Already-installed libraries kept as-is

- `react@^19.2.8`, `react-dom@^19.2.8`
- `vite@^8.2.0`, `@vitejs/plugin-react@^6.0.4`, `oxlint@^1.75.0`
- `@supabase/supabase-js@^2.112.3` (unchanged; not used by this task)
- `hono@^4.13.1`, `ajv@^8.20.0`, `ajv-formats@^3.0.1` (server/demo API + engine)

## 4. Added packages (exact versions installed)

Dependencies:

- `react-router@7.18.2` (React Router v7 — canonical unified package, per
  D-014; the `version-7` dist-tag, deliberately NOT v8)
- `zustand@5.0.15` (per D-015)
- `@tanstack/react-query@5.101.4` (per D-016)
- `motion@13.1.0` (Framer Motion successor, per D-018; brings
  `framer-motion@13.1.0` + `motion-dom`/`motion-utils`)

DevDependencies:

- `tailwindcss@4.3.3` (per D-017)
- `@tailwindcss/vite@4.3.3` (Tailwind v4 Vite plugin)

## 5. Tailwind CSS v4 configuration

- `vite.config.js`: added `tailwindcss()` from `@tailwindcss/vite` to the
  Vite plugins (next to `react()`).
- `src/index.css`: prepended `@import 'tailwindcss';`. The pre-existing
  token-ready `:root` block (dark/futuristic palette: `--color-bg`,
  `--color-surface`, `--color-surface-raised`, `--color-text`,
  `--color-text-muted`, `--color-accent`, `--color-accent-strong`) is fully
  preserved — Tailwind and the design-token layer coexist (D-017).
- No `tailwind.config.js` needed (Tailwind v4 is config-light via CSS-first
  config).
- Proven: the production CSS build includes the generated utilities
  (`.mt-4`, `.inline-block`) used in the placeholder, plus the preflight
  baseline.

## 6. Router foundation

- `src/router.jsx` — `createBrowserRouter` with:
  - `/` → the existing `App` (Task 4.4 demo, unchanged).
  - 8 future route placeholders (lazy-loaded via `React.lazy` + `Suspense`,
    so the placeholder chunk — and Motion — are only downloaded when a
    placeholder route is visited): `/student/register`, `/student/game`,
    `/leaderboards`, `/certificate`, `/admin/login`, `/admin`,
    `/admin/questions`, `/admin/settings`.
  - `*` fallback placeholder ("Page not found").
  - `APP_ROUTES` metadata export (path/title/description).
- `src/pages/RoutePlaceholder.jsx` — minimal "route not implemented yet"
  screen styled with the existing design tokens, including one Tailwind
  utility pair (`mt-4 inline-block`) to prove the plugin pipeline.

## 7. Query foundation

- `src/lib/query-client.js` — a shared `QueryClient` with conservative
  defaults (`staleTime: 60s`, `refetchOnWindowFocus: false`, `retry: 1`).
- `src/main.jsx` — wrapped the app in `<QueryClientProvider client=…>`.
- No API queries created yet (no server state to fetch in this task).

## 8. Zustand readiness

- `src/stores/ui-store.js` — minimal ephemeral UI store (`toast` +
  `showToast`/`clearToast`) proving the `zustand@5` `create` API works.
  No existing engine/session state migrated (that work belongs to later
  tasks; D-015 keeps Zustand for ephemeral UI + session state only).

## 9. Motion readiness

- `src/pages/RoutePlaceholder.jsx` — imports `motion` from `motion/react`
  and uses a small fade/slide-in (`initial`/`animate`/`transition`) on the
  placeholder card. Non-invasive; honors the existing app (no reduced-motion
  logic added yet — noted for later tasks).

## 10. Files created

- `src/router.jsx`
- `src/pages/RoutePlaceholder.jsx`
- `src/lib/query-client.js`
- `src/stores/ui-store.js`

## 11. Files modified

- `package.json` / `package-lock.json` — new deps + devDeps.
- `vite.config.js` — added `@tailwindcss/vite` plugin.
- `src/main.jsx` — `QueryClientProvider` + `RouterProvider` wrap.
- `src/index.css` — `@import 'tailwindcss';` + placeholder styles.
- `src/App.jsx` — NOT modified (demo unchanged, still at `/`).

## 12. Packages installed (summary)

`react-router@7.18.2`, `zustand@5.0.15`, `@tanstack/react-query@5.101.4`,
`motion@13.1.0`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`.

## 13. Configuration changes

- Vite plugins list (`react()`, `tailwindcss()`).
- `index.css` Tailwind import.
- App bootstrap (`main.jsx`) provider/router wiring.
- No `tailwind.config.js`, no `postcss.config.js` (Tailwind v4 Vite plugin
  handles CSS processing), no `.env` changes, no Supabase resources touched.

## 14. Tests

- `npm test` → **785 pass / 0 fail** (unchanged from Task 4.13; Activity
  Engine + Game Session suites all green). Test count unchanged because the
  frontend-library install adds no engine logic.
- Dev-server smoke (real HTTP): `/` 200, `/student/register` 200 (SPA
  fallback), `/admin/questions` 200; `main.jsx` transform exposes
  `QueryClientProvider` + `RouterProvider`; `RoutePlaceholder.jsx` transform
  carries the Tailwind utility classes; `index.css` served through the
  Tailwind plugin.

## 15. Results

- Build: `npm run build` clean.
  - Main JS `dist/assets/index-*.js` 390.76 kB (gzip 116.21 kB) — includes
    the app + react-router + @tanstack/react-query (both used at the app
    root).
  - Lazy placeholder chunk `dist/assets/RoutePlaceholder-*.js` 121.16 kB
    (gzip 39.24 kB) — Motion + placeholder, loaded only on navigation.
  - CSS `dist/assets/index-*.css` 52.19 kB (gzip 8.48 kB) — Tailwind
    preflight + utilities + existing custom CSS.
- Vite chunk-size advisory (main chunk > 500 kB warning threshold is
  exceeded only by the combined app + router + query chunk; code-splitting
  of the app routes is a later-task concern).

## 16. Lint

- `npm run lint` → clean (0 warnings, 0 errors). Added a scoped
  `oxlint-disable react/only-export-components` note on `src/router.jsx`
  because a router-config module legitimately mixes config and component
  exports.

## 17. Security / bundle boundary

- Bundle probe after build: `correct-answer.schema.json` → **0** occurrences
  in the client bundle (any type). `correctAnswer` hits are only the
  intentional `correctAnswerExposed()` security-guard API (throws
  `SECURITY_CORRECT_ANSWER_EXPOSED` in client mode). `number-logic` hits are
  plugin/renderer registration identifiers only — no answer data.
- No secrets, no Supabase credentials, no `.env` values in the bundle.

## 18. Supabase verification

- No Supabase resources, schema, RLS, storage, or data changed. The remote
  project state is exactly as left by Task 2.12/2.11. `.env` was not
  created/modified.

## 19. Warnings / notes

- Tailwind v4 preflight (part of the standard `@import 'tailwindcss';`)
  applies a normalizing baseline; plugin renderers style their interactive
  elements with explicit class rules (e.g., `.memory-submit-button`), so
  their appearance is unaffected. This is the accepted consequence of the
  D-017 decision, not a redesign.
- The five libraries are installed and minimally wired. Substantive usage
  (student/admin pages, real queries, per-feature Motion effects) is scoped
  to later tasks.

## 20. Explicitly NOT started

Admin Panel, Question Builder, page implementations, real TanStack Query
data hooks, real Zustand app-state, real Motion effects, production question
content authoring, Supabase schema/data changes, Activity/Game Engine
changes, and any redesign of the existing demo.

## 21. Next task

Stage 2 (database) and Stage 3+ implementation tasks were already completed
for schema/content/plugins. The natural next step on the roadmap is the
student-facing surface work (registration/profile, stream/level selection,
game session flow) which can now use the installed foundations, or any
stage-gated task in `reports/04-todo.md`.