/**
 * Activity Engine — functional tests (Task 4.1).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { createActivityEngine } from '../core.js'
import { SchemaRegistry } from '../validation/schema-registry.js'
import { PAYLOAD_SCHEMAS } from '../validation/schemas/payload.js'
import { CORRECT_ANSWER_SCHEMAS } from '../validation/schemas/correct-answer.js'
import { testPlugin, TEST_PLUGIN_SCHEMA, TEST_PLUGIN_ANSWER_SCHEMA } from './test-plugin.js'
import { ActivityEngineError, ERROR_CODES } from '../errors/index.js'
import { applySemanticRules, createSemanticRule, SEMANTIC_RULES_CATALOG } from '../validation/semantic/index.js'

import dragDropExample from '../../../../schemas/examples/drag-drop/valid-payload-grade6-7.json' with { type: 'json' }
import dragDropAnswerExample from '../../../../schemas/examples/drag-drop/valid-correct-answer.json' with { type: 'json' }

function makeServerEngine() {
  const schemaRegistry = new SchemaRegistry({
    payloadSchemas: { ...PAYLOAD_SCHEMAS, 'test-plugin': TEST_PLUGIN_SCHEMA },
    correctAnswerSchemas: { ...CORRECT_ANSWER_SCHEMAS, 'test-plugin': TEST_PLUGIN_ANSWER_SCHEMA },
  })
  return createActivityEngine({ mode: 'server', schemaRegistry })
}

const validPayload = {
  schemaVersion: '1.0',
  prompt: 'Pick a number.',
  options: [
    { id: 'one', label: '1' },
    { id: 'two', label: '2' },
  ],
}

const validAnswer = { optionId: 'two' }

// --------------------------------------------------------------------------
// 1. Registration
// --------------------------------------------------------------------------

test('registry: register() then has()/get()/list() reflect the plugin', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  assert.equal(engine.has('test-plugin'), true)
  assert.equal(engine.get('test-plugin').name, 'Test Plugin (internal)')
  assert.deepEqual(engine.list()[0], {
    type: 'test-plugin',
    name: 'Test Plugin (internal)',
    version: '1.0.0',
    schemaVersion: '1.0',
  })
})

test('registry: duplicate registration throws REGISTRATION_DUPLICATE_TYPE', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  assert.throws(() => engine.register(testPlugin), (err) => {
    assert.ok(err instanceof ActivityEngineError)
    assert.equal(err.code, ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
    return true
  })
})

test('registry: plugin missing a required method throws REGISTRATION_MISSING_METHOD', () => {
  const engine = makeServerEngine()
  const broken = { ...testPlugin, render: undefined }
  assert.throws(() => engine.register(broken), (err) => {
    assert.equal(err.code, ERROR_CODES.REGISTRATION_MISSING_METHOD)
    return true
  })
})

test('registry: invalid activity type identifier throws REGISTRATION_INVALID_IDENTIFIER', () => {
  const engine = makeServerEngine()
  const broken = { ...testPlugin, type: 'Test Plugin!' }
  assert.throws(() => engine.register(broken), (err) => {
    assert.equal(err.code, ERROR_CODES.REGISTRATION_INVALID_IDENTIFIER)
    return true
  })
})

test('registry: missing metadata throws REGISTRATION_INVALID_METADATA', () => {
  const engine = makeServerEngine()
  const broken = { ...testPlugin, name: '' }
  assert.throws(() => engine.register(broken), (err) => {
    assert.equal(err.code, ERROR_CODES.REGISTRATION_INVALID_METADATA)
    return true
  })
})

test('engine: validateRegistration() validates without registering', () => {
  const engine = makeServerEngine()
  assert.throws(() => engine.registry.validateRegistration({}), ActivityEngineError)
  assert.equal(engine.has('test-plugin'), false)
})

// --------------------------------------------------------------------------
// 2. Payload validation
// --------------------------------------------------------------------------

test('engine: validatePayload returns valid for a conformant payload', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const result = engine.validatePayload('test-plugin', validPayload)
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test('engine: validatePayload fails schema (missing prompt)', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const result = engine.validatePayload('test-plugin', { schemaVersion: '1.0', options: [] })
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
  assert.ok(result.errors[0].details.errors.length > 0)
})

test('engine: validatePayload fails semantic rules (duplicate option ids)', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const result = engine.validatePayload('test-plugin', {
    schemaVersion: '1.0',
    prompt: 'x',
    options: [
      { id: 'one', label: '1' },
      { id: 'one', label: '2' },
    ],
  })
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
})

test('engine: validatePayload for an unregistered type throws ACTIVITY_NOT_FOUND', () => {
  const engine = makeServerEngine()
  assert.throws(() => engine.validatePayload('nope', validPayload), (err) => {
    assert.equal(err.code, ERROR_CODES.ACTIVITY_NOT_FOUND)
    return true
  })
})

// --------------------------------------------------------------------------
// 3. Answer validation (server only)
// --------------------------------------------------------------------------

test('engine: validateAnswer returns correct=true for the right answer', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const result = engine.validateAnswer('test-plugin', {
    submission: {
      questionId: 'q1',
      response: { optionId: 'two' },
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
    },
    payload: validPayload,
    correctAnswer: validAnswer,
  })
  assert.equal(result.correct, true)
  assert.deepEqual(result.detail, { selected: 'two' })
})

test('engine: validateAnswer returns correct=false for a wrong answer', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const result = engine.validateAnswer('test-plugin', {
    submission: {
      questionId: 'q1',
      response: { optionId: 'one' },
    },
    payload: validPayload,
    correctAnswer: validAnswer,
  })
  assert.equal(result.correct, false)
})

test('engine: validateAnswer rejects a malformed submission with ACTIVITY_ANSWER_INVALID', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  assert.throws(
    () =>
      engine.validateAnswer('test-plugin', {
        submission: { questionId: 'q1' }, // no response
        payload: validPayload,
        correctAnswer: validAnswer,
      }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
})

test('engine: validateAnswer requires a correctAnswer context', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  assert.throws(
    () =>
      engine.validateAnswer('test-plugin', {
        submission: { questionId: 'q1', response: { optionId: 'one' } },
        payload: validPayload,
      }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ENGINE_INTERNAL)
      return true
    }
  )
})

test('engine: validateAnswer guards that the correct-answer document matches its schema', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  assert.throws(
    () =>
      engine.validateAnswer('test-plugin', {
        submission: { questionId: 'q1', response: { optionId: 'one' } },
        payload: validPayload,
        correctAnswer: { optionId: 42 }, // wrong type
      }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ENGINE_INTERNAL)
      return true
    }
  )
})

// --------------------------------------------------------------------------
// 4. Scoring inputs
// --------------------------------------------------------------------------

test('engine: scoringInputs normalizes raw plugin inputs', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const validation = engine.validateAnswer('test-plugin', {
    submission: { questionId: 'q1', response: { optionId: 'two' } },
    payload: validPayload,
    correctAnswer: validAnswer,
  })
  const inputs = engine.scoringInputs(
    'test-plugin',
    {
      submission: {
        questionId: 'q1',
        response: { optionId: 'two' },
        interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      },
      payload: validPayload,
      correctAnswer: validAnswer,
    },
    validation
  )
  assert.equal(inputs.correctnessFraction, 1)
  assert.equal(inputs.scorableUnits, 1)
  assert.equal(inputs.correctUnits, 1)
  assert.equal(inputs.attemptsUsed, 1)
})

test('engine: scoringInputs rejects correctnessFraction > 1', () => {
  const engine = makeServerEngine()
  const bad = {
    ...testPlugin,
    type: 'test-plugin',
    scoringInputs: () => ({ correctnessFraction: 1.5 }),
  }
  engine.register(bad)
  assert.throws(() => engine.scoringInputs('test-plugin', {}, { correct: true }), (err) => {
    assert.equal(err.code, ERROR_CODES.SCORING_INPUTS_INVALID)
    return true
  })
})

test('engine: scoringInputs rejects non-finite correctnessFraction', () => {
  const engine = makeServerEngine()
  const bad = {
    ...testPlugin,
    type: 'test-plugin',
    scoringInputs: () => ({ correctnessFraction: Number.POSITIVE_INFINITY }),
  }
  engine.register(bad)
  assert.throws(() => engine.scoringInputs('test-plugin', {}, { correct: true }), (err) => {
    assert.equal(err.code, ERROR_CODES.SCORING_INPUTS_INVALID)
    return true
  })
})

// --------------------------------------------------------------------------
// 5. Hints
// --------------------------------------------------------------------------

test('engine: buildHints returns normalized, level-ordered hints', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const hints = engine.buildHints('test-plugin', {
    hints: ['Read the question again.', 'Check the second option.'],
  })
  assert.equal(hints.length, 2)
  assert.equal(hints[0].level, 1)
  assert.equal(hints[0].text, 'Read the question again.')
  assert.equal(hints[1].level, 2)
})

test('engine: buildHints filters empty entries and assigns ids', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const hints = engine.buildHints('test-plugin', { hints: ['', 'Only one real hint'] })
  assert.equal(hints.length, 1)
  assert.equal(hints[0].text, 'Only one real hint')
  assert.equal(typeof hints[0].id, 'string')
})

// --------------------------------------------------------------------------
// 6. Feedback
// --------------------------------------------------------------------------

test('engine: feedback returns normalized feedback with a valid state', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const fb = engine.feedback(
    'test-plugin',
    { submission: { questionId: 'q1', response: { optionId: 'two' } } },
    { correct: true },
    'correct'
  )
  assert.equal(fb.state, 'correct')
  assert.equal(fb.title, 'Correct')
  assert.equal(fb.message, 'Great job.')
})

test('engine: feedback rejects an invalid state with ENGINE_INTERNAL', () => {
  const engine = makeServerEngine()
  const bad = {
    ...testPlugin,
    type: 'test-plugin',
    feedback: () => ({ state: 'unknown-state', title: '', message: '' }),
  }
  engine.register(bad)
  assert.throws(() => engine.feedback('test-plugin', {}, { correct: false }, 'bogus'), (err) => {
    assert.equal(err.code, ERROR_CODES.ENGINE_INTERNAL)
    return true
  })
})

// --------------------------------------------------------------------------
// 7. Availability
// --------------------------------------------------------------------------

test('engine: availableOn reflects the plugin decision', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  assert.equal(engine.availableOn('test-plugin', { stream: 'science' }), true)
  assert.equal(engine.availableOn('test-plugin', { stream: 'disabled-test-stream' }), false)
})

test('engine: availableOn with unregistered type throws ACTIVITY_NOT_FOUND', () => {
  const engine = makeServerEngine()
  assert.throws(() => engine.availableOn('nope', {}), (err) => {
    assert.equal(err.code, ERROR_CODES.ACTIVITY_NOT_FOUND)
    return true
  })
})

// --------------------------------------------------------------------------
// 8. Render
// --------------------------------------------------------------------------

test('engine: render delegates to the plugin with a safe context', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const descriptor = engine.render('test-plugin', {
    question: { payload: validPayload },
    capabilities: { reducedMotion: true },
  })
  assert.equal(descriptor.kind, 'test-plugin')
  assert.equal(descriptor.prompt, 'Pick a number.')
})

// --------------------------------------------------------------------------
// 9. Schema registry & versioning
// --------------------------------------------------------------------------

test('schema registry: loads all payload schemas + common schemas', () => {
  const sr = new SchemaRegistry()
  assert.equal(sr.has('drag-drop'), true)
  assert.equal(sr.has('number-logic'), true)
  assert.equal(sr.has('not-real'), false)
  assert.equal(sr.getSchemaVersion('drag-drop'), '1.0')
})

test('engine: getSchemaVersion exposes the schema const version', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  assert.equal(engine.getSchemaVersion('test-plugin'), '1.0')
})

test('engine: a payload schema rejects a real-world malformed payload', () => {
  const engine = makeServerEngine()
  const result = engine.schemaRegistry.validatePayload('drag-drop', {
    schemaVersion: '1.0',
    items: [{ id: 'x' }], // minItems 2 + requires label/image
    zones: [],
  })
  assert.equal(result.valid, false)
})

test('engine: a real payload example validates against the drag-drop schema', () => {
  const engine = makeServerEngine()
  const result = engine.schemaRegistry.validatePayload('drag-drop', dragDropExample)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('engine: real drag-drop correct-answer example validates against its schema', () => {
  const engine = makeServerEngine()
  const result = engine.schemaRegistry.validateCorrectAnswer('drag-drop', dragDropAnswerExample)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

// --------------------------------------------------------------------------
// 10. Semantic rules infrastructure + catalog
// --------------------------------------------------------------------------

test('semantic: applySemanticRules returns valid for true and invalid for failures', () => {
  const rules = [
    createSemanticRule('must-be-even', (payload) => (payload.n % 2 === 0 ? true : { message: 'not even', path: '/n' })),
  ]
  assert.equal(applySemanticRules(rules, { n: 2 }).valid, true)
  const bad = applySemanticRules(rules, { n: 3 })
  assert.equal(bad.valid, false)
  assert.equal(bad.errors[0].code, 'ACTIVITY_PAYLOAD_SEMANTIC_INVALID')
  assert.equal(bad.errors[0].ruleId, 'must-be-even')
})

test('semantic: the catalog documents all validate.py rules with stable ids', () => {
  const ids = Object.keys(SEMANTIC_RULES_CATALOG)
  assert.ok(ids.length >= 12)
  for (const id of ids) {
    const rule = SEMANTIC_RULES_CATALOG[id]
    assert.ok(rule.activityType)
    assert.ok(rule.source)
  }
})

// --------------------------------------------------------------------------
// 11. Error model
// --------------------------------------------------------------------------

test('errors: ActivityEngineError carries code, category, activityType, toPublic()', () => {
  const err = new ActivityEngineError({
    code: ERROR_CODES.ACTIVITY_NOT_FOUND,
    message: 'boom',
    activityType: 'drag-drop',
  })
  assert.equal(err.category, 'AVAILABILITY')
  assert.equal(err.activityType, 'drag-drop')
  const pub = err.toPublic()
  assert.equal(pub.code, 'ACTIVITY_NOT_FOUND')
  assert.equal(pub.category, 'AVAILABILITY')
  assert.ok(pub.message.length > 0)
  assert.equal(pub.details, undefined)
})

test('errors: server-only error category is DEVELOPER/INTERNAL, never leaks internals', () => {
  const err = new ActivityEngineError({
    code: ERROR_CODES.SCORING_INPUTS_INVALID,
    message: 'secret internal detail',
  })
  assert.equal(err.category, 'INTERNAL')
  assert.ok(!err.toPublic().message.includes('secret'))
})

// --------------------------------------------------------------------------
// 12. Client vs server facade
// --------------------------------------------------------------------------

test('client engine: has payload validation, rendering, hints, availability', () => {
  const engine = createClientActivityEngine()
  engine.register(testPlugin)
  assert.equal(engine.validatePayload('test-plugin', validPayload).valid, true)
  const descriptor = engine.render('test-plugin', { question: { payload: validPayload } })
  assert.equal(descriptor.kind, 'test-plugin')
})

test('server engine: exposes correct-answer schema registry', () => {
  const engine = makeServerEngine()
  assert.ok(engine.getCorrectAnswerSchema('drag-drop'))
  assert.equal(engine.getCorrectAnswerSchema('drag-drop').$id.includes('correct-answer'), true)
})

test('server facade: createServerActivityEngine() validates the drag-drop answer example', () => {
  const engine = createServerActivityEngine()
  const result = engine.schemaRegistry.validateCorrectAnswer('drag-drop', dragDropAnswerExample)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})
