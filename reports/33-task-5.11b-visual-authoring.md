# 33 – Task 5.11B: Admin Visual Question Authoring (Remaining Six Types)

## 1. Task status

**COMPLETED.** 2026-08-17. Task 5.11B completes the visual authoring story
begun in Task 5.11A: the remaining six production activity types — **Fill &
Complete, Image Interaction, Pattern, Memory, Scenario Challenge, Number /
Logic** — now use visual authoring forms instead of the raw JSON editors. All
ten production activity types ship visual forms; the raw JSON editors remain
only as the intentional fallback for unknown/future types. The forms operate
directly on the draft's `payload` + `correctAnswer` (single source of truth)
and generate the **exact** structures the Task 3.2 JSON Schema contracts and
the Activity Engine plugins expect. 22 new tests added (1251/1251 total);
lint, build, schema validation and bundle probes all pass; the live production
smoke ran **106/106 checks** and restored the database to its exact baseline.
Task 5.11A was not rewritten.

## 2. Scope

- **Six new visual authoring forms** (`src/features/admin-questions/visual-editor/`)
  for `fill-complete`, `image-interaction`, `pattern`, `memory`,
  `scenario-challenge`, `number-logic`, each generating the exact payload and
  correctAnswer documents.
- **Model helpers** (`model.js`) for each type: blank / hotspot / pattern
  element / memory card+group / scenario decision+option / number-logic part
  factories and the builders that derive the correct-answer document from
  authored state.
- **Registry + editor wiring**: `VISUAL_FORMS` and the advisory
  `INTEGRITY_RULES` extended to all ten types; `QuestionEditor` renders visual
  forms for all ten and keeps raw JSON only for unknown types.
- **Correct answer remains server-only**: cross-document rules run as advisory
  checks in the editor (reusing the plugin exports verbatim) and authoritatively
  in `createQuestionValidator` — no correct-answer schema enters the client
  bundle.
- Explicitly **out of scope** (same boundary as 5.11A): media upload, a
  publish/review workflow, AI authoring, bulk import, production question
  content, Supabase schema/migration changes, new packages.

## 3. Task 5.10 / 5.11A foundation reused

- The thin-form / shared-model / registry architecture from 5.11A is unchanged.
  The first four forms (`drag-drop`, `matching`, `ordering`, `sorting`) are
  untouched and still passing.
- `QuestionEditor` owns draft state; each form receives `payload`,
  `correctAnswer`, `onChange({ payload, correctAnswer })`, `disabled`; forms
  write directly into both documents.
- `primitives.jsx` supplies `Section`, `Row`, `Chip`, `LabeledInput`,
  `NumberField`, `IdInput`, `MediaReferenceEditor`, `Toggle`, `SelectField`,
  `AddButton`, `RemoveButton`, `ReorderControls`, `ValidationSummary`.
- `templates.js` `buildQuestionTemplate` seeds each of the six types with a
  minimal schema-valid payload skeleton.
- `validateClientDraft` (payload-only advisory) and `checkAnswerIntegrity`
  (cross-document advisory) drive the in-editor warning surface; the server
  stays authoritative.

## 4. Architecture additions (5.11B)

- **`model.js`**: 22 new exported helpers — `makeBlank`, `buildBlankAnswers`,
  `makeHotspot`, `makeImageLabel`, `buildImageAnswer`, `makePatternElement`,
  `PATTERN_SHAPES`, `withPatternKind`, `buildPatternAnswer`,
  `makeMemoryCard`, `makeMemoryGroup`, `buildMemoryGroups`, `makeDecision`,
  `makeScenarioOption`, `buildScenarioAnswer`, `makeNumberLogicPart`,
  `buildAnswerSpec`, `buildNumberLogicAnswer`. Each builder is strict about
  references: deleted/renamed entities are repaired or re-homed, never left
  dangling, and unknown references are dropped (advisory rules then flag any
  remaining inconsistency).
- **`registry.js`**: `VISUAL_FORMS` now maps all ten slugs; `INTEGRITY_RULES`
  reuses the exact plugin cross-document exports — `validateBlankAnswers`,
  `validateImageInteractionAnswer`, `validatePatternAnswer`,
  `validateMemoryAnswer`, `validateScenarioAnswer`,
  `validateNumberLogicAnswer`. `checkAnswerIntegrity(activityType, payload,
  correctAnswer)` keeps the same signature. No rule is duplicated.
- **`QuestionEditor.jsx`**: the "unknown activity type" branch is the only
  place raw JSON editors are offered; the correct-answer section now shows the
  generic "derived from the visual form" note for every production type.

## 5. Fill & Complete form

`fill-complete-form.jsx` — template with `___` placeholders (one per blank, in
order), keypad selector, and a numbered blank list. Each blank edits type
(text / number / expression), label, id, prefix, suffix, max length. Per-blank
answer editors: text/expression accepted-forms (add/remove, 1–8) and numeric
value ± tolerance or min–max range. Duplicate blank ids and placeholder-count
mismatches are warned. Correct answer built by `buildBlankAnswers` into the
`answers` / `numeric` / `expression` groups, emitted only when non-empty.

## 6. Image Interaction form

`image-interaction-form.jsx` — media reference (no upload), pixel width/height,
tap / label mode (switching to label creates a starter label), hotspots with
normalized % center, circle/rect hit region, optional label + aria, and a
"Required" toggle in tap mode. Label mode adds draggable labels with a
"Placed on" hotspot selector. Correct answer is `{ mode, requiredHotspots }`
(tap) or `{ mode, placements }` (label), built by `buildImageAnswer`.

## 7. Pattern form

`pattern-form.jsx` — interaction mode (construct-next / fill-missing /
complete-sequence) with the conditional constructCount and missingAt
selectors; the visible sequence (reorderable, element kind = number / text /
shape / image); the public candidate bank; and the correct-answer rule
(candidate with per-candidate "Acceptable" toggles + all-candidates shortcut,
numeric value ± tolerance or range, text accepted strings). Fresh/empty
answers default to "all candidates acceptable" so the toggle matches the
emitted document; a single numeric/text answer for constructCount > 1 is
flagged. `buildPatternAnswer` is strict — it uses exactly the given
acceptableIds, never an implicit fallback.

## 8. Memory form

`memory-form.jsx` — deck settings (deckType pairs/sets, revealSeconds,
maxAttempts, recallPrompt, shuffle), the card list (text or image, id, aria,
per-card "Group" selector), and the answer groups (chips with remove, add up
to 6, min 2 required). Group sizes follow `groupSizeRange` from
`memory-controller.js` (pairs = 2, sets = 3–4); an odd pairs deck and
duplicate card ids are warned. Groups live **only** in `correctAnswer`
(`{ groups: [{ groupId, cardIds }] }`); `buildMemoryGroups` re-homes any card
whose group was removed to the first group, preserving coverage.

## 9. Scenario Challenge form

`scenario-challenge-form.jsx` — mission text, presentational media (≤ 3), entry
decision selector, and the decision tree: each decision node (id, text,
optimal-option selector, remove) contains 2–4 options (text, consequence,
next-decision link to another node or terminal, acceptable toggle). Adding a
decision creates two starter empty options; removing a decision repoints any
option that referenced it to terminal. `buildScenarioAnswer` walks the actual
route from the entry decision through each chosen option's `nextDecision`
link, so `optimalPath` is traversable by construction; `acceptableOptions`
carries the alternate acceptable choices per decision.

## 10. Number / Logic form

`number-logic-form.jsx` — problem text, answer format (integer / decimal /
fraction / percent / sequence / expression), input mode, show-work toggle, and
a single-part vs multi-part switch. The single-part "Correct-answer spec" is a
type selector constrained by the plugin's exported `COMPATIBLE_TYPES`
(exact / tolerance / range / fraction / percent / sequence / accepted-set) with
the matching fields. Multi-part questions author per-part format + spec;
`buildNumberLogicAnswer` emits one `{ partId, type, ... }` entry per payload
part (D-075 parts-only scoring — never invented) plus the schema-required
neutral top-level `type` (matching the `partial-credit.json` example).

## 11. Validation strategy

- **Authoring-time advisory** (client): `validateClientDraft` validates the
  payload against the payload schemas; `checkAnswerIntegrity` runs the six
  plugins' cross-document rules verbatim over payload + correctAnswer and
  surfaces them in the editor's `ValidationSummary`.
- **Authoritative** (server): `createQuestionValidator` runs the full
  three-layer check — envelope schema (payload + correctAnswer $refs per
  activity), the plugin's payload semantic rules, and the same cross-document
  rule — on every save. The smoke's "rejected draft NOT persisted" check and
  `QUESTION_VALIDATION_FAILED` path confirm the server rejects what the
  advisory UI only warns about.
- All new model tests round-trip drafts through `createQuestionValidator`.

## 12. Correct-answer security boundary

- The client **never imports** the server-only correct-answer schemas; the
  forms generate the correct-answer document from authored state, and the
  plugin cross-document rules are the only correct-answer-aware code in the
  browser (they are already shipped by the client engine for rendering/UI
  decisions).
- `QuestionPreview` reduces the draft to its student-visible fields before
  calling `engine.render`, which never reads the correct answer
  (`SECURITY_CORRECT_ANSWER_EXPOSED` still guards the renderer).
- Bundle probes confirm the correct-answer schema `$id`s, `service_role`
  credentials, and `public.admins`/`is_admin()` strings are all **0 files** in
  `dist/assets`.

## 13. Preview behavior

Unchanged from 5.11A: the preview is student-facing and never receives the
correctAnswer. All ten forms note that the correct answer is derived visually
and never sent to students. Published/archived questions render every control
`disabled` and hide the save/create actions (D-044).

## 14. Tests

- **Model** (12 new): fill-complete add/numeric-expression/edit-existing;
  image-interaction tap + label placement derivation; pattern construct-next
  candidate validity, `withPatternKind` kind switching, numeric range + text;
  memory pairs grouping + removed-group re-homing; scenario tree optimal path +
  acceptable options; number-logic single-part, multi-part `parts-match`, and
  fraction format compatibility. All validated via `createQuestionValidator`.
- **Render** (6 new): each of the six forms renders from its template with the
  expected sections/labels.
- **Editor integration** (3 changed + 2 new): the first-four-only registry
  assertion is now all-ten; the raw-JSON-for-six assertion is now
  "raw JSON only for unknown types"; a new loop asserts every production type
  renders the visual form with no `Payload (JSON)`. Existing published
  read-only, preview-safe, and id-preservation tests still pass.
- **Total**: 49 visual-form tests; full suite **1251/1251**.

## 15. Build / lint / schema results

```
npm run lint               → clean
npm run build              → passes (admin editor chunk 237.87 kB / gzip 62.80 kB)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
```

## 16. Bundle security probe

```
grep -l "service_role" dist/assets/*.js                    → 0 files
grep -o "correct-answer\.schema\.json" dist/assets/*.js    → 0 files
grep -l "public\.admins" dist/assets/*.js                  → 0 files
grep -l "is_admin()" dist/assets/*.js                      → 0 files
grep -l "SECURITY_CORRECT_ANSWER_EXPOSED" dist/assets/*.js → 1 file (guard active)
```

## 17. Supabase impact

None. No schema change, no migration, no RLS change, no new table/column. The
correct-answer flow, admin endpoints, and activity-engine validation are
unchanged. The only source change outside the visual-editor is the export of
`COMPATIBLE_TYPES` from `number-logic/plugin.js` (a pure constant, already
client-safe).

## 18. Files created

- `src/features/admin-questions/visual-editor/fill-complete-form.jsx`
- `src/features/admin-questions/visual-editor/image-interaction-form.jsx`
- `src/features/admin-questions/visual-editor/pattern-form.jsx`
- `src/features/admin-questions/visual-editor/memory-form.jsx`
- `src/features/admin-questions/visual-editor/scenario-challenge-form.jsx`
- `src/features/admin-questions/visual-editor/number-logic-form.jsx`

## 19. Files modified

- `src/features/admin-questions/visual-editor/model.js` — 18 new helpers.
- `src/features/admin-questions/visual-editor/registry.js` — all-ten `VISUAL_FORMS` + `INTEGRITY_RULES`.
- `src/features/admin-questions/components/QuestionEditor.jsx` — all-ten visual; raw JSON only for unknown types.
- `src/features/admin-questions/visual-editor/primitives.jsx` — added `NumberField`.
- `src/pages/admin.css` — `aq-subsection`, `aq-subsection__accepted`, `aq-row--element` (reused existing chips/toggles).
- `src/features/activity-engine/plugins/number-logic/plugin.js` — exported `COMPATIBLE_TYPES`.
- `src/features/admin-questions/testing/visual-forms.test.js` — 22 new tests, 2 assertions updated.

## 20. Known limitations

- Media remains a **reference placeholder** (`question-media/pending/...`); no
  upload UI (out of scope, as in 5.11A).
- In-editor warnings are advisory; only the server save is authoritative.
- Multi-part number-logic carries a neutral top-level `{ type: 'exact',
  value: 0 }` to satisfy the correct-answer schema's required `type` while the
  per-part specs drive scoring (matches the shipped `partial-credit.json`).
- Scenario optimal path stops at the first terminal option; loops are detected
  by the advisory `scenario.*` rules (D-072/D-073 semantics preserved).

## 21. Next recommended task

Task 5.12 — media upload integration for the question builder (bucket upload,
path validation, thumbnail/alt flows) followed by the publish/review workflow,
so authored drafts can move from visual authoring to live distribution. Not
started (per the stop rule after 5.11B).

## Verification evidence

```
npm test                   → 1251/1251 pass (22 new, run twice)
npm run lint               → clean
npm run build              → passes (admin editor chunk 237.87 kB / gzip 62.80 kB)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
bundle probe               → 0 files (credentials, answer $ids, admins ids);
                             SECURITY_CORRECT_ANSWER_EXPOSED guard active
npm run smoke:production   → 106/106 PASS (run twice); DB restored to exact baseline
```

## Revision history

- 2026-08-17 — Initial report. Task 5.11B complete; Task 5.11A untouched.