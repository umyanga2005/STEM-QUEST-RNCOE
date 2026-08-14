/**
 * Activity Engine — payload validator (Task 4.1, report §4 & §20).
 *
 * Routes `validatePayload(type, payload)` to the schema registry first, then
 * to the plugin's semantic rules. Results are returned as a normalized
 * `{ valid, errors }` object (errors are ActivityEngineError instances).
 */

import { engineError } from '../errors/index.js'

/**
 * Validates a payload for `type` against its schema, then the plugin's rules.
 *
 * @param {import('../registry/index.js').ActivityRegistry} registry
 * @param {import('./schema-registry.js').SchemaRegistry} schemaRegistry
 * @param {string} type
 * @param {object} payload
 * @returns {{ valid: boolean, errors: Array<ActivityEngineError> }}
 */
export function validatePayload(registry, schemaRegistry, type, payload) {
  const plugin = registry.get(type)
  if (!plugin) throw engineError.notFound(type)

  const errors = []

  // Layer 1: schema
  if (schemaRegistry.has(type)) {
    const schemaResult = schemaRegistry.validatePayload(type, payload)
    if (!schemaResult.valid) {
      errors.push(engineError.payloadInvalid(type, schemaResult.errors))
    }
  } else if (typeof plugin.validatePayload === 'function') {
    // no schema — allow plugin-only validation
  } else {
    throw engineError.schemaNotFound(type)
  }

  // Layer 2: plugin semantic rules
  if (errors.length === 0 && typeof plugin.validatePayload === 'function') {
    let semantic
    try {
      semantic = plugin.validatePayload(payload)
    } catch (err) {
      semantic = { valid: false, errors: [{ message: err.message }] }
    }
    if (semantic && semantic.valid === false && Array.isArray(semantic.errors)) {
      errors.push(engineError.payloadSemanticInvalid(type, semantic.errors))
    } else if (semantic === false) {
      errors.push(engineError.payloadSemanticInvalid(type, []))
    }
  }

  return { valid: errors.length === 0, errors }
}
