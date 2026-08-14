# Task 4.6 — Third Production Activity Plugin: Ordering

**Status:** Complete
**Date:** 2026-08-13
**Depends on:** 08-task-3.2-schemas.md (ordering schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), 10-task-4.2-drag-drop.md and 12-task-4.5-matching.md (the plugin pattern Ordering follows), Task 4.4 `GameSessionService` (safe descriptors + central scoring)
**Tests:** 299 total pass (`npm test`, 3 consecutive full runs), lint clean, production build passes, schema validator passes
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The third production activity plugin is implemented: **ordering**. Built
against the Task 4.1 engine contract and the Task 3.2 ordering schema contract
(3–8 item cards, optional anchored positions, expected sequence server-side),
it mirrors the drag-drop/matching plugin pattern end-to-end:

- **7-method plugin** (`orderingPlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validateSequence`, the cross-document
  semantic port of the catalog rule `ordering.order-permutation`.
- **`ordering-controller.js`** — a pure, DOM-free interaction state module
  (create → anchor-guarded move/swap → reset → coverage gate → response
  serializer) so the ordering rules are unit-tested in Node.
- **React renderer** (`OrderingActivity.jsx`) with tap-select, pointer drag,
  keyboard (Up/Down + arrow keys), reduced-motion, locked anchors, progressive
  hints, clear, and a submit gate.
- **Integrated into the Game Session service**: `registerOrdering` is now part
  of `createDefaultServerActivityEngine()`.

Ordering is **sequence construction**, not rank assignment: the position is the
rank, per-position credit is awarded, and the correct-answer document never
reaches the client. Verified by production bundle probe (§28): the client bundle
contains **zero** occurrences of the ordering correct-answer schema `$id`.

This task also fixes a pre-existing **flaky test** (`M52` in the session-service
suite) discovered while verifying the full suite: its assertion assumed a
specific matching fixture's item count while the pool legitimately mixed 3-item
and 4-item questions. The fix is test-only and selection-agnostic (§26).

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method ordering plugin + `validateSequence` (catalog port) + 6 `validatePayload` semantic rules | `src/features/activity-engine/plugins/ordering/plugin.js` |
| 2 | Pure interaction state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/ordering/ordering-controller.js` |
| 3 | React renderer (tap-select / pointer drag / keyboard, no drag library) | `src/features/activity-engine/plugins/ordering/OrderingActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/ordering/ordering.css` |
| 5 | Public plugin entry (re-exports + `registerOrdering`) | `src/features/activity-engine/plugins/ordering/index.js` |
| 6 | Plugin unit tests (54 cases, incl. controller + anchors) | `src/features/activity-engine/testing/ordering.test.js` |
| 7 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 8 | M52 flaky-test fix (selection-agnostic) | `src/features/game-session/testing/session-service.test.js` |
| 9 | Final report | `reports/13-task-4.6-ordering.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity types (sorting,
fill-complete, image-interaction, pattern, memory, scenario-challenge,
number-logic), production question authoring (none created here), a browser
rendering harness (the interaction rules are covered by the DOM-free controller
tests), and the mode-aware registry that would strip server-only method source
from client bundles (recorded as future work, §29).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Ordering implementation |
|---|---|---|
| `render` | client | Display order with anchors pinned; free positions optionally shuffled; **never** reads `correctAnswer.order` |
| `validatePayload` | authoring | Schema gate then 6 semantic rules (ids unique, anchors in-range/existing/unique, shuffle excludes fully-anchored) |
| `validateAnswer` | server-only | `validateSequence` integrity check, then complete-permutation shape guard, then per-position correctness detail |
| `scoringInputs` | server-only | correctnessFraction = correct positions ÷ total positions (D-047); `evidence` = position detail (never expected ids) |
| `buildHints` | client | Authored progressive hints, never derived from the sequence |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals the expected order |
| `availableOn` | client | Default available; `featureFlags['ordering'] = false` opts out; no hard-coded grade restriction |

---

## 4. Domain Model

- `payload.items[]` — 3..8 item cards (`id`, `label`, `image`, `ariaLabel`).
- `payload.anchors[]` — optional (max 3) gameplay locks
  `{ position, itemId }`: an anchored item can never change position, an
  anchored slot can never receive another item.
- `payload.shuffle` — when true, the server shuffles only the **free**
  (non-anchored) positions in the display order.
- `correctAnswer.order[]` — the expected sequence: a complete permutation of the
  payload item ids (server-only).

Ordering is **sequence construction**: the position is the rank. There is no
separate `rank` field and no score fields in the answer document.

---

## 5. Render Security (D-021)

`render` never reads `correctAnswer`. The descriptor carries:
`{ kind, prompt, instructions, shuffle, items[], anchors[] }` where `items` are
client-safe card views (`id`, `label`, `image`, `ariaLabel`, `anchored`). The
anchors are gameplay locks — they convey **no** correctness information (they
are part of the question, not the answer). Verified: the built client bundle
contains 0 occurrences of both ordering schema `$id` markers (§28), and the
client facade exposes no `validateAnswer` / `scoringInputs` / `feedback` /
`getCorrectAnswerSchema` (covered by the ordering tests).

---

## 6. Semantic Port: `ordering.order-permutation`

`validateSequence(payload, correctAnswer)` runs server-side (in
`validateAnswer`) and is exported for authoring tooling/tests. It enforces:

- the expected `order` is a complete permutation of payload item ids (no
  duplicates, no unknown ids, no missing ids);
- every anchored `{ position, itemId }` agrees with `correctAnswer.order`.

A schema-valid but semantically inconsistent answer document throws
`ACTIVITY_PAYLOAD_SEMANTIC_INVALID` (an author bug, never a student mistake).

---

## 7. `validatePayload` Semantic Rules

| Rule | Purpose |
|---|---|
| `ordering.item-ids-unique` | ids unique by value |
| `ordering.anchor-positions-in-range` | anchor positions are valid indexes |
| `ordering.anchor-ids-exist` | every anchor `itemId` references a real item |
| `ordering.anchor-positions-unique` | no two anchors share a position |
| `ordering.anchor-items-distinct` | an item cannot be anchored twice |
| `ordering.shuffle-excludes-anchors` | fully-anchored + shuffle is degenerate |

---

## 8. Interaction Controller (DOM-free)

`ordering-controller.js` exposes pure functions consumed by the renderer:

- `createOrderState(order, anchors)` — seeds the initial order; anchored items
  are placed at their locked positions and excluded from the free pool.
- `moveItem(state, from, to)` — re-arranges only free positions; moving across
  an anchor never disturbs the anchor.
- `swap(state, a, b)` — anchor-guarded swap of two free positions.
- `isAnchored(state, positionOrId)` / `canMove(state, position)` — lock queries.
- `reset(state)` — back to the seed order (anchors preserved).
- `isComplete(state)` — submit gate (every position holds an item).
- `buildResponse(state)` — `{ order: [...] }`, exactly what `validateAnswer`
  expects.

---

## 9. `validateAnswer` Behavior

- **Authoring-integrity:** `validateSequence` failures throw
  `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
- **Submission shape:** `response.order` must be an array of item id strings.
  Duplicate ids, unknown ids, and incomplete orders are rejected
  (`ACTIVITY_ANSWER_INVALID`) — a truncated response cannot inflate partial
  credit (mirrors D-055's honesty principle).
- **Scoring:** per-position detail `{ index, correct }`; `correct` = full
  sequence match; partial credit = correct positions ÷ total.

---

## 10. React Renderer

`OrderingActivity.jsx` consumes only the client-safe descriptor. Interaction
paths all reduce to the tested controller ops:

1. **Tap/click** — select a free item, then tap a target slot to move it.
2. **Pointer drag** — `dragSource`/`dragOver` tracked separately; drop moves
   the item (anchored slots never accept a drop).
3. **Keyboard** — Up/Down buttons and ArrowUp/ArrowDown move the focused item
   one position; anchored items announce as locked.

Anchors render locked (dashed style, `aria-disabled`, screen-reader announce),
the submit button gates on `isComplete`, and the submit handler sends
`{ response, interactionMetrics: { attemptsUsed, hintsUsed, timeTakenSec } }`.

---

## 11. Tests

### 11.1 Ordering plugin suite — `ordering.test.js` (54 tests)

- Registration + contract shape (7 methods), `registerOrdering` helper, coexistence.
- Render descriptor: no correct-answer keys, anchors pinned, free positions
  shuffled only when enabled, card-view shape.
- `validatePayload`: 6 semantic rules + schema-layer failure.
- `validateSequence`: duplicate / unknown / missing ids + anchor violation.
- `validateAnswer`: full / partial / zero credit, anchor position scored
  incorrect (never authoring error), malformed shapes, dupes, unknown ids,
  incomplete orders, inconsistent-answer and schema-invalid-answer guards.
- `scoringInputs`: 1.0 / 0.25 (3-item cyclic shift) / 0.5 (single swap) / 0.
- `buildHints`, `feedback` (correct/partial/incorrect/timeout, no leaks),
  `availableOn` (default, flag opt-out, voice-only).
- Client facade boundary (no server-only methods/engine methods).
- Controller: anchor pinning, move across anchors, move/swap guards, reset,
  coverage gate, response serializer, `canMove`.

### 11.2 Full suite

`npm test` → **299 tests, 299 pass, 0 fail** (3 consecutive full runs).
Breakdown:

| Suite | File(s) | Tests |
|---|---|---|
| Ordering | `ordering.test.js` | 54 |
| Matching | `matching.test.js` | 54 |
| Drag & Drop | `drag-drop.test.js` | 37 |
| Activity Engine core | `engine.test.js` | 37 |
| Activity Engine security | `security.test.js` | 15 |
| Game Engine | `selection.test.js` + `session.test.js` | 13 + 13 |
| Central Scoring | `central-scoring.test.js` | 18 |
| Session service | `session-service.test.js` | 58 |

---

## 12. M52 Flaky-Test Fix

**Root cause.** `M52` asserted
`currentRound.activity.leftItems.length === matchingGradePayload.leftItems.length`
(3) while `poolAllMatching` seeded the pool with a 4-item physics question
alongside two 3-item grade questions. Random selection could legitimately pick
either, so the assertion intermittently failed (reproduced: 1 failure in some
game-session-suite runs, 0 in others).

**Fix (test-only, selection-agnostic — Approach B).** M52 now verifies the
descriptor **contract** instead of a fixture's item count:

- matching round is selected successfully (`activityType`/`kind`);
- descriptor shape: `leftItems`/`targets` are non-empty arrays, every card has
  string `id`/`text`, `targets.length >= leftItems.length`;
- no `pairs` key in `activity`;
- `JSON.stringify(currentRound)` contains no `correctAnswer`;
- `timer.allowedSeconds > 0`, `hints.length > 0`.

No game-engine selection algorithm, randomness, matching behavior, production
scoring, security checks, or the 3-of-100 algorithm were changed.

**Proof.** The game-session suite was run **5 consecutive times** after the fix:
58/58 pass each run (previously it flaked). Three consecutive full `npm test`
runs: 299/299 each.

---

## 13. Files

**Created**
- `src/features/activity-engine/plugins/ordering/plugin.js`
- `src/features/activity-engine/plugins/ordering/ordering-controller.js`
- `src/features/activity-engine/plugins/ordering/OrderingActivity.jsx`
- `src/features/activity-engine/plugins/ordering/ordering.css`
- `src/features/activity-engine/plugins/ordering/index.js`
- `src/features/activity-engine/testing/ordering.test.js`
- `reports/13-task-4.6-ordering.md`

**Modified**
- `src/features/game-session/service/game-session-service.js` (register ordering
  in the default engine)
- `src/features/game-session/testing/session-service.test.js` (M52
  selection-agnostic fix)
- `reports/README.md`, `reports/04-todo.md`, `reports/03-decisions.md`,
  `reports/02-development-log.md`

**Packages installed:** none.
**Configuration changes:** none.
**Supabase changes:** none.

---

## 14. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas meta-valid, 72 examples, 12/12 pairs)
npm test                         # 299 pass / 0 fail (3 consecutive full runs)
npm run lint                     # clean (0 warnings / 0 errors)
npm run build                    # client build clean; bundle probes 0 correct-answer hits
```

Game-session suite (M52 stability proof) — 5 consecutive runs, 58/58 each.

---

## 15. Bundle Probe After Build

```
dist/assets/index-*.js : activities/ordering/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : activities/ordering/payload.schema.json       → 0 occurrences
```

---

## 16. Future Work (not in this task)

- Remaining activity plugins (sorting, fill-complete, image-interaction,
  pattern, memory, scenario-challenge, number-logic) follow this same pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production ordering authoring tooling + the 2,000-question bank (stage 3.x;
  not created here by design).
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.
