# Task 4.8 — Fifth Production Activity Plugin: Fill & Complete

**Status:** Complete
**Date:** 2026-08-14
**Depends on:** 08-task-3.2-schemas.md (fill-complete schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), Task 4.4 `GameSessionService` (safe descriptors + central scoring), and 12-task-4.5-matching.md / 13-task-4.6-ordering.md / 14-task-4.7-sorting.md (the plugin pattern Fill & Complete follows)
**Tests:** 423 total pass (`npm test`, 2 consecutive full runs), lint clean, production build passes, schema validator passes
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The fifth production activity plugin is implemented: **fill & complete** —
the blank-completion activity (its Task 3.2 correct-answer contract is
`answers`/`numeric`/`expression`; it is **not** a multiple-choice plugin).
Built against the Task 4.1 engine contract and the Task 3.2 fill-complete
schema contract, it mirrors the drag-drop/matching/ordering/sorting plugin
pattern end-to-end:

- **7-method plugin** (`fillCompletePlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validateBlankAnswers`, the cross-document
  semantic port of the catalog rule `fill-complete.blanks-referenced`.
- **`fill-complete-controller.js`** — a pure, DOM-free interaction state
  module (create → set → get → clear → reset → coverage gate → response
  serializer) so the fill-state rules are unit-tested in Node.
- **React renderer** (`FillCompleteActivity.jsx`) — the authored `template`
  is split on `___` placeholders; each blank gets a native input typed to its
  kind (plain text / `inputMode="decimal"` number / expression), prefix/suffix
  adornments, progress pips with an `aria-live` "n of m completed" region,
  hint reveal, Clear, and a submit gate on `isComplete`.
- **Integrated into the Game Session service**: `registerFillComplete` is part
  of `createDefaultServerActivityEngine()`, the demo API seeds fill-complete
  demo questions, and the app shell renders `FillCompleteActivity` for
  `kind === 'fill-complete'`.

Fill & Complete is **exact-response**: partial credit = correct blanks ÷ total
blanks. The submitted response is `{ answers: [{ blankId, value }] }` — one
entry per blank, in payload order, exactly what `buildResponse` emits.

Correct-answer data never reaches the client. Verified by production bundle
probe (§27): the client bundle contains **zero** occurrences of the
fill-complete correct-answer schema `$id`, and the client facade exposes no
`validateAnswer` / `scoringInputs` / `feedback` / `getCorrectAnswerSchema`.

### Schema consistency fix (approved)

Implementation surfaced a genuine inconsistency in the Task 3.2 fill-complete
correct-answer contract: the schema declared `"answers"` as **required**, so a
valid **number-only** or **expression-only** correct answer (allowed by the
contract's group design and by `validate.py`'s pair checks) was rejected by the
engine's AJV layer at runtime. The fix — removing `answers` from `required`
(the array keeps `minItems: 1` when present, and per-blank coverage/type-match
is enforced by `validateBlankAnswers`) — was reviewed and approved before
being applied. This is a genuine contract fix, not a "make-the-implementation
pass" change: it is verified by the new number-only and expression-only tests
and by the validator staying green.

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method fill-complete plugin + `validateBlankAnswers` (catalog port) + 2 `validatePayload` semantic rules | `src/features/activity-engine/plugins/fill-complete/plugin.js` |
| 2 | Pure interaction state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/fill-complete/fill-complete-controller.js` |
| 3 | React renderer (per-type native inputs, no input library) | `src/features/activity-engine/plugins/fill-complete/FillCompleteActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/fill-complete/fill-complete.css` |
| 5 | Public plugin entry (re-exports + `registerFillComplete`) | `src/features/activity-engine/plugins/fill-complete/index.js` |
| 6 | Plugin unit tests (57 cases, incl. controller) | `src/features/activity-engine/testing/fill-complete.test.js` |
| 7 | Session end-to-end integration tests (FC-series, 10 cases) | `src/features/game-session/testing/session-service.test.js` |
| 8 | Fill-complete demo content (Task 3.2 fixtures, dev API only) | `src/features/game-session/demo/fill-complete-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | Schema consistency fix (approved): `answers` group optional | `schemas/activities/fill-complete/correct-answer.schema.json` |
| 12 | Final report | `reports/15-task-4.8-fill-complete.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity types
(image-interaction, pattern, memory, scenario-challenge, number-logic),
production question authoring (none created here), and the mode-aware registry
that would strip server-only method source from client bundles (recorded as
future work, §28).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Fill & Complete implementation |
|---|---|---|
| `render` | client | Template + per-blank metadata (`id`, `type`, `label`, `prefix`, `suffix`, `maxLength`) + `keypad`; **never** reads `correctAnswer.*` |
| `validatePayload` | authoring | Schema gate then 2 semantic rules (blank ids unique; template placeholders = blank count) |
| `validateAnswer` | server-only | `validateBlankAnswers` integrity guard, then shape/reference/uniqueness/type guard, completeness guard (every blank exactly once), per-blank correctness detail |
| `scoringInputs` | server-only | correctnessFraction = correct blanks ÷ total blanks; evidence never carries expected/accepted values |
| `buildHints` | client | Authored progressive hints, never derived from the answer |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals accepted values |
| `availableOn` | client | Default available; `featureFlags['fill-complete'] = false` opts out; voice-only offered |

---

## 4. Domain Model

- `payload.template` — a string containing `___` placeholders, exactly one per
  blank, in order.
- `payload.blanks[]` — 1..4 blanks (`id`, `type: text|number|expression`,
  `label?`, `prefix?`, `suffix?`, `maxLength?` default 24).
- `payload.keypad` — `default | numeric | text` (hint for the mobile input mode).
- `correctAnswer.answers[]` — TEXT blanks (`{ blankId, type: "text",
  accepted[1..8] }`); optional (see §1) — number-only/expression-only
  questions need no text entries.
- `correctAnswer.numeric[]` — NUMBER blanks: either `value` + `tolerance ≥ 0`,
  or a `(min, max)` range that overrides value/tolerance.
- `correctAnswer.expression[]` — EXPRESSION blanks (`{ blankId, accepted[1..8] }`).

Fill & Complete is **exact-response**: every blank accepts a specified set of
values (or a numeric range); there is no fuzzy string matching (D-062/063).

---

## 5. Render Security (D-021)

`render` never reads `correctAnswer`. The descriptor carries
`{ kind, prompt, instructions, template, blanks[], keypad }` — client-safe
blank views (`id`, `type`, `label`, `prefix`, `suffix`, `maxLength`) only. No
blank carries `accepted`/`value`/`tolerance`/`min`/`max`. Verified: the built
client bundle contains 0 occurrences of both fill-complete schema `$id`
markers (§27), and the client facade exposes no server-only methods (covered
by the fill-complete tests).

---

## 6. Semantic Port: `fill-complete.blanks-referenced`

`validateBlankAnswers(payload, correctAnswer)` runs server-side (in
`validateAnswer`) and is exported for authoring tooling/tests. It enforces —
extending the catalog rule with the invariants that make scoring honest:

- every answer entry references an existing payload blank
  (`fill-complete.blanks-referenced`);
- every blank's answer entry sits in the group matching its type (a text
  blank answered in `numeric` is an author bug);
- no blank has more than one answer entry;
- numeric entries must be **definable**: `value` present, or a `(min, max)`
  range; a single `min` or `max` alone is rejected;
- text/expression entries must list ≥ 1 accepted form;
- **completeness**: every payload blank has exactly one answer entry (a blank
  with no entry would make the partial-credit denominator wrong).

A schema-valid but semantically inconsistent answer document throws
`ACTIVITY_PAYLOAD_SEMANTIC_INVALID` (an author bug, never a student mistake).

---

## 7. `validatePayload` Semantic Rules

| Rule | Purpose |
|---|---|
| `fill-complete.blank-ids-unique` | blank ids unique by value (schema `uniqueItems` is deep-equality only) |
| `fill-complete.placeholder-count-matches-blanks` | template must contain exactly one `___` per blank |

The schema already enforces counts (1–4 blanks, 1–8 accepted forms), value
types, and structural shape; these rules catch meaning a schema cannot.

---

## 8. Interaction Controller (DOM-free)

`fill-complete-controller.js` exposes pure functions consumed by the renderer:

- `createFillState(blankDefs)` — every blank valued `null`.
- `setBlankValue(state, blankId, value)` / `getBlankValue(state, blankId)`.
- `clearBlank(state, blankId)` / `resetFill(state)`.
- `isBlankAnswered(state, blankId)` — non-empty after trim.
- `isComplete(state)` — every blank answered (submit gate).
- `answeredCount(state)` / `buildResponse(state)` — `{ answers: [{ blankId,
  value }] }`, one entry per blank in payload order.

No correctness information ever lives in controller state.

---

## 9. `validateAnswer` Behavior

- **Authoring-integrity:** `validateBlankAnswers` failures throw
  `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
- **Submission shape:** `response.answers` must be an array of
  `{ blankId, value }` records (string or finite-number values).
- **Reference guard:** unknown blank ids are rejected
  (`ACTIVITY_ANSWER_INVALID`) — a forged id never scores.
- **Uniqueness:** a blank answered more than once is rejected.
- **Type guard:** number blanks must be finite numeric (parseable strings;
  empty/whitespace or non-numeric values rejected); text/expression blanks
  must be non-empty strings after trim.
- **Completeness:** a submission missing any blank is rejected, so a truncated
  response can never inflate the partial-credit denominator (honesty
  principle, mirrors D-055).
- **Scoring:** per-blank detail `{ blankId, type, submitted, correct }`;
  `correct` = all blanks; partial credit = correct blanks ÷ total.

**Normalization is exact, never fuzzy (D-063):**

- text — trim + case-fold, both sides of the comparison;
- expression — trim + collapse internal whitespace runs to single spaces (no
  case-fold, no arithmetic/symbolic equivalence — an accepted form must be
  typed as authored);
- number — trim + parse to a finite number; comparisons use value/tolerance or
  the (min, max) range, never string equality.

---

## 10. React Renderer

`FillCompleteActivity.jsx` consumes only the client-safe descriptor. The
template is split on `___` into segments; each blank renders an inline input
between its segment pieces:

1. **Per-type inputs** — text blanks get a plain `<input type="text">`;
   number blanks get `<input inputMode="decimal">` (mobile numeric keypad,
   `keypad: "numeric"` worsens to `inputMode="decimal"`); expression blanks
   get a text input. `prefix`/`suffix` adorn the field; `maxLength` caps it
   client-side.
2. **Progress** — pips per blank plus an `aria-live` "n of m completed"
   region, announced on every set/clear.
3. **Hints, Clear and submit** — authored hints revealed on demand; a Clear
   button resets all fields; Submit gates on `isComplete` and sends
   `{ response, interactionMetrics: { attemptsUsed, hintsUsed, timeTakenSec } }`.

Accessibility: real `<label>`s for every field, `:focus-visible` states,
`40px+` touch targets, visible progress, `aria-live` announcements, and a
`prefers-reduced-motion` media query kills the transition animation.
`fill-complete.css` is mobile-first and avoids `:has()` (uses `:focus-within`
for the field accent).

---

## 11. Tests

### 11.1 Fill-complete plugin suite — `fill-complete.test.js` (57 tests)

- Registration + contract shape (7 methods), `registerFillComplete` helper,
  coexistence.
- Render descriptor: no correct-answer keys, no accepted/value/tolerance
  metadata, template + blank metadata + keypad shape, maxLength default.
- `validatePayload`: 2 semantic rules + schema-layer failure.
- `validateBlankAnswers`: complete pass, unknown blank, type mismatch, duplicate
  entry, numeric indefinable (neither value nor range), lone min/max,
  non-empty accepted, missing blank (no entry).
- `validateAnswer`: full / partial / zero credit, malformed shapes, unknown
  blank, duplicate blank, missing blank, non-numeric number blank,
  numeric-only and expression-only correct answers resolve, tolerances and
  ranges, inconsistent-answer and schema-invalid-answer guards, minimal
  end-to-end.
- Normalization: text case-fold, expression whitespace collapse, numeric parse
  edge cases, no arithmetic equivalence (e.g. `50` ≠ `150/3`).
- `scoringInputs`: 1.0 / 1/2 / 0.0, scorableUnits, evidence never carries the
  expected/accepted value.
- `buildHints`, `feedback` (correct/partial/incorrect/timeout, no leaks),
  `availableOn` (default, flag opt-out, voice-only).
- Client facade boundary (no server-only methods/engine methods).
- Controller: initial state, set/get, clear, reset, completion gate, response
  serialization, empty-value handling.

### 11.2 Session-service FC-series — 10 integration tests

- `FC1` safe fill-complete descriptor end-to-end (no `correctAnswer`, no
  `answers`/`accepted`, blanks metadata shape).
- `FC2/FC3` no correctAnswer or accepted-answer set reaches the client.
- `FC4` fully-correct fill-complete submission → 100 round score.
- `FC5` partial (1 of 2) → correctnessFraction 0.5, pointsEarned 50.
- `FC6/FC7` forged correctnessFraction/score ignored by the server.
- `FC8` unknown blank id rejected through the service.
- `FC9` missing blank rejected before scoring (a truncated response cannot
  inflate the denominator).
- `FC10` mixed drag-drop + fill-complete session runs to completion (0–300).

### 11.3 Full suite

`npm test` → **423 tests, 423 pass, 0 fail** (2 consecutive full runs).
Breakdown:

| Suite | File(s) | Tests |
|---|---|---|
| Fill & Complete | `fill-complete.test.js` | 57 |
| Sorting | `sorting.test.js` | 52 |
| Ordering | `ordering.test.js` | 54 |
| Matching | `matching.test.js` | 54 |
| Drag & Drop | `drag-drop.test.js` | 37 |
| Activity Engine core | `engine.test.js` | 37 |
| Activity Engine security | `security.test.js` | 15 |
| Game Engine | `selection.test.js` + `session.test.js` | 13 + 13 |
| Central Scoring | `central-scoring.test.js` | 18 |
| Session service | `session-service.test.js` | 73 |

Game-session suite stability: 5 consecutive runs, 73/73 each (M52 remains
fixed — D-059 contract-not-fixture policy).

---

## 12. Files

**Created**
- `src/features/activity-engine/plugins/fill-complete/plugin.js`
- `src/features/activity-engine/plugins/fill-complete/fill-complete-controller.js`
- `src/features/activity-engine/plugins/fill-complete/FillCompleteActivity.jsx`
- `src/features/activity-engine/plugins/fill-complete/fill-complete.css`
- `src/features/activity-engine/plugins/fill-complete/index.js`
- `src/features/activity-engine/testing/fill-complete.test.js`
- `src/features/game-session/demo/fill-complete-demo-questions.js`
- `reports/15-task-4.8-fill-complete.md`

**Modified**
- `schemas/activities/fill-complete/correct-answer.schema.json` (approved
  consistency fix: `answers` group optional)
- `src/features/game-session/service/game-session-service.js` (register
  fill-complete in the default engine)
- `src/features/game-session/api/dev-server.js` (seed fill-complete demo
  questions)
- `src/features/game-session/testing/session-service.test.js` (FC-series: 10
  integration tests)
- `src/App.jsx` (render `FillCompleteActivity` for `kind === 'fill-complete'`)
- `reports/README.md`, `reports/04-todo.md`, `reports/03-decisions.md`,
  `reports/02-development-log.md`

**Packages installed:** none.
**Configuration changes:** none.
**Supabase changes:** none.

---

## 13. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas meta-valid, 72 examples, 12/12 pairs)
npm test                         # 423 pass / 0 fail (2 consecutive full runs)
npm run lint                     # clean (0 warnings / 0 errors)
npm run build                    # client build clean; bundle probes 0 correct-answer hits
```

Game-session suite (stability) — 5 consecutive runs, 73/73 each.
Demo API smoke test — a session served drag-drop/matching/fill-complete rounds
(safe descriptor each, no correctAnswer/accepted leak), all correct → 300/300.

---

## 14. Bundle Probe After Build

```
dist/assets/index-*.js : activities/fill-complete/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : activities/fill-complete/payload.schema.json       → 0 occurrences
dist/assets/index-*.js : getCorrectAnswerSchema                              → absent
```

---

## 15. Known Limitations

- Expression matching is exact (whitespace-normalized) string comparison; an
  authored accepted form must be typed as authored. There is deliberately no
  symbolic-manipulation equivalence (e.g. `50` vs `150/3`): offloading that to
  a server-side symbolic engine is future work and would be the only route to
  true "mathematical equivalence" (D-063).
- The S-series/FC-series integration tests reuse fixture correct answers that
  are structurally valid and self-consistent with their payloads; demo content
  uses educationally correct inline values derived from the same fixtures.
- A browser rendering harness is not present; interaction rules are covered by
  the DOM-free controller tests (same trade-off as the previous plugins).

---

## 16. Future Work (not in this task)

- Task 4.9 — next activity plugin (image-interaction) or the remaining plugins
  (pattern, memory, scenario-challenge, number-logic), following the same
  pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production fill-complete authoring tooling + the 2,000-question bank (stage
  3.x; not created here by design), including validation onboarding for
  number-only/expression-only correct answers now that the schema accepts them.
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.