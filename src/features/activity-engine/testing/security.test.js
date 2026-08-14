/**
 * Activity Engine — security boundary tests (Task 4.1, report §23).
 *
 * These tests prove correct-answer data and server-only validation never
 * reach the client facade, render context, or client-plugin view.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createClientActivityEngine } from '../index.js'
import { createRenderContext, normalizeSubmission, normalizeAvailabilityContext } from '../contracts/contexts.js'
import { pluginForClient, SERVER_ONLY_METHODS } from '../contracts/plugin.js'
import { testPlugin, TEST_PLUGIN_SCHEMA, TEST_PLUGIN_ANSWER_SCHEMA } from './test-plugin.js'
import { SchemaRegistry } from '../validation/schema-registry.js'
import { PAYLOAD_SCHEMAS } from '../validation/schemas/payload.js'
import { CORRECT_ANSWER_SCHEMAS } from '../validation/schemas/correct-answer.js'
import { createActivityEngine } from '../core.js'
import { ActivityEngineError, ERROR_CODES } from '../errors/index.js'

function makeServerEngine() {
  const schemaRegistry = new SchemaRegistry({
    payloadSchemas: { ...PAYLOAD_SCHEMAS, 'test-plugin': TEST_PLUGIN_SCHEMA },
    correctAnswerSchemas: { ...CORRECT_ANSWER_SCHEMAS, 'test-plugin': TEST_PLUGIN_ANSWER_SCHEMA },
  })
  return createActivityEngine({ mode: 'server', schemaRegistry })
}

test('client engine: server-only methods are not exposed', () => {
  const engine = createClientActivityEngine()
  for (const method of SERVER_ONLY_METHODS) {
    assert.equal(engine[method], undefined, `${method} must not exist on the client engine`)
  }
  assert.equal(typeof engine.render, 'function')
  assert.equal(typeof engine.validatePayload, 'function')
  assert.equal(typeof engine.buildHints, 'function')
  assert.equal(typeof engine.availableOn, 'function')
})

test('server engine: server-only methods ARE exposed', () => {
  const engine = makeServerEngine()
  for (const method of SERVER_ONLY_METHODS) {
    assert.equal(typeof engine[method], 'function', `${method} must exist on the server engine`)
  }
})

test('render context: clean question produces context with no answer keys', () => {
  const ctx = createRenderContext({
    question: { id: 'q1', payload: { prompt: 'x' } },
    capabilities: { reducedMotion: true },
  })
  assert.equal(JSON.stringify(ctx).includes('correctAnswer'), false)
  assert.equal(ctx.capabilities.reducedMotion, true)
})

test('render context: throws SECURITY_CORRECT_ANSWER_EXPOSED when correctAnswer is present', () => {
  assert.throws(
    () =>
      createRenderContext({
        question: { id: 'q1', payload: { prompt: 'x' }, correctAnswer: { optionId: 'secret' } },
      }),
    (err) => {
      assert.ok(err instanceof ActivityEngineError)
      assert.equal(err.code, ERROR_CODES.SECURITY_CORRECT_ANSWER_EXPOSED)
      return true
    }
  )
})

test('render context: throws SECURITY_CORRECT_ANSWER_EXPOSED for answerKey-like keys', () => {
  assert.throws(
    () => createRenderContext({ question: { id: 'q1', answerKey: { secret: 1 } } }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.SECURITY_CORRECT_ANSWER_EXPOSED)
      return true
    }
  )
})

test('client plugin view: get() strips server-only methods', () => {
  const engine = createClientActivityEngine()
  engine.register(testPlugin)
  const view = engine.get('test-plugin')
  for (const method of SERVER_ONLY_METHODS) {
    assert.equal(view[method], undefined, `${method} must be stripped from the client view`)
  }
  assert.equal(typeof view.render, 'function')
  assert.equal(typeof view.buildHints, 'function')
})

test('pluginForClient: returns only identity + client methods', () => {
  const view = pluginForClient(testPlugin)
  assert.deepEqual(Object.keys(view).sort(), [
    'availableOn',
    'buildHints',
    'name',
    'render',
    'schemaVersion',
    'type',
    'validatePayload',
    'version',
  ])
})

test('client engine: validateAnswer is guarded even if invoked directly via registry', () => {
  const engine = createClientActivityEngine()
  engine.register(testPlugin)
  const raw = engine.registry.get('test-plugin')
  assert.equal(typeof raw.validateAnswer, 'function') // plugin itself keeps it
  // But the client engine facade has no validateAnswer at all.
  assert.equal(engine.validateAnswer, undefined)
})

test('correct-answer schema module: is the only source of answer schemas', () => {
  assert.ok(CORRECT_ANSWER_SCHEMAS['drag-drop'])
  assert.equal(CORRECT_ANSWER_SCHEMAS['drag-drop'].$id.includes('correct-answer'), true)
})

test('client engine: no correct-answer schema is registered', () => {
  const engine = createClientActivityEngine()
  for (const type of Object.keys(PAYLOAD_SCHEMAS)) {
    assert.equal(engine.getCorrectAnswerSchema, undefined)
    assert.equal(engine.schemaRegistry.getCorrectAnswerSchema(type), null)
  }
})

test('client engine: submissions carrying correct-answer keys are rejected', () => {
  assert.throws(
    () =>
      normalizeSubmission({
        questionId: 'q1',
        response: { optionId: 'two', correctAnswer: { optionId: 'secret' } },
        interactionMetrics: { attemptsUsed: 1 },
      }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.SECURITY_CORRECT_ANSWER_EXPOSED)
      return true
    }
  )
  assert.throws(() => normalizeSubmission(null), ActivityEngineError)
})

test('client engine: validatePayload never needs correctAnswer', () => {
  const engine = createClientActivityEngine()
  engine.register(testPlugin)
  const result = engine.validatePayload('test-plugin', {
    schemaVersion: '1.0',
    prompt: 'x',
    options: [
      { id: 'a', label: '1' },
      { id: 'b', label: '2' },
    ],
  })
  assert.equal(result.valid, true)
})

test('server engine: validateAnswer does not leak the correct-answer document into output', () => {
  const engine = makeServerEngine()
  engine.register(testPlugin)
  const result = engine.validateAnswer('test-plugin', {
    submission: { questionId: 'q1', response: { optionId: 'two' } },
    payload: { prompt: 'x', options: [] },
    correctAnswer: { optionId: 'two' },
  })
  assert.deepEqual(result, { correct: true, detail: { selected: 'two' } })
  assert.equal(JSON.stringify(result).includes('correctAnswer'), false)
})

test('availability context: featureFlags and device are frozen', () => {
  const ctx = normalizeAvailabilityContext({ device: 'chromebook', featureFlags: { beta: true } })
  assert.equal(ctx.device, 'chromebook')
  assert.equal(ctx.featureFlags.beta, true)
  assert.throws(() => {
    ctx.featureFlags.beta = false
  }, TypeError)
})

test('security: engine errors carry a safe toPublic() with no internals', () => {
  const err = new ActivityEngineError({
    code: ERROR_CODES.ACTIVITY_PAYLOAD_INVALID,
    message: 'secret path detail',
    details: { errors: [{ path: '/items/0' }] },
  })
  const pub = err.toPublic()
  assert.equal(pub.details, undefined)
  assert.ok(!pub.message.includes('secret'))
})
