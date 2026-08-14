/**
 * Activity Engine — scenario-challenge plugin tests (Task 4.12).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import {
  scenarioChallengePlugin,
  registerScenarioChallenge,
  validateScenarioAnswer,
} from '../plugins/scenario-challenge/plugin.js'
import {
  findDecision,
  findOption,
  createScenarioState,
  currentDecision,
  currentOptions,
  isComplete,
  pathTaken,
  stepCount,
  selectOption,
  lastOutcome,
  reset,
  buildResponse,
} from '../plugins/scenario-challenge/scenario-challenge-controller.js'

import minimalPayload from '../../../../schemas/examples/scenario/minimal-valid-payload.json' with { type: 'json' }
import grade67Payload from '../../../../schemas/examples/scenario/valid-payload-grade6-7.json' with { type: 'json' }
import grade911Payload from '../../../../schemas/examples/scenario/valid-payload-grade9-11.json' with { type: 'json' }
import validCorrectAnswer from '../../../../schemas/examples/scenario/valid-correct-answer.json' with { type: 'json' }
import invalidCorrectAnswer from '../../../../schemas/examples/scenario/invalid-correct-answer.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/scenario/invalid-payload.json' with { type: 'json' }

// minimalPayload: lab light, entry d1 → d1{o1→d2, o2→null} → d2{o3→null, o4→null}.
//   Optimal (troubleshoot, fix the blown fuse): d1/o1 then d2/o3.
// grade67Payload: burst pipe, entry d1 → d1{o1→d2, o2→null, o3→d2} → d2{o4→null, o5→null}.
//   Optimal: d1/o1 then d2/o4; acceptable alternative at d1: o3.
// grade911Payload: solar array, entry d1 → d1{o1→d2, o2→null, o3→d2} → d2{o4→d3, o5→null} → d3{o6→null, o7→null}.
//   validCorrectAnswer: d1/o1, d2/o4, d3/o6.

const minimalAnswer = {
  optimalPath: [
    { decisionId: 'd1', optionId: 'o1' },
    { decisionId: 'd2', optionId: 'o3' },
  ],
}
const grade67Answer = {
  optimalPath: [
    { decisionId: 'd1', optionId: 'o1' },
    { decisionId: 'd2', optionId: 'o4' },
  ],
  acceptableOptions: { d1: ['o3'] },
}

// A schema-valid tree with a cross-route cycle, used to prove the duplicate
// decision guard (defense in depth beyond the self-loop rule).
const cyclePayload = {
  schemaVersion: '1.0',
  scenarioText: 'A path that doubles back must be rejected.',
  entryDecision: 'd1',
  decisions: [
    {
      id: 'd1',
      text: 'Where to start?',
      options: [
        { id: 'o1', text: 'Go forward', nextDecision: 'd2', outcomeText: 'Moved on.' },
        { id: 'o2', text: 'Stop here', nextDecision: null, outcomeText: 'Ended.' },
      ],
    },
    {
      id: 'd2',
      text: 'Doubling back?',
      options: [
        { id: 'o1', text: 'Go back to d1', nextDecision: 'd1', outcomeText: 'Doubled back.' },
        { id: 'o2', text: 'Stop here', nextDecision: null, outcomeText: 'Ended.' },
      ],
    },
  ],
}
const cycleAnswer = { optimalPath: [{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o2' }] }

const controllerTree = [
  { id: 'd1', text: 'What do you check first?', options: [
    { id: 'o1', text: 'Check the switch', nextDecision: 'd2', outcomeText: 'The switch is fine.' },
    { id: 'o2', text: 'Replace the bulb', nextDecision: null, outcomeText: 'Wrong move.' },
  ] },
  { id: 'd2', text: 'The switch works. What next?', options: [
    { id: 'o3', text: 'Check the fuse box', nextDecision: null, outcomeText: 'The fuse is blown.' },
    { id: 'o4', text: 'Check the lamp cord', nextDecision: null, outcomeText: 'The cord is damaged.' },
  ] },
]

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(scenarioChallengePlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(scenarioChallengePlugin)
  return engine
}

function runAnswer(engine, response, { payload = minimalPayload, correctAnswer = minimalAnswer } = {}) {
  return engine.validateAnswer('scenario-challenge', {
    submission: { questionId: 'q-scn-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

function scoringCtx(response) {
  return { submission: { response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
}

const optimalPath = (steps) => ({ path: steps })

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('scenario: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('scenario-challenge'), true)
  const listed = engine.list().find((p) => p.type === 'scenario-challenge')
  assert.equal(listed.name, 'Scenario Challenge')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof scenarioChallengePlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('scenario: registerScenarioChallenge helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerScenarioChallenge(engine)
  assert.equal(engine.has('scenario-challenge'), true)
})

test('scenario: coexists with other plugins; duplicate registration rejected', () => {
  const engine = createServerActivityEngine()
  registerScenarioChallenge(engine)
  assert.throws(() => registerScenarioChallenge(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

test('scenario: engine resolves the correct schema version', () => {
  const engine = serverEngine()
  assert.equal(engine.getSchemaVersion('scenario-challenge'), '1.0')
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('scenario: render carries the full public tree and no answer data', () => {
  const engine = clientEngine()
  const descriptor = engine.render('scenario-challenge', {
    question: {
      prompt: 'Troubleshoot the lab light.',
      instructions: 'Make each decision carefully.',
      payload: minimalPayload,
    },
  })
  assert.equal(descriptor.kind, 'scenario-challenge')
  assert.equal(descriptor.prompt, 'Troubleshoot the lab light.')
  assert.equal(descriptor.scenarioText, "Your lab light won't turn on. You must troubleshoot.")
  assert.equal(descriptor.entryDecision, 'd1')
  assert.equal(descriptor.decisions.length, 2)
  const d1 = descriptor.decisions.find((d) => d.id === 'd1')
  assert.equal(d1.options.length, 2)
  assert.equal(d1.options[0].nextDecision, 'd2', 'public navigation data is present')
  assert.equal(d1.options[0].outcomeText, 'The switch is fine.')
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('optimalPath'))
  assert.ok(!raw.includes('acceptableOptions'))
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('"correct"'))
  for (const key of ['optimalPath', 'acceptableOptions', 'correctAnswer', 'expected', 'answerKey']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('scenario: render exposes terminal outcomes and media safely', () => {
  const engine = clientEngine()
  const payload = {
    ...minimalPayload,
    media: [{ ref: 'question-media/demo/scenario/lab.png', alt: 'A dim laboratory bench light', role: 'illustration' }],
  }
  const descriptor = engine.render('scenario-challenge', { question: { payload } })
  assert.equal(descriptor.media.length, 1)
  assert.equal(descriptor.media[0].ref, 'question-media/demo/scenario/lab.png')
  assert.equal(descriptor.media[0].alt, 'A dim laboratory bench light')
  const terminal = descriptor.decisions.find((d) => d.id === 'd2').options.find((o) => o.id === 'o3')
  assert.equal(terminal.nextDecision, null)
  assert.ok(!JSON.stringify(descriptor).includes('optimalPath'))
})

test('scenario: render falls back safely on absent media', () => {
  const engine = clientEngine()
  const descriptor = engine.render('scenario-challenge', { question: { payload: minimalPayload } })
  assert.equal(descriptor.media, null)
})

// --------------------------------------------------------------------------
// 3. Payload validation (schema + semantic)
// --------------------------------------------------------------------------

test('scenario: valid payloads pass', () => {
  const engine = serverEngine()
  for (const payload of [minimalPayload, grade67Payload, grade911Payload, cyclePayload]) {
    const result = engine.validatePayload('scenario-challenge', payload)
    assert.equal(result.valid, true, JSON.stringify(result.errors))
  }
})

test('scenario: schema-invalid payloads are rejected', () => {
  const engine = serverEngine()
  const result = engine.validatePayload('scenario-challenge', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

test('scenario: duplicate decision ids are a semantic error (uniqueItems is shallow)', () => {
  const engine = serverEngine()
  const dup = {
    ...minimalPayload,
    decisions: [
      { id: 'd1', text: 'Check first?', options: [{ id: 'o1', text: 'A', nextDecision: 'd2', outcomeText: 'x' }, { id: 'o2', text: 'B', nextDecision: null, outcomeText: 'y' }] },
      { id: 'd1', text: 'Duplicate node', options: [{ id: 'o3', text: 'C', nextDecision: null, outcomeText: 'z' }, { id: 'o4', text: 'D', nextDecision: null, outcomeText: 'w' }] },
    ],
  }
  const result = engine.validatePayload('scenario-challenge', dup)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'scenario.decision-ids-unique'))
})

test('scenario: duplicate option ids within a decision are a semantic error', () => {
  const engine = serverEngine()
  const dup = {
    ...minimalPayload,
    decisions: [
      { id: 'd1', text: 'Pick', options: [
        { id: 'o1', text: 'Check switch', nextDecision: 'd2', outcomeText: 'x' },
        { id: 'o1', text: 'Duplicate', nextDecision: null, outcomeText: 'y' },
      ] },
      { id: 'd2', text: 'Next', options: [{ id: 'o3', text: 'Fuse', nextDecision: null, outcomeText: 'z' }, { id: 'o4', text: 'Cord', nextDecision: null, outcomeText: 'w' }] },
    ],
  }
  const result = engine.validatePayload('scenario-challenge', dup)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'scenario.option-ids-unique'))
})

test('scenario: a missing entry decision is a semantic error', () => {
  const engine = serverEngine()
  const missing = { ...minimalPayload, entryDecision: 'd9' }
  const result = engine.validatePayload('scenario-challenge', missing)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'scenario.entry-decision-exists'))
})

test('scenario: a dangling nextDecision is a semantic error', () => {
  const engine = serverEngine()
  const dangling = {
    ...minimalPayload,
    decisions: [
      { id: 'd1', text: 'Pick', options: [{ id: 'o1', text: 'Check switch', nextDecision: 'd9', outcomeText: 'x' }, { id: 'o2', text: 'Replace', nextDecision: null, outcomeText: 'y' }] },
      { id: 'd2', text: 'Next', options: [{ id: 'o3', text: 'Fuse', nextDecision: null, outcomeText: 'z' }, { id: 'o4', text: 'Cord', nextDecision: null, outcomeText: 'w' }] },
    ],
  }
  const result = engine.validatePayload('scenario-challenge', dangling)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'scenario.next-decision-exists'))
})

test('scenario: a self-loop option is a semantic error', () => {
  const engine = serverEngine()
  const loop = {
    ...minimalPayload,
    decisions: [
      { id: 'd1', text: 'Pick', options: [{ id: 'o1', text: 'Loop', nextDecision: 'd1', outcomeText: 'x' }, { id: 'o2', text: 'Replace', nextDecision: null, outcomeText: 'y' }] },
      { id: 'd2', text: 'Next', options: [{ id: 'o3', text: 'Fuse', nextDecision: null, outcomeText: 'z' }, { id: 'o4', text: 'Cord', nextDecision: null, outcomeText: 'w' }] },
    ],
  }
  const result = engine.validatePayload('scenario-challenge', loop)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'scenario.option-no-self-loop'))
})

// --------------------------------------------------------------------------
// 4. Cross-document integrity (validateScenarioAnswer)
// --------------------------------------------------------------------------

test('scenario: consistent payload/answer pairs have no integrity errors', () => {
  assert.deepEqual(validateScenarioAnswer(minimalPayload, minimalAnswer), [])
  assert.deepEqual(validateScenarioAnswer(grade67Payload, grade67Answer), [])
  assert.deepEqual(validateScenarioAnswer(grade911Payload, validCorrectAnswer), [])
  assert.deepEqual(validateScenarioAnswer(cyclePayload, cycleAnswer), [])
})

test('scenario: a correct answer without optimalPath is an authoring error', () => {
  const errors = validateScenarioAnswer(minimalPayload, { acceptableOptions: { d1: ['o1'] } })
  assert.ok(errors.some((e) => e.ruleId === 'scenario.optimal-path-missing'))
  const typo = validateScenarioAnswer(minimalPayload, invalidCorrectAnswer)
  assert.ok(typo.some((e) => e.ruleId === 'scenario.optimal-path-missing'))
})

test('scenario: the optimal path must start at the entry decision', () => {
  const errors = validateScenarioAnswer(minimalPayload, { optimalPath: [{ decisionId: 'd2', optionId: 'o3' }] })
  assert.ok(errors.some((e) => e.ruleId === 'scenario.optimal-path-traversable' && e.message.includes('entryDecision')))
})

test('scenario: the optimal path must reference known decisions and options', () => {
  const badDecision = validateScenarioAnswer(minimalPayload, { optimalPath: [{ decisionId: 'd9', optionId: 'o1' }] })
  assert.ok(badDecision.some((e) => e.ruleId === 'scenario.optimal-path-traversable' && e.message.includes('d9')))
  const badOption = validateScenarioAnswer(minimalPayload, {
    optimalPath: [{ decisionId: 'd1', optionId: 'o9' }],
  })
  assert.ok(badOption.some((e) => e.ruleId === 'scenario.optimal-path-traversable' && e.message.includes('o9')))
})

test('scenario: the optimal path must be a traversable route ending terminal', () => {
  const jump = validateScenarioAnswer(grade911Payload, {
    optimalPath: [
      { decisionId: 'd1', optionId: 'o1' },
      { decisionId: 'd3', optionId: 'o6' },
    ],
  })
  assert.ok(jump.some((e) => e.ruleId === 'scenario.optimal-path-traversable' && e.message.includes('jumps')))
  const open = validateScenarioAnswer(grade911Payload, {
    optimalPath: [
      { decisionId: 'd1', optionId: 'o1' },
      { decisionId: 'd2', optionId: 'o4' },
    ],
  })
  assert.ok(open.some((e) => e.ruleId === 'scenario.optimal-path-traversable' && e.message.includes('terminal')))
})

test('scenario: the optimal path may not visit a decision twice', () => {
  const errors = validateScenarioAnswer(cyclePayload, {
    optimalPath: [
      { decisionId: 'd1', optionId: 'o1' },
      { decisionId: 'd2', optionId: 'o1' },
      { decisionId: 'd1', optionId: 'o2' },
    ],
  })
  assert.ok(errors.some((e) => e.ruleId === 'scenario.optimal-path-traversable' && e.message.includes('more than once')))
})

test('scenario: acceptable options must exist at their decision', () => {
  const badDecision = validateScenarioAnswer(grade67Payload, { ...grade67Answer, acceptableOptions: { d9: ['o1'] } })
  assert.ok(badDecision.some((e) => e.ruleId === 'scenario.acceptable-options-exist' && e.message.includes('d9')))
  const badOption = validateScenarioAnswer(grade67Payload, { ...grade67Answer, acceptableOptions: { d1: ['o9'] } })
  assert.ok(badOption.some((e) => e.ruleId === 'scenario.acceptable-options-exist' && e.message.includes('o9')))
})

test('scenario: an inconsistent authoring pair throws before student scoring', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o3' }]), { payload: minimalPayload, correctAnswer: invalidCorrectAnswer }),
    (err) => err.code === ERROR_CODES.ENGINE_INTERNAL,
    'a schema-invalid correct answer is rejected by the engine'
  )
  assert.throws(
    () =>
      runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o3' }]), {
        payload: minimalPayload,
        correctAnswer: { optimalPath: [{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o9' }] },
      }),
    (err) => err.code === ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID,
    'a schema-valid but untraversable optimalPath is an authoring error'
  )
})

// --------------------------------------------------------------------------
// 5. Controller: initial navigation state
// --------------------------------------------------------------------------

const initial = createScenarioState({ decisions: controllerTree, entryDecision: 'd1' })

test('scenario controller: initial state faces the entry decision', () => {
  assert.equal(currentDecision(initial).id, 'd1')
  assert.equal(currentOptions(initial).length, 2)
  assert.equal(isComplete(initial), false)
  assert.deepEqual(pathTaken(initial), [])
  assert.equal(stepCount(initial), 0)
  assert.equal(lastOutcome(initial), null)
})

test('scenario controller: findDecision and findOption', () => {
  assert.equal(findDecision(controllerTree, 'd1').id, 'd1')
  assert.equal(findDecision(controllerTree, 'd9'), undefined)
  assert.equal(findOption(controllerTree[0], 'o1').id, 'o1')
  assert.equal(findOption(controllerTree[0], 'o3'), undefined)
})

// --------------------------------------------------------------------------
// 6. Controller: navigation, completion, serialization
// --------------------------------------------------------------------------

test('scenario controller: a branch choice advances along the tree', () => {
  const next = selectOption(initial, 'o1')
  assert.deepEqual(pathTaken(next), [{ decisionId: 'd1', optionId: 'o1' }])
  assert.equal(currentDecision(next).id, 'd2')
  assert.equal(isComplete(next), false)
  const outcome = lastOutcome(next)
  assert.equal(outcome.optionText, 'Check the switch')
  assert.equal(outcome.outcomeText, 'The switch is fine.')
  assert.equal(outcome.ended, false)
})

test('scenario controller: a terminal choice completes the scenario', () => {
  const completed = selectOption(selectOption(initial, 'o1'), 'o3')
  assert.equal(isComplete(completed), true)
  assert.equal(currentDecision(completed), null)
  assert.equal(currentOptions(completed).length, 0)
  assert.equal(stepCount(completed), 2)
  assert.equal(lastOutcome(completed).ended, true)
})

test('scenario controller: an immediate wrong terminal branch completes in one step', () => {
  const done = selectOption(initial, 'o2')
  assert.equal(isComplete(done), true)
  assert.deepEqual(pathTaken(done), [{ decisionId: 'd1', optionId: 'o2' }])
})

test('scenario controller: unknown ids and foreign options are no-ops', () => {
  assert.equal(selectOption(initial, 'zzz'), initial)
  assert.equal(selectOption(initial, 'o3'), initial, 'an option of another decision is ignored')
  const done = selectOption(selectOption(initial, 'o1'), 'o3')
  assert.equal(selectOption(done, 'o1'), done, 'completed states are inert')
})

test('scenario controller: reset returns to the entry decision with an empty path', () => {
  const progressed = selectOption(initial, 'o1')
  const fresh = reset(progressed)
  assert.equal(currentDecision(fresh).id, 'd1')
  assert.deepEqual(pathTaken(fresh), [])
  assert.equal(isComplete(fresh), false)
})

test('scenario controller: buildResponse serializes the path in navigation order', () => {
  const done = selectOption(selectOption(initial, 'o1'), 'o3')
  assert.deepEqual(buildResponse(done), {
    path: [
      { decisionId: 'd1', optionId: 'o1' },
      { decisionId: 'd2', optionId: 'o3' },
    ],
  })
})

// --------------------------------------------------------------------------
// 7. Answer validation — correctness
// --------------------------------------------------------------------------

test('scenario answer: the full optimal path is correct', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o3' }]))
  assert.equal(v.correct, true)
  assert.equal(v.detail.total, 2)
  assert.equal(v.detail.correctCount, 2)
  assert.equal(v.detail.submitted.length, 2)
})

test('scenario answer: a valid but sub-optimal route earns partial credit', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o4' }]))
  assert.equal(v.correct, false)
  assert.equal(v.detail.total, 2)
  assert.equal(v.detail.correctCount, 1, 'o1 is optimal; o4 is not')
})

test('scenario answer: an early bad decision scores zero', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o2' }]))
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctCount, 0)
})

test('scenario answer: authored acceptable alternatives are full credit', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o3' }, { decisionId: 'd2', optionId: 'o4' }]), {
    payload: grade67Payload,
    correctAnswer: grade67Answer,
  })
  assert.equal(v.correct, true)
  assert.equal(v.detail.correctCount, 2, 'o3 is an authored acceptable alternative at d1')
})

test('scenario answer: acceptable + wrong mixes to partial credit', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o3' }, { decisionId: 'd2', optionId: 'o5' }]), {
    payload: grade67Payload,
    correctAnswer: grade67Answer,
  })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctCount, 1)
})

test('scenario answer: a three-decision optimal path is fully correct', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, optimalPath([
    { decisionId: 'd1', optionId: 'o1' },
    { decisionId: 'd2', optionId: 'o4' },
    { decisionId: 'd3', optionId: 'o6' },
  ]), { payload: grade911Payload, correctAnswer: validCorrectAnswer })
  assert.equal(v.correct, true)
  assert.equal(v.detail.total, 3)
  assert.equal(v.detail.correctCount, 3)
})

test('scenario answer: one wrong step in a three-step route is 2/3', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, optimalPath([
    { decisionId: 'd1', optionId: 'o1' },
    { decisionId: 'd2', optionId: 'o4' },
    { decisionId: 'd3', optionId: 'o7' },
  ]), { payload: grade911Payload, correctAnswer: validCorrectAnswer })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctCount, 2)
})

// --------------------------------------------------------------------------
// 8. Answer validation — shape gate, references, continuity, forgery
// --------------------------------------------------------------------------

test('scenario answer: the response shape is strictly one path array', () => {
  const engine = serverEngine()
  const good = [{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o3' }]
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: good, extra: 1 }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: 'nope' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: [] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('scenario answer: malformed path steps are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { path: [null] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: [['d1', 'o1']] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: [{ decisionId: 'd1' }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: [{ decisionId: 'd1', optionId: 'o1', extra: 1 }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: [{ decisionId: 1, optionId: 'o1' }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { path: [{ decisionId: 'd1', optionId: '' }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
})

test('scenario answer: the path must start at the entry decision', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, optimalPath([{ decisionId: 'd2', optionId: 'o3' }])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('scenario answer: unknown decisions and foreign options are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd9', optionId: 'o3' }])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
  assert.throws(
    () => runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o1' }])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID,
    'o1 does not belong to d2'
  )
})

test('scenario answer: impossible jumps are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () =>
      runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd3', optionId: 'o6' }]), {
        payload: grade911Payload,
        correctAnswer: validCorrectAnswer,
      }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('scenario answer: incomplete and non-terminal paths are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }])),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID,
    'o1 continues to d2'
  )
  assert.throws(
    () =>
      runAnswer(engine, optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o4' }]), {
        payload: grade911Payload,
        correctAnswer: validCorrectAnswer,
      }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID,
    'o4 continues to d3'
  )
})

test('scenario answer: a path that doubles back is rejected (no infinite loops)', () => {
  const engine = serverEngine()
  assert.throws(
    () =>
      runAnswer(engine, optimalPath([
        { decisionId: 'd1', optionId: 'o1' },
        { decisionId: 'd2', optionId: 'o1' },
        { decisionId: 'd1', optionId: 'o2' },
      ]), { payload: cyclePayload, correctAnswer: cycleAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('scenario answer: forged correctness fields are rejected, never believed', () => {
  const engine = serverEngine()
  assert.throws(
    () =>
      runAnswer(engine, {
        path: [{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o3', correct: true }],
        correctnessFraction: 1,
        score: 999,
      }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

// --------------------------------------------------------------------------
// 9. Scoring
// --------------------------------------------------------------------------

test('scenario scoring: full credit is 1.0 with correct scorableUnits', () => {
  const engine = serverEngine()
  const response = optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o3' }])
  const v = runAnswer(engine, response)
  const scoring = engine.scoringInputs('scenario-challenge', scoringCtx(response), v)
  assert.equal(scoring.correctnessFraction, 1)
  assert.equal(scoring.scorableUnits, 2)
  assert.equal(scoring.correctUnits, 2)
})

test('scenario scoring: partial credit is a correct fraction', () => {
  const engine = serverEngine()
  const response = optimalPath([
    { decisionId: 'd1', optionId: 'o1' },
    { decisionId: 'd2', optionId: 'o4' },
    { decisionId: 'd3', optionId: 'o7' },
  ])
  const v = runAnswer(engine, response, { payload: grade911Payload, correctAnswer: validCorrectAnswer })
  const scoring = engine.scoringInputs('scenario-challenge', scoringCtx(response), v)
  assert.equal(scoring.correctnessFraction, 2 / 3)
  assert.equal(scoring.scorableUnits, 3)
  assert.equal(scoring.correctUnits, 2)
})

test('scenario scoring: zero credit is 0.0', () => {
  const engine = serverEngine()
  const response = optimalPath([{ decisionId: 'd1', optionId: 'o2' }])
  const v = runAnswer(engine, response)
  const scoring = engine.scoringInputs('scenario-challenge', scoringCtx(response), v)
  assert.equal(scoring.correctnessFraction, 0)
  assert.equal(scoring.scorableUnits, 1)
  assert.equal(scoring.correctUnits, 0)
})

test('scenario scoring: evidence never carries the optimal option for wrong steps', () => {
  const engine = serverEngine()
  const response = optimalPath([{ decisionId: 'd1', optionId: 'o1' }, { decisionId: 'd2', optionId: 'o4' }])
  const v = runAnswer(engine, response)
  const scoring = engine.scoringInputs('scenario-challenge', scoringCtx(response), v)
  assert.deepEqual(scoring.evidence, [
    { decisionId: 'd1', optionId: 'o1', correct: true },
    { decisionId: 'd2', optionId: 'o4', correct: false },
  ])
  const raw = JSON.stringify(scoring)
  assert.ok(!raw.includes('optimalPath'))
  assert.ok(!raw.includes('acceptableOptions'))
  assert.ok(!raw.includes('o3'), 'the optimal option of the wrong step must not leak')
})

// --------------------------------------------------------------------------
// 10. Hints
// --------------------------------------------------------------------------

test('scenario: hints are authored and never reveal the answer', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('scenario-challenge', {
    hints: [{ level: 1, text: 'Diagnose before you replace parts.' }],
  })
  assert.equal(hints.length, 1)
  assert.equal(hints[0].text, 'Diagnose before you replace parts.')
  assert.ok(!JSON.stringify(hints).includes('o1'))
})

test('scenario: no hints when none are authored', () => {
  const engine = clientEngine()
  assert.deepEqual(engine.buildHints('scenario-challenge', { hints: null }), [])
})

// --------------------------------------------------------------------------
// 11. Feedback
// --------------------------------------------------------------------------

test('scenario feedback: correct / partial / incorrect / timeout', () => {
  const engine = serverEngine()
  const ok = { submission: { state: 'submitted' }, interactionMetrics: { attemptsUsed: 1 } }
  const full = { detail: { total: 2, correctCount: 2 } }
  const partial = { detail: { total: 3, correctCount: 1 } }
  const zero = { detail: { total: 2, correctCount: 0 } }
  assert.equal(engine.feedback('scenario-challenge', ok, full).state, 'correct')
  assert.ok(engine.feedback('scenario-challenge', ok, partial).message.includes('1 of your 3'))
  assert.equal(engine.feedback('scenario-challenge', ok, zero).state, 'incorrect')
  const timeout = engine.feedback('scenario-challenge', { submission: { state: 'timeout' } }, zero)
  assert.equal(timeout.state, 'timeout')
})

test('scenario feedback: never leaks the optimal path or acceptable options', () => {
  const engine = serverEngine()
  const raw = JSON.stringify(engine.feedback('scenario-challenge', { submission: { state: 'submitted' } }, { detail: { total: 2, correctCount: 1 } }))
  assert.ok(!raw.includes('optimalPath'))
  assert.ok(!raw.includes('acceptableOptions'))
  assert.ok(!raw.includes('o3'))
})

// --------------------------------------------------------------------------
// 12. Availability
// --------------------------------------------------------------------------

test('scenario: available by default and when the flag opts in', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('scenario-challenge', {}), true)
  assert.equal(engine.availableOn('scenario-challenge', { featureFlags: { 'scenario-challenge': true } }), true)
})

test('scenario: availability flag can opt out', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('scenario-challenge', { featureFlags: { 'scenario-challenge': false } }), false)
})

// --------------------------------------------------------------------------
// 13. Client facade boundary
// --------------------------------------------------------------------------

test('scenario: the client facade exposes no server-only methods', () => {
  const engine = clientEngine()
  const listed = engine.list().find((p) => p.type === 'scenario-challenge')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.ok(!(method in listed), `client facade must not expose "${method}"`)
  }
  assert.equal(engine.scoringInputs, undefined)
})

test('scenario: the client engine has no server-only methods', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(engine[method], undefined)
  }
})

// --------------------------------------------------------------------------
// 14. Accessibility contract surface
// --------------------------------------------------------------------------

test('scenario: the descriptor carries what accessible controls need', () => {
  const engine = clientEngine()
  const descriptor = engine.render('scenario-challenge', { question: { payload: minimalPayload } })
  assert.equal(typeof descriptor.scenarioText, 'string')
  for (const decision of descriptor.decisions) {
    assert.equal(typeof decision.id, 'string')
    assert.equal(typeof decision.text, 'string')
    for (const option of decision.options) {
      assert.equal(typeof option.id, 'string')
      assert.equal(typeof option.text, 'string')
      assert.equal(typeof option.outcomeText, 'string')
    }
  }
})

test('scenario: reduced-motion styling and real controls are present in the stylesheet', () => {
  const css = String(readFileSync(new URL('../plugins/scenario-challenge/scenario-challenge.css', import.meta.url)))
  assert.ok(css.includes('prefers-reduced-motion'))
  assert.ok(css.includes('transition: none'))
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('scenario-decision'))
  assert.ok(css.includes('min-height: 44px'))
})