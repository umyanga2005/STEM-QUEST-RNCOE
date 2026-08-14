# 05 – Interactive Activity Engine — Detailed Design

> **Status:** APPROVED as the design baseline (Stage 1, 2026-08-11).
> **Implementation status:** NOT implemented. This is a design specification.
> The exact runtime contract will be translated to code during the
> implementation stage.
> **Final consistency pass (2026-08-11):** plugins no longer compute final
> scores; they validate and report normalized scoring inputs only (D-041).
> Correctness / partial-credit representation is defined explicitly (§6).

## 1. Goals

- Teach STEM through **interactive activities**, not traditional MCQ.
- Allow **new activity types to be added later** without rewriting the game.
- Keep the **game engine activity-agnostic** (it orchestrates sessions, not
  interactions).
- Work on **touch-first mobile devices** and keyboard/mouse, with accessibility
  built in.
- Remain **Supabase Free Tier friendly**: lean data, few writes, server-side
  authority.

## 2. Architecture Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                     GAME ENGINE (orchestrator)                    │
│   start session · pick 3 questions · round flow · score record    │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ activity-agnostic             │ final session score
┌───────────────▼────────────────┐  ┌───────────▼────────────────────┐
│     ACTIVITY ENGINE (registry) │  │    CENTRAL SCORING SERVICE      │
│   maps activity_type → plugin  │  │  final question + session score │
│  render · validate · scoring   │  │  (D-023/D-041) — server-only     │
│  inputs (never final points)   │  │                                  │
└───────────────┬────────────────┘  └───────────┬────────────────────┘
                │ validation result +           │ earned base ×
                │ normalized scoring inputs     │ deductions (0–100)
┌───────────────▼──────────────────────────────▼────────────────────┐
│                       QUESTION ENGINE (data)                       │
│  stream · level · question · payload · correct_answer · hints      │
└────────────────────────────────────────────────────────────────────┘
```

**Separation of concerns**
- **Question Engine:** owns question data (storage, retrieval, validation of
  authoring). Knows nothing about interaction.
- **Activity Engine:** owns interaction contract. A *registry* of activity
  type plugins. Validates answers and reports **normalized scoring inputs** —
  it never computes final points.
- **Central Scoring Service:** owns all final score arithmetic (D-023/D-041):
  earned base × correctness, minus hint/attempt/overtime deductions, floor 0,
  clamp 0–100, session sum.
- **Game Engine:** owns session lifecycle and the "3 of 100" rule. Delegates
  every interaction to the Activity Engine via the registry and every final
  score to the Central Scoring Service.

## 3. Activity Type Registry — the plugin contract

A new activity type is a self-contained **plugin module** that is registered
once at startup. The engine only ever talks to the registry, so adding a type
means adding a module + registration — no engine changes.

### Plugin interface (design, not code)

```ts
interface ActivityTypePlugin {
  type: string                 // unique id, e.g. 'drag-drop'
  name: string                 // display name, e.g. 'Drag & Drop'
  version: number              // plugin schema version

  // 1. Authoring support: can this payload be built/validated?
  validatePayload(payload): { valid: boolean; errors?: string[] }

  // 2. Renderer: React component receiving a context object
  render(props: ActivityRenderProps): ReactNode

  // 3. Validation: is the submitted answer correct?
  //    Returns activity-specific per-part detail (partial credit aware).
  validateAnswer(ctx): ValidationResult

  // 4. Scoring inputs: normalize the validation result into the inputs the
  //    Central Scoring Service needs. The plugin NEVER computes final points.
  scoringInputs(ctx, validation: ValidationResult): ScoringInputs

  // 5. Hints: generate hint content on demand
  buildHints(question): Hint[]

  // 6. Feedback: build the end-of-round feedback spec
  feedback(ctx, validation: ValidationResult): FeedbackSpec

  // 7. Optional filter: where this type is allowed
  availableOn?(ctx): boolean
}

// Activity-specific validation result — which parts were right.
interface ValidationResult {
  correct: boolean                       // fully correct?
  detail?: Record<string, unknown>       // per-part correctness, e.g.
                                         // { placementsCorrect: 4, placementsTotal: 5 }
}

// Normalized inputs consumed by the Central Scoring Service (D-023/D-041).
// Plugins only report these; they apply NO arithmetic.
interface ScoringInputs {
  correctnessFraction: number            // 0–1 (1 = fully correct, 0 = incorrect,
                                         //  (0,1) = partially correct — partial credit)
  attemptsUsed: number
  hintsUsed: number
  timeTakenSec?: number                  // when timed
  bonusFlags?: string[]                  // e.g. ['noCalculator', 'firstTry']
}

interface ActivityRenderProps {
  question: Question            // prompt + instructions + payload + options
  state: RoundState             // current student progress within the round
  dispatch: (action: RoundAction) => void
  onComplete: (answer: StudentAnswer) => void
  requestHint: () => void
  timeRemaining: number | null
  reducedMotion: boolean
}

interface Hint { text: string; level: number }

interface FeedbackSpec {
  correct: boolean
  message: string
  explanation?: string
  detail?: Record<string, unknown>
}
```

**Note:** there is intentionally **no `scoring()` method** in the plugin
interface. Final points are computed **only** by the Central Scoring Service
(D-041). The plugin's responsibility ends at activity-specific validation
(`validateAnswer`) and normalization of scoring inputs (`scoringInputs`).

### Round lifecycle (per question)

```
render(payload) → student interacts → submit
  → plugin.validateAnswer → ValidationResult
  → plugin.scoringInputs → normalized ScoringInputs
  → Central Scoring Service → final question score (D-023)
  → feedback → next round (or session end)
```

Server authority: `validateAnswer`, `scoringInputs`, the Central Scoring
Service, and the correct-answer data live server-side. The client receives
only `payload`, `options`, `prompt`, and `instructions` — never
`correct_answer`.

## 4. Question Data Model (design)

```ts
interface Question {
  id: string
  streamId: string          // science | technology | engineering | mathematics
  levelId: number           // 1–5
  activityType: string      // 'drag-drop' | 'matching' | ...
  prompt: string            // headline the student reads
  instructions: string      // how to interact
  difficulty: number        // 1–5 within the level, if sub-difficulty exists
  payload: Record<string, unknown>   // type-specific structured data
                                     // (validated by the plugin)
  correctAnswer: Record<string, unknown>  // consumed ONLY server-side
  hints: Hint[]
  media: MediaRef[]         // images/audio referenced from Supabase Storage
  options: ActivityOptions  // timer, retries, partial credit, randomizable
}

interface ActivityOptions {
  timerSeconds?: number      // null = untimed
  allowRetry: boolean
  partialCredit: boolean
  randomizable: boolean      // may the plugin shuffle/generate variants?
  maxAttempts?: number
}
```

## 5. Detailed Activity Type Designs

Legend for A–P (as required):
A Educational purpose · B Suitable streams · C Grade 6–11 usage ·
D Suitable difficulty levels · E Student interaction · F Mobile/touch ·
G Required question data · H Correct answer data · I Validation method ·
J Scoring inputs · K Timer support · L Hint support · M Feedback behaviour ·
N Animation opportunities · O Accessibility considerations ·
P Replay/randomization.

---

### 5.1 Drag & Drop

- **A** — Spatial and causal reasoning: associate, categorise, or position
  items by physically moving them to targets (e.g., label a diagram, pair a
  part with its function, place values in a system).
- **B** — All four (Science: label plant/cell parts; Technology: place OS
  layers; Engineering: assign bridge components; Mathematics: place numbers on
  a number line).
- **C** — All grades. Grade 6–7 benefit most (concrete manipulation); Grades
  10–11 use richer targets (multi-zone, overlapping criteria).
- **D** — Levels 1–5. Complexity scales with zone count and distractors.
- **E** — Pointer/touch drag a source item to a drop zone; item snaps on
  release. Multi-item rounds allowed.
- **F** — Touch-drag is native; needs large hit targets (≥ 44 px), no
  hover-dependent feedback, scroll-lock during drag. A tap-to-select →
  tap-to-place fallback is required for accessibility.
- **G** — `sourceItems[]` (labels/images), `dropZones[]` (names/regions),
  `validMappings` (source→zone pairs), optional `distractors[]`.
- **H** — The complete set of valid source→zone placements.
- **I** — Compare placed pairs against `validMappings`; per-item correctness
  with partial credit option.
- **J** — Correct placements, wrong placements, attempts, time taken, hints
  used.
- **K** — Optional; default untimed for young grades.
- **L** — Highlight one matching zone; reveal one mapping; grey out solved
  zones.
- **M** — Instant per-item feedback: correct snap + glow; wrong zone shake +
  return; end-of-round summary with explanation.
- **N** — Spring physics on drop, item flight/return, zone pulse, glow trails,
  completion confetti.
- **O** — Keyboard drag (arrows + Enter), screen-reader announcements of items
  and zones, colour + icon cues (never colour alone), reduced-motion fallback
  to tap-pick mode.
- **P** — Shuffle source and zone order per session; rotate distractor set;
  regenerate zone positions. Only if `options.randomizable`.

### 5.2 Matching

- **A** — Recall and association: pair terms↔definitions, tools↔functions,
  formulas↔results, units↔quantities.
- **B** — All four (Science: organ↔function; Technology: key↔shortcut;
  Engineering: material↔property; Mathematics: equation↔solution).
- **C** — All grades; Grades 6–8 use plain text pairs, Grades 9–11 use
  symbol-heavy pairs.
- **D** — Levels 1–5; scales with pair count and distractors.
- **E** — Tap/click an item in the left column, then its partner in the right
  column; matched pairs lock. Optional line-drawing on large screens.
- **F** — Tap-tap pairing is ideal for touch; line-drawing is optional and only
  offered on pointers.
- **G** — `leftItems[]`, `rightItems[]`, `validPairs` (left id ↔ right id),
  optional unmatched distractors.
- **H** — The full set of correct left↔right pairs.
- **I** — Each submitted pair checked against `validPairs`; a correct pair
  locks immediately, an incorrect pair shakes and unlocks.
- **J** — Correct pairs, mismatches, attempts, time, hints.
- **K** — Optional timed mode; default untimed.
- **L** — Reveal one pair; show first letters; dim eliminated distractors.
- **M** — Pair links with a stroke on match; mismatch flash; progress counter
  (x of y matched); final summary.
- **N** — Selection pulse, linking stroke draw, checkmark pop on match,
  shake on mismatch.
- **O** — Full keyboard navigation with visible focus; screen reader announces
  pair status; colour + icon cues; reduced-motion safe.
- **P** — Shuffle both columns each session; regenerate distractors from a
  wider bank.

### 5.3 Ordering

- **A** — Sequencing and logic: steps in a process, chronological order,
  magnitude order, priority order.
- **B** — All four (Science: scientific-method steps; Technology: boot
  sequence; Engineering: design-cycle phases; Mathematics: order of
  operations).
- **C** — All grades; simpler items (5 steps) for Grade 6, longer chains for
  Grade 11.
- **D** — Levels 1–5; chain length and partial-anchor complexity scale.
- **E** — Arrange shuffled items into ordered positions (slots); up/down
  buttons provided for keyboard use.
- **F** — Tap an item then tap its target slot; or drag with scroll-lock;
  up/down reorder buttons are the accessible path on mobile.
- **G** — `items[]`, `correctOrder` (sequence of item ids), optional
  `anchoredPositions[]` (pre-locked items).
- **H** — The exact (or ranked) sequence.
- **I** — Compare placement to `correctOrder`; per-position credit; optional
  adjacency/inversion metric.
- **J** — Correct positions, inversions, attempts, time, hints.
- **K** — Optional; short timers suit this type in advanced levels.
- **L** — Lock the first item; highlight the next expected item; reveal a gap.
- **M** — Items animate into slots; wrong-position arrow hint; end summary.
- **N** — FLIP-based reorder animation, slot glow, checkmarks, progress stepper.
- **O** — Reorder buttons for keyboard/screen-reader users; focus retained on
  moving item; position announced.
- **P** — Shuffle item order per session; different item bank rotation.

### 5.4 Sorting

- **A** — Classification and grouping: place items into categories by shared
  property.
- **B** — All four (Science: classify organisms; Technology: file types;
  Engineering: material classes; Mathematics: odd/even, prime/composite).
- **C** — All grades; category count grows with grade.
- **D** — Levels 1–5; scales with number of categories and ambiguity.
- **E** — Move items into category buckets (drag, or tap item → tap bucket).
- **F** — Tap-tap assignment is primary on mobile; drag optional.
- **G** — `items[]`, `categories[]`, `itemCategoryMap` (item→category), optional
  distractors.
- **H** — Every item's correct category assignment.
- **I** — Per-item correctness against `itemCategoryMap`; instant or on-submit
  mode.
- **J** — Correct placements, time, attempts, hints.
- **K** — Optional.
- **L** — Reveal one item's category; reduce distractor count.
- **M** — Bucket count animates; wrong-bucket shake; completion feedback.
- **N** — Items fly to bucket, bucket counter bump, category colour pulse,
  confetti on completion.
- **O** — Keyboard assignment, screen-reader category announcements, high
  contrast, non-colour category labels (icons).
- **P** — Shuffle items and bucket order; vary item bank.

### 5.5 Fill / Complete

- **A** — Production and recall: complete blanks, equations, definitions,
  short answers.
- **B** — All four (Science: complete definitions; Technology: complete a
  command; Engineering: complete a formula; Mathematics: solve for the
  unknown).
- **C** — All grades; numeric/factual for Grade 6, symbolic for Grade 11.
- **D** — Levels 1–5.
- **E** — Type text/numbers into blanks; dropdown alternative for low-typing
  fluency.
- **F** — On-screen keyboard support; numeric keypad mode for math; input
  length caps to prevent overflow.
- **G** — `template` (text with `___` blanks), `answers` per blank (list of
  accepted strings), optional numeric `tolerance`.
- **H** — Per-blank accepted answer sets (case-insensitive, trimmed).
- **I** — Normalise (trim/lowercase), compare against accepted sets; numeric
  tolerance comparison; synonym lists.
- **J** — Blanks correct, attempts, time, hint penalty, typing-effort bonus.
- **K** — Optional; usually untimed to reduce stress.
- **L** — Reveal first letter; show blank length; reveal one word.
- **M** — Per-blank green/red on submit; explanation panel after submit.
- **N** — Typing feedback ripple, correct flash, error shake.
- **O** — Labelled inputs, keyboard-only use, screen-reader announcements,
  generous time; no colour-only correctness.
- **P** — Rotate accepted-variant banks; shuffle blank order when template
  allows.

### 5.6 Image Interaction

- **A** — Visual analysis: label diagrams, find hotspots, identify parts on an
  image.
- **B** — All four (Science: cell/body diagram; Technology: circuit board;
  Engineering: bridge parts; Mathematics: graph/plot points).
- **C** — All grades; image-rich content is highly engaging for 6–8, analytic
  for 9–11.
- **D** — Levels 1–5; hotspot count and precision scale.
- **E** — Tap/click hotspots on an image; or drag labels onto the image.
- **F** — Pinch-zoom must be supported; hotspot targets must be large (≥ 44 px
  effective) and zoom-aware; tap-precision is a core mobile concern.
- **G** — `imageRef` (Storage asset), `hotspots[]` (region coords, size,
  label), correct target set.
- **H** — The set of required hotspot selections / label placements.
- **I** — Hit-test within region with tolerance; compare label placements.
- **J** — Correct taps, false taps (penalty), time, hints.
- **K** — Optional.
- **L** — Highlight region outlines; reveal label initial letters.
- **M** — Correct hotspot glows; incorrect region shakes; completion reveal.
- **N** — Hotspot pulse, region reveal sweep, zoom transition, glow.
- **O** — A textual list of options must accompany the image (image never the
  sole input); alt text; keyboard reachable; zoom accessible.
- **P** — Reposition hotspots within safe image bounds per session; shuffle
  label order; alternate image variants.

### 5.7 Pattern

- **A** — Pattern recognition and extrapolation: continue sequences, complete
  series, identify rules.
- **B** — Primarily Mathematics; also Science (data patterns) and Technology
  (pixel/grid patterns).
- **C** — All grades; sequence complexity scales strongly with grade.
- **D** — Levels 1–5.
- **E** — Choose the next item / missing item from options; tap to answer.
- **F** — Tap-to-choose with large touch targets; no fine motor requirement.
- **G** — `sequence[]` (numbers/shapes/text), `answerOptions[]`, `rule`
  description, expected answer(s).
- **H** — The next element(s) or completed sequence; may accept multiple valid
  answers.
- **I** — Compare choice to expected set; rule-based check where multiple
  answers are valid.
- **J** — Correct choice, time, attempts, hints.
- **K** — Optional; light timers suit advanced levels.
- **L** — Show the rule; highlight the pattern period.
- **M** — Sequence animates; wrong choice shakes; rule explanation after.
- **N** — Items animate into sequence, period highlight loop, selection pop.
- **O** — Sequence must be readable as text (numbers/text) or described;
  colour/shape redundancy; screen-reader reads the series.
- **P** — Generate new sequences from a rule bank per session; shuffle options.

### 5.8 Memory

- **A** — Retention and reinforcement: recall facts, pairs, or positions after
  a short exposure.
- **B** — All four (Science: element facts; Technology: shortcut keys;
  Engineering: units; Mathematics: identities).
- **C** — Mostly Grade 6–9; light use in Grade 10–11.
- **D** — Best at Levels 1–3; use sparingly at 4–5.
- **E** — View cards/items during a reveal phase, then recall (match, order, or
  select) from memory.
- **F** — Tap to flip cards; large cards; swipe optional; no time pressure
  default.
- **G** — `deck[]` (card/items content), `revealSeconds`, `recallPrompt`,
  recall target set.
- **H** — The exposed set (or pairs/order) to be recalled.
- **I** — Compare recalled items against the exposed set; partial credit per
  item.
- **J** — Correct recall, time, attempts, re-reveals used.
- **K** — Reveal countdown only; recall phase untimed by default.
- **L** — Re-reveal once; reduce deck size.
- **M** — Reveal phase ends with animation; recall check; partial-credit
  summary.
- **N** — Card flip, shine sweep, fade-out reveal, match pop.
- **O** — Screen-reader reading of deck; extended time option; never
  memory-only for core content (provide alternatives).
- **P** — Shuffle deck; different item bank each session.

### 5.9 Scenario Challenge

- **A** — Applied problem-solving: make decisions in realistic STEM contexts;
  evaluate consequences.
- **B** — All four; especially Engineering and Science.
- **C** — Mostly Grade 8–11; simpler scenarios for Grade 6–7.
- **D** — Levels 2–5; narrative depth scales.
- **E** — Read a scenario, choose among actions at decision points; optional
  multi-step branches and slider/choice inputs.
- **F** — Scrollable scenario card; large tap options; branching is naturally
  mobile-friendly.
- **G** — `scenarioText`, optional `media[]`, `decisionPoints[]` (options,
  consequences), `optimalPath`.
- **H** — The optimal decision sequence, or the chosen-outcome mapping.
- **I** — Path-based validation; partial credit per correct decision; outcome
  mapping check.
- **J** — Correct decisions, path efficiency, time, hints.
- **K** — Optional per-step timer.
- **L** — Preview a consequence; highlight a key fact.
- **M** — Story-branch feedback with consequence explanation; end summary.
- **N** — Narrative transitions, branch reveal, outcome cards, character
  reactions.
- **O** — Readable typography, alt text for media, no time pressure, screen
  reader friendly.
- **P** — Shuffle option order; scenario bank rotation; slightly randomised
  outcomes (configurable).

### 5.10 Number / Logic Challenge

- **A** — Mental arithmetic, numeric reasoning, logical deduction, puzzles.
- **B** — Mathematics strongly; Technology (binary/base conversions); Science
  (data/logic).
- **C** — All grades; difficulty scales smoothly.
- **D** — Levels 1–5.
- **E** — Input an answer, choose from options, or manipulate digits/sliders.
- **F** — Numeric keypad (inputmode="numeric"); large option buttons; no
  hover dependence.
- **G** — `problem` statement, numbers/parameters, operation/rule, answer
  format, `tolerance`.
- **H** — Exact numeric answer or accepted set with tolerance.
- **I** — Numeric comparison with tolerance; logic-rule engine for deduction
  tasks.
- **J** — Correct answer, time, attempts, no-calculator bonus.
- **K** — Strong fit for timed mode; still configurable.
- **L** — Show the formula/rule; reduce problem size; reveal half the working.
- **M** — Immediate correct/incorrect; worked-solution reveal.
- **N** — Count-up score, timer bar, correct pop, wrong shake.
- **O** — Labelled inputs, no colour-only signals, generous input time, screen
  reader support.
- **P** — Randomised parameters per session (numbers regenerate); bank
  rotation.

## 6. Scoring Input Model & Central Scoring (shared across types)

Every plugin normalizes its activity-specific validation into the same set of
**scoring inputs**. The plugin **never computes final points** — it reports
inputs; the **Central Scoring Service** computes the final score
(D-023/D-041). `base_points`, timers, penalties, and deduction settings live
in the database (question/level/`game_settings`), never in the plugin.

### Plugin-reported inputs (activity-specific → normalized)

| Input | Description |
| --- | --- |
| `correctnessFraction` | **0–1**: fraction of the round the student got right. `1` = fully correct; `(0,1)` = partially correct (partial-credit rounds); `0` = incorrect. Derived by the plugin from its per-item validation (e.g. 4 of 5 placements correct → `0.8`). |
| `attemptsUsed` | number of attempts in the round. |
| `hintsUsed` | number of hints used. |
| `timeTakenSec` | seconds (when timed). |
| `bonusFlags` | e.g. `noCalculator`, `firstTry` — informational; applied only if a `game_settings` value defines a bonus. |

### Central Scoring Service computation (server-authoritative)

```
earnedBasePoints  = round(basePoints × correctnessFraction)   // basePoints ≤ 100
questionScore     = earnedBasePoints
                  − (hintsUsed    × scoring.hint_deduction)
                  − (attemptsUsed × scoring.attempt_deduction)
                  − (overtimeSec  × levels.overtime_penalty_per_second)
questionScore     = clamp(questionScore, 0, 100)              // never negative
sessionScore      = Q1 + Q2 + Q3                              // max 300
```

### Correctness / partial credit — explicit representation

- **Fully correct** ⇒ `correctnessFraction = 1` ⇒ earned base = `basePoints`
  (≤ 100) before any deduction.
- **Partially correct** ⇒ `0 < correctnessFraction < 1` ⇒ earned base is
  scaled proportionally. This is exactly how the engine's existing
  partial-credit capability (per-item credit in Drag & Drop, Matching,
  Ordering, Memory, Scenario, etc.) is preserved — the plugin counts the
  correct parts and reports the fraction; the Central Scoring Service converts
  it to points.
- **Incorrect** ⇒ `correctnessFraction = 0` ⇒ earned base = 0 ⇒ question
  score 0 after the floor (deductions never go below 0).
- **Rounding:** `earnedBasePoints` rounds to the nearest integer (half-up) so
  question scores stay whole numbers.
- `overtimeSec = max(0, timeTakenSec − allowedTimeSec)`; allowed time is the
  question's `timer_override_seconds` or the level's `default_time_seconds`
  (D-034).

Plugins apply **no** weighting and **no** final arithmetic of their own.

## 7. Game Session Flow

```
startSession(student, stream, level)
  → selectRoundQuestions(...)   // 3 of 100 (section 8)
  → create Session(seed, rounds[])
  → return round descriptors (payload, options, prompt) — NO correctAnswer

per round:
  render(plugin.render)
  onComplete(answer) → submitAnswer(session, round, answer)
      → plugin.validateAnswer          → ValidationResult
      → plugin.scoringInputs           → normalized ScoringInputs
      → Central Scoring Service        → final question score (§6)
      → feedback                       → store round result; reveal explanation

finishSession
  → Central Scoring Service sums Q1+Q2+Q3 → record session score
  → update progress/leaderboard
```

## 8. Selecting Exactly 3 of 100 Questions

### Requirements
- Exactly **3** questions per session.
- **Activity diversity:** prefer 3 different activity types in one session.
- **Controlled randomization:** random but reproducible (seeded) and fair.
- No immediate repetition of the same question for the same student.

### Algorithm (server-side only)

```
selectRoundQuestions(streamId, levelId, studentId):
  pool      = active questions for (stream, level)
  pool      = apply special access (studentId)            # admin grants
  if pool.size < 3 → error: level not playable

  recent    = question ids the student saw in last 5 sessions
  rng       = seededPRNG(sessionSeed)                    # mulberry32
  types     = shuffle(unique activity types in pool, rng)

  chosen = []
  # 1) Diversity pass: pick one per activity type
  for type in types while chosen.size < 3:
      candidates = pool of this type, excluding recent
      candidates = candidates.length ? candidates : pool of this type
      chosen.add(randomPick(candidates, rng))
      pool = pool - picked

  # 2) Fill pass: if fewer than 3 types exist, allow same-type repeats
  while chosen.size < 3:
      candidates = pool excluding recent (fallback: full pool)
      chosen.add(randomPick(candidates, rng))
      pool = pool - picked

  # 3) Round order shuffle
  shuffle(chosen, rng)

  return { questionIds: chosen, seed: sessionSeed }
```

### Controls
- **Seed:** `sessionSeed` generated with `crypto.getRandomValues` (≥ 64-bit)
  at session start; stored with the session for debugging/reproducibility and
  A/B fairness checks.
- **Diversity guarantee:** if the level's pool has ≥ 3 distinct activity
  types, all 3 rounds are different types (diversity is strict, not best
  effort).
- **Repeat avoidance:** exclusion of the last-5-sessions question ids only
  applies while it leaves enough candidates; never blocks the level.
- **Edge cases handled:** pool < 3 (blocked start); only 1–2 activity types in
  a level (fill pass allows repeats); question retired mid-session (session
  holds question ids, not live references).

### Data recorded (design)
- Session row: `student_id, stream_id, level_id, seed, status, selected_question_ids`.
- Round rows: `question_id, attempts, result, points, feedback_detail`.
- This supports anti-cheat analysis, retry/recovery, and analytics.

## 9. Adding a New Activity Type (checklist)

1. Author a plugin module implementing the interface in section 3.
2. Register it in the activity registry at startup.
3. Provide `validatePayload` so authors can create questions.
4. If needed, define the selection constraint for diversity (default: one per
   type).
5. Run payload validation on existing content; no engine changes required.

## 10. Open items (from this design)

- ~~Final scoring formula~~ — RESOLVED (D-023, 2026-08-11 correction pass);
  see `06-database-architecture.md` §18.
- ~~How hints are priced in scoring~~ — RESOLVED as a **configurable game
  setting** (`scoring.hint_deduction` / `scoring.attempt_deduction`); exact
  values to be tuned, not formula-open.
- ~~Does the plugin compute the final round score?~~ — RESOLVED **no** (D-041,
  2026-08-11 final consistency pass): plugins validate and report normalized
  scoring inputs only; the Central Scoring Service computes final points.
- ~~How is correctness / partial credit represented?~~ — RESOLVED (D-041):
  the plugin reports a `correctnessFraction` (0–1); the Central Scoring
  Service computes `earnedBase = round(basePoints × correctnessFraction)`.
- Sub-difficulty within a level (whether needed).
- Exact registry bootstrapping approach (static map vs. dynamic import) —
  implementation detail, low risk.
