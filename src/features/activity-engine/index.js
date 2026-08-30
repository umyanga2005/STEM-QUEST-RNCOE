/**
 * Activity Engine — client entry (Task 4.1).
 *
 * Client-safe facade. Correct-answer schemas and server-only methods are
 * deliberately NOT reachable from this module, so they never enter the
 * browser bundle.
 */

import { createActivityEngine } from './core.js'
import { SchemaRegistry } from './validation/schema-registry.js'
import { registerDragDrop } from './plugins/drag-drop/plugin.js'
import { registerMatching } from './plugins/matching/plugin.js'
import { registerOrdering } from './plugins/ordering/plugin.js'
import { registerSorting } from './plugins/sorting/plugin.js'
import { registerFillComplete } from './plugins/fill-complete/plugin.js'
import { registerFindWord } from './plugins/find-word/plugin.js'
import { registerPattern } from './plugins/pattern/plugin.js'
import { registerMemory } from './plugins/memory/plugin.js'
import { registerScenarioChallenge } from './plugins/scenario-challenge/plugin.js'
import { registerNumberLogic } from './plugins/number-logic/plugin.js'

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

/**
 * Creates a client-mode engine with every activity plugin registered.
 * Used by authoring tooling (Admin Question Builder) so `has`, payload
 * validation and `render` work for all ten activity types. All plugin modules
 * are client-safe: correct-answer schemas stay server-only.
 */
export function createDefaultClientActivityEngine() {
  const engine = createClientActivityEngine()
  registerDragDrop(engine)
  registerMatching(engine)
  registerOrdering(engine)
  registerSorting(engine)
  registerFillComplete(engine)
  registerFindWord(engine)
  registerPattern(engine)
  registerMemory(engine)
  registerScenarioChallenge(engine)
  registerNumberLogic(engine)
  return engine
}
