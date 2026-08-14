/**
 * Activity Engine — AJV setup (Task 4.1).
 *
 * The schema registry compiles payload and correct-answer schemas with AJV
 * 2020-12. Common schemas (ids, media) are registered by `$id` so `$ref`
 * resolution works across the whole schema family.
 */

import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

/**
 * Creates a fresh AJV instance for the schema registry.
 * `strict: false` keeps forward-compatible keywords from warning/erroring.
 */
export function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  addFormats(ajv)
  return ajv
}

/**
 * Compiles `schema` with the given AJV instance and validates `data`.
 *
 * @returns {{ valid: boolean, errors: Array<{ path, message }> }}
 */
export function validateWithSchema(ajv, schema, data) {
  const validate = ajv.getSchema(schema.$id) ?? ajv.compile(schema)
  const valid = validate(data)
  if (valid) return { valid: true, errors: [] }
  const errors = (validate.errors ?? []).map((e) => ({
    path: e.instancePath || '/',
    message: e.message ?? 'schema violation',
  }))
  return { valid: false, errors }
}
