/**
 * Activity Engine — plugin registry (Task 4.1).
 *
 * The registry stores one plugin per activity type. Registration validates
 * the plugin shape up front so the engine only ever sees conformant plugins.
 */

import { validatePluginShape } from '../contracts/plugin.js'
import { engineError } from '../errors/index.js'

export class ActivityRegistry {
  #plugins = new Map()

  /**
   * Validates a plugin's shape without registering it.
   * @throws {ActivityEngineError} on the first shape violation
   */
  validateRegistration(plugin) {
    const error = validatePluginShape(plugin)
    if (error) throw error
  }

  /** Registers a plugin, throwing REGISTRATION_DUPLICATE_TYPE on collision. */
  register(plugin) {
    this.validateRegistration(plugin)
    if (this.#plugins.has(plugin.type)) {
      throw engineError.duplicateType(plugin.type)
    }
    this.#plugins.set(plugin.type, plugin)
    return this
  }

  /** Returns the registered plugin for `type`, or undefined. */
  get(type) {
    return this.#plugins.get(type)
  }

  has(type) {
    return this.#plugins.has(type)
  }

  /** Snapshot list of all registered plugins. */
  list() {
    return Array.from(this.#plugins.values())
  }

  get size() {
    return this.#plugins.size
  }
}
