# 08 – Task 3.2 — Activity JSON Schemas & Validation

> **Status:** COMPLETED (2026-08-12).
> **Scope:** machine-readable JSON Schema (draft 2020-12) for the 10 activity
> types (payload + server-only correct-answer), 4 common reusable schemas,
> 70 worked examples (7 per activity), a 3-layer validator, and this report.
> **Implements:** D-021 (activity-type schema), D-041 (correctness boundary),
> D-026 (JSONB payload/correct_answer split).
> **No code, no UI, no plugins, no DB changes, no packages installed.**

---

## 1. Executive Summary

Task 3.2 turns the Task 3.1 content model (§7 blueprints) and the Activity
Engine design (`05-activity-engine-design.md`) into concrete, validated JSON
contracts for every interactive activity type. Deliverables:

1. **24 JSON Schemas** (draft 2020-12): 20 activity schemas (10 payload +
   10 correct-answer) + 4 common schemas (`ids`, `media`, `question`, `meta`).
2. **70 example files** — 7 per activity: minimal-valid payload, Grade 6–7
   payload, Grade 9–11 payload, valid correct-answer, partial-credit
   correct-answer, invalid payload, invalid correct-answer.
3. **`schemas/validate.py`** — 3-layer validator (schema meta-validation,
   example conformance, cross-file semantic pair checks). `RESULT: PASS`.
4. **This report** — conventions, decisions, per-activity summaries, and how
   the schemas map to the engine's scoring boundary (D-041).

Key principle carried over from Task 3.1: the **payload** carries only what
students see (game rules excluded), and the **correct-answer** schema encodes
the server-side expected/acceptable response — never sent to the client
(D-041). No activity resembles traditional A/B/C/D MCQ (game rule 5).

---

## 2. File Layout

```
schemas/
  common/                       # reusable building blocks (4)
    ids.schema.json             # slug id: ^[a-z][a-z0-9_]{0,31}$
    media.schema.json           # storage ref + alt + role + dims
    question.schema.json        # full question record wrapper (Task 3.1 §2)
    meta.schema.json            # authoring/analytics meta wrapper (Task 3.1 §2)
  activities/<type>/            # one dir per activity type (10)
    payload.schema.json         # student-facing contract
    correct-answer.schema.json  # server-only expected response
  examples/<type>/              # 7 worked examples per activity (70 total)
    minimal-valid-payload.json
    valid-payload-grade6-7.json
    valid-payload-grade9-11.json
    valid-correct-answer.json
    partial-credit.json
    invalid-payload.json
    invalid-correct-answer.json
  validate.py                   # 3-layer validator (Python, jsonschema 4.26)
```

Every schema declares `"$schema": draft 2020-12`, a stable `$id` under
`https://stem-quest.dev/schemas/...`, an `additionalProperties: false` guard,
and a `$comment` stating the activity's anti-MCQ rationale. All refs resolve
to the local registry in `validate.py`.

---

## 3. Common Schemas

| Schema | Purpose |
| --- | --- |
| `ids.schema.json` | Every entity id: lowercase slug, `^[a-z][a-z0-9_]{0,31}$`, max 32. Enforced across all activities. |
| `media.schema.json` | Media reference = **storage path**, never binary: `question-media/<set>/<kind>/<file>.(jpe?g|png|webp)`, required `alt`, optional `role` (hero/instruction/diagram/illustration/audio) and natural `width`/`height` for aspect-ratio hints. |
| `question.schema.json` | Wrapper for the full question record (relational + payload + correct_answer) per Task 3.1 §2 — enables authoring-time validation of a complete record in one pass. |
| `meta.schema.json` | Wrapper for the future `questions.meta` JSONB (educational objective, feedback templates, provenance, review bookkeeping) per Task 3.1 §2/D-043. |

The storage-bucket contract (`student-avatars` ≤200 KB, `question-media`
≤1 MB) is enforced in SQL (`0003_storage_buckets.sql`) and reflected in the
media ref pattern; MIME is whitelisted at the bucket (D-042) and the schema
path pattern.

---

## 4. Activity Schema Matrix

All 10 types have a payload schema (P) and a correct-answer schema (C).
The table records the scoring boundary: what the plugin reports vs. what the
central service compares (D-041).

| # | Activity | Payload key shape | Correct-answer shape | Scoring notes |
| --- | --- | --- | --- | --- |
| 1 | Drag & Drop | `items[]`, `zones[]`, `mode` (multi/single-target) | `mappings[]` (itemId→zoneId) | correctnessFraction = correct placements ÷ items; semantic rule: every item mapped exactly once |
| 2 | Matching | `leftItems[]`, `rightItems[]`, optional `distractors[]` | `pairs[]` (leftId→rightId) | per-pair credit; distractors must not be matched |
| 3 | Fill/Complete | `template` with `___` placeholders, `blanks[]` (type text/number/expression) | `answers[]` (exact accepted strings), `numeric[]` (value±tolerance / min-max), `expression[]` (normalized forms) | per-blank partial credit; explicit tolerance, no fuzzy matching |
| 4 | Image Interaction | `image`, `imageWidth/Height`, `mode` (tap/label), `hotspots[]` (normalized % coords) | tap: `requiredHotspots[]`; label: `placements[]` | % coordinates survive responsive resizing; tap = all required hit |
| 5 | Memory | `cards[]`, `revealSeconds`, `recallPrompt`, `deckType` (pairs/sets) | `groups[]` (groupId→cardIds) | pairs: groups of 2; sets: groups of 3–4; every card accounted |
| 6 | Ordering | `items[]`, optional `anchors[]`, `shuffle` | `order[]` (permutation of item ids) | anchors pre-locked; per-position credit |
| 7 | Pattern | `sequence[]`, `interaction` (construct-next/fill-missing/complete-sequence), `candidates[]` | `type` (candidate/numeric/text) with acceptable ids/values/strings | multiple valid solutions explicitly supported via `acceptableIds` |
| 8 | Scenario Challenge | `scenarioText`, `entryDecision`, `decisions[]` (decision→options→nextDecision/outcomeText) | `optimalPath[]` (decisionId+optionId) + optional `acceptableOptions` | branched decision tree, not MCQ; partial credit along path |
| 9 | Number/Logic Challenge | `problem`, `answerFormat`, optional `parts[]` | `type` (exact/tolerance/range/fraction/percent/sequence/accepted-set) + per-part specs | float-safe via explicit tolerance; per-part partial credit |
| 10 | Sorting | `items[]`, `categories[]` (2–5), `shuffle` | `assignments[]` (itemId→categoryId) | every item assigned to exactly one category |

Each activity schema enforces domain constraints directly:
- min/max cardinalities (e.g. drag-drop 2–8 items, memory 4–12 cards,
  scenario 1–8 decisions with 2–4 options each, sorting 3–12 items / 2–5
  categories).
- `anyOf` label-or-image on draggable/card/element shapes.
- `if/then` (or `allOf` + `if`) for mode/type-dependent required fields
  (image-interaction tap vs label; pattern interaction modes; number-logic
  answer type; scenario option `nextDecision` null-vs-id).
- float-safe comparison is expressed as **explicit tolerance fields** rather
  than implementation fuzziness.

---

## 5. Conventions Adopted

1. **Payload is student-facing only.** No game scalars, no answer leakage
   (except constructed pools like memory cards/pattern candidates that are
   inherently visible). Answers live in `correct-answer.schema.json` only —
   matches the server-only storage rule (D-041/D-026).
2. **`additionalProperties: false` everywhere** — typos and accidental keys
   fail loudly at authoring time.
3. **Strict `$id` + local registry.** External refs use absolute
   `https://stem-quest.dev/schemas/...` URIs resolved by the validator's
   registry, keeping schemas portable and CDN-publishable.
4. **IDs are lowercase slugs** (regex shared via `common/ids.schema.json`).
5. **No free-form fuzzy matching.** Where variation is legitimate (spelling,
   equivalent expressions), the author enumerates the accepted set in
   `accepted[]`; normalization is limited to trim + case-fold (text) or
   whitespace normalization (expressions). No substring heuristics.
6. **Partial credit is first-class.** Every correct-answer schema is
   structured so the scoring service can award a fraction per scorable unit
   (item, pair, blank, position, group, step, part, path node). The
   `partial-credit.json` examples demonstrate the exact same shape as
   `valid-correct-answer.json` — partial credit is a *scoring* behavior, not
   a different data shape.
7. **Invalid examples are genuinely invalid** at the schema layer
   (`invalid-*` prefix), plus semantic rules checked cross-file in Layer 3.

---

## 6. Partial-Credit & Scoring Semantics (D-041 mapping)

Following D-041, plugins **report inputs** (the student's submitted state);
the **central scoring service** computes `correctnessFraction`. These
fractions are the plugin-side contracts the schemas must support:

| Activity | Scorable unit | correctnessFraction definition |
| --- | --- | --- |
| Drag & Drop | item placement | correctPlacements ÷ totalItems |
| Matching | pair | correctPairs ÷ totalLeftItems |
| Fill/Complete | blank | correctBlanks ÷ totalBlanks |
| Image Interaction | hotspot / label | hitRequired ÷ requiredTotal (tap); correctPlacements ÷ labelTotal (label) |
| Memory | group | completedGroups ÷ totalGroups |
| Ordering | position | correctPositions ÷ totalItems |
| Pattern | element / step | correctConstructed ÷ requiredCount |
| Scenario | decision step | acceptableChoices ÷ optimalPathLength (each step: optimal or in acceptableOptions) |
| Number/Logic | part / single answer | correctParts ÷ totalParts (multi-part) or 1.0/0.0 (single) |
| Sorting | item assignment | correctAssignments ÷ totalItems |

Fractions are floats in `[0,1]`; the service maps them to the base score per
the Task 3.1 scoring model (unchanged, D-023).

---

## 7. Validator (`schemas/validate.py`)

Three layers, run with `python3 schemas/validate.py`:

1. **Meta-validation** — every schema file is checked against the JSON Schema
   2020-12 metaschema (catches malformed schemas / bad keywords).
2. **Example conformance** — every example validates against its activity
   schema; `invalid-*` files must FAIL, all others must PASS (asserts the
   examples really demonstrate what they claim).
3. **Semantic pair checks** — for one representative payload↔correct-answer
   pair per activity, cross-file reference integrity is verified:
   - drag-drop: mappings cover every item exactly once; zones exist.
   - matching: every left item paired once; right ids exist.
   - fill-complete: blank ids referenced exist and match blank types.
   - image-interaction: requiredHotspots/placements reference existing
     hotspots/labels; mode consistency.
   - memory: groups cover every card exactly once, no duplicates.
   - ordering: order is a permutation of item ids; anchors respected.
   - pattern: acceptableIds exist in candidates; missingAt in range.
   - scenario: entry/next decision ids exist; optimalPath options belong to
     their decision.
   - number-logic: multi-part payload ⇔ per-part answers; type-required fields
     present (value/tolerance/min/max/numerator/denominator/values/accepted).
   - sorting: assignments cover every item once; categories exist.

Result: **PASS** — 24 schemas meta-valid, 70 examples conformant, 10/10
pairs consistent.

---

## 8. Example Coverage Notes

Each activity ships 7 examples:

- **minimal-valid-payload.json** — smallest valid instance.
- **valid-payload-grade6-7.json** / **valid-payload-grade9-11.json** —
  age-band appropriate content (G6–7 concrete/everyday; G9–11 symbolic/
  scientific), demonstrating the same schema serves both bands (level ≠
  grade, D-045).
- **valid-correct-answer.json** — the expected server-side answer for the
  representative payload.
- **partial-credit.json** — valid correct-answer shape enabling fractional
  scoring (identical shape to valid-correct-answer).
- **invalid-payload.json** — schema-invalid payload (bad id, missing required
  field, wrong cardinality, out-of-range value, unknown key).
- **invalid-correct-answer.json** — schema-invalid correct answer (wrong
  field name, missing required field, out-of-range cardinality).

---

## 9. Validation Bugs Caught & Fixed During Authoring

1. **`media.schema.json` ref pattern** — the literal dot in the filename was
   over-escaped (`\\\\` in JSON decodes to a literal backslash in the regex,
   making every ref fail). Fixed to `\\.`.
2. **Memory minimal example** had 2 cards but the schema (correctly) requires
   ≥4 for a pairs deck; the example was expanded to 4.
3. **number-logic partial-credit** needed the top-level `type` field (allOf
   guard) alongside `parts`; added.
4. **scenario grade6-7 example** carried a `maxDepth` key that is not part of
   the schema (max depth is bounded by the decisions graph, not a field);
   removed to keep examples honest.
5. **Cross-file consistency** — `valid-correct-answer` files were adjusted so
   their referenced ids match the paired payload in Layer 3 (e.g. fill-complete
   answers reference grade6-7 blank ids only).

---

## 10. Open / Follow-up Items

- The `question.schema.json` and `meta.schema.json` wrappers validate a full
  record but are not yet wired to the Admin Question Builder (Task 16 of
  `07-task-3.1-content-model.md`).
- A JSON Schema linter/pre-commit hook wrapping `validate.py` is recommended
  when the content pipeline is built (bulk import, AI generation — Task 17/18).
- Semantic rules currently live in the validator's Layer 3 as Python; they
  should be ported to the Activity Engine's authoring-time validation when
  plugins are implemented (Stage 4).
- `acceptableOptions` in scenario/`acceptableIds` in pattern: values are
  enumerated by authors; a future AI-assisted authoring flow (Task 3.1 §18)
  must generate these server-side and never derive them client-side.

---

## 11. Commands & Verification

- `python3 schemas/validate.py` → `RESULT: PASS`
  - Layer 1: 24 schemas, 0 problems
  - Layer 2: 70 examples, 0 problems
  - Layer 3: 10/10 pairs consistent
- No packages installed (jsonschema 4.26 already present in the environment).
- No Supabase/DB/UI/plugin changes.
