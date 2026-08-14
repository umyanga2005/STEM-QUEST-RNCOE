# Task 4.13 — Tenth & Final Production Activity Plugin: Number / Logic Challenge

**Status:** Complete
**Date:** 2026-08-14
**Depends on:** 08-task-3.2-schemas.md (number-logic schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), Task 4.4 `GameSessionService` (safe descriptors + central scoring), and 10–19 (the plugin pattern Number/Logic follows)
**Tests:** 785 total pass (`npm test`), lint clean, production build passes, schema validator passes (24/72/12/12)
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The tenth and **final** production activity plugin from the Task 3.2 catalog is
implemented: **number-logic** — the constructed-entry Number / Logic Challenge.
It completes the activity-engine plugin set; every one of the ten catalogued
activity types now ships as a production 7-method plugin. It follows the
established pattern end-to-end:

- **7-method plugin** (`numberLogicPlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validateNumberLogicAnswer`, the semantic
  port of the catalog rules `number-logic.parts-match` (validate.py
  `_check_pair`) and `number-logic.type-fields`, extended with the invariants
  that make honest scoring possible (answer-format compatibility, ordered
  ranges, valid tolerances, integer fraction components, finite numeric
  fields).
- **Constructed entry, NOT multiple choice.** The student works out the
  value(s) and types them. Six student-facing answer formats are supported:
  `integer`, `decimal`, `fraction`, `percent`, `sequence`, `expression` —
  and seven authored correct-answer types: `exact`, `tolerance`, `range`,
  `fraction`, `percent`, `sequence`, `accepted-set`.
- **A single correctness model across every format.** One atomic value = one
  scorable unit. `exact` = strict `===`; `tolerance` = `|n − value| ≤
  tolerance`; `range` = `min ≤ n ≤ max` (inclusive); `percent` strips one
  optional trailing `%` (the authored value IS the percentage number);
  `fraction` = lowest-term reduction via integer GCD (6/8 == 3/4);
  `sequence` = element-wise comparison with tolerance (one unit per element);
  `accepted-set` = exact, normalized string match of the authored forms
  (**NO eval**). Multiple valid answers are always **explicit** — no fuzzy
  matching, no inferred alternatives.
- **Multi-step challenges with per-part credit.** `payload.parts[]` (2–4)
  defines steps; the correct-answer `parts[]` supplies a per-part spec. Each
  part is scored independently and every part type is supported, so a step can
  be an integer, a fraction, or a sequence. Partial credit = correct units ÷
  required units.
- **`number-logic-controller.js`** — a pure, DOM-free interaction-state module
  (`createNumberLogicState`, `setValue`, `setFraction`, `setSequenceElement`,
  `addSequenceElement`, `removeSequenceElement`, per-part variants, `isComplete`,
  `clear`, `reset`, `buildResponse`) so all response serialization and
  completion gating is unit-tested in Node. It emits exactly the response
  shapes the server validates: `{ value }` / `{ value: "3/4" }` /
  `{ values }` / `{ parts: [{ partId, value }] }`.
- **Strict response-shape gate.** The submission must be exactly one of those
  four shapes with exactly the right keys. Forged fields (`correct`, `score`,
  `correctnessFraction`, `expected`, `accepted`, `correctAnswer`, extra
  per-part fields) are rejected with `ACTIVITY_ANSWER_INVALID` — never
  stripped, never believed.
- **React renderer** (`NumberLogicActivity.jsx`) — single-value / sequence /
  multi-part surfaces, fraction two-input with `/` slash, percent `%` suffix,
  expression text input, dynamic "Add value" sequence slots, a non-scored
  `showWork` scratchpad, hint reveal, Clear, and a Submit gate on `isComplete`;
  `aria-live` announcements, 48px+ touch targets, `:focus-visible`,
  `prefers-reduced-motion`.
- **Integrated into the Game Session service**: `registerNumberLogic` is part
  of `createDefaultServerActivityEngine()`, the demo API seeds number-logic
  demo questions (built from the Task 3.2 fixture files — no new production
  content), and the app shell renders `NumberLogicActivity` for
  `kind === 'number-logic'`.
- **Tenth-type coverage proof.** `SC13` now drives all TEN production activity
  plugins across sessions to 300 each.

Correct-answer data never reaches the client: `render` carries only public
payload content (`problem`, `answerFormat`, `inputMode`, `showWork`, part
`id`/`label`/`answerFormat`). Correctness facts (values, tolerances, ranges,
accepted forms) flow only through `validateAnswer` (server-only).

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method number-logic plugin + `validateNumberLogicAnswer` (catalog port: `parts-match`, `type-fields` + extensions) + `validatePayload` semantic rule + strict response-shape gate | `src/features/activity-engine/plugins/number-logic/plugin.js` |
| 2 | Pure interaction-state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/number-logic/number-logic-controller.js` |
| 3 | React renderer (single/sequence/multi-part surfaces, fraction/percent/expression entry, showWork, completion gate) | `src/features/activity-engine/plugins/number-logic/NumberLogicActivity.jsx` |
| 4 | Plugin styles (mobile-first, a11y) | `src/features/activity-engine/plugins/number-logic/number-logic.css` |
| 5 | Public plugin entry (re-exports + `registerNumberLogic`) | `src/features/activity-engine/plugins/number-logic/index.js` |
| 6 | Plugin unit tests (57 cases, incl. controller + boundary + a11y surface) | `src/features/activity-engine/testing/number-logic.test.js` |
| 7 | Session end-to-end integration tests (NL-series, 10 cases + ten-type coverage) | `src/features/game-session/testing/session-service.test.js` |
| 8 | Number-logic demo content (Task 3.2 fixtures, dev API only, ids 53–55) | `src/features/game-session/demo/number-logic-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | Demo API seeding | `src/features/game-session/api/dev-server.js` |
| 12 | Final report + log/decisions/todo/README updates | `reports/20-task-4.13-number-logic.md` (+ tracking docs) |

Out of scope (unchanged from roadmap): the remaining roadmap items (Admin
panel, Question Builder, production content authoring, leaderboard /
certificate / exhibition UI) — **no further activity plugins exist to build**;
this was the last one.

---

## 3. Plugin Contract Mapping

| Method | Boundary | Number / Logic implementation |
|---|---|---|
| `render` | client | `{ kind, prompt, instructions, problem, answerFormat, inputMode, showWork, parts:[{id,label,answerFormat}] }` — PUBLIC payload content only; never reads `correctAnswer.*` |
| `validatePayload` | authoring | Schema gate then the `number-logic.part-ids-unique` semantic rule |
| `validateAnswer` | server-only | `validateNumberLogicAnswer` cross-document guard, then strict response-shape gate + per-type numeric evaluation (exact/tolerance/range/fraction/percent/sequence/accepted-set) + multi-part validation |
| `scoringInputs` | server-only | correctnessFraction = correctUnits ÷ required (one atomic value = one unit); evidence never carries expected values |
| `buildHints` | client | Authored progressive hints, never derived from the answer |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals expected values |
| `availableOn` | client | Default available; `featureFlags['number-logic'] = false` opts out |

---

## 4. Domain Model

- `payload.problem` — the authored challenge (1–300 chars).
- `payload.answerFormat` — `integer | decimal | fraction | percent |
  sequence | expression` (the student-facing format; also drives the renderer
  surface and the controller's completion gate).
- `payload.inputMode` — `numeric | text` (default `numeric`); `expression`
  answers use `text`.
- `payload.showWork` — boolean (default `true`): offers a **non-scored**
  scratchpad in the renderer. The scratchpad is never submitted.
- `payload.parts[]` — optional multi-step parts (2–4), each
  `{ id, label, answerFormat }` (public metadata; per-part credit).
- `correctAnswer.type` — `exact | tolerance | range | fraction | percent |
  sequence | accepted-set`.
- `correctAnswer.value` — central value for exact/tolerance/percent.
- `correctAnswer.tolerance` — absolute tolerance (`|n − value| ≤ tolerance`).
- `correctAnswer.min` / `correctAnswer.max` — inclusive range bounds.
- `correctAnswer.numerator` / `correctAnswer.denominator` — fraction; lowest
  term via integer GCD, denominator sign normalized positive.
- `correctAnswer.values[]` (2–12) — sequence; element-wise comparison with
  `tolerance`.
- `correctAnswer.accepted[]` (1–8) — accepted-set: normalized string forms
  (expression answers; NO eval).
- `correctAnswer.parts[]` — multi-step: per-part `{ partId, type, … }`.

The answer model is a **schema-gated `correctAnswer` document** (server-only,
Task 3.2). There is NO student-response schema — the plugin owns the response
contract (`{ value }` / `{ values }` / `{ parts: [{ partId, value }] }`).

---

## 5. Answer Format × Correct-Answer Type Compatibility

The payload's `answerFormat` says what the student types; the correct-answer
`type` says how the server scores it. They must be **representable together**
(author-time integrity, §7). The `COMPATIBLE_TYPES` map:

| payload.answerFormat | valid correctAnswer.type(s) |
|---|---|
| `integer` / `decimal` | `exact`, `tolerance`, `range` |
| `percent` | `percent`, `exact`, `tolerance`, `range` |
| `fraction` | `fraction` |
| `sequence` | `sequence` |
| `expression` | `accepted-set` |

An incompatible pairing (e.g. `fraction` with `integer`, `accepted-set` with
`percent`) is an authoring bug → `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.

---

## 6. Correctness Model (one atomic value = one unit)

- **exact** — strict numeric equality after parse: `n === value`.
- **tolerance** — `|n − value| ≤ tolerance` exactly (no rounding).
- **range** — `min ≤ n ≤ max` inclusive (validated `min ≤ max` at author time).
- **percent** — `parsePercentValue` strips **one** optional trailing `%` (and
  surrounding whitespace); the authored `value` IS the percentage number, so a
  student typing `50` or `50%` both match `value: 50`.
- **fraction** — `parseFractionString("a/b")` requires two integer parts; both
  are reduced by their integer GCD to lowest terms with the denominator sign
  normalized positive. `6/8`, `30/40`, `-3/-4` all match `3/4`; `3/-4`,
  `0.75`, `3`, `3/0` do not (non-integer / non-fraction input is rejected, not
  scored).
- **sequence** — the response `{ values: [...] }` is compared **element-wise**
  with `tolerance` (default 0). A wrong element count is rejected
  (`ACTIVITY_ANSWER_INVALID`). One scorable unit per element → partial credit
  (2 of 3 correct = 2/3).
- **accepted-set** — `normalizeExpression` (trim + collapse internal
  whitespace) then exact string match against the authored `accepted[]` forms.
  `"x^2"` and `"  x^2  "` match; `"x ^ 2"` does not. **No `eval`, no fuzzy
  matching.**

**Multi-part:** each part is evaluated independently with its own type; the
top-level `type`/`value` on a multi-part correct-answer document is ignored
for scoring (only the parts are scored — the Task 3.2 `partial-credit.json`
fixture carries both and is valid). A sequence part contributes one unit per
element.

**Partial credit** = correctUnits ÷ required (D-041/D-047). The plugin never
computes a final score; the Central Scoring Service applies base points,
attempt/hint deductions, and rounds.

---

## 7. Semantic Rules

### 7.1 `validatePayload` — authoring-time (payload only)

- `number-logic.part-ids-unique` — multi-part payloads must not repeat a part
  `id`.

(Schema-level shape is enforced by the AJV gate before the plugin runs.)

### 7.2 `validateNumberLogicAnswer` — cross-document integrity (server-only)

Catalog ports:

- `number-logic.parts-match` — multi-part payload ⟺ per-part correct answer
  (the validate.py `_check_pair` rule); answer part ids must exactly match
  payload part ids (no unknown, missing, or duplicate `partId`).
- `number-logic.type-fields` — each type requires its fields (`range` needs
  `min` + `max`; `tolerance` needs `value` + `tolerance`; `exact`/`percent`
  need `value`; `fraction` needs `numerator` + `denominator`; `sequence` needs
  `values`; `accepted-set` needs `accepted`).

Extensions that make honest scoring possible:

- `number-logic.answer-format-compatible` — §5 map (solution representable by
  the payload's answerFormat).
- `number-logic.range-ordered` — `min ≤ max` (top-level and per part).
- `number-logic.tolerance-valid` — `tolerance ≥ 0` and finite.
- `number-logic.fraction-integer-components` — non-integer fraction components
  are authoring bugs (lowest-term normalization requires integers).
- `number-logic.accepted-nonblank` — every accepted form must be non-blank
  after normalization.
- `number-logic.sequence-values-valid` — sequence values must be finite
  numbers.
- `number-logic.numeric-fields-finite` — all authored numeric fields finite.

Any inconsistency → `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`, thrown **before** the
response is evaluated (the server refuses to score against an author-broken
document).

---

## 8. Interaction Controller (DOM-free)

`number-logic-controller.js` — pure, side-effect-free state module:

- `createNumberLogicState({ answerFormat, parts })` — single vs multi surface.
- Single: `setValue`, `setFraction` (num + den), `setSequenceElement`,
  `addSequenceElement` / `removeSequenceElement` (dynamic slots, cap 12),
  percent keeps the raw number (`%` is a renderer suffix).
- Multi: `setPartValue`, `setPartFraction`, `setPartSequenceElement`,
  `addPartSequenceElement` / `removePartSequenceElement` keyed by `partId`.
- `isComplete` — fraction needs numerator + denominator non-blank; sequence
  needs ≥ 2 non-blank elements; a multi-part surface is complete when every
  part is complete.
- `clear` / `reset`, and `buildResponse` → `{ value }` / `{ value: "3/4" }` /
  `{ values: ["2","4"] }` / `{ parts: [{ partId, value }] }` (sequence parts
  comma-joined: `"2, 4"`).

The controller owns interaction ONLY — it never contains correct-answer data,
tolerances, ranges, correctness flags, or scores. Invalid interactions
(wrong format for the surface, unknown partId, non-string input) are no-ops.

---

## 9. `validateAnswer` Behavior

Pipeline (server-only):

1. **Cross-document integrity** (`validateNumberLogicAnswer`, §7.2) — authoring
   inconsistencies throw `ACTIVITY_PAYLOAD_SEMANTIC_INVALID` before any
   response is touched.
2. **Strict response-shape gate** — the parsed response must be exactly one of
   `{ value }`, `{ values }`, `{ parts }`. More than one key, unknown keys,
   arrays where strings are expected, forged correctness/score/expected/
   accepted/correctAnswer fields, and wrong shapes (single vs multi vs
   sequence) are all rejected with `ACTIVITY_ANSWER_INVALID`. The response
   shape must match the answer type: sequence answers must arrive as
   `{ values }`, everything else as `{ value }`.
3. **Multi-part validation** — every payload part answered exactly once;
   unknown/duplicate/missing `partId` rejected; per-part `value` parsed by its
   own type (fraction parts need `"a/b"`, sequence parts need `"2, 4, 6"`).
4. **Per-unit evaluation** (§6) → `{ correct, detail: { mode, answerType,
   required, correctUnits, units[] } }`.

`scoringInputs` reads the `detail` (required/correctUnits), never re-evaluates,
and emits evidence with `correct` flags + submitted values only — the expected
values are never in evidence.

---

## 10. React Renderer

`NumberLogicActivity.jsx` — zero-dependency, mobile-first:

- Single surface: numeric/text input (`inputMode` honored for numeric),
  fraction two-input with `/` separator, percent suffix `%`, expression text
  input.
- Sequence surface: dynamic `values` list with **Add value** / per-slot
  Remove (cap 12), completion requires ≥ 2 filled slots.
- Multi-part surface: a card per part (label + its own surface/format).
- Non-scored `showWork` scratchpad (`textarea`), hints (authored, revealed on
  demand), **Clear**, and **Submit** gated on `isComplete`.
- Accessibility: labelled inputs, real buttons, `aria-live` announcements for
  add/remove/submit, progress text, `:focus-visible`, 48px+ targets, and
  `prefers-reduced-motion` (CSS). All state flows through the DOM-free
  controller (`useState` mirroring `createNumberLogicState`).

---

## 11. Schema/Type Naming Boundary

No alias was needed this time: the schema registry (`PAYLOAD_SCHEMAS` /
`CORRECT_ANSWER_SCHEMAS`) already exposes the number-logic schema under the
key `number-logic` (matching the plugin type), unlike the `scenario` ↔
`scenario-challenge` alias introduced in Task 4.12 (D-072). The plugin's
`schemaVersion` resolves to the number-logic contract; the AJV schema gate
rejects invalid payloads/correct-answers before the plugin runs (proved by a
boundary test that feeds `invalidCorrectAnswer.json`).

---

## 12. Tests

### 12.1 Number-logic plugin suite — `number-logic.test.js` (57 tests)

Registration + 7-method contract; duplicate-type rejection; render
descriptor (public-only, `parts` metadata, `showWork`/`inputMode` defaults,
no correct-answer fields); `validatePayload` (valid + `part-ids-unique` +
engine schema gate); `validateNumberLogicAnswer` for all 9 cross-doc rules;
numeric helpers (`parseNumericValue`, `parsePercentValue`, `reduceFraction`,
`parseFractionString`); the full controller surface (single/fraction/
sequence/multi-part, completion gates, serialization, no-op invalid
interactions); `validateAnswer` for every answer type (exact coercion,
tolerance boundary, range inclusivity, percent `%` handling, fraction
equivalents + malformed rejection, sequence element-wise + per-element partial
credit + count mismatch rejection, accepted-set exact matching); multi-part
full/partial/structural failures across fraction + sequence + exact parts
(required = 5, 3-of-5 partial); strict shape gate incl. forged fields and the
engine's `SECURITY_CORRECT_ANSWER_EXPOSED` for a forged `correctAnswer`;
non-finite rejection; authoring-integrity → `SEMANTIC_INVALID`;
schema-invalid correct-answer never reaches the plugin; `scoringInputs`
(full/partial/zero, evidence without expected values); `buildHints`;
`feedback` (correct/partial/incorrect/timeout, no leaks); `availableOn`;
client/server boundary (no server-only methods, render context rejects
correctAnswer data, forged correctness keys rejected); a11y/CSS surface probe.

### 12.2 Session-service NL-series — 10 integration tests

`NL1` safe descriptor end-to-end; `NL2` multi-step descriptor exposes part
metadata only; `NL3` exact-integer full credit (100); `NL4` fraction
equivalents (6/8) + percent `%` form score 100 through the service; `NL5`
multi-step per-step partial credit (1 of 2 → 50); `NL6` sequence per-element
partial credit (2 of 3 → 67); `NL7` accepted-set exact matching over HTTP
pipeline (x^3 rejected); `NL8` malformed answers rejected by the engine
through the service; `NL9` forged `correctnessFraction`/`score` ignored;
`NL10` all-number-logic pool runs to 300 with per-round safe descriptors.

### 12.3 SC13 — now **ten-type** coverage

SC13 was extended from nine to ten production plugins with a fourth
deterministic group (`[number-logic, number-logic, drag-drop]`), asserting
every session reaches 300 and the union of covered types is all ten.

### 12.4 Full suite

`npm test` — **785 tests pass / 0 fail** (2 consecutive full runs):

| Suite | Tests |
|---|---|
| `activity-engine/testing/engine.test.js` | 37 |
| `activity-engine/testing/drag-drop.test.js` | 37 |
| `activity-engine/testing/sorting.test.js` | 52 |
| `activity-engine/testing/matching.test.js` | 54 |
| `activity-engine/testing/ordering.test.js` | 54 |
| `activity-engine/testing/fill-complete.test.js` | 57 |
| `activity-engine/testing/image-interaction.test.js` | 71 |
| `activity-engine/testing/pattern.test.js` | 66 |
| `activity-engine/testing/memory.test.js` | 62 |
| `activity-engine/testing/scenario-challenge.test.js` | 59 |
| `activity-engine/testing/number-logic.test.js` | **57** (new) |
| `activity-engine/testing/security.test.js` | 15 |
| `game-session/testing/session-service.test.js` | **120** (+10 NL, SC13 10-type) |
| `game-session/testing/central-scoring.test.js` | 18 |
| `game-engine/testing/selection.test.js` | 13 |
| `game-engine/testing/session.test.js` | 13 |
| **Total** | **785** |

Game-session suite verified **5×120/120 consecutive** runs. Validator
PASS 24/72/12/12. Lint clean. Build clean (dist JS 273.95 kB / gzip 79.37 kB).

---

## 13. Files

Created:

- `src/features/activity-engine/plugins/number-logic/number-logic-controller.js`
- `src/features/activity-engine/plugins/number-logic/plugin.js`
- `src/features/activity-engine/plugins/number-logic/index.js`
- `src/features/activity-engine/plugins/number-logic/NumberLogicActivity.jsx`
- `src/features/activity-engine/plugins/number-logic/number-logic.css`
- `src/features/activity-engine/testing/number-logic.test.js`
- `src/features/game-session/demo/number-logic-demo-questions.js`
- `reports/20-task-4.13-number-logic.md` (this report)

Modified:

- `src/features/game-session/service/game-session-service.js` —
  `registerNumberLogic(engine)` in `createDefaultServerActivityEngine()`.
- `src/features/game-session/api/dev-server.js` — seeds `demoNumberLogicQuestions()`.
- `src/App.jsx` — renders `NumberLogicActivity` for `kind === 'number-logic'`.
- `src/features/game-session/testing/session-service.test.js` — NL-series (10)
  + SC13 extended to ten-type coverage.
- `reports/README.md`, `reports/02-development-log.md`, `reports/04-todo.md`,
  `README.md`, `reports/03-decisions.md` (this task — D-074 percent/fraction/
  sequence numeric model, D-075 multi-part parts-only scoring surface;
  continued after D-073).

No schema files were changed; no new packages; no Supabase changes; no changes
to selection, scoring, or persistence.

---

## 14. Commands Executed

```
python3 schemas/validate.py                      # PASS 24/72/12/12
npm test                                         # 785 pass / 0 fail (x2)
npm run lint                                     # clean
npm run build                                    # clean (dist JS 273.95 kB)
node --test src/features/activity-engine/testing/number-logic.test.js   # 57/57
node --test src/features/game-session/testing/session-service.test.js   # 120/120
for i in 1..5: node --test ...session-service.test.js                   # 5×120/120
node /tmp/opencode/nl-http-smoke.mjs             # real HTTP, number-logic-only
node /tmp/opencode/nl-mixed-smoke.mjs            # real HTTP, 10-type mixed
```

---

## 15. Bundle Probe After Build

`dist/assets/index-*.js` + `dist/assets/index-*.css`:

- `number-logic/correct-answer.schema.json` → **0** occurrences.
- No `correct-answer.schema.json` reference of any type in the client bundle.
- Demo content strings (id 53–55 problems) → **0** occurrences (demo modules
  are dev-server-only; correct answers stay server-side).

The client bundle only contains the renderer (`kind: 'number-logic'`) and its
styles. The client facade exposes no `validateAnswer` / `scoringInputs` /
`feedback` / `getCorrectAnswerSchema`.

---

## 16. Demo API Smoke Test (real HTTP)

Two self-contained one-shot socket scripts over a real `node:http` server
(`x-student-id` header, in-memory repos, no Supabase):

**Number-logic-only pool** (`nl-http-smoke.mjs`) — pool = the 3 demo
number-logic questions (53 exact-integer, 54 fraction, 55 multi-part):
- Optimal session: every round `correct: true`, 100 pts, fraction 1.0 →
  **300/300**.
- Wrong session: every round `correct: false`, 0 pts → **0/0**.
- Per-round descriptors and feedback checked for `correctAnswer`,
  `partial-credit`, and `"correct"` leakage.

**Mixed 10-activity smoke** (`nl-mixed-smoke.mjs`) — pool holds one question
per production activity (all ten types; the ordering fixture is supplied
inline exactly as SC13 does, since ordering has no demo question). Ran
sessions until all ten types were exercised over real HTTP: **8 mixed sessions
(3 rounds each, every round fully correct, all reaching 300)**, every session
mixed (≥2 distinct types), number-logic rounds present, no correct-answer
leakage.

Both smokes: `SMOKE PASS`.

---

## 17. Known Limitations

- **No schema example coverage for every type.** The Task 3.2 fixtures cover
  `integer` (exact), `fraction`, and multi-part `decimal`. The `percent`,
  `sequence`, and `expression` (accepted-set) answer types are exercised by
  self-consistent inline fixtures in the session tests and the HTTP smoke
  (exactly the SC13/ordering precedent). No schema files were changed.
- **Accepted-set is exact-match only.** Internal spacing is significant
  (`x ^ 2` ≠ `x^2`); no tolerance or "closeness" is applied to expressions —
  by design (D-041/authoring explicitness). If a problem's accepted forms vary
  in spacing, the author lists them.
- **`showWork` is non-scored by design** (D-041): the scratchpad is a learning
  surface, never evaluated.

---

## 18. Roadmap (NOT started — task ends here)

With the tenth plugin complete, the activity-engine plugin set is finished.
The remaining roadmap items (Admin panel, Question Builder UI, production
question content authoring, leaderboards, badges/certificates,
responsive/exhibition polish) are **not** part of this task and were not
started.