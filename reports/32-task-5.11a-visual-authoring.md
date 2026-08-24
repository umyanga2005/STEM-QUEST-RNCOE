# 32 – Task 5.11A: Admin Visual Question Authoring (First Four Types)

## 1. Task status

**COMPLETED.** 2026-08-17. Task 5.11A replaces the raw-JSON authoring
experience in the Task 5.10 Question Builder with visual authoring forms for
the first four activity types — **Drag & Drop, Matching, Ordering, Sorting** —
while keeping the remaining six on the Task 5.10 raw JSON editors. The forms
operate directly on the draft's `payload` + `correctAnswer` (single source of
truth) and generate the **exact** structures the Task 3.2 JSON Schema
contracts and the Activity Engine plugins expect. 27 new tests added
(1229/1229 total); lint, build, schema validation and bundle probes all pass;
the live production smoke ran **106/106 checks** and restored the database to
its exact baseline.

## 2. Scope

- **Visual authoring forms** (`src/features/admin-questions/visual-editor/`)
  for `drag-drop`, `matching`, `ordering`, `sorting` — item/zone/card/step/
  category editors, mapping/pair/rank/assignment selectors, anchors, shuffle,
  retry/mode toggles, duplicate-id warnings.
- **QuestionEditor rework**: a clean sectioned editor — Basic information →
  Activity editor → Correct answer → Authoring metadata → Preview → Actions
  (Validate, Save Draft, Cancel). The four visual types render a visual form;
  the other six keep the raw payload/correct-answer JSON textareas.
- **Advisory integrity check** reusing the exact Activity Engine plugin
  cross-document rules (`validateMappings`/`validatePairs`/`validateSequence`/
  `validateAssignments`) so the editor flags payload↔correctAnswer
  inconsistencies without duplicating or inventing validation rules.
- **Read-only authoring** for published/archived questions (Task 5.10 D-044
  behavior preserved).
- **Tests** — pure model tests + SSR render tests + editor integration tests.

Out of scope (per plan): visual forms for the remaining six types (5.11B),
media upload to the question-media bucket, publish/review workflow, AI
authoring, bulk import, production question content, any Supabase schema
change. **No new packages added.**

## 3. Task 5.10 foundation reused

Everything persists from 5.10; nothing was reimplemented:

- **Server-authoritative `QuestionService`** with three-layer validation
  (envelope/payload/correct-answer/meta JSON Schema + plugin `validatePayload`
  + cross-document plugin rules) — untouched. The visual forms must satisfy it,
  and the tests prove they do.
- **Catalogue/list/new/edit routes and hooks** (`useCreateQuestion`,
  `useUpdateQuestion`, detail/list queries) — untouched.
- **`buildQuestionTemplate`** starter templates — a new question's visual form
  is initialized from the existing template (template system not replaced;
  template IDs are regenerated for new drafts exactly as 5.10 did).
- **`validateClientDraft` / `createDefaultClientActivityEngine`** — the
  editor's Validate button still uses these advisory checks.
- **`QuestionPreview`** — unchanged; renders a student-visible snapshot only
  and never receives `correctAnswer`.
- **Read-only published/archived** path and the `version`-preserving update
  lifecycle (D-044) — preserved.

## 4. Visual authoring architecture

```
QuestionEditor (draft state lives here)
   ├─ VisualFormFor(activityType, draft, onChange)   ── registry lookup
   │      └─ DragDropForm / MatchingForm / OrderingForm / SortingForm
   │             ├─ model.js (pure, DOM-free)   — nextId, makers, builders,
   │             │                                buildAnchors, moveInList, …
   │             └─ primitives.jsx              — Field, Chip, IdInput, Toggle,
   │                                              MediaReferenceEditor, …
   ├─ checkAnswerIntegrity(type, payload, correctAnswer)  (registry.js)
   │      └─ reuses plugin rules verbatim (client-safe, advisory)
   └─ QuestionPreview (student-visible snapshot; correctAnswer never passed)
```

Design decisions:

- **Thin forms, single source of truth.** The form components hold no internal
  copy of the answer; they write straight into the draft `payload` +
  `correctAnswer` and raise `onChange`. The correct-answer section therefore
  needs no separate UI for the four visual types (its "derived from the visual
  form" note is purely informational).
- **Pure model module** (`model.js`) keeps every mutation testable without a
  DOM: `makeDragItem`/`makeZone`/`makeLeftCard`/`makeRightCard`/
  `makeDistractor`/`makeOrderItem`/`makeCategory`/`makeSortItem` allocate the
  next free identifier (`nextId` reuses `^[a-z][a-z0-9_]{0,31}$`); answer
  builders preserve existing mappings/pairs where entities still exist, default
  new entities to the first zone/right/category, and re-home dangling
  references when a zone/target/category is removed.
- **Plugin rules, not new rules.** The advisory `checkAnswerIntegrity` calls
  the exact `validateMappings`/`validatePairs`/`validateSequence`/
  `validateAssignments` functions the server's third validation layer uses —
  the UI neither duplicates nor invents semantics, and no correct-answer schema
  is imported into the browser (bundle boundary unchanged).
- **Registry split for lint hygiene.** Non-component exports live in
  `registry.js`; `index.jsx` exports only the `VisualFormFor` component
  (react fast-refresh / only-export-components clean).

## 5. Drag & Drop form

- **Items**: add/remove, editable label (or optional image ref), per-item
  "Goes to" zone selector driving the mapping. **Zones**: add/remove, editable
  label/aria-label. Both enforce the 2–8 / 1–5 schema bounds at the UI level
  (Remove disabled at the minimum; Add disabled at the maximum) with duplicate
  `id` warnings.
- **Behaviour**: `mode` (single-target default / multi-target), `randomizeItems`,
  `allowRetry` toggles. When `mode` is single-target the form collapses to a
  single zone (the plugin treats every unmapped-but-relevant item as targeting
  the one zone), matching the plugin semantics.
- **Answer**: `buildDragDropAnswer` emits `{ mappings: [{ itemId, zoneId }] }`
  — every item gets exactly one mapping; single-target mode maps items to the
  sole zone; removing a zone re-homes its items to the first live zone.
- Schema-valid template render: 2 items × 1 zone; add one of each → 3×3, all
  mapped, `validateMappings` passes.

## 6. Matching form

- **Left column**: add/remove left cards (label or optional image ref), each
  with a "Pairs with" selector. **Right column**: add/remove right cards +
  up to 3 **distractors** (never selectable as a pair). **Behaviour**: `shuffle`
  toggle.
- **Answer**: `buildPairs` emits `{ pairs: [{ leftId, rightId }] }`. Shared
  targets are allowed (multiple lefts may pair with one right); a distractor
  can never receive a pair. Removing a right card re-homes its lefts to the
  first remaining right (or leaves them unpaired and the integrity rule flags
  them).
- Constraints: left 2–8, right 2–8, distractors ≤3; the form enforces the
  bounds and `validatePairs` cross-checks coverage both ways.

## 7. Ordering form

- **Ranked list**: each step shows its rank (1-based), editable label (or
  optional image ref/aria-label), up/down reorder controls (`moveInList`), and
  a "Lock here" anchor toggle. Anchors ≤3 (`buildAnchors` writes
  `{ position, itemId }` with `position` = current index so anchors are always
  consistent with the order).
- **Behaviour**: `shuffle` toggle. When every step is anchored AND shuffle is
  on, the form shows the "all steps anchored" advisory warning (the server
  rejects that combination via `validateSequence`).
- **Answer**: `buildOrder` emits `{ order: [ids] }` in the authored sequence
  (position = rank). Removing a step drops any anchor pointing at it and
  rebuilds remaining anchors; adding a step appends after the current last.
- Template is 3 steps; the tests verify reorder + anchors produce a fully valid
  draft and that a 4-step list with two anchors survives item removal with the
  remaining anchor re-positioned.

## 8. Sorting form

- **Categories**: add/rename/remove category groups (each showing its assigned
  item count), 2–5 enforced. **Items**: add/remove item cards with a per-item
  category selector driving the assignment. **Behaviour**: `shuffle` toggle.
- **Answer**: `buildSortingAnswer` emits `{ assignments: [{ itemId, categoryId }] }`
  — every item assigned; new items default to the first category; removing a
  category re-homes its items to the first remaining category. Unassigned items
  surface through the advisory integrity rule (which is exactly the server's
  `validateAssignments` rule).
- Template: 3 items × 2 categories; add category + item → 4×3 with all four
  assigned and valid.

## 9. Validation strategy

- **Client advisory only**: the editor shows field-level problems (e.g. an
  item with no label — surfaced via the schema's `anyOf [label, text]`/`[image]`
  — or a duplicate id) and a general `ValidationSummary`, using
  `validateClientDraft` (bundled schemas) + the plugin cross-document rules.
  The server **always** re-validates authoritatively via `QuestionService`'s
  three layers; client checks never gate persistence.
- **Server errors preserved**: on a failed Save, the returned `fields[]` map
  into field-level messages and the form state is **not** reset (5.10's
  behavior on the raw path is kept for the other six types).
- **No duplicated/invented rules**: every advisory rule is either a bundled
  JSON Schema check or a verbatim reuse of a plugin function.

## 10. Correct-answer security boundary

- The four visual types generate `correctAnswer` entirely client-side as the
  user edits; the correct-answer section renders the "derived from the visual
  form" note and **no raw JSON** for them (the raw textarea remains only for
  the six non-visual types).
- `correctAnswer` is never passed to `QuestionPreview` (unchanged), and the
  render context keeps throwing `SECURITY_CORRECT_ANSWER_EXPOSED` if it ever
  leaks (guard confirmed live in the bundle).
- The bundle probe still reports **0 files** containing the
  `correct-answer.schema.json` `$id`, `service_role` credentials, or
  `public.admins`/`is_admin()` identifiers (see §14).

## 11. Preview behavior

`QuestionPreview` is untouched. It renders a student-visible snapshot built
from the draft's `payload` + envelope content through
`createDefaultClientActivityEngine().render(...)` — no correct-answer overlay,
no correctAnswer data anywhere in the preview's inputs. Visual forms therefore
have zero effect on the preview surface; the editor integration test asserts
"Student-facing preview" still renders.

## 12. Tests

`src/features/admin-questions/testing/visual-forms.test.js` — 27 new tests:

- **Model** (pure, no DOM): `nextId` collision-free reuse; `isValidId` against
  the shared identifier pattern; per-type add/edit/remove flows producing fully
  schema-valid drafts (validated through the server's `createQuestionValidator`
  — the strongest "generated payload/correctAnswer validates" check);
  editing an existing draft preserves ids/mappings/pairs/assignments; removing
  a zone/step/category re-homes references and rebuilds anchors; a shared
  target / distractor-never-paired invariant; a label-less item surfaced as
  invalid; shuffle+all-anchored surfaced as invalid; an unassigned sorting item
  surfaced by the exact `validateAssignments` rule.
- **SSR render** (no jsdom — `renderToStaticMarkup` via `vite.ssrLoadModule`):
  each form renders its template's items/zones/cards/steps/categories and its
  selectors; the disabled (published/read-only) path renders every control
  `disabled` with no save action.
- **Editor integration**: registry exposes visual forms for exactly the first
  four types (`hasVisualForm` true×4, false×6); the editor renders the visual
  form with no raw JSON for the four types and keeps the raw JSON editors for
  the other six; editing an existing draft renders its values (ids preserved);
  published questions render read-only; the advisory integrity check flags an
  unmapped item using the exact plugin rule.

Run: `node --test src/features/admin-questions/testing/visual-forms.test.js`.

## 13. Build / lint / schema results

```
npm test                  → 1229/1229 pass (27 new; baseline 1202 intact)
npm run lint              → clean (0 warnings)
npm run build             → passes; AdminQuestionEditorPage chunk 197.49 kB
                            (gzip 53.92 kB) — up from 5.10's 176 kB for the forms
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
```

## 14. Bundle security probe

`grep` over `dist/assets/*.js`:

- `service_role` credential strings: **0 files**
- `correct-answer.schema.json` `$id`: **0 files**
- `public.admins` / `is_admin()` identifiers: **0 files**
- `SECURITY_CORRECT_ANSWER_EXPOSED` guard: **active** (1 file, the shared
  render-context guard, throwing `Correct-answer data must never reach the
  render context.`)

## 15. Supabase impact

**None.** No schema change, no new table, no migration. 5.11A is entirely a
browser-feature change (new `visual-editor` feature + `QuestionEditor` rework)
plus tests. The Task 5.10 `questions.meta` migration (`0004`) remains the only
schema change and is already applied. Live smoke verified the database returns
to its exact baseline after the run (`questions=0 students=0 … admins=0`).

## 16. Files created

- `src/features/admin-questions/visual-editor/model.js` — pure authoring model
  (id allocation, entity makers, answer builders, reordering).
- `src/features/admin-questions/visual-editor/primitives.jsx` — reusable form
  primitives (`Field`, `Section`, `Row`, `Chip`, `LabeledInput`, `IdInput`,
  `MediaReferenceEditor`, `Toggle`, `SelectField`, `AddButton`, `RemoveButton`,
  `ReorderControls`, `ValidationSummary`).
- `src/features/admin-questions/visual-editor/drag-drop-form.jsx`
- `src/features/admin-questions/visual-editor/matching-form.jsx`
- `src/features/admin-questions/visual-editor/ordering-form.jsx`
- `src/features/admin-questions/visual-editor/sorting-form.jsx`
- `src/features/admin-questions/visual-editor/registry.js` — form registry +
  `hasVisualForm` + `checkAnswerIntegrity` (non-component exports).
- `src/features/admin-questions/visual-editor/index.jsx` — `VisualFormFor`
  component (only export).
- `src/features/admin-questions/testing/visual-forms.test.js` — 27 tests.
- `reports/32-task-5.11a-visual-authoring.md` — this report.

## 17. Files modified

- `src/features/admin-questions/components/QuestionEditor.jsx` — sectioned
  layout (Basic information / Activity editor / Correct answer / Authoring
  metadata / Preview / Actions), visual-form integration, read-only
  published/archived, synchronous draft initialization from the query cache.
- `src/pages/admin.css` — `aq-*` visual-editor styles (sections, chips, media,
  toggles, reorder/rank, hints editor, validation summary).
- `reports/README.md` — index entry.
- `reports/02-development-log.md` — session entry.
- `reports/04-todo.md` — 5.11A done; remaining 5.11B scope noted.

## 18. Known limitations

- The remaining six activity types (fill-complete, image-interaction, pattern,
  memory, scenario-challenge, number-logic) still author via the raw JSON
  editors — the intended 5.11B follow-up.
- Media refs are presentational placeholders; no Storage upload integration
  (question-media bucket policy exists from 0003).
- Publishing is not implemented; the lifecycle is draft/archived + write-
  protected published (D-044).
- Client validation is advisory; the server re-validates everything.
- Preview uses public scene geometry only (no correct-answer overlay).

## 19. Next recommended task

Task 5.11B — visual authoring forms for the remaining six activity types
(fill-complete, image-interaction, pattern, memory, scenario-challenge,
number-logic) using the same thin-form/model/registry architecture, followed by
media upload integration and a publish/review workflow. Not started (per the
stop rule after 5.11A).

## Verification evidence

```
npm test                   → 1229/1229 pass (27 new)
npm run lint               → clean
npm run build              → passes (editor chunk 197.49 kB / gzip 53.92 kB)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
bundle probe               → 0 files (credentials, answer $ids, admins ids);
                             SECURITY_CORRECT_ANSWER_EXPOSED guard active
npm run smoke:production   → 106/106 PASS; DB restored to exact baseline
```

## Revision history

- 2026-08-17 — Initial report. Task 5.11A complete; 5.11B not started.