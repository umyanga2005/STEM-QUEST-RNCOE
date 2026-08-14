/**
 * Activity Engine — fill-complete plugin tests (Task 4.8).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import {
  fillCompletePlugin,
  registerFillComplete,
  validateBlankAnswers,
  normalizeTextAnswer,
  normalizeExpression,
  parseNumericValue,
} from '../plugins/fill-complete/plugin.js'
import {
  createFillState,
  setBlankValue,
  getBlankValue,
  clearBlank,
  resetFill,
  isBlankAnswered,
  isComplete,
  answeredCount,
  buildResponse,
} from '../plugins/fill-complete/fill-complete-controller.js'

import gradePayload from '../../../../schemas/examples/fill-complete/valid-payload-grade6-7.json' with { type: 'json' }
import gradeAnswer from '../../../../schemas/examples/fill-complete/valid-correct-answer.json' with { type: 'json' }
import physicsPayload from '../../../../schemas/examples/fill-complete/valid-payload-grade9-11.json' with { type: 'json' }
import minimalPayload from '../../../../schemas/examples/fill-complete/minimal-valid-payload.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/fill-complete/invalid-payload.json' with { type: 'json' }

// gradePayload: 2 text blanks b1 (leaf/leaves), b2 (stem) — "The ___ makes food
//   using sunlight, while the ___ carries water up from the roots."
// physicsPayload: 1 number blank b1 (speed) — "v = ___ km/h".
// minimalPayload: 1 number blank b1 (boiling point).

const physicsAnswer = {
  numeric: [{ blankId: 'b1', value: 50, tolerance: 0.1 }],
}
const rangePayload = {
  schemaVersion: '1.0',
  template: 'A healthy resting body temperature is about ___ degrees Celsius.',
  blanks: [{ id: 'b1', type: 'number', label: 'Body temperature' }],
  keypad: 'numeric',
}
const rangeAnswer = {
  numeric: [{ blankId: 'b1', min: 36.1, max: 37.2 }],
}
const exprPayload = {
  schemaVersion: '1.0',
  template: 'Simplify: the area of a square with side x is ___ .',
  blanks: [{ id: 'b1', type: 'expression', label: 'Area expression' }],
  keypad: 'text',
}
const exprAnswer = {
  expression: [{ blankId: 'b1', accepted: ['x^2', 'x*x'] }],
}
const mixedPayload = {
  schemaVersion: '1.0',
  template: 'The ___ makes food; sea-level water boils at ___ degrees Celsius.',
  blanks: [
    { id: 'b1', type: 'text', label: 'Photosynthesis organ' },
    { id: 'b2', type: 'number', label: 'Boiling point' },
  ],
  keypad: 'text',
}
const mixedAnswer = {
  answers: [{ blankId: 'b1', type: 'text', accepted: ['leaf', 'leaves'] }],
  numeric: [{ blankId: 'b2', value: 100, tolerance: 0 }],
}

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(fillCompletePlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(fillCompletePlugin)
  return engine
}

function fillResponse(entries) {
  return { answers: entries.map(([blankId, value]) => ({ blankId, value })) }
}

function runAnswer(engine, response, { payload = gradePayload, correctAnswer = gradeAnswer } = {}) {
  return engine.validateAnswer('fill-complete', {
    submission: { questionId: 'q-fill-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('fill-complete: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('fill-complete'), true)
  const listed = engine.list().find((p) => p.type === 'fill-complete')
  assert.equal(listed.name, 'Fill / Complete')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof fillCompletePlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('fill-complete: registerFillComplete helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerFillComplete(engine)
  assert.equal(engine.has('fill-complete'), true)
})

test('fill-complete: coexists with other plugins; duplicate registration rejected', () => {
  const engine = createServerActivityEngine()
  registerFillComplete(engine)
  assert.throws(() => registerFillComplete(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('fill-complete: render produces a safe descriptor with no answer data', () => {
  const engine = clientEngine()
  const descriptor = engine.render('fill-complete', {
    question: {
      prompt: 'Complete the plant sentence.',
      instructions: 'Type the missing words.',
      payload: gradePayload,
    },
  })
  assert.equal(descriptor.kind, 'fill-complete')
  assert.equal(descriptor.prompt, 'Complete the plant sentence.')
  assert.equal(descriptor.template, gradePayload.template)
  assert.deepEqual(descriptor.blanks.map((b) => b.id), ['b1', 'b2'])
  assert.deepEqual(descriptor.blanks.map((b) => b.type), ['text', 'text'])
  assert.equal(descriptor.blanks[0].label, 'Photosynthesis organ')
  assert.equal(descriptor.keypad, 'text')
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('accepted'))
  assert.ok(!raw.includes('"value"'))
  for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'accepted', 'expected']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('fill-complete: render exposes only safe blank metadata', () => {
  const engine = clientEngine()
  const descriptor = engine.render('fill-complete', {
    question: { payload: physicsPayload },
  })
  assert.equal(descriptor.blanks.length, 1)
  const blank = descriptor.blanks[0]
  assert.deepEqual(Object.keys(blank).sort(), ['id', 'label', 'maxLength', 'prefix', 'suffix', 'type'])
  assert.equal(blank.type, 'number')
  assert.equal(blank.maxLength, 6)
  assert.equal(blank.suffix, ' km/h')
  assert.equal(descriptor.keypad, 'numeric')
})

test('fill-complete: render applies the default maxLength of 24 when omitted', () => {
  const engine = clientEngine()
  const descriptor = engine.render('fill-complete', {
    question: { payload: minimalPayload },
  })
  assert.equal(descriptor.blanks[0].maxLength, 24)
  assert.equal(descriptor.blanks[0].type, 'number')
})

// --------------------------------------------------------------------------
// 3. Payload validation (schema + semantic)
// --------------------------------------------------------------------------

test('fill-complete: valid text/number/expression payloads pass', () => {
  const engine = serverEngine()
  for (const payload of [gradePayload, physicsPayload, minimalPayload, rangePayload, exprPayload, mixedPayload]) {
    const result = engine.validatePayload('fill-complete', payload)
    assert.equal(result.valid, true, JSON.stringify(result.errors))
  }
})

test('fill-complete: schema-invalid payloads are rejected', () => {
  const engine = serverEngine()
  const result = engine.validatePayload('fill-complete', invalidPayload)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].code === ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

test('fill-complete: schema-invalid payload rejects a blank missing its type', () => {
  const engine = serverEngine()
  const broken = { schemaVersion: '1.0', template: 'x ___ y.', blanks: [{ id: 'b1', label: 'no type' }] }
  const result = engine.validatePayload('fill-complete', broken)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

test('fill-complete: duplicate blank ids are a semantic error (uniqueItems is shallow)', () => {
  const engine = serverEngine()
  const dup = {
    schemaVersion: '1.0',
    template: '___ and ___ .',
    blanks: [
      { id: 'b1', type: 'text', label: 'A' },
      { id: 'b1', type: 'text', label: 'B' },
    ],
  }
  const result = engine.validatePayload('fill-complete', dup)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'fill-complete.blank-ids-unique'))
})

test('fill-complete: template placeholder count must match the blank count', () => {
  const engine = serverEngine()
  const mismatch = {
    schemaVersion: '1.0',
    template: 'Only one ___ here.',
    blanks: [
      { id: 'b1', type: 'text' },
      { id: 'b2', type: 'text' },
    ],
  }
  const result = engine.validatePayload('fill-complete', mismatch)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors[0]?.details?.errors?.some((e) => e.ruleId === 'fill-complete.placeholder-count-matches-blanks')
  )
})

test('fill-complete: placeholder rule rejects a template with no placeholders', () => {
  const engine = serverEngine()
  const none = { schemaVersion: '1.0', template: 'No blanks here at all.', blanks: [{ id: 'b1', type: 'text' }] }
  const result = engine.validatePayload('fill-complete', none)
  assert.equal(result.valid, false)
})

// --------------------------------------------------------------------------
// 4. Cross-document integrity (validateBlankAnswers)
// --------------------------------------------------------------------------

test('fill-complete: a consistent payload/answer pair has no integrity errors', () => {
  assert.deepEqual(validateBlankAnswers(gradePayload, gradeAnswer), [])
  assert.deepEqual(validateBlankAnswers(physicsPayload, physicsAnswer), [])
  assert.deepEqual(validateBlankAnswers(exprPayload, exprAnswer), [])
})

test('fill-complete: unknown blank id in an answer entry is flagged', () => {
  const errors = validateBlankAnswers(gradePayload, { answers: [{ blankId: 'b9', type: 'text', accepted: ['x'] }] })
  assert.ok(errors.some((e) => e.ruleId === 'fill-complete.blanks-referenced' && e.message.includes('b9')))
})

test('fill-complete: a payload blank with no answer entry is flagged', () => {
  const errors = validateBlankAnswers(gradePayload, {
    answers: [{ blankId: 'b1', type: 'text', accepted: ['leaf'] }],
  })
  assert.ok(errors.some((e) => e.message.includes('b2')))
})

test('fill-complete: a blank with two answer entries is flagged', () => {
  const errors = validateBlankAnswers(gradePayload, {
    answers: [
      { blankId: 'b1', type: 'text', accepted: ['leaf'] },
      { blankId: 'b1', type: 'text', accepted: ['leaves'] },
    ],
  })
  assert.ok(errors.some((e) => e.message.includes('more than one')))
})

test('fill-complete: an answer group mismatching the blank type is flagged', () => {
  const errors = validateBlankAnswers(gradePayload, {
    numeric: [{ blankId: 'b1', value: 1 }],
    answers: [{ blankId: 'b2', type: 'text', accepted: ['stem'] }],
  })
  assert.ok(errors.some((e) => e.message.includes('is type "text"') && e.message.includes('"number" answer entry')))
})

test('fill-complete: numeric blank without value or range is flagged', () => {
  const errors = validateBlankAnswers(physicsPayload, { numeric: [{ blankId: 'b1' }] })
  assert.ok(errors.some((e) => e.message.includes('neither a value nor a (min, max) range')))
})

test('fill-complete: numeric range with one bound missing is flagged', () => {
  const errors = validateBlankAnswers(physicsPayload, { numeric: [{ blankId: 'b1', min: 0 }] })
  assert.ok(errors.some((e) => e.message.includes('both min and max')))
})

test('fill-complete: text/expression answer with an empty accepted list is flagged', () => {
  const t = validateBlankAnswers(gradePayload, {
    answers: [
      { blankId: 'b1', type: 'text', accepted: ['leaf'] },
      { blankId: 'b2', type: 'text', accepted: [] },
    ],
  })
  assert.ok(t.some((e) => e.message.includes('at least one accepted form')))
  const e = validateBlankAnswers(exprPayload, { expression: [{ blankId: 'b1', accepted: [] }] })
  assert.ok(e.some((err) => err.message.includes('at least one accepted form')))
})

// --------------------------------------------------------------------------
// 5. Answer validation — text
// --------------------------------------------------------------------------

test('fill-complete: fully correct text submission is correct', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', 'leaf'], ['b2', 'stem']]))
  assert.equal(v.correct, true)
  assert.equal(v.detail.total, 2)
  assert.equal(v.detail.correctCount, 2)
})

test('fill-complete: an accepted alternative answer is correct', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', 'leaves'], ['b2', 'stem']]))
  assert.equal(v.correct, true)
})

test('fill-complete: text normalization trims and case-folds', () => {
  assert.equal(normalizeTextAnswer('  Leaf  '), 'leaf')
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', ' LEAF '], ['b2', 'StEm']]))
  assert.equal(v.correct, true)
})

test('fill-complete: a wrong text answer is incorrect with partial credit', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', 'root'], ['b2', 'stem']]))
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctCount, 1)
  assert.equal(v.detail.blanks[0].correct, false)
  assert.equal(v.detail.blanks[1].correct, true)
})

test('fill-complete: substring values are NOT fuzzy-matched', () => {
  const engine = serverEngine()
  // "lea" and "ste" are substrings of the accepted answers but must not match.
  const v = runAnswer(engine, fillResponse([['b1', 'lea'], ['b2', 'ste']]))
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctCount, 0)
})

test('fill-complete: missing required blank is rejected (honest denominator)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, fillResponse([['b1', 'leaf']])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('fill-complete: an unknown blank id is rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, fillResponse([['b1', 'leaf'], ['b9', 'stem']])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('fill-complete: a duplicate blank submission is rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, fillResponse([['b1', 'leaf'], ['b1', 'stem'], ['b2', 'stem']])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('fill-complete: empty and whitespace-only answers are rejected', () => {
  const engine = serverEngine()
  for (const value of ['', '   ']) {
    assert.throws(
      () => runAnswer(engine, fillResponse([['b1', value], ['b2', 'stem']])),
      (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
    )
  }
})

test('fill-complete: a non-string value for a text blank is rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, fillResponse([['b1', 42], ['b2', 'stem']])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('fill-complete: response shape errors are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { answers: 'nope' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(
    () => runAnswer(engine, { answers: [{ blankId: 'b1' }] }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

// --------------------------------------------------------------------------
// 6. Answer validation — number
// --------------------------------------------------------------------------

test('fill-complete: exact numeric answers are correct', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', '50']]), { payload: physicsPayload, correctAnswer: physicsAnswer })
  assert.equal(v.correct, true)
  assert.equal(v.detail.blanks[0].type, 'number')
})

test('fill-complete: numeric answers use the authored tolerance', () => {
  const engine = serverEngine()
  const within = runAnswer(engine, fillResponse([['b1', '50.05']]), { payload: physicsPayload, correctAnswer: physicsAnswer })
  assert.equal(within.correct, true)
  const outside = runAnswer(engine, fillResponse([['b1', '50.2']]), { payload: physicsPayload, correctAnswer: physicsAnswer })
  assert.equal(outside.correct, false)
  assert.equal(outside.detail.correctCount, 0)
})

test('fill-complete: numeric strings normalize by trimming', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', '  50  ']]), { payload: physicsPayload, correctAnswer: physicsAnswer })
  assert.equal(v.correct, true)
})

test('fill-complete: numeric range answers are inclusive', () => {
  const engine = serverEngine()
  for (const value of ['36.1', '36.5', '37.2']) {
    const v = runAnswer(engine, fillResponse([['b1', value]]), { payload: rangePayload, correctAnswer: rangeAnswer })
    assert.equal(v.correct, true, `${value} must be inside the range`)
  }
  for (const value of ['36.0', '37.3']) {
    const v = runAnswer(engine, fillResponse([['b1', value]]), { payload: rangePayload, correctAnswer: rangeAnswer })
    assert.equal(v.correct, false, `${value} must be outside the range`)
  }
})

test('fill-complete: non-numeric answers to a number blank are rejected', () => {
  const engine = serverEngine()
  for (const value of ['abc', 'fifty', '1,000', '']) {
    assert.throws(
      () => runAnswer(engine, fillResponse([['b1', value]]), { payload: physicsPayload, correctAnswer: physicsAnswer }),
      (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
    )
  }
})

test('fill-complete: a real number value is accepted for a numeric blank', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { answers: [{ blankId: 'b1', value: 50 }] }, { payload: physicsPayload, correctAnswer: physicsAnswer })
  assert.equal(v.correct, true)
})

// --------------------------------------------------------------------------
// 7. Answer validation — expression
// --------------------------------------------------------------------------

test('fill-complete: expression normalization collapses internal whitespace only', () => {
  assert.equal(normalizeExpression('  x   ^   2  '), 'x ^ 2')
  assert.equal(normalizeExpression('x*x'), 'x*x')
  assert.equal(normalizeExpression('x ^ 2'), 'x ^ 2')
})

test('fill-complete: expression answers must equal an accepted form after whitespace normalization', () => {
  const engine = serverEngine()
  // The accepted canonical form contains spaces — the student's crazily-spaced
  // input normalizes to the exact same string.
  const withSpaces = { ...exprAnswer, expression: [{ blankId: 'b1', accepted: ['x ^ 2'] }] }
  const v = runAnswer(engine, fillResponse([['b1', '  x    ^      2  ']]), { payload: exprPayload, correctAnswer: withSpaces })
  assert.equal(v.correct, true)
  // Spaces are collapsed, never removed: 'x ^ 2' is not silently rewritten to
  // 'x^2', so it does NOT match a tight canonical form unless authored.
  const tight = runAnswer(engine, fillResponse([['b1', 'x ^ 2']]), { payload: exprPayload, correctAnswer: exprAnswer })
  assert.equal(tight.correct, false)
})

test('fill-complete: expression comparison is case-sensitive', () => {
  const engine = serverEngine()
  const upper = runAnswer(engine, fillResponse([['b1', 'X^2']]), { payload: exprPayload, correctAnswer: exprAnswer })
  assert.equal(upper.correct, false)
})

test('fill-complete: expression alternative forms must be listed, no fuzzy judging', () => {
  const engine = serverEngine()
  // 'x*x' is listed, so it matches; 'x*1' (arithmetically equal but unlisted)
  // and 'x' (a substring of 'x^2') must NOT match — no substring/fuzzy heuristics.
  const listed = runAnswer(engine, fillResponse([['b1', 'x*x']]), { payload: exprPayload, correctAnswer: exprAnswer })
  assert.equal(listed.correct, true)
  const unlisted = runAnswer(engine, fillResponse([['b1', 'x*1']]), { payload: exprPayload, correctAnswer: exprAnswer })
  assert.equal(unlisted.correct, false)
  const sub = runAnswer(engine, fillResponse([['b1', 'x']]), { payload: exprPayload, correctAnswer: exprAnswer })
  assert.equal(sub.correct, false)
})

// --------------------------------------------------------------------------
// 8. Scoring (mixed blank types)
// --------------------------------------------------------------------------

test('fill-complete: full score of 1.0 with scorableUnits = blank count', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', 'leaf'], ['b2', '100']]), { payload: mixedPayload, correctAnswer: mixedAnswer })
  assert.equal(v.correct, true)
  const scoring = engine.scoringInputs(
    'fill-complete',
    { submission: { response: { correct: true }, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } },
    v
  )
  assert.equal(scoring.correctnessFraction, 1)
  assert.equal(scoring.scorableUnits, 2)
  assert.equal(scoring.correctUnits, 2)
})

test('fill-complete: partial credit of 0.5 for half correct', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', 'leaf'], ['b2', '99']]), { payload: mixedPayload, correctAnswer: mixedAnswer })
  assert.equal(v.correct, false)
  const scoring = engine.scoringInputs(
    'fill-complete',
    { submission: { response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } },
    v
  )
  assert.equal(scoring.correctnessFraction, 0.5)
  assert.equal(scoring.scorableUnits, 2)
})

test('fill-complete: zero credit of 0.0', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', 'root'], ['b2', '99']]), { payload: mixedPayload, correctAnswer: mixedAnswer })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctCount, 0)
  const scoring = engine.scoringInputs(
    'fill-complete',
    { submission: { response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } },
    v
  )
  assert.equal(scoring.correctnessFraction, 0)
})

test('fill-complete: scoring evidence never carries accepted/expected values', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, fillResponse([['b1', 'root'], ['b2', '99']]), { payload: mixedPayload, correctAnswer: mixedAnswer })
  const scoring = engine.scoringInputs(
    'fill-complete',
    { submission: { response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } },
    v
  )
  const raw = JSON.stringify(scoring.evidence)
  for (const leaked of ['leaf', 'leaves', 'accepted', 'expected']) {
    assert.ok(!raw.includes(leaked), `evidence must not leak "${leaked}"`)
  }
  for (const entry of scoring.evidence) {
    assert.deepEqual(Object.keys(entry).sort(), ['blankId', 'correct', 'submitted', 'type'])
  }
})

// --------------------------------------------------------------------------
// 9. Hints
// --------------------------------------------------------------------------

test('fill-complete: buildHints returns authored hints only', () => {
  const plugin = fillCompletePlugin
  const hints = plugin.buildHints({
    hints: [
      { level: 1, text: 'Think about sunlight.' },
      { level: 2, text: 'Think about water transport.' },
    ],
  })
  assert.equal(hints.length, 2)
  assert.equal(hints[0].id, 'hint-1')
  assert.equal(hints[0].level, 1)
  assert.equal(hints[0].text, 'Think about sunlight.')
  const raw = JSON.stringify(hints)
  assert.ok(!raw.includes('leaf'))
  assert.ok(!raw.includes('stem'))
})

test('fill-complete: buildHints with no authored hints returns []', () => {
  assert.deepEqual(fillCompletePlugin.buildHints({}), [])
})

// --------------------------------------------------------------------------
// 10. Feedback
// --------------------------------------------------------------------------

test('fill-complete: feedback covers correct / partial / incorrect / timeout', () => {
  const engine = serverEngine()
  const correct = runAnswer(engine, fillResponse([['b1', 'leaf'], ['b2', '100']]), { payload: mixedPayload, correctAnswer: mixedAnswer })
  const partial = runAnswer(engine, fillResponse([['b1', 'leaf'], ['b2', '99']]), { payload: mixedPayload, correctAnswer: mixedAnswer })
  const none = runAnswer(engine, fillResponse([['b1', 'root'], ['b2', '99']]), { payload: mixedPayload, correctAnswer: mixedAnswer })

  const ctx = { submission: { response: {} }, payload: mixedPayload, correctAnswer: mixedAnswer }
  const fbCorrect = engine.feedback('fill-complete', ctx, correct)
  const fbPartial = engine.feedback('fill-complete', ctx, partial)
  const fbNone = engine.feedback('fill-complete', ctx, none)
  const fbTimeout = engine.feedback('fill-complete', ctx, none, 'timeout')
  assert.equal(fbCorrect.state, 'correct')
  assert.equal(fbPartial.state, 'partial')
  assert.equal(fbNone.state, 'incorrect')
  assert.equal(fbTimeout.state, 'timeout')
  for (const raw of [fbCorrect, fbPartial, fbNone, fbTimeout]) {
    assert.ok(!JSON.stringify(raw).includes('100'))
    assert.ok(!JSON.stringify(raw).includes('leaf'))
  }
})

// --------------------------------------------------------------------------
// 11. Availability
// --------------------------------------------------------------------------

test('fill-complete: available by default, flag opt-out, feature flags respected', () => {
  const engine = serverEngine()
  assert.equal(engine.availableOn('fill-complete'), true)
  assert.equal(engine.availableOn('fill-complete', { featureFlags: {} }), true)
  assert.equal(engine.availableOn('fill-complete', { featureFlags: { 'fill-complete': true } }), true)
  assert.equal(engine.availableOn('fill-complete', { featureFlags: { 'fill-complete': false } }), false)
})

// --------------------------------------------------------------------------
// 12. Client facade boundary
// --------------------------------------------------------------------------

test('fill-complete: the client facade exposes no server-only methods', () => {
  const engine = clientEngine()
  const plugin = engine.get('fill-complete')
  for (const method of ['render', 'validatePayload', 'buildHints', 'availableOn']) {
    assert.equal(typeof plugin[method], 'function')
  }
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.ok(!(method in plugin), `client facade must not expose "${method}"`)
  }
  assert.equal(engine.validateAnswer, undefined)
  assert.equal(engine.scoringInputs, undefined)
  assert.equal(engine.feedback, undefined)
})

test('fill-complete: parseNumericValue handles numbers and numeric strings', () => {
  assert.equal(parseNumericValue(50), 50)
  assert.equal(parseNumericValue(' 50 '), 50)
  assert.equal(parseNumericValue('50.5'), 50.5)
  assert.ok(Number.isNaN(parseNumericValue('abc')))
  assert.ok(Number.isNaN(parseNumericValue('')))
  assert.ok(Number.isNaN(parseNumericValue(null)))
})

// --------------------------------------------------------------------------
// 13. Controller
// --------------------------------------------------------------------------

test('fill-complete controller: initial state holds blank ids/types and empty values', () => {
  const state = createFillState([{ id: 'b1', type: 'text' }, { id: 'b2', type: 'number' }, { id: 'b3', type: 'expression' }])
  assert.deepEqual(state.entries.map((e) => e.id), ['b1', 'b2', 'b3'])
  assert.deepEqual(state.entries.map((e) => e.type), ['text', 'number', 'expression'])
  assert.ok(state.entries.every((e) => e.value === ''))
})

test('fill-complete controller: set, update, and read blank values', () => {
  const initial = createFillState([{ id: 'b1', type: 'text' }, { id: 'b2', type: 'number' }])
  const one = setBlankValue(initial, 'b1', 'leaf')
  assert.equal(getBlankValue(one, 'b1'), 'leaf')
  const two = setBlankValue(one, 'b1', 'Leaf')
  assert.equal(getBlankValue(two, 'b1'), 'Leaf')
  assert.equal(getBlankValue(initial, 'b1'), '', 'original state must be untouched')
})

test('fill-complete controller: set/clear are no-ops for unknown blanks', () => {
  const state = createFillState([{ id: 'b1', type: 'text' }])
  assert.equal(setBlankValue(state, 'nope', 'x'), state)
  assert.equal(clearBlank(state, 'nope'), state)
})

test('fill-complete controller: clear and reset blank values', () => {
  let state = createFillState([{ id: 'b1', type: 'text' }])
  state = setBlankValue(state, 'b1', 'leaf')
  assert.equal(isBlankAnswered(state, 'b1'), true)
  state = clearBlank(state, 'b1')
  assert.equal(getBlankValue(state, 'b1'), '')
  assert.equal(isBlankAnswered(state, 'b1'), false)
  state = setBlankValue(state, 'b1', 'stem')
  state = resetFill(state)
  assert.ok(state.entries.every((e) => e.value === ''))
})

test('fill-complete controller: completion and answered counts', () => {
  let state = createFillState([{ id: 'b1', type: 'text' }, { id: 'b2', type: 'number' }])
  assert.equal(isComplete(state), false)
  assert.equal(answeredCount(state), 0)
  state = setBlankValue(state, 'b1', 'leaf')
  assert.equal(answeredCount(state), 1)
  assert.equal(isComplete(state), false)
  state = setBlankValue(state, 'b2', '100')
  assert.equal(answeredCount(state), 2)
  assert.equal(isComplete(state), true)
})

test('fill-complete controller: response serialization is deterministic and complete', () => {
  let state = createFillState([{ id: 'b1', type: 'text' }, { id: 'b2', type: 'number' }])
  state = setBlankValue(state, 'b2', '100')
  const response = buildResponse(state)
  assert.deepEqual(response, { answers: [{ blankId: 'b1', value: '' }, { blankId: 'b2', value: '100' }] })
  const ids = response.answers.map((a) => a.blankId)
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(ids, ['b1', 'b2'])
})