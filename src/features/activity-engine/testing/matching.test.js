/**
 * Activity Engine — matching plugin tests (Task 4.5).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import { matchingPlugin, validatePairs, registerMatching } from '../plugins/matching/plugin.js'
import {
  createMatchState,
  toggleSelect,
  chooseTarget,
  clearMatch,
  resetMatches,
  allMatched,
  buildResponse,
} from '../plugins/matching/matching-controller.js'

import minimalPayload from '../../../../schemas/examples/matching/minimal-valid-payload.json' with { type: 'json' }
import gradePayload from '../../../../schemas/examples/matching/valid-payload-grade6-7.json' with { type: 'json' }
import gradeAnswer from '../../../../schemas/examples/matching/valid-correct-answer.json' with { type: 'json' }
import partialCreditAnswer from '../../../../schemas/examples/matching/partial-credit.json' with { type: 'json' }
import physicsPayload from '../../../../schemas/examples/matching/valid-payload-grade9-11.json' with { type: 'json' }
import physicsAnswer from '../../../../schemas/examples/matching/grade9-11-correct-answer.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/matching/invalid-payload.json' with { type: 'json' }
import invalidAnswer from '../../../../schemas/examples/matching/invalid-correct-answer.json' with { type: 'json' }

// gradePayload: left l1..l3 (Heart, Lungs, Kidneys), right r1..r3.
// gradeAnswer: l1→r1, l2→r2, l3→r3.
// physicsPayload: left l1..l4 (physics equations), right r1..r4, distractor d1.
// physicsAnswer: l1→r1, l2→r2, l3→r3, l4→r4.

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(matchingPlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(matchingPlugin)
  return engine
}

function connectResponse(pairs) {
  return { connections: pairs.map(([leftId, rightId]) => ({ leftId, rightId })) }
}

function runAnswer(engine, response, { payload = gradePayload, correctAnswer = gradeAnswer } = {}) {
  return engine.validateAnswer('matching', {
    submission: { questionId: 'q-matching-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

const gradePairs = [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']]

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('matching: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('matching'), true)
  const listed = engine.list().find((p) => p.type === 'matching')
  assert.equal(listed.name, 'Matching')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof matchingPlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('matching: registerMatching helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerMatching(engine)
  assert.equal(engine.has('matching'), true)
})

test('matching: drag-drop and matching coexist on one engine', () => {
  const engine = createServerActivityEngine()
  registerMatching(engine)
  assert.ok(engine.list().some((p) => p.type === 'matching'))
  assert.throws(() => registerMatching(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('matching: render produces a descriptor with no correct-answer keys', () => {
  const engine = clientEngine()
  const descriptor = engine.render('matching', {
    question: {
      prompt: 'Match the organs.',
      instructions: 'Tap a card, then its partner.',
      payload: gradePayload,
    },
  })
  assert.equal(descriptor.kind, 'matching')
  assert.equal(descriptor.prompt, 'Match the organs.')
  const leftIds = descriptor.leftItems.map((c) => c.id).sort()
  assert.deepEqual(leftIds, ['l1', 'l2', 'l3'])
  for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'pairs']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('matching: render merges distractors into the target pool and never marks them', () => {
  const engine = clientEngine()
  const descriptor = engine.render('matching', {
    question: { payload: { ...physicsPayload, shuffle: false } },
  })
  const targetIds = descriptor.targets.map((t) => t.id).sort()
  assert.deepEqual(targetIds, ['d1', 'r1', 'r2', 'r3', 'r4'])
  for (const target of descriptor.targets) {
    for (const key of ['isDistractor', 'correct', 'correctAnswer']) {
      assert.ok(!(key in target), `target must not be marked "${key}"`)
    }
  }
})

test('matching: render preserves order when shuffle is false', () => {
  const engine = clientEngine()
  const descriptor = engine.render('matching', {
    question: { payload: { ...gradePayload, shuffle: false } },
  })
  assert.deepEqual(descriptor.leftItems.map((c) => c.id), ['l1', 'l2', 'l3'])
  assert.deepEqual(descriptor.targets.map((t) => t.id), ['r1', 'r2', 'r3'])
  assert.equal(descriptor.enableShuffle, false)
})

test('matching: render shuffles both columns when shuffle is true (default)', () => {
  const engine = clientEngine()
  const descriptor = engine.render('matching', {
    question: { payload: gradePayload },
  })
  assert.equal(descriptor.enableShuffle, true)
  assert.deepEqual(descriptor.leftItems.map((c) => c.id).sort(), ['l1', 'l2', 'l3'])
  assert.deepEqual(descriptor.targets.map((t) => t.id).sort(), ['r1', 'r2', 'r3'])
})

test('matching: card views carry id/text/image/ariaLabel only', () => {
  const engine = clientEngine()
  const descriptor = engine.render('matching', {
    question: { payload: { ...gradePayload, shuffle: false } },
  })
  for (const card of [...descriptor.leftItems, ...descriptor.targets]) {
    assert.equal(typeof card.id, 'string')
    assert.equal(typeof card.text, 'string')
    assert.equal(typeof card.ariaLabel, 'string')
  }
})

// --------------------------------------------------------------------------
// 3. validatePayload (authoring-time semantic rules)
// --------------------------------------------------------------------------

test('matching: validatePayload accepts conformant payloads', () => {
  const engine = clientEngine()
  assert.equal(engine.validatePayload('matching', minimalPayload).valid, true)
  assert.equal(engine.validatePayload('matching', gradePayload).valid, true)
  assert.equal(engine.validatePayload('matching', physicsPayload).valid, true)
})

test('matching: validatePayload rejects duplicate left item ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    leftItems: [
      { id: 'l1', text: 'Heart' },
      { id: 'l1', text: 'Lungs' },
    ],
  }
  const result = engine.validatePayload('matching', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'matching.left-ids-unique')
})

test('matching: validatePayload rejects duplicate right item ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    rightItems: [
      { id: 'r1', text: 'Pumps blood' },
      { id: 'r1', text: 'Exchanges gas' },
    ],
  }
  const result = engine.validatePayload('matching', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'matching.right-ids-unique')
})

test('matching: validatePayload rejects duplicate distractor ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...physicsPayload,
    distractors: [
      { id: 'd1', text: 'Ohm law' },
      { id: 'd1', text: 'Pascal law' },
    ],
  }
  const result = engine.validatePayload('matching', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'matching.distractor-ids-unique')
})

test('matching: validatePayload rejects card-id collisions across the three sets', () => {
  const engine = clientEngine()
  const fixed = { ...physicsPayload, leftItems: [...physicsPayload.leftItems, { id: 'r1', text: 'dupe' }] }
  const result = engine.validatePayload('matching', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'matching.card-ids-disjoint')
})

test('matching: validatePayload still fails the schema layer for malformed payloads', () => {
  const engine = clientEngine()
  const result = engine.validatePayload('matching', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

// --------------------------------------------------------------------------
// 4. validatePairs (catalog rules port: pairs-cover-left + pair-right-exists)
// --------------------------------------------------------------------------

test('matching: validatePairs passes a consistent pair', () => {
  assert.deepEqual(validatePairs(gradePayload, gradeAnswer), [])
  assert.deepEqual(validatePairs(physicsPayload, physicsAnswer), [])
})

test('matching: validatePairs catches an unpaired left item (pairs-cover-left)', () => {
  const answer = { pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] }
  const errors = validatePairs(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'matching.pairs-cover-left' && e.message.includes('l3')))
})

test('matching: validatePairs catches a duplicated left pairing (pairs-cover-left)', () => {
  const answer = {
    pairs: [
      { leftId: 'l1', rightId: 'r1' },
      { leftId: 'l1', rightId: 'r2' },
      { leftId: 'l2', rightId: 'r2' },
      { leftId: 'l3', rightId: 'r3' },
    ],
  }
  const errors = validatePairs(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'matching.pairs-cover-left' && e.message.includes('more than once')))
})

test('matching: validatePairs rejects an answer pairing a left to a distractor', () => {
  const answer = {
    pairs: [
      { leftId: 'l1', rightId: 'r1' },
      { leftId: 'l2', rightId: 'r2' },
      { leftId: 'l3', rightId: 'r3' },
      { leftId: 'l4', rightId: 'd1' },
    ],
  }
  const errors = validatePairs(physicsPayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'matching.pair-right-exists' && e.message.includes('d1')))
})

test('matching: validatePairs rejects an unknown right id (not in rightItems)', () => {
  const answer = {
    pairs: [
      { leftId: 'l1', rightId: 'r9' },
      { leftId: 'l2', rightId: 'r2' },
      { leftId: 'l3', rightId: 'r3' },
    ],
  }
  const errors = validatePairs(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'matching.pair-right-exists' && e.message.includes('r9')))
})

// --------------------------------------------------------------------------
// 5. validateAnswer correctness + submitted-connection behavior
// --------------------------------------------------------------------------

test('matching: validateAnswer returns correct=true for all right connections', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, connectResponse(gradePairs))
  assert.equal(result.correct, true)
  assert.equal(result.detail.correctCount, 3)
  assert.equal(result.detail.total, 3)
})

test('matching: validateAnswer returns correct=false with partial credit detail', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, connectResponse([['l1', 'r1'], ['l2', 'r3'], ['l3', 'r3']]))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 2)
  const wrong = result.detail.connections.find((c) => c.leftId === 'l2')
  assert.equal(wrong.rightId, 'r3')
  assert.equal(wrong.correct, false)
})

test('matching: validateAnswer returns correct=false for all wrong connections', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, connectResponse([['l1', 'r2'], ['l2', 'r1'], ['l3', 'r1']]))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 0)
})

test('matching: shared-target semantics — two lefts may connect to one right', () => {
  const engine = serverEngine()
  const shared = {
    leftItems: [
      { id: 's1', text: 'Force and mass' },
      { id: 's2', text: 'Acceleration' },
    ],
    rightItems: [{ id: 'g1', text: 'Newton.s second law' }],
  }
  const sharedAnswer = { pairs: [{ leftId: 's1', rightId: 'g1' }, { leftId: 's2', rightId: 'g1' }] }
  const result = runAnswer(
    engine,
    connectResponse([['s1', 'g1'], ['s2', 'g1']]),
    { payload: shared, correctAnswer: sharedAnswer }
  )
  assert.equal(result.correct, true)
  assert.equal(result.detail.correctCount, 2)
})

test('matching: a distractor target is a valid choice but always wrong', () => {
  const engine = serverEngine()
  const result = runAnswer(
    engine,
    connectResponse([['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3'], ['l4', 'd1']]),
    { payload: physicsPayload, correctAnswer: physicsAnswer }
  )
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 3)
  const bad = result.detail.connections.find((c) => c.leftId === 'l4')
  assert.equal(bad.rightId, 'd1')
  assert.equal(bad.correct, false)
})

test('matching: validateAnswer rejects a duplicated source (left connected twice)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, connectResponse([['l1', 'r1'], ['l1', 'r2'], ['l2', 'r2'], ['l3', 'r3']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /connected more than once/)
      return true
    }
  )
})

test('matching: validateAnswer rejects malformed connections shape', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { connections: [{ leftId: 'l1' }] }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
  assert.throws(
    () => runAnswer(engine, { connections: 'nope' }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
})

test('matching: validateAnswer rejects an unknown left id (not silently accepted)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, connectResponse([['zzz', 'r1'], ['l2', 'r2'], ['l3', 'r3']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /unknown left item id "zzz"/)
      return true
    }
  )
})

test('matching: validateAnswer rejects an invalid target id (never answered by a pick)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, connectResponse([['l1', 'r9'], ['l2', 'r2'], ['l3', 'r3']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /invalid target id "r9"/)
      return true
    }
  )
})

test('matching: dedupe normalization collapses exact duplicate connection records', () => {
  const engine = serverEngine()
  const result = runAnswer(
    engine,
    connectResponse([['l1', 'r1'], ['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']])
  )
  assert.equal(result.correct, true)
  assert.equal(result.detail.total, 3)
})

test('matching: validateAnswer rejects a submission missing a required match', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, connectResponse([['l1', 'r1'], ['l2', 'r2']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /missing required match for left item "l3"/)
      return true
    }
  )
})

test('matching: validateAnswer throws PAYLOAD_SEMANTIC_INVALID for an inconsistent (but schema-valid) answer document', () => {
  const engine = serverEngine()
  const inconsistent = {
    pairs: [
      { leftId: 'l1', rightId: 'r1' },
      { leftId: 'l2', rightId: 'r2' },
      { leftId: 'l3', rightId: 'r9' },
    ],
  }
  assert.throws(
    () => runAnswer(engine, connectResponse(gradePairs), { correctAnswer: inconsistent }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
      assert.equal(err.details.errors[0].ruleId, 'matching.pair-right-exists')
      return true
    }
  )
})

test('matching: a schema-invalid answer document is stopped by the engine guard (ENGINE_INTERNAL)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, connectResponse(gradePairs), { correctAnswer: invalidAnswer }),
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
    submission: { questionId: 'q-matching-1', ...submission },
    payload: gradePayload,
    correctAnswer: gradeAnswer,
  }
}

test('matching: scoringInputs reports correctnessFraction 1 on full credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, connectResponse(gradePairs))
  const inputs = engine.scoringInputs('matching', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  assert.equal(inputs.correctnessFraction, 1)
  assert.equal(inputs.scorableUnits, 3)
  assert.equal(inputs.correctUnits, 3)
})

test('matching: scoringInputs reports 2/3 on one-wrong partial credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, connectResponse([['l1', 'r1'], ['l2', 'r3'], ['l3', 'r3']]))
  const inputs = engine.scoringInputs(
    'matching',
    scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 2, hintsUsed: 1 } }),
    validation
  )
  assert.equal(inputs.correctnessFraction, 2 / 3)
  assert.equal(inputs.correctUnits, 2)
  assert.equal(inputs.attemptsUsed, 2)
  assert.equal(inputs.hintsUsed, 1)
  assert.equal(inputs.evidence.length, 3)
})

test('matching: scoringInputs reports 0 on no credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, connectResponse([['l1', 'r2'], ['l2', 'r1'], ['l3', 'r1']]))
  const inputs = engine.scoringInputs('matching', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  assert.equal(inputs.correctnessFraction, 0)
  assert.equal(inputs.correctUnits, 0)
})

test('matching: scoringInputs reports 3/4 on a physics payload with a distractor pick', () => {
  const engine = serverEngine()
  const validation = runAnswer(
    engine,
    connectResponse([['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3'], ['l4', 'd1']]),
    { payload: physicsPayload, correctAnswer: physicsAnswer }
  )
  const inputs = engine.scoringInputs(
    'matching',
    {
      submission: { questionId: 'q-physics', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
      payload: physicsPayload,
      correctAnswer: physicsAnswer,
    },
    validation
  )
  assert.equal(inputs.correctnessFraction, 0.75)
  assert.equal(inputs.scorableUnits, 4)
})

// --------------------------------------------------------------------------
// 7. buildHints
// --------------------------------------------------------------------------

test('matching: buildHints returns authored hints with levels, never pair-answer text', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('matching', {
    hints: [
      { level: 1, text: 'Each organ has one main job.' },
      { level: 3, text: 'Think about what the organ does.' },
    ],
  })
  assert.equal(hints.length, 2)
  assert.equal(hints[0].level, 1)
  assert.equal(hints[1].level, 3)
  for (const key of ['pairs', 'correctAnswer']) {
    assert.ok(!(key in hints[0]), `hint must not expose "${key}"`)
  }
})

// --------------------------------------------------------------------------
// 8. feedback
// --------------------------------------------------------------------------

test('matching: feedback is correct/partial/incorrect per fraction and never leaks answers', () => {
  const engine = serverEngine()
  const ctx = { submission: { questionId: 'q-matching-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
  const full = { detail: { total: 3, correctCount: 3 } }
  const partial = { detail: { total: 3, correctCount: 2 } }
  const none = { detail: { total: 3, correctCount: 0 } }

  const correctFb = engine.feedback('matching', ctx, full)
  assert.equal(correctFb.state, 'correct')
  const partialFb = engine.feedback('matching', ctx, partial)
  assert.equal(partialFb.state, 'partial')
  const noneFb = engine.feedback('matching', ctx, none)
  assert.equal(noneFb.state, 'incorrect')

  for (const fb of [correctFb, partialFb, noneFb]) {
    for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'pairs']) {
      assert.ok(!(key in fb), `feedback must not expose "${key}"`)
    }
  }
})

test('matching: feedback honours the timeout state', () => {
  const engine = serverEngine()
  const ctx = { submission: { questionId: 'q-matching-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
  const fb = engine.feedback('matching', ctx, { detail: { total: 3, correctCount: 0 } }, 'timeout')
  assert.equal(fb.state, 'timeout')
})

// --------------------------------------------------------------------------
// 9. availability
// --------------------------------------------------------------------------

test('matching: availableOn accepts the full context and is available by default', () => {
  const engine = clientEngine()
  assert.equal(
    engine.availableOn('matching', {
      stream: 'science',
      level: 2,
      grade: 7,
      device: 'mobile',
      featureFlags: {},
      capabilities: { reducedMotion: false, pointerType: 'touch' },
    }),
    true
  )
  assert.equal(engine.availableOn('matching', { grade: 6 }), true)
  // Matching works by name, so voice-only devices are still offered it.
  assert.equal(engine.availableOn('matching', { device: 'voice-only' }), true)
})

test('matching: availableOn honours featureFlags opt-out', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('matching', { featureFlags: { 'matching': false } }), false)
})

// --------------------------------------------------------------------------
// 10. Client facade security boundary
// --------------------------------------------------------------------------

test('matching: the client facade never exposes server-only methods', () => {
  const engine = clientEngine()
  const plugin = engine.get('matching')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.equal(typeof plugin[method], 'undefined', `client plugin must not expose ${method}`)
  }
  for (const method of ['render', 'validatePayload', 'buildHints', 'availableOn']) {
    assert.equal(typeof plugin[method], 'function')
  }
})

test('matching: the client engine has no validateAnswer/scoringInputs/feedback/getCorrectAnswerSchema', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(typeof engine[method], 'undefined')
  }
})

test('matching: minimal example answers the whole pipeline end-to-end (server)', () => {
  const engine = serverEngine()
  const response = connectResponse([['l1', 'r1'], ['l2', 'r2']])
  const validation = engine.validateAnswer('matching', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 3 } },
    payload: minimalPayload,
    correctAnswer: { pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] },
  })
  assert.equal(validation.correct, true)
  const inputs = engine.scoringInputs(
    'matching',
    {
      submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
      payload: minimalPayload,
      correctAnswer: { pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] },
    },
    validation
  )
  assert.equal(inputs.correctnessFraction, 1)
  const fb = engine.feedback('matching', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
  }, validation)
  assert.equal(fb.state, 'correct')
})

// --------------------------------------------------------------------------
// 11. Interaction controller (renderer logic, DOM-free)
// --------------------------------------------------------------------------

test('matching: createMatchState starts with every left unconnected and nothing selected', () => {
  const s = createMatchState(['l1', 'l2', 'l3'])
  assert.equal(s.selectedLeft, null)
  for (const id of ['l1', 'l2', 'l3']) assert.equal(s.connections[id], null)
})

test('matching: toggleSelect toggles the selected card', () => {
  const s0 = createMatchState(['l1', 'l2'])
  const s1 = toggleSelect(s0, 'l1')
  assert.equal(s1.selectedLeft, 'l1')
  assert.equal(s1.connections, s0.connections, 'selection does not change connections')
  const s2 = toggleSelect(s1, 'l1')
  assert.equal(s2.selectedLeft, null)
  const s3 = toggleSelect(s2, 'l2')
  assert.equal(s3.selectedLeft, 'l2', 'picking another card moves the selection')
})

test('matching: chooseTarget pairs the selected card and clears the selection', () => {
  const s0 = createMatchState(['l1', 'l2'])
  const s1 = chooseTarget(toggleSelect(s0, 'l1'), 'r1')
  assert.equal(s1.connections.l1, 'r1')
  assert.equal(s1.selectedLeft, null)
  assert.equal(s1.connections.l2, null)
})

test('matching: chooseTarget with no selection is a no-op (same reference)', () => {
  const s0 = createMatchState(['l1'])
  assert.equal(chooseTarget(s0, 'r1'), s0)
})

test('matching: a matched card can be reassigned to a different target', () => {
  let s = toggleSelect(createMatchState(['l1', 'l2']), 'l1')
  s = chooseTarget(s, 'r1')
  assert.equal(s.connections.l1, 'r1')
  s = chooseTarget(toggleSelect(s, 'l1'), 'r2') // reopening l1 moves the match
  assert.equal(s.connections.l1, 'r2')
  assert.equal(s.connections.l2, null)
})

test('matching: clearMatch detaches a single match and keeps the rest', () => {
  let s = toggleSelect(createMatchState(['l1', 'l2']), 'l1')
  s = chooseTarget(s, 'r1')
  s = toggleSelect(s, 'l2')
  s = chooseTarget(s, 'r2')
  const cleared = clearMatch(s, 'l1')
  assert.equal(cleared.connections.l1, null)
  assert.equal(cleared.connections.l2, 'r2')
})

test('matching: resetMatches returns every card to unconnected', () => {
  let s = toggleSelect(createMatchState(['l1', 'l2']), 'l1')
  s = chooseTarget(s, 'r1')
  const r = resetMatches(s)
  assert.deepEqual(r.connections, { l1: null, l2: null })
  assert.equal(r.selectedLeft, null)
})

test('matching: allMatched reports coverage for the submit gate', () => {
  let s = createMatchState(['l1', 'l2', 'l3'])
  assert.equal(allMatched(s), false)
  s = chooseTarget(toggleSelect(s, 'l1'), 'r1')
  s = chooseTarget(toggleSelect(s, 'l2'), 'r2')
  assert.equal(allMatched(s), false)
  s = chooseTarget(toggleSelect(s, 'l3'), 'r3')
  assert.equal(allMatched(s), true)
  // Clearing one opens the gate again.
  assert.equal(allMatched(clearMatch(s, 'l2')), false)
})

test('matching: buildResponse emits one connection per left card in order', () => {
  let s = toggleSelect(createMatchState(['l1', 'l2', 'l3']), 'l2')
  s = chooseTarget(s, 'r2')
  const response = buildResponse(s)
  assert.deepEqual(response.connections, [
    { leftId: 'l1', rightId: null },
    { leftId: 'l2', rightId: 'r2' },
    { leftId: 'l3', rightId: null },
  ])
})

// --------------------------------------------------------------------------
// 12. Fixtures cross-check
// --------------------------------------------------------------------------

test('matching: the partial-credit fixture mirrors the grade6-7 answer (3 of 3 pairs)', () => {
  assert.deepEqual(partialCreditAnswer, gradeAnswer)
  assert.deepEqual(validatePairs(gradePayload, partialCreditAnswer), [])
})