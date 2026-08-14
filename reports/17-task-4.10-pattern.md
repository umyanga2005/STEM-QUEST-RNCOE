# Task 4.10 — Seventh Production Activity Plugin: Pattern

**Status:** Complete
**Date:** 2026-08-14
**Depends on:** 08-task-3.2-schemas.md (pattern schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), Task 4.4 `GameSessionService` (safe descriptors + central scoring), and 10–16 (the plugin pattern Pattern follows)
**Tests:** 577 total pass (`npm test`, 2 consecutive full runs + 5× game-session stability), lint clean, production build passes, schema validator passes
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The seventh production activity plugin is implemented: **pattern** — the
sequence-reasoning activity from the Task 3.2 catalog (construct-next /
fill-missing / complete-sequence). Like its predecessors it is a
**point-based** (not multiple-choice) plugin and mirrors the
drag-drop/matching/ordering/sorting/fill-complete/image-interaction pattern
end-to-end:

- **7-method plugin** (`patternPlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validatePatternAnswer`, the semantic port
  of the catalog rule `pattern.acceptable-ids-exist`, extended with the
  invariants that make scoring honest (attainable construct counts, single
  value for numeric/text answers, ordered ranges, non-blank accepted values).
- **Three interaction modes.** `construct-next` — the student constructs the
  NEXT `constructCount` elements (1..3) of the sequence; `fill-missing` — ONE
  hidden element at `missingAt` is supplied; `complete-sequence` — the NEXT
  element is appended. The answer is expressed EITHER by selecting candidate(s)
  from the construction bank OR by typing a value; the two paths are mutually
  exclusive.
- **Multiple valid solutions are explicit.** `correctAnswer.acceptableIds` is
  a **set**: any acceptable candidate earns full credit for its position(s)
  (D-069). No fuzzy matching, no inferred alternative rules — only explicitly
  authored acceptable answers are valid. Partial credit =
  correct answer units ÷ required units (`constructCount` for construct-next,
  else 1), reported as facts for the Central Scoring Service (D-041).
- **`pattern-controller.js`** — a pure, DOM-free interaction state module
  (selection toggling with replace-when-full semantics for multi-unit modes,
  typed entry, mutually exclusive paths, completion gate, response
  serializer) so the interaction rules are unit-tested in Node.
- **React renderer** (`PatternActivity.jsx`) — the sequence drawn as a row of
  cells with the hidden/trailing answer slots, a real-button candidate bank,
  native number/text entry when the answer is a single element and every
  candidate is typable, an `aria-live` counter, hint reveal, Clear, and a
  submit gate on `isComplete`.
- **Integrated into the Game Session service**: `registerPattern` is part of
  `createDefaultServerActivityEngine()`, the demo API seeds pattern demo
  questions (built from the Task 3.2 fixture files — no new production
  content), and the app shell renders `PatternActivity` for
  `kind === 'pattern'`.

The submitted response is `{ selected: [candidateIds] }` (candidate path) or
`{ value }` (typed path). Correct-answer data never reaches the client: the
descriptor carries the visible sequence, the mode, and the public candidate
bank only — which candidate/value is correct is never revealed (§5).

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method pattern plugin + `validatePatternAnswer` (catalog port) + 4 `validatePayload` semantic rules + 5 cross-document integrity rules + strict response-shape gate | `src/features/activity-engine/plugins/pattern/plugin.js` |
| 2 | Pure interaction state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/pattern/pattern-controller.js` |
| 3 | React renderer (3 modes, candidate bank + native entry) | `src/features/activity-engine/plugins/pattern/PatternActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/pattern/pattern.css` |
| 5 | Public plugin entry (re-exports + `registerPattern`) | `src/features/activity-engine/plugins/pattern/index.js` |
| 6 | Plugin unit tests (66 cases, incl. controller + boundary) | `src/features/activity-engine/testing/pattern.test.js` |
| 7 | Session end-to-end integration tests (PA-series, 8 cases) | `src/features/game-session/testing/session-service.test.js` |
| 8 | Pattern demo content (Task 3.2 fixtures, dev API only) | `src/features/game-session/demo/pattern-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | Demo API seeding | `src/features/game-session/api/dev-server.js` |
| 12 | Final report | `reports/17-task-4.10-pattern.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity types (memory,
scenario-challenge, number-logic), production question authoring (none created
here), and the mode-aware registry that would strip server-only method source
from client bundles (recorded as future work, §17).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Pattern implementation |
|---|---|---|
| `render` | client | `{ kind, prompt, instructions, interaction, missingAt?, constructCount?, units, sequence[{id,number,text,shape,imageRef,ariaLabel}], candidates[...] }` — **never** reads `correctAnswer.*` |
| `validatePayload` | authoring | Schema gate then 4 semantic rules (§6) |
| `validateAnswer` | server-only | `validatePatternAnswer` cross-document guard, then strict response-shape gate + per-mode / per-type candidate / numeric / text evaluation |
| `scoringInputs` | server-only | correctnessFraction = correctUnits ÷ required; evidence never carries the acceptable ids/values |
| `buildHints` | client | Authored progressive hints, never derived from the answer |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals the acceptable answer |
| `availableOn` | client | Default available; `featureFlags['pattern'] = false` opts out |

---

## 4. Domain Model

- `payload.sequence[]` — 3..8 visible elements `{ id, text?|number?|shape?|image?,
  ariaLabel? }` (the pattern the student reasons about).
- `payload.interaction` — `construct-next | fill-missing | complete-sequence`.
- `payload.missingAt` — fill-missing only: the index of the hidden element.
  The hidden element is **`sequence[missingAt]`** — the student supplies the
  value that belongs at that slot (D-068).
- `payload.constructCount` — construct-next only: how many NEXT elements the
  student must construct (1..3).
- `payload.candidates[]` — 2..8-element construction bank (required for every
  mode by the schema). It is a meaningful bank, not an MCQ: the student
  constructs the sequence from it.
- `correctAnswer.type` — `candidate | numeric | text` (the answer type is
  server-only, never exposed to the renderer).
- `correctAnswer.acceptableIds[]` — candidate: the acceptable candidate ids
  (MULTIPLE VALID SOLUTIONS are explicit — any acceptable id earns full
  credit for its position).
- `correctAnswer.value`/`tolerance`|`min`/`max` — numeric: exact ± tolerance,
  or a closed range.
- `correctAnswer.accepted[]` — text: accepted strings (trim + case-fold match).
- `correctAnswer.rule` — optional human-readable rule (feedback only).

Pattern is **sequence reasoning**: answer units = `constructCount` for
construct-next, else 1. Scoring is **exact-response** per unit (D-069): a
submitted candidate is correct iff its id is in `acceptableIds`; a typed
value resolves to the candidate(s) that display it (numeric compare / text
compare) and is rejected if it matches none or more than one — no silent
coercion.

---

## 5. Render Security (D-021)

`render` never reads `correctAnswer`. The descriptor carries the visible
sequence, the mode, and the **public** candidate bank (inherently
student-facing), plus the public `missingAt`/`constructCount` slot markers the
renderer needs to build the sequence surface. Which candidate/value is
CORRECT is never revealed — `render` never touches `acceptableIds`, `accepted`,
`value` or `tolerance`. Since an answer slot may be left unfilled, the
submit-gate `isComplete` is deliberately generous but **not** correctness
aware (§9). Verified: the built client bundle contains 0 occurrences of the
pattern correct-answer schema `$id` and the client facade exposes no
server-only methods (§14, covered by the pattern tests).

---

## 6. Semantic Rules

### 6.1 `validatePayload` — authoring-time (payload only)

| Rule | Purpose |
|---|---|
| `pattern.sequence-ids-unique` | sequence element ids unique by value (the schema's `uniqueItems` is shallow deep-equality) |
| `pattern.candidate-ids-unique` | candidate ids unique by value |
| `pattern.sequence-candidates-disjoint` | a candidate id must never collide with a sequence element id |
| `pattern.fill-missing-missing-at-in-range` | `missingAt` must be inside the actual sequence (the schema bound 0..7 is sequence-length independent) |

### 6.2 `validatePatternAnswer` — cross-document integrity (server-only)

Port of the catalog rule `pattern.acceptable-ids-exist`
(`schemas/validate.py` `_check_pair`, pattern) plus the invariants that make
scoring honest:

- `pattern.acceptable-ids-exist` — every acceptable id must exist among the
  payload candidates; fill-missing `missingAt` must be in range;
- `pattern.construct-count-attainable` — a candidate-type construct-next
  answer must offer ≥ `constructCount` acceptable ids, else full credit is
  impossible;
- `pattern.construct-next-single-value` — a numeric/text answer is a single
  value and cannot serve a construct-next with `constructCount > 1`;
- `pattern.numeric-range-valid` — a `(min, max)` range must be ordered;
- `pattern.accepted-values-nonblank` — accepted text values must be non-blank
  after trimming.

A schema-valid but semantically inconsistent answer document throws
`ACTIVITY_PAYLOAD_SEMANTIC_INVALID` (an author bug, never a student mistake).

---

## 7. Interaction Controller (DOM-free)

`pattern-controller.js` exposes pure functions consumed by the renderer:

- `normalizeTextAnswer` / `parseNumericValue` — the project's normalization
  primitives (trim + case-fold; strict finite-number parsing).
- `createPatternState({ interaction, sequence, candidates, constructCount })`
  → `{ interaction, units, selected: [], value: null, … }`. `units` is
  `constructCount` for construct-next, else 1.
- Candidate path: `selectCandidate` (toggle; unknown id no-op; single-unit
  replace; multi-unit append up to `units` then replace the most recent;
  selecting clears any typed value), `deselectCandidate`, `clearSelection`,
  `selectedIds`, `requiredUnits`.
- Typed path: `setValue` (string only; clears the selection), `getValue`.
- `isComplete` (submit gate: all units selected OR a non-blank typed value —
  never correctness-aware), `clear` / `reset`, and `buildResponse` →
  `{ selected: [...] }` or `{ value: trimmed }` — the exact shapes the server
  validates.

No correctness information ever lives in controller state.

---

## 8. `validateAnswer` Behavior

- **Authoring-integrity:** `validatePatternAnswer` failures throw
  `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
- **Strict response-shape gate:** the submission is EITHER
  `{ selected: [ids] }` or `{ value }`. Both, neither, malformed arrays,
  unexpected top-level fields, non-string/duplicate ids, and non-finite
  numbers are rejected with `ACTIVITY_ANSWER_INVALID` — a forged or malformed
  response is never coerced into a valid one (D-070).
- **Candidate type:** each submitted id must be a known candidate, no
  duplicates, exactly `units` ids; a submitted candidate is correct iff its id
  is in `acceptableIds`. The typed path resolves the value to the
  candidate(s) that display it — matching no candidate or more than one is
  rejected. `correct` = all units correct; `detail.submitted` carries a
  per-unit `{ id, correct }` flag.
- **Numeric type:** single value; exact ± tolerance or closed range; non-finite
  values rejected. A selected candidate is evaluated through its numeric value.
- **Text type:** single value; trim + case-fold exact match against
  `accepted`; blank values rejected.

**Normalization is exact (D-063/D-069):** candidate identity is a set
membership test; numeric/text matches are literal — never fuzzy, never
inferred.

---

## 9. React Renderer

`PatternActivity.jsx` consumes only the client-safe descriptor:

1. **Sequence surface** — the sequence is drawn as a row of cells
   (number / text / shape glyph / image). One or more cells are the student's
   answer slots: the hidden slot at `missingAt` (fill-missing) or trailing
   slots (construct-next `constructCount`, complete-sequence 1). Filled slots
   show the selected candidate's value or the typed value.
2. **Candidate bank** — real buttons; tapping toggles selection (single-unit
   replaces, multi-unit appends up to `units`), the slot(s) fill in selection
   order.
3. **Native entry** — offered only when the answer is a single element and
   every candidate is typable (number/text): a number or text input that
   switches to the typed path. Typing and picking are mutually exclusive.
4. **Progress** — `aria-live` "n of m supplied" counter; hint reveal; Clear;
   Submit gates on `isComplete` and sends
   `{ response, interactionMetrics: { attemptsUsed, hintsUsed, timeTakenSec } }`.

Accessibility: real button targets, screen-reader announcements via
`aria-live`, focal `:focus-visible` states, `44px+` touch targets, and a
`prefers-reduced-motion` media query. `pattern.css` is mobile-first.

---

## 10. Fill-Missing Fixture Caveat (D-068)

The Task 3.2 fixture `valid-payload-grade9-11.json` hides `sequence[2]` of
`[1, 4, 9]` — the THIRD element (9, the square numbers 1², 2², 3²). The paired
`partial-credit.json` answer (`numeric, value 16, tolerance 0`) is the NEXT
term after the hidden slot, which does **not** match the hidden element. This
is an authored inconsistency in the example (the schema permits it; the engine
scores the authored numeric answer as authored). This task implements the
schema-literal reading — **the hidden element is `sequence[missingAt]`** —
and documents the fixture caveat. The demo and the PA-series use a
self-consistent answer (numeric `9`) for that payload. No schema change was
made or needed.

---

## 11. Tests

### 11.1 Pattern plugin suite — `pattern.test.js` (66 tests)

- Registration + contract shape (7 methods), `registerPattern` helper,
  coexistence / duplicate rejection.
- Render descriptor: no correct-answer keys; construct-next / fill-missing /
  complete-sequence / multi-unit / image-ref mappings; safe defaults.
- `validatePayload`: 4 semantic rules + schema-layer failures (invalid payload
  fixture).
- `validatePatternAnswer`: consistent pairs, unknown acceptable id, unattainable
  construct count, numeric/text multi-element construction, missingAt range,
  numeric range ordering, non-blank accepted values, engine-level author-bug
  rejection.
- Controller: normalization helpers, state/units, single-unit replace, multi-unit
  append/replace/toggle, mutual exclusivity, completion gates, clear/reset,
  `buildResponse` serialization.
- `validateAnswer`: candidate full/wrong/typed/zero credit in all three modes,
  multiple-valid-solutions full credit, unit-count mismatch, duplicate/unknown
  selections, numeric exact/tolerance/range + non-finite rejection, text
  trim/case-fold, blank rejection, strict response-shape gate, forged-field
  rejection.
- `scoringInputs`: 1.0 / 0.5 / 0.0, scorableUnits, evidence never carries the
  acceptable set.
- `buildHints`, `feedback` (correct/partial/incorrect/timeout, no leaks),
  `availableOn` (default, flag opt-out).
- Client facade boundary (no server-only methods/engine methods).
- Accessibility contract surface + stylesheet presence.

### 11.2 Session-service PA-series — 8 integration tests

- `PA1` safe pattern descriptor end-to-end (kind, interaction, units, sequence,
  candidates, no acceptableIds).
- `PA2/PA3` no correctAnswer, acceptable ids or accepted values reach the client.
- `PA4` fully-correct pattern submission → 100 round score.
- `PA5` partial (1 of 2 constructed units) → correctnessFraction 0.5,
  pointsEarned 50.
- `PA6/PA7` forged correctnessFraction/score ignored by the server.
- `PA8` malformed answers (`{ selected }` + `{ value }`) rejected through the
  service.
- `PA9` mixed drag-drop + pattern session runs to completion (0–300).
- `PA10` all-pattern pool (all three modes) runs to completion with per-round
  safe descriptors.

### 11.3 Full suite

`npm test` → **577 tests, 577 pass, 0 fail** (2 consecutive full runs).
Breakdown:

| Suite | File(s) | Tests |
|---|---|---|
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
| Session service | `session-service.test.js` | 90 |

Game-session suite stability: 5 consecutive runs, 90 each run, 0 failure.

---

## 12. Files

**Created**
- `src/features/activity-engine/plugins/pattern/plugin.js`
- `src/features/activity-engine/plugins/pattern/pattern-controller.js`
- `src/features/activity-engine/plugins/pattern/PatternActivity.jsx`
- `src/features/activity-engine/plugins/pattern/pattern.css`
- `src/features/activity-engine/plugins/pattern/index.js`
- `src/features/activity-engine/testing/pattern.test.js`
- `src/features/game-session/demo/pattern-demo-questions.js`
- `reports/17-task-4.10-pattern.md`

**Modified**
- `src/features/game-session/service/game-session-service.js` (register pattern
  in the default engine)
- `src/features/game-session/api/dev-server.js` (seed pattern demo questions)
- `src/features/game-session/testing/session-service.test.js` (PA-series: 8
  integration tests)
- `src/App.jsx` (render `PatternActivity` for `kind === 'pattern'`)
- `reports/README.md`, `reports/04-todo.md`, `reports/03-decisions.md`,
  `reports/02-development-log.md`

**Packages installed:** none.
**Configuration changes:** none.
**Schema/Supabase changes:** none.

---

## 13. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas meta-valid, 72 examples, 12/12 pairs)
npm test                         # 577 pass / 0 fail (2 consecutive full runs)
npm run lint                     # clean (0 warnings / 0 errors)
npm run build                    # client build clean; bundle probes 0 correct-answer hits
```

Game-session suite stability — 5 consecutive runs, 90/90 each.

---

## 14. Bundle Probe After Build

```
dist/assets/index-*.js : activities/pattern/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : activities/pattern/payload.schema.json        → 0 occurrences
dist/assets/index-*.js : acceptableIds (as a descriptor key)           → absent from any descriptor
dist/assets/index-*.js : "accepted": (as a descriptor key)             → 0 occurrences
```

The single `acceptableIds` string in the bundle is the authoring-error message
text from the server-only integrity rule (a term, not data) — the correct-answer
schema and any descriptor key are excluded.

---

## 15. Demo API Smoke Test (real HTTP)

A one-shot socket smoke run (self-contained script) started the dev API server
on an ephemeral port, constrained the pool to the three pattern demo questions,
then drove a full session over `fetch`:

```
health: 200 true
round 1 (pattern): -> next
round 2 (pattern): -> next
round 3 (pattern): -> done
finish: 200 score: 300 types: pattern rounds: 3
SMOKE PASS
```

Every round descriptor was verified to contain no `correctAnswer` /
`acceptableIds` / `accepted` keys, and the greedy-correct submission scored
`correct: true` on every round.

---

## 16. Known Limitations

- The Task 3.2 fill-missing fixture's authored answer (`16`) is the next-term
  after the hidden slot rather than the hidden element's value (`9`); this
  task implements the schema-literal "hidden element = `sequence[missingAt]`"
  reading and uses self-consistent answers in the demo/tests (D-068). No
  schema change was made.
- A browser rendering harness is not present; interaction rules are covered by
  the DOM-free controller tests (same trade-off as the previous plugins).

---

## 17. Future Work (not in this task)

- Remaining activity plugins (memory, scenario-challenge, number-logic)
  following the same pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production pattern authoring tooling + the 2,000-question bank (stage 3.x;
  not created here by design).
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.
