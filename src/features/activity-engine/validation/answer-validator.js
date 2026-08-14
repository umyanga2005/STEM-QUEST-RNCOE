/**
 * Activity Engine — answer validator (Task 4.1, report §7).
 *
 * Routes `validateAnswer(type, ctx)` to the plugin. The engine normalizes the
 * submission, verifies the correct-answer document against its (server-only)
 * schema, then delegates correctness evaluation to the plugin. The result is
 * `{ correct, detail }`; the raw correct-answer document is never returned.
 */

import { normalizeSubmission } from '../contracts/contexts.js'
import { engineError } from '../errors/index.js'

/**
 * Validates a student answer for `type`.
 *
 * @param {import('../registry/index.js').ActivityRegistry} registry
 * @param {import('./schema-registry.js').SchemaRegistry} schemaRegistry
 * @param {string} type
 * @param {object} ctx
 * @param {object} ctx.submission - raw submission `{ questionId, response, interactionMetrics }`
 * @param {object} ctx.payload - validated payload for the question
 * @param {object} ctx.correctAnswer - server-only correct-answer document
 * @returns {{ correct: boolean, detail: object }}
 */
export function validateAnswer(registry, schemaRegistry, type, ctx) {
  const plugin = registry.get(type)
  if (!plugin) throw engineError.notFound(type)
  if (!ctx || ctx.correctAnswer === undefined || ctx.correctAnswer === null) {
    throw engineError.internal('validateAnswer requires a correctAnswer context')
  }

  const submission = normalizeSubmission(ctx.submission, { activityType: type })

  // Guard: correct-answer document must conform to its (server-only) schema.
  const answerSchemaResult = schemaRegistry.validateCorrectAnswer(type, ctx.correctAnswer)
  if (!answerSchemaResult.valid) {
    throw engineError.internal('correct-answer document failed its schema')
  }

  const validation = plugin.validateAnswer({ submission, payload: ctx.payload, correctAnswer: ctx.correctAnswer })
  if (!validation || typeof validation.correct !== 'boolean') {
    throw engineError.internal('validateAnswer must return { correct, detail }')
  }
  return {
    correct: validation.correct,
    detail: validation.detail ?? null,
  }
}
