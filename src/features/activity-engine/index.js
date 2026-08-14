/**
 * Activity Engine — client entry (Task 4.1).
 *
 * Client-safe facade. Correct-answer schemas and server-only methods are
 * deliberately NOT reachable from this module, so they never enter the
 * browser bundle.
 */

import { createActivityEngine } from './core.js'
import { SchemaRegistry } from './validation/schema-registry.js'

export { createActivityEngine, SchemaRegistry } from './core.js'
export { ActivityEngineError, ERROR_CODES } from './errors/index.js'

/**
 * Creates a client-mode engine (rendering, payload validation, hints,
 * availability). No correct-answer schema is registered, and no server-only
 * method is exposed.
 */
export function createClientActivityEngine() {
  const schemaRegistry = new SchemaRegistry() // payload + common only
  return createActivityEngine({ mode: 'client', schemaRegistry })
}
