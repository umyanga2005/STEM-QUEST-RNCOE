# STEM QUEST – The Educational Treasure Hunt

## Reports & Documentation Index

This folder holds the living documentation for the STEM QUEST project. Every
report below is updated as the project evolves through its controlled
development stages.

| File | Purpose |
| --- | --- |
| `README.md` | This index. Start here. |
| `00-project-overview.md` | What the product is: vision, scope, game rules, constraints. |
| `01-initial-architecture.md` | Architecture baseline. Do not finalize tables/schema here. |
| `02-development-log.md` | Chronological record of every significant development action. |
| `03-decisions.md` | Architectural and technical decisions with rationale. |
| `04-todo.md` | Completed and pending tasks, stage by stage. |
| `05-activity-engine-design.md` | Detailed design of the interactive Activity Engine (10 types, plugin contract, question selection). |
| `06-database-architecture.md` | Supabase PostgreSQL schema design (21 tables, RLS, indexes, JSONB strategy, storage, realtime, Free Tier). |
| `07-task-3.1-content-model.md` | Complete content model for the 2,000-question bank (lifecycle, taxonomy, blueprints, quality, authoring). |
| `08-task-3.2-schemas.md` | JSON Schema (draft 2020-12) contracts for all 10 activity types + 70 worked examples + 3-layer validator. |
| `09-task-4.1-activity-engine-core.md` | Task 4.1: Activity Engine core — plugin contract, registry, schema registry, validation routing, scoring guard, hints/feedback/availability, client/server facades, 52 tests. |
| `10-task-4.2-drag-drop.md` | Task 4.2: first real activity plugin (drag-drop) — 7-method plugin, `validateMappings` (catalog port), semantic rules, React renderer, a11y, security/bundle boundary, 34 tests. |
| `11-task-4.3-game-engine-core.md` | Task 4.3: Game Engine core — seeded 3-of-100 selection (D-022 §8), session lifecycle state machine, student-safe error model, 26 tests. |
| `12-task-4.5-matching.md` | Task 4.5: second real activity plugin (matching) — 7-method plugin, `validatePairs` (catalog port), pure interaction controller, React renderer, Game Session integration, security/bundle boundary, 50+ tests. |
| `13-task-4.6-ordering.md` | Task 4.6: third real activity plugin (ordering) — 7-method plugin, `validateSequence` (catalog port), anchors, pure interaction controller, React renderer, Game Session integration, M52 flaky-test fix, security/bundle boundary, 54 tests. |
| `14-task-4.7-sorting.md` | Task 4.7: fourth real activity plugin (sorting) — 7-method plugin, `validateAssignments` (catalog port), pure interaction controller, React renderer (tap-select → tap-group, drag, keyboard), Game Session integration, security/bundle boundary, 52 tests. |
| `15-task-4.8-fill-complete.md` | Task 4.8: fifth real activity plugin (fill & complete) — 7-method plugin, `validateBlankAnswers` (catalog port), approved schema fix (`answers` group optional), pure interaction controller, React renderer (per-type native inputs), exact-response scoring, Game Session integration, security/bundle boundary, 57 tests. |
| `16-task-4.9-image-interaction.md` | Task 4.9: sixth real activity plugin (image interaction) — 7-method plugin, `validateImageInteractionAnswer` (catalog port), normalized 0–100 coordinate hit testing, tap + label modes, pure interaction controller, React renderer (image surface + label tray), exact-response scoring, Game Session integration, dev-server bridge fix, security/bundle boundary, 71 tests. |
| `17-task-4.10-pattern.md` | Task 4.10: seventh real activity plugin (pattern) — 7-method plugin, `validatePatternAnswer` (catalog port), three sequence modes (construct-next / fill-missing / complete-sequence), explicit multiple-valid-solutions scoring, pure interaction controller, React renderer (sequence surface + candidate bank + native entry), strict response-shape gate, Game Session integration, security/bundle boundary, 66 tests. |
| `18-task-4.11-memory.md` | Task 4.11: eighth real activity plugin (memory) — 7-method plugin, `validateMemoryAnswer` (catalog port), two-phase memorize/recall (pairs = 2, sets = 3–4), reveal budget, pure interaction controller, React renderer (countdown deck + group builder), unordered-set exact scoring, strict response-shape gate, Game Session integration, security/bundle boundary, 62 tests. |
| `19-task-4.12-scenario-challenge.md` | Task 4.12: ninth real activity plugin (scenario-challenge) — 7-method plugin, `validateScenarioAnswer` (catalog port of `scenario.entry-decision-exists`, extended with optimal-path traversability + acceptable-options integrity), 5 `validatePayload` semantic rules, branched decision-tree interaction (NOT an MCQ), pure navigation-state controller (DOM-free), React renderer (mission + progressive decision walk + consequence panel + completion gate), per-step optimal-or-acceptable exact scoring, strict response-shape gate (`{ path }`), schema-key alias (`scenario` ↔ `scenario-challenge`), Game Session integration, security/bundle boundary, 59 tests. |
| `20-task-4.13-number-logic.md` | Task 4.13: tenth and final real activity plugin (number-logic) — 7-method plugin, `validateNumberLogicAnswer` (catalog ports of `number-logic.parts-match` + `type-fields`, extended with answer-format compatibility, ordered ranges, tolerance validity, integer fraction components, non-blank accepted forms, finite numeric fields), six answer formats × seven correct-answer types (exact/tolerance/range/fraction/percent/sequence/accepted-set), one-correctness-model (one atomic value = one unit), lowest-term fraction reduction, percent-as-authored-number, element-wise sequences, exact accepted-set (NO eval), multi-step per-part credit (parts-only scoring, D-075), pure DOM-free interaction controller, React renderer (single/sequence/multi-part surfaces, fraction two-input, percent suffix, showWork scratchpad, completion gate), strict response-shape gate (`{ value }` / `{ values }` / `{ parts }`), Game Session integration, security/bundle boundary, 57 tests (+10 NL-series, SC13 now ten-type coverage). |
| `21-task-1.10-frontend-libraries.md` | Task 1.10: review-approved frontend libraries installed & verified — `react-router@7.18.2`, `zustand@5.0.15`, `@tanstack/react-query@5.101.4`, `motion@13.1.0`, `tailwindcss@4.3.3` + `@tailwindcss/vite@4.3.3`. Wired: `QueryClientProvider` + `RouterProvider` in `main.jsx`, `/` → existing App, 8 lazy placeholder routes, minimal Zustand ui-store, Tailwind v4 plugin + `@import 'tailwindcss'` (design tokens preserved). Verification: 785/785 tests, lint clean, build clean, bundle probe 0, dev-server HTTP smoke OK. No Admin/Question Builder, no Supabase changes, no production content. |

## How to use these reports

- **Before coding a new stage**, read `00-project-overview.md`,
  `01-initial-architecture.md`, and `04-todo.md`.
- **After every significant action**, append an entry to `02-development-log.md`.
- **When a decision is made**, record it in `03-decisions.md` (with status).
- **Always** follow `DEVELOPMENT_RULES.md` at the repository root.
