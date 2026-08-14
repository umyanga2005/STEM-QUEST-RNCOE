# 09 – Task 4.1 — Activity Engine Core

> **Status:** COMPLETED (2026-08-12).
> **Scope:** the reusable JavaScript core of the Activity Engine — plugin
> contract, registry, schema registry (payload + server-only correct-answer),
> payload/answer validation routing, scoring-input guarding, hints, feedback,
> availability, error model, capability context, client/server facades,
> semantic-rule infrastructure + catalog, and a full test suite.
> **Implements:** D-021 (activity engine contract), D-041 (correctness/scoring
> boundary), D-026 (payload/correct_answer split), D-046 (schema contract).
> **No game UI, no production activity plugins, no DB changes.**

---

## 1. Executive Summary

The Activity Engine is the runtime that gives life to the 10 activity types
whose JSON Schema contracts were produced in Task 3.2. This task builds the
**engine core**: the machinery that registers plugins, loads and validates
payloads, routes answers, guards scoring inputs, and renders questions —
without building any game UI and without implementing the real activity
plugins yet (those arrive as a later, separate task, guided by the semantic
rules catalog documented here).

Deliverables:

1. **Plugin contract** — the 7 required methods + identity metadata a plugin
   must implement (`src/features/activity-engine/contracts/plugin.js`).
2. **Registry** — `ActivityRegistry` with `register / get / has / list /
   validateRegistration` and up-front shape validation.
3. **Schema registry** — AJV 2020-12 compiled validators for all 10 payload
   schemas (client-safe) + all 10 correct-answer schemas (server-only),
   loaded via static JSON imports (report §5).
4. **Validation routing** — `validatePayload` (schema → semantic rules) and
   `validateAnswer` (submission shape → correct-answer schema → plugin).
5. **Scoring-input guard** — plugins report facts; the engine normalizes and
   enforces `correctnessFraction ∈ [0,1]` (D-041/D-047).
6. **Hints, feedback, availability** — normalized, allow-listed contracts.
7. **Error model** — one `ActivityEngineError` with stable codes, categories,
   and a student-safe `toPublic()`.
8. **Client/server facades** — server-only methods and correct-answer schemas
   are structurally absent from the client bundle (verified by build probes).
9. **Semantic-rule infrastructure + catalog** — reusable rule engine and a
   documented porting checklist for every `validate.py` pair rule.
10. **Tests** — 52 passing tests (Node's built-in `node --test`), including a
    dedicated security-boundary suite. `npm test`, `npm run lint`, and
    `npm run build` all pass.

---

## 2. Design: architecture & directory layout

```
src/features/activity-engine/
  index.js                     # CLIENT facade: createClientActivityEngine()
  server.js                    # SERVER facade: createServerActivityEngine()
  core.js                      # shared engine factory + all re-exports
  errors/index.js              # ActivityEngineError + codes + categories
  contracts/
    plugin.js                  # REQUIRED_METHODS, ACTIVITY_TYPE_PATTERN, pluginForClient
    contexts.js                # render context (no correctAnswer), submission, availability ctx
    scoring.js                 # normalizeScoringInputs (fraction guard)
    hints.js                   # normalizeHints
    feedback.js                # normalizeFeedback (state allow-list)
    availability.js            # normalizeAvailability (re-export)
  registry/index.js            # ActivityRegistry class
  validation/
    ajv.js                     # createAjv() (Ajv2020 + formats)
    schema-registry.js         # SchemaRegistry: type -> payload/answer schemas
    schemas/
      payload.js               # static imports: 10 payload + 2 common schemas
      correct-answer.js        # static imports: 10 correct-answer schemas (SERVER-ONLY)
    payload-validator.js       # validatePayload routing
    answer-validator.js        # validateAnswer routing
    semantic/
      index.js                 # applySemanticRules / SemanticRuleSet / createSemanticRule
      rules-catalog.js         # documented catalog of validate.py rules
  testing/
    test-plugin.js             # dummy plugin + inline schemas
    engine.test.js             # functional tests
    security.test.js           # security-boundary tests
```

**Import graph rule.** The client entry (`index.js`) imports only
`core.js` → `schema-registry.js` → `schemas/payload.js` (payload + common
schemas). The server entry (`server.js`) additionally imports
`schemas/correct-answer.js`. Nothing else pulls correct-answer data in. This
is enforced at the bundler level and proven by the build probes in §23.

---

## 3. Plugin contract

A plugin is a plain object with identity metadata plus 7 required methods.
The engine validates shape on registration, so a non-conformant plugin can
never reach the render/validation paths.

| Key | Type | Meaning |
| --- | --- | --- |
| `type` | string | Activity type identifier, `^[a-z][a-z0-9-]{0,31}$` (e.g. `drag-drop`). |
| `name` | string | Human-readable plugin name. |
| `version` | string | Plugin implementation version (e.g. `1.0.0`). |
| `schemaVersion` | string* | Schema contract version the plugin targets (defaults to the schema's `const`, currently `1.0`). |

Required methods (report §4–§12 of this doc, and JSDoc in `contracts/plugin.js`):

| Method | Signature | Where |
| --- | --- | --- |
| `render(ctx)` | `(renderContext) -> renderDescriptor` | client + server |
| `validatePayload(payload)` | `(payload) -> { valid, errors }` | client + server |
| `validateAnswer(ctx)` | `({ submission, payload, correctAnswer }) -> { correct, detail }` | server only |
| `scoringInputs(ctx, validation)` | `(ctx, validation) -> raw inputs` | server only |
| `buildHints(question)` | `(question) -> [{ id, level, text }]` | client + server |
| `feedback(ctx, validation, state)` | `(ctx, validation, state) -> feedback object` | server only |
| `availableOn(context)` | `(availabilityContext) -> boolean` | client + server |

### 3.1 Version compatibility strategy (report §14)

- The **payload schema** declares `schemaVersion: { const: "1.0" }` (Task 3.2).
- `SchemaRegistry.getSchemaVersion(type)` reads that `const`.
- Plugins declare `schemaVersion`; the engine exposes `getSchemaVersion(type)`
  and `list()` includes each plugin's `schemaVersion`.
- A future plugin whose `schemaVersion` disagrees with the resolved schema
  version is rejected with `SCHEMA_VERSION_INCOMPATIBLE` at validation time.
- This task does **not** implement schema migrations — only detection, plus a
  documented strategy: same `schemaVersion` = compatible; mismatch = hard
  error; forward migrations will be a later task.

---

## 4. Payload validation routing

`engine.validatePayload(type, payload)` returns a normalized
`{ valid, errors }` object (errors are `ActivityEngineError` instances):

1. Look up the plugin → `ACTIVITY_NOT_FOUND` if missing.
2. **Schema layer:** `SchemaRegistry.validatePayload` (AJV) → errors carry
   `ACTIVITY_PAYLOAD_INVALID`.
3. **Semantic layer:** if schema passed, the plugin's `validatePayload`
   runs its activity-specific rules → errors carry
   `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.

The validator is deliberately usable **standalone** too: the schema registry
exposes `validatePayload(type, payload)` directly, so authoring tooling can
validate payloads without a plugin. Both paths share the same AJV instance.

### 4.1 Semantic rules: infrastructure + catalog

Schema validation catches shape; semantic rules catch meaning that JSON Schema
cannot express (cross-field / cross-document invariants). Reusable infra:

```js
applySemanticRules(rules, payload)        // -> { valid, errors }
createSemanticRule(id, check)             // check(payload) -> true | {valid,message,path}
new SemanticRuleSet().add(id, check).run(payload)
```

The **catalog** (`validation/semantic/index.js` → `SEMANTIC_RULES_CATALOG`)
documents every pair rule currently implemented in `schemas/validate.py` with
a stable rule id, the source location, and the owning activity type — e.g.
`drag-drop.mappings-cover-items`. This is the concrete checklist the first
real activity plugin will port into its `validatePayload`. **No per-activity
rule is re-implemented in this task** (deliberately — see §1).

---

## 5. Schema loading (no filesystem at runtime)

`validation/schemas/payload.js` and `validation/schemas/correct-answer.js`
**statically import** every schema file:

```js
import dragDrop from '../../../../../schemas/activities/drag-drop/payload.schema.json'
  with { type: 'json' }
```

Why: static imports work identically in the Node test runner, the Vite dev
server, and a production build — no `fs.readFile` at runtime, no path
resolution differences, and tree-shaking naturally keeps un-imported modules
out of the bundle. Verified in all three environments during this task
(`npm test`, `npm run build`, dev-server probe).

The `SchemaRegistry` registers the common schemas (`ids`, `media`) with AJV
first (by `$id`) so that `$ref: https://stem-quest.dev/schemas/common/...`
resolves across the whole family, then maps each activity type to its payload
and (server) correct-answer schema.

**Client vs server split:**
- Client `SchemaRegistry()` → payload + common only.
- Server `SchemaRegistry({ correctAnswerSchemas })` → adds the 10
  correct-answer schemas.
- `registerCorrectAnswer`/`getCorrectAnswerSchema` throw `ENGINE_INTERNAL`
  in client mode — correct-answer schemas cannot even be registered client-side.

---

## 6. Render context & security

`engine.render(type, input)` builds the context via `createRenderContext`:

```js
{
  question:       frozen, allow-listed question (payload, prompt…)
  state:          frozen interaction state
  capabilities:   frozen capability context (reducedMotion, viewport, pointer/input mode)
  dispatch:       callback (renderer -> engine) or null
}
```

Security guarantees (enforced, not just documented):

1. `createRenderContext` **throws `SECURITY_CORRECT_ANSWER_EXPOSED`** if the
   caller passes `correctAnswer`, `correct_answer`, or `answerKey` in the
   question. The context is then constructed from the (frozen) allow-listed
   input, so no answer data can be smuggled through.
2. The render context is deeply frozen on the shape we expose.
3. Capabilities are normalized — see §24.

---

## 7. Answer submission

`normalizeSubmission(raw, { activityType })` (in `contracts/contexts.js`)
validates and freezes the student answer before it reaches a plugin:

```js
{
  activityType,              // string
  questionId,                // required non-empty string
  response,                  // required JSON-serializable value (activity-specific shape)
  interactionMetrics: {
    attemptsUsed,            // int >= 1 (default 1)
    hintsUsed,               // int >= 0 (default 0)
    timeTakenSec,            // non-negative number | null
  }
}
```

Malformed input → `ACTIVITY_ANSWER_INVALID`. The submission response is also
swept for correct-answer keys (defense in depth).

`engine.validateAnswer(type, ctx)` (server only):
1. `normalizeSubmission` → `ACTIVITY_ANSWER_INVALID` on bad shape.
2. `SchemaRegistry.validateCorrectAnswer(type, ctx.correctAnswer)` — the
   server-only correct-answer document must match its schema, else
   `ENGINE_INTERNAL` (authoring bug, never a student error).
3. `plugin.validateAnswer({ submission, payload, correctAnswer })` →
   `{ correct, detail }`. **The correct-answer document is never part of the
   return value.**

---

## 8. Scoring inputs (D-041/D-047)

Plugins do **not** compute scores. `plugin.scoringInputs(ctx, validation)`
returns raw facts, and `engine.scoringInputs` → `normalizeScoringInputs`
guards them:

| Field | Guard |
| --- | --- |
| `correctnessFraction` | finite number in `[0,1]` — else `SCORING_INPUTS_INVALID` |
| `scorableUnits` | non-negative integer (default 1) |
| `correctUnits` | non-negative integer (default 0) |
| `attemptsUsed` / `hintsUsed` | non-negative integers (defaults 1 / 0) |
| `bonusFlags` | array of strings (filtered) |
| `interactionMetrics` | normalized subset |
| `evidence` | passthrough |

For binary activities the plugin reports `0` or `1`; for partial credit it
reports `correctUnits / scorableUnits` (D-047). The central scoring service
applies the D-023 formula using these guarded inputs. Tested: `>1`, `Infinity`,
`NaN` all rejected.

---

## 9. Hints

`engine.buildHints(type, question)` → `plugin.buildHints(question)` →
`normalizeHints`:

```js
[{ id, level, text }]
```

- Input entries are filtered to objects with non-empty `text`.
- `level` defaults to the array position; output is **sorted by level** (1 =
  most generic).
- `id` defaults to `hint-<n>` when missing.
- Hints are authored content; the hint pipeline never receives
  correct-answer data.

---

## 10. Feedback

`engine.feedback(type, ctx, validation, state)` → `plugin.feedback(...)` →
`normalizeFeedback`:

```js
{ state: 'correct'|'partial'|'incorrect'|'timeout', title, message, explanation?, guidance? }
```

- `state` must be one of the four allow-listed values, else `ENGINE_INTERNAL`.
- Output is allow-listed field-by-field, and any raw feedback containing
  `correctAnswer` / `correct_answer` / `answerKey` throws
  `SECURITY_CORRECT_ANSWER_EXPOSED` — a buggy plugin can never leak an answer
  through feedback.

---

## 11. Availability

`engine.availableOn(type, rawContext)` → normalized context →
`plugin.availableOn(context) === true`.

Context: `{ stream, level, grade, device, featureFlags, capabilities }`, all
frozen. Available-by-default is not assumed: `availableOn` is a **required**
plugin method (enforced by the registry), and the engine treats anything other
than an explicit `=== true` as unavailable. The test plugin demonstrates both
`true` and `false` paths via a `stream` hook.

---

## 12. Capability context (report §24)

Capabilities describe the current device/render session:
`{ reducedMotion, viewport: { width, height } | null, pointerType, inputMode }`.
They are **descriptive, not prescriptive**: the engine normalizes them and
hands them to plugins/renderers, but no logic branches on screen size. (The
design doc's "screen-size dependent" concern is deliberately deferred.)

---

## 13. Error model

Every engine failure is an `ActivityEngineError`:

```js
{ name, code, category, message, activityType?, path?, details? }
```

Codes (stable, grouped by category):

| Category | Codes |
| --- | --- |
| DEVELOPER | `REGISTRATION_DUPLICATE_TYPE`, `REGISTRATION_MISSING_METHOD`, `REGISTRATION_INVALID_IDENTIFIER`, `REGISTRATION_INVALID_METADATA`, `ENGINE_CLIENT_MODE` |
| AUTHORING | `ACTIVITY_PAYLOAD_INVALID`, `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`, `SCHEMA_NOT_FOUND`, `SCHEMA_VERSION_INCOMPATIBLE` |
| STUDENT_ANSWER | `ACTIVITY_ANSWER_INVALID` |
| AVAILABILITY | `ACTIVITY_NOT_FOUND`, `ACTIVITY_UNAVAILABLE` |
| SECURITY | `SECURITY_CORRECT_ANSWER_EXPOSED` |
| INTERNAL | `SCORING_INPUTS_INVALID`, `ENGINE_INTERNAL` |

`toJSON()` is machine-readable; `toPublic()` returns only `{ code, category,
message }` where `message` is a safe category-level string — server internals
and details are never exposed to students. Tested.

---

## 14. Versioning

- `SchemaRegistry.getSchemaVersion(type)` reads the payload schema's
  `schemaVersion` `const` (currently `1.0` for all 10 activities).
- `engine.getSchemaVersion(type)` exposes it; `list()` includes each plugin's
  `schemaVersion`.
- Compatibility strategy: plugins target the resolved schema version; mismatch
  → `SCHEMA_VERSION_INCOMPATIBLE` (error, not silent coercion). No migration
  engine yet — documented as future work.

---

## 15. Test plugin

`testing/test-plugin.js` is a fully-conformant **dummy** activity
(`test-plugin`, inline payload + correct-answer schemas). It exists purely so
the engine's routing, guarding, capability gating, and semantic-rule path can
be exercised end-to-end. It is NOT a production activity and must not ship.
Its `validatePayload` uses the `SemanticRuleSet` infra to prove the "clear
path" required by the task.

---

## 16. Drag-drop readiness (the first real plugin)

The engine already consumes the real drag-drop schemas:
- `SchemaRegistry.getPayloadSchema('drag-drop')` is the Task 3.2 payload
  schema.
- `validatePayload('drag-drop', example)` and
  `validateCorrectAnswer('drag-drop', answerExample)` are tested against the
  real `schemas/examples/drag-drop/*.json` files (§§"Schema registry" tests).
- The future drag-drop plugin therefore only needs to implement the 7 methods
  and its semantic rules from the catalog — the schema, registry, and routing
  are already in place.

---

## 17. Registry API

```js
registry.register(plugin)      // validates shape, rejects duplicates
registry.get(type)             // plugin | undefined
registry.has(type)             // boolean
registry.list()                // snapshot array
registry.validateRegistration(plugin)  // throws on first shape violation
```

Registration is strict: missing method, bad identifier, or missing metadata
throw immediately. This keeps the engine's plugin surface safe.

---

## 18. Client vs server facades

- **Client** — `createClientActivityEngine()`: `register`, `has`, `get`
  (returns a sanitized `pluginForClient` view), `list`, `render`,
  `validatePayload`, `getPayloadSchema`, `buildHints`, `availableOn`,
  `getSchemaVersion`. **Server-only methods and correct-answer schemas do not
  exist on this facade.**
- **Server** — `createServerActivityEngine()`: everything the client has plus
  `validateAnswer`, `scoringInputs`, `feedback`, `getCorrectAnswerSchema`.

`pluginForClient` deliberately strips `validateAnswer` / `scoringInputs` /
`feedback` from the plugin object a client can reach. Server-side validation
remains authoritative; correct answers remain server-only (D-041).

---

## 19. Dependencies

Before adding anything, `package.json` was inspected. **No new package was
installed.** `ajv` and `ajv-formats` (already present from Task 3.2's probing)
were moved from `devDependencies` to `dependencies` because the engine now
uses them at runtime in every environment. Tests use Node's built-in
`node --test` — no test framework dependency. Rationale recorded here so the
choice is explicit rather than accidental.

---

## 20. Testing

**52 tests, all passing** (`npm test`):

- `testing/engine.test.js` (37 tests): registration (valid/duplicate/missing
  method/invalid identifier/metadata/validate-without-register), payload
  validation (valid, schema-fail, semantic-fail, not-found), answer
  validation (correct/wrong/malformed/missing-correctAnswer/answer-schema
  guard), scoring inputs (normalize, `>1`, non-finite), hints (ordering,
  filtering/ids), feedback (normalized, bad state), availability (true/false,
  not-found), render, schema registry (all types, versions, real-world
  malformed payload, real examples), semantic infra, catalog completeness,
  error model (codes/categories/toPublic), and facade coverage (client
  payload/render, server correct-answer schemas, real drag-drop answer).
- `testing/security.test.js` (15 tests): server-only methods absent from the
  client engine; server-only methods present on the server engine; render
  context never contains answer keys + throws on exposure; client `get()`
  strips server-only methods; `pluginForClient` allow-list; correct-answer
  schemas not registered on the client; submission/feedback carrying answer
  keys rejected; availability context frozen; `toPublic()` never leaks
  internals.

The scripts block also gains `"test": "node --test …/*.test.js"`.

---

## 21. Lint & typecheck

`npm run lint` (oxlint) passes with zero warnings. There is no separate
typecheck step in this repo; the engine is plain ESM JavaScript by design.

---

## 22. Production build

`npm run build` (Vite 8) passes. The app bundle does not yet import the engine
(no game UI yet), so this task's bundle-security claim is proven separately —
see §23.

---

## 23. Security verification (bundle boundary)

Because `index.js` (client) is the only client-reachable entry, correct-answer
schemas and server-only validation must never appear in the client bundle.
Two throwaway probe builds were made to prove it:

1. **Client probe** — a temporary Vite entry importing only
   `src/features/activity-engine/index.js`.
2. **Server probe** — a temporary Vite entry importing only
   `src/features/activity-engine/server.js`.

Result (checked against the emitted JS):

| Marker in bundle | Client probe | Server probe |
| --- | --- | --- |
| correct-answer schema `$id` (`activities/<type>/correct-answer.schema.json`) | **absent** | present |
| correct-answer-only data fields (`mappings`, `optimalPath`, `requiredHotspots`, …) | absent (only catalog *descriptions* + field names) | present |
| server-only methods (`validateAnswer`, `scoringInputs`, `feedback`) | absent | present |

The only `correct-answer`-adjacent strings in the client bundle are the
semantic-catalog *documentation descriptions* and error message text — no
schema data and no answer JSON. Probes were deleted afterwards.

---

## 24. Capability / device handling (summary)

- Render context carries `capabilities` (reducedMotion, viewport, input/pointer
  mode) — normalized, frozen, descriptive.
- Availability context carries `device` + `featureFlags` + `capabilities`.
- No screen-size-dependent logic exists; that concern stays deferred as the
  design doc requires.

---

## 25. File layout & summary

Final file inventory (24 files) and what changed elsewhere:

| Path | Notes |
| --- | --- |
| `src/features/activity-engine/**` | New engine core (this report's sections 2–18). |
| `package.json` | Added `test` script; moved `ajv` + `ajv-formats` to `dependencies`. |
| `package-lock.json` | Updated to reflect dependency section change. |
| `reports/README.md` | This report added to the index. |
| `reports/02-development-log.md`, `03-decisions.md`, `04-todo.md` | Updated. |

---

## 26. Future work (not in this task)

- First real activity plugin (e.g. drag-drop) porting its catalog rules.
- Schema version migrations + `SCHEMA_VERSION_INCOMPATIBLE` handling flow.
- Game engine / session flow wiring the engine into the UI.
- Central scoring service consuming guarded `scoringInputs` (D-023 formula).
- Feedback timeouts / partial-credit UX.
- Server implementation of `createServerActivityEngine` behind the API
  boundary (Task with Hono service, D-019).
