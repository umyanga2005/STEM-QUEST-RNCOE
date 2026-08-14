/**
 * Test plugin for the Activity Engine (Task 4.1).
 *
 * A fully-conformant dummy activity type (`test-plugin`) used by the engine
 * tests. It is NOT a production activity: it exists so the engine's routing,
 * guarding, and capability gating can be exercised end-to-end without
 * depending on real activity logic (which arrives with the first real plugin).
 */

import { applySemanticRules, createSemanticRule } from '../validation/semantic/index.js'

export const TEST_PLUGIN_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stem-quest.dev/schemas/activities/test-plugin/payload.schema.json',
  type: 'object',
  required: ['schemaVersion', 'prompt', 'options'],
  properties: {
    schemaVersion: { const: '1.0' },
    prompt: { type: 'string', minLength: 1 },
    options: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,31}$' },
          label: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
}

export const TEST_PLUGIN_ANSWER_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://stem-quest.dev/schemas/activities/test-plugin/correct-answer.schema.json',
  type: 'object',
  required: ['optionId'],
  properties: {
    optionId: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,31}$' },
  },
  additionalProperties: false,
}

const semanticRules = [
  createSemanticRule('test-plugin.options-nonempty', (payload) =>
    payload.options.length >= 2 ? true : 'options must contain at least 2 entries'
  ),
  createSemanticRule('test-plugin.options-unique-ids', (payload) => {
    const ids = payload.options.map((o) => o.id)
    return new Set(ids).size === ids.length ? true : { message: 'option ids must be unique', path: '/options' }
  }),
]

export const testPlugin = {
  type: 'test-plugin',
  name: 'Test Plugin (internal)',
  version: '1.0.0',
  schemaVersion: '1.0',

  /** @returns {{ kind: string, prompt: string }} render descriptor */
  render(ctx) {
    return { kind: 'test-plugin', prompt: ctx.question.payload.prompt }
  },

  validatePayload(payload) {
    return applySemanticRules(semanticRules, payload)
  },

  validateAnswer({ submission, correctAnswer }) {
    const correct = submission.response.optionId === correctAnswer.optionId
    return { correct, detail: { selected: submission.response.optionId } }
  },

  scoringInputs(ctx, validation) {
    return {
      correctnessFraction: validation.correct ? 1 : 0,
      scorableUnits: 1,
      correctUnits: validation.correct ? 1 : 0,
      attemptsUsed: ctx.submission.interactionMetrics.attemptsUsed,
      hintsUsed: ctx.submission.interactionMetrics.hintsUsed,
      interactionMetrics: ctx.submission.interactionMetrics,
    }
  },

  buildHints(question) {
    const hints = question?.hints ?? []
    return hints.map((text, i) => ({ id: `h${i + 1}`, level: i + 1, text }))
  },

  feedback(ctx, validation, state) {
    return {
      state: state ?? (validation.correct ? 'correct' : 'incorrect'),
      title: validation.correct ? 'Correct' : 'Not quite',
      message: validation.correct ? 'Great job.' : 'Try again.',
      explanation: validation.correct ? 'Your selection matched.' : 'Your selection did not match.',
    }
  },

  availableOn(ctx) {
    // Available everywhere except an explicit disabled stream (test hook).
    return ctx.stream !== 'disabled-test-stream'
  },
}
