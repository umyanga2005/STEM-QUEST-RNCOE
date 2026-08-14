/**
 * Activity Engine — schema registry (Task 4.1, report §5).
 *
 * Resolves `activityType -> { payloadSchema, correctAnswerSchema }` and
 * compiles them with AJV. Common schemas are registered first so `$ref`
 * resolution works. The correct-answer half is only present when constructed
 * in server mode.
 */

import { createAjv, validateWithSchema } from './ajv.js'
import { PAYLOAD_SCHEMAS, COMMON_SCHEMAS } from './schemas/payload.js'
import { engineError } from '../errors/index.js'

const SCHEMA_VERSION_PROPERTY = 'schemaVersion'

export class SchemaRegistry {
  /**
   * @param {object} [opts]
   * @param {import('ajv/dist/core.js').default} [opts.ajv] - shared AJV instance
   * @param {Record<string, object>} [opts.payloadSchemas] - override payload schemas
   * @param {Record<string, object>} [opts.correctAnswerSchemas] - server-only
   */
  constructor({
    ajv = createAjv(),
    payloadSchemas = PAYLOAD_SCHEMAS,
    correctAnswerSchemas = null,
  } = {}) {
    this.ajv = ajv
    this.payloadSchemas = new Map(Object.entries(payloadSchemas))
    this.correctAnswerSchemas = correctAnswerSchemas
      ? new Map(Object.entries(correctAnswerSchemas))
      : null
    this.compiled = new Map()

    for (const schema of COMMON_SCHEMAS) {
      this.ajv.addSchema(schema)
    }
  }

  /** Registers a payload schema for a type. */
  registerPayload(type, schema) {
    this.payloadSchemas.set(type, schema)
    this.ajv.addSchema(schema)
    return this
  }

  /** Registers a correct-answer schema (server mode only). */
  registerCorrectAnswer(type, schema) {
    if (!this.correctAnswerSchemas) {
      throw engineError.internal('cannot register correct-answer schema in client mode')
    }
    this.correctAnswerSchemas.set(type, schema)
    this.ajv.addSchema(schema)
    return this
  }

  has(type) {
    return this.payloadSchemas.has(type)
  }

  getPayloadSchema(type) {
    return this.payloadSchemas.get(type) ?? null
  }

  getCorrectAnswerSchema(type) {
    return this.correctAnswerSchemas?.get(type) ?? null
  }

  /** Reads the `schemaVersion` const declared by the payload schema (e.g. "1.0"). */
  getSchemaVersion(type) {
    const schema = this.payloadSchemas.get(type)
    const version = schema?.properties?.[SCHEMA_VERSION_PROPERTY]?.const
    return typeof version === 'string' || typeof version === 'number'
      ? String(version)
      : null
  }

  /** Validates `data` against the payload schema for `type`. */
  validatePayload(type, data) {
    const schema = this.payloadSchemas.get(type)
    if (!schema) throw engineError.schemaNotFound(type)
    return this.#validate(type, schema, data)
  }

  /** Validates `data` against the correct-answer schema for `type` (server). */
  validateCorrectAnswer(type, data) {
    const schema = this.correctAnswerSchemas?.get(type)
    if (!schema) throw engineError.schemaNotFound(type)
    return this.#validate(type, schema, data)
  }

  #validate(type, schema, data) {
    let compiled = this.compiled.get(schema.$id)
    if (!compiled) {
      compiled = this.ajv.getSchema(schema.$id) ?? this.ajv.compile(schema)
      this.compiled.set(schema.$id, compiled)
    }
    const result = validateWithSchema(this.ajv, schema, data)
    return result
  }
}
