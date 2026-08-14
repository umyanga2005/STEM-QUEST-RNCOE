/**
 * Activity Engine — pattern plugin tests (Task 4.10).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import {
  patternPlugin,
  registerPattern,
  validatePatternAnswer,
} from '../plugins/pattern/plugin.js'
import {
  normalizeTextAnswer,
  parseNumericValue,
  createPatternState,
  requiredUnits,
  selectedIds,
  selectCandidate,
  deselectCandidate,
  clearSelection,
  setValue,
  getValue,
  isComplete,
  clear,
  reset,
  buildResponse,
} from '../plugins/pattern/pattern-controller.js'

import minimalPayload from '../../../../schemas/examples/pattern/minimal-valid-payload.json' with { type: 'json' }
import validCorrectAnswer from '../../../../schemas/examples/pattern/valid-correct-answer.json' with { type: 'json' }
import grade67Payload from '../../../../schemas/examples/pattern/valid-payload-grade6-7.json' with { type: 'json' }
import grade911Payload from '../../../../schemas/examples/pattern/valid-payload-grade9-11.json' with { type: 'json' }
import invalidCorrectAnswer from '../../../../schemas/examples/pattern/invalid-correct-answer.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/pattern/invalid-payload.json' with { type: 'json' }

// minimalPayload: construct-next count 1, sequence [2,4,6], candidates 8/10/7;
//   validCorrectAnswer: candidate, acceptableIds [c1] (8).
// grade67Payload: complete-sequence, shapes circle/square alternating,
//   candidates circle/square/triangle.
// grade911Payload: fill-missing missingAt 2 (hidden element = sequence[2] = 9),
//   sequence [1,4,9], candidates 16/12/25; numericAnswer: value 16 tol 0.
//   NOTE: the fixture's authored answer (16) is the NEXT term after the hidden
//   slot; the hidden slot value is 9. This is documented in report 08. The
//   engine scores the authored numeric answer as-is; self-consistent demo and
//   cross-document fixtures use the hidden-slot value.

// Self-consistent fill-missing: hidden element is sequence[1] = 4.
const fillMissingPayload = {
  schemaVersion: '1.0',
  sequence: [
    { id: 'e1', number: 2 },
    { id: 'e2', number: 4 },
    { id: 'e3', number: 6 },
  ],
  interaction: 'fill-missing',
  missingAt: 1,
  candidates: [
    { id: 'c1', number: 6 },
    { id: 'c2', number: 4 },
    { id: 'c3', number: 2 },
  ],
}
const fillMissingAnswer = { type: 'candidate', acceptableIds: ['c2'] }
const fillMissingNumericAnswer = { type: 'numeric', value: 4, tolerance: 0 }

// construct-next with two answer units and MULTIPLE VALID SOLUTIONS.
const constructTwoPayload = {
  schemaVersion: '1.0',
  sequence: [
    { id: 'e1', number: 2 },
    { id: 'e2', number: 4 },
    { id: 'e3', number: 6 },
  ],
  interaction: 'construct-next',
  constructCount: 2,
  candidates: [
    { id: 'c1', number: 8 },
    { id: 'c2', number: 10 },
    { id: 'c3', number: 12 },
    { id: 'c4', number: 7 },
  ],
}
const constructTwoAnswer = { type: 'candidate', acceptableIds: ['c1', 'c2'] }
const constructTwoAlternate = { type: 'candidate', acceptableIds: ['c1', 'c3'] }

// Text-based complete-sequence.
const textPayload = {
  schemaVersion: '1.0',
  sequence: [
    { id: 'e1', text: 'red' },
    { id: 'e2', text: 'blue' },
    { id: 'e3', text: 'red' },
  ],
  interaction: 'complete-sequence',
  candidates: [
    { id: 'c1', text: 'blue' },
    { id: 'c2', text: 'green' },
    { id: 'c3', text: 'yellow' },
  ],
}
const textAnswer = { type: 'text', accepted: ['blue'] }

// Image element mapping check.
const imagePayload = {
  schemaVersion: '1.0',
  sequence: [
    { id: 'e1', text: 'A' },
    { id: 'e2', text: 'B' },
    { id: 'e3', image: { ref: 'question-media/demo/pattern/demo.png' } },
  ],
  interaction: 'complete-sequence',
  candidates: [
    { id: 'c1', text: 'C' },
    { id: 'c2', text: 'D' },
  ],
}

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(patternPlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(patternPlugin)
  return engine
}

function runAnswer(engine, response, { payload = minimalPayload, correctAnswer = validCorrectAnswer } = {}) {
  return engine.validateAnswer('pattern', {
    submission: { questionId: 'q-pat-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

function scoringCtx(response) {
  return { submission: { response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
}

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('pattern: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('pattern'), true)
  const listed = engine.list().find((p) => p.type === 'pattern')
  assert.equal(listed.name, 'Pattern')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof patternPlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('pattern: registerPattern helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerPattern(engine)
  assert.equal(engine.has('pattern'), true)
})

test('pattern: coexists with other plugins; duplicate registration rejected', () => {
  const engine = createServerActivityEngine()
  registerPattern(engine)
  assert.throws(() => registerPattern(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('pattern: construct-next render is a safe descriptor with no answer data', () => {
  const engine = clientEngine()
  const descriptor = engine.render('pattern', {
    question: {
      prompt: 'Continue the sequence.',
      instructions: 'Choose the next even number.',
      payload: minimalPayload,
    },
  })
  assert.equal(descriptor.kind, 'pattern')
  assert.equal(descriptor.interaction, 'construct-next')
  assert.equal(descriptor.constructCount, 1)
  assert.equal(descriptor.units, 1)
  assert.equal(descriptor.missingAt, null)
  assert.equal(descriptor.prompt, 'Continue the sequence.')
  assert.deepEqual(descriptor.sequence.map((e) => e.number), [2, 4, 6])
  assert.deepEqual(descriptor.candidates.map((c) => c.number), [8, 10, 7])
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('acceptableIds'))
  assert.ok(!raw.includes('acceptable'))
  assert.ok(!raw.includes('"correct"'))
  for (const key of ['correctAnswer', 'acceptableIds', 'acceptable', 'accepted', 'expected', 'answerKey']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('pattern: fill-missing render carries the public missingAt slot marker', () => {
  const engine = clientEngine()
  const descriptor = engine.render('pattern', { question: { payload: fillMissingPayload } })
  assert.equal(descriptor.interaction, 'fill-missing')
  assert.equal(descriptor.missingAt, 1)
  assert.equal(descriptor.constructCount, null)
  assert.equal(descriptor.units, 1)
  assert.deepEqual(descriptor.sequence.map((e) => e.number), [2, 4, 6])
  assert.ok(!JSON.stringify(descriptor).includes('acceptableIds'))
})

test('pattern: complete-sequence render marks one trailing unit', () => {
  const engine = clientEngine()
  const descriptor = engine.render('pattern', { question: { payload: grade67Payload } })
  assert.equal(descriptor.interaction, 'complete-sequence')
  assert.equal(descriptor.units, 1)
  assert.equal(descriptor.constructCount, null)
  assert.equal(descriptor.missingAt, null)
  assert.deepEqual(descriptor.sequence.map((e) => e.shape), ['circle', 'square', 'circle', 'square'])
  assert.deepEqual(descriptor.candidates.map((c) => c.shape), ['circle', 'square', 'triangle'])
})

test('pattern: construct-next multi-unit render carries constructCount and units', () => {
  const engine = clientEngine()
  const descriptor = engine.render('pattern', { question: { payload: constructTwoPayload } })
  assert.equal(descriptor.constructCount, 2)
  assert.equal(descriptor.units, 2)
})

test('pattern: render maps image refs to imageRef and keeps element fields', () => {
  const engine = clientEngine()
  const descriptor = engine.render('pattern', { question: { payload: imagePayload } })
  assert.equal(descriptor.sequence[2].imageRef, 'question-media/demo/pattern/demo.png')
  assert.equal(descriptor.sequence[0].text, 'A')
  assert.equal(descriptor.sequence[0].number, null)
  assert.equal(descriptor.sequence[2].shape, null)
  assert.equal(descriptor.candidates[0].ariaLabel, '')
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('acceptableIds'))
  assert.ok(!raw.includes('correctAnswer'))
})

// --------------------------------------------------------------------------
// 3. Payload validation (schema + semantic)
// --------------------------------------------------------------------------

test('pattern: valid payloads in every mode pass', () => {
  const engine = serverEngine()
  for (const payload of [minimalPayload, grade67Payload, grade911Payload, fillMissingPayload, constructTwoPayload, textPayload]) {
    const result = engine.validatePayload('pattern', payload)
    assert.equal(result.valid, true, JSON.stringify(result.errors))
  }
})

test('pattern: schema-invalid payloads are rejected', () => {
  const engine = serverEngine()
  const result = engine.validatePayload('pattern', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

test('pattern: duplicate sequence ids are a semantic error (uniqueItems is shallow)', () => {
  const engine = serverEngine()
  const dupSeq = {
    ...minimalPayload,
    sequence: [
      { id: 'e1', number: 2 },
      { id: 'e1', number: 3 },
      { id: 'e2', number: 4 },
    ],
  }
  const result = engine.validatePayload('pattern', dupSeq)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'pattern.sequence-ids-unique'))
})

test('pattern: duplicate candidate ids are a semantic error', () => {
  const engine = serverEngine()
  const dupCand = {
    ...minimalPayload,
    candidates: [
      { id: 'c1', number: 8 },
      { id: 'c1', number: 9 },
      { id: 'c2', number: 10 },
    ],
  }
  const result = engine.validatePayload('pattern', dupCand)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'pattern.candidate-ids-unique'))
})

test('pattern: sequence and candidate ids must be disjoint', () => {
  const engine = serverEngine()
  const overlap = { ...minimalPayload, candidates: [...minimalPayload.candidates, { id: 'e1', number: 2 }] }
  const result = engine.validatePayload('pattern', overlap)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'pattern.sequence-candidates-disjoint'))
})

test('pattern: fill-missing missingAt must be inside the sequence', () => {
  const engine = serverEngine()
  const outOfRange = { ...fillMissingPayload, missingAt: 5 }
  const result = engine.validatePayload('pattern', outOfRange)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'pattern.fill-missing-missing-at-in-range'))
})

// --------------------------------------------------------------------------
// 4. Cross-document integrity (validatePatternAnswer)
// --------------------------------------------------------------------------

test('pattern: consistent payload/answer pairs have no integrity errors', () => {
  assert.deepEqual(validatePatternAnswer(minimalPayload, validCorrectAnswer), [])
  assert.deepEqual(validatePatternAnswer(grade67Payload, { type: 'candidate', acceptableIds: ['c1'] }), [])
  assert.deepEqual(validatePatternAnswer(fillMissingPayload, fillMissingAnswer), [])
  assert.deepEqual(validatePatternAnswer(constructTwoPayload, constructTwoAnswer), [])
})

test('pattern: acceptableIds must reference known candidates', () => {
  const errors = validatePatternAnswer(minimalPayload, { type: 'candidate', acceptableIds: ['c1', 'c9'] })
  assert.ok(errors.some((e) => e.ruleId === 'pattern.acceptable-ids-exist' && e.message.includes('c9')))
})

test('pattern: construct-next full credit must be attainable', () => {
  const errors = validatePatternAnswer(constructTwoPayload, { type: 'candidate', acceptableIds: ['c1'] })
  assert.ok(errors.some((e) => e.ruleId === 'pattern.construct-count-attainable'))
})

test('pattern: a numeric/text answer cannot serve multi-element construction', () => {
  const numeric = validatePatternAnswer(constructTwoPayload, { type: 'numeric', value: 8, tolerance: 0 })
  assert.ok(numeric.some((e) => e.ruleId === 'pattern.construct-next-single-value'))
  const text = validatePatternAnswer(constructTwoPayload, { type: 'text', accepted: ['eight'] })
  assert.ok(text.some((e) => e.ruleId === 'pattern.construct-next-single-value'))
})

test('pattern: fill-missing missingAt must be in range', () => {
  const errors = validatePatternAnswer({ ...fillMissingPayload, missingAt: 9 }, fillMissingAnswer)
  assert.ok(errors.some((e) => e.ruleId === 'pattern.acceptable-ids-exist' && e.message.includes('missingAt')))
})

test('pattern: numeric ranges must be ordered', () => {
  const errors = validatePatternAnswer(minimalPayload, { type: 'numeric', min: 20, max: 10 })
  assert.ok(errors.some((e) => e.ruleId === 'pattern.numeric-range-valid'))
})

test('pattern: accepted text values must be non-blank', () => {
  const errors = validatePatternAnswer(minimalPayload, { type: 'text', accepted: ['blue', '   '] })
  assert.ok(errors.some((e) => e.ruleId === 'pattern.accepted-values-nonblank'))
})

test('pattern: a schema-invalid correct answer is rejected before student scoring', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { selected: ['c1'] }, { payload: minimalPayload, correctAnswer: invalidCorrectAnswer }),
    (err) => err.code === ERROR_CODES.ENGINE_INTERNAL
  )
  // An author bug (acceptable id referencing an unknown candidate) is an authoring error.
  assert.throws(
    () => runAnswer(engine, { selected: ['c1'] }, { payload: minimalPayload, correctAnswer: { type: 'candidate', acceptableIds: ['c9'] } }),
    (err) => err.code === ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID
  )
})

// --------------------------------------------------------------------------
// 5. Controller: helpers + state
// --------------------------------------------------------------------------

test('pattern controller: text normalization trims and case-folds', () => {
  assert.equal(normalizeTextAnswer('  Blue  '), 'blue')
  assert.equal(normalizeTextAnswer(''), '')
  assert.equal(normalizeTextAnswer(null), 'null')
})

test('pattern controller: numeric parsing is strict about finiteness', () => {
  assert.equal(parseNumericValue(8), 8)
  assert.equal(parseNumericValue(' 8.5 '), 8.5)
  assert.equal(Number.isNaN(parseNumericValue('abc')), true)
  assert.equal(Number.isNaN(parseNumericValue('')), true)
  assert.equal(Number.isNaN(parseNumericValue(null)), true)
  assert.equal(Number.isNaN(parseNumericValue(Number.POSITIVE_INFINITY)), true)
})

test('pattern controller: initial state and units', () => {
  const single = createPatternState({ interaction: 'construct-next', sequence: [], candidates: [], constructCount: 1 })
  assert.equal(single.units, 1)
  assert.deepEqual(selectedIds(single), [])
  assert.equal(getValue(single), null)
  const multi = createPatternState({ interaction: 'construct-next', sequence: [], candidates: [], constructCount: 2 })
  assert.equal(multi.units, 2)
  assert.equal(requiredUnits(multi), 2)
  assert.equal(createPatternState().units, 1, 'complete-sequence defaults to one unit')
})

// --------------------------------------------------------------------------
// 6. Controller: candidate selection
// --------------------------------------------------------------------------

const state = createPatternState({ interaction: 'construct-next', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }], constructCount: 2 })

test('pattern controller: unknown ids are no-ops', () => {
  assert.equal(selectCandidate(state, 'nope'), state)
  assert.equal(deselectCandidate(state, 'nope'), state)
  assert.equal(clearSelection(state), state, 'empty selection is already clear')
})

test('pattern controller: single-unit modes replace, never accumulate', () => {
  let s = createPatternState({ interaction: 'complete-sequence', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }] })
  s = selectCandidate(s, 'c1')
  assert.deepEqual(selectedIds(s), ['c1'])
  s = selectCandidate(s, 'c2')
  assert.deepEqual(selectedIds(s), ['c2'], 'a new pick replaces the previous one')
  s = selectCandidate(s, 'c2')
  assert.deepEqual(selectedIds(s), [], 're-selecting toggles off')
})

test('pattern controller: multi-unit modes append up to units then replace', () => {
  let s = state
  s = selectCandidate(s, 'c1')
  s = selectCandidate(s, 'c2')
  assert.deepEqual(selectedIds(s), ['c1', 'c2'])
  s = selectCandidate(s, 'c3')
  assert.deepEqual(selectedIds(s), ['c1', 'c3'], 'a pick when full replaces the most recent')
  s = selectCandidate(s, 'c1')
  assert.deepEqual(selectedIds(s), ['c3'], 're-selecting an existing id deselects it')
})

test('pattern controller: candidate selection and typed entry are mutually exclusive', () => {
  let s = createPatternState({ interaction: 'complete-sequence', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }] })
  s = setValue(s, '8')
  assert.deepEqual(selectedIds(s), [])
  s = selectCandidate(s, 'c1')
  assert.equal(getValue(s), null, 'selecting a candidate clears the typed value')
})

// --------------------------------------------------------------------------
// 7. Controller: typed entry, completion, serialization
// --------------------------------------------------------------------------

test('pattern controller: setValue records strings only and clears selection', () => {
  let s = createPatternState({ interaction: 'complete-sequence', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }] })
  s = selectCandidate(s, 'c1')
  s = setValue(s, ' 8 ')
  assert.equal(getValue(s), ' 8 ')
  assert.deepEqual(selectedIds(s), [])
  assert.equal(setValue(s, 8), s, 'non-string values are no-ops')
})

test('pattern controller: completion needs all units or a non-blank value', () => {
  const single = createPatternState({ interaction: 'complete-sequence', sequence: [], candidates: [{ id: 'c1' }] })
  assert.equal(isComplete(single), false)
  assert.equal(isComplete(setValue(single, '   ')), false)
  assert.equal(isComplete(setValue(single, '8')), true)
  assert.equal(isComplete(selectCandidate(single, 'c1')), true)
  const multi = createPatternState({ interaction: 'construct-next', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }], constructCount: 2 })
  assert.equal(isComplete(selectCandidate(multi, 'c1')), false)
  assert.equal(isComplete(selectCandidate(selectCandidate(multi, 'c1'), 'c2')), true)
})

test('pattern controller: clear, reset and clearSelection', () => {
  let s = state
  s = selectCandidate(s, 'c1')
  s = setValue(s, 'x')
  s = setValue(s, null) // ignored, keeps typed path
  assert.equal(isComplete(s), true)
  s = clearSelection(s)
  assert.deepEqual(selectedIds(s), [])
  assert.equal(getValue(s), 'x', 'clearSelection keeps the typed value')
  s = reset(s)
  assert.equal(getValue(s), null)
  assert.deepEqual(selectedIds(s), [])
  assert.equal(isComplete(s), false)
  assert.deepEqual(clear(s), s, 'clear and reset produce the same empty state')
})

test('pattern controller: buildResponse serializes each path', () => {
  const typed = setValue(createPatternState({ interaction: 'complete-sequence', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }] }), ' 8 ')
  assert.deepEqual(buildResponse(typed), { value: '8' })
  const picked = selectCandidate(createPatternState({ interaction: 'complete-sequence', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }] }), 'c2')
  assert.deepEqual(buildResponse(picked), { selected: ['c2'] })
  const multi = createPatternState({ interaction: 'construct-next', sequence: [], candidates: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }], constructCount: 2 })
  const multiPicked = selectCandidate(selectCandidate(multi, 'c2'), 'c1')
  assert.deepEqual(buildResponse(multiPicked), { selected: ['c2', 'c1'] }, 'selection order is preserved')
})

// --------------------------------------------------------------------------
// 8. Candidate-type answer validation
// --------------------------------------------------------------------------

test('pattern candidate: single-unit construct-next accepts the acceptable id', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { selected: ['c1'] })
  assert.equal(v.correct, true)
  assert.equal(v.detail.mode, 'construct-next')
  assert.equal(v.detail.answerType, 'candidate')
  assert.equal(v.detail.required, 1)
  assert.equal(v.detail.correctUnits, 1)
  assert.deepEqual(v.detail.submitted, [{ id: 'c1', correct: true }])
})

test('pattern candidate: a wrong candidate is a zero-credit submission', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { selected: ['c2'] })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctUnits, 0)
})

test('pattern candidate: a typed value resolving to a candidate is accepted', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { value: '8' })
  assert.equal(v.correct, true)
  assert.equal(v.detail.submitted[0].id, 'c1')
  const wrong = runAnswer(engine, { value: '10' })
  assert.equal(wrong.correct, false)
  assert.equal(wrong.detail.submitted[0].id, 'c2')
})

test('pattern candidate: a typed value matching no candidate is rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { value: '5' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('pattern candidate: a typed value on shape-only candidates is rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { value: 'circle' }, { payload: grade67Payload, correctAnswer: { type: 'candidate', acceptableIds: ['c1'] } }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('pattern candidate: complete-sequence shapes score by identity', () => {
  const engine = serverEngine()
  const answer = { type: 'candidate', acceptableIds: ['c1'] }
  assert.equal(runAnswer(engine, { selected: ['c1'] }, { payload: grade67Payload, correctAnswer: answer }).correct, true)
  assert.equal(runAnswer(engine, { selected: ['c3'] }, { payload: grade67Payload, correctAnswer: answer }).correct, false)
})

test('pattern candidate: fill-missing scores the hidden element by identity', () => {
  const engine = serverEngine()
  assert.equal(runAnswer(engine, { selected: ['c2'] }, { payload: fillMissingPayload, correctAnswer: fillMissingAnswer }).correct, true)
  const wrong = runAnswer(engine, { selected: ['c1'] }, { payload: fillMissingPayload, correctAnswer: fillMissingAnswer })
  assert.equal(wrong.correct, false)
  assert.equal(wrong.detail.correctUnits, 0)
})

test('pattern candidate: multiple valid solutions each earn full credit', () => {
  const engine = serverEngine()
  assert.equal(
    runAnswer(engine, { selected: ['c1', 'c2'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAnswer }).correct,
    true
  )
  assert.equal(
    runAnswer(engine, { selected: ['c1', 'c3'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAlternate }).correct,
    true,
    'alternate acceptable set earns full credit'
  )
  const partial = runAnswer(engine, { selected: ['c1', 'c4'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAlternate })
  assert.equal(partial.correct, false)
  assert.equal(partial.detail.correctUnits, 1)
  assert.equal(partial.detail.required, 2)
  const zero = runAnswer(engine, { selected: ['c4', 'c2'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAlternate })
  assert.equal(zero.correct, false)
  assert.equal(zero.detail.correctUnits, 0)
})

test('pattern candidate: multi-unit submissions must match the unit count', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { selected: ['c1'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { selected: ['c1', 'c2', 'c3'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('pattern candidate: duplicate and unknown selections are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { selected: ['c1', 'c1'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { selected: ['x'] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

// --------------------------------------------------------------------------
// 9. Numeric-type answer validation
// --------------------------------------------------------------------------

test('pattern numeric: exact value, tolerance and range scoring', () => {
  const engine = serverEngine()
  const answer = { type: 'numeric', value: 4, tolerance: 0 }
  assert.equal(runAnswer(engine, { value: '4' }, { payload: fillMissingPayload, correctAnswer: answer }).correct, true)
  assert.equal(runAnswer(engine, { value: 4 }, { payload: fillMissingPayload, correctAnswer: answer }).correct, true, 'numeric values are accepted')
  assert.equal(runAnswer(engine, { value: '4.1' }, { payload: fillMissingPayload, correctAnswer: answer }).correct, false)
  const tolerant = { type: 'numeric', value: 4, tolerance: 0.5 }
  assert.equal(runAnswer(engine, { value: '4.3' }, { payload: fillMissingPayload, correctAnswer: tolerant }).correct, true)
  assert.equal(runAnswer(engine, { value: '4.6' }, { payload: fillMissingPayload, correctAnswer: tolerant }).correct, false)
  const range = { type: 'numeric', min: 15, max: 17 }
  assert.equal(runAnswer(engine, { value: '16' }, { payload: grade911Payload, correctAnswer: range }).correct, true)
  assert.equal(runAnswer(engine, { value: '20' }, { payload: grade911Payload, correctAnswer: range }).correct, false)
})

test('pattern numeric: a selected numeric candidate is evaluated through its value', () => {
  const engine = serverEngine()
  assert.equal(runAnswer(engine, { selected: ['c2'] }, { payload: fillMissingPayload, correctAnswer: fillMissingNumericAnswer }).correct, true)
  assert.equal(runAnswer(engine, { selected: ['c1'] }, { payload: fillMissingPayload, correctAnswer: fillMissingNumericAnswer }).correct, false)
})

test('pattern numeric: non-finite values are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { value: 'abc' }, { payload: fillMissingPayload, correctAnswer: fillMissingNumericAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { value: NaN }, { payload: fillMissingPayload, correctAnswer: fillMissingNumericAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { value: 'Infinity' }, { payload: fillMissingPayload, correctAnswer: fillMissingNumericAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('pattern numeric: the numeric path is a single value', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { selected: ['c1', 'c2'] }, { payload: fillMissingPayload, correctAnswer: fillMissingNumericAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

// --------------------------------------------------------------------------
// 10. Text-type answer validation
// --------------------------------------------------------------------------

test('pattern text: accepted values match with trim + case-fold', () => {
  const engine = serverEngine()
  assert.equal(runAnswer(engine, { value: 'blue' }, { payload: textPayload, correctAnswer: textAnswer }).correct, true)
  assert.equal(runAnswer(engine, { value: '  BLUE  ' }, { payload: textPayload, correctAnswer: textAnswer }).correct, true)
  assert.equal(runAnswer(engine, { value: 'green' }, { payload: textPayload, correctAnswer: textAnswer }).correct, false)
})

test('pattern text: a selected text candidate is evaluated through its value', () => {
  const engine = serverEngine()
  assert.equal(runAnswer(engine, { selected: ['c1'] }, { payload: textPayload, correctAnswer: textAnswer }).correct, true)
  assert.equal(runAnswer(engine, { selected: ['c2'] }, { payload: textPayload, correctAnswer: textAnswer }).correct, false)
})

test('pattern text: blank and non-string values are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { value: '' }, { payload: textPayload, correctAnswer: textAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { value: 42 }, { payload: textPayload, correctAnswer: textAnswer }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

// --------------------------------------------------------------------------
// 11. Response shape gate
// --------------------------------------------------------------------------

test('pattern: response shape is strictly one path', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { selected: ['c1'], value: '8' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { selected: 'nope' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { selected: [42] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { value: null }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { score: 999 }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('pattern: forged top-level fields are rejected, never silently coerced', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { selected: ['c1'], score: 999, correct: true, correctUnits: 5 }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

// --------------------------------------------------------------------------
// 12. Scoring
// --------------------------------------------------------------------------

test('pattern scoring: full credit is 1.0 with correct scorableUnits', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { selected: ['c1'] })
  const scoring = engine.scoringInputs('pattern', scoringCtx({ selected: ['c1'] }), v)
  assert.equal(scoring.correctnessFraction, 1)
  assert.equal(scoring.scorableUnits, 1)
  assert.equal(scoring.correctUnits, 1)
})

test('pattern scoring: multi-unit partial credit is a correct fraction', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { selected: ['c1', 'c4'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAnswer })
  const scoring = engine.scoringInputs('pattern', scoringCtx({ selected: ['c1', 'c4'] }), v)
  assert.equal(scoring.correctnessFraction, 0.5)
  assert.equal(scoring.scorableUnits, 2)
  assert.equal(scoring.correctUnits, 1)
})

test('pattern scoring: zero credit is 0.0', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { selected: ['c2'] })
  const scoring = engine.scoringInputs('pattern', scoringCtx({ selected: ['c2'] }), v)
  assert.equal(scoring.correctnessFraction, 0)
})

test('pattern scoring: evidence carries submitted ids/flags only, never the acceptable set', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { selected: ['c1', 'c4'] }, { payload: constructTwoPayload, correctAnswer: constructTwoAlternate })
  const scoring = engine.scoringInputs('pattern', scoringCtx({ selected: ['c1', 'c4'] }), v)
  const raw = JSON.stringify(scoring)
  assert.deepEqual(scoring.evidence, [
    { id: 'c1', correct: true },
    { id: 'c4', correct: false },
  ])
  assert.ok(!raw.includes('acceptableIds'))
  assert.ok(!raw.includes('c3'), 'the acceptable-but-unsubmitted candidate must not leak')
})

// --------------------------------------------------------------------------
// 13. Hints
// --------------------------------------------------------------------------

test('pattern: hints are authored and never reveal the answer', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('pattern', {
    hints: [{ level: 1, text: 'Look for the step between consecutive elements.' }],
  })
  assert.equal(hints.length, 1)
  assert.equal(hints[0].text, 'Look for the step between consecutive elements.')
  assert.ok(!JSON.stringify(hints).includes('c1'))
})

test('pattern: no hints when none are authored', () => {
  const engine = clientEngine()
  assert.deepEqual(engine.buildHints('pattern', { hints: null }), [])
})

// --------------------------------------------------------------------------
// 14. Feedback
// --------------------------------------------------------------------------

test('pattern feedback: correct / partial / incorrect / timeout', () => {
  const engine = serverEngine()
  const ok = { submission: { state: 'submitted' }, interactionMetrics: { attemptsUsed: 1 } }
  const full = { detail: { mode: 'construct-next', required: 2, correctUnits: 2 } }
  const partial = { detail: { mode: 'construct-next', required: 2, correctUnits: 1 } }
  const zero = { detail: { mode: 'fill-missing', required: 1, correctUnits: 0 } }
  assert.equal(engine.feedback('pattern', ok, full).state, 'correct')
  assert.ok(engine.feedback('pattern', ok, partial).message.includes('1 of 2'))
  assert.equal(engine.feedback('pattern', ok, zero).state, 'incorrect')
  const timeout = engine.feedback('pattern', { submission: { state: 'timeout' } }, zero)
  assert.equal(timeout.state, 'timeout')
})

test('pattern feedback: never leaks the acceptable answer', () => {
  const engine = serverEngine()
  const raw = JSON.stringify(engine.feedback('pattern', { submission: { state: 'submitted' } }, { detail: { mode: 'construct-next', required: 2, correctUnits: 1 } }))
  assert.ok(!raw.includes('acceptableIds'))
  assert.ok(!raw.includes('c1'))
})

// --------------------------------------------------------------------------
// 15. Availability
// --------------------------------------------------------------------------

test('pattern: available by default and when the flag opts in', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('pattern', {}), true)
  assert.equal(engine.availableOn('pattern', { featureFlags: { 'pattern': true } }), true)
})

test('pattern: availability flag can opt out', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('pattern', { featureFlags: { 'pattern': false } }), false)
})

// --------------------------------------------------------------------------
// 16. Client facade boundary
// --------------------------------------------------------------------------

test('pattern: the client facade exposes no server-only methods', () => {
  const engine = clientEngine()
  const listed = engine.list().find((p) => p.type === 'pattern')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.ok(!(method in listed), `client facade must not expose "${method}"`)
  }
  assert.equal(engine.scoringInputs, undefined)
})

test('pattern: the client engine has no validateAnswer/scoringInputs/feedback/getCorrectAnswerSchema', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(engine[method], undefined)
  }
})

// --------------------------------------------------------------------------
// 17. Accessibility contract surface
// --------------------------------------------------------------------------

test('pattern: the descriptor carries the metadata needed for accessible controls', () => {
  const engine = clientEngine()
  const constructNext = engine.render('pattern', { question: { payload: minimalPayload } })
  assert.equal(constructNext.sequence[0].id, 'e1')
  assert.equal(constructNext.sequence[0].number, 2)
  assert.equal(constructNext.sequence[0].ariaLabel, '')
  assert.equal(constructNext.units, 1)
  assert.equal(constructNext.constructCount, 1)
  const fillMissing = engine.render('pattern', { question: { payload: fillMissingPayload } })
  assert.equal(fillMissing.missingAt, 1, 'the renderer needs the hidden slot position')
})

test('pattern: reduced-motion styling is present in the stylesheet', () => {
  const css = String(readFileSync(new URL('../plugins/pattern/pattern.css', import.meta.url)))
  assert.ok(css.includes('prefers-reduced-motion'))
  assert.ok(css.includes('transition: none'))
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('pattern-sequence'))
})
