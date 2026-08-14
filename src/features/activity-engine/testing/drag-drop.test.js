/**
 * Activity Engine — drag-drop plugin tests (Task 4.2).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import { dragDropPlugin, validateMappings, registerDragDrop } from '../plugins/drag-drop/plugin.js'

import minimalPayload from '../../../../schemas/examples/drag-drop/minimal-valid-payload.json' with { type: 'json' }
import gradePayload from '../../../../schemas/examples/drag-drop/valid-payload-grade6-7.json' with { type: 'json' }
import gradeAnswer from '../../../../schemas/examples/drag-drop/valid-correct-answer.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/drag-drop/invalid-payload.json' with { type: 'json' }
import invalidAnswer from '../../../../schemas/examples/drag-drop/invalid-correct-answer.json' with { type: 'json' }

// gradePayload: items i1..i4 (Sunlight, Wind, Coal, Natural gas),
// zones z1/z2 (Renewable, Non-renewable). gradeAnswer: i1→z1, i2→z1, i3→z2, i4→z2.

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(dragDropPlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(dragDropPlugin)
  return engine
}

function answerResponse(mappings) {
  return { placements: mappings.map(([itemId, zoneId]) => ({ itemId, zoneId })) }
}

function runAnswer(engine, response, { payload = gradePayload, correctAnswer = gradeAnswer } = {}) {
  return engine.validateAnswer('drag-drop', {
    submission: { questionId: 'q-dd-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

// --------------------------------------------------------------------------
// 1. Registration
// --------------------------------------------------------------------------

test('drag-drop: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('drag-drop'), true)
  const listed = engine.list().find((p) => p.type === 'drag-drop')
  assert.equal(listed.name, 'Drag & Drop')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
})

test('drag-drop: registerDragDrop helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerDragDrop(engine)
  assert.equal(engine.has('drag-drop'), true)
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('drag-drop: render produces a descriptor with no correct-answer keys', () => {
  const engine = clientEngine()
  const descriptor = engine.render('drag-drop', {
    question: {
      prompt: 'Classify the items.',
      instructions: 'Move each item to a zone.',
      payload: gradePayload,
    },
  })
  assert.equal(descriptor.kind, 'drag-drop')
  assert.equal(descriptor.prompt, 'Classify the items.')
  assert.equal(descriptor.mode, 'multi-target')
  assert.equal(descriptor.items.length, 4)
  assert.equal(descriptor.zones.length, 2)
  for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'mappings']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('drag-drop: render preserves item order when randomizeItems is false', () => {
  const engine = clientEngine()
  const descriptor = engine.render('drag-drop', {
    question: { payload: { ...gradePayload, randomizeItems: false } },
  })
  assert.deepEqual(
    descriptor.items.map((i) => i.id),
    ['i1', 'i2', 'i3', 'i4']
  )
})

test('drag-drop: render shuffles item order when randomizeItems is true', () => {
  const engine = clientEngine()
  const descriptor = engine.render('drag-drop', {
    question: { payload: { ...gradePayload, randomizeItems: true } },
  })
  assert.deepEqual(descriptor.items.map((i) => i.id).sort(), ['i1', 'i2', 'i3', 'i4'])
})

test('drag-drop: render honours single-target mode', () => {
  const engine = clientEngine()
  const descriptor = engine.render('drag-drop', {
    question: { payload: { ...minimalPayload, mode: 'single-target' } },
  })
  assert.equal(descriptor.mode, 'single-target')
})

// --------------------------------------------------------------------------
// 3. validatePayload (authoring-time semantic rules)
// --------------------------------------------------------------------------

test('drag-drop: validatePayload accepts conformant payloads', () => {
  const engine = clientEngine()
  assert.equal(engine.validatePayload('drag-drop', minimalPayload).valid, true)
  assert.equal(engine.validatePayload('drag-drop', gradePayload).valid, true)
})

test('drag-drop: validatePayload rejects duplicate item ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    items: [
      { id: 'i1', label: 'Sunlight' },
      { id: 'i1', label: 'Wind' },
    ],
  }
  const result = engine.validatePayload('drag-drop', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'drag-drop.item-ids-unique')
})

test('drag-drop: validatePayload rejects duplicate zone ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    zones: [
      { id: 'z1', label: 'Renewable' },
      { id: 'z1', label: 'Non-renewable' },
    ],
  }
  const result = engine.validatePayload('drag-drop', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'drag-drop.zone-ids-unique')
})

test('drag-drop: validatePayload rejects item/zone id collisions', () => {
  const engine = clientEngine()
  const fixed = { ...gradePayload, zones: [{ id: 'i1', label: 'Renewable' }] }
  const result = engine.validatePayload('drag-drop', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'drag-drop.item-zone-ids-disjoint')
})

test('drag-drop: validatePayload rejects single-target with more than one zone', () => {
  const engine = clientEngine()
  const fixed = { ...gradePayload, mode: 'single-target' }
  const result = engine.validatePayload('drag-drop', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'drag-drop.single-target-requires-one-zone')
})

test('drag-drop: validatePayload still fails the schema layer for malformed payloads', () => {
  const engine = clientEngine()
  const result = engine.validatePayload('drag-drop', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

// --------------------------------------------------------------------------
// 4. validateMappings (catalog rules port: cover-items + zone-exists)
// --------------------------------------------------------------------------

test('drag-drop: validateMappings passes a consistent pair', () => {
  assert.deepEqual(validateMappings(gradePayload, gradeAnswer), [])
})

test('drag-drop: validateMappings catches an unmapped item (cover-items)', () => {
  const answer = { mappings: [{ itemId: 'i1', zoneId: 'z1' }, { itemId: 'i2', zoneId: 'z1' }] }
  const errors = validateMappings(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'drag-drop.mappings-cover-items' && e.message.includes('i3')))
})

test('drag-drop: validateMappings catches a duplicated mapping (cover-items)', () => {
  const answer = {
    mappings: [
      { itemId: 'i1', zoneId: 'z1' },
      { itemId: 'i1', zoneId: 'z2' },
      { itemId: 'i2', zoneId: 'z2' },
      { itemId: 'i3', zoneId: 'z1' },
      { itemId: 'i4', zoneId: 'z2' },
    ],
  }
  const errors = validateMappings(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'drag-drop.mappings-cover-items' && e.message.includes('more than once')))
})

test('drag-drop: validateMappings catches an unknown zone (zone-exists)', () => {
  const answer = {
    mappings: [
      { itemId: 'i1', zoneId: 'z9' },
      { itemId: 'i2', zoneId: 'z1' },
      { itemId: 'i3', zoneId: 'z2' },
      { itemId: 'i4', zoneId: 'z2' },
    ],
  }
  const errors = validateMappings(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'drag-drop.mappings-zone-exists'))
})

test('drag-drop: validateAnswer throws ACTIVITY_PAYLOAD_SEMANTIC_INVALID for an inconsistent (but schema-valid) answer document', () => {
  const engine = serverEngine()
  const inconsistent = {
    mappings: [
      { itemId: 'i1', zoneId: 'z1' },
      { itemId: 'i2', zoneId: 'z1' },
      { itemId: 'i3', zoneId: 'z2' },
      { itemId: 'i4', zoneId: 'z9' },
    ],
  }
  assert.throws(
    () => runAnswer(engine, answerResponse([['i1', 'z1'], ['i2', 'z1'], ['i3', 'z2'], ['i4', 'z2']]), { correctAnswer: inconsistent }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
      assert.equal(err.details.errors[0].ruleId, 'drag-drop.mappings-zone-exists')
      return true
    }
  )
})

test('drag-drop: a schema-invalid answer document is stopped by the engine guard (ENGINE_INTERNAL)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, answerResponse([['i1', 'z1'], ['i2', 'z1'], ['i3', 'z2'], ['i4', 'z2']]), { correctAnswer: invalidAnswer }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ENGINE_INTERNAL)
      return true
    }
  )
})

// --------------------------------------------------------------------------
// 5. validateAnswer correctness + partial credit
// --------------------------------------------------------------------------

test('drag-drop: validateAnswer returns correct=true for all right placements', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, answerResponse([['i1', 'z1'], ['i2', 'z1'], ['i3', 'z2'], ['i4', 'z2']]))
  assert.equal(result.correct, true)
  assert.equal(result.detail.correctCount, 4)
  assert.equal(result.detail.total, 4)
})

test('drag-drop: validateAnswer returns correct=false with partial credit detail', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, answerResponse([['i1', 'z1'], ['i2', 'z2'], ['i3', 'z2'], ['i4', 'z2']]))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 3)
  assert.equal(result.detail.placements[1].correct, false)
})

test('drag-drop: validateAnswer returns correct=false for all wrong placements', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, answerResponse([['i1', 'z2'], ['i2', 'z2'], ['i3', 'z1'], ['i4', 'z1']]))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 0)
})

test('drag-drop: validateAnswer treats an unplaced item as incorrect (zoneId null)', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, answerResponse([['i1', 'z1'], ['i2', 'z1'], ['i3', 'z2']]))
  assert.equal(result.correct, false)
  const missing = result.detail.placements.find((p) => p.itemId === 'i4')
  assert.equal(missing.zoneId, null)
  assert.equal(missing.correct, false)
})

test('drag-drop: validateAnswer rejects a duplicated item placement', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, answerResponse([['i1', 'z1'], ['i1', 'z2'], ['i2', 'z1'], ['i3', 'z2'], ['i4', 'z2']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
})

test('drag-drop: validateAnswer rejects malformed placements shape', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { placements: [{ itemId: 'i1' }] }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
  assert.throws(
    () => runAnswer(engine, { placements: 'nope' }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
})

test('drag-drop: validateAnswer rejects an unknown item id (not silently accepted)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, answerResponse([['zzz', 'z1'], ['i2', 'z1'], ['i3', 'z2'], ['i4', 'z2']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /unknown item id "zzz"/)
      return true
    }
  )
})

test('drag-drop: validateAnswer rejects an unknown zone id (not silently accepted)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, answerResponse([['i1', 'z9'], ['i2', 'z1'], ['i3', 'z2'], ['i4', 'z2']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /unknown zone id "z9"/)
      return true
    }
  )
})

// --------------------------------------------------------------------------
// 6. scoringInputs (partial credit)
// --------------------------------------------------------------------------

test('drag-drop: scoringInputs reports correctnessFraction 1 on full credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(
    engine,
    answerResponse([['i1', 'z1'], ['i2', 'z1'], ['i3', 'z2'], ['i4', 'z2']])
  )
  const inputs = engine.scoringInputs('drag-drop', {
    submission: { questionId: 'q-dd-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload: gradePayload,
    correctAnswer: gradeAnswer,
  }, validation)
  assert.equal(inputs.correctnessFraction, 1)
  assert.equal(inputs.scorableUnits, 4)
  assert.equal(inputs.correctUnits, 4)
})

test('drag-drop: scoringInputs reports 0.75 on partial credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(
    engine,
    answerResponse([['i1', 'z1'], ['i2', 'z2'], ['i3', 'z2'], ['i4', 'z2']])
  )
  const inputs = engine.scoringInputs('drag-drop', {
    submission: { questionId: 'q-dd-1', response: {}, interactionMetrics: { attemptsUsed: 2, hintsUsed: 1 } },
    payload: gradePayload,
    correctAnswer: gradeAnswer,
  }, validation)
  assert.equal(inputs.correctnessFraction, 0.75)
  assert.equal(inputs.correctUnits, 3)
  assert.equal(inputs.attemptsUsed, 2)
  assert.equal(inputs.hintsUsed, 1)
})

test('drag-drop: scoringInputs reports 0.5 on half-correct', () => {
  const engine = serverEngine()
  const validation = runAnswer(
    engine,
    answerResponse([['i1', 'z2'], ['i2', 'z1'], ['i3', 'z1'], ['i4', 'z2']])
  )
  const inputs = engine.scoringInputs('drag-drop', {
    submission: { questionId: 'q-dd-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload: gradePayload,
    correctAnswer: gradeAnswer,
  }, validation)
  assert.equal(inputs.correctnessFraction, 0.5)
  assert.equal(inputs.correctUnits, 2)
})

test('drag-drop: scoringInputs reports 0 on no credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(
    engine,
    answerResponse([['i1', 'z2'], ['i2', 'z2'], ['i3', 'z1'], ['i4', 'z1']])
  )
  const inputs = engine.scoringInputs('drag-drop', {
    submission: { questionId: 'q-dd-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload: gradePayload,
    correctAnswer: gradeAnswer,
  }, validation)
  assert.equal(inputs.correctnessFraction, 0)
  assert.equal(inputs.correctUnits, 0)
})

// --------------------------------------------------------------------------
// 7. buildHints
// --------------------------------------------------------------------------

test('drag-drop: buildHints returns authored hints with levels', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('drag-drop', {
    hints: [
      { level: 1, text: 'Renewable energy comes from natural sources.' },
      { level: 3, text: 'Coal and gas are fossil fuels.' },
    ],
  })
  assert.equal(hints.length, 2)
  assert.equal(hints[0].text, 'Renewable energy comes from natural sources.')
  assert.equal(hints[0].level, 1)
  assert.equal(hints[1].level, 3)
})

// --------------------------------------------------------------------------
// 8. feedback
// --------------------------------------------------------------------------

test('drag-drop: feedback is correct/partial/incorrect per fraction and never leaks answers', () => {
  const engine = serverEngine()
  const ctx = {
    submission: { questionId: 'q-dd-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
  }
  const full = { detail: { total: 4, correctCount: 4 } }
  const partial = { detail: { total: 4, correctCount: 2 } }
  const none = { detail: { total: 4, correctCount: 0 } }

  const correctFb = engine.feedback('drag-drop', ctx, full)
  assert.equal(correctFb.state, 'correct')
  const partialFb = engine.feedback('drag-drop', ctx, partial)
  assert.equal(partialFb.state, 'partial')
  const noneFb = engine.feedback('drag-drop', ctx, none)
  assert.equal(noneFb.state, 'incorrect')

  for (const fb of [correctFb, partialFb, noneFb]) {
    for (const key of ['correctAnswer', 'correct_answer', 'answerKey']) {
      assert.ok(!(key in fb), `feedback must not expose "${key}"`)
    }
  }
})

// --------------------------------------------------------------------------
// 9. availability
// --------------------------------------------------------------------------

test('drag-drop: availableOn accepts the full context and is available by default', () => {
  const engine = clientEngine()
  assert.equal(
    engine.availableOn('drag-drop', {
      stream: 'science',
      level: 2,
      grade: 7,
      device: 'mobile',
      featureFlags: {},
      capabilities: { reducedMotion: false, pointerType: 'touch' },
    }),
    true
  )
  assert.equal(engine.availableOn('drag-drop', { grade: 6 }), true)
})

test('drag-drop: availableOn honours featureFlags opt-out and voice-only devices', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('drag-drop', { featureFlags: { 'drag-drop': false } }), false)
  assert.equal(engine.availableOn('drag-drop', { device: 'voice-only' }), false)
})

// --------------------------------------------------------------------------
// 10. Client facade security boundary
// --------------------------------------------------------------------------

test('drag-drop: the client facade never exposes server-only methods', () => {
  const engine = clientEngine()
  const plugin = engine.get('drag-drop')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.equal(typeof plugin[method], 'undefined', `client plugin must not expose ${method}`)
  }
  for (const method of ['render', 'validatePayload', 'buildHints', 'availableOn']) {
    assert.equal(typeof plugin[method], 'function')
  }
})

test('drag-drop: the client engine has no validateAnswer/scoringInputs/feedback methods', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(typeof engine[method], 'undefined')
  }
})

test('drag-drop: minimal example answers the whole pipeline end-to-end (server)', () => {
  const engine = serverEngine()
  const response = answerResponse([['i1', 'z1'], ['i2', 'z1']])
  const validation = engine.validateAnswer('drag-drop', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 12 } },
    payload: minimalPayload,
    correctAnswer: { mappings: [{ itemId: 'i1', zoneId: 'z1' }, { itemId: 'i2', zoneId: 'z1' }] },
  })
  assert.equal(validation.correct, true)
  const inputs = engine.scoringInputs(
    'drag-drop',
    {
      submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 12 } },
      payload: minimalPayload,
      correctAnswer: { mappings: [{ itemId: 'i1', zoneId: 'z1' }, { itemId: 'i2', zoneId: 'z1' }] },
    },
    validation
  )
  assert.equal(inputs.correctnessFraction, 1)
  const fb = engine.feedback('drag-drop', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
  }, validation)
  assert.equal(fb.state, 'correct')
})