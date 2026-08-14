/**
 * Activity Engine — server entry (Task 4.1).
 *
 * Full facade for server-side validation. Registers correct-answer schemas
 * and exposes validateAnswer / scoringInputs / feedback. This module is the
 * ONLY place where correct-answer schemas are wired into the engine, keeping
 * the client bundle free of correct-answer data.
 */

import { createActivityEngine } from './core.js'
import { SchemaRegistry } from './validation/schema-registry.js'
import { CORRECT_ANSWER_SCHEMAS } from './validation/schemas/correct-answer.js'

export { createActivityEngine, SchemaRegistry } from './core.js'
export { ActivityEngineError, ERROR_CODES } from './errors/index.js'
export { CORRECT_ANSWER_SCHEMAS } from './validation/schemas/correct-answer.js'

/**
 * Creates a server-mode engine: everything the client engine has, plus
 * correct-answer schema registration and answer validation/scoring/feedback.
 */
export function createServerActivityEngine() {
  const schemaRegistry = new SchemaRegistry({ correctAnswerSchemas: CORRECT_ANSWER_SCHEMAS })
  return createActivityEngine({ mode: 'server', schemaRegistry })
}
