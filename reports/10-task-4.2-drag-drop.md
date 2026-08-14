# Task 4.2 — First Real Activity Plugin: Drag & Drop

**Status:** Complete
**Date:** 2026-08-12
**Depends on:** 08-task-3.2-schemas.md (drag-drop schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry)
**Tests:** 89 total pass (`npm test`), lint clean, production build passes
**Verification command:** `npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The first production activity plugin is implemented: **drag-drop**, built
against the Task 4.1 engine contract and the Task 3.2 drag-drop schema
contract. The plugin implements all seven plugin-contract methods, a React
renderer (`DragDropActivity.jsx`) with no external drag library, and the
server-only correctness path (`validateAnswer` / `scoringInputs` / `feedback`)
that enforces the catalog's cross-document rules.

The plugin is the first real consumer of the entire pipeline established in
reports 08 and 09:

- **Task 3.2 →** `payload.schema.json` + `correct-answer.schema.json` feed the
  engine's schema registry and routing; the plugin adds the *semantics* the
  JSON Schema cannot express.
- **Task 4.1 →** the plugin registers against the strict `validatePluginShape`
  gate, is served to clients through the sanitized `pluginForClient` view, and
  keeps `validateAnswer` / `scoringInputs` / `feedback` out of the client
  facade.
- **Correct-answer data never reaches the client.** Verified by production
  bundle probe (§24): the client bundle contains **zero** occurrences of the
  correct-answer schema `$id`; the server bundle contains it.

A worked demo renders the renewable/non-renewable example from the Task 3.2
fixtures inside the existing app shell.

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method drag-drop plugin + semantic rule helpers | `src/features/activity-engine/plugins/drag-drop/plugin.js` |
| 2 | React renderer (pointer/touch/keyboard, no drag library) | `src/features/activity-engine/plugins/drag-drop/DragDropActivity.jsx` |
| 3 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/drag-drop/drag-drop.css` |
| 4 | Public plugin entry (re-exports + `registerDragDrop`) | `src/features/activity-engine/plugins/drag-drop/index.js` |
| 5 | Test suite (37 cases) | `src/features/activity-engine/testing/drag-drop.test.js` |
| 6 | Demo wiring in the app shell | `src/App.jsx`, `src/App.css` |

Not in scope (carried to report 11): real server transport for
`validateAnswer`, score persistence, cross-activity authoring tooling, the
remaining activity types from the roadmap (multiple-choice, fill-in-the-blank,
lab-simulation, computational).

---

## 3. Plugin Contract Mapping

The Task 4.1 contract requires exactly seven methods on a registered plugin.
`drag-drop` implements all of them:

| Method | Boundary | Drag-drop implementation |
|---|---|---|
| `type` / `name` / `version` / `schemaVersion` | identity | `drag-drop` / `Drag & Drop` / `1.0.0` / `1.0` |
| `render(ctx)` | client | client-safe descriptor (items, zones, mode, flags) — never answer data |
| `validatePayload(payload)` | authoring / client | semantic rules beyond the JSON Schema (§7) |
| `validateAnswer(ctx)` | server-only | cross-document integrity + per-item correctness |
| `scoringInputs(ctx, validation)` | server-only | correctness fraction, scorable units, metrics (D-047) |
| `buildHints(question)` | client | authored, progressive hints |
| `feedback(ctx, validation, state)` | server-only | learning-oriented, never reveals answers |
| `availableOn(ctx)` | client | flag opt-out + `voice-only` exclusion |

---

## 4. Repository Layout

```
src/features/activity-engine/
├── index.js                      # createClientActivityEngine facade
├── server.js                     # createServerActivityEngine facade
├── registry/                     # validatePluginShape, register/get/list
├── validation/
│   ├── schema-registry.js        # Task 3.2 schema map ($ids)
│   └── semantic/                 # generic semantic-rule applicator (Task 4.1)
├── errors/index.js               # engineError.* factory
└── plugins/drag-drop/
    ├── plugin.js                 # dragDropPlugin (7 methods) + validateMappings
    ├── DragDropActivity.jsx      # React renderer
    ├── drag-drop.css             # styles
    └── index.js                  # public entry: plugin + renderer + helper
```

The plugin lives under `plugins/` so future activity types (multiple-choice,
etc.) each get a sibling directory with the same shape.

---

## 5. Plugin Object (Identity & Metadata)

```js
{
  type: 'drag-drop',
  name: 'Drag & Drop',
  version: '1.0.0',
  schemaVersion: '1.0',
  // render, validatePayload, validateAnswer, scoringInputs,
  // buildHints, feedback, availableOn
}
```

- `type` matches the `$id` fragment `activities/drag-drop/…`, which is how the
  engine routes payload/correct-answer validation to the right schemas.
- `schemaVersion` is `1.0`, matching the Task 3.2 `$schema` declaration, so
  future schema bumps are visible to the versioning checks.

---

## 6. Cross-Document Semantic Port (`validateMappings`)

The Task 3.2 catalog defines two rules that need **both** the payload and the
correct-answer document:

- `drag-drop.mappings-cover-items` — every item must be mapped; no item mapped
  more than once.
- `drag-drop.mappings-zone-exists` — every mapping must reference an existing
  zone.

These were specified in `schemas/validate.py` (`_check_pair`) but had **no**
JSON Schema equivalent — schemas validate documents in isolation. The plugin
ports them to JS as a standalone, tested helper:

```js
validateMappings(payload, correctAnswer)
// -> [{ ruleId, message, path }]
```

It returns *all* violations (not just the first): an unmapped item, a
duplicated item, and an unknown zone each produce one entry. This helper is
the single source of truth for authoring integrity and is exercised by the
`validateAnswer` guard (§11) and by dedicated tests with deliberately broken
pairs (§25).

---

## 7. Payload-Only Semantic Rules

The schema layer (engine `validatePayload`) catches structural violations.
Four further rules are meaning JSON Schema cannot express, so the plugin's
`validatePayload` runs them after the schema gate:

| Rule id | Condition |
|---|---|
| `drag-drop.item-ids-unique` | item ids are unique **by value** (schema only deep-equality-checks, so duplicates with different labels would slip through) |
| `drag-drop.zone-ids-unique` | zone ids unique by value |
| `drag-drop.item-zone-ids-disjoint` | item and zone ids do not overlap (an overlap would make a correct-answer mapping ambiguous) |
| `drag-drop.single-target-requires-one-zone` | `mode: 'single-target'` implies exactly one zone |

Rules are declared with the Task 4.1 `createSemanticRule` helper and applied
via `applySemanticRules`, so they emit the standard `{ valid, errors }` shape
the engine already documents. The `invalid-payload.json` fixture triggers
`single-target-requires-one-zone` end-to-end through the server facade.

---

## 8. Render & Client-Safe Descriptors

`render(ctx)` consumes `ctx.question.payload` and returns a **frozen**,
client-safe descriptor:

```js
{
  kind: 'drag-drop',
  prompt, instructions,
  mode: 'single-target' | 'multi-target',
  allowRetry, randomizeItems,
  items: [ { id, label, image, ariaLabel } ],  // frozen views
  zones: [ { id, label, image, ariaLabel } ],  // frozen views
}
```

Deliberate properties:

- **Views, not documents.** `itemView` / `zoneView` copy only the fields the
  renderer may see. `correctAnswer` is never read here.
- **Frozen at every level** (`Object.freeze` on the descriptor and each view),
  so no downstream component can mutate or leak extra fields.
- **Aria labels** are derived client-side (`ariaLabel` → `label` → `id`) so
  screen readers always have text, and items are always `<button>` elements.
- **No keys from the answer document appear** — a security test greps the
  descriptor for `correctAnswer`, `mappings`, and `score` (§23).

The renderer consumes only this descriptor; there is no other channel.

---

## 9. Item Ordering (`randomizeItems`)

The payload schema declares `randomizeItems` (default `true` in the plugin —
the Task 3.2 fixture uses `"randomizeItems": false` for stable authoring
previews). When enabled, `render` shuffles the item order with Fisher–Yates so
each attempt may present a different layout. The shuffle happens at render
time (client), never at authoring time, and the shuffled order is frozen into
the descriptor so it is stable for the lifetime of one rendered activity.

---

## 10. `validatePayload` (Authoring Gate)

```js
validatePayload(payload) -> { valid, errors }
```

Two layers guard an author's payload:

1. **Engine schema layer** — `SchemaRegistry.getPayloadSchema('drag-drop')`
   runs the Task 3.2 payload schema first (this is engine behaviour, not
   plugin behaviour).
2. **Plugin semantic layer** — the four rules in §7 run on the (already
   schema-valid) payload.

Tests confirm both layers fire: a schema-invalid payload is rejected by the
engine before the plugin runs, and a schema-valid-but-semantically-broken
payload (e.g. `mode: 'single-target'` with two zones) is caught by the plugin.

---

## 11. `validateAnswer` (Server-Only Correctness)

Server-only path; the client facade has no such method (§23).

```js
validateAnswer({ submission, payload, correctAnswer })
  -> { correct: boolean, detail: { total, correctCount, placements[] } }
```

Pipeline:

1. **Authoring-integrity guard** — `validateMappings(payload, correctAnswer)`
   runs first. Any catalog violation throws
   `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`; this is what makes a
   schema-valid-but-inconsistent answer *document* fail loudly instead of
   producing silently-wrong scores. (Covered by tests: the 
   `invalid-correct-answer.json` fixture — a mapping to a non-existent zone —
   is rejected even though it satisfies the schema.)
2. **Submission-shape guard** — `response.placements` must be an array of
   `{ itemId, zoneId }`; non-array, malformed entries, and duplicate
   placements throw `ANSWER_INVALID`. These throw instead of returning a
   score because they indicate a broken client or a forged payload.
3. **Reference guard** — every `itemId` must exist in `payload.items` and
   every `zoneId` must exist in `payload.zones`. Unknown ids throw
   `ANSWER_INVALID` (task-required: "Do not silently accept unknown item
   IDs / unknown zone IDs"; tests 13/14 pin this).
4. **Comparison** — build `correctZoneByItem` from the answer document and
   `submittedZoneByItem` from the submission; any item with no placement is
   treated as unplaced (`zoneId: null`) and is therefore incorrect.
5. **Result** — `correct` is true only when *every* item is correctly placed
   (and at least one item exists); `detail.placements` is a per-item report so
   the scoring layer and feedback can reason about partial credit.

---

## 12. Partial Credit & Scoring Inputs (D-047)

`scoringInputs` returns the raw inputs the central scoring service uses —
D-047's "activity reports scoring inputs, not scores":

```js
{
  correctnessFraction: correctCount / total,   // partial credit
  scorableUnits: total,
  correctUnits: correctCount,
  attemptsUsed, hintsUsed,
  interactionMetrics,                           // recorded by the renderer
  evidence: detail.placements,
}
```

- `correctnessFraction` is `0.75` for a 4-item task with 3 correct — the
  fraction is computed here, but the *decision* (pass/merit, weighting, grade
  rules) stays in the central scoring service.
- The fraction is clamped: an empty submission yields `0`, never `NaN`.
- `interactionMetrics` (`attemptsUsed`, `hintsUsed`, `timeTakenSec`) flow from
  the renderer's submission (§17) straight into the inputs, so every score is
  explainable.

Tests pin the full-, partial-, and zero-credit fractions.

---

## 13. Hints

`buildHints(question)` returns the **authored** hint list as progressive,
numbered entries:

```js
[ { id: 'hint-1', level: 1, text }, { id: 'hint-2', level: 2, text } ]
```

Design constraints:

- **Authored, never derived.** Hints come from `question.hints`; the correct
  answer is never inspected to build them (a security test asserts the hint
  builder never touches the answer).
- **Stable ids** (`hint-N`) so the UI can track which have been revealed, and
  `level` defaults to the hint position when the author did not set one.
- The renderer reveals them one at a time and counts them for
  `interactionMetrics.hintsUsed` — hints are tracked, so scores are fair.

---

## 14. Feedback

`feedback(ctx, validation, state)` returns learning-oriented feedback that
**never reveals the correct placements**:

| Fraction | Title | Message flavour |
|---|---|---|
| `1` | All correct | "Every item is in the right zone." |
| `0 < f < 1` | Almost there | "N of M items are placed correctly." |
| `0` | Not quite | "None of the items are in the right zone." |

Every message steers the learner to re-read the zone labels rather than
spoon-feeding the answer — consistent with the project's evidence-based
practice stance (report 05 §“feedback”). The caller may pass the resolved
activity state (`correct` / `partial` / `incorrect`) to keep the activity
record consistent.

---

## 15. Availability

`availableOn(ctx)`:

- Returns `false` when `featureFlags['drag-drop'] === false` (per-deployment
  opt-out).
- Returns `false` on `ctx.device === 'voice-only'` — pointer/touch dragging is
  not a useful interaction for a voice-only device, and no drag keyboard
  metaphor exists. (The renderer is keyboard-accessible, so non-voice AT is
  fine.)
- Otherwise `true`.

The default is **available**: a deployment that registers the plugin gets the
activity unless it explicitly opts out.

---

## 16. Registration Helper

```js
registerDragDrop(engine)  // engine.register(dragDropPlugin), returns engine
```

Ships for ergonomic wiring and for the tests:

```js
const engine = createServerActivityEngine()
registerDragDrop(engine)
```

The engine's `validatePluginShape` gate still runs — the helper is sugar, not
an escape hatch. Registering twice rejects with the duplicate-type error, so
the contract's idempotence rule is preserved.

---

## 17. React Renderer (`DragDropActivity.jsx`)

A single React component consumes the render descriptor and owns the
interaction state. No external drag library (keeps the client bundle lean and
the dependency surface at zero for the feature).

**Dependencies & Task 1.10 check.** No new packages were installed. The
Task 1.10 approved libraries (React Router, Zustand, TanStack Query, Tailwind,
motion) are still **not** installed (task 1.10 remains PENDING), and Drag & Drop
does **not** require any of them: the renderer is plain React + scoped CSS
(touch-friendly buttons, grid layout), the engine already handles data
discovery/validation, and a drag `pointer`-event library would only add bundle
weight. Per the task instruction, Task 1.10 is therefore **not** marked DONE by
this task — its completion criteria were not met, and no dependency install was
needed. See report 10 §29 for the future-wiring note on the approved stack.

Interaction model:

- **Pointer drag (mouse / pen / touch).** `pointerdown` captures the pointer;
  moving more than a 6 px threshold promotes the gesture to a drag, shows a
  ghost that follows the pointer, and highlights the zone under the pointer
  (`document.elementFromPoint` + `closest('[data-zone-id]')`); release drops
  the item in that zone (or returns it to the tray when released over the
  tray). A sub-threshold release is treated as a tap.
- **Tap-to-select → tap-to-place fallback** (also covers AT that cannot drag):
  tapping an item selects it, tapping a zone or the tray places it. `reducedMotion`
  users always get this mode.
- **Keyboard.** Every item and zone is a `<button>` with an explicit
  `aria-label`; items are focusable, selectable with Space/Enter, and placed by
  activating a zone. The board is fully operable without a pointer.
- **State:** `placements`, `selectedItem`, `dragItem`/`dragPosition`/
  `dragOverZone`/`moved`, `hintsRevealed`, `attempts`, and a live-region
  `announce` string for SR feedback on every placement/selection.
- **Submission:** the Submit button enables only when every item is placed;
  `onSubmit({ response: { placements }, interactionMetrics })` passes the
  exact shape `validateAnswer` expects. `timeTakenSec` is measured from first
  render to first submit.
- **Hints & retry:** progressive reveal with a counter, and a Clear button
  (respecting `allowRetry`).
- **Submitted state:** the board locks, the button reads "Submitted", and a
  `role="status"` note explains that correctness is scored server-side — the
  preview deliberately shows no correct/incorrect marking, since the client
  does not hold the answer document.

---

## 18. Accessibility

- Items and zones are native `<button>` elements (focusable, operable by
  keyboard, announced by SR).
- Explicit `aria-label`s derived in the plugin (§8) plus `aria-pressed` on
  selected items.
- A `role="status"` banner for the submitted state and an `aria-live="polite"`
  region announcing every placement, selection, and hint reveal.
- A `role="status"` note post-submit states clearly that scoring is
  server-side — no guessing at correctness in the client.
- `reducedMotion` prop switches off dragging/ghost entirely.
- The ghost overlay is `aria-hidden` (decorative; the live region carries the
  meaning).

---

## 19. Interaction Model (state diagram, text)

```
ITEM IN TRAY ──drag──▶ drop over ZONE ──▶ placed (zone)
     │                                       │
     │ tap-select                            │ tap-select
     ▼                                       ▼
  selected ──tap zone──▶ placed     selected ──tap tray──▶ back to tray
     │
     └── tap again ──▶ cleared
```

Submit is gated on `placedCount === items.length`. Clear (when `allowRetry`)
returns all items to the tray and resets selection/drag state; hints stay
revealed by design so retries never silently remove already-shown guidance
(hint disclosure is recorded for scoring fairness).

---

## 20. Styling

`drag-drop.css` is mobile-first and scoped under `.drag-drop-activity`:

- A **tray** of unplaced items and a grid of **zones** with live placement
  counts; zones highlight while an item is dragged over them.
- Items render as cards (optional `image` + label), zones as drop wells with
  "Drop here" affordance.
- A fixed-position **ghost** follows the drag; `pointer-events: none` so it
  never intercepts the pointer.
- Focus-visible rings, touch-friendly hit areas (≥44 px), and a two-column
  zone layout above 720 px (stacked on phones).
- Motion is confined to opacity/transform for the ghost and drag-over
  highlight.

The demo's App.css carries the overall shell styling already used in Task 4.1.

---

## 21. Demo Wiring

`src/App.jsx` now mounts a worked demo:

- Creates the client engine, `registerDragDrop`, renders the **renewable vs
  non-renewable** example straight from the Task 3.2 fixture
  `schemas/examples/drag-drop/valid-payload-grade6-7.json` (Sunlight, Wind,
  Coal, Natural gas → Renewable / Non-renewable), with two authored hints.
- The renderer's `onSubmit` currently console-shows the response +
  interactionMetrics; server scoring transport is report 11.
- A note in the demo explains the correct answer is evaluated server-side.

The dev server serves the page and the module graph without errors (verified
with a boot probe, HTTP 200).

---

## 22. Error Model Integration

The plugin throws through the engine's `engineError` factory, so failures are
uniform, typed, and testable:

| Condition | Error code | Raised by |
|---|---|---|
| Inconsistent payload↔answer pair (catalog violation) | `ACTIVITY_PAYLOAD_SEMANTIC_INVALID` | `validateAnswer` guard (via `validateMappings`) |
| `response.placements` not an array / malformed entries | `ANSWER_INVALID` | `validateAnswer` |
| Duplicate item placement in a submission | `ANSWER_INVALID` | `validateAnswer` |
| Unknown item id / unknown zone id in a submission | `ANSWER_INVALID` | `validateAnswer` (reference guard) |
| Schema-invalid payload | engine routing error | engine `validatePayload` |
| Double registration | registry duplicate error | `engine.register` |

The security suite (§25) additionally verifies that a *schema-valid but
inconsistent* answer document is stopped by the engine guard before any score
is produced — the "authoring data can be wrong even when it validates" case.

---

## 23. Security: Server-Only Data Boundary

The Task 4.1 boundary is preserved and now exercised by a real plugin:

- **Client facade** (`createClientActivityEngine`) has `render`,
  `validatePayload`, `buildHints`, `availableOn`, `getPayloadSchema`, and
  `pluginForClient` — the sanitized view **strips** `validateAnswer`,
  `scoringInputs`, and `feedback`. A security test asserts the client facade
  and the client plugin view never expose those three methods.
- **Server facade** (`createServerActivityEngine`) adds `validateAnswer`,
  `scoringInputs`, `feedback`, `getCorrectAnswerSchema`. The drag-drop suite
  runs its scoring assertions *only* through the server facade.
- **`render` never reads the answer.** A test renders the grade fixture and
  asserts the descriptor contains no `correctAnswer`, `mappings`, or `score`
  keys.
- **Hints never derive from the answer.** A test asserts `buildHints` output
  matches the authored hints verbatim.
- **The renderer never sees the answer.** `DragDropActivity` consumes only the
  descriptor and the hints; its props contain no answer channel.

Net effect: correct-answer data is confined to the server facade path, exactly
as report 09 §18 promised.

---

## 24. Bundle-Boundary Verification (production probe)

To *prove* the boundary, two production builds were produced from a fresh
`vite build` with separate entry points:

- **Client probe** — imports `index.js` (engine + `registerDragDrop`), i.e.
  exactly what the app ships.
- **Server probe** — imports `server.js` plus `registerDragDrop` with the
  `validateAnswer`/`scoringInputs`/`feedback` methods exercised, i.e. what a
  server bundle would carry.

Grep of the minified bundles for the schema `$id`s (the security-critical
markers):

| Marker | Client bundle | Server bundle |
|---|---|---|
| `activities/drag-drop/payload.schema.json` | present (allowed) | present |
| `activities/drag-drop/correct-answer.schema.json` | **absent (0 hits)** | present |

Confirmed by two independent greps against the freshly emitted bundles:
`correct-answer` data does not exist in the client bundle. This is the
structural guarantee behind report 09 §23.

**Documented nuance.** The client bundle *does* contain the source of the
plugin's server-only methods. Reason: the Task 4.1 registry contract requires
one registered object with all seven methods, so the plugin module ships its
whole source to any bundle that registers it. That source contains **no
correct-answer schema and no answer documents** (verified above) and those
methods are inert on the client — the facade never invokes them and
`pluginForClient` strips them. If a future task wants server-method *source*
structurally excluded from the client bundle too, the fix is a mode-aware
registry (client registration accepting a 4-method object); it is recorded as
future work (§29) rather than a weakening of the data boundary, which is fully
enforced.

---

## 25. Testing

`npm test` → **89 passing** (engine 37 + security 15 + drag-drop 37), zero
failures, zero skips.

The drag-drop suite covers:

- Plugin shape & registration (conformant; helper registration; duplicate
  rejection inherited).
- `render` (descriptor shape, ordering honouring `randomizeItems`, mode
  defaulting, no answer keys).
- `validatePayload` (semantic rules fire on schema-valid payloads; schema
  layer still catches structural breakage first).
- `validateMappings` (consistent pair passes; unmapped item, duplicated item,
  unknown zone each reported).
- `validateAnswer` (all-correct, partial, all-wrong, unplaced item, duplicate
  placement, malformed placements, unknown item id rejected, unknown zone id
  rejected, and the schema-valid-but-inconsistent document guard).
- `scoringInputs` (full `1`, partial `0.75`, half `0.5`, zero `0`; metrics
  flow-through).
- `buildHints` (authored, progressive, never answer-derived).
- `feedback` (correct / partial / incorrect states).
- `availableOn` (default on; feature-flag opt-out; voice-only exclusion).
- Security: client facade and client plugin view hide server-only methods;
  server facade exposes them; descriptor has no answer data.
- A minimal end-to-end path: register → render → submit → validate →
  score-inputs → feedback against the grade fixture.

---

## 26. Lint & Typecheck

`npm run lint` (oxlint) is clean for the new files. The feature is plain ESM
(no TypeScript), so there is no tsc step; the strict `node --test` runner,
oxlint, and the JSON-import conformance give the static guarantee. The
production build (`npm run build`) succeeds with the new plugin in the graph
(JS ~376 kB gzip 111 kB incl. React; CSS 6.5 kB gzip 1.9 kB).

---

## 27. Schema Conformance

The plugin is written against the Task 3.2 schema contract:

- The engine routes `validatePayload` and the correct-answer guard through
  `SchemaRegistry` using the exact `$id`s from report 08
  (`activities/drag-drop/payload.schema.json`, `activities/drag-drop/correct-answer.schema.json`).
- All fixtures exercised in the suite are the report-08 examples
  (`valid-payload-grade6-7`, `minimal-valid-payload`, `invalid-payload`,
  `valid-correct-answer`, `invalid-correct-answer`).
- No schema files were modified in this task; the plugin works *with* the
  schemas and adds what they cannot express (§7, §11 step 1).

---

## 28. File Layout & Summary

| File | Purpose | Size (approx.) |
|---|---|---|
| `plugins/drag-drop/plugin.js` | 7 methods + `validateMappings` + semantic rules | 317 lines |
| `plugins/drag-drop/DragDropActivity.jsx` | React renderer | 307 lines |
| `plugins/drag-drop/drag-drop.css` | styles | — |
| `plugins/drag-drop/index.js` | public entry | 15 lines |
| `testing/drag-drop.test.js` | 37 test cases | — |
| `src/App.jsx` / `App.css` | demo wiring | — |
| `reports/10-task-4.2-drag-drop.md` | this report | — |

---

## 29. Future Work (not in this task)

- **Server transport** for `validateAnswer` / `scoringInputs` (report 11): the
  plugin is transport-agnostic today; wiring it to an endpoint closes the
  loop the demo hints at.
- **Score persistence & activity records** (report 06 schema) using the
  scoring inputs D-047 defines.
- **Mode-aware registry** so a client registration may accept a plugin object
  that *structurally* lacks server-only methods — removing even the inert
  method source from the client bundle (§24 nuance).
- **Authoring tooling** that runs `validateMappings` live while an author
  edits a correct-answer document (report 11).
- **Remaining activity types** (multiple-choice, fill-in-the-blank,
  lab-simulation, computational) — each follows this plugin's pattern.
- **Unit tests for the renderer's interaction model** under a DOM harness
  (jsdom/vitest) once the test stack grows beyond `node:test`.
