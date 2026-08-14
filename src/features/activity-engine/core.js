/**
 * Activity Engine — core (Task 4.1).
 *
 * `createActivityEngine` wires a plugin registry + schema registry into a
 * single facade. In `client` mode, server-only methods (validateAnswer,
 * scoringInputs, feedback) are NOT exposed at all; in `server` mode they are.
 * Correct-answer data only ever flows through the server-mode methods.
 */

import { ActivityRegistry } from './registry/index.js'
import { SchemaRegistry } from './validation/schema-registry.js'
import { validatePayload } from './validation/payload-validator.js'
import { validateAnswer } from './validation/answer-validator.js'
import { createRenderContext, normalizeSubmission, normalizeAvailabilityContext } from './contracts/contexts.js'
import { normalizeScoringInputs } from './contracts/scoring.js'
import { normalizeHints } from './contracts/hints.js'
import { normalizeFeedback } from './contracts/feedback.js'
import { pluginForClient, DEFAULT_SCHEMA_VERSION } from './contracts/plugin.js'
import { engineError, ActivityEngineError } from './errors/index.js'

/**
 * Creates an Activity Engine facade.
 *
 * @param {object} [opts]
 * @param {'client'|'server'} [opts.mode] - 'client' hides server-only methods
 * @param {ActivityRegistry} [opts.registry]
 * @param {SchemaRegistry} [opts.schemaRegistry]
 * @returns {object} engine facade
 */
export function createActivityEngine({
  mode = 'client',
  registry = new ActivityRegistry(),
  schemaRegistry = new SchemaRegistry(),
} = {}) {
  const isServer = mode === 'server'

  const engine = {
    mode,
    registry,
    schemaRegistry,

    // ---- lifecycle ---------------------------------------------------------
    register(plugin) {
      registry.register(plugin)
      return engine
    },
    has(type) {
      return registry.has(type)
    },
    get(type) {
      return registry.get(type)
    },
    list() {
      return registry.list().map((p) => ({
        type: p.type,
        name: p.name,
        version: p.version,
        schemaVersion: p.schemaVersion ?? DEFAULT_SCHEMA_VERSION,
      }))
    },
    /** Version of the schema contract the registry resolves for `type`. */
    getSchemaVersion(type) {
      return schemaRegistry.getSchemaVersion(type)
    },

    // ---- payload validation (client-safe) -----------------------------------
    /**
     * Validates a payload against its schema + plugin semantic rules.
     * @returns {{ valid: boolean, errors: ActivityEngineError[] }}
     */
    validatePayload(type, payload) {
      return validatePayload(registry, schemaRegistry, type, payload)
    },

    getPayloadSchema(type) {
      return schemaRegistry.getPayloadSchema(type)
    },

    // ---- rendering (client-safe) --------------------------------------------
    /**
     * Renders a question by delegating to the plugin. `renderContext` is
     * built here so correct-answer data can never be passed into it.
     * @returns {object} plugin render descriptor
     */
    render(type, input) {
      const plugin = registry.get(type)
      if (!plugin) throw engineError.notFound(type)
      const context = createRenderContext(input)
      return plugin.render(context)
    },

    // ---- hints & availability (client-safe) ----------------------------------
    /** Progressive hints, normalized + level-ordered. */
    buildHints(type, question) {
      const plugin = registry.get(type)
      if (!plugin) throw engineError.notFound(type)
      return normalizeHints(plugin.buildHints(question))
    },

    /** Availability decision for a context. */
    availableOn(type, rawContext = {}) {
      const plugin = registry.get(type)
      if (!plugin) throw engineError.notFound(type)
      const context = normalizeAvailabilityContext(rawContext)
      return plugin.availableOn(context) === true
    },
  }

  // ---- server-only surface --------------------------------------------------
  if (isServer) {
    Object.assign(engine, {
      getCorrectAnswerSchema(type) {
        return schemaRegistry.getCorrectAnswerSchema(type)
      },

      /**
       * Validates a student answer. Requires `ctx.correctAnswer`.
       * @returns {{ correct: boolean, detail: object }}
       */
      validateAnswer(type, ctx) {
        return validateAnswer(registry, schemaRegistry, type, ctx)
      },

      /** Guards + normalizes raw plugin scoring inputs. */
      scoringInputs(type, ctx, validation) {
        const plugin = registry.get(type)
        if (!plugin) throw engineError.notFound(type)
        const raw = plugin.scoringInputs(ctx, validation)
        return normalizeScoringInputs(raw, { activityType: type })
      },

      /** Normalized learning-oriented feedback. */
      feedback(type, ctx, validation, state) {
        const plugin = registry.get(type)
        if (!plugin) throw engineError.notFound(type)
        return normalizeFeedback(plugin.feedback(ctx, validation, state), {
          activityType: type,
        })
      },
    })
  }

  // In client mode, expose a sanitized view of plugins (no server methods).
  if (!isServer) {
    engine.get = (type) => {
      const plugin = registry.get(type)
      return plugin ? pluginForClient(plugin) : undefined
    }
  }

  return Object.freeze(engine)
}

/** Re-exports so the engine facade is a single import surface. */
export { ActivityRegistry, SchemaRegistry, ActivityEngineError, engineError, normalizeSubmission }
export { ERROR_CODES } from './errors/index.js'
export { applySemanticRules, createSemanticRule, SemanticRuleSet, SEMANTIC_RULES_CATALOG } from './validation/semantic/index.js'
export { normalizeHints, normalizeFeedback, normalizeScoringInputs, normalizeAvailabilityContext }
export { SERVER_ONLY_METHODS, ACTIVITY_TYPE_PATTERN, DEFAULT_SCHEMA_VERSION } from './contracts/plugin.js'
