# Task 4.11 — Eighth Production Activity Plugin: Memory

**Status:** Complete
**Date:** 2026-08-14
**Depends on:** 08-task-3.2-schemas.md (memory schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), Task 4.4 `GameSessionService` (safe descriptors + central scoring), and 10–17 (the plugin pattern Memory follows)
**Tests:** 647 total pass (`npm test`, 2 consecutive full runs + 5× game-session stability), lint clean, production build passes, schema validator passes
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The eighth production activity plugin is implemented: **memory** — the
genuine observe-then-recall activity from the Task 3.2 catalog (pairs / sets
of cards that must be reconstructed from memory). Like its predecessors it is
a **point-based** (not multiple-choice) plugin and mirrors the
drag-drop/matching/ordering/sorting/fill-complete/image-interaction/pattern
pattern end-to-end:

- **7-method plugin** (`memoryPlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validateMemoryAnswer`, the semantic port
  of the catalog rule `memory.groups-cover-cards`, extended with the
  invariant that makes scoring honest (group sizes must match the deck type).
- **Two-phase interaction.** Phase 1 **memorize** — the full deck (4–12
  cards) is displayed for the schema's `revealSeconds` countdown (the student
  OBSERVES the public memorization material). Phase 2 **recall** — the deck
  is re-shuffled and re-presented WITHOUT any grouping; the student
  reconstructs the authored groups (pairs = groups of 2; sets = groups of
  3–4) by selecting cards and confirming each group, until every card is
  placed. This is a genuine recall task, not matching-disguised: the grouping
  is the hidden answer and lives ONLY in the server-only correct-answer
  document.
- **Reveal ("Study again") budget.** `payload.maxAttempts` (1–5) is a
  re-reveal limit: the renderer tracks `revealsUsed` and offers an optional
  "Study again" return to the memorize phase up to the limit (null = unlimited).
- **`memory-controller.js`** — a pure, DOM-free interaction state module
  (phase machine, reveal budget, capped selection, place/remove groups,
  completion gate, response serializer) so the interaction rules are
  unit-tested in Node.
- **React renderer** (`MemoryActivity.jsx`) — memorize deck with a live
  countdown that auto-transitions to recall ("I'm ready" skips early), a
  re-shuffled recall pool of real-button cards, a selection strip with
  Place-group / Clear-selection, stacked placed-groups with per-group Remove,
  hint reveal, Study again / Clear, and a submit gate on `isComplete`.
- **Integrated into the Game Session service**: `registerMemory` is part of
  `createDefaultServerActivityEngine()`, the demo API seeds memory demo
  questions (built from the Task 3.2 fixture files — no new production
  content), and the app shell renders `MemoryActivity` for
  `kind === 'memory'`.

The submitted response is `{ groups: [{ cardIds }] }` — exactly what the
controller's `buildResponse` emits. Correct-answer data never reaches the
client: the descriptor carries the PUBLIC deck (the memorization material) and
public deck metadata only — which cards belong together is never revealed (§5).

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method memory plugin + `validateMemoryAnswer` (catalog port) + 2 `validatePayload` semantic rules + strict response-shape gate | `src/features/activity-engine/plugins/memory/plugin.js` |
| 2 | Pure interaction state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/memory/memory-controller.js` |
| 3 | React renderer (two-phase memorize/recall, countdown, group builder) | `src/features/activity-engine/plugins/memory/MemoryActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/memory/memory.css` |
| 5 | Public plugin entry (re-exports + `registerMemory`) | `src/features/activity-engine/plugins/memory/index.js` |
| 6 | Plugin unit tests (62 cases, incl. controller + boundary) | `src/features/activity-engine/testing/memory.test.js` |
| 7 | Session end-to-end integration tests (ME-series, 8 cases) | `src/features/game-session/testing/session-service.test.js` |
| 8 | Memory demo content (Task 3.2 fixtures, dev API only) | `src/features/game-session/demo/memory-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | Demo API seeding | `src/features/game-session/api/dev-server.js` |
| 12 | Final report | `reports/18-task-4.11-memory.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity types
(scenario-challenge, number-logic), production question authoring (none created
here), and the mode-aware registry that would strip server-only method source
from client bundles (recorded as future work, §17).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Memory implementation |
|---|---|---|
| `render` | client | `{ kind, prompt, instructions, recallPrompt, revealSeconds, deckType, maxAttempts, shuffle, cards[{id,text,imageRef,ariaLabel}] }` — **never** reads `correctAnswer.*` |
| `validatePayload` | authoring | Schema gate then 2 semantic rules (§6) |
| `validateAnswer` | server-only | `validateMemoryAnswer` cross-document guard, then strict response-shape gate + reference/completeness/size checks + unordered-set group evaluation |
| `scoringInputs` | server-only | correctnessFraction = correct groups ÷ total groups; evidence never carries the expected grouping |
| `buildHints` | client | Authored progressive hints, never derived from the answer |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals the expected grouping |
| `availableOn` | client | Default available; `featureFlags['memory'] = false` opts out |

---

## 4. Domain Model

- `payload.cards[]` — 4..12 cards `{ id, text?|image?, ariaLabel? }` (exactly
  one of `text`/`image`). These are the PUBLIC memorization material: the deck
  is intentionally shown during the memorize phase.
- `payload.revealSeconds` — memorize-phase countdown (5..30).
- `payload.recallPrompt` — how to recall ("Match each formula to its name.").
- `payload.deckType` — `pairs` | `sets`. From the schema's own description:
  **pairs = groups of 2; sets = groups of 3–4**.
- `payload.shuffle` — deck display order is shuffled when true (default).
  The recall phase re-shuffles so positions never become a crutch.
- `payload.maxAttempts` — optional re-reveal ("Study again") limit (1..5);
  `null` = unlimited re-reveals.
- `correctAnswer.groups[]` — 2..6 server-only expected groups
  `{ groupId, cardIds[2..4] }` covering every card exactly once. `groupId` is
  authoring metadata and is never part of a student response.

Memory is a genuine **recall** activity: answer units = one per group. Scoring
is **exact-response** per group: a submitted group is correct iff its card set
matches an expected group (order inside a group and the order of the groups
are irrelevant — groups are unordered sets). Partial credit = correct groups ÷
total groups, reported as facts for the Central Scoring Service (D-041/D-047).

---

## 5. Render Security (D-021)

`render` never reads `correctAnswer`. The descriptor carries the PUBLIC deck
(the memorization material — intentionally student-facing), the recall prompt,
and the public deck metadata (`deckType`, `revealSeconds`, `maxAttempts`,
`shuffle`). Which cards belong together is NEVER revealed — `render` never
touches `correctAnswer.groups`, `groupId`, or `cardIds`. The cards ARE the
public material; the grouping is the hidden answer. Verified: the built client
bundle contains 0 occurrences of the memory correct-answer schema `$id` and the
client facade exposes no server-only methods (§14, covered by the memory
tests).

---

## 6. Semantic Rules

### 6.1 `validatePayload` — authoring-time (payload only)

| Rule | Purpose |
|---|---|
| `memory.card-ids-unique` | card ids unique by value (the schema's `uniqueItems` is shallow deep-equality — two cards sharing an id with different display data pass it) |
| `memory.deck-size-consistent` | a pairs deck must hold an even number of cards; a sets deck must hold ≥ 6 (the schema's 4..12 bound is independent of whether the deck can be partitioned into valid groups for its deckType — 4–5 cards cannot form ≥2 groups of 3–4, so no 6-card-free set deck is authored) |

### 6.2 `validateMemoryAnswer` — cross-document integrity (server-only)

Port of the catalog rule `memory.groups-cover-cards`
(`schemas/validate.py` `_check_pair`, memory) plus the invariant that makes
scoring honest:

- `memory.groups-cover-cards` — every payload card must appear in **exactly
  one** group: unknown card references and cross-group duplicates are errors,
  and any card missing from every group is an error;
- `memory.group-size-matches-deck` — a pairs group must hold exactly 2 cards;
  a sets group must hold 3–4, so the authored answer can never contradict the
  deck's documented group sizes.

A schema-valid but semantically inconsistent answer document throws
`ACTIVITY_PAYLOAD_SEMANTIC_INVALID` (an author bug, never a student mistake).

---

## 7. Interaction Controller (DOM-free)

`memory-controller.js` exposes pure functions consumed by the renderer:

- `shuffleList` — Fisher–Yates permutation (never mutates its input; used to
  randomize deck display order).
- `createMemoryState({ cards, deckType, maxAttempts })` →
  `{ phase: 'memorize', cards, deckType, maxAttempts, revealsUsed: 1,
  selected: [], groups: [] }`.
- Phase machine: `isMemorizing` / `isRecalling`, `startRecall` (memorize →
  recall, re-shuffles the deck), `canReviewAgain` / `reviewAgain`
  (re-reveal budget: `revealsUsed < maxAttempts`, `null` = unlimited; returns
  to memorize and discards the recall surface).
- Selection: `toggleCard` (unknown id no-op, placed cards protected, selection
  capped at the deck's max group size, toggle off), `selectedIds`,
  `canPlaceGroup` (size within `[min, max]`), `placeGroup`, `removeGroup`,
  `clearSelection`, `clear`, `reset`.
- `minGroupSize` / `maxGroupSize` (2/2 for pairs, 3/4 for sets).
- `isComplete` (submit gate: recall phase AND every card placed AND every
  group a valid size — deliberately correctness-agnostic), and `buildResponse`
  → `{ groups: [{ cardIds }] }` — the exact shape the server validates.

No correctness information ever lives in controller state.

---

## 8. `validateAnswer` Behavior

- **Authoring-integrity:** `validateMemoryAnswer` failures throw
  `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
- **Strict response-shape gate:** the submission is a single object
  `{ groups: [{ cardIds }] }` — 2..6 groups, each a 2..4-card array of
  non-empty strings with no intra-group duplicates, and no unexpected fields
  anywhere. `groupId` is never part of a response. Malformed, missing, or
  forged responses are rejected with `ACTIVITY_ANSWER_INVALID` — never
  silently coerced (D-070 style, extended to memory).
- **Reference integrity:** every placed card must be a known card id.
- **Completeness:** a full recall places every card **exactly once** — missing
  cards and cross-group duplicates are rejected (they would distort the
  partial-credit denominator).
- **Deck-type size consistency:** a pairs group must hold exactly 2; a sets
  group 3–4. A truncated or inflated response can never inflate credit.
- **Scoring:** each submitted group is correct iff its card set matches an
  expected group (order within a group and group order are irrelevant);
  `correct` = all groups correct; `detail.submitted` carries a per-group
  `{ cardIds, correct }` flag.

**Normalization is exact (D-063/D-069):** group identity is an unordered-set
membership test — literal, never fuzzy, never inferred.

---

## 9. React Renderer

`MemoryActivity.jsx` consumes only the client-safe descriptor:

1. **Memorize phase** — the full deck grid is shown while a
   `revealSeconds` countdown runs; the countdown auto-transitions to recall at
   zero (an `aria-live` announcement fires) and "I'm ready — start recall"
   skips the wait. "Study again" returns here while `canReviewAgain` allows.
2. **Recall phase** — the deck is re-shuffled and presented as a pool of
   real-button cards. Tapping toggles selection (announced via `aria-live`);
   "Place group" confirms the selection when its size is valid; placed groups
   stack below with a per-group "Remove"; "Clear selection" and "Clear" reset
   the surface; a live "n of m cards placed" counter updates.
3. **Submit** gates on `isComplete` and sends
   `{ response, interactionMetrics: { attemptsUsed, hintsUsed, timeTakenSec } }`.

Accessibility: real button targets, screen-reader announcements via
`aria-live`, focal `:focus-visible` states, `44px+` touch targets, and a
`prefers-reduced-motion` media query. `memory.css` is mobile-first.

---

## 10. Deck-Size Semantics (from the schema's own deckType description)

`pairs` = groups of exactly 2; `sets` = groups of 3–4 (the Task 3.2 payload
schema's `deckType` description). Consequences enforced as semantic rules
(§6) rather than schema edits:

- a **pairs** deck must hold an even number of cards (4..12);
- a **sets** deck must hold ≥ 6 cards (every count 6..12 partitions into ≥2
  groups of 3–4; counts 4–5 cannot and are rejected at authoring time).

The recall UI reflects this: pairs decks show "each group holds exactly 2
cards", sets decks show "each group holds 3–4 cards", and the controller's
selection cap enforces it. No schema change was made or needed.

---

## 11. Tests

### 11.1 Memory plugin suite — `memory.test.js` (62 tests)

- Registration + contract shape (7 methods), `registerMemory` helper,
  coexistence / duplicate rejection, schema version resolution.
- Render descriptor: no correct-answer keys; deck metadata; image-ref/ariaLabel
  mappings; safe defaults; re-shuffled deck permutation.
- `validatePayload`: 2 semantic rules (duplicate ids, odd pairs deck, small
  sets deck, 12-card boundary) + schema-layer failures (invalid payload
  fixture).
- `validateMemoryAnswer`: consistent pairs/sets pairs, unknown card, cross-group
  duplicate, missing card, group-size mismatch, engine-level author-bug
  rejection.
- Controller: initial memorize phase, group sizes, phase transitions,
  re-reveal budget (bounded + unlimited), shuffle permutation, toggle
  cap/protection, place/remove/clear/reset, completion gates, `buildResponse`
  serialization.
- `validateAnswer`: full/wrong/zero credit, order-insensitivity, partial credit
  (1 of 3), sets scoring, ≥4-group decks, strict shape gate, malformed group
  entries, unknown ids, missing/duplicate placements, incomplete recall,
  deck-type size violations, forged-field rejection.
- `scoringInputs`: 1.0 / 1⁄3 / 0.0, scorableUnits, evidence never carries the
  expected grouping.
- `buildHints`, `feedback` (correct/partial/incorrect/timeout, no leaks),
  `availableOn` (default, flag opt-out).
- Client facade boundary (no server-only methods/engine methods).
- Accessibility contract surface + stylesheet presence.

### 11.2 Session-service ME-series — 8 integration tests

- `ME1` safe memory descriptor end-to-end (kind, deckType, revealSeconds,
  cards, no groups).
- `ME2/ME3` no correctAnswer, groups or groupId reach the client.
- `ME4` fully-correct memory submission → 100 round score.
- `ME5` partial (1 of 3 groups correct) → correctnessFraction 1⁄3,
  pointsEarned 33.
- `ME6/ME7` forged correctnessFraction/score ignored by the server.
- `ME8` malformed/incomplete memory answers rejected through the service.
- `ME9` mixed drag-drop + memory session runs to completion (0–300).
- `ME10` all-memory pool (pairs + sets) runs to completion with per-round
  safe descriptors.

### 11.3 Full suite

`npm test` → **647 tests, 647 pass, 0 fail** (2 consecutive full runs).
Breakdown:

| Suite | File(s) | Tests |
|---|---|---|
| Memory | `memory.test.js` | 62 |
| Pattern | `pattern.test.js` | 66 |
| Image Interaction | `image-interaction.test.js` | 71 |
| Fill & Complete | `fill-complete.test.js` | 57 |
| Ordering | `ordering.test.js` | 54 |
| Matching | `matching.test.js` | 54 |
| Sorting | `sorting.test.js` | 52 |
| Drag & Drop | `drag-drop.test.js` | 37 |
| Activity Engine core | `engine.test.js` | 37 |
| Activity Engine security | `security.test.js` | 15 |
| Game Engine | `selection.test.js` + `session.test.js` | 13 + 13 |
| Central Scoring | `central-scoring.test.js` | 18 |
| Session service | `session-service.test.js` | 98 |

Game-session suite stability: 5 consecutive runs, 98 each run, 0 failure.

---

## 12. Files

**Created**
- `src/features/activity-engine/plugins/memory/plugin.js`
- `src/features/activity-engine/plugins/memory/memory-controller.js`
- `src/features/activity-engine/plugins/memory/MemoryActivity.jsx`
- `src/features/activity-engine/plugins/memory/memory.css`
- `src/features/activity-engine/plugins/memory/index.js`
- `src/features/activity-engine/testing/memory.test.js`
- `src/features/game-session/demo/memory-demo-questions.js`
- `reports/18-task-4.11-memory.md`

**Modified**
- `src/features/game-session/service/game-session-service.js` (register memory
  in the default engine)
- `src/features/game-session/api/dev-server.js` (seed memory demo questions)
- `src/features/game-session/testing/session-service.test.js` (ME-series: 8
  integration tests)
- `src/App.jsx` (render `MemoryActivity` for `kind === 'memory'`)
- `reports/README.md`, `reports/04-todo.md`, `reports/02-development-log.md`

**Packages installed:** none.
**Configuration changes:** none.
**Schema/Supabase changes:** none.

---

## 13. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas meta-valid, 72 examples, 12/12 pairs)
npm test                         # 647 pass / 0 fail (2 consecutive full runs)
npm run lint                     # clean (0 warnings / 0 errors)
npm run build                    # client build clean; bundle probes 0 correct-answer hits
```

Game-session suite stability — 5 consecutive runs, 98/98 each.

---

## 14. Bundle Probe After Build

```
dist/assets/index-*.js : activities/memory/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : "groups" / "groupId" (as descriptor keys)   → absent from any descriptor
dist/assets/index-*.js : cardIds (as a descriptor key)               → absent from any descriptor
```

The correct-answer schema and the expected grouping never appear in the client
bundle; the `memory` render descriptor carries the public deck and deck
metadata only (covered by ME2/ME3 and the memory render tests).

---

## 15. Demo API Smoke Test (real HTTP)

A one-shot socket smoke run (self-contained script) started the dev API server
on an ephemeral port, constrained the pool to the three memory demo questions
(id 47..49), then drove a full session over `fetch`:

```
health: 200
start: 201 ok
round 1 (memory): correct=true pts=100 -> next
round 2 (memory): correct=true pts=100 -> next
round 3 (memory): correct=true pts=100 -> done
finish: 200 score: 300 types: memory rounds: 3
SMOKE PASS
```

Every round descriptor was verified to contain no `correctAnswer` / `"groups"` /
`groupId`, and the greedy-correct submission scored `correct: true` on every
round.

---

## 16. Known Limitations

- A browser rendering harness is not present; interaction rules are covered by
  the DOM-free controller tests (same trade-off as the previous plugins).
- The memorize-phase countdown and the reveal budget are UX-side
  (`revealsUsed` is tracked by the renderer/controller); the server does not
  enforce `maxAttempts` — it is a study-aid limit, not a security boundary
  (the answer is the grouping, which is never exposed).

---

## 17. Future Work (not in this task)

- Remaining activity plugins (scenario-challenge, number-logic) following the
  same pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production memory authoring tooling + the 2,000-question bank (stage 3.x;
  not created here by design).
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.
