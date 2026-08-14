# 01 – Initial Architecture

> **Status:** REVIEWED BASELINE (v1.1, Stage 1 review, 2026-08-11).
> Stage 0 (v1.0) was a draft. This revision incorporates the Stage 1
> architecture-review outcomes: the technology stack, student identity model,
> activity engine design, and question-selection algorithm are now decided.
> The **database schema is designed but NOT implemented** — full design in
> `06-database-architecture.md` (Stage 2). Decisions are tracked in
> `03-decisions.md`; the full activity engine design lives in
> `05-activity-engine-design.md`.

## High-Level System View

```
                        ┌─────────────────────────────┐
                        │        Frontend (React)     │
                        │  Student App  +  Admin App  │
                        │  (single responsive SPA)    │
                        └──────────┬──────────────────┘
                                   │
                        ┌──────────▼──────────────────┐
                        │  Backend (Hono / Node API)   │
                        │  Game logic · Scoring ·      │
                        │  Special access · Admin ops  │
                        └──────────┬──────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │              Supabase (Free Tier)                   │
        │  PostgreSQL ─ Auth ─ Storage ─ Realtime             │
        └─────────────────────────────────────────────────────┘
```

Game logic lives server-side (random 3-of-100 selection, answer validation,
scoring) so rules cannot be tampered with from the browser. The frontend is a
thin client.

## 1. Frontend

- **Framework:** React 19 (Vite 8 SPA, JSX). Scaffolded in Stage 0.
- **Routing:** React Router v7 — SPA routing, lazy-loaded feature routes.
- **Client state:** Zustand — game-session and UI state, no provider tree.
- **Server state / data fetching:** TanStack Query — caching, retries,
  invalidation, optimistic updates; works with the API and Supabase.
- **Styling:** Tailwind CSS v4 + CSS custom-property design tokens (dark,
  futuristic, game-like, mobile-first).
- **Animations:** Framer Motion (package `motion`) for game-feel animations;
  plain CSS transitions for simple cases. Respects `prefers-reduced-motion`.

### Technology review rationale

Each recommendation below covers: why it fits STEM QUEST, performance, mobile,
free-tier, complexity, and necessity.

**React Router v7**
- Fit: the app has distinct areas (student game, admin panel, leaderboard);
  nested/lazy routes map directly to feature modules.
- Performance: `lazy()` route components → code-splitting keeps the initial
  bundle small (important on mobile data).
- Mobile: URL-driven navigation works identically on phones; no heavy DOM.
- Free-tier: open source, no cost.
- Complexity: low; industry-standard API.
- Necessity: necessary (multi-area SPA).

**Zustand**
- Fit: game rounds carry fast-changing local state (current round, score,
  timer) that must not re-render the whole tree; Zustand updates only
  subscribers.
- Performance: small (~1 kB) store; no context re-render storms.
- Mobile: negligible bundle/runtime cost.
- Free-tier: n/a.
- Complexity: low (no boilerplate).
- Necessity: recommended; `Context + useReducer` is the acceptable fallback.

**TanStack Query**
- Fit: declarative caching for API calls (question rounds, leaderboards,
  admin tables); built-in retry/refetch on poor mobile networks.
- Performance: cache + stale-while-revalidate reduce repeated network calls
  and Supabase load.
- Mobile: fewer requests = less battery and data.
- Free-tier: reduces calls to the API/Supabase → stays within Free Tier limits.
- Complexity: low–medium.
- Necessity: recommended (standard for React server state).

**Tailwind CSS v4**
- Fit: utility-first + tokens = fast, consistent premium/game UI; mobile-first
  breakpoints out of the box.
- Performance: compiles to a small, tree-shaken CSS file; no runtime.
- Mobile: responsive utilities are designed for small screens first.
- Free-tier: n/a.
- Complexity: low; needs a design-token layer for theming (dark/futuristic).
- Necessity: recommended; CSS Modules + custom properties is the zero-dep
  alternative.

**Framer Motion (motion)**
- Fit: declarative spring/layout animations give the "game feel" the product
  demands (snaps, pops, transitions).
- Performance: animates transform/opacity (compositor-friendly); keep
  high-count animations off the main thread; bundle ~30–40 kB gzip — use
  selectively, CSS for simple effects.
- Mobile: GPU-accelerated; works with touch gestures.
- Free-tier: n/a.
- Complexity: low–medium.
- Necessity: recommended for the game-feel requirement; optional (CSS-only)
  if bundle budget must be strict.

## 2. Backend

- **Framework:** Hono (Node.js runtime). Ultra-light (~14 kB, no heavy deps),
  TypeScript-first, fast cold starts — fits free hosting.
- **API surface (planned):** sessions (start/round/submit/finish), students
  (register/profile), admin (CRUD on students/streams/levels/questions/
  scores/badges/certificates/settings), leaderboards.
- **Ownership:** session creation (3-of-100 selection), answer validation,
  scoring authority, special-access resolution, admin operations.
- **Alternative considered:** Fastify (solid, heavier); NestJS (overkill).
- **Deployment:** Vercel (Hono on serverless functions) — generous free tier,
  zero maintenance, auto-HTTPS. Leaderboards remain live via Supabase
  Realtime (DB-level), so API cold starts do not affect the exhibition
  display. Alternatives: Render free tier (cold-sleeps), Supabase Edge
  Functions (same provider but Deno runtime).
  - **Budget note:** Vercel hobby is free and sufficient for a school
    project; revisit only if traffic exceeds hobby limits.

## 3. Supabase (Free Tier)

Services used:
- **PostgreSQL** – primary data store. Schema NOT finalized (Stage 2).
- **Auth** – Admin authentication only. Students are NOT Auth users (see §4).
- **Storage** – optional student profile photos + question media (resized,
  compressed, size-capped for Free Tier).
- **Realtime** – live Top-10 leaderboards. Listener count kept minimal (only
  active leaderboard screens).

Free Tier guardrails: lean schema + indexes, capped upload sizes, few Realtime
listeners, caching via TanStack Query to reduce DB/API load.

## 4. Student System

- **Identity model (DECIDED):** students are **normal application records**,
  NOT Supabase Auth users. Admin uses Supabase Auth separately.
- Registration: **Initials, Name, School, Grade** (required); **profile photo**
  (optional, never required; stored in Supabase Storage).
- Public identity: privacy-conscious display (initials + name) on all public
  surfaces.
- Planned capabilities: progress per stream/level, normal unlock progression,
  admin-granted special access per stream/level, admin override of progression.

## 5. Admin System

- Access via **Supabase Auth**; credentials never in frontend env vars.
- Full panel: students, streams, levels, questions, activity types, scores,
  badges, certificates, analytics, game settings, special access, progression
  overrides.
- Security: admin routes + API endpoints enforce role checks; API verifies
  admin sessions before privileged operations.

## 6. Game Engine

- Orchestrates sessions. Core rule: from the level's ≥100-question pool,
  **randomly select exactly 3** (see §8 selection algorithm and
  `05-activity-engine-design.md` §8).
- Flow: start → render activity → capture answer → validate → central
  scoring → next → finish → record score → update progress/leaderboard.
- Authoritative and server-side.

## 7. Activity Engine

- Pluggable **registry of activity type plugins** (render · validate ·
  scoring inputs · hints · feedback · payload validation). Plugins validate
  answers and report normalized scoring inputs; they **never compute final
  scores** (D-041). The game engine is activity-agnostic; final scoring is the
  Central Scoring Service's job.
- Activity types: Drag & Drop, Matching, Ordering, Sorting, Fill/Complete,
  Image Interaction, Pattern, Memory, Scenario Challenge, Number/Logic
  Challenge. Each fully specified (educational purpose, interaction, data,
  validation, scoring inputs, timer/hints/feedback, animation, accessibility,
  replay) in `05-activity-engine-design.md`.
- **New activity types = new plugin module + registration. No engine rewrite.**

## 8. Question Engine

- Data: Stream → Level → Question → activity-type payload → server-side
  correct answer → hints/media/options.
- ≥100 questions per level (2,000 total). Authoring validated per activity
  type via plugin `validatePayload`.
- Client receives payload/options only; `correctAnswer` never leaves the
  server.

## 9. Scoring

- Per-round inputs standardised and **normalized by the plugin**
  (`correctnessFraction` 0–1, attempts, time, hints, bonus flags). The
  **Central Scoring Service applies the finalized formula server-side**
  (D-023/D-041): earned base = round(base × correctnessFraction), then minus
  hint/attempt/overtime deductions, floor 0, clamp 0–100; session = Q1+Q2+Q3
  (max 300). Plugins never compute final scores. Exact hint/attempt deduction
  values are configurable game settings. See `06-database-architecture.md`
  §18.
- Scores feed progress, admin score management, and leaderboards.

## 10. Leaderboard

- Four stream leaderboards; **Top 10 only**.
- Live via Supabase Realtime for the exhibition display.
- Privacy-conscious: initials + name (safe display format).
- Strategy (Stage 2): materialised `leaderboard_entries` table, best score per
  (student, stream), covering-index Top-10, Realtime on that table (D-029).

## 11. Certificate System

- Earned only on **stream completion** (all 5 levels of a stream).
- Admin manages certificates. Strategy (Stage 2): records + verification code
  as the source of truth; PDFs generated on demand, not stored permanently
  (D-031).

## 12. Responsive Architecture

- Mobile-first breakpoints: phones → tablets → laptops → exhibition displays.
- Touch-first game UI (≥ 44 px targets, scroll-lock during drag, numeric
  keypads) plus keyboard/mouse support.
- Exhibition leaderboard uses a large TV-like layout from the same codebase.
- Performance-conscious animation (transform/opacity, reduced-motion support).

## Finalized Decisions (Stage 1)

| ID | Decision | Status |
| --- | --- | --- |
| D-005 | Students = application records, not Supabase Auth users | DECIDED |
| D-014 | React Router v7 | DECIDED |
| D-015 | Zustand | DECIDED |
| D-016 | TanStack Query | DECIDED |
| D-017 | Tailwind CSS v4 + design tokens | DECIDED |
| D-018 | Framer Motion (motion) + CSS for simple | DECIDED |
| D-019 | Hono (Node) API framework | DECIDED |
| D-020 | Vercel serverless hosting | DECIDED (revisit at budget check) |
| D-021 | Activity engine plugin contract | DECIDED |
| D-022 | 3-of-100 selection algorithm | DECIDED |

## Remaining Open Decisions

- D-023 – Central scoring formula: **DECIDED** (2026-08-11 correction pass);
  only the exact hint/attempt deduction values remain configurable game
  settings, not OPEN.
- Stage-1/2 note: verify Vercel hobby vs. actual exhibition traffic before
  committing (D-020).
- DB design decisions D-024…D-041 recorded; database review is **APPROVED /
  READY FOR MIGRATION** (2026-08-11 correction pass). SQL is **NOT** written
  yet — that is the next controlled task (todo 2.10). D-041 (final consistency
  pass) locked the plugin scoring boundary: plugins report inputs, the Central
  Scoring Service computes final scores.

## Explicitly NOT done at this stage

- Database tables are NOT created (schema designed only — see
  `06-database-architecture.md`; implementation pending review).
- The 2,000 questions are NOT created.
- Game engine is NOT implemented.
- Activity engine is NOT implemented (design only).
- Admin Panel is NOT implemented.
- No UI screens beyond the Stage 0 placeholder.
- No packages beyond the Stage 0 base installed.
