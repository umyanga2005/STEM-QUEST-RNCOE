/**
 * Activity Engine — number-logic plugin tests (Task 4.13).
 *
 * Exercises the tenth production activity plugin: registration, the 7-method
 * contract, the client-safe render descriptor, payload semantic rules,
 * cross-document integrity (validateNumberLogicAnswer), the DOM-free
 * interaction controller, server-side answer validation for every supported
 * answer type (exact / tolerance / range / percent / fraction / sequence /
 * accepted-set), multi-step partial credit, strict response-shape gating,
 * scoring inputs, hints, feedback, availability, the client/server boundary,
 * and the accessibility contract surface.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import {
  numberLogicPlugin,
  registerNumberLogic,
  validateNumberLogicAnswer,
  parseNumericValue,
  parsePercentValue,
  reduceFraction,
  parseFractionString,
} from '../plugins/number-logic/plugin.js'
import {
  createNumberLogicState,
  setValue,
  setFraction,
  setSequenceElement,
  addSequenceElement,
  removeSequenceElement,
  setPartValue,
  setPartFraction,
  setPartSequenceElement,
  addPartSequenceElement,
  isComplete,
  clear,
  reset,
  buildResponse,
} from '../plugins/number-logic/number-logic-controller.js'

import minimalPayload from '../../../../schemas/examples/number-logic/minimal-valid-payload.json' with { type: 'json' }
import grade67Payload from '../../../../schemas/examples/number-logic/valid-payload-grade6-7.json' with { type: 'json' }
import grade911Payload from '../../../../schemas/examples/number-logic/valid-payload-grade9-11.json' with { type: 'json' }
import fractionAnswer from '../../../../schemas/examples/number-logic/valid-correct-answer.json' with { type: 'json' }
import partialCreditAnswer from '../../../../schemas/examples/number-logic/partial-credit.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/number-logic/invalid-payload.json' with { type: 'json' }
import invalidCorrectAnswer from '../../../../schemas/examples/number-logic/invalid-correct-answer.json' with { type: 'json' }

const ANSWER_INVALID = ERROR_CODES.ACTIVITY_ANSWER_INVALID
const SEMANTIC_INVALID = ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID
const PAYLOAD_INVALID = ERROR_CODES.ACTIVITY_PAYLOAD_INVALID

function serverEngine() {
  const engine = createServerActivityEngine()
  return registerNumberLogic(engine)
}

function clientEngine() {
  const engine = createClientActivityEngine()
  return registerNumberLogic(engine)
}

function question(payload, correctAnswer, prompt = 'Solve the challenge.') {
  return { prompt, instructions: 'Work it out and enter your answer.', payload, correctAnswer }
}

function renderFor(payload) {
  const engine = serverEngine()
  return engine.render('number-logic', {
    question: { prompt: 'P', instructions: 'I', payload },
    capabilities: { reducedMotion: false },
  })
}

function answerFor(engine, q, response) {
  return engine.validateAnswer('number-logic', {
    submission: { questionId: 'q1', response, interactionMetrics: { attemptsUsed: 1 } },
    payload: q.payload,
    correctAnswer: q.correctAnswer,
  })
}

function throwCode(fn) {
  try {
    fn()
  } catch (err) {
    return err.code
  }
  return null
}

// ---------------------------------------------------------------------------
// registration + contract
// ---------------------------------------------------------------------------

test('number-logic: plugin metadata and 7-method contract', () => {
  assert.equal(numberLogicPlugin.type, 'number-logic')
  assert.equal(numberLogicPlugin.name, 'Number / Logic Challenge')
  assert.equal(numberLogicPlugin.version, '1.0.0')
  assert.equal(numberLogicPlugin.schemaVersion, '1.0')
  for (const method of [
    'render',
    'validatePayload',
    'validateAnswer',
    'scoringInputs',
    'buildHints',
    'feedback',
    'availableOn',
  ]) {
    assert.equal(typeof numberLogicPlugin[method], 'function', `${method} must be a function`)
  }
})

test('number-logic: registration helper + duplicate-type rejection', () => {
  const engine = serverEngine()
  assert.equal(engine.has('number-logic'), true)
  assert.throws(() => registerNumberLogic(engine), (err) => {
    assert.equal(err.code, ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
    return true
  })
})

test('number-logic: schemaVersion resolves to the number-logic contract', () => {
  const engine = serverEngine()
  assert.equal(engine.getSchemaVersion('number-logic'), '1.0')
})

// ---------------------------------------------------------------------------
// render descriptor (client-safe)
// ---------------------------------------------------------------------------

test('render: carries public payload content only', () => {
  const d = renderFor(grade911Payload)
  assert.equal(d.kind, 'number-logic')
  assert.equal(d.prompt, 'P')
  assert.equal(d.instructions, 'I')
  assert.equal(d.problem, grade911Payload.problem)
  assert.equal(d.answerFormat, 'decimal')
  assert.equal(d.inputMode, 'numeric')
  assert.equal(d.showWork, true)
  assert.deepEqual(
    d.parts.map((p) => ({ id: p.id, label: p.label, answerFormat: p.answerFormat })),
    grade911Payload.parts.map((p) => ({ id: p.id, label: p.label, answerFormat: p.answerFormat }))
  )
})

test('render: never exposes the correct-answer document', () => {
  const d = renderFor(minimalPayload)
  const json = JSON.stringify(d)
  assert.equal(json.includes('correctAnswer'), false)
  for (const key of ['type', 'value', 'tolerance', 'min', 'max', 'numerator', 'denominator', 'values', 'accepted']) {
    assert.equal(Object.prototype.hasOwnProperty.call(d, key), false, `${key} must not be in the descriptor`)
  }
  assert.deepEqual(d.parts, null)
})

test('render: showWork defaults true and inputMode default numeric', () => {
  const payload = { schemaVersion: '1.0', problem: 'P', answerFormat: 'integer' }
  const d = renderFor(payload)
  assert.equal(d.showWork, true)
  assert.equal(d.inputMode, 'numeric')
})

test('render: media-free safe fallbacks', () => {
  const d = renderFor({ schemaVersion: '1.0', problem: 'P', answerFormat: 'sequence', showWork: false })
  assert.equal(d.showWork, false)
  assert.equal(d.answerFormat, 'sequence')
})

// ---------------------------------------------------------------------------
// validatePayload (schema + semantic)
// ---------------------------------------------------------------------------

test('validatePayload: valid payloads pass semantic rules', () => {
  for (const payload of [minimalPayload, grade67Payload, grade911Payload]) {
    const result = numberLogicPlugin.validatePayload(payload)
    assert.equal(result.valid, true, JSON.stringify(result.errors))
  }
})

test('validatePayload: duplicate part ids fail semantic rules', () => {
  const payload = {
    schemaVersion: '1.0',
    problem: 'Two steps.',
    answerFormat: 'decimal',
    parts: [
      { id: 'p1', label: 'Step one', answerFormat: 'decimal' },
      { id: 'p1', label: 'Step two (same id)', answerFormat: 'decimal' },
    ],
  }
  const result = numberLogicPlugin.validatePayload(payload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].ruleId, 'number-logic.part-ids-unique')
  assert.equal(result.errors[0].code, SEMANTIC_INVALID)
})

test('validatePayload: engine rejects a schema-invalid payload', () => {
  const engine = serverEngine()
  const result = engine.validatePayload('number-logic', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, PAYLOAD_INVALID)
})

// ---------------------------------------------------------------------------
// validateNumberLogicAnswer (cross-document integrity)
// ---------------------------------------------------------------------------

test('cross-doc: consistent pairs produce no errors', () => {
  assert.deepEqual(validateNumberLogicAnswer(minimalPayload, { type: 'exact', value: 4 }), [])
  assert.deepEqual(validateNumberLogicAnswer(grade67Payload, fractionAnswer), [])
  assert.deepEqual(validateNumberLogicAnswer(grade911Payload, partialCreditAnswer), [])
  assert.deepEqual(
    validateNumberLogicAnswer(minimalPayload, { type: 'tolerance', value: 4, tolerance: 0.01 }),
    []
  )
  assert.deepEqual(
    validateNumberLogicAnswer(
      { ...minimalPayload, answerFormat: 'expression', inputMode: 'text' },
      { type: 'accepted-set', accepted: ['x^2', 'x*x'] }
    ),
    []
  )
  assert.deepEqual(
    validateNumberLogicAnswer(
      { ...minimalPayload, answerFormat: 'sequence' },
      { type: 'sequence', values: [2, 4, 6], tolerance: 0 }
    ),
    []
  )
})

test('cross-doc: catalog rule parts-match (multi-part ⟺ per-part answer)', () => {
  // multi-part payload without per-part answer
  const errors = validateNumberLogicAnswer(grade911Payload, { type: 'exact', value: 18 })
  assert.equal(errors.some((e) => e.ruleId === 'number-logic.parts-match'), true)

  // single-part payload with per-part answer
  const single = validateNumberLogicAnswer(minimalPayload, partialCreditAnswer)
  assert.equal(single.some((e) => e.ruleId === 'number-logic.parts-match'), true)

  // part id set mismatch
  const mismatch = validateNumberLogicAnswer(grade911Payload, {
    type: 'exact',
    value: 18,
    parts: [{ partId: 'pX', type: 'exact', value: 18 }],
  })
  assert.equal(mismatch.some((e) => e.ruleId === 'number-logic.parts-match'), true)

  // duplicate partId in the answer
  const dup = validateNumberLogicAnswer(grade911Payload, {
    type: 'exact',
    value: 18,
    parts: [
      { partId: 'p1', type: 'exact', value: 18 },
      { partId: 'p1', type: 'tolerance', value: 18, tolerance: 0.01 },
    ],
  })
  assert.equal(dup.some((e) => e.ruleId === 'number-logic.parts-match'), true)
})

test('cross-doc: catalog rule type-fields (required fields per type)', () => {
  assert.equal(
    validateNumberLogicAnswer(minimalPayload, { type: 'range', min: 0 }).some(
      (e) => e.ruleId === 'number-logic.type-fields'
    ),
    true
  )
  assert.equal(
    validateNumberLogicAnswer(minimalPayload, { type: 'tolerance', value: 4 }).some(
      (e) => e.ruleId === 'number-logic.type-fields'
    ),
    true
  )
})

test('cross-doc: answer-format-compatible (authored solution representable by the payload)', () => {
  // integer payload with a fraction answer → the student is told to type an
  // integer, but scoring needs a fraction string — an author bug.
  const errors = validateNumberLogicAnswer(minimalPayload, { type: 'fraction', numerator: 3, denominator: 4 })
  assert.equal(errors.some((e) => e.ruleId === 'number-logic.answer-format-compatible'), true)

  // percent payload with an accepted-set answer → incompatible.
  const percentPayload = { ...minimalPayload, answerFormat: 'percent' }
  const p = validateNumberLogicAnswer(percentPayload, { type: 'accepted-set', accepted: ['50%'] })
  assert.equal(p.some((e) => e.ruleId === 'number-logic.answer-format-compatible'), true)
})

test('cross-doc: range-ordered (min <= max)', () => {
  const errors = validateNumberLogicAnswer(minimalPayload, { type: 'range', min: 20, max: 10 })
  assert.equal(errors.some((e) => e.ruleId === 'number-logic.range-ordered'), true)
  const part = validateNumberLogicAnswer(grade911Payload, {
    type: 'exact',
    value: 18,
    parts: [
      { partId: 'p1', type: 'range', min: 20, max: 10 },
      { partId: 'p2', type: 'exact', value: 18 },
    ],
  })
  assert.equal(part.some((e) => e.ruleId === 'number-logic.range-ordered'), true)
})

test('cross-doc: fraction-integer-components (lowest-term normalization needs integers)', () => {
  const errors = validateNumberLogicAnswer(minimalPayload, { type: 'fraction', numerator: 0.5, denominator: 2 })
  assert.equal(errors.some((e) => e.ruleId === 'number-logic.fraction-integer-components'), true)
})

test('cross-doc: accepted-nonblank (empty accepted forms are useless)', () => {
  const payload = { ...minimalPayload, answerFormat: 'expression', inputMode: 'text' }
  const errors = validateNumberLogicAnswer(payload, { type: 'accepted-set', accepted: ['  ', 'x^2'] })
  assert.equal(errors.some((e) => e.ruleId === 'number-logic.accepted-nonblank'), true)
})

test('cross-doc: sequence-values-valid (finite numbers)', () => {
  const payload = { ...minimalPayload, answerFormat: 'sequence' }
  const errors = validateNumberLogicAnswer(payload, { type: 'sequence', values: [2, Number.NaN, 6] })
  assert.equal(errors.some((e) => e.ruleId === 'number-logic.sequence-values-valid'), true)
})

test('cross-doc: tolerance-valid (tolerance must be >= 0 and finite)', () => {
  const t = validateNumberLogicAnswer(minimalPayload, { type: 'tolerance', value: 4, tolerance: -1 })
  assert.equal(t.some((e) => e.ruleId === 'number-logic.tolerance-valid'), true)
})

// ---------------------------------------------------------------------------
// numeric helpers
// ---------------------------------------------------------------------------

test('helpers: parseNumericValue / parsePercentValue / fraction reduction', () => {
  assert.equal(parseNumericValue(' 42 '), 42)
  assert.equal(parseNumericValue('-3.5'), -3.5)
  assert.equal(parseNumericValue(''), Number.NaN)
  assert.equal(parseNumericValue('abc'), Number.NaN)
  assert.equal(parseNumericValue(Number.NaN), Number.NaN)
  assert.equal(parsePercentValue('50'), 50)
  assert.equal(parsePercentValue(' 50 %'), 50)
  assert.equal(parsePercentValue('50%'), 50)
  assert.equal(parsePercentValue('abc'), Number.NaN)
  assert.deepEqual(reduceFraction(6, 8), { num: 3, den: 4 })
  assert.deepEqual(reduceFraction(-3, -4), { num: 3, den: 4 })
  assert.deepEqual(reduceFraction(3, -4), { num: -3, den: 4 })
  assert.deepEqual(reduceFraction(0, 5), { num: 0, den: 1 })
  assert.equal(reduceFraction(1.5, 3), null)
  assert.equal(reduceFraction(1, 0), null)
  assert.deepEqual(parseFractionString(' 6/8 '), { num: 3, den: 4 })
  assert.equal(parseFractionString('0.75'), null)
  assert.equal(parseFractionString('abc'), null)
  assert.equal(parseFractionString('3/0'), null)
})

// ---------------------------------------------------------------------------
// controller
// ---------------------------------------------------------------------------

test('controller: single numeric state initial/clear/complete', () => {
  const s = createNumberLogicState({ answerFormat: 'integer' })
  assert.equal(s.multi, false)
  assert.equal(s.answerFormat, 'integer')
  assert.equal(isComplete(s), false)
  const s2 = setValue(s, '4')
  assert.equal(s2.raw, '4')
  assert.equal(isComplete(s2), true)
  const s3 = clear(s2)
  assert.equal(isComplete(s3), false)
  assert.equal(buildResponse(s3).value, '')
})

test('controller: buildResponse serializes single values + percent', () => {
  const s = setValue(createNumberLogicState({ answerFormat: 'decimal' }), ' 18.5 ')
  assert.deepEqual(buildResponse(s), { value: '18.5' })
  const p = setValue(createNumberLogicState({ answerFormat: 'percent' }), '50')
  assert.deepEqual(buildResponse(p), { value: '50' })
})

test('controller: fraction two-input state', () => {
  const s = createNumberLogicState({ answerFormat: 'fraction' })
  assert.equal(isComplete(s), false)
  const s2 = setFraction(s, '3', '4')
  assert.equal(isComplete(s2), true)
  assert.deepEqual(buildResponse(s2), { value: '3/4' })
  const s3 = setFraction(s2, '6', '8')
  assert.deepEqual(buildResponse(s3), { value: '6/8' })
})

test('controller: sequence dynamic slots', () => {
  const s = createNumberLogicState({ answerFormat: 'sequence' })
  assert.equal(isComplete(s), false)
  const s1 = addSequenceElement(s)
  assert.equal(s1.values.length, 1)
  const s2 = addSequenceElement(s1)
  assert.equal(isComplete(s2), false) // values blank
  const s3 = setSequenceElement(s2, 0, '2')
  const s4 = setSequenceElement(s3, 1, '4')
  assert.equal(isComplete(s4), true)
  assert.deepEqual(buildResponse(s4), { values: ['2', '4'] })
  const s5 = setSequenceElement(s4, 1, '')
  assert.equal(isComplete(s5), false)
  const s6 = removeSequenceElement(s4, 0)
  assert.deepEqual(s6.values, ['4'])
})

test('controller: multi-part state per-part interaction + serialization', () => {
  const parts = [
    { id: 'p1', label: 'Formula', answerFormat: 'decimal' },
    { id: 'p2', label: 'Substitute', answerFormat: 'fraction' },
    { id: 'p3', label: 'Terms', answerFormat: 'sequence' },
  ]
  const s = createNumberLogicState({ parts })
  assert.equal(s.multi, true)
  assert.equal(isComplete(s), false)

  const s1 = setPartValue(s, 'p1', '18')
  assert.equal(isComplete(s1), false)
  const s2 = setPartFraction(s1, 'p2', '3', '4')
  assert.equal(isComplete(s2), false)
  const s3 = addPartSequenceElement(s2, 'p3')
  const s4 = addPartSequenceElement(s3, 'p3')
  const s5 = setPartSequenceElement(s4, 'p3', 0, '2')
  const s6 = setPartSequenceElement(s5, 'p3', 1, '4')
  assert.equal(isComplete(s6), true)

  const resp = buildResponse(s6)
  assert.deepEqual(resp, {
    parts: [
      { partId: 'p1', value: '18' },
      { partId: 'p2', value: '3/4' },
      { partId: 'p3', value: '2, 4' },
    ],
  })
  const cleared = clear(s6)
  assert.equal(isComplete(cleared), false)
})

test('controller: invalid interactions are no-ops', () => {
  const s = createNumberLogicState({ answerFormat: 'integer' })
  assert.equal(setValue(s, 42), s) // non-string no-op
  assert.equal(setFraction(s, '3', '4'), s) // wrong format for integer
  assert.equal(setSequenceElement(s, 0, '1'), s) // wrong format
  assert.equal(addSequenceElement(s), s)
  const multi = createNumberLogicState({ parts: [{ id: 'p1', label: 'S', answerFormat: 'integer' }] })
  assert.equal(setValue(multi, '5'), multi) // single-part ops no-op on multi
  assert.equal(setPartValue(multi, 'pX', '5'), multi) // unknown part
  assert.equal(setPartFraction(multi, 'p1', '3', '4'), multi) // p1 is integer, not fraction
})

test('controller: reset is an alias of clear', () => {
  const s = setValue(createNumberLogicState({ answerFormat: 'integer' }), '7')
  const cleared = clear(s)
  assert.deepEqual(buildResponse(reset(s)), buildResponse(cleared))
})

// ---------------------------------------------------------------------------
// validateAnswer — exact / tolerance / range
// ---------------------------------------------------------------------------

test('answer: exact integer correct + incorrect + numeric coercion', () => {
  const engine = serverEngine()
  const q = question(minimalPayload, { type: 'exact', value: 4 })
  assert.equal(answerFor(engine, q, { value: '4' }).correct, true)
  assert.equal(answerFor(engine, q, { value: 4 }).correct, true)
  assert.equal(answerFor(engine, q, { value: '4.0' }).correct, true)
  assert.equal(answerFor(engine, q, { value: ' 4 ' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '5' }).correct, false)
  assert.equal(answerFor(engine, q, { value: '-4' }).correct, false)
})

test('answer: tolerance uses |a - value| <= tolerance exactly', () => {
  const engine = serverEngine()
  const q = question(minimalPayload, { type: 'tolerance', value: 18, tolerance: 0.5 })
  assert.equal(answerFor(engine, q, { value: '18.5' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '17.5' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '18.6' }).correct, false)
  assert.equal(answerFor(engine, q, { value: '17.49' }).correct, false)
})

test('answer: range uses inclusive min/max exactly', () => {
  const engine = serverEngine()
  const q = question(minimalPayload, { type: 'range', min: 10, max: 20 })
  assert.equal(answerFor(engine, q, { value: '10' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '20' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '15' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '9.999' }).correct, false)
  assert.equal(answerFor(engine, q, { value: '20.001' }).correct, false)
})

// ---------------------------------------------------------------------------
// validateAnswer — percent
// ---------------------------------------------------------------------------

test('answer: percent accepts optional "%" and uses the authored value', () => {
  const engine = serverEngine()
  const q = question({ ...minimalPayload, answerFormat: 'percent' }, { type: 'percent', value: 50 })
  assert.equal(answerFor(engine, q, { value: '50' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '50%' }).correct, true)
  assert.equal(answerFor(engine, q, { value: ' 50 % ' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '49' }).correct, false)
})

test('answer: percent with authored tolerance', () => {
  const engine = serverEngine()
  const q = question({ ...minimalPayload, answerFormat: 'percent' }, { type: 'percent', value: 50, tolerance: 0.5 })
  assert.equal(answerFor(engine, q, { value: '50.4%' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '50.6%' }).correct, false)
})

// ---------------------------------------------------------------------------
// validateAnswer — fraction
// ---------------------------------------------------------------------------

test('answer: fraction equivalents accepted via lowest-term normalization', () => {
  const engine = serverEngine()
  const q = question(grade67Payload, fractionAnswer) // 3/4
  assert.equal(answerFor(engine, q, { value: '3/4' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '6/8' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '-3/-4' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '30/40' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '2/3' }).correct, false)
  assert.equal(answerFor(engine, q, { value: '3/-4' }).correct, false)
})

test('answer: malformed fraction values are rejected, not scored', () => {
  const engine = serverEngine()
  const q = question(grade67Payload, fractionAnswer)
  for (const value of ['0.75', 'abc', '3', '3/4/5', '3/0', '']) {
    assert.equal(
      throwCode(() => answerFor(engine, q, { value })),
      ANSWER_INVALID,
      `${value} must be rejected`
    )
  }
})

// ---------------------------------------------------------------------------
// validateAnswer — sequence (element-wise partial credit)
// ---------------------------------------------------------------------------

test('answer: sequence element-wise with tolerance + per-element partial credit', () => {
  const engine = serverEngine()
  const q = question(
    { ...minimalPayload, answerFormat: 'sequence' },
    { type: 'sequence', values: [2, 4, 6], tolerance: 0 }
  )
  const full = answerFor(engine, q, { values: ['2', '4', '6'] })
  assert.equal(full.correct, true)
  assert.equal(full.detail.required, 3)
  assert.equal(full.detail.correctUnits, 3)

  const partial = answerFor(engine, q, { values: ['2', '4', '5'] })
  assert.equal(partial.correct, false)
  assert.equal(partial.detail.required, 3)
  assert.equal(partial.detail.correctUnits, 2)
  assert.equal(partial.detail.units[2].correct, false)

  const zero = answerFor(engine, q, { values: ['9', '9', '9'] })
  assert.equal(zero.correct, false)
  assert.equal(zero.detail.correctUnits, 0)
})

test('answer: sequence with authored tolerance per element', () => {
  const engine = serverEngine()
  const q = question(
    { ...minimalPayload, answerFormat: 'sequence' },
    { type: 'sequence', values: [2, 4, 6], tolerance: 0.1 }
  )
  assert.equal(answerFor(engine, q, { values: ['2.05', '3.95', '6.1'] }).correct, true)
  assert.equal(answerFor(engine, q, { values: ['2.11', '4', '6'] }).correct, false)
})

test('answer: sequence with the wrong element count is rejected', () => {
  const engine = serverEngine()
  const q = question(
    { ...minimalPayload, answerFormat: 'sequence' },
    { type: 'sequence', values: [2, 4, 6], tolerance: 0 }
  )
  assert.equal(throwCode(() => answerFor(engine, q, { values: ['2', '4'] })), ANSWER_INVALID)
  assert.equal(throwCode(() => answerFor(engine, q, { values: ['2', '4', '6', '8'] })), ANSWER_INVALID)
  assert.equal(throwCode(() => answerFor(engine, q, { value: '2, 4, 6' })), ANSWER_INVALID)
  assert.equal(throwCode(() => answerFor(engine, q, { values: ['2', 'abc', '6'] })), ANSWER_INVALID)
})

// ---------------------------------------------------------------------------
// validateAnswer — accepted-set (expression, explicit multiple answers)
// ---------------------------------------------------------------------------

test('answer: accepted-set matches normalized authored forms exactly (no eval)', () => {
  const engine = serverEngine()
  const q = question(
    { ...minimalPayload, answerFormat: 'expression', inputMode: 'text' },
    { type: 'accepted-set', accepted: ['x^2', 'x*x'] }
  )
  assert.equal(answerFor(engine, q, { value: 'x^2' }).correct, true)
  assert.equal(answerFor(engine, q, { value: '  x^2  ' }).correct, true)
  assert.equal(answerFor(engine, q, { value: 'x*x' }).correct, true)
  assert.equal(answerFor(engine, q, { value: 'x^3' }).correct, false)
  // whitespace collapse only — internal spacing is significant for matching
  assert.equal(answerFor(engine, q, { value: 'x ^ 2' }).correct, false)
  assert.equal(throwCode(() => answerFor(engine, q, { value: '' })), ANSWER_INVALID)
})

// ---------------------------------------------------------------------------
// validateAnswer — multi-part (per-step partial credit)
// ---------------------------------------------------------------------------

test('answer: multi-part fully correct', () => {
  const engine = serverEngine()
  const q = question(grade911Payload, partialCreditAnswer) // p1 exact 18, p2 tolerance 18 ± 0.01
  const res = answerFor(engine, q, {
    parts: [
      { partId: 'p1', value: '18' },
      { partId: 'p2', value: '18.005' },
    ],
  })
  assert.equal(res.correct, true)
  assert.equal(res.detail.required, 2)
  assert.equal(res.detail.correctUnits, 2)
  assert.equal(res.detail.mode, 'multi')
})

test('answer: multi-part partial credit (one step wrong)', () => {
  const engine = serverEngine()
  const q = question(grade911Payload, partialCreditAnswer)
  const res = answerFor(engine, q, {
    parts: [
      { partId: 'p1', value: '18' },
      { partId: 'p2', value: '19' },
    ],
  })
  assert.equal(res.correct, false)
  assert.equal(res.detail.required, 2)
  assert.equal(res.detail.correctUnits, 1)
})

test('answer: multi-part accepts every part type (fraction + sequence parts)', () => {
  const engine = serverEngine()
  const payload = {
    schemaVersion: '1.0',
    problem: 'Multi-step.',
    answerFormat: 'decimal',
    parts: [
      { id: 'p1', label: 'Reduce', answerFormat: 'fraction' },
      { id: 'p2', label: 'Terms', answerFormat: 'sequence' },
      { id: 'p3', label: 'Check', answerFormat: 'decimal' },
    ],
  }
  const correct = {
    type: 'exact',
    value: 9,
    parts: [
      { partId: 'p1', type: 'fraction', numerator: 3, denominator: 4 },
      { partId: 'p2', type: 'sequence', values: [2, 4, 6], tolerance: 0 },
      { partId: 'p3', type: 'exact', value: 9 },
    ],
  }
  const q = question(payload, correct)
  const full = answerFor(engine, q, {
    parts: [
      { partId: 'p1', value: '6/8' },
      { partId: 'p2', value: '2, 4, 6' },
      { partId: 'p3', value: '9' },
    ],
  })
  assert.equal(full.correct, true)
  // 1 (fraction part) + 3 (sequence elements) + 1 = 5 atomic units
  assert.equal(full.detail.required, 5)
  assert.equal(full.detail.correctUnits, 5)

  const partial = answerFor(engine, q, {
    parts: [
      { partId: 'p1', value: '1/2' },
      { partId: 'p2', value: '2, 4, 5' },
      { partId: 'p3', value: '9' },
    ],
  })
  assert.equal(partial.correct, false)
  assert.equal(partial.detail.required, 5)
  assert.equal(partial.detail.correctUnits, 3) // 2 sequence elements + the exact part
})

test('answer: multi-part structural failures are rejected', () => {
  const engine = serverEngine()
  const q = question(grade911Payload, partialCreditAnswer)
  assert.equal(
    throwCode(() =>
      answerFor(engine, q, { parts: [{ partId: 'p1', value: '18' }] })
    ),
    ANSWER_INVALID // missing p2
  )
  assert.equal(
    throwCode(() =>
      answerFor(engine, q, {
        parts: [
          { partId: 'p1', value: '18' },
          { partId: 'p2', value: '18' },
          { partId: 'p1', value: '18' },
        ],
      })
    ),
    ANSWER_INVALID // duplicate p1
  )
  assert.equal(
    throwCode(() =>
      answerFor(engine, q, {
        parts: [
          { partId: 'pX', value: '18' },
          { partId: 'p2', value: '18' },
        ],
      })
    ),
    ANSWER_INVALID // unknown part
  )
  assert.equal(
    throwCode(() =>
      answerFor(engine, q, {
        parts: [
          { partId: 'p1', value: '18' },
          { partId: 'p2', value: 'abc' },
        ],
      })
    ),
    ANSWER_INVALID // p2 requires a numeric tolerance value
  )
  assert.equal(
    throwCode(() =>
      answerFor(engine, q, {
        parts: [
          { partId: 'p1', value: '18' },
          { partId: 'p2', value: '18', extra: 'x' },
        ],
      })
    ),
    ANSWER_INVALID // forged per-part field
  )
})

// ---------------------------------------------------------------------------
// validateAnswer — strict response-shape gate + forging
// ---------------------------------------------------------------------------

test('answer: strict shape gate (one key, exact shape, no forged fields)', () => {
  const engine = serverEngine()
  const q = question(minimalPayload, { type: 'exact', value: 4 })
  const malformed = [
    null,
    undefined,
    '4',
    [],
    {},
    { value: '4', score: 100 },
    { value: '4', correct: true },
    { value: '4', correctnessFraction: 1 },
    { value: '4', expected: 4 },
    { value: '4', accepted: ['4'] },
    { value: '4', parts: [] },
    { value: ['4'] },
    { values: ['4'] },
    { parts: [{ partId: 'p1', value: '4' }] },
    { value: '4', interactionMetrics: { attemptsUsed: 0 } },
  ]
  for (const response of malformed) {
    assert.equal(
      throwCode(() => answerFor(engine, q, response)),
      ANSWER_INVALID,
      `response ${JSON.stringify(response)} must be rejected`
    )
  }

  // Forging a correctAnswer block is caught even earlier by the engine's
  // submission security layer.
  assert.throws(() => answerFor(engine, q, { value: '4', correctAnswer: { value: 4 } }), (err) => {
    assert.equal(
      [ANSWER_INVALID, ERROR_CODES.SECURITY_CORRECT_ANSWER_EXPOSED].includes(err.code),
      true
    )
    return true
  })
})

test('answer: multi-part payload rejects single-part shapes and vice versa', () => {
  const engine = serverEngine()
  const single = question(minimalPayload, { type: 'exact', value: 4 })
  const multi = question(grade911Payload, partialCreditAnswer)
  assert.equal(throwCode(() => answerFor(engine, multi, { value: '18' })), ANSWER_INVALID)
  assert.equal(
    throwCode(() =>
      answerFor(engine, single, { parts: [{ partId: 'p1', value: '4' }] })
    ),
    ANSWER_INVALID
  )
})

test('answer: non-finite numbers and non-numeric values are rejected', () => {
  const engine = serverEngine()
  const q = question(minimalPayload, { type: 'exact', value: 4 })
  for (const response of [
    { value: Number.NaN },
    { value: Number.POSITIVE_INFINITY },
    { value: 'abc' },
    { value: '' },
    { value: '  ' },
  ]) {
    assert.equal(throwCode(() => answerFor(engine, q, response)), ANSWER_INVALID)
  }
})

test('answer: authoring-integrity failures throw payload-semantic-invalid', () => {
  const engine = serverEngine()
  // integer payload + fraction answer → incompatible authoring
  assert.equal(
    throwCode(() =>
      answerFor(engine, question(minimalPayload, { type: 'fraction', numerator: 3, denominator: 4 }), {
        value: '3/4',
      })
    ),
    SEMANTIC_INVALID
  )
  // multi-part payload without per-part answer
  assert.equal(
    throwCode(() =>
      answerFor(engine, question(grade911Payload, { type: 'exact', value: 18 }), { parts: [] })
    ),
    SEMANTIC_INVALID
  )
  // range min > max
  assert.equal(
    throwCode(() =>
      answerFor(engine, question(minimalPayload, { type: 'range', min: 20, max: 10 }), {
        value: '15',
      })
    ),
    SEMANTIC_INVALID
  )
})

test('answer: schema-invalid correct-answer never reaches the plugin', () => {
  const engine = serverEngine()
  // invalidCorrectAnswer.json is a range type with value+tolerance only.
  assert.equal(
    throwCode(() =>
      engine.validateAnswer('number-logic', {
        submission: { questionId: 'q1', response: { value: '42' } },
        payload: minimalPayload,
        correctAnswer: invalidCorrectAnswer,
      })
    ),
    ERROR_CODES.ENGINE_INTERNAL
  )
})

// ---------------------------------------------------------------------------
// scoring inputs
// ---------------------------------------------------------------------------

test('scoringInputs: 1.0 / partial / 0.0 with correct units and safe evidence', () => {
  const engine = serverEngine()

  const fullSeq = answerFor(
    engine,
    question({ ...minimalPayload, answerFormat: 'sequence' }, { type: 'sequence', values: [2, 4, 6] }),
    { values: ['2', '4', '6'] }
  )
  const fullInputs = numberLogicPlugin.scoringInputs(
    { submission: { interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } },
    fullSeq
  )
  assert.equal(fullInputs.correctnessFraction, 1)
  assert.equal(fullInputs.scorableUnits, 3)
  assert.equal(fullInputs.correctUnits, 3)
  assert.equal(fullInputs.attemptsUsed, 1)

  const partialSeq = answerFor(
    engine,
    question({ ...minimalPayload, answerFormat: 'sequence' }, { type: 'sequence', values: [2, 4, 6] }),
    { values: ['2', '4', '5'] }
  )
  const partialInputs = numberLogicPlugin.scoringInputs(
    { submission: { interactionMetrics: { attemptsUsed: 2, hintsUsed: 1 } } },
    partialSeq
  )
  assert.equal(partialInputs.correctnessFraction, 2 / 3)
  assert.equal(partialInputs.correctUnits, 2)

  const zero = answerFor(engine, question(minimalPayload, { type: 'exact', value: 4 }), { value: '9' })
  assert.equal(numberLogicPlugin.scoringInputs({ submission: {} }, zero).correctnessFraction, 0)
})

test('scoringInputs: evidence never carries the expected values', () => {
  const engine = serverEngine()
  const res = answerFor(
    engine,
    question({ ...minimalPayload, answerFormat: 'sequence' }, { type: 'sequence', values: [2, 4, 6] }),
    { values: ['2', '4', '5'] }
  )
  const inputs = numberLogicPlugin.scoringInputs({ submission: {} }, res)
  const json = JSON.stringify(inputs.evidence)
  assert.equal(json.includes('correctAnswer'), false)
  // The expected values (2, 4, 6) are never revealed in evidence.
  for (const unit of inputs.evidence) {
    for (const key of ['value', 'tolerance', 'min', 'max', 'accepted']) {
      assert.equal(Object.prototype.hasOwnProperty.call(unit, key), false, `${key} must not leak`)
    }
    assert.equal(typeof unit.correct, 'boolean')
    assert.equal(typeof unit.submitted, 'string')
  }
})

// ---------------------------------------------------------------------------
// hints + feedback + availability
// ---------------------------------------------------------------------------

test('hints: authored progressive hints, no answer leakage', () => {
  const hints = numberLogicPlugin.buildHints({
    hints: [
      { level: 1, text: 'Divide both sides.' },
      { level: 2, text: '12 ÷ 3.' },
    ],
  })
  assert.equal(hints.length, 2)
  assert.equal(hints[0].level, 1)
  assert.equal(hints[1].text, '12 ÷ 3.')
  assert.equal(JSON.stringify(hints).includes('correctAnswer'), false)
  assert.deepEqual(numberLogicPlugin.buildHints({ hints: 'nope' }), [])
})

test('feedback: correct / partial / incorrect / timeout, no leaks', () => {
  const engine = serverEngine()
  const ctx = { submission: {} }

  const ok = answerFor(engine, question(minimalPayload, { type: 'exact', value: 4 }), { value: '4' })
  const fOk = numberLogicPlugin.feedback(ctx, ok)
  assert.equal(fOk.state, 'correct')
  assert.ok(!JSON.stringify(fOk).includes('4'))

  const pSeq = answerFor(
    engine,
    question({ ...minimalPayload, answerFormat: 'sequence' }, { type: 'sequence', values: [2, 4, 6] }),
    { values: ['2', '4', '5'] }
  )
  const fPartial = numberLogicPlugin.feedback(ctx, pSeq)
  assert.equal(fPartial.state, 'partial')
  assert.ok(fPartial.message.includes('2 of 3'))

  const bad = answerFor(engine, question(minimalPayload, { type: 'exact', value: 4 }), { value: '9' })
  const fBad = numberLogicPlugin.feedback(ctx, bad)
  assert.equal(fBad.state, 'incorrect')
  assert.ok(!JSON.stringify(fBad).includes('"4"'), 'expected value 4 must not leak')
  assert.ok(!JSON.stringify(fBad).includes('correctAnswer'))

  const fTimeout = numberLogicPlugin.feedback({ submission: { state: 'timeout' } }, pSeq)
  assert.equal(fTimeout.state, 'timeout')
})

test('availableOn: default available, featureFlag opt-out', () => {
  assert.equal(numberLogicPlugin.availableOn({}), true)
  assert.equal(numberLogicPlugin.availableOn({ featureFlags: {} }), true)
  assert.equal(numberLogicPlugin.availableOn({ featureFlags: { 'number-logic': false } }), false)
  assert.equal(numberLogicPlugin.availableOn({ featureFlags: { 'number-logic': true } }), true)
})

// ---------------------------------------------------------------------------
// client/server boundary
// ---------------------------------------------------------------------------

test('boundary: client engine exposes no server-only methods for number-logic', () => {
  const engine = clientEngine()
  assert.equal(engine.validateAnswer, undefined)
  assert.equal(engine.scoringInputs, undefined)
  assert.equal(engine.feedback, undefined)
  assert.equal(engine.getCorrectAnswerSchema, undefined)
  const view = engine.get('number-logic')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.equal(view[method], undefined, `${method} must be stripped from the client view`)
  }
  assert.equal(typeof view.render, 'function')
})

test('boundary: render context rejects correctAnswer data', () => {
  const engine = clientEngine()
  assert.throws(
    () =>
      engine.render('number-logic', {
        question: { prompt: 'P', payload: minimalPayload, correctAnswer: { value: 4 } },
      }),
    (err) => err.code === ERROR_CODES.SECURITY_CORRECT_ANSWER_EXPOSED
  )
})

test('boundary: submissions carrying forged correctness keys are rejected', () => {
  const engine = serverEngine()
  const q = question(minimalPayload, { type: 'exact', value: 4 })
  for (const response of [
    { value: '4', correct: true },
    { value: '4', correctnessFraction: 1 },
    { value: '4', score: 100 },
    { value: '4', expected: 4 },
    { value: '4', accepted: ['4'] },
  ]) {
    assert.equal(throwCode(() => answerFor(engine, q, response)), ANSWER_INVALID)
  }
})

test('boundary: client facade only exposes the plugin view, no engine internals', () => {
  const engine = clientEngine()
  const view = engine.get('number-logic')
  assert.equal(view.validateAnswer, undefined)
  assert.equal(view.scoringInputs, undefined)
  assert.equal(view.feedback, undefined)
})

// ---------------------------------------------------------------------------
// accessibility contract surface
// ---------------------------------------------------------------------------

test('a11y: stylesheet presence + interaction contract surface', () => {
  const css = String(
    readFileSync(new URL('../plugins/number-logic/number-logic.css', import.meta.url))
  )
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'))
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('min-height: 48px'))
  assert.ok(css.includes('.nl-sr-live'))
  // The renderer uses real buttons + labelled inputs (asserted structurally by
  // the presence of the label/input classes in the stylesheet).
  assert.ok(css.includes('.nl-input'))
  assert.ok(css.includes('.nl-add-button'))
  assert.ok(css.includes('.nl-submit-button'))
})