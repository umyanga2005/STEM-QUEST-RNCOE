# 07 – Task 3.1 — Question Content Model & Authoring Architecture

> **Status:** APPROVED as the Task 3.1 specification (architecture/documentation
> only — no questions, no records, no migrations, no code).
> **Scope:** complete content model, lifecycle, taxonomy, grade mapping,
> difficulty framework, activity distribution, 20 × 100-question blueprints,
> quality rules, anti-duplication, hints, feedback, media, timers, scoring,
> authoring workflow, Admin Question Builder requirements, bulk import,
> AI-assisted generation, analytics-readiness.
> **Implements:** D-025/D-026/D-021/D-022/D-023/D-027/D-028/D-031/D-032/D-034/
> D-035/D-036/D-037/D-038/D-039/D-041/D-042.
> **Confirms:** the existing applied schema (`0001_initial_schema.sql`) is
> suitable. This spec adds NO schema changes now.

---

## 1. Executive Summary

STEM QUEST needs a minimum of **2,000 questions** (4 streams × 5 levels × 100),
with game sessions showing exactly **3 questions** randomly selected from a
level's pool, preferring **3 different activity types** per session. This
document defines everything needed to author, review, publish, store, and
maintain those questions **without** database, Activity Engine, or Admin
Question Builder changes later.

Key decisions:

1. **One reusable question record** (`public.questions`, D-025) holds common
   relational metadata + a type-specific `payload` (JSONB) + a server-side-only
   `correct_answer` (JSONB). Activity-specific structures live **inside**
   `payload`, never as extra columns (D-026).
2. **A tiny future `meta` JSONB extension** (documented here, not migrated
   now) carries authoring concerns that are not game scalars: educational
   objective, per-state feedback templates, presentational media references,
   taxonomy labels, provenance (author/source/AI seed/content hash), and review
   bookkeeping. Relational columns stay for everything filterable/indexable.
3. **Lifecycle** is a 5-state workflow (Draft → Review → Approved → Published →
   Archived). The current `status` column holds 3 values; **Review/Approved are
   modelled now in `meta.review` + `admin_actions`**, and a future enum
   extension is proposed (Open Decision OD-1). Only **`published`** questions
   reach students.
4. **Editing published questions** can never silently alter history: rounds
   snapshot the played payload at play time (`session_rounds.activity_snapshot`),
   and editing pushes the question back to Draft (version bump) for
   re-approval.
5. **Taxonomy is a controlled vocabulary in `tags[]`** (`topic:<slug>`,
   `subtopic:<slug>`) — filterable, analytics-ready, no new tables.
6. **Level ≠ grade.** `levels` define difficulty/progression tiers; `questions`
   carry a `grade_min..grade_max` suitability range. Gameplay gating is by
   level (with `special_access` override), not by student grade.
7. **Activity distribution and per-level 100-question blueprints** vary by
   stream and level (§6, §7) so every level keeps ≥ 3 distinct activity types
   (the engine's diversity constraint) and matches educational suitability per
   grade band — not mathematical symmetry.

---

## 2. Question Content Model

### 2.1 The three groups (as required)

| Group | Definition | Home |
| --- | --- | --- |
| **A. Common question metadata** | Everything shared by all questions regardless of activity type: identity, taxonomy, grades, difficulty, scoring, timers, life-cycle. | Relational columns on `public.questions` + controlled tags |
| **B. Activity-specific payload** | The structured prompt/interaction data for one activity type (zones, items, pairs, hotspots…). Owned/validated by that type's plugin. | `questions.payload` (JSONB) |
| **C. Validation / scoring data** | The server-side expected result + per-part correctness information used by the plugin and the Central Scoring Service. | `questions.correct_answer` (JSONB) |

Rule (D-026): **relational** for identifiers and game scalars (filterable,
constrained, SQL-queryable); **JSONB** for type-specific/variable structure.
`payload` and `correct_answer` are strictly separated — the correct answer is
**never** embedded in `payload` and never sent to clients.

### 2.2 Full logical field inventory

Required information (task list) mapped to the existing schema:

| Logical field | Storage | Notes |
| --- | --- | --- |
| question ID | `questions.id` (bigint identity) | D-024 |
| stream | `questions.stream_id` (FK) | composite FK with level (D-039) |
| level | `questions.level_id` (FK) | L1–L5, must belong to stream |
| activity type | `questions.activity_type_id` (FK) | catalogue only, D-037 |
| title / prompt | `prompt` | headline the student reads |
| instructions | `instructions` | how to interact |
| educational objective | `meta.objective` | future JSONB; not a game scalar |
| STEM topic / subtopic | `tags[]` = `topic:<slug>` / `subtopic:<slug>` | controlled vocabulary (§3) |
| grade suitability | `grade_min`, `grade_max` (6–11) | range, not single grade (§4) |
| difficulty | `difficulty` (1–5) | in-level item difficulty (§5.5) |
| activity payload | `payload` (JSONB) | group B, validated by plugin |
| correct answer/validation | `correct_answer` (JSONB) | group C, server-only |
| partial-credit info | `correct_answer` detail + plugin `scoringInputs` | per-part correctness → fraction (D-041) |
| explanation | `explanation` | shown after round |
| feedback (per-state) | `meta.feedback` | correct/partial/incorrect/timeout templates (§11) |
| hints | `hints` (JSONB `[{level,text}]`, ≤ 3) | §10 |
| timer override | `timer_override_seconds` | NULL = level default (§13) |
| base points | `base_points` (default 100, 1–100) | D-038 |
| media references | interaction assets in `payload`; presentational assets in `meta.media` | Storage paths, never binary (§12) |
| tags | `tags[]` | taxonomy + free keywords |
| status | `status` | `draft`/`published`/`archived` now; review states in `meta.review` (§3) |
| version | `version` (int) | bump on significant edit (§3.3) |
| author | `meta.authoring` (future) | author id + name + date |
| review status | `meta.review` (future) + `admin_actions` | §3.1 |
| is_flagged | `is_flagged` | content-review flag |
| created / updated | `created_at`, `updated_at` | timestamps |

### 2.3 The `meta` JSONB extension (future, not applied)

To keep game scalars lean and indexable, all *authoring* concerns that are
non-scalar live in one small JSONB `meta` (target ≤ ~2 KB):

```json
{
  "objective": "Explain that water is a good solvent.",
  "taxonomy": { "topic": "chemistry", "subtopic": "solutions" },
  "feedback": {
    "correct": "…", "partial": "…", "incorrect": "…", "timeout": "…"
  },
  "media": [
    { "role": "hero",
      "ref": "question-media/science/solar-system-diagram.webp",
      "alt": "Diagram of the solar system." }
  ],
  "authoring": {
    "author_type": "human",
    "author_source": "attribution string",
    "generation_seed": "hex",
    "template_id": "nls-07",
    "scenario_id": "sc-eng-bridge-01",
    "content_hash": "sha256hex"
  },
  "review": {
    "state": "pending",
    "reviewer_admin_id": "uuid",
    "reviewed_at": "…",
    "note": "…"
  }
}
```

> The schema is **not** modified in this task. This block is the agreed shape a
> future authoring-stage migration would add as `questions.meta` (Open Decision
> OD-1/OD-2). Until then, taxonomy travels in `tags[]` and review bookkeeping
> in the existing `admin_actions` audit table.

### 2.4 What is repeated between payload, correct_answer, and meta — and what is not

- Interaction-critical assets **used to render the activity** (e.g. Image
  Interaction `imageRef`) live in `payload` (the plugin owns/validates them).
- Presentational assets that accompany a prompt (hero/illustration) are NOT
  duplicated in payload; they live once in `meta.media`.
- `correct_answer` stores only the expected result + validation/partial-credit
  detail — never authored explanation text (that belongs to `explanation` /
  `meta.feedback`).
- Identifiers (stream/level/activity) exist **only** as relational FKs, never
  implicitly in JSONB (D-026 rule).

---

## 2b. Question Lifecycle

### 3.1 The 5-state workflow

```
Draft → Review → Approved → Published → Archived
```

Mapped to the current schema (no table modification):

| Workflow state | Persisted as | Who may transition |
| --- | --- | --- |
| **Draft** | `status='draft'` | Author (content-editor admin) creates/edits |
| **Review** | `status='draft'` + `meta.review.state='pending'`; request logged in `admin_actions` | Author submits; reviewer (admin/content editor) picks up |
| **Approved** | `meta.review.state='approved'` (recorded in `admin_actions`) | Reviewer/approver (admin or superadmin) |
| **Published** | `status='published'` | Approver (only after Approved) |
| **Archived** | `status='archived'` | Approver; removes from active pools |

- **Reject / return:** reviewer sets `meta.review.state='rejected'` with a
  note; the question stays Draft for the author.
- **Flag:** `is_flagged=true` pauses the question from any state until a
  reviewer resolves it (admin-only visibility).
- **Gate:** the engine's selection query filters `status='published'` (partial
  index `questions_selection_idx`, `WHERE status='published'`). A question can
  reach a session **only** if published — and per policy only after an Approved
  review.
- **Who can perform each transition:** Authors create drafts. Only reviewers
  (content-editor admins) and approvers (admin/superadmin) approve. Only the
  approver publishes/archives. All transitions are recorded in
  `admin_actions` (action, target_type='question', target_id, details) for an
  immutable audit trail.

### 3.2 Editing without silently changing history

- The game session pins question ids (`game_sessions.selected_question_ids`)
  and each round snapshots the played payload at play time
  (`session_rounds.activity_snapshot`); `student_answers` and `scores` store
  the submitted answer and result. **Historical results are therefore never
  recomputed or altered when a question row later changes.**
- **Editing a published question is a new version:** the edit bumps `version`,
  resets the question to `status='draft'` (and `meta.review.state` cleared), so
  it leaves the live pool until re-approved and re-published. A version
  increase is mandatory for any change to `payload`, `correct_answer`,
  `prompt`, or `explanation` after first publication.
- Optional future nicety (not required now): keep a lightweight
  `previous_version` reference in `meta.authoring` for audit. A full version
  table is considered over-engineering given the snapshot design.

### 3.3 Versioning rules

- `version` starts at 1 on creation and increments by 1 on each significant
  content change after publication (or on any content change, if reviewers
  prefer a simple rule).
- Cosmetic-only edits (e.g. fixing a typo in a hint) may also bump the version
  for clarity — the rule is *when in doubt, bump*.
- Version is display-only today; it becomes an audit key later when combined
  with `meta.authoring.content_hash`.

---

## 3. STEM Content Taxonomy

Controlled vocabulary, encoded as tags `topic:<slug>` and `subtopic:<slug>`.
Topic slugs are unique **within a stream**; subtopic slugs are unique within a
topic. Each question carries **exactly one** `topic:<slug>` and **exactly one**
`subtopic:<slug>` plus optional free tags. Keep it practical — 5 topics per
stream, ≤ 6 subtopics each, ~4–6 free tags max.

> **Curriculum honesty:** no curriculum claim is asserted here. Items marked
> **[REVIEW]** require teacher/curriculum review per target region before
> question content is authored against them.

### 4.1 Science

| topic | subtopics | notes |
| --- | --- | --- |
| `physics` — Physical Science | forces-motion, energy, matter, electricity-magnetism, waves-light-sound | |
| `chemistry` | matter-particles, elements-compounds, reactions-changes, acids-bases, periodic-table | |
| `life` — Life Science | cells-organisms, body-systems, genetics-heredity, evolution-ecosystems, plants-animals | |
| `earth-space` | earth-structure, weather-climate, solar-system, rock-cycle, natural-resources | |
| `inquiry` — Scientific Inquiry | scientific-method, measurement-units, data-graphing, lab-safety | |

### 4.2 Technology

| topic | subtopics | notes |
| --- | --- | --- |
| `computing` — Computing Systems | hardware, operating-systems, networks-internet, data-representation | |
| `programming` — Programming & Logic | algorithms, control-flow, variables-data, debugging | |
| `digital-literacy` | files-formats, information-literacy, online-safety-ethics | |
| `data-ai` | data-collection, data-representation, patterns, ai-ml-basics | **[REVIEW]** AI/ML curriculum varies strongly by region |
| `digital-tools` | documents, spreadsheets, presentation, search, collaboration | |

### 4.3 Engineering

| topic | subtopics | notes |
| --- | --- | --- |
| `design-process` — Engineering Design Process | define-problem, research, design-solutions, prototype-build, test-evaluate, iterate-communicate | |
| `materials-structures` | material-properties, structures-stability, forces-in-structures | |
| `mechanisms-machines` | simple-machines, levers-pulleys-gears, linkages, motion-mechanisms | |
| `electronics-circuits` | basic-circuits, components, sensors-actuators, robotics-intro | |
| `systems-society` | systems-thinking, energy-systems, sustainable-design, engineering-impact | **[REVIEW]** societal framing should align with regional curriculum |

### 4.4 Mathematics

| topic | subtopics | notes |
| --- | --- | --- |
| `number-operations` | whole-numbers, fractions-decimals-percent, integers, rational-irrational, exponents-roots | |
| `algebra` | expressions-equations, patterns-functions, inequalities, linear-relationships, quadratics-intro | |
| `geometry-measurement` | shapes-properties, angles, perimeter-area-volume, transformations, coordinate-geometry | |
| `data-statistics` | data-display, measures-center, probability, sampling-inference-intro | |
| `reasoning-problem-solving` | logic-puzzles, estimation-mental-math, multi-step-reasoning | |

### 4.5 Taxonomy usage rules

- Authors must pick from the canonical slug lists above; the Admin Question
  Builder presents dropdowns, not free text (avoids drift).
- The taxonomy serves admin filtering, question generation targeting, and
  analytics (topic-level performance) without any schema change.
- New topics/subtopics require a small controlled-vocab update (admin +
  reviewer approval), not a database change.

---

## 4. Grade 6–11 Mapping

- **Level is NOT a grade.** `levels` = progression/difficulty tiers (L1–L5).
  A Grade 6 student may reach a Level 3 challenge when an admin grants
  `special_access` — the content must remain age-appropriate even when the
  challenge is above the nominal band.
- **`grade_min`..`grade_max` (6–11) = suitability range**, set by the author
  and confirmed by the reviewer. A question may be:
  - one grade: `grade_min=grade_max=8`
  - a range: `grade_min=7, grade_max=9`
  - broad: `grade_min=6, grade_max=11`
- **Suitability ≠ lockout.** Grade range does NOT filter the game pool (the
  level gate + special access govern play). It is an authoring and analytics
  attribute: "this content is appropriate for grades 6–8".
- **Guidance bands** for typical question banks (§7):
  - L1: predominantly grades 6–7
  - L2: grades 6–8
  - L3: grades 7–9
  - L4: grades 8–11
  - L5: grades 9–11
- Set the range **generously** at the upper end (a grade range describes safe
  reach, not a promise). Where a concept's age-fit is uncertain, mark
  **[REVIEW]** and default to the wider safe band.

---

## 5. Difficulty Framework (Levels 1–5)

Difficulty is defined by **reasoning demand**, not vocabulary length or word
count. The level tier (L1–L5) is the primary difficulty axis; a second
in-level `difficulty` column (1–5) orders items *within* a level (see 5.3).

### 5.1 Definition table (primary axis)

| Dimension | L1 Beginner | L2 Easy | L3 Intermediate | L4 Advanced | L5 Hard |
| --- | --- | --- | --- | --- | --- |
| Reasoning depth | recall / recognition | single-step application | two-step | multi-step integration | multi-step abstract/transfer |
| Number of steps | 1 | 1–2 | 2–3 | 3–4 | 4+ |
| Distractor complexity | none / playful | obvious | plausible | subtle | adversarial-but-fair |
| Information load | minimal, one fact | short, 1–2 facts | moderate, 2–3 facts | dense but structured | dense, must select relevant info |
| Visual complexity | 1 simple graphic | simple diagram | labelled diagram | layered diagram | schematic / partial info |
| Interaction complexity | 2–3 items, 1 zone | 3–4 items | 4–6 items / 2–3 zones | 6–8 items / nested | many items, overlapping criteria |
| Calculation complexity | none / counting | single arithmetic step | 2-step arithmetic | multi-step, decimals/percents | symbolic / multi-step |
| Abstraction | concrete objects | concrete→symbol | symbol-mediated | abstract relations | generalised rules/models |
| Time pressure | none or generous | gentle | default level timer | tighter (may override) | strict (may override) |
| Hint availability | generous, 3 hints | 2–3 hints | 2 hints | 1–2 hints | 1 hint or none |
| Multi-stage reasoning | no | no | some | yes | yes, nested |
| Scenario complexity | 1 decision | 1–2 decisions | 2–3 decisions, linear | branchy scenario | multi-outcome optimisation |

### 5.2 Authoring guidelines

1. **Defend the level** with at least two concrete dimensions from the table.
   "It sounds harder" is not sufficient.
2. **Grade-appropriateness is separate.** A hard *for its grade* question is
   not the same as an advanced-grade question. L5 must stay age-appropriate
   for grades 9–11 (no college-level assumptions).
3. **Distractors must be real.** At L3+, every distractor/option must be a
   plausible misconception or near-miss, not a joke or an obviously wrong
   number.
4. **Interaction scales, not just text.** Bump complexity by adding zones,
   items, branches, or precision requirements rather than by lengthening the
   prompt.
5. **No trick questions** unless the trick *is* the explicit learning
   objective (flagged in the review checklist).
6. **Time pressure is a difficulty ingredient** but never the only one; see
   §13 for override rules.

### 5.3 In-level item difficulty (`questions.difficulty`, 1–5)

The column is *within-level*: 1 = easiest in this level, 5 = hardest in this
level. It drives ordering, balanced session selection weighting (future), and
analytics. Recommended bank distribution per level (§7 uses these):

| Level | D1 | D2 | D3 | D4 | D5 |
| --- | --- | --- | --- | --- | --- |
| L1 | 70 | 25 | 5 | 0 | 0 |
| L2 | 35 | 40 | 20 | 5 | 0 |
| L3 | 30 | 40 | 25 | 5 | 0 |
| L4 | 0 | 25 | 45 | 30 | 0 |
| L5 | 0 | 0 | 40 | 60 | 0 |

(Authoring note: L4/L5 rows concentrate at the hard end; every level still
contains an approachable fraction for mixed-ability classes.)

---

## 6. Activity Distribution (per stream × level)

Percentages of a level's **100-question bank**. All rows sum to 100. The
distribution is for the **question bank only** — a game session still selects
exactly 3 questions with **3 different activity types when the pool allows**
(D-022 engine pass is strict, not best-effort). Because every level keeps
≥ 3 distinct activity types with ≥ 5 questions each, the diversity pass always
has real choice.

Legend: DD=Drag&Drop, MT=Matching, OR=Ordering, ST=Sorting, FC=Fill/Complete,
II=Image Interaction, PA=Pattern, ME=Memory, SC=Scenario, NL=Number/Logic.

### 6.1 Science

| Level | DD | MT | OR | ST | FC | II | PA | ME | SC | NL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 25 | 15 | 5 | 20 | 10 | 5 | 5 | 10 | 0 | 5 |
| 2 | 20 | 15 | 10 | 10 | 15 | 10 | 5 | 10 | 0 | 5 |
| 3 | 15 | 10 | 10 | 10 | 15 | 15 | 5 | 10 | 5 | 5 |
| 4 | 10 | 5 | 10 | 5 | 15 | 20 | 10 | 5 | 15 | 5 |
| 5 | 5 | 5 | 5 | 5 | 15 | 20 | 10 | 5 | 25 | 5 |

Rationale: science moves from concrete classification (DD/ST/ME) at L1 toward
visual analysis (II) and applied scenarios (SC) at L4–L5. FC (definitions/
short answers) stays steady as core literacy.

### 6.2 Technology

| Level | DD | MT | OR | ST | FC | II | PA | ME | SC | NL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 20 | 15 | 5 | 15 | 15 | 5 | 10 | 10 | 0 | 5 |
| 2 | 15 | 15 | 10 | 10 | 15 | 10 | 10 | 10 | 0 | 5 |
| 3 | 10 | 10 | 10 | 5 | 15 | 10 | 15 | 10 | 5 | 10 |
| 4 | 5 | 5 | 10 | 5 | 15 | 10 | 15 | 5 | 15 | 15 |
| 5 | 5 | 5 | 5 | 0 | 15 | 10 | 15 | 5 | 20 | 20 |

Rationale: technology becomes progressively logic-heavy (PA/NL) and
scenario-based (SC) as computing concepts deepen; DD/ST shrink.

### 6.3 Engineering

| Level | DD | MT | OR | ST | FC | II | PA | ME | SC | NL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 20 | 15 | 10 | 15 | 10 | 5 | 5 | 10 | 5 | 5 |
| 2 | 15 | 15 | 10 | 10 | 15 | 10 | 5 | 10 | 5 | 5 |
| 3 | 10 | 10 | 10 | 5 | 15 | 15 | 5 | 5 | 20 | 5 |
| 4 | 5 | 5 | 10 | 5 | 15 | 15 | 5 | 5 | 25 | 10 |
| 5 | 5 | 5 | 5 | 0 | 10 | 10 | 5 | 5 | 30 | 25 |

Rationale: engineering is anchored on the design process, so SC (design
decisions, trade-offs) grows strongly; OR (process steps) stays present
throughout; NL supports quantitative design choices at L5.

### 6.4 Mathematics

| Level | DD | MT | OR | ST | FC | II | PA | ME | SC | NL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 15 | 10 | 5 | 15 | 15 | 0 | 15 | 10 | 0 | 15 |
| 2 | 10 | 10 | 5 | 10 | 20 | 5 | 15 | 10 | 0 | 15 |
| 3 | 5 | 10 | 5 | 5 | 20 | 5 | 15 | 5 | 5 | 25 |
| 4 | 0 | 5 | 5 | 0 | 25 | 10 | 15 | 5 | 10 | 25 |
| 5 | 0 | 5 | 5 | 0 | 25 | 5 | 15 | 5 | 10 | 30 |

Rationale: mathematics leans on NL (arithmetic/logic), PA (sequences/patterns),
and FC (solve-for-unknown). Concrete manipulation (DD/ST) fades by L4.
II (graphs/plots) is used where visual reading is the mathematical skill.

---

## 7. The 20 × 100-Question Blueprints

For each of the 20 stream×level combinations: activity distribution (from §6),
topic distribution (counts summing to 100), typical grade band, and in-level
difficulty distribution (from §5.3). "What kind of 100 questions do we need
here?" is answered by the three rows of each blueprint.

Topic distributions were chosen so lower levels favour foundational topics and
higher levels deepen (subtopic depth shifts: L1 = facts/recognition, L5 =
integration/transfer) while keeping each topic present at every level where it
belongs.

### 7.1 Science blueprints

| Level | Activities (see §6.1) | Topics (counts) | Typical grades | In-level difficulty (D1..D5) |
| --- | --- | --- | --- | --- |
| L1 | §6.1 row 1 | physics 25, chemistry 20, life 25, earth-space 20, inquiry 10 | 6–7 (some 6–8) | 70/25/5/0/0 |
| L2 | §6.1 row 2 | physics 25, chemistry 20, life 25, earth-space 20, inquiry 10 | 6–8 | 35/40/20/5/0 |
| L3 | §6.1 row 3 | physics 25, chemistry 20, life 25, earth-space 20, inquiry 10 | 7–9 | 30/40/25/5/0 |
| L4 | §6.1 row 4 | physics 30, chemistry 25, life 20, earth-space 15, inquiry 10 | 8–11 | 0/25/45/30/0 |
| L5 | §6.1 row 5 | physics 30, chemistry 25, life 20, earth-space 15, inquiry 10 | 9–11 | 0/0/40/60/0 |

### 7.2 Technology blueprints

| Level | Activities (see §6.2) | Topics (counts) | Typical grades | In-level difficulty (D1..D5) |
| --- | --- | --- | --- | --- |
| L1 | §6.2 row 1 | computing 25, programming 25, digital-literacy 20, data-ai 10, digital-tools 20 | 6–7 | 70/25/5/0/0 |
| L2 | §6.2 row 2 | computing 25, programming 30, digital-literacy 15, data-ai 10, digital-tools 20 | 6–8 | 35/40/20/5/0 |
| L3 | §6.2 row 3 | computing 20, programming 35, digital-literacy 10, data-ai 15, digital-tools 20 | 7–9 | 30/40/25/5/0 |
| L4 | §6.2 row 4 | computing 15, programming 40, digital-literacy 5, data-ai 25, digital-tools 15 | 8–11 | 0/25/45/30/0 |
| L5 | §6.2 row 5 | computing 15, programming 45, digital-literacy 5, data-ai 25, digital-tools 10 | 9–11 | 0/0/40/60/0 |

### 7.3 Engineering blueprints

| Level | Activities (see §6.3) | Topics (counts) | Typical grades | In-level difficulty (D1..D5) |
| --- | --- | --- | --- | --- |
| L1 | §6.3 row 1 | design-process 20, materials-structures 25, mechanisms-machines 25, electronics-circuits 20, systems-society 10 | 6–7 | 70/25/5/0/0 |
| L2 | §6.3 row 2 | design-process 20, materials-structures 25, mechanisms-machines 25, electronics-circuits 20, systems-society 10 | 6–8 | 35/40/20/5/0 |
| L3 | §6.3 row 3 | design-process 30, materials-structures 20, mechanisms-machines 20, electronics-circuits 15, systems-society 15 | 7–9 | 30/40/25/5/0 |
| L4 | §6.3 row 4 | design-process 30, materials-structures 15, mechanisms-machines 15, electronics-circuits 20, systems-society 20 | 8–11 | 0/25/45/30/0 |
| L5 | §6.3 row 5 | design-process 30, materials-structures 10, mechanisms-machines 10, electronics-circuits 20, systems-society 30 | 9–11 | 0/0/40/60/0 |

### 7.4 Mathematics blueprints

| Level | Activities (see §6.4) | Topics (counts) | Typical grades | In-level difficulty (D1..D5) |
| --- | --- | --- | --- | --- |
| L1 | §6.4 row 1 | number-operations 30, algebra 15, geometry-measurement 15, data-statistics 10, reasoning-problem-solving 30 | 6–7 | 70/25/5/0/0 |
| L2 | §6.4 row 2 | number-operations 25, algebra 20, geometry-measurement 20, data-statistics 15, reasoning-problem-solving 20 | 6–8 | 35/40/20/5/0 |
| L3 | §6.4 row 3 | number-operations 20, algebra 25, geometry-measurement 20, data-statistics 15, reasoning-problem-solving 20 | 7–9 | 30/40/25/5/0 |
| L4 | §6.4 row 4 | number-operations 15, algebra 30, geometry-measurement 20, data-statistics 15, reasoning-problem-solving 20 | 8–11 | 0/25/45/30/0 |
| L5 | §6.4 row 5 | number-operations 10, algebra 35, geometry-measurement 20, data-statistics 15, reasoning-problem-solving 20 | 9–11 | 0/0/40/60/0 |

### 7.5 Blueprint completion totals

All 20 combinations are specified above. Per combination: 100 questions split
across activities (sums to 100), topics (sums to 100), and in-level difficulty
(sums to 100). Total across 4 streams × 5 levels = **2,000 questions minimum**.
A buffer of +5% (≈ +10 questions per level) is recommended for review
rejections and archivals so every level keeps ≥ 100 **published** questions.

---

## 8. Question Quality Rules & Checklist

Every question must pass this checklist before Approval. A failing item = not
publishable (reviewer records the reason).

| # | Rule | Pass criteria |
| --- | --- | --- |
| Q1 | Clear learning objective | `meta.objective` states one teachable concept/skill in one sentence. |
| Q2 | Age-appropriate | grade range is generous-but-defensible; no content beyond grades 6–11. |
| Q3 | Factually accurate | verified against a trusted source; no invented claims **[REVIEW] if unsure**. |
| Q4 | Unambiguous expected result | `correct_answer` has exactly one accepted outcome (or an explicit accepted-set). |
| Q5 | Meaningful interaction | the activity requires thinking, not guessing; interaction is essential to the task. |
| Q6 | No traditional MCQ | no bare "A/B/C/D" choice; choices only inside scenario/pattern/simulation/manipulation. |
| Q7 | Reasonable completion time | fits the timer (level default or justified override); generous for L1–L2. |
| Q8 | Useful feedback | `meta.feedback` + `explanation` teach the concept; never "Correct!"/"Wrong!" alone. |
| Q9 | No unnecessary text | prompt ≤ ~160 chars; instructions short; every word earns its place. |
| Q10 | Mobile-friendly | works on a phone screen: big targets, no hover-only, pinch-zoom where images are used. |
| Q11 | Accessible where possible | alt text for every image; keyboard reachability; no colour-only cues. |
| Q12 | No trick questions (unless the trick is the objective) | flagged and justified in review. |
| Q13 | No culturally inappropriate assumptions | no stereotypes, no locale-specific facts presented as universal **[REVIEW]**. |
| Q14 | No duplicates | `meta.authoring.content_hash` is unique; near-duplicate check passed (§9). |
| Q15 | Validated payload | plugin `validatePayload` returns valid; correct_answer structurally consistent. |
| Q16 | No exam-style leak of the answer | `correct_answer`/solutions never appear in prompt, hints, or feedback text. |

Reviewer confirmation: each published question carries
`meta.review.state='approved'` with the reviewer id and date in `admin_actions`.

---

## 9. Anti-Duplication Strategy (practical)

No over-engineering — five practical mechanisms:

1. **Canonical content hash** (`meta.authoring.content_hash`): SHA-256 over
   the *normalised* `{prompt + payload + correct_answer}` (whitespace-normalised,
   sorted keys). Enforced **unique** at the application layer at save/import
   time (a future UNIQUE index option). Detects exact duplication.
2. **Template identity** (`meta.authoring.template_id`): parametric questions
   (e.g. Number/Logic with regenerated numbers, Pattern rule banks) share a
   template id + a `generation_seed`. Two questions from the same template with
   the same seed are duplicates; different seeds are intended variants and are
   allowed **but limited**: ≤ 3 variants of the same template per level.
3. **Scenario identity** (`meta.authoring.scenario_id`): Scenario Challenge
   uses one scenario id per story; multiple questions may reference the same
   scenario only at different decision points, and at most 2 per level.
4. **Normalised-text near-duplicate check** at import/review: Levenshtein
   (or bigram Jaccard) similarity on `prompt`; anything above ~0.85 is listed
   for the reviewer, who decides keep/merge/reject. Runs on the bank, not per
   save, so it stays cheap.
5. **Media reuse monitoring:** the same Storage ref in `meta.media` across many
   questions is flagged in reports (same image ≠ duplicate question, but
   repetitive imagery is reviewed). Numbers-reuse: template seeds guarantee
   parameter rotation; manual questions must not repeat the same "answer set"
   (e.g. same three fractions) in the same level.

Governance: a pre-publish report lists (a) hash collisions, (b) near-duplicate
pairs, (c) template/scenario variant counts — the reviewer resolves all before
approving a batch.

---

## 10. Hint System

Storage: `questions.hints` JSONB `[{ "level": 1|2|3, "text": "…" }]`, **max 3**
hints per question (bounded per §8 JSONB caps).

Design rules:

1. **Progressive ladder** — level 1 = gentle nudge (reframe the question),
   level 2 = method/structure pointer, level 3 = near-solution key fact.
   A hint never states the final answer verbatim.
2. **Hint order** — students see them in order; each hint shown unlocks the
   next. Hints may not be skipped or re-ordered.
3. **Penalty** — each hint used deducts `scoring.hint_deduction`
   (currently `5`, a configurable `game_settings` value, D-035/D-023). The
   **Central Scoring Service** applies the deduction; the plugin only reports
   `hintsUsed`.
4. **Static text** — authored hint text does not change after use
   (deterministic). Plugins *may* offer dynamic variants (e.g. different
   wording for the same hint level) only when `options.randomizable`, and the
   authored text remains the canonical fallback.
5. **Maximum hints** — equal to the length of `hints` (0–3). A question with
   `hints` empty or `null` offers no hints.
6. **Zero-hint default** — hints are optional; a well-designed L1 question may
   need none. Do not pad with weak hints.
7. **Scoring honesty** — hint text must not leak `correct_answer` (checklist
   Q16); hints are part of the reviewed payload.

---

## 11. Feedback System

Content structure (authored; future `meta.feedback` templates + plugin dynamic
detail + relational `explanation`):

| State | Source | Requirement |
| --- | --- | --- |
| Correct | `meta.feedback.correct` + plugin detail + `explanation` | confirms why it is right; reinforces the concept; optional "next step". |
| Partial credit | `meta.feedback.partial` + plugin detail | says exactly which parts were right/wrong and what to fix; explains the partial-score meaning. |
| Incorrect | `meta.feedback.incorrect` + `explanation` | identifies the misconception and the correct reasoning; shows a worked path, not just the answer. |
| Time-expired | `meta.feedback.timeout` | explains what to prioritise next time (strategy), and the concept is still taught via `explanation`. |

Rules:

- Never emit only "Correct!"/"Wrong!". If no authored text exists for a state,
  the backend uses the `explanation` for all four states rather than a bare
  affirmation (this keeps every question educational by construction).
- Plugin `feedback(ctx, validation)` supplies dynamic detail (e.g. "3 of 5
  placements correct — check the ones in red") which is merged with the
  authored template; placeholders (e.g. `{{detail}}`) are documented per type.
- Feedback is shown after submit; it is not part of the question prompt and
  must not contain the answer before the student answers.

---

## 12. Media Model

- Buckets already configured (Task 2.12, D-042): **`question-media`** (private,
  ≤ 1 MB, jpeg/png/webp) is the only bucket questions reference. `student-avatars`
  is unrelated to question content (never referenced by questions). No new
  buckets. **No media is uploaded in this task.**
- **Reference format** (Storage path, never binary):
  - interaction-critical: inside `payload` (e.g. Image Interaction `imageRef`).
  - presentational: `meta.media[]` = `{ role, ref, alt }` where role ∈
    `hero | instruction | diagram | illustration | audio` (audio is future).
  - Path convention: `question-media/{stream-slug}/{topic-slug}/{asset}.webp`
    (unique slug, e.g. `question-media/science/cell-biology/plant-cell.webp`).
- **Rules:**
  - images only: jpeg/png/webp, ≤ 1 MB, resized/compressed to ≤ 1024px longest
    side before upload; alt text required on every image.
  - no binary in PostgreSQL (JSONB stores refs only, D-026).
  - reuse is encouraged (same asset in several questions is fine — Storage is
    not copied); the anti-duplication report (§9.5) tracks over-reuse.
  - audio is out of scope until a future decision (OD-3).
  - uploads happen through the backend (service role) only — never client-side
    (D-027, D-042).

---

## 13. Timer Model

Defaults (D-034, seeded in `levels.default_time_seconds`):

| Level | Default timer |
| --- | --- |
| 1 | 90 s |
| 2 | 75 s |
| 3 | 60 s |
| 4 | 50 s |
| 5 | 45 s |

`questions.timer_override_seconds` overrides the level default **per question**
(NULL = use level default).

Authoring rules for an override:

1. **Justified only** when the activity genuinely needs different pacing:
   - *shorter*: rapid mental-arithmetic/recognition rounds (Number/Logic at
     L4–L5), timed Memory reveal, or a pace-defining mechanic.
   - *longer*: complex Scenario Challenge, heavy Image Interaction, or
     fill-in long-form answers — especially for younger grades.
2. **No gratuitous shortening** — never shorten below the level default just to
   raise difficulty; time pressure is a difficulty dimension (§5.1) but is
   never the sole one.
3. **Safety floor** — an override below ~60% of the level default (e.g. < 30 s
   at L1–L3) requires reviewer approval and a written rationale.
4. **Young-student guard** — for grade_min ≤ 7, overrides are restricted to
   *longer* timers by default; *shorter* overrides need the same reviewer
   approval.
5. Overtime deduction always uses `levels.overtime_penalty_per_second`
   (1–5 pt/s by level, D-034) — the Central Scoring Service handles it; the
   content record only stores the override, never a custom penalty.

---

## 14. Scoring Model (unchanged, server-authoritative)

Restated for authoring clarity — **the architecture is not changed**:

```
earnedBasePoints  = round(basePoints × correctnessFraction)     // basePoints ≤ 100
questionScore     = earnedBasePoints
                  − (hintsUsed   × scoring.hint_deduction)      // default 5
                  − (attemptsUsed× scoring.attempt_deduction)   // default 10
                  − (overtimeSec × levels.overtime_penalty_per_second)
questionScore     = clamp(questionScore, 0, 100)
sessionScore      = Q1 + Q2 + Q3                                 // max 300
```

- `correctnessFraction` ∈ {1 = fully correct, (0,1) = partial credit,
  0 = incorrect} — reported by the activity plugin (D-041), applied only by the
  Central Scoring Service.
- **Author controls that affect scoring:** `base_points` (usually 100; a
  question may set 1–100), the number/order of hints (`hints`), `timer_override`
  (influences overtime), and the per-part structure of `correct_answer`
  (drives the fraction). Deduction *rates* live in `game_settings` (D-035) —
  authors do not embed rates in content.

---

## 15. Question Authoring Workflow

Future teacher/admin flow, with the fields required at each stage:

| Step | Action | Required fields at this stage |
| --- | --- | --- |
| 1 | Create question | stream, level, activity type |
| 2 | Author content | prompt, instructions, `payload` (validated by the activity plugin), `correct_answer`, `explanation` |
| 3 | Classify | `topic:<slug>`, `subtopic:<slug>`, `grade_min`, `grade_max`, `difficulty` (1–5), free tags |
| 4 | Configure play | `timer_override_seconds` (optional, §13), `hints` (0–3), `base_points` (default 100) |
| 5 | Enrich | `meta.objective`, `meta.feedback` (correct/partial/incorrect/timeout), `meta.media` (with alt text) |
| 6 | Preview | plugin `render` in a sandbox preview — required before save |
| 7 | Validate | plugin `validatePayload` + checklist Q1–Q16 — must pass |
| 8 | Save Draft | all of 1–7; status `draft` |
| 9 | Submit for Review | author submits; sets review pending; logged in `admin_actions` |
| 10 | Review | reviewer checks Q1–Q16, near-duplicates, taxonomy fit → approve/reject (note) |
| 11 | Approve | `meta.review.state='approved'` (admin/superadmin) |
| 12 | Publish | `status='published'` (approver) |

Hard gates: no Draft without a valid `payload` + `correct_answer`; no Review
without explanation + feedback + taxonomy; no Publish without an Approved
review. Students see only `published` rows (DB partial index).

---

## 16. Future Admin Question Builder (requirements)

Architecture: the builder is **driven by the Activity Engine registry**
(D-021/D-037). Selecting an activity type dynamically loads that plugin's
**authoring editor** — the engine provides `validatePayload` and the authoring
schema; the builder renders the matching editor. Adding an activity type later
automatically adds its builder (no builder rewrite).

Required capabilities:

| Capability | Notes |
| --- | --- |
| Create / Edit | field groups per §15; plugin editor loads by `activity_type_id` |
| Duplicate | copies the question (fresh content_hash, `template_id` preserved, marked as copy) |
| Preview | embedded renderer (sandbox, mock data); must work on a phone-size viewport |
| Validate | plugin `validatePayload` + checklist + uniqueness/near-duplicate check |
| Review gate | submit-for-review, approve, reject-with-note; audit in `admin_actions` |
| Publish / Archive | status transitions with approver-only permissions |
| Media manager | pick/upload into `question-media` (backend upload), alt-text field, reuse indicator |
| Batch visibility | level-coverage view (how many of the 100 blueprinted questions exist per topic/activity) |

Non-functional: responsive, keyboard-accessible, permission-aware (roles from
`admins.role` — author vs reviewer vs approver), and every action writes an
`admin_actions` audit row. No UI is built in this task.

---

## 17. Bulk Import Strategy

**Primary format: JSON Lines (NDJSON)** — one question object per line. JSON is
required because `payload` and `correct_answer` are nested JSONB structures;
CSV cannot represent them. (CSV remains usable later only for flat metadata
patches — e.g. bulk tag/status updates.)

Import pipeline (safe, staged):

1. **Schema validation** — every record validated against the import schema
   (types, required fields, enum values).
2. **Semantic validation** — stream/level/activity exist, taxonomy slugs are in
   the controlled vocabulary, grades/difficulty in range, `payload` passes the
   plugin's `validatePayload`, `correct_answer` is consistent.
3. **Duplicate detection** — content_hash collisions and near-duplicate
   pairs are reported (§9); duplicates rejected by default (or imported as
   new versions if the admin explicitly chooses).
4. **Preview / dry-run** — a human-readable report: counts per stream/level/
   activity, error list with line numbers, duplicates, and a sample of rows.
5. **Import in one transaction per file** — all-or-nothing per file; a
   failure rolls back the file and returns a per-line error report. (2,000 rows
   is far below any practical transaction size.)
6. **Post-import state** — imported questions land as **Draft** (never
   auto-published); media references validated against existing `question-media`
   objects; `meta.authoring.author_type='import'` recorded.

The importer is not built in this task; the file format (versioned, with a
`format_version` field) is specified so future tools can write valid imports.

---

## 18. AI-Assisted Content Generation

Policy (hard rules):

1. **AI output is always a Draft.** The required flow is:
   `AI draft → validation → teacher/admin review → approval → publish`.
   No AI-generated question can reach `published` without a human approval
   record.
2. **Marked provenance** — `meta.authoring.author_type='ai'`,
   `author_source` = model/date, `generation_seed` recorded. Human-edited AI
   content keeps `author_type='ai'` with an `edited_by_human=true` marker so
   analytics can separate pure-AI vs human-refined items.
3. **Mandatory human review scope** (non-delegable):
   - factual/scientific/mathematical accuracy,
   - correctness of `correct_answer` and of every distractor,
   - grade appropriateness and cultural safety (Q2, Q13),
   - uniqueness (no duplicate prompts/solutions in the level),
   - interaction validity (payload renders and validates).
4. **Batching** — AI drafts enter the same review queue as human drafts; a
   reviewer must not approve an AI batch without opening a sample (≥ 25%,
   minimum 5) in the actual preview renderer.
5. **No AI API is called in this task.** When enabled later, all calls happen
   server-side (backend), are rate-limited and logged, and never receive
   student data or secrets (privacy, D-005/D-040).

---

## 19. Analytics-Ready Content

The content model already carries what future analytics need (no new schema):

| Analytics need | Content source |
| --- | --- |
| Hardest / easiest topics | `tags` (`topic:<slug>`) joined to session/score data |
| Activity success rate | `activity_type_id` + `student_answers` / `scores` |
| Average completion time | `timer_override_seconds` vs level default + `session_rounds.time_taken_ms` |
| Hint usage | `hints` count + `session_rounds.hints_used` |
| Partial-credit frequency | `correct_answer` part structure + `scoringInputs.correctnessFraction` captured in round detail |
| Question failure rate | per-question aggregate over `student_answers.was_correct` |
| Level performance | `level_id` + `scores` |
| Grade performance | `students.grade` joined to results |
| Version sensitivity | `version` on question rows (results unaffected by later edits, §3.2) |
| In-level difficulty calibration | `difficulty` (1–5) vs outcome distributions — validates/adjusts the §5.3 spread |

Each question therefore **must** be published with: exactly one topic tag, one
subtopic tag, a correct grade range, difficulty, activity type, and hints
metadata. This is enforced by the authoring workflow (§15) and the import
pipeline (§17).

---

## 20. Open Decisions

| # | Item | Open question | Owner |
| --- | --- | --- | --- |
| OD-1 | `status` enum extension | Extend `status` to `('draft','review','approved','published','archived')` vs keep 3 values + `meta.review`? Current design works with 3; a future authoring migration can extend. | Architect + Admin |
| OD-2 | `questions.meta` column | When to add the `meta` JSONB column (at Admin Question Builder build time) and whether taxonomy moves from `tags[]` to `meta.taxonomy`. | Architect + Admin |
| OD-3 | Audio media | Allow audio (e.g. science listening questions) in `question-media` later? Currently images-only. | Product |
| OD-4 | Taxonomies [REVIEW] | Confirm `data-ai` (AI/ML basics) and `systems-society` subtopics against the target region's grades 6–11 curriculum. | Teachers |
| OD-5 | Grade gating | Confirm grade range never filters gameplay pools (level gate only). Current design: metadata-only. | Product |
| OD-6 | Hint pricing | Confirm `scoring.hint_deduction=5` / `scoring.attempt_deduction=10` final values (D-023 tuning; already seeded as PROPOSED in 0002). | Product |
| OD-7 | Unique content_hash | Enforce uniqueness of `meta.authoring.content_hash` in the DB later (UNIQUE index) or only at application layer? | Architect |
| OD-8 | Activity distributions | Review the §6 activity distributions with teachers before content production (they are recommendations, not fixed rules). | Teachers |
| OD-9 | Buffer volume | Confirm the +5% buffer (≈110 questions per level) to keep ≥100 published per level after rejects/archivals. | Product |

---

*End of Task 3.1 specification. No questions, records, migrations, or code
were produced. Supabase state unchanged.*
