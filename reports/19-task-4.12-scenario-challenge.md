# Task 4.12 — Ninth Production Activity Plugin: Scenario Challenge

**Status:** Complete
**Date:** 2026-08-14
**Depends on:** 08-task-3.2-schemas.md (scenario schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), Task 4.4 `GameSessionService` (safe descriptors + central scoring), and 10–18 (the plugin pattern Scenario Challenge follows)
**Tests:** 718 total pass (`npm test`), lint clean, production build passes, schema validator passes (24/72/12/12)
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The ninth production activity plugin is implemented: **scenario-challenge** —
the branched decision-tree activity from the Task 3.2 catalog. It follows the
drag-drop/matching/ordering/sorting/fill-complete/image-interaction/pattern/memory
pattern end-to-end as a **point-based** (not multiple-choice) plugin:

- **7-method plugin** (`scenarioChallengePlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validateScenarioAnswer`, the semantic port
  of the catalog rule `scenario.entry-decision-exists`, extended with the
  invariants that make honest scoring possible (unique decision/option ids,
  no self-loops, and an optimalPath that is actually traversable to a
  terminal option).
- **Branched decision tree (NOT an MCQ).** The student reads the mission
  (`scenarioText`), faces a decision, chooses a branch, sees its consequence
  (`outcomeText`), follows `nextDecision`, and continues until a terminal
  option ends the scenario. The renderer shows only the current decision's
  2–4 options — the tree is progressively revealed, so the interaction is a
  consequence-driven walk, not a one-screen pick.
- **`scenario-challenge-controller.js`** — a pure, DOM-free navigation state
  module (`createScenarioState`, `currentDecision`, `currentOptions`,
  `selectOption`, `isComplete`, `pathTaken`, `stepCount`, `lastOutcome`,
  `reset`, `buildResponse`) so the tree-walking rules are unit-tested in Node.
  The controller owns navigation ONLY; it never contains optimalPath,
  acceptableOptions, correctness flags, or a score.
- **Response = the navigated path.** The submission is `{ path: [{ decisionId,
  optionId }] }` — the ordered steps actually chosen, mirroring the
  correct-answer `optimalPath` step shape. The server re-validates every
  transition against the public tree, so a forged jump (or an infinite loop)
  can never inflate credit.
- **Scoring decided only by the authored answer model (D-041).** Answer units =
  one per decision step; a step is correct iff its chosen option is the
  optimal option for that decision OR an authored acceptable alternative at
  that decision. Partial credit = correct steps ÷ submitted path length.
- **React renderer** (`ScenarioChallengeActivity.jsx`) — mission header,
  decision cards (real buttons), consequence panel with Continue, completion
  panel with Submit, hint reveal, Restart/Start over, `aria-live`
  announcements, and a submit gate on `isComplete`.
- **Integrated into the Game Session service**: `registerScenarioChallenge` is
  part of `createDefaultServerActivityEngine()`, the demo API seeds scenario
  demo questions (built from the Task 3.2 fixture files — no new production
  content), and the app shell renders `ScenarioChallengeActivity` for
  `kind === 'scenario-challenge'`.
- **Ninth-type coverage proof.** A new integration test (`SC13`) drives all
  NINE production activity plugins across sessions to 300 each.

Correct-answer data never reaches the client: `render` carries the PUBLIC tree
only (the mission, every decision/option, `nextDecision`, and `outcomeText` —
all student-facing payload content required to navigate). `optimalPath` and
`acceptableOptions` (the hidden answer) flow only through `validateAnswer`
(server-only). `nextDecision` is public navigation data — it is NOT the
answer; the server decides whether the selected path is optimal (§5).

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method scenario plugin + `validateScenarioAnswer` (catalog port) + 5 `validatePayload` semantic rules + strict response-shape gate | `src/features/activity-engine/plugins/scenario-challenge/plugin.js` |
| 2 | Pure navigation state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/scenario-challenge/scenario-challenge-controller.js` |
| 3 | React renderer (decision tree walk, consequence panel, completion gate) | `src/features/activity-engine/plugins/scenario-challenge/ScenarioChallengeActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/scenario-challenge/scenario-challenge.css` |
| 5 | Public plugin entry (re-exports + `registerScenarioChallenge`) | `src/features/activity-engine/plugins/scenario-challenge/index.js` |
| 6 | Plugin unit tests (59 cases, incl. controller + boundary) | `src/features/activity-engine/testing/scenario-challenge.test.js` |
| 7 | Session end-to-end integration tests (SC-series, 12 cases + 9-type coverage) | `src/features/game-session/testing/session-service.test.js` |
| 8 | Scenario demo content (Task 3.2 fixtures, dev API only, ids 50–52) | `src/features/game-session/demo/scenario-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | Demo API seeding | `src/features/game-session/api/dev-server.js` |
| 12 | Schema registry aliasing (`scenario` schema key ↔ `scenario-challenge` plugin type) | `src/features/activity-engine/validation/schemas/payload.js` + `correct-answer.js` |
| 13 | Final report | `reports/19-task-4.12-scenario-challenge.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity type
(number-logic), production question authoring (none created here), and the
mode-aware registry that would strip server-only method source from client
bundles (recorded as future work, §17).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Scenario Challenge implementation |
|---|---|---|
| `render` | client | `{ kind, prompt, instructions, scenarioText, media, entryDecision, decisions[{id,text,options[{id,text,nextDecision,outcomeText}]}] }` — the FULL **public** tree; never reads `correctAnswer.*` |
| `validatePayload` | authoring | Schema gate then 5 semantic rules (§6) |
| `validateAnswer` | server-only | `validateScenarioAnswer` cross-document guard, then strict response-shape gate + entry/reference/continuity/completion checks + optimal/acceptable step evaluation |
| `scoringInputs` | server-only | correctnessFraction = correct steps ÷ submitted path length; evidence never carries the optimal option for wrong steps |
| `buildHints` | client | Authored progressive hints, never derived from the answer |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals the optimal path or acceptable options |
| `availableOn` | client | Default available; `featureFlags['scenario-challenge'] = false` opts out |

---

## 4. Domain Model

- `payload.scenarioText` — the mission (1–1500 chars) the student reads.
- `payload.media[]` — optional (max 3) student-facing illustrations.
- `payload.entryDecision` — the decision the student starts at (an id ref).
- `payload.decisions[]` — 1–8 decision nodes `{ id, text, options[] }`.
- `options[]` — 2–4 decision branches
  `{ id, text, nextDecision|null, outcomeText }`; `nextDecision` is a public
  navigation reference to the next decision (or `null` = the scenario ends)
  and `outcomeText` is the public consequence shown after the choice.
- `correctAnswer.optimalPath[]` — 1–8 server-only expected steps
  `{ decisionId, optionId }` from the entry decision to a terminal option.
- `correctAnswer.acceptableOptions` — optional per-decision set of option ids
  that are also accepted (in addition to the optimal one).

Scenario Challenge is a genuine **consequence-driven walk**: answer units = one
per decision step. Scoring is exact per step: a submitted step is correct iff
its option is the optimal option for that decision OR an authored acceptable
alternative at that decision. `correct` = every step correct; partial credit =
correct steps ÷ submitted path length, reported as facts for the Central
Scoring Service (D-041/D-047). The response `{ path }` mirrors the
`optimalPath` step shape, so the server scores the exact same notion of a
"decision choice" the author encoded.

---

## 5. Render Security (D-021)

`render` never reads `correctAnswer`. The descriptor carries the PUBLIC tree —
every decision, option, `nextDecision`, and `outcomeText` is student-facing
navigation content from the payload (a student must know the branches to make
choices). The hidden answer (`optimalPath`, `acceptableOptions`) is never read
here: `render` only maps the payload. `nextDecision` is public navigation data,
NOT the answer — knowing the tree's shape doesn't reveal which path is optimal.
Verified: the built client bundle contains 0 occurrences of the scenario
correct-answer schema `$id` (and 0 occurrences of `acceptableOptions`), and the
client facade exposes no server-only methods (§14, covered by the scenario
tests). Note: `optimalPath` / `correctAnswer` identifier strings appear in the
bundle because the plugin's index re-exports `validateScenarioAnswer` (the
inert, server-importable validation module) — identical to the established
memory/pattern precedent; the correct-answer DOCUMENT (schema + data) never
enters the bundle.

---

## 6. Semantic Rules

### 6.1 `validatePayload` — authoring-time (payload only)

| Rule | Purpose |
|---|---|
| `scenario.decision-ids-unique` | decision ids unique by value (the schema's `uniqueItems` is shallow deep-equality — two decisions sharing an id with different text pass it) |
| `scenario.option-ids-unique` | option ids unique within a decision |
| `scenario.entry-decision-exists` | the catalog port: `entryDecision` must reference a real decision |
| `scenario.next-decision-exists` | every non-null `nextDecision` must reference a real decision |
| `scenario.option-no-self-loop` | no option may point back to its own decision (infinite loop) |

### 6.2 `validateScenarioAnswer` — cross-document integrity (server-only)

Port of the catalog rule `scenario.entry-decision-exists`
(`schemas/validate.py` `_check_pair`, scenario) plus the invariants that make
honest scoring possible:

- `scenario.optimal-path-missing` — the correct-answer document MUST define a
  non-empty `optimalPath` (a document with only `acceptableOptions`, or a
  typo'd `path` field, is an author bug that must never silently zero-score
  every student);
- `scenario.optimal-path-traversable` — the optimalPath must start at the
  entry decision, reference known decisions/options, follow the real
  `nextDecision` transitions (no jumps), visit no decision twice, and end at a
  terminal option;
- `scenario.acceptable-options-exist` — acceptable alternative ids must exist
  at their authored decision node;
- plus the payload-reference checks ported here so the standalone cross-doc
  check is self-sufficient.

A schema-valid but semantically inconsistent answer document throws
`ACTIVITY_PAYLOAD_SEMANTIC_INVALID` (an author bug, never a student mistake).

---

## 7. Interaction Controller (DOM-free)

`scenario-challenge-controller.js` exposes pure functions consumed by the
renderer:

- `createScenarioState({ decisions, entryDecision })` →
  `{ decisions, entryDecision, currentDecisionId, path: [], completed: false }`.
- `currentDecision` / `currentOptions` — the decision being faced and its
  2–4 branches (null/empty once completed).
- `selectOption(state, optionId)` — records the step, advances
  `currentDecisionId` to the option's `nextDecision`; a terminal option
  (`nextDecision === null`) completes the scenario. Unknown ids and options
  from another decision are no-ops; completed states are inert.
- `isComplete` / `pathTaken` / `stepCount` / `lastOutcome` (the chosen
  option's text + `outcomeText`, null before any choice).
- `reset` — returns to the entry decision with an empty path.
- `buildResponse` → `{ path: [{ decisionId, optionId }] }` — the exact shape
  the server validates.

No correctness information ever lives in controller state.

---

## 8. `validateAnswer` Behavior

- **Authoring-integrity:** `validateScenarioAnswer` failures throw
  `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
- **Strict response-shape gate:** the submission is a single object
  `{ path: [{ decisionId, optionId }] }` — a non-empty ordered array of steps,
  each with exactly the two string fields and no unexpected fields anywhere.
  Malformed, missing, or forged responses (including embedded
  correctness/score/optimal data) are rejected with `ACTIVITY_ANSWER_INVALID`
  — never silently coerced.
- **Entry reference:** the path must start at the entry decision.
- **Reference integrity:** every decisionId must be known and every optionId
  must belong to its step's decision.
- **Continuity:** step[i+1].decisionId must equal step[i]'s option's actual
  `nextDecision` — an impossible jump is rejected.
- **Completion:** the final step must be a terminal option (`nextDecision ===
  null`) — an incomplete path is rejected.
- **No duplicate decisions** — a path that doubles back (defense in depth
  beyond the self-loop rule) is rejected, so no infinite walk is possible.
- **Scoring:** each step is correct iff its option is the optimal option for
  that decision OR an authored acceptable alternative; `correct` = all steps
  correct; `detail.submitted` carries a per-step `{ decisionId, optionId,
  correct }` flag.

**Normalization is exact (D-063/D-069):** correctness is decided only by the
authored answer model — literal option membership, never fuzzy, never inferred.

---

## 9. React Renderer

`ScenarioChallengeActivity.jsx` consumes only the client-safe descriptor:

1. **Mission** — the prompt/instructions, `scenarioText`, optional media, and
   a live progress indicator ("Decision n of m").
2. **Decision** — the current decision's 2–4 branches as real-button cards
   (choice announced via `aria-live`).
3. **Consequence** — the chosen option's text + `outcomeText` in a status
   panel with **Continue** (a non-terminal branch) and Restart.
4. **Completion** — the final outcome + a summary and **Submit scenario**
   (gated on `isComplete`), plus Start over.

Hints reveal progressively (authored, never answer-derived). Accessibility:
real button targets, screen-reader announcements via `aria-live`, focal
`:focus-visible` states, `44px+` touch targets, and a
`prefers-reduced-motion` media query. `scenario-challenge.css` is mobile-first.
The renderer never displays `nextDecision` ids or the answer model.

---

## 10. Schema/Type Naming Boundary

The Task 3.2 scenario schema directory is `schemas/activities/scenario/`
(validator + schema-level type name `scenario`), while the engine activity
type is the catalog slug `scenario-challenge` (activityTypeId 9). Unlike the
previous eight plugins — where the schema key and plugin type coincide — this
task needed an explicit alias so the engine's schema registry can resolve the
scenario schemas by the plugin type:

- `PAYLOAD_SCHEMAS` and `CORRECT_ANSWER_SCHEMAS` now expose the scenario schema
  under BOTH keys (`scenario` and `scenario-challenge`). The `scenario` key is
  retained for `schemas/validate.py` and any schema-level tooling; the engine
  resolves `scenario-challenge`. No schema files were changed.

---

## 11. Tests

### 11.1 Scenario plugin suite — `scenario-challenge.test.js` (59 tests)

- Registration + contract shape (7 methods), `registerScenarioChallenge`
  helper, coexistence / duplicate rejection, schema version resolution.
- Render descriptor: full PUBLIC tree (scenarioText, entryDecision, decisions,
  options with `nextDecision` + `outcomeText`), no answer keys, media mapping,
  safe media fallback.
- `validatePayload`: 5 semantic rules (duplicate decision ids, duplicate
  option ids, missing entry decision, dangling `nextDecision`, self-loop) +
  schema-layer failure (invalid payload fixture).
- `validateScenarioAnswer`: consistent pairs, missing `optimalPath` / typo'd
  `path`, wrong start, unknown decision/option, jump, non-terminal end,
  duplicate decision visit, acceptable-option existence, engine-level
  author-bug rejection.
- Controller: initial entry state, `findDecision`/`findOption`, branch
  advance, terminal completion, immediate wrong-terminal completion, no-ops
  (unknown/foreign/completed), reset, `buildResponse` serialization.
- `validateAnswer`: full optimal, sub-optimal partial, zero, acceptable
  alternative (full credit), acceptable + wrong mix, 3-decision optimal,
  partial 2/3, strict shape gate, malformed steps, wrong start, unknown
  ids/foreign options, impossible jump, incomplete/non-terminal paths,
  doubling-back rejection, forged-field rejection.
- `scoringInputs`: 1.0 / 2⁄3 / 0.0, scorableUnits, evidence never carries the
  optimal option for wrong steps.
- `buildHints`, `feedback` (correct/partial/incorrect/timeout, no leaks),
  `availableOn` (default, flag opt-out).
- Client facade boundary (no server-only methods/engine methods).
- Accessibility contract surface + stylesheet presence.

### 11.2 Session-service SC-series — 12 integration tests

- `SC1` safe scenario descriptor end-to-end (kind, scenarioText, entryDecision,
  public tree with `nextDecision`/`outcomeText`, no answer data).
- `SC2/SC3` no correctAnswer, optimalPath or acceptableOptions reach the
  client.
- `SC4` fully-optimal scenario submission → 100 round score.
- `SC5` authored acceptable alternative → full credit.
- `SC6` sub-optimal terminal branch → correctnessFraction 0.5, pointsEarned 50.
- `SC7` bad decision chain → 0.
- `SC8` malformed scenario answer rejected through the service.
- `SC9` forged correctnessFraction/score ignored by the server.
- `SC10` impossible decision jump rejected through the service.
- `SC11` mixed drag-drop + scenario session runs to completion (0–300).
- `SC12` all-scenario pool runs to completion with per-round safe descriptors.
- `SC13` **all nine production plugins** run across sessions to 300 each
  (three deterministic triples, each pool holding exactly 3 distinct-type
  questions so selection must use all three — no seed-dependent coverage
  gaps).

### 11.3 Full suite

`npm test` → **718 tests, 718 pass, 0 fail** (baseline 647 + 59 scenario
plugin + 12 SC-series). Breakdown:

| Suite | File(s) | Tests |
|---|---|---|
| Scenario Challenge | `scenario-challenge.test.js` | 59 |
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
| Session service | `session-service.test.js` | 110 |

Game-session suite stability: 5 consecutive runs, 110 each run, 0 failure.

---

## 12. Files

**Created**
- `src/features/activity-engine/plugins/scenario-challenge/plugin.js`
- `src/features/activity-engine/plugins/scenario-challenge/scenario-challenge-controller.js`
- `src/features/activity-engine/plugins/scenario-challenge/ScenarioChallengeActivity.jsx`
- `src/features/activity-engine/plugins/scenario-challenge/scenario-challenge.css`
- `src/features/activity-engine/plugins/scenario-challenge/index.js`
- `src/features/activity-engine/testing/scenario-challenge.test.js`
- `src/features/game-session/demo/scenario-demo-questions.js`
- `reports/19-task-4.12-scenario-challenge.md`

**Modified**
- `src/features/activity-engine/validation/schemas/payload.js` (alias the
  scenario schema under `scenario-challenge`)
- `src/features/activity-engine/validation/schemas/correct-answer.js` (alias the
  scenario schema under `scenario-challenge`)
- `src/features/game-session/service/game-session-service.js` (register
  scenario-challenge in the default engine)
- `src/features/game-session/api/dev-server.js` (seed scenario demo questions)
- `src/features/game-session/testing/session-service.test.js` (SC-series: 12
  integration tests incl. 9-type coverage)
- `src/App.jsx` (render `ScenarioChallengeActivity` for
  `kind === 'scenario-challenge'`)
- `reports/README.md`, `reports/04-todo.md`, `reports/02-development-log.md`

**Packages installed:** none.
**Configuration changes:** none.
**Schema/Supabase changes:** none (schema files untouched; only engine-side
key aliasing).

---

## 13. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas meta-valid, 72 examples, 12/12 pairs)
npm test                         # 718 pass / 0 fail
npm run lint                     # clean (0 warnings / 0 errors)
npm run build                    # client build clean
```

Game-session suite stability — 5 consecutive runs, 110/110 each.

---

## 14. Bundle Probe After Build

```
dist/assets/index-*.js : activities/scenario/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : schemas/activities/scenario/correct-answer   → 0 occurrences
dist/assets/index-*.js : acceptableOptions                            → 0 occurrences
```

The correct-answer schema and `acceptableOptions` never appear in the client
bundle; the `scenario-challenge` render descriptor carries the PUBLIC tree only
(covered by SC2/SC3 and the scenario render tests).

---

## 15. Demo API Smoke Test (real HTTP)

A one-shot socket smoke run (self-contained script) started the dev API server
on an ephemeral port, constrained the pool to the three scenario demo questions
(id 50..52), then drove sessions over `fetch` with an `x-student-id` header:

```
OPTIMAL SESSION: [{pts:100,correct:true},{pts:100,correct:true},{pts:100,correct:true}] score 300
WRONG SESSION:   [{pts:0,correct:false},{pts:0,correct:false},{pts:0,correct:false}]   score 0
SMOKE PASS
```

Every round descriptor and every feedback payload was verified to contain no
`correctAnswer`, `optimalPath`, `acceptableOptions`, or option-id leak; the
optimal-path submissions scored `correct: true` on every round (300) and the
wrong-branch submissions scored 0.

---

## 16. Known Limitations

- A browser rendering harness is not present; interaction rules are covered by
  the DOM-free controller tests (same trade-off as the previous plugins).
- Cycle detection is structural: the payload-only rules reject self-loops and
  `validateAnswer` rejects any path that revisits a decision, so no infinite
  walk is possible; a cross-route 2-cycle in the authored tree (valid per the
  schema) is likewise unreachable by a submitted path.
- The response carries the student's chosen options (not the optimal ones);
  partial-credit feedback reports counts only and never names the better
  branch.

---

## 17. Future Work (not in this task)

- The final activity plugin (number-logic) following the same pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production scenario authoring tooling + the 2,000-question bank (stage 3.x;
  not created here by design).
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.