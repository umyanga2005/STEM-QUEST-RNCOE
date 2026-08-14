# Task 4.5 — Second Production Activity Plugin: Matching

**Status:** Complete
**Date:** 2026-08-13
**Depends on:** 08-task-3.2-schemas.md (matching schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), 10-task-4.2-drag-drop.md (first plugin — the pattern Matching follows), 11-task-4.3-game-engine-core.md, Task 4.4 `GameSessionService` (in-repo code; safe descriptors + central scoring)
**Tests:** 245 total pass (`npm test`), lint clean, production build passes, schema validator passes
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The second production activity plugin is implemented: **matching**. Built
against the Task 4.1 engine contract and the Task 3.2 matching schema contract
(left cards → right targets, shared targets allowed, distractors pickable but
never scorable), it mirrors the drag-drop plugin pattern end-to-end:

- **7-method plugin** (`matchingPlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validatePairs`, the cross-document semantic
  port of the catalog rules `matching.pairs-cover-left` and
  `matching.pair-right-exists`.
- **`matching-controller.js`** — a pure, DOM-free interaction state module
  (select → pair → reassign/clear → verify coverage → submit) used by the React
  renderer, so the interaction rules are unit-tested in Node.
- **React renderer** (`MatchingActivity.jsx`) with tap/click, keyboard, and
  reduced-motion support, progressive hints, retry, and a privacy-preserving
  target pool that hides which cards are distractors.
- **Fully integrated into the Game Session service**: `registerMatching` is now
  part of `createDefaultServerActivityEngine()`, the demo API serves matching
  rounds, and the app shell renders `MatchingActivity` for `kind === 'matching'`.

Correct-answer data never reaches the client. Verified by production bundle
probe (§30): the client bundle contains **zero** occurrences of the matching
correct-answer schema `$id` (server bundle contains it), and the client facade
exposes no `validateAnswer` / `scoringInputs` / `feedback` /
`getCorrectAnswerSchema`.

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method matching plugin + `validatePairs` (catalog port) + `validatePayload` semantic rules | `src/features/activity-engine/plugins/matching/plugin.js` |
| 2 | Pure interaction state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/matching/matching-controller.js` |
| 3 | React renderer (pointer/touch/keyboard, no drag library) | `src/features/activity-engine/plugins/matching/MatchingActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/matching/matching.css` |
| 5 | Public plugin entry (re-exports + `registerMatching`) | `src/features/activity-engine/plugins/matching/index.js` |
| 6 | Plugin unit tests (50+ cases, incl. controller) | `src/features/activity-engine/testing/matching.test.js` |
| 7 | Session end-to-end integration tests | `src/features/game-session/testing/session-service.test.js` (M-series) |
| 8 | Matching demo content (Task 3.2 fixtures, dev API only) | `src/features/game-session/demo/matching-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | New schema example + semantic pair (validator 11/11) | `schemas/examples/matching/grade9-11-correct-answer.json`, `schemas/validate.py` |
| 12 | Final report | `reports/12-task-4.5-matching.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity types
(ordering, sorting, fill-complete, image-interaction, pattern, memory,
scenario-challenge, number-logic), production question authoring (none created
here), and the mode-aware registry that would strip server-only method source
from client bundles (recorded as future work, §31).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Matching implementation |
|---|---|---|
| `type` / `name` / `version` / `schemaVersion` | identity | `matching` / `Matching` / `1.0.0` / `1.0` |
| `render(ctx)` | client | client-safe descriptor: left cards + merged, shuffled target pool — never marks distractors |
| `validatePayload(payload)` | authoring / client | 4 semantic rules beyond the JSON Schema (§7) |
| `validateAnswer(ctx)` | server-only | cross-document integrity (`validatePairs`) + validated submitted connections |
| `scoringInputs(ctx, validation)` | server-only | correctness fraction (correct pairs ÷ total lefts), scorable units, metrics (D-047) |
| `buildHints(question)` | client | authored, progressive hints |
| `feedback(ctx, validation, state)` | server-only | correct / partial / incorrect / timeout; never reveals pairs |
| `availableOn(ctx)` | client | flag opt-out (`matching`); available on `voice-only` (works by name) |

One constraint worth calling out: as with drag-drop (D-051), the single-plugin
registration model means the client bundle necessarily carries the server-only
method *source* (inert without the correct-answer document). The security
boundary that matters — correct-answer schemas and answer documents — is
verified absent from the client bundle (§30).

---

## 4. Repository Layout

```
src/features/activity-engine/plugins/matching/
├── plugin.js                 # matchingPlugin (7 methods) + validatePairs
├── matching-controller.js    # createMatchState/toggleSelect/chooseTarget/
│                             #   clearMatch/resetMatches/allMatched/buildResponse
├── MatchingActivity.jsx      # React renderer (consumes descriptor + controller)
├── matching.css              # styles
└── index.js                  # public entry: plugin + controller + renderer
```

The controller split is the notable addition over the drag-drop pattern: all
interaction semantics (select, pair, reassign, clear, coverage, response
serialization) live in a pure module so pointer, touch, and keyboard paths all
reduce to the same tested operations.

---

## 5. Matching Domain Rules (from the Task 3.2 catalog & schema)

The matching schema contract (report 08) defines:

- `payload.leftItems[]` — the cards a student must match (unique ids).
- `payload.rightItems[]` — the legitimate targets.
- `payload.distractors[]` (optional) — decoy targets that **never match**.
- `correctAnswer.pairs[]` — `{ leftId, rightId }` with **shared-target**
  semantics allowed (two lefts may share one right) and **no** duplicate-left
  constraint at the schema level (enforced semantically here).

The plugin therefore enforces, beyond the JSON Schema:

1. **`matching.pairs-cover-left`** — every left item must appear in the answer
   pairs exactly once.
2. **`matching.pair-right-exists`** — every `rightId` in the pairs must exist in
   `payload.rightItems`; a distractor can never be a correct target.
3. Submission rule — a student may never satisfy *multiple* lefts with the
   same submitted `leftId` record; the correct-answer may (shared target), the
   submission may not (a row per left card).
4. Coverage rule — every left card must have exactly one submitted connection;
   a truncated response is rejected before scoring (a "skip the hard one"
   submission must not silently inflate the score via denominator tricks).

---

## 6. Cross-Document Semantic Port (`validatePairs`)

Ported from `schemas/validate.py` `_check_pair` (matching) and exposed on the
plugin so authoring tooling and tests can run it directly. Runs server-side
inside `validateAnswer` where both documents exist.

```js
export function validatePairs(payload, correctAnswer) // → Array<{ruleId, message, path}>
```

Checks:
- duplicate `leftId` in pairs → `matching.pairs-cover-left` ("paired more than once")
- every `leftItems` id has a pair → `matching.pairs-cover-left` ("has no pair")
- a pair `rightId` not in `rightItems` (incl. distractors) → `matching.pair-right-exists`

Tests (`matching.test.js` §4) prove the pass case, the unpaired-left case, the
duplicated-left case, a distractor referenced by the answer (rejected), and an
unknown-right case.

Example added for validation completeness: `schemas/examples/matching/grade9-11-correct-answer.json`
pairs the existing `valid-payload-grade9-11.json` (4 pairs + distractor), and
the validator's semantic layer now checks it (11/11 pairs consistent).

---

## 7. Payload-Only Semantic Rules

`validatePayload` adds four authoring-time rules on top of the JSON Schema:

| Rule | Meaning |
|---|---|
| `matching.left-ids-unique` | duplicate left ids (even with different text) rejected |
| `matching.right-ids-unique` | duplicate right ids rejected |
| `matching.distractor-ids-unique` | duplicate distractor ids rejected |
| `matching.card-ids-disjoint` | ids must not overlap across left/right/distractor sets |

All four tolerate an absent `distractors` key (optional in the schema).

---

## 8. Render & Client-Safe Descriptors

`render(ctx)` produces a frozen, client-safe descriptor:

```
{
  kind: 'matching',
  prompt, instructions,            // strings (normalized)
  enableShuffle: bool,             // payload.shuffle ?? true
  allowRetry: bool,                // payload.allowRetry ?? true
  leftItems:  [{ id, text, image, ariaLabel }],   // shuffled per payload.shuffle
  targets:    [{ id, text, image, ariaLabel }],   // rightItems + distractors, MERGED + shuffled
}
```

**Privacy design:** distractors are merged into the `targets` pool and shuffled
together with the real right items, so the client cannot distinguish decoys
from legitimate targets — and no target is ever flagged `isDistractor` or
`correct`. The descriptor contains none of: `correctAnswer`, `correct_answer`,
`answerKey`, `pairs`.

---

## 9. Card Ordering (`shuffle`)

Mirrors drag-drop's `randomizeItems` but defaults to `true` for both columns.
When `payload.shuffle !== false`, `render` shuffles the left cards and the
merged target pool (Fisher–Yates, deterministic only by random seed of the
process). Tests verify order preservation when `shuffle: false` and set
equality when shuffled.

---

## 10. `validateAnswer` (Server-Only Correctness)

Flow:

1. **Integrity** — run `validatePairs(payload, correctAnswer)`; on any error
   throw `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
2. **Shape** — `response.connections` must be an array of
   `{ leftId, rightId }` strings (absent → `[]`; wrong shape → throw
   `ACTIVITY_ANSWER_INVALID`).
3. **Reference guard** — every `leftId` must exist in `leftItems` (else
   `unknown left item id`), every `rightId` must exist in
   `rightItems ∪ distractors` (else `invalid target id`). Distractors are
   *valid picks that always score wrong* — they are not "unknown".
4. **Dedupe normalization** — exact-duplicate connection records are collapsed
   before scoring, preserving semantic results.
5. **Duplicate source guard** — a `leftId` connected more than once throws
   `connected more than once`.
6. **Coverage guard** — a left card with no submitted connection throws
   `missing required match for left item "…"`.
7. **Score** — correctness per left card vs `correctAnswer.pairs`, return
   `{ correct, detail: { total, correctCount, connections[] } }`.

The `detail.connections` rows are also the per-attempt evidence persisted by
the session service (report Task 4.4). Because `correct-answer` documents route
only through `validateAnswer`, and the engine schema-guards them first, a
schema-invalid answer document surfaces as `ENGINE_INTERNAL` (tested).

---

## 11. Partial Credit & Scoring Inputs (D-047)

`correctnessFraction = correctCount / total` where `total` is the number of
left cards (the scorable units). Three scenarios drive the score:

- 3/3 lefts right → fraction 1 → full 100 (D-021 base) before deductions.
- one left mapped to a distractor on a 4-card physics question → fraction 3/4,
  central scoring rounds `100 × 0.75 = 75`.
- all lefts wrong → fraction 0.

`scoringInputs` returns `{ correctnessFraction, scorableUnits, correctUnits,
attemptsUsed, hintsUsed, interactionMetrics, evidence }`. The engine guards the
fraction ∈ [0,1] and the Central Scoring Service (D-023/D-041) does the
arithmetic — forged `correctnessFraction` / `score` values from the client are
ignored, proven at the service level (M58).

---

## 12. Hints

`buildHints(question)` returns authored hints normalized to
`{ id, level, text }` (level defaults to position; order preserved). The plugin
never derives hint text from the correct answer. Progressive utility is the
content author's responsibility (authored level ordering), consistent with
drag-drop.

---

## 13. Feedback

`feedback(ctx, validation, state)` returns learning-oriented feedback;

- `state === 'timeout'` (or a `submission.state` of timeout) → timeout copy.
- `fraction === 1` → `correct` ("All connected").
- `fraction > 0` → `partial` ("X of Y cards are matched correctly").
- otherwise → `incorrect`.

Output is run through the engine's `normalizeFeedback` allow-list and contains
no `correctAnswer` / `answerKey` / `pairs` keys. Guidance steers the learner to
a strategy ("re-read each card", "think about the relationship it describes on
its own") without naming pairs.

---

## 14. Availability

`availableOn(ctx)` respects `featureFlags['matching'] = false` and otherwise
returns `true`. Unlike drag-drop, `voice-only` devices are **offered**
matching: cards can be matched by name, so no pointer/touch dragging is
required. Tested.

---

## 15. Registration Helper

```js
export function registerMatching(engine) { return engine.register(matchingPlugin) }
```

`createDefaultServerActivityEngine()` in `src/features/game-session/service/game-session-service.js`
now registers both `drag-drop` and `matching`, so the session service can serve
matching rounds through the exact same safe-descriptor → submitRound pipeline as
drag-drop. Duplicate registration throws `REGISTRATION_DUPLICATE_TYPE` (tested).

---

## 16. Interaction Model & the Pure Controller

`matching-controller.js` models the state machine without a DOM:

| Operation | Behavior |
|---|---|
| `createMatchState(leftIds)` | every left unconnected, nothing selected |
| `toggleSelect(state, leftId)` | select / deselect a card; selecting a different card moves the selection; reopening a matched card allows reassignment |
| `chooseTarget(state, rightId)` | connect selected left → target, clear selection; no-op (same reference) when nothing selected |
| `clearMatch(state, leftId)` | remove one connection, keep the rest |
| `resetMatches(state)` | back to all-unconnected |
| `allMatched(state)` | every left has a connection (the submit gate) |
| `buildResponse(state)` | serialize one `{ leftId, rightId }` per left card in order |

The renderer maps tap/click/keyboard events onto these pure functions, so the
touch/keyboard behaviors required of the assignment are covered by Node tests
(e.g., select → pair → reassign, clear one match, reset, incomplete → gate
closed). The checklist items "remove/reassign a match where allowed", "name the
incomplete state before submit", and the pending-reveal behavior are all
represented here.

---

## 17. React Renderer (`MatchingActivity.jsx`)

- Left column: selectable left cards (buttons, min 44px targets).
- Right column: merged target pool (decoys indistinguishable).
- When connected, a card shows its match; a **Clear** (×) affordance per
  connection removes just that link; the **Clear** control resets everything.
- Submit enabled only when `allMatched`; button reports progress
  `Submit (n/total)`.
- Hints reveal one at a time (aria-live announces); submitted state disables
  input and shows the "waiting for server scoring" note (matching the drag-drop
  demo copy).
- Reduced-motion path avoids pointer capture entirely (click-only).

Consumes only the render descriptor; `response` building and metrics
(`attemptsUsed`, `hintsUsed`, `timeTakenSec`) go to `onSubmit`.

---

## 18. Accessibility

- Semantic buttons with `aria-pressed` state and descriptive `aria-label`s
  (matched cards announce the target, not the answer).
- `aria-live="polite"` region announces selection, pairing, clearing, and
  hint reveals.
- Full keyboard operation (buttons), visible focus rings, 44px minimum targets,
  and `prefers-reduced-motion` support.

---

## 19. Styling

`matching.css` mirrors drag-drop's mobile-first conventions (two-column board
that reduces to a single column on narrow screens, same color tokens, focus and
selected states). Matched cards get a connected highlight; the connections
summary list shows active pairings with per-link clear.

---

## 20. Demo Wiring

- `src/features/game-session/demo/matching-demo-questions.js` builds three
  published Science·Level-1 matching questions **entirely from Task 3.2 fixture
  payloads** (chemical names, body systems, physics equations with a distractor)
  — no new production question content was authored.
- `src/features/game-session/api/dev-server.js` seeds these in the demo API so
  `npm run api` + `npm run dev` can surface matching rounds in the browser.
- `src/App.jsx` renders `MatchingActivity` when `currentRound.activity.kind ===
  'matching'`, otherwise `DragDropActivity`.
- The demo store's core `demoBaseData()` is unchanged (its 6-question drag-drop
  pool is asserted by repository tests B9/A7); matching content lives in the
  dev-server-only module, keeping those tests green and the client bundle free
  of answer data.

---

## 21. Error Model Integration

Uses the Task 4.1 `engineError` factories:

- `ACTIVITY_PAYLOAD_SEMANTIC_INVALID` — authoring-side cross-document failures
  and payload semantic-rule failures.
- `ACTIVITY_ANSWER_INVALID` — malformed connections, unknown left ids, invalid
  target ids, duplicate sources, missing required matches, wrong shapes.
- `ENGINE_INTERNAL` — schema-invalid answer documents (guarded by the engine
  before the plugin runs).

All are `ActivityEngineError` instances with a stable `code`, `category`, and
student-safe `toPublic()` message; unknown internals never leak.

---

## 22. Test Coverage Summary

`npm test` → **245 passing** (drag-drop 39, matching 50+, game engine 26,
session service 60+, activity engine core/security). Matching-specific suites:

**Unit (`matching.test.js`):** registration/contract, coexistence with
drag-drop, render descriptors (no answer keys, distractor merging, order /
shuffle), `validatePayload` (4 semantic rules + schema-layer failure),
`validatePairs` (5 cases), `validateAnswer` (+ shared-target, distractor pick,
duplicate source, malformed shape, unknown left, invalid target, dedupe
normalization, missing match, inconsistent & invalid answer docs), `scoringInputs`
(1 / 2/3 / 0 / 3/4), `buildHints`, `feedback` (+ timeout), `availableOn`
(+ voice-only), client-facade security (5 assertions), full-pipeline minimal
example, and 9 controller-state tests (select / pair / reassign / clear /
reset / gate / response).

**Integration (`session-service.test.js`, M-series):** engine registers
matching; a matching round produces a safe descriptor end-to-end; full-correct
scores 100; 2/3 partial scores 67; physics-with-distractor scores 75; an
unknown target is rejected through the service; a missing required match is
rejected; a forged `correctnessFraction` / `score` is ignored; and a mixed
drag-drop + matching session completes to 300.

---

## 23. Lint

`npm run lint` (oxlint) → clean (0 errors, 0 warnings).

---

## 24. Schema Conformance

`python3 schemas/validate.py` → **PASS**: 24 schemas meta-valid, 71 examples
valid (incl. the new `grade9-11-correct-answer.json`), **11/11** semantic pairs
consistent. The matching grade9-11 payload+answer pair is now part of the
validator's Layer-3 pair checks.

Note: this task intentionally did **not** produce the production 2,000-question
question bank (stage 3.x); demo content uses only the existing matching
fixtures.

---

## 25. Bundle-Boundary Verification (production probe)

Requirement: matching correct-answer schema absent from the client bundle.

```
npm run build
grep -c "matching/correct-answer.schema.json" dist/assets/*.js   → 0
grep -c "matching/payload.schema.json"       dist/assets/*.js    → 0
```

Additional probes:
- Client engine `getCorrectAnswerSchema`, `validateAnswer`, `scoringInputs`,
  `feedback` are all `undefined`; client `schemaRegistry.correctAnswerSchemas`
  is `null`.
- The client bundle's only `pairs`/`mappings` strings are the semantic-rule
  catalog *identifiers* (`matching.pairs-cover-left`, etc.) and the
  `correctAnswerExposed` error-factory method name — no answer documents.
- Server-side availability: `CORRECT_ANSWER_SCHEMAS.matching` resolves to
  `https://stem-quest.dev/schemas/activities/matching/correct-answer.schema.json`
  (the matching `validateAnswer` tests pass through this schema guard).
- Dev-API smoke test: start → matching round descriptor (no `pairs`,
  no `correctAnswer`) → submit → finish = 300.

---

## 26. Browser Verification (demo)

`npm run api` + `npm run dev` → Start session; the demo pool now blends
drag-drop and matching questions (dev server only). For a matching round the
shell renders the matching board; select a left card, pick a target to connect,
clear/reassign as needed, reveal hints, submit when all are matched; the server
returns correctness + points server-side.

---

## 27. Decisions Introduced

- **D-054 — Matching render hides distractors in the target pool.** The client
  cannot tell decoys from real targets (merged + shuffled), so nothing need be
  trusted client-side and no answer-relevant marking ships to the client.
- **D-055 — Missing-match submissions are rejected, not scored.** Partial credit
  stays honest: a "skip the hard left card" response would otherwise inflate the
  score, so the plugin requires every left card be connected before scoring.
- **D-056 — Interaction semantics live in a pure controller module.** Pointer,
  touch, and keyboard all reduce to the same tested operations, matching the
  Task 4.5 a11y/UX requirements without a DOM test harness.

---

## 28. Files Created / Modified

**Created**
- `src/features/activity-engine/plugins/matching/{plugin.js, matching-controller.js, MatchingActivity.jsx, matching.css, index.js}`
- `src/features/activity-engine/testing/matching.test.js`
- `src/features/game-session/demo/matching-demo-questions.js`
- `schemas/examples/matching/grade9-11-correct-answer.json`
- `reports/12-task-4.5-matching.md`

**Modified**
- `src/features/game-session/service/game-session-service.js` (register matching)
- `src/features/game-session/api/dev-server.js` (seed matching demo content)
- `src/features/game-session/testing/session-service.test.js` (M-series)
- `src/App.jsx` (render matching)
- `schemas/validate.py` (add matching grade9-11 pair; dynamic pair counter)
- `reports/02-development-log.md`, `04-todo.md`, `03-decisions.md`, `README.md`

---

## 29. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas, 71 examples, 11/11 pairs)
npm test                         # 245 pass
npm run lint                     # clean
npm run build                    # client build clean; bundle probes 0 correct-answer hits
```

---

## 30. Bundle Probe After Build

```
dist/assets/index-*.js : matching/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : matching/payload.schema.json       → 0 occurrences
```

---

## 31. Future Work (not in this task)

- Remaining activity plugins (ordering, sorting, fill-complete,
  image-interaction, pattern, memory, scenario-challenge, number-logic) follow
  this same pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production matching authoring tooling + the 2,000-question bank (stage 3.x;
  not created here by design).
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.