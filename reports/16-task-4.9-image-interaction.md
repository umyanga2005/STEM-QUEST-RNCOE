# Task 4.9 — Sixth Production Activity Plugin: Image Interaction

**Status:** Complete
**Date:** 2026-08-14
**Depends on:** 08-task-3.2-schemas.md (image-interaction schema contract), 09-task-4.1-activity-engine-core.md (7-method plugin contract, facades, registry), Task 4.4 `GameSessionService` (safe descriptors + central scoring), and 12–15 (the plugin pattern Image Interaction follows)
**Tests:** 503 total pass (`npm test`, 2 consecutive full runs + 5× game-session stability), lint clean, production build passes, schema validator passes
**Verification command:** `python3 schemas/validate.py && npm test && npm run lint && npm run build`

---

## 1. Executive Summary

The sixth production activity plugin is implemented: **image interaction** —
the tap-and-label diagram activity from the Task 3.2 catalog. Like its
predecessors it is a **point-based** (not multiple-choice) plugin and mirrors
the drag-drop/matching/ordering/sorting/fill-complete pattern end-to-end:

- **7-method plugin** (`imageInteractionPlugin`) implementing `render`,
  `validatePayload`, `validateAnswer`, `scoringInputs`, `buildHints`,
  `feedback`, `availableOn` — plus `validateImageInteractionAnswer`, the
  semantic port of the catalog rule `image-interaction.hotspots-exist`,
  extended with the invariants that make scoring honest.
- **`image-interaction-controller.js`** — a pure, DOM-free interaction state
  module (normalized-coordinate conversion, hit testing, tap/label state,
  response serializer) so the interaction geometry rules are unit-tested in
  Node. Interaction coordinates are **normalized to 0–100** against image
  dimensions (D-059 style determinism): a tap is a point, a circle hotspot
  radius is checked in aspect-preserved space, and a choice is never accepted
  outside an image boundary.
- **Two interaction modes.** `tap` — press/clear regions (selecting = leaving,
  counter-selected = restored); `label` — select a label chip, press a region
  to place it, re-select to move, ✕ to remove. Both build one canonical
  response shape the server scores.
- **React renderer** (`ImageInteractionActivity.jsx`) — an image surface with
  an `aria-live` counter, hotspot overlays with subtle markers (never
  correct-answer hints), a touch/mouse-friendly pointer handler, label tray,
  hint reveal, Clear, and a submit gate on `isComplete`.
- **Integrated into the Game Session service**: `registerImageInteraction` is
  part of `createDefaultServerActivityEngine()`, the demo API seeds
  image-interaction demo questions (built from the Task 3.2 fixture files —
  no new production content), and the app shell renders
  `ImageInteractionActivity` for `kind === 'image-interaction'`.

Image Interaction is **exact-response**: `tap` scores on the required-hotspot
set; `label` scores on correct label→hotspot placements. Partial credit is
fractional (correct taps/placements ÷ required/labels). The submitted response
is `{ taps: [{ x, y }] }` or `{ placements: [{ labelId, hotspotId }] }`.

Correct-answer data never reaches the client. The client descriptor carries
only public hotspot geometry + label ids/text; the required-hotspot set and the
correct placements are server-only (§7, §10).

### Incidental fix (pre-existing dev-server bug)

The demo API server (`dev-server.js`) crashed on the first request:
`app.request(...).then is not a function`. This is a **pre-existing** bug from
Task 4.4 — the `handle` bridge assumed Hono's `app.request()` returns a
Promise, but Hono 4.13.1 returns a plain `Response` (synchronous), so the
`.then` chain was always broken. Fixed by awaiting the request inside a
try/catch IIFE. The demo API now serves real sessions over HTTP (verified by
the smoke test, §15).

---

## 2. Scope & Deliverables

Delivered:

| # | Deliverable | Location |
|---|---|---|
| 1 | 7-method image-interaction plugin + `validateImageInteractionAnswer` (catalog port) + 6 `validatePayload` semantic rules | `src/features/activity-engine/plugins/image-interaction/plugin.js` |
| 2 | Pure interaction state module (DOM-free, unit-tested) | `src/features/activity-engine/plugins/image-interaction/image-interaction-controller.js` |
| 3 | React renderer (tap + label modes, image surface + label tray) | `src/features/activity-engine/plugins/image-interaction/ImageInteractionActivity.jsx` |
| 4 | Plugin styles (mobile-first) | `src/features/activity-engine/plugins/image-interaction/image-interaction.css` |
| 5 | Public plugin entry (re-exports + `registerImageInteraction`) | `src/features/activity-engine/plugins/image-interaction/index.js` |
| 6 | Plugin unit tests (71 cases, incl. controller + boundary) | `src/features/activity-engine/testing/image-interaction.test.js` |
| 7 | Session end-to-end integration tests (IC-series, 11 cases) | `src/features/game-session/testing/session-service.test.js` |
| 8 | Image-interaction demo content (Task 3.2 fixtures, dev API only) | `src/features/game-session/demo/image-interaction-demo-questions.js` |
| 9 | Demo renderer wiring | `src/App.jsx` |
| 10 | Service engine registration | `src/features/game-session/service/game-session-service.js` |
| 11 | Dev-server request bridge fix (incidental, pre-existing) | `src/features/game-session/api/dev-server.js` |
| 12 | Final report | `reports/16-task-4.9-image-interaction.md`, plus log/decisions/todo/README updates |

Out of scope (unchanged from roadmap): the remaining activity types (pattern,
memory, scenario-challenge, number-logic), production question authoring (none
created here), and the mode-aware registry that would strip server-only method
source from client bundles (recorded as future work, §17).

---

## 3. Plugin Contract Mapping

| Method | Boundary | Image Interaction implementation |
|---|---|---|
| `render` | client | `{ kind, mode, imageWidth, imageHeight, image{ref,alt,role,width,height}, hotspots[{id,x,y,radius,shape}], labels[{id,text}], labelColors }` — **never** reads `correctAnswer.*` |
| `validatePayload` | authoring | Schema gate then 6 semantic rules (§6) |
| `validateAnswer` | server-only | `validateImageInteractionAnswer` cross-document guard, then shape/reference/uniqueness/completeness guards + per-tap/per-placement correctness detail |
| `scoringInputs` | server-only | correctnessFraction = correct taps ÷ required (tap) or correct placements ÷ labels (label); evidence never carries required/expected ids |
| `buildHints` | client | Authored progressive hints, never derived from the answer |
| `feedback` | server-only | correct / partial / incorrect / timeout; never reveals required hotspots or placements |
| `availableOn` | client | Default available; `featureFlags['image-interaction'] = false` opts out; voice-only offered |

---

## 4. Domain Model

- `payload.image` — `{ ref, alt, role?, width?, height? }` (the surface; the
  schema uses a storage reference, e.g. `question-media/...`).
- `payload.imageWidth` / `imageHeight` — the natural image size the hotspot
  coordinates are normalized against (0–100 space).
- `payload.hotspots[]` — 1..100 public regions (`{ id, shape: circle|rect,
  x, y }`, `radius` for circles / `width,height` for rects, both found in the
  Task 3.2 `collection2d-consumer` derived contract). Hotspot id is never a
  correct-answer hint — it is the geometry id for the whole hotspot set.
- `payload.labels[]` — label mode only: `{ id, text }` chips to place.
- `correctAnswer.mode` — `tap | label`.
- `correctAnswer.requiredHotspots[]` — TAP mode: the subset of hotspot ids a
  correct answer must select (may be all of them, or a proper subset).
- `correctAnswer.placements[]` — LABEL mode: `{ labelId, hotspotId }` — every
  label exactly once, onto any payload hotspot.

Image Interaction is **exact-response**: tap compares the tapped buttons
(normalized points) against the required set; label compares placements. There
is no position tolerance beyond the hotspot hit shapes themselves.

---

## 5. Render Security (D-021)

`render` never reads `correctAnswer`. The descriptor carries image metadata,
mode, and the **public** hotspot/label sets. The required-hotspot subset and
the correct placements live only in `correctAnswer`, which the client never
receives. Since a hotspot may be clickable but not answer-relevant, the
submit-gate `isComplete` is deliberately mode-aware but **not** correctness
aware (§9). Verified: the built client bundle contains 0 occurrences of both
image-interaction schema `$id` markers and no `getCorrectAnswerSchema`
(§14), and the client facade exposes no server-only methods (covered by the
image-interaction tests).

---

## 6. Semantic Port: `image-interaction.hotspots-exist`

`validateImageInteractionAnswer(payload, correctAnswer)` runs server-side (in
`validateAnswer`) and is exported for authoring tooling/tests. It extends the
catalog rule with the invariants that make scoring honest:

- **coverage** — a `tap` answer's `requiredHotspots` must be a non-empty
  subset of the payload's hotspots, with no duplicates (an author referencing
  a hotspot that does not exist, or an empty required set, is a bug);
- **label completeness** — a `label` answer must place **every** payload label
  exactly once, into an existing hotspot (a label with no placement would
  break the partial-credit denominator);
- **mode consistency** — `tap` answers have no label placements and vice
  versa; a label question with no labels is rejected;
- **no answer beyond the board** — a required hotspot id is validated against
  the actual payload hotspot set, so a forged "required hotspot" id can never
  score.

A schema-valid but semantically inconsistent answer document throws
`ACTIVITY_PAYLOAD_SEMANTIC_INVALID` (an author bug, never a student mistake).

---

## 7. `validatePayload` Semantic Rules

| Rule | Purpose |
|---|---|
| `image-interaction.hotspots-exist` | the 7 checks above (coverage/duplicates/completeness/mode) |
| `image-interaction.hotspot-ids-unique` | hotspot ids unique by value |
| `image-interaction.label-ids-unique` | label ids unique by value |
| `image-interaction.hotspots-and-labels-disjoint` | a label id must never collide with a hotspot id |
| `image-interaction.label-mode-requires-labels` | label mode must ship ≥ 1 label |
| `image-interaction.hit-shape-defined` | every hotspot has exactly one usable shape (radius, or width+height) |

The schema already enforces counts (1–100 hotspots, 1–8 labels), value types
and structural shape; these rules catch meaning a schema cannot.

---

## 8. Interaction Controller (DOM-free)

`image-interaction-controller.js` exposes pure functions consumed by the
renderer **and** the server:

- `toPercentCoordinates(clientX, clientY, rect)` — pointer → normalized 0–100
  point for a surface rect (client-side only).
- `hitTestPoint(hotspot, x, y, imageWidth, imageHeight)` — circle hit in
  aspect-preserved space (y scaled by height ÷ width), rect hit by half-width
  / half-height. Shared with server validation.
- `findHotspotAtPoint(i, x, y, w, h)` — topmost hotspot under a point.
- Tap mode: `createImageInteractionState`, `isHotspotSelected`, `toggleTap`,
  `selectHotspot`, `clearTap`, `selectedCount`.
- Label mode: `selectLabel`, `getPendingLabel`, `clearPendingLabel`,
  `isLabelPlaced`, `getPlacement`, `placeLabel`, `moveLabel`,
  `removePlacement`, `placedCount`.
- `clearInteraction` / `resetInteraction`, `isComplete` (submit gate), and
  `buildResponse` — `{ taps }` or `{ placements }`, the exact shapes the
  server validates.

No correctness information ever lives in controller state.

---

## 9. `validateAnswer` Behavior

- **Authoring-integrity:** `validateImageInteractionAnswer` failures throw
  `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`.
- **Tap shape:** `response.taps` must be an array of `{ x, y }` with finite
  numeric coordinates normalized to [0, 100].
- **Tap reference guard:** every tap must land on an existing hotspot
  (`findHotspotAtPoint`), else `ACTIVITY_ANSWER_INVALID` — a coordinate in the
  image-drawn whitespace can never score, so a client cannot plant taps
  "between the lines".
- **Tap scoring:** a tap is correct iff `hitTestPoint` lands on a required
  hotspot; `correct` = all required selected (and only required — selecting a
  non-required hotspot never inflates the score).
- **Label shape:** `response.placements` must be an array of
  `{ labelId, hotspotId }`; unknown label ids / unknown hotspot ids / a label
  placed twice / a missing label are all rejected before scoring.
- **Label scoring:** partial credit = correct placements ÷ labels (a
  distractor placement counts against the student, never for them).

**Normalization is exact (D-063):** coordinates are finite numeric values in a
closed range; hotspot membership is a geometric test against the public
hit-shape, nothing more.

---

## 10. React Renderer

`ImageInteractionActivity.jsx` consumes only the client-safe descriptor:

1. **Image surface** — an aspect-ratio-fixed box (from `imageWidth` /
   `imageHeight`) with the image when a `ref`/`storageSrc` resolves, otherwise
   a labelled accessible region; hotspot overlays ping on pointer
   press/release (mouse + touch) with cursor and ARIA affordances.
2. **Progress** — `aria-live` "n of m" region for taps or placements, plus per
   selected/placed chip state.
3. **Tap mode** — press a hotspot to select it, press again to deselect; the
   counter updates and Submit gates on ≥ 1 selection.
4. **Label mode** — a tray of label chips; select one (ARIA-activedescendant)
   then press a hotspot to place; a placed label shows an ✕ to remove, and
   selecting a placed label lets you move it.
5. **Hints, Clear and submit** — authored hints revealed on demand; Clear
   resets the interaction; Submit gates on `isComplete` and sends
   `{ response, interactionMetrics: { attemptsUsed, hintsUsed, timeTakenSec } }`.

Accessibility: keyboard-selectable chips, screen-reader announcements via
`aria-live`, focal `:focus-visible` states, `40px+` touch targets, and a
`prefers-reduced-motion` media query. `image-interaction.css` is mobile-first.

---

## 11. Tests

### 11.1 Image-interaction plugin suite — `image-interaction.test.js` (71 tests)

- Registration + contract shape (7 methods), `registerImageInteraction` helper,
  coexistence.
- Render descriptor: no correct-answer keys; image metadata + hotspot geometry
  + labels structures; label colors; no required-hotspot set; single-hotspot
  tap controls.
- `validatePayload`: 6 semantic rules + schema-layer failures (invalid payload
  fixture).
- `validateImageInteractionAnswer`: coverage, non-empty required set,
  duplicated required ids, label completeness, unknown hotspot, emptiness for
  missing labels, shape-rectangle mix downsampling, drag-marker annotation on
  the demo, out-of-bounds guards.
- `validateAnswer`: tap full/partial/zero credit, tap selection subset, tap
  off-target rejection, tap outside normalized range rejection, duplicate tap
  rejection, label full/partial/zero credit, unknown label/hotspot rejection,
  duplicate placement, missing placement rejection, rect-valued hotspots,
  minimal + grade fixtures end-to-end, forged-coordinates fidelity, mixed
  `{ taps }`/`{ placements }` mismatch rejection, no-leak evidence.
- `scoringInputs`: 1.0 / 1/3 partial / 0.0, scorableUnits, evidence never
  carries required ids or correct placements.
- `buildHints`, `feedback` (correct/partial/incorrect/timeout, no leaks),
  `availableOn` (default, flag opt-out, voice-only).
- Client facade boundary (no server-only methods/engine methods).
- Controller: coordinate normalization, hit testing (circle/rect/edge),
  tap toggle/clear/select/selectedCount, label select/place/move/remove,
  pending-label lifecycle, completion gates, `buildResponse` shapes.

### 11.2 Session-service IC-series — 11 integration tests

- `IC1` safe image-interaction descriptor end-to-end (mode, image metadata,
  hotspot geometry, no required-hotspot set).
- `IC2/IC3` no correctAnswer or required-hotspot set reaches the client.
- `IC4` label-mode descriptors carry no placements in the raw JSON.
- `IC5` fully-correct image-interaction submission → 100 round score.
- `IC6` partial (2 of 3 labels) → correctnessFraction 2/3, pointsEarned 67.
- `IC7/IC8` forged correctnessFraction/score ignored by the server (tap
  answer with only 1 of 3 required stays 1/3).
- `IC9` malformed answers (non-array taps / unknown hotspot) rejected through
  the service.
- `IC10` mixed drag-drop + image-interaction session runs to completion
  (0–300).
- `IC11` all-image pool runs to completion with per-round safe descriptors.

### 11.3 Full suite

`npm test` → **503 tests, 503 pass, 0 fail** (2 consecutive full runs).
Breakdown:

| Suite | File(s) | Tests |
|---|---|---|
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
| Session service | `session-service.test.js` | 82 |

Game-session suite stability: 5 consecutive runs, 503 each run, 0 failure.

---

## 12. Files

**Created**
- `src/features/activity-engine/plugins/image-interaction/plugin.js`
- `src/features/activity-engine/plugins/image-interaction/image-interaction-controller.js`
- `src/features/activity-engine/plugins/image-interaction/ImageInteractionActivity.jsx`
- `src/features/activity-engine/plugins/image-interaction/image-interaction.css`
- `src/features/activity-engine/plugins/image-interaction/index.js`
- `src/features/activity-engine/testing/image-interaction.test.js`
- `src/features/game-session/demo/image-interaction-demo-questions.js`
- `reports/16-task-4.9-image-interaction.md`

**Modified**
- `src/features/game-session/service/game-session-service.js` (register
  image-interaction in the default engine)
- `src/features/game-session/api/dev-server.js` (seed image-interaction demo
  questions; fix the pre-existing Hono request bridge)
- `src/features/game-session/testing/session-service.test.js` (IC-series: 11
  integration tests)
- `src/App.jsx` (render `ImageInteractionActivity` for
  `kind === 'image-interaction'`)
- `reports/README.md`, `reports/04-todo.md`, `reports/03-decisions.md`,
  `reports/02-development-log.md`

**Packages installed:** none.
**Configuration changes:** none.
**Schema/Supabase changes:** none.

---

## 13. Commands Executed

```
python3 schemas/validate.py      # PASS (24 schemas meta-valid, 72 examples, 12/12 pairs)
npm test                         # 503 pass / 0 fail (2 consecutive full runs)
npm run lint                     # clean (0 warnings / 0 errors)
npm run build                    # client build clean; bundle probes 0 correct-answer hits
```

Game-session suite stability — 5 consecutive runs, 503/503 each.

---

## 14. Bundle Probe After Build

```
dist/assets/index-*.js : activities/image-interaction/correct-answer.schema.json → 0 occurrences
dist/assets/index-*.js : activities/image-interaction/payload.schema.json         → 0 occurrences
dist/assets/index-*.js : getCorrectAnswerSchema                                   → absent
```

---

## 15. Demo API Smoke Test (real HTTP)

A one-shot socket smoke run (self-contained script) started the dev api server
on an ephemeral port, then drove a full session over `fetch`:

```
health: 200 true
round 1 (sorting):        -> next
round 2 (fill-complete):  -> next
round 3 (matching):       -> done
finish: 200 score: 300 types: sorting,fill-complete,matching rounds: 3
SMOKE PASS
```

Plus three of six repeated runs selected an **image-interaction** round
(`types: drag-drop,image-interaction,fill-complete`; `image-interaction,
fill-complete,sorting`; `drag-drop,image-interaction,sorting`) and completed
300/300 each time, with per-round descriptors verified to contain no
`correctAnswer` / `requiredHotspots` / `placements`.

---

## 16. Known Limitations

- Image assets referenced by the Task 3.2 fixture payloads
  (`question-media/water-cycle/...`) are storage references, not bundled
  assets. The demo falls back to a labelled region while keeping the full
  hotspot interaction surface usable; production storage wiring is stage 3.
- Circle hit-testing scales y by height ÷ width to preserve aspect ratio, so a
  circle is an ellipse in non-square images by design (mirrors the canvas
  surface); over-large tolerated taps depend wholly on the authored radius.
- A browser rendering harness is not present; interaction rules are covered by
  the DOM-free controller tests (same trade-off as the previous plugins).

---

## 17. Future Work (not in this task)

- Remaining activity plugins (pattern, memory, scenario-challenge,
  number-logic) following the same pattern.
- A mode-aware registry variant could structurally exclude even the inert
  server-only method source from client bundles (D-051 future work).
- Production image-interaction authoring tooling + the 2,000-question bank
  (stage 3.x; not created here by design), including asset storage wiring.
- Server transport production hardening (session tokens, D-040) is unchanged
  from Task 4.4.