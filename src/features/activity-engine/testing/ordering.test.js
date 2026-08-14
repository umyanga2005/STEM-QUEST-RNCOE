/**
 * Activity Engine — ordering plugin tests (Task 4.6).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import { orderingPlugin, validateSequence, registerOrdering } from '../plugins/ordering/plugin.js'
import {
  createOrderState,
  isAnchored,
  canMove,
  moveItem,
  swap,
  reset,
  isComplete,
  buildResponse,
} from '../plugins/ordering/ordering-controller.js'

import minimalPayload from '../../../../schemas/examples/ordering/minimal-valid-payload.json' with { type: 'json' }
import gradePayload from '../../../../schemas/examples/ordering/valid-payload-grade6-7.json' with { type: 'json' }
import gradeAnswer from '../../../../schemas/examples/ordering/valid-correct-answer.json' with { type: 'json' }
import physicsPayload from '../../../../schemas/examples/ordering/valid-payload-grade9-11.json' with { type: 'json' }
import physicsAnswer from '../../../../schemas/examples/ordering/grade9-11-correct-answer.json' with { type: 'json' }
import partialCreditAnswer from '../../../../schemas/examples/ordering/partial-credit.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/ordering/invalid-payload.json' with { type: 'json' }
import invalidAnswer from '../../../../schemas/examples/ordering/invalid-correct-answer.json' with { type: 'json' }

// gradePayload: items i1..i4 (Seed, Sprout, Flower, Fruit), shuffle true.
// gradeAnswer: expected order i1, i2, i3, i4.
// physicsPayload: items i1..i4 (scientific method), anchor { position: 0, itemId: 'i1' }.
// physicsAnswer: expected order i1, i2, i3, i4 (the anchored head matches).

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(orderingPlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(orderingPlugin)
  return engine
}

function orderResponse(ids) {
  return { order: [...ids] }
}

function runAnswer(engine, response, { payload = gradePayload, correctAnswer = gradeAnswer } = {}) {
  return engine.validateAnswer('ordering', {
    submission: { questionId: 'q-ordering-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

const correctOrder = ['i1', 'i2', 'i3', 'i4']

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('ordering: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('ordering'), true)
  const listed = engine.list().find((p) => p.type === 'ordering')
  assert.equal(listed.name, 'Ordering')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof orderingPlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('ordering: registerOrdering helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerOrdering(engine)
  assert.equal(engine.has('ordering'), true)
})

test('ordering: ordering and matching coexist on one engine', () => {
  const engine = createServerActivityEngine()
  registerOrdering(engine)
  assert.throws(() => registerOrdering(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('ordering: render produces a descriptor with no correct-answer keys', () => {
  const engine = clientEngine()
  const descriptor = engine.render('ordering', {
    question: {
      prompt: 'Put the plant life cycle in order.',
      instructions: 'Arrange the cards from first to last.',
      payload: gradePayload,
    },
  })
  assert.equal(descriptor.kind, 'ordering')
  assert.equal(descriptor.prompt, 'Put the plant life cycle in order.')
  const ids = descriptor.items.map((item) => item.id)
  assert.deepEqual(ids.sort(), ['i1', 'i2', 'i3', 'i4'])
  for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'order']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('ordering: render pins anchors and shuffles only the free positions', () => {
  const engine = clientEngine()
  const descriptor = engine.render('ordering', {
    question: { payload: physicsPayload },
  })
  assert.equal(descriptor.items[0].id, 'i1', 'anchored head stays at position 0')
  assert.deepEqual(descriptor.anchors, [{ position: 0, itemId: 'i1' }])
  const free = descriptor.items.slice(1).map((item) => item.id)
  assert.deepEqual(free.sort(), ['i2', 'i3', 'i4'])
})

test('ordering: render preserves the display order when shuffle is false', () => {
  const engine = clientEngine()
  const descriptor = engine.render('ordering', {
    question: { payload: { ...gradePayload, shuffle: false } },
  })
  assert.deepEqual(descriptor.items.map((item) => item.id), ['i1', 'i2', 'i3', 'i4'])
  assert.equal(descriptor.shuffle, false)
})

test('ordering: render shuffles the free positions when shuffle is true (default)', () => {
  const engine = clientEngine()
  const descriptor = engine.render('ordering', {
    question: { payload: gradePayload },
  })
  assert.equal(descriptor.shuffle, true)
  assert.equal(descriptor.items.length, 4)
})

test('ordering: item views carry id/label/image/ariaLabel/anchored only', () => {
  const engine = clientEngine()
  const descriptor = engine.render('ordering', {
    question: { payload: { ...gradePayload, shuffle: false } },
  })
  for (const item of descriptor.items) {
    assert.equal(typeof item.id, 'string')
    assert.equal(typeof item.label, 'string')
    assert.equal(typeof item.ariaLabel, 'string')
    assert.equal(typeof item.anchored, 'boolean')
  }
})

// --------------------------------------------------------------------------
// 3. validatePayload (authoring-time semantic rules)
// --------------------------------------------------------------------------

test('ordering: validatePayload accepts conformant payloads', () => {
  const engine = clientEngine()
  assert.equal(engine.validatePayload('ordering', minimalPayload).valid, true)
  assert.equal(engine.validatePayload('ordering', gradePayload).valid, true)
  assert.equal(engine.validatePayload('ordering', physicsPayload).valid, true)
})

test('ordering: validatePayload rejects duplicate item ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    items: [
      { id: 'i1', label: 'Seed' },
      { id: 'i1', label: 'Sprout' },
      { id: 'i2', label: 'Leaf' },
      { id: 'i3', label: 'Bud' },
    ],
  }
  const result = engine.validatePayload('ordering', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'ordering.item-ids-unique')
})

test('ordering: validatePayload rejects an out-of-range anchor position', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    anchors: [{ position: 9, itemId: 'i1' }],
  }
  const result = engine.validatePayload('ordering', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'ordering.anchor-positions-in-range')
})

test('ordering: validatePayload rejects an anchor referencing an unknown item', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    anchors: [{ position: 0, itemId: 'zzz' }],
  }
  const result = engine.validatePayload('ordering', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'ordering.anchor-ids-exist')
})

test('ordering: validatePayload rejects duplicated anchor positions and items', () => {
  const engine = clientEngine()
  const dupPosition = {
    ...gradePayload,
    anchors: [
      { position: 0, itemId: 'i1' },
      { position: 0, itemId: 'i2' },
    ],
  }
  const dupItem = {
    ...gradePayload,
    anchors: [
      { position: 0, itemId: 'i1' },
      { position: 1, itemId: 'i1' },
    ],
  }
  assert.match(engine.validatePayload('ordering', dupPosition).errors[0].details.errors[0].ruleId, /anchor-positions-unique/)
  assert.match(engine.validatePayload('ordering', dupItem).errors[0].details.errors[0].ruleId, /anchor-items-distinct/)
})

test('ordering: validatePayload rejects fully-anchored shuffle (degenerate)', () => {
  const engine = clientEngine()
  const fixed = {
    schemaVersion: '1.0',
    items: [
      { id: 'i1', label: 'A' },
      { id: 'i2', label: 'B' },
      { id: 'i3', label: 'C' },
    ],
    anchors: [
      { position: 0, itemId: 'i1' },
      { position: 1, itemId: 'i2' },
      { position: 2, itemId: 'i3' },
    ],
    shuffle: true,
  }
  const result = engine.validatePayload('ordering', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'ordering.shuffle-excludes-anchors')
})

test('ordering: validatePayload still fails the schema layer for malformed payloads', () => {
  const engine = clientEngine()
  const result = engine.validatePayload('ordering', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

// --------------------------------------------------------------------------
// 4. validateSequence (catalog rule port: ordering.order-permutation)
// --------------------------------------------------------------------------

test('ordering: validateSequence passes a consistent payload/answer pair', () => {
  assert.deepEqual(validateSequence(gradePayload, gradeAnswer), [])
  assert.deepEqual(validateSequence(physicsPayload, physicsAnswer), [])
})

test('ordering: validateSequence catches a duplicate id (order-permutation)', () => {
  const answer = { order: ['i1', 'i1', 'i2', 'i3'] }
  const errors = validateSequence(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'ordering.order-permutation' && e.message.includes('duplicate')))
})

test('ordering: validateSequence catches an unknown id (order-permutation)', () => {
  const answer = { order: ['i1', 'i2', 'i3', 'zzz'] }
  const errors = validateSequence(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'ordering.order-permutation' && e.message.includes('unknown')))
})

test('ordering: validateSequence catches a missing id (order-permutation)', () => {
  const answer = { order: ['i1', 'i2', 'i3'] }
  const errors = validateSequence(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'ordering.order-permutation' && e.message.includes('missing')))
})

test('ordering: validateSequence rejects an order that breaks an anchored position', () => {
  const answer = { order: ['i2', 'i1', 'i3', 'i4'] }
  const errors = validateSequence(physicsPayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'ordering.order-permutation' && e.message.includes('anchored position 0')))
})

// --------------------------------------------------------------------------
// 5. validateAnswer correctness + submitted-order behavior
// --------------------------------------------------------------------------

test('ordering: validateAnswer returns correct=true for the exact sequence', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, orderResponse(correctOrder))
  assert.equal(result.correct, true)
  assert.equal(result.detail.correctCount, 4)
  assert.equal(result.detail.total, 4)
})

test('ordering: validateAnswer returns correct=false with per-position detail', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, orderResponse(['i1', 'i3', 'i2', 'i4']))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 2)
  const wrong = result.detail.positions.find((p) => p.index === 1)
  assert.equal(wrong.correct, false)
  const right = result.detail.positions.find((p) => p.index === 0)
  assert.equal(right.correct, true)
})

test('ordering: validateAnswer returns correct=false for a fully wrong order', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, orderResponse(['i4', 'i3', 'i2', 'i1']))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 0)
})

test('ordering: a submitted order that honours not the anchored head is scored incorrect at that position, not as an authoring error', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, orderResponse(['i2', 'i1', 'i3', 'i4']), {
    payload: physicsPayload,
    correctAnswer: physicsAnswer,
  })
  assert.equal(result.correct, false)
  assert.equal(result.detail.positions[0].correct, false, 'position 0 must hold i1')
})

test('ordering: validateAnswer rejects malformed response shapes', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(
    () => runAnswer(engine, { order: 'i1,i2' }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
})

test('ordering: validateAnswer rejects a non-string order entry', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, orderResponse(['i1', 2, 'i3', 'i4'])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /item id strings/)
      return true
    }
  )
})

test('ordering: validateAnswer rejects a duplicate id (never positional padding)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, orderResponse(['i1', 'i2', 'i2', 'i4'])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /duplicate id "i2"/)
      return true
    }
  )
})

test('ordering: validateAnswer rejects an unknown id (never silently accepted)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, orderResponse(['i1', 'i2', 'i3', 'zzz'])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /unknown item id "zzz"/)
      return true
    }
  )
})

test('ordering: validateAnswer rejects an incomplete order (missing an item)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, orderResponse(['i1', 'i2', 'i3'])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /every item exactly once/)
      return true
    }
  )
})

test('ordering: minimal example answers the whole pipeline end-to-end (server)', () => {
  const engine = serverEngine()
  const response = orderResponse(['i1', 'i2', 'i3'])
  const validation = engine.validateAnswer('ordering', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 4 } },
    payload: minimalPayload,
    correctAnswer: { order: ['i1', 'i2', 'i3'] },
  })
  assert.equal(validation.correct, true)
  const inputs = engine.scoringInputs(
    'ordering',
    {
      submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
      payload: minimalPayload,
      correctAnswer: { order: ['i1', 'i2', 'i3'] },
    },
    validation
  )
  assert.equal(inputs.correctnessFraction, 1)
  const fb = engine.feedback('ordering', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
  }, validation)
  assert.equal(fb.state, 'correct')
})

test('ordering: validateAnswer throws PAYLOAD_SEMANTIC_INVALID for an inconsistent (but schema-valid) answer document', () => {
  const engine = serverEngine()
  const inconsistent = { order: ['i1', 'i2', 'i2', 'i4'] }
  assert.throws(
    () => runAnswer(engine, orderResponse(correctOrder), { correctAnswer: inconsistent }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
      assert.equal(err.details.errors[0].ruleId, 'ordering.order-permutation')
      return true
    }
  )
})

test('ordering: a schema-invalid answer document is stopped by the engine guard (ENGINE_INTERNAL)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, orderResponse(correctOrder), { correctAnswer: invalidAnswer }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ENGINE_INTERNAL)
      return true
    }
  )
})

// --------------------------------------------------------------------------
// 6. scoringInputs (partial credit)
// --------------------------------------------------------------------------

function scoringCtx(submission) {
  return {
    submission: { questionId: 'q-ordering-1', ...submission },
    payload: gradePayload,
    correctAnswer: gradeAnswer,
  }
}

test('ordering: scoringInputs reports correctnessFraction 1 on full credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, orderResponse(correctOrder))
  const inputs = engine.scoringInputs('ordering', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  assert.equal(inputs.correctnessFraction, 1)
  assert.equal(inputs.scorableUnits, 4)
  assert.equal(inputs.correctUnits, 4)
})

test('ordering: scoringInputs reports 1/4 on a three-wrong cyclic shift (partial credit)', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, orderResponse(['i2', 'i3', 'i1', 'i4']))
  const inputs = engine.scoringInputs(
    'ordering',
    scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 2, hintsUsed: 1 } }),
    validation
  )
  assert.equal(inputs.correctnessFraction, 0.25)
  assert.equal(inputs.scorableUnits, 4)
  assert.equal(inputs.correctUnits, 1)
  assert.equal(inputs.attemptsUsed, 2)
  assert.equal(inputs.hintsUsed, 1)
  assert.equal(inputs.evidence.length, 4)
})

test('ordering: scoringInputs reports 2/4 on a single swapped pair', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, orderResponse(['i1', 'i3', 'i2', 'i4']))
  const inputs = engine.scoringInputs('ordering', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  assert.equal(inputs.correctnessFraction, 0.5)
  assert.equal(inputs.scorableUnits, 4)
  assert.equal(inputs.correctUnits, 2)
})

test('ordering: scoringInputs reports 0 on no credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, orderResponse(['i4', 'i3', 'i2', 'i1']))
  const inputs = engine.scoringInputs('ordering', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  assert.equal(inputs.correctnessFraction, 0)
  assert.equal(inputs.correctUnits, 0)
})

// --------------------------------------------------------------------------
// 7. buildHints
// --------------------------------------------------------------------------

test('ordering: buildHints returns authored hints with levels, never the sequence', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('ordering', {
    hints: [
      { level: 1, text: 'What always comes first in the cycle?' },
      { level: 3, text: 'Think about what happens after the flower.' },
    ],
  })
  assert.equal(hints.length, 2)
  assert.equal(hints[0].level, 1)
  assert.equal(hints[1].level, 3)
  for (const key of ['order', 'correctAnswer']) {
    assert.ok(!(key in hints[0]), `hint must not expose "${key}"`)
  }
})

// --------------------------------------------------------------------------
// 8. feedback
// --------------------------------------------------------------------------

test('ordering: feedback is correct/partial/incorrect per fraction and never leaks the sequence', () => {
  const engine = serverEngine()
  const ctx = { submission: { questionId: 'q-ordering-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
  const full = { detail: { total: 4, correctCount: 4 } }
  const partial = { detail: { total: 4, correctCount: 3 } }
  const none = { detail: { total: 4, correctCount: 0 } }

  const correctFb = engine.feedback('ordering', ctx, full)
  assert.equal(correctFb.state, 'correct')
  const partialFb = engine.feedback('ordering', ctx, partial)
  assert.equal(partialFb.state, 'partial')
  const noneFb = engine.feedback('ordering', ctx, none)
  assert.equal(noneFb.state, 'incorrect')

  for (const fb of [correctFb, partialFb, noneFb]) {
    for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'order']) {
      assert.ok(!(key in fb), `feedback must not expose "${key}"`)
    }
  }
})

test('ordering: feedback honours the timeout state', () => {
  const engine = serverEngine()
  const ctx = { submission: { questionId: 'q-ordering-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
  const fb = engine.feedback('ordering', ctx, { detail: { total: 4, correctCount: 0 } }, 'timeout')
  assert.equal(fb.state, 'timeout')
})

// --------------------------------------------------------------------------
// 9. availability
// --------------------------------------------------------------------------

test('ordering: availableOn accepts the full context and is available by default', () => {
  const engine = clientEngine()
  assert.equal(
    engine.availableOn('ordering', {
      stream: 'science',
      level: 2,
      grade: 7,
      device: 'mobile',
      featureFlags: {},
      capabilities: { reducedMotion: false, pointerType: 'touch' },
    }),
    true
  )
  assert.equal(engine.availableOn('ordering', { grade: 6 }), true)
  // Ordering works by Up/Down buttons (and label reading), so voice-only
  // devices are still offered it.
  assert.equal(engine.availableOn('ordering', { device: 'voice-only' }), true)
})

test('ordering: availableOn honours featureFlags opt-out', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('ordering', { featureFlags: { 'ordering': false } }), false)
})

// --------------------------------------------------------------------------
// 10. Client facade security boundary
// --------------------------------------------------------------------------

test('ordering: the client facade never exposes server-only methods', () => {
  const engine = clientEngine()
  const plugin = engine.get('ordering')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.equal(typeof plugin[method], 'undefined', `client plugin must not expose ${method}`)
  }
  for (const method of ['render', 'validatePayload', 'buildHints', 'availableOn']) {
    assert.equal(typeof plugin[method], 'function')
  }
})

test('ordering: the client engine has no validateAnswer/scoringInputs/feedback/getCorrectAnswerSchema', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(typeof engine[method], 'undefined')
  }
})

// --------------------------------------------------------------------------
// 11. Interaction controller (renderer logic, DOM-free)
// --------------------------------------------------------------------------

test('ordering: createOrderState snapshots the initial order and pins anchors', () => {
  const s = createOrderState(['i2', 'i1', 'i3', 'i4'], [{ position: 0, itemId: 'i1' }])
  assert.deepEqual(s.order, ['i1', 'i2', 'i3', 'i4'])
  assert.deepEqual(s.seed, ['i1', 'i2', 'i3', 'i4'])
  assert.equal(isAnchored(s, 0), true)
  assert.equal(isAnchored(s, 'i1'), true)
  assert.equal(isAnchored(s, 1), false)
  assert.equal(isAnchored(s, 'i2'), false)
})

test('ordering: moveItem re-arranges free positions and never disturbs anchors', () => {
  let s = createOrderState(['i1', 'i3', 'i2', 'i4'], [{ position: 0, itemId: 'i1' }])
  s = moveItem(s, 1, 3)
  assert.deepEqual(s.order, ['i1', 'i2', 'i4', 'i3'])
  assert.equal(s.order[0], 'i1', 'anchored head is untouched')
})

test('ordering: cannot move to or from an anchored position', () => {
  let s = createOrderState(['i1', 'i3', 'i2', 'i4'], [{ position: 0, itemId: 'i1' }])
  assert.equal(moveItem(s, 0, 2), s, 'moving an anchored item is a no-op')
  assert.equal(moveItem(s, 2, 0), s, 'moving onto an anchored slot is a no-op')
})

test('ordering: moving an item across an anchored position only re-arranges the free slots', () => {
  let s = createOrderState(['i1', 'i3', 'i2', 'i4'], [{ position: 0, itemId: 'i1' }])
  s = moveItem(s, 3, 1)
  assert.equal(s.order[0], 'i1')
  assert.deepEqual(s.order.slice(1), ['i4', 'i3', 'i2'])
})

test('ordering: moveItem out-of-range and same-position are no-ops', () => {
  const s = createOrderState(['i1', 'i2', 'i3'])
  assert.equal(moveItem(s, 0, 0), s)
  assert.equal(moveItem(s, -1, 2), s)
  assert.equal(moveItem(s, 2, 5), s)
})

test('ordering: swap exchanges two free positions and guards anchors', () => {
  let s = createOrderState(['i1', 'i3', 'i2', 'i4'], [{ position: 0, itemId: 'i1' }])
  s = swap(s, 1, 2)
  assert.deepEqual(s.order, ['i1', 'i2', 'i3', 'i4'])
  assert.equal(swap(s, 0, 1), s, 'swapping with an anchored slot is a no-op')
})

test('ordering: reset restores the initial display order (anchors preserved)', () => {
  const original = ['i2', 'i3', 'i1', 'i4']
  let s = createOrderState(original, [{ position: 2, itemId: 'i1' }])
  s = moveItem(s, 0, 1)
  const r = reset(s)
  assert.deepEqual(r.order, ['i2', 'i3', 'i1', 'i4'])
  assert.equal(r.order[2], 'i1')
})

test('ordering: isComplete gates on every position holding an item', () => {
  const s = createOrderState(['i1', 'i2', 'i3'])
  assert.equal(isComplete(s), true)
})

test('ordering: buildResponse emits the full id-per-position order', () => {
  const s = createOrderState(['i1', 'i3', 'i2', 'i4'])
  assert.deepEqual(buildResponse(s), { order: ['i1', 'i3', 'i2', 'i4'] })
})

test('ordering: canMove reports whether a position participates in a move', () => {
  let s = createOrderState(['i1', 'i3', 'i2', 'i4'], [{ position: 0, itemId: 'i1' }])
  assert.equal(canMove(s, 0), false)
  assert.equal(canMove(s, 1), true)
  assert.equal(canMove(s, 9), false)
})

// --------------------------------------------------------------------------
// 12. Fixtures cross-check
// --------------------------------------------------------------------------

test('ordering: the partial-credit fixture mirrors the grade6-7 answer (4 of 4 positions)', () => {
  assert.deepEqual(partialCreditAnswer, gradeAnswer)
  assert.deepEqual(validateSequence(gradePayload, partialCreditAnswer), [])
})