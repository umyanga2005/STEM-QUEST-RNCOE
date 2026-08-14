# Task 4.7 — Fourth Production Activity Plugin: Sorting

**Status:** Complete
**Date:** 2026-08-13
**Depends on:** 08-task-3.2-schemas.md (sorting schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), 10-task-4.2-drag-drop.md, 12-task-4.5-matching.md and 13-task-4.6-ordering.md (the plugin pattern Sorting follows), Task 4.4 `GameSessionService` (safe descriptors + central scoring)
**Tests:** 358 total pass (`npm test`, 2 consecutive full runs), lint clean, production build passes, schema validator passes
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The fourth production activity plugin is implemented: **sorting**. Built
against the Task 4.1 engine contract and the Task 3.2 sorting schema contract
(3–12 item cards, 2–5 category targets, item→category assignments server-side),
it mirrors the drag-drop/matching/ordering plugin pattern end-to-end:

- **7-method plugin** (`sortingPlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validateAssignments`, the cross-document
  semantic port of the catalog rule `sorting.assignments-cover-items`.
- **`sorting-controller.js`** — a pure, DOM-free interaction state module
  (create → select → place/reassign → clear → reset → coverage gate →
  response serializer) so the sorting rules are unit-tested in Node.
- **React renderer** (`SortingActivity.jsx`) with tap-select → tap-group,
  pointer drag (enhancement only), keyboard (native buttons, Space/Enter),
  reduced-motion, unassigned tray + category groups, per-chip remove, hints,
  clear, and a submit gate.
- **Integrated into the Game Session service**: `registerSorting` is part of
  `createDefaultServerActivityEngine()`, the demo API seeds sorting demo
  questions, and the app shell renders `SortingActivity` for
  `kind === 'sorting'`.

Sorting is **classification**: the student places each item into its category.
Partial credit = correct assignments ÷ total items (D-047). The submitted
response is `{ assignments: [{ itemId, categoryId }] }` — the exact
schema-compatible shape `buildResponse` emits.

Correct-answer data never reaches the client. Verified by production bundle
probe (§27): the client bundle contains **zero** occurrences of the sorting
correct-answer schema `$id`, and the client facade exposes no
`validateAnswer` / `scoringInputs` / `feedback` / `getCorrectAnswerSchema`.

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method sorting plugin + `validateAssignments` (catalog port) + 3 `validatePayload` semantic rules | `src/features/activity-engine/plugins/sorting/plugin.js` |
| 2 | Pure interaction state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/sorting/sorting-controller.js` |
| 3 | React renderer (tap-select / drag / keyboard, no drag library) | `src/features/activity-engine/plugins/sorting/SortingActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/sorting/sorting.css` |
| 5 | Public plugin entry (re-exports + `registerSorting`) | `src/features/activity-engine/plugins/sorting/index.js` |
| 6 | Plugin unit tests (52 cases, incl. controller) | `src/features/activity-engine/testing/sorting.test.js` |
| 7 | Session end-to-end integration tests (S-series, 7 cases) | `src/features/game-session/testing/session-service.test.js` |
| 8 | Sorting demo content (Task 3.2 fixtures, dev API only) | `src/features/game-session/demo/sorting-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | Final report | `reports/14-task-4.7-sorting.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity types
(fill-complete, image-interaction, pattern, memory, scenario-challenge,
number-logic), production question authoring (none created here), and the
mode-aware registry that would strip server-only method source from client
bundles (recorded as future work, §28).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Sorting implementation |
|---|---|---|
| `render` | client | Item chips (optionally shuffled) + category targets; **never** reads `correctAnswer.assignments` |
| `validatePayload` | authoring | Schema gate then 3 semantic rules (item ids unique, category ids unique, ids disjoint) |
| `validateAnswer` | server-only | `validateAssignments` integrity check, then complete-assignment shape guard, then per-item correctness detail |
| `scoringInputs` | server-only | correctnessFraction = correct assignments ÷ total items (D-047); evidence never carries expected categories |
| `buildHints` | client | Authored progressive hints, never derived from the answer |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals assignments |
| `availableOn` | client | Default available; `featureFlags['sorting'] = false` opts out; voice-only offered |

---

## 4. Domain Model

- `payload.items[]` — 3..12 item cards (`id`, `label`, `image`, `ariaLabel`).
- `payload.categories[]` — 2..5 category cards (`id`, `label`, `image`, `ariaLabel`).
- `payload.shuffle` — when true, the server shuffles the item display order.
- `correctAnswer.assignments[]` — every item mapped to exactly one existing
  category (`{ itemId, categoryId }`), server-only.

Sorting is **classification**: the position of an item is irrelevant; the
group it belongs to is the answer.

---

## 5. Render Security (D-021)

`render` never reads `correctAnswer`. The descriptor carries:
`{ kind, prompt, instructions, shuffle, items[], categories[] }` — client-safe
card views (`id`, `label`, `image`, `ariaLabel`) only. No item or category
carries `categoryId`, `expected`, or `correct` metadata. Verified: the built
client bundle contains 0 occurrences of both sorting schema `$id` markers
(§27), and the client facade exposes no server-only methods (covered by the
sorting tests).

---

## 6. Semantic Port: `sorting.assignments-cover-items`

`validateAssignments(payload, correctAnswer)` runs server-side (in
`validateAnswer`) and is exported for authoring tooling/tests. It enforces:

- every payload item appears in `assignments` exactly once;
- no duplicate item assignment;
- every `categoryId` references an existing payload category.

A schema-valid but semantically inconsistent answer document throws
`ACTIVITY_PAYLOAD_SEMANTIC_INVALID` (an author bug, never a student mistake).

---

## 7. `validatePayload` Semantic Rules

| Rule | Purpose |
|---|---|
| `sorting.item-ids-unique` | item ids unique by value |
| `sorting.category-ids-unique` | category ids unique by value |
| `sorting.item-category-ids-disjoint` | item and category id sets must not overlap (an overlapping id would make assignments ambiguous) |

The schema already enforces counts (3–12 items, 2–5 categories), label/image
presence, and structural shape; these rules catch meaning `uniqueItems`
(deep-equality only) cannot.

---

## 8. Interaction Controller (DOM-free)

`sorting-controller.js` exposes pure functions consumed by the renderer:

- `createSortState(itemIds, categoryIds)` — all items unassigned, nothing selected.
- `selectItem(state, itemId)` — toggle selection; selecting an assigned item
  reopens it for reassignment.
- `assignItem(state, categoryId)` — places the selected item; reassignment
  replaces the old category (one item, at most one category).
- `clearAssignment(state, itemId)` — returns one item to the tray.
- `resetSort(state)` — back to all-unassigned.
- `isAssigned(state, itemId)` — the item's current category or null.
- `isComplete(state)` — every item assigned exactly once (submit gate).
- `buildResponse(state)` — `{ assignments: [{ itemId, categoryId }] }`.

No correctness information ever lives in controller state.

---

## 9. `validateAnswer` Behavior

- **Authoring-integrity:** `validateAssignments` failures throw
  `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
- **Submission shape:** `response.assignments` must be an array of
  `{ itemId, categoryId }` objects.
- **Reference guard:** unknown item ids and unknown category ids are rejected
  (`ACTIVITY_ANSWER_INVALID`) — a forged/guessed id never scores.
- **Uniqueness:** an item assigned more than once is rejected.
- **Completeness:** a submission missing any item's assignment is rejected, so
  a truncated response can never inflate the partial-credit denominator
  (honesty principle, mirrors D-055).
- **Scoring:** per-item detail `{ itemId, categoryId, correct }`; `correct` =
  full set; partial credit = correct assignments ÷ total.

---

## 10. React Renderer

`SortingActivity.jsx` consumes only the client-safe descriptor. Interaction
paths all reduce to the tested controller ops:

1. **Tap/click** — select an item chip (tray or inside a group), then tap a
   group header to place it.
2. **Pointer drag** — chips are draggable onto groups (`dragSource` /
   `dragOver` tracked separately); drag is an enhancement, never the only path.
3. **Keyboard** — every chip and every group is a native `<button>`: Tab to
   focus, Space/Enter to select, then activate a group to place. Placed chips
   carry a per-chip remove button.

Accessibility: `aria-pressed` on chips, group sections announce
`assigned/total`, `aria-live` announcements on every action, visible
`:focus-visible` states, 44px minimum targets, reduced-motion disables drag and
transitions. Submit gates on `isComplete`; the submit handler sends
`{ response, interactionMetrics: { attemptsUsed, hintsUsed, timeTakenSec } }`.

---

## 11. Tests

### 11.1 Sorting plugin suite — `sorting.test.js` (52 tests)

- Registration + contract shape (7 methods), `registerSorting` helper, coexistence.
- Render descriptor: no correct-answer keys, no `assignments`/expected-category
  metadata, shuffle on/off, card-view shape.
- `validatePayload`: 3 semantic rules + schema-layer failure.
- `validateAssignments`: complete pass, missing item, duplicate item, unknown
  item, unknown category.
- `validateAnswer`: full / partial / zero credit, malformed shapes, unknown
  item/category, duplicate item, missing assignment, inconsistent-answer and
  schema-invalid-answer guards, minimal end-to-end.
- `scoringInputs`: 1.0 / 2/3 / 0.0, scorableUnits, evidence never carries the
  expected category.
- `buildHints`, `feedback` (correct/partial/incorrect/timeout, no leaks),
  `availableOn` (default, flag opt-out, voice-only).
- Client facade boundary (no server-only methods/engine methods).
- Controller: initial state, selection, place, reassignment, no-op guards,
  clear, reset, completion gate, response serialization.

### 11.2 Session-service S-series — 7 integration tests

- `S1` safe sorting descriptor end-to-end (no `correctAnswer`, no
  `assignments`).
- `S2` fully-correct sorting answer → 100 round score.
- `S3` partial (4/6) → correctnessFraction 2/3, pointsEarned 67.
- `S4` forged correctnessFraction/score ignored.
- `S5` unknown category id rejected through the service.
- `S6` missing assignment rejected before scoring.
- `S7` mixed drag-drop + sorting session runs to completion (0–300).

### 11.3 Full suite

`npm test` → **358 tests, 358 pass, 0 fail** (2 consecutive full runs).
Breakdown:

| Suite | File(s) | Tests |
|---|---|---|
| Sorting | `sorting.test.js` | 52 |
| Ordering | `ordering.test.js` | 54 |
| Matching | `matching.test.js` | 54 |
| Drag & Drop | `drag-drop.test.js` | 37 |
| Activity Engine core | `engine.test.js` | 37 |
| Activity Engine security | `security.test.js` | 15 |
| Game Engine | `selection.test.js` + `session.test.js` | 13 + 13 |
| Central Scoring | `central-scoring.test.js` | 18 |
| Session service | `session-service.test.js` | 65 |

Game-session suite stability: 5 consecutive runs, 65/65 each (M52 remains
fixed — D-059 contract-not-fixture policy).

---

## 12. Files

**Created**
- `src/features/activity-engine/plugins/sorting/plugin.js`
- `src/features/activity-engine/plugins/sorting/sorting-controller.js`
- `src/features/activity-engine/plugins/sorting/SortingActivity.jsx`
- `src/features/activity-engine/plugins/sorting/sorting.css`
- `src/features/activity-engine/plugins/sorting/index.js`
- `src/features/activity-engine/testing/sorting.test.js`
- `src/features/game-session/demo/sorting-demo-questions.js`
- `reports/14-task-4.7-sorting.md`

**Modified**
- `src/features/game-session/service/game-session-service.js` (register sorting
  in the default engine)
- `src/features/game-session/api/dev-server.js` (seed sorting demo questions)
- `src/features/game-session/testing/session-service.test.js` (S-series: 7
  integration tests)
- `src/App.jsx` (render `SortingActivity` for `kind === 'sorting'`)
- `reports/README.md`, `reports/04-todo.md`, `reports/03-decisions.md`,
  `reports/02-development-log.md`

**Packages installed:** none.
**Configuration changes:** none.
**Supabase changes:** none.

---

## 13. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas meta-valid, 72 examples, 12/12 pairs)
npm test                         # 358 pass / 0 fail (2 consecutive full runs)
npm run lint                     # clean (0 warnings / 0 errors)
npm run build                    # client build clean; bundle probes 0 correct-answer hits
```

Game-session suite (stability) — 5 consecutive runs, 65/65 each.
Demo API smoke test — a session served a sorting round (safe descriptor), then
drag-drop + matching, all correct → 300/300.

---

## 14. Bundle Probe After Build

```
dist/assets/index-*.js : activities/sorting/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : activities/sorting/payload.schema.json       → 0 occurrences
dist/assets/index-*.js : getCorrectAnswerSchema                        → absent
```

---

## 15. Known Limitations

- Categories are rendered in authored order (only items are shuffled). The
  schema exposes `shuffle` without specifying its target; shuffling categories
  adds no learning value and could confuse, so items are shuffled only. If a
  future requirement wants category shuffling, the renderer reads the same
  `shuffle` flag — no schema change needed.
- The S-series tests reuse the recycling correct-answer for the physics
  (elements) payload in the shared pool — structurally valid (complete, known
  ids) and self-consistent (responses derive from the same answer); the
  demo's element question uses a scientifically correct inline answer.
- A browser rendering harness is not present; interaction rules are covered by
  the DOM-free controller tests (same trade-off as matching/ordering).

---

## 16. Future Work (not in this task)

- Task 4.8 — Fill & Complete activity plugin (next).
- Remaining activity plugins (image-interaction, pattern, memory,
  scenario-challenge, number-logic) follow the same pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production sorting authoring tooling + the 2,000-question bank (stage 3.x;
  not created here by design).
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.
