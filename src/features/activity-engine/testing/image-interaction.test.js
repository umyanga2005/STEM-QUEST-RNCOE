/**
 * Activity Engine — image-interaction plugin tests (Task 4.9).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import {
  imageInteractionPlugin,
  registerImageInteraction,
  validateImageInteractionAnswer,
} from '../plugins/image-interaction/plugin.js'
import {
  createImageInteractionState,
  toPercentCoordinates,
  hitTestPoint,
  findHotspotAtPoint,
  isHotspotSelected,
  toggleTap,
  selectHotspot,
  clearTap,
  selectedCount,
  selectLabel,
  getPendingLabel,
  isLabelPlaced,
  getPlacement,
  placeLabel,
  moveLabel,
  removePlacement,
  placedCount,
  clearInteraction,
  resetInteraction,
  isComplete,
  buildResponse,
} from '../plugins/image-interaction/image-interaction-controller.js'

import gradeTapPayload from '../../../../schemas/examples/image-interaction/valid-payload-grade6-7.json' with { type: 'json' }
import gradeTapAnswer from '../../../../schemas/examples/image-interaction/valid-correct-answer.json' with { type: 'json' }
import cellLabelPayload from '../../../../schemas/examples/image-interaction/valid-payload-grade9-11.json' with { type: 'json' }
import labelAnswer from '../../../../schemas/examples/image-interaction/partial-credit.json' with { type: 'json' }
import minimalTapPayload from '../../../../schemas/examples/image-interaction/minimal-valid-payload.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/image-interaction/invalid-payload.json' with { type: 'json' }

// gradeTapPayload: tap, 3 circle hotspots h1/h2/h3 (r=12), image 1024x768;
//   answer requires { h1, h2, h3 }.
// cellLabelPayload: label, hotspots h1/h2 (rect) + h3 (circle), labels l1/l2/l3,
//   image 1200x900; answer places l1→h1, l2→h2, l3→h3.
// minimalTapPayload: tap, hotspots h1 (@50,30 r10) and h2 (@50,70 r10), image 800x600.

const minimalTapAnswer = { mode: 'tap', requiredHotspots: ['h1'] }

const fourHotspotPayload = {
  schemaVersion: '1.0',
  image: { ref: 'question-media/demo/diagram/demo.png', alt: 'Four labelled regions' },
  imageWidth: 1000,
  imageHeight: 1000,
  mode: 'tap',
  hotspots: [
    { id: 'h1', x: 25, y: 25, radius: 10 },
    { id: 'h2', x: 75, y: 25, radius: 10 },
    { id: 'h3', x: 25, y: 75, radius: 10 },
    { id: 'h4', x: 75, y: 75, radius: 10 },
  ],
}
const fourHotspotAnswer = { mode: 'tap', requiredHotspots: ['h1', 'h2'] }

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(imageInteractionPlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(imageInteractionPlugin)
  return engine
}

function runAnswer(engine, response, { payload = gradeTapPayload, correctAnswer = gradeTapAnswer } = {}) {
  return engine.validateAnswer('image-interaction', {
    submission: { questionId: 'q-ii-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

function scoringCtx(response) {
  return { submission: { response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
}

/** A tap exactly at a hotspot's center. */
function tapAt(hotspotId, payload) {
  const hotspot = payload.hotspots.find((h) => h.id === hotspotId)
  return { x: hotspot.x, y: hotspot.y }
}

function tapResponse(payload, ...hotspotIds) {
  return { taps: hotspotIds.filter(Boolean).map((id) => tapAt(id, payload)) }
}

function labelResponse(pairs) {
  return { placements: pairs.map(([labelId, hotspotId]) => ({ labelId, hotspotId })) }
}

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('image-interaction: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('image-interaction'), true)
  const listed = engine.list().find((p) => p.type === 'image-interaction')
  assert.equal(listed.name, 'Image Interaction')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof imageInteractionPlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('image-interaction: registerImageInteraction helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerImageInteraction(engine)
  assert.equal(engine.has('image-interaction'), true)
})

test('image-interaction: coexists with other plugins; duplicate registration rejected', () => {
  const engine = createServerActivityEngine()
  registerImageInteraction(engine)
  assert.throws(() => registerImageInteraction(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('image-interaction: tap render is a safe descriptor with no answer data', () => {
  const engine = clientEngine()
  const descriptor = engine.render('image-interaction', {
    question: {
      prompt: 'Tap the stages of the water cycle.',
      instructions: 'Press the regions you can identify in the diagram.',
      payload: gradeTapPayload,
    },
  })
  assert.equal(descriptor.kind, 'image-interaction')
  assert.equal(descriptor.mode, 'tap')
  assert.equal(descriptor.prompt, 'Tap the stages of the water cycle.')
  assert.equal(descriptor.imageWidth, 1024)
  assert.equal(descriptor.imageHeight, 768)
  assert.equal(descriptor.image.alt, gradeTapPayload.image.alt)
  assert.deepEqual(descriptor.hotspots.map((h) => h.id), ['h1', 'h2', 'h3'])
  assert.equal(descriptor.hotspots[0].x, 25)
  assert.equal(descriptor.hotspots[0].radius, 12)
  assert.equal(descriptor.labels.length, 0)
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('requiredHotspots'))
  assert.ok(!raw.includes('placements'))
  assert.ok(!raw.includes('"correct"'))
  for (const key of ['correctAnswer', 'requiredHotspots', 'placements', 'expected', 'answerKey']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('image-interaction: label render carries public labels and hotspot geometry only', () => {
  const engine = clientEngine()
  const descriptor = engine.render('image-interaction', {
    question: { payload: cellLabelPayload },
  })
  assert.equal(descriptor.mode, 'label')
  assert.equal(descriptor.labels.length, 3)
  assert.deepEqual(descriptor.labels.map((l) => l.text), ['Nucleus', 'Mitochondria', 'Cell wall'])
  const hotspot = descriptor.hotspots.find((h) => h.id === 'h1')
  assert.equal(hotspot.shape, 'rect')
  assert.equal(hotspot.width, 20)
  assert.equal(hotspot.height, 15)
  assert.ok(!('hotspotId' in hotspot), 'hotspot metadata must never carry expected targets')
  assert.ok(!('accepted' in hotspot))
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('placements'))
  assert.ok(!raw.includes('requiredHotspots'))
  assert.ok(!raw.includes('correctAnswer'))
})

test('image-interaction: render applies safe defaults (mode, shape, image metadata)', () => {
  const engine = clientEngine()
  const descriptor = engine.render('image-interaction', {
    question: { payload: minimalTapPayload },
  })
  assert.equal(descriptor.mode, 'tap')
  assert.equal(descriptor.image.width, 800)
  assert.equal(descriptor.hotspots[0].shape, 'circle')
  assert.equal(descriptor.hotspots[0].radius, 10)
  assert.equal(descriptor.hotspots[0].ariaLabel, '')
})

// --------------------------------------------------------------------------
// 3. Payload validation (schema + semantic)
// --------------------------------------------------------------------------

test('image-interaction: valid tap and label payloads pass', () => {
  const engine = serverEngine()
  for (const payload of [gradeTapPayload, cellLabelPayload, minimalTapPayload, fourHotspotPayload]) {
    const result = engine.validatePayload('image-interaction', payload)
    assert.equal(result.valid, true, JSON.stringify(result.errors))
  }
})

test('image-interaction: schema-invalid payloads are rejected', () => {
  const engine = serverEngine()
  const result = engine.validatePayload('image-interaction', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

test('image-interaction: duplicate hotspot ids are a semantic error (uniqueItems is shallow)', () => {
  const engine = serverEngine()
  const dupPayload = {
    ...gradeTapPayload,
    hotspots: [
      { ...gradeTapPayload.hotspots[0] },
      { ...gradeTapPayload.hotspots[1], id: 'h1' },
      { ...gradeTapPayload.hotspots[2] },
    ],
  }
  const result = engine.validatePayload('image-interaction', dupPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'image-interaction.hotspot-ids-unique'))
})

test('image-interaction: duplicate label ids are a semantic error', () => {
  const engine = serverEngine()
  const dupLabels = {
    ...cellLabelPayload,
    labels: [
      { id: 'l1', text: 'A' },
      { id: 'l1', text: 'B' },
      { id: 'l2', text: 'C' },
    ],
  }
  const result = engine.validatePayload('image-interaction', dupLabels)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'image-interaction.label-ids-unique'))
})

test('image-interaction: hotspot and label ids must be disjoint', () => {
  const engine = serverEngine()
  const overlap = {
    ...cellLabelPayload,
    labels: [...cellLabelPayload.labels, { id: 'h1', text: 'overlap' }],
  }
  const result = engine.validatePayload('image-interaction', overlap)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'image-interaction.hotspots-and-labels-disjoint'))
})

test('image-interaction: label mode requires a non-empty labels array', () => {
  const engine = serverEngine()
  const noLabels = { ...cellLabelPayload, labels: [] }
  const result = engine.validatePayload('image-interaction', noLabels)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'image-interaction.label-mode-requires-labels'))
})

test('image-interaction: a circle hotspot must define a radius', () => {
  const engine = serverEngine()
  const noRadius = {
    ...gradeTapPayload,
    hotspots: [
      { ...gradeTapPayload.hotspots[0] },
      { ...gradeTapPayload.hotspots[1] },
      { ...gradeTapPayload.hotspots[2] },
      { id: 'h4', x: 10, y: 10 },
    ],
  }
  const result = engine.validatePayload('image-interaction', noRadius)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'image-interaction.hit-shape-defined'))
})

test('image-interaction: a rect hotspot must define both width and height', () => {
  const engine = serverEngine()
  const noWidth = { ...cellLabelPayload, hotspots: [{ ...cellLabelPayload.hotspots[0], width: undefined }] }
  const result = engine.validatePayload('image-interaction', noWidth)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'image-interaction.hit-shape-defined'))
})

// --------------------------------------------------------------------------
// 4. Cross-document integrity (validateImageInteractionAnswer)
// --------------------------------------------------------------------------

test('image-interaction: consistent pairs have no integrity errors', () => {
  assert.deepEqual(validateImageInteractionAnswer(gradeTapPayload, gradeTapAnswer), [])
  assert.deepEqual(validateImageInteractionAnswer(minimalTapPayload, minimalTapAnswer), [])
  assert.deepEqual(validateImageInteractionAnswer(cellLabelPayload, labelAnswer), [])
})

test('image-interaction: answer mode must match the payload mode', () => {
  const errors = validateImageInteractionAnswer(gradeTapPayload, { mode: 'label', placements: [{ labelId: 'l1', hotspotId: 'h1' }] })
  assert.ok(errors.some((e) => e.message.includes('does not match payload mode')))
})

test('image-interaction: requiredHotspots must reference known hotspots', () => {
  const errors = validateImageInteractionAnswer(minimalTapPayload, { mode: 'tap', requiredHotspots: ['h1', 'h9'] })
  assert.ok(errors.some((e) => e.message.includes('unknown hotspot "h9"')))
})

test('image-interaction: a tap answer must not carry placements', () => {
  const errors = validateImageInteractionAnswer(gradeTapPayload, { mode: 'tap', requiredHotspots: ['h1'], placements: [{ labelId: 'l1', hotspotId: 'h1' }] })
  assert.ok(errors.some((e) => e.message.includes('must not contain placements')))
})

test('image-interaction: a label answer must not carry requiredHotspots', () => {
  const errors = validateImageInteractionAnswer(cellLabelPayload, { mode: 'label', requiredHotspots: ['h1'], placements: cellLabelPayload.labels.map((l) => ({ labelId: l.id, hotspotId: l.id })) })
  assert.ok(errors.some((e) => e.message.includes('must not contain requiredHotspots')))
})

test('image-interaction: placements must reference known labels and hotspots', () => {
  const bad = validateImageInteractionAnswer(cellLabelPayload, { mode: 'label', placements: [{ labelId: 'l9', hotspotId: 'h1' }, { labelId: 'l1', hotspotId: 'h9' }] })
  assert.ok(bad.some((e) => e.message.includes('unknown label "l9"')))
  assert.ok(bad.some((e) => e.message.includes('unknown hotspot "h9"')))
})

test('image-interaction: a label answer must cover every payload label exactly once', () => {
  const duplicate = validateImageInteractionAnswer(cellLabelPayload, {
    mode: 'label',
    placements: [{ labelId: 'l1', hotspotId: 'h1' }, { labelId: 'l1', hotspotId: 'h2' }, { labelId: 'l2', hotspotId: 'h3' }],
  })
  assert.ok(duplicate.some((e) => e.message.includes('more than one placement')))
  const missing = validateImageInteractionAnswer(cellLabelPayload, {
    mode: 'label',
    placements: [{ labelId: 'l1', hotspotId: 'h1' }, { labelId: 'l2', hotspotId: 'h2' }],
  })
  assert.ok(missing.some((e) => e.message.includes('label "l3" has no placement')))
})

test('image-interaction: a schema-valid but semantically broken answer is rejected through the engine', () => {
  const engine = serverEngine()
  // requiredHotspots referencing an unknown hotspot is schema-valid (refs are
  // not schema-checked) but semantically wrong — an author bug.
  assert.throws(
    () => runAnswer(engine, tapResponse(minimalTapPayload, 'h1'), { payload: minimalTapPayload, correctAnswer: { mode: 'tap', requiredHotspots: ['h9'] } }),
    (err) => err.code === ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID
  )
  // An inconsistent-answer document is likewise rejected before student scoring.
  assert.throws(
    () => runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h2'], ['l3', 'h3']]), {
      payload: cellLabelPayload,
      correctAnswer: { mode: 'label', placements: [{ labelId: 'l1', hotspotId: 'h1' }, { labelId: 'l2', hotspotId: 'h2' }] },
    }),
    (err) => err.code === ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID
  )
})

// --------------------------------------------------------------------------
// 5. Coordinates: normalization, hit-testing, boundaries
// --------------------------------------------------------------------------

test('image-interaction coords: pointer positions convert to normalized percentages', () => {
  // Mobile-size surface.
  const mobile = { left: 0, top: 0, width: 320, height: 240 }
  assert.deepEqual(toPercentCoordinates(160, 120, mobile), { x: 50, y: 50 })
  assert.deepEqual(toPercentCoordinates(80, 60, mobile), { x: 25, y: 25 })
  // Desktop-size surface.
  const desktop = { left: 40, top: 200, width: 1024, height: 768 }
  assert.deepEqual(toPercentCoordinates(296, 584, desktop), { x: 25, y: 50 })
})

test('image-interaction coords: out-of-surface pointers clamp to [0, 100]', () => {
  const rect = { left: 0, top: 0, width: 1000, height: 1000 }
  assert.deepEqual(toPercentCoordinates(-10, 2000, rect), { x: 0, y: 100 })
  assert.deepEqual(toPercentCoordinates(5000, -500, rect), { x: 100, y: 0 })
})

test('image-interaction coords: zero-size rect degrades to { 0, 0 } without division', () => {
  assert.deepEqual(toPercentCoordinates(50, 50, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 })
  assert.deepEqual(toPercentCoordinates(50, 50, {}), { x: 0, y: 0 })
})

test('image-interaction coords: circle hit-testing honours the %-of-width radius', () => {
  // 800x600 image, hotspot circle at (50, 30) radius 10 (% of width).
  const hotspot = { id: 'h1', x: 50, y: 30, shape: 'circle', radius: 10 }
  assert.equal(hitTestPoint(hotspot, 50, 30, 800, 600), true, 'center hits')
  assert.equal(hitTestPoint(hotspot, 59, 30, 800, 600), true, 'right edge (radius% of width)')
  assert.equal(hitTestPoint(hotspot, 61, 30, 800, 600), false, 'just outside')
  // Aspect correction: radius is % of width, y is % of height. On 800x600 the
  // physical radius spans 80px = 13.33% of height, so the hit ellipse is
  // taller than the naive 10% circle (that would extend to y = 40).
  assert.equal(hitTestPoint(hotspot, 50, 37, 800, 600), true, 'vertical within corrected ellipse')
  assert.equal(hitTestPoint(hotspot, 50, 42, 800, 600), true, 'corrected ellipse is taller than naive radius')
  assert.equal(hitTestPoint(hotspot, 50, 44, 800, 600), false, 'vertical far outside')
})

test('image-interaction coords: rect hit-testing uses %-width and %-height directly', () => {
  const hotspot = { id: 'h1', x: 40, y: 40, shape: 'rect', width: 20, height: 15 }
  assert.equal(hitTestPoint(hotspot, 40, 40, 1200, 900), true)
  assert.equal(hitTestPoint(hotspot, 49, 40, 1200, 900), true)
  assert.equal(hitTestPoint(hotspot, 51, 40, 1200, 900), false)
  assert.equal(hitTestPoint(hotspot, 40, 46, 1200, 900), true)
  assert.equal(hitTestPoint(hotspot, 40, 48, 1200, 900), false)
})

test('image-interaction coords: findHotspotAtPoint returns the first containing hotspot', () => {
  const found = findHotspotAtPoint(minimalTapPayload.hotspots, 50, 30, 800, 600)
  assert.equal(found.id, 'h1')
  const none = findHotspotAtPoint(minimalTapPayload.hotspots, 5, 5, 800, 600)
  assert.equal(none, null)
})

// --------------------------------------------------------------------------
// 6. Tap controller
// --------------------------------------------------------------------------

test('image-interaction tap controller: initial state has no selections', () => {
  const state = createImageInteractionState({ mode: 'tap', hotspotDefs: minimalTapPayload.hotspots })
  assert.deepEqual(state.selections, [])
  assert.equal(isComplete(state), false)
  assert.equal(selectedCount(state), 0)
})

test('image-interaction tap controller: toggle selects and removes a hotspot', () => {
  let state = createImageInteractionState({ mode: 'tap', hotspotDefs: minimalTapPayload.hotspots })
  state = toggleTap(state, 'h1', 50, 30)
  assert.equal(isHotspotSelected(state, 'h1'), true)
  assert.equal(selectedCount(state), 1)
  assert.equal(isComplete(state), true)
  state = toggleTap(state, 'h2', 50, 70)
  assert.equal(selectedCount(state), 2)
  state = toggleTap(state, 'h1', 50, 30)
  assert.equal(isHotspotSelected(state, 'h1'), false)
  assert.equal(selectedCount(state), 1)
})

test('image-interaction tap controller: selectHotspot is a no-op for already-selected and unknown ids', () => {
  let state = createImageInteractionState({ mode: 'tap', hotspotDefs: minimalTapPayload.hotspots })
  state = selectHotspot(state, 'h1', 50, 30)
  const same = selectHotspot(state, 'h1', 60, 40)
  assert.equal(same, state, 'duplicate select must not re-record')
  assert.equal(toggleTap(state, 'nope', 0, 0), state, 'unknown hotspot is a no-op')
})

test('image-interaction tap controller: clearTap, clearInteraction and reset', () => {
  let state = createImageInteractionState({ mode: 'tap', hotspotDefs: minimalTapPayload.hotspots })
  state = toggleTap(state, 'h1', 50, 30)
  state = toggleTap(state, 'h2', 50, 70)
  state = clearTap(state, 'h1')
  assert.equal(isHotspotSelected(state, 'h1'), false)
  assert.equal(isHotspotSelected(state, 'h2'), true)
  state = clearInteraction(state)
  assert.deepEqual(state.selections, [])
  assert.equal(isComplete(state), false)
})

test('image-interaction tap controller: response serializes distinct coordinates in order', () => {
  let state = createImageInteractionState({ mode: 'tap', hotspotDefs: minimalTapPayload.hotspots })
  state = toggleTap(state, 'h1', 50, 30)
  state = toggleTap(state, 'h2', 50, 70)
  const response = buildResponse(state)
  assert.deepEqual(response, { taps: [{ x: 50, y: 30 }, { x: 50, y: 70 }] })
})

// --------------------------------------------------------------------------
// 7. Label controller
// --------------------------------------------------------------------------

test('image-interaction label controller: initial state and label selection', () => {
  const state = createImageInteractionState({ mode: 'label', hotspotDefs: cellLabelPayload.hotspots, labelDefs: cellLabelPayload.labels })
  assert.deepEqual(state.placements, [])
  assert.equal(getPendingLabel(state), null)
  const next = selectLabel(state, 'l1')
  assert.equal(getPendingLabel(next), 'l1')
  const toggled = selectLabel(next, 'l1')
  assert.equal(getPendingLabel(toggled), null, 're-selecting toggles off')
  assert.equal(selectLabel(state, 'nope'), state, 'unknown label is a no-op')
})

test('image-interaction label controller: placing, moving and removing labels', () => {
  let state = createImageInteractionState({ mode: 'label', hotspotDefs: cellLabelPayload.hotspots, labelDefs: cellLabelPayload.labels })
  state = selectLabel(state, 'l1')
  state = placeLabel(state, 'l1', 'h1')
  assert.equal(getPendingLabel(state), null, 'placing clears the pending selection')
  assert.equal(isLabelPlaced(state, 'l1'), true)
  assert.equal(getPlacement(state, 'l1'), 'h1')
  assert.equal(placedCount(state), 1)
  state = moveLabel(state, 'l1', 'h2')
  assert.equal(getPlacement(state, 'l1'), 'h2')
  state = removePlacement(state, 'l1')
  assert.equal(isLabelPlaced(state, 'l1'), false)
  assert.equal(placeLabel(state, 'nope', 'h1'), state, 'unknown label is a no-op')
  assert.equal(placeLabel(state, 'l1', 'nope'), state, 'unknown hotspot is a no-op')
  assert.equal(moveLabel(state, 'l1', 'h1'), state, 'moving an unplaced label is a no-op')
})

test('image-interaction label controller: completion requires every label', () => {
  let state = createImageInteractionState({ mode: 'label', hotspotDefs: cellLabelPayload.hotspots, labelDefs: cellLabelPayload.labels })
  assert.equal(isComplete(state), false)
  state = placeLabel(state, 'l1', 'h1')
  state = placeLabel(state, 'l2', 'h2')
  assert.equal(isComplete(state), false)
  state = placeLabel(state, 'l3', 'h3')
  assert.equal(isComplete(state), true)
})

test('image-interaction label controller: clear and reset restore the tray', () => {
  let state = createImageInteractionState({ mode: 'label', hotspotDefs: cellLabelPayload.hotspots, labelDefs: cellLabelPayload.labels })
  state = placeLabel(state, 'l1', 'h1')
  state = selectLabel(state, 'l2')
  state = resetInteraction(state)
  assert.deepEqual(state.placements, [])
  assert.equal(getPendingLabel(state), null)
})

test('image-interaction label controller: response serializes every label in payload order', () => {
  let state = createImageInteractionState({ mode: 'label', hotspotDefs: cellLabelPayload.hotspots, labelDefs: cellLabelPayload.labels })
  state = placeLabel(state, 'l3', 'h3')
  state = placeLabel(state, 'l1', 'h1')
  state = placeLabel(state, 'l2', 'h2')
  const response = buildResponse(state)
  assert.deepEqual(response, {
    placements: [
      { labelId: 'l1', hotspotId: 'h1' },
      { labelId: 'l2', hotspotId: 'h2' },
      { labelId: 'l3', hotspotId: 'h3' },
    ],
  })
})

// --------------------------------------------------------------------------
// 8. Tap answer validation
// --------------------------------------------------------------------------

test('image-interaction tap: a fully-correct tap set is accepted', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(gradeTapPayload, 'h1', 'h2', 'h3'))
  assert.equal(v.correct, true)
  assert.equal(v.detail.mode, 'tap')
  assert.equal(v.detail.required, 3)
  assert.equal(v.detail.correctUnits, 3)
  assert.equal(v.detail.wrongUnits, 0)
})

test('image-interaction tap: partial identification scores the hit subset', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(gradeTapPayload, 'h1', 'h2'))
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctUnits, 2)
  assert.equal(v.detail.wrongUnits, 0)
})

test('image-interaction tap: extra selections are wrong units (over-selection penalised)', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(fourHotspotPayload, 'h1', 'h2', 'h3'), {
    payload: fourHotspotPayload,
    correctAnswer: fourHotspotAnswer,
  })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctUnits, 2)
  assert.equal(v.detail.wrongUnits, 1)
})

test('image-interaction tap: tapping every hotspot cannot cheat the score', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(minimalTapPayload, 'h1', 'h2'), {
    payload: minimalTapPayload,
    correctAnswer: minimalTapAnswer,
  })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctUnits, 1)
  assert.equal(v.detail.wrongUnits, 1)
})

test('image-interaction tap: duplicate taps on one hotspot do not inflate credit', () => {
  const engine = serverEngine()
  const response = { taps: [tapAt('h1', minimalTapPayload), tapAt('h1', minimalTapPayload)] }
  const v = runAnswer(engine, response, { payload: minimalTapPayload, correctAnswer: minimalTapAnswer })
  assert.equal(v.correct, true)
  assert.equal(v.detail.correctUnits, 1)
})

test('image-interaction tap: empty submissions score zero but are not rejected (client cannot know the required count)', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { taps: [] })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctUnits, 0)
  assert.equal(v.detail.wrongUnits, 0)
})

test('image-interaction tap: malformed and out-of-range taps are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { taps: 'x' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { taps: [{ x: 50 }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { taps: [{ x: NaN, y: 50 }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  // Coordinates outside the normalized range are rejected.
  assert.throws(() => runAnswer(engine, { taps: [{ x: 101, y: 50 }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { taps: [{ x: -1, y: 50 }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  // A tap on empty image space never maps to a hotspot.
  assert.throws(() => runAnswer(engine, { taps: [{ x: 0, y: 0 }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('image-interaction tap: forged top-level fields cannot alter correctness', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { taps: tapResponse(minimalTapPayload, 'h1').taps, requiredHotspots: [], score: 999, correct: true }, { payload: minimalTapPayload, correctAnswer: minimalTapAnswer })
  assert.equal(v.correct, true, 'extra fields are ignored; taps decide the result')
})

// --------------------------------------------------------------------------
// 9. Label answer validation
// --------------------------------------------------------------------------

test('image-interaction label: a fully-correct placement set is accepted', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h2'], ['l3', 'h3']]), {
    payload: cellLabelPayload,
    correctAnswer: labelAnswer,
  })
  assert.equal(v.correct, true)
  assert.equal(v.detail.mode, 'label')
  assert.equal(v.detail.required, 3)
  assert.equal(v.detail.correctUnits, 3)
})

test('image-interaction label: a partially-correct placement set is partial', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h3'], ['l3', 'h2']]), {
    payload: cellLabelPayload,
    correctAnswer: labelAnswer,
  })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctUnits, 1)
  assert.equal(v.detail.wrongUnits, 2)
})

test('image-interaction label: unknown labels and hotspots are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, labelResponse([['l9', 'h1'], ['l2', 'h2'], ['l3', 'h3']]), { payload: cellLabelPayload, correctAnswer: labelAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
  assert.throws(
    () => runAnswer(engine, labelResponse([['l1', 'h9'], ['l2', 'h2'], ['l3', 'h3']]), { payload: cellLabelPayload, correctAnswer: labelAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('image-interaction label: duplicate and missing placements are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, labelResponse([['l1', 'h1'], ['l1', 'h2'], ['l2', 'h3']]), { payload: cellLabelPayload, correctAnswer: labelAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
  assert.throws(
    () => runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h2']]), { payload: cellLabelPayload, correctAnswer: labelAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('image-interaction label: malformed placement structures are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { placements: 'nope' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { placements: [{ labelId: 42, hotspotId: 'h1' }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('image-interaction label: a tap response on a label payload is rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { taps: [tapAt('h1', cellLabelPayload)] }, { payload: cellLabelPayload, correctAnswer: labelAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('image-interaction label: forged placements cannot alter correctness', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { placements: labelResponse([['l1', 'h1'], ['l2', 'h2'], ['l3', 'h3']]).placements, score: 999 }, {
    payload: cellLabelPayload,
    correctAnswer: labelAnswer,
  })
  assert.equal(v.correct, true)
})

// --------------------------------------------------------------------------
// 10. Scoring (tap)
// --------------------------------------------------------------------------

test('image-interaction tap scoring: full credit is 1.0 with correct scorableUnits', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(gradeTapPayload, 'h1', 'h2', 'h3'))
  const scoring = engine.scoringInputs('image-interaction', scoringCtx(tapResponse(gradeTapPayload, 'h1')), v)
  assert.equal(scoring.correctnessFraction, 1)
  assert.equal(scoring.scorableUnits, 3)
  assert.equal(scoring.correctUnits, 3)
})

test('image-interaction tap scoring: over-selection is penalised into the fraction', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(fourHotspotPayload, 'h1', 'h2', 'h3'), {
    payload: fourHotspotPayload,
    correctAnswer: fourHotspotAnswer,
  })
  const scoring = engine.scoringInputs('image-interaction', scoringCtx(tapResponse(fourHotspotPayload, 'h1')), v)
  assert.equal(scoring.correctnessFraction, 0.5) // (2 correct − 1 extra) / 2
  assert.equal(scoring.scorableUnits, 2)
})

test('image-interaction tap scoring: 2 of 3 required is 2/3', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(gradeTapPayload, 'h1', 'h2'))
  const scoring = engine.scoringInputs('image-interaction', scoringCtx(tapResponse(gradeTapPayload, 'h1')), v)
  assert.equal(scoring.correctnessFraction, 2 / 3)
})

test('image-interaction tap scoring: zero credit is 0.0', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(minimalTapPayload, 'h2'), {
    payload: minimalTapPayload,
    correctAnswer: minimalTapAnswer,
  })
  const scoring = engine.scoringInputs('image-interaction', scoringCtx(tapResponse(minimalTapPayload, 'h2')), v)
  assert.equal(scoring.correctnessFraction, 0)
})

test('image-interaction tap scoring: evidence carries submitted taps only, never the required set', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, tapResponse(fourHotspotPayload, 'h1', 'h3'), {
    payload: fourHotspotPayload,
    correctAnswer: fourHotspotAnswer,
  })
  const scoring = engine.scoringInputs('image-interaction', scoringCtx({}), v)
  const raw = JSON.stringify(scoring.evidence)
  assert.ok(scoring.evidence.every((e) => typeof e.x === 'number' && typeof e.y === 'number'))
  assert.ok(!raw.includes('"required'))
  assert.ok(!JSON.stringify(scoring).includes('requiredHotspots'))
})

// --------------------------------------------------------------------------
// 11. Scoring (label)
// --------------------------------------------------------------------------

test('image-interaction label scoring: 1.0 / partial / 0.0 fractions', () => {
  const engine = serverEngine()
  assert.equal(
    engine.scoringInputs('image-interaction', scoringCtx({}), runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h2'], ['l3', 'h3']]), { payload: cellLabelPayload, correctAnswer: labelAnswer })).correctnessFraction,
    1
  )
  assert.equal(
    engine.scoringInputs('image-interaction', scoringCtx({}), runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h3'], ['l3', 'h2']]), { payload: cellLabelPayload, correctAnswer: labelAnswer })).correctnessFraction,
    1 / 3
  )
  assert.equal(
    engine.scoringInputs('image-interaction', scoringCtx({}), runAnswer(engine, labelResponse([['l1', 'h3'], ['l2', 'h1'], ['l3', 'h2']]), { payload: cellLabelPayload, correctAnswer: labelAnswer })).correctnessFraction,
    0
  )
})

test('image-interaction label scoring: evidence never reveals expected hotspots', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h3'], ['l3', 'h2']]), {
    payload: cellLabelPayload,
    correctAnswer: labelAnswer,
  })
  const scoring = engine.scoringInputs('image-interaction', scoringCtx({}), v)
  const raw = JSON.stringify(scoring.evidence)
  assert.equal(scoring.scorableUnits, 3)
  assert.ok(raw.includes('"correct":false'), 'per-unit flags are expected')
  assert.ok(!JSON.stringify(scoring).includes('placements'))
  assert.ok(!raw.includes('"hotspotId":"h2","hotspotId"'), 'no expected mapping duplicates')
})

test('image-interaction label scoring: scorableUnits equals the label count', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, labelResponse([['l1', 'h1'], ['l2', 'h2'], ['l3', 'h3']]), {
    payload: cellLabelPayload,
    correctAnswer: labelAnswer,
  })
  const scoring = engine.scoringInputs('image-interaction', scoringCtx({}), v)
  assert.equal(scoring.scorableUnits, 3)
  assert.equal(scoring.correctUnits, 3)
})

// --------------------------------------------------------------------------
// 12. Hints
// --------------------------------------------------------------------------

test('image-interaction: hints are authored and never reveal the answer', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('image-interaction', {
    hints: [{ level: 1, text: 'Look for the shapes drawn with a solid outline.' }],
  })
  assert.equal(hints.length, 1)
  assert.equal(hints[0].text, 'Look for the shapes drawn with a solid outline.')
  assert.ok(!JSON.stringify(hints).includes('h1'))
})

test('image-interaction: no hints when none are authored', () => {
  const engine = clientEngine()
  assert.deepEqual(engine.buildHints('image-interaction', { hints: null }), [])
})

// --------------------------------------------------------------------------
// 13. Feedback
// --------------------------------------------------------------------------

test('image-interaction feedback: correct / partial / incorrect / timeout, mode-aware', () => {
  const engine = serverEngine()
  const ok = { submission: { state: 'submitted' }, interactionMetrics: { attemptsUsed: 1 } }
  const partialTap = { detail: { mode: 'tap', required: 3, correctUnits: 2, wrongUnits: 0 } }
  const zeroLabel = { detail: { mode: 'label', required: 3, correctUnits: 0, wrongUnits: 3 } }
  assert.equal(engine.feedback('image-interaction', ok, { detail: { mode: 'tap', required: 3, correctUnits: 3, wrongUnits: 0 } }).state, 'correct')
  assert.ok(engine.feedback('image-interaction', ok, partialTap).message.includes('2 of 3'))
  assert.ok(engine.feedback('image-interaction', ok, zeroLabel).message.includes('None of the labels'))
  const timeout = engine.feedback('image-interaction', { submission: { state: 'timeout' } }, zeroLabel)
  assert.equal(timeout.state, 'timeout')
})

test('image-interaction feedback: never leaks the required hotspots or placements', () => {
  const engine = serverEngine()
  const raw = JSON.stringify(engine.feedback('image-interaction', { submission: { state: 'submitted' } }, { detail: { mode: 'tap', required: 3, correctUnits: 1, wrongUnits: 1 } }))
  assert.ok(!raw.includes('requiredHotspots'))
  assert.ok(!raw.includes('placements'))
  assert.ok(!raw.includes('h1'))
})

// --------------------------------------------------------------------------
// 14. Availability
// --------------------------------------------------------------------------

test('image-interaction: available by default and when the flag opts in', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('image-interaction', {}), true)
  assert.equal(engine.availableOn('image-interaction', { featureFlags: { 'image-interaction': true } }), true)
})

test('image-interaction: availability flag can opt out; voice-only still passes', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('image-interaction', { featureFlags: { 'image-interaction': false } }), false)
  assert.equal(engine.availableOn('image-interaction', { capabilities: { input: { pointer: false, keyboard: false, voice: true } } }), true)
})

// --------------------------------------------------------------------------
// 15. Client facade boundary
// --------------------------------------------------------------------------

test('image-interaction: the client facade exposes no server-only methods', () => {
  const engine = clientEngine()
  const listed = engine.list().find((p) => p.type === 'image-interaction')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.ok(!(method in listed), `client facade must not expose "${method}"`)
  }
  assert.equal(engine.scoringInputs, undefined)
})

test('image-interaction: the client engine has no validateAnswer/scoringInputs/feedback/getCorrectAnswerSchema', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(engine[method], undefined)
  }
})

// --------------------------------------------------------------------------
// 16. Accessibility contract surface
// --------------------------------------------------------------------------

test('image-interaction: the descriptor carries the metadata needed for accessible controls', () => {
  const engine = clientEngine()
  const tap = engine.render('image-interaction', { question: { payload: gradeTapPayload } })
  assert.ok(tap.hotspots.every((h) => h.id), 'every hotspot renders as a real button target')
  assert.equal(tap.hotspots[0].ariaLabel, (gradeTapPayload.hotspots[0].ariaLabel ?? ''))
  assert.equal(tap.hotspots[0].ariaLabel, '')
  const label = engine.render('image-interaction', { question: { payload: cellLabelPayload } })
  assert.deepEqual(label.labels.map((l) => l.text), ['Nucleus', 'Mitochondria', 'Cell wall'])
})

test('image-interaction: reduced-motion styling is present in the stylesheet', () => {
  const css = String(readFileSync(new URL('../plugins/image-interaction/image-interaction.css', import.meta.url)))
  assert.ok(css.includes('prefers-reduced-motion'))
  assert.ok(css.includes('transition: none'))
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('image-surface'))
})