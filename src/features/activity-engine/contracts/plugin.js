/**
 * Activity Engine — plugin contract (Task 4.1).
 *
 * A plugin is a plain object that teaches the engine how to handle one
 * activity type (e.g. `drag-drop`). The engine owns schema loading, payload
 * validation routing, submission shape checking, scoring-input guarding, and
 * capability gating; the plugin owns the activity-specific logic.
 */

import { engineError } from '../errors/index.js'

/** Activity type identifier. Matches the activity enum used by question.schema.json. */
export const ACTIVITY_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,31}$/

/** Schema contract version every Task 3.2 payload schema currently declares. */
export const DEFAULT_SCHEMA_VERSION = '1.0'

/**
 * Every plugin MUST implement these methods.
 *
 * Contract (see `docs/contracts/` and the report for details):
 *   - `render(ctx)`            -> render descriptor (client-safe)
 *   - `validatePayload(p)`     -> { valid, errors }  (semantic rules)
 *   - `validateAnswer(ctx)`    -> { correct, detail }  (server-only)
 *   - `scoringInputs(ctx, v)`  -> raw scoring inputs    (server-only)
 *   - `buildHints(question)`   -> [{ id, level, text }]
 *   - `feedback(ctx, v, st)`   -> feedback object       (server-only)
 *   - `availableOn(context)`   -> boolean
 */
export const REQUIRED_METHODS = Object.freeze([
  'render',
  'validatePayload',
  'validateAnswer',
  'scoringInputs',
  'buildHints',
  'feedback',
  'availableOn',
])

/** Methods that operate on correct-answer data; never exposed on the client. */
export const SERVER_ONLY_METHODS = Object.freeze([
  'validateAnswer',
  'scoringInputs',
  'feedback',
])

/** Returns an ActivityEngineError describing the first shape violation, or null. */
export function validatePluginShape(plugin) {
  if (plugin === null || typeof plugin !== 'object' || Array.isArray(plugin)) {
    return engineError.invalidMetadata(null, 'plugin must be a plain object')
  }
  const { type, name, version } = plugin
  if (typeof type !== 'string' || !ACTIVITY_TYPE_PATTERN.test(type)) {
    return engineError.invalidIdentifier(type)
  }
  if (typeof name !== 'string' || name.trim() === '') {
    return engineError.invalidMetadata(type, '`name` must be a non-empty string')
  }
  if (typeof version !== 'string' || version.trim() === '') {
    return engineError.invalidMetadata(type, '`version` must be a non-empty string')
  }
  for (const method of REQUIRED_METHODS) {
    if (typeof plugin[method] !== 'function') {
      return engineError.missingMethod(type, method)
    }
  }
  return null
}

/** Snapshot of a plugin safe to hand to client-side code. */
export function pluginForClient(plugin) {
  const safe = {
    type: plugin.type,
    name: plugin.name,
    version: plugin.version,
    schemaVersion: plugin.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
  }
  for (const method of ['render', 'validatePayload', 'buildHints', 'availableOn']) {
    safe[method] = plugin[method]
  }
  return Object.freeze(safe)
}
