/**
 * Admin Question Builder — authoring validator (Task 5.10).
 *
 * SERVER-ONLY. Validates a question draft against the EXISTING schema family
 * (D-043/D-046) — never a re-implementation of it:
 *
 *   Layer A  envelope      — `schemas/common/question.schema.json` (common
 *                            fields + per-activity payload + correctAnswer
 *                            $refs) with `meta` from meta.schema.json.
 *   Layer B  payload rules — the activity plugin's semantic `validatePayload`
 *                            rules (schema layer already covered by Layer A).
 *   Layer C  cross-document — the plugin's exported cross-doc integrity rule
 *                            (validateMappings / validatePairs / validateSequence
 *                            / validateAssignments / validateBlankAnswers /
 *                            validateImageInteractionAnswer / validatePatternAnswer
 *                            / validateMemoryAnswer / validateScenarioAnswer /
 *                            validateNumberLogicAnswer), which needs BOTH the
 *                            payload and the server-only correctAnswer.
 *
 * The envelope schema is derived once from question.schema.json: the
 * `activityType` enum is replaced with the DB `activity_types.slug` set
 * (incl. `scenario-challenge`, which maps to the scenario schemas), and the
 * per-activity $defs are regenerated from the registered schema maps. All
 * $refs resolve against the same AJV instance, so payload + correctAnswer are
 * validated to their exact activity schemas. The DTO is the envelope minus
 * `formatVersion` (a relational-store constant, enforced at 1 by the service).
 *
 * Importing this module pulls in CORRECT_ANSWER_SCHEMAS (server-only). It is
 * NEVER imported from any client entry point — the browser only ever calls the
 * safe `/api/admin/questions` HTTP surface, whose correctAnswer responses are
 * already authorized server-side (D-028). The client bundle stays clean.
 */

import { createServerActivityEngine } from '../../../activity-engine/server.js'
import { registerDragDrop, validateMappings } from '../../../activity-engine/plugins/drag-drop/plugin.js'
import { registerMatching, validatePairs } from '../../../activity-engine/plugins/matching/plugin.js'
import { registerOrdering, validateSequence } from '../../../activity-engine/plugins/ordering/plugin.js'
import { registerSorting, validateAssignments } from '../../../activity-engine/plugins/sorting/plugin.js'
import { registerFillComplete, validateBlankAnswers } from '../../../activity-engine/plugins/fill-complete/plugin.js'
import { registerImageInteraction, validateImageInteractionAnswer } from '../../../activity-engine/plugins/image-interaction/plugin.js'
import { registerPattern, validatePatternAnswer } from '../../../activity-engine/plugins/pattern/plugin.js'
import { registerMemory, validateMemoryAnswer } from '../../../activity-engine/plugins/memory/plugin.js'
import { registerScenarioChallenge, validateScenarioAnswer } from '../../../activity-engine/plugins/scenario-challenge/plugin.js'
import { registerNumberLogic, validateNumberLogicAnswer } from '../../../activity-engine/plugins/number-logic/plugin.js'

import { createAjv, validateWithSchema } from '../../../activity-engine/validation/ajv.js'
import { PAYLOAD_SCHEMAS, COMMON_SCHEMAS } from '../../../activity-engine/validation/schemas/payload.js'
import { CORRECT_ANSWER_SCHEMAS } from '../../../activity-engine/validation/schemas/correct-answer.js'

import questionSchema from '../../../../../schemas/common/question.schema.json' with { type: 'json' }
import metaSchema from '../../../../../schemas/common/meta.schema.json' with { type: 'json' }

import { QUESTION_ACTIVITY_TYPES } from '../contracts.js'

/** Layer C: activityType → cross-document integrity rule (needs both docs). */
const CROSS_DOC_RULES = Object.freeze({
  'drag-drop': validateMappings,
  matching: validatePairs,
  ordering: validateSequence,
  sorting: validateAssignments,
  'fill-complete': validateBlankAnswers,
  'image-interaction': validateImageInteractionAnswer,
  pattern: validatePatternAnswer,
  memory: validateMemoryAnswer,
  'scenario-challenge': validateScenarioAnswer,
  'number-logic': validateNumberLogicAnswer,
})

/**
 * Builds the derived envelope schema from question.schema.json:
 *   - activityType enum → the DB activity_types.slug set
 *   - $defs regenerated for every DB slug from the registered schema maps
 * All $refs (payload, correctAnswer, meta, ids, media) resolve on the shared
 * AJV instance because every referenced schema is registered by $id.
 */
function buildEnvelopeSchema() {
  const defs = {}
  for (const slug of QUESTION_ACTIVITY_TYPES) {
    const payload = PAYLOAD_SCHEMAS[slug]
    const answer = CORRECT_ANSWER_SCHEMAS[slug]
    defs[slug] = {
      if: { properties: { activityType: { const: slug } }, required: ['activityType'] },
      then: {
        properties: {
          payload: { $ref: payload.$id },
          correctAnswer: { $ref: answer.$id },
        },
      },
    }
  }
  return {
    ...questionSchema,
    properties: {
      ...questionSchema.properties,
      explanation: { type: 'string', maxLength: 2000, description: 'Learning explanation shown after answering.' },
      activityType: {
        enum: QUESTION_ACTIVITY_TYPES,
        description: 'DB activity_types.slug (incl. scenario-challenge).',
      },
    },
    allOf: QUESTION_ACTIVITY_TYPES.map((slug) => ({ $ref: `#/$defs/${slug}` })),
    $defs: defs,
  }
}

/**
 * Creates the authoring validator. One shared AJV + engine (plugins
 * registered once); `validate(draft)` is pure and safe to call concurrently.
 * @returns {{ validate: (draft: object) => { valid: boolean, errors: Array<{ path: string, message: string, code?: string }> }, engine: object, envelopeSchema: object }}
 */
export function createQuestionValidator() {
  const engine = createServerActivityEngine()
  registerDragDrop(engine)
  registerMatching(engine)
  registerOrdering(engine)
  registerSorting(engine)
  registerFillComplete(engine)
  registerImageInteraction(engine)
  registerPattern(engine)
  registerMemory(engine)
  registerScenarioChallenge(engine)
  registerNumberLogic(engine)

  const ajv = createAjv()
  for (const schema of COMMON_SCHEMAS) ajv.addSchema(schema)
  ajv.addSchema(metaSchema)
  const added = new Set(COMMON_SCHEMAS.map((s) => s.$id))
  for (const schema of Object.values(PAYLOAD_SCHEMAS)) {
    if (!added.has(schema.$id)) {
      ajv.addSchema(schema)
      added.add(schema.$id)
    }
  }
  for (const schema of Object.values(CORRECT_ANSWER_SCHEMAS)) {
    if (!added.has(schema.$id)) {
      ajv.addSchema(schema)
      added.add(schema.$id)
    }
  }

  const envelopeSchema = buildEnvelopeSchema()
  ajv.compile(envelopeSchema)

  /** Maps one engine/plugin error entry to the normalized field shape. */
  function toField({ path, message, ruleId } = {}) {
    return {
      path: path || '/',
      message: message ?? 'validation failed',
      code: ruleId ?? null,
    }
  }

  /**
   * Validates a full authoring draft (already envelope-shaped).
   * @returns {{ valid: boolean, errors: Array<{ path: string, message: string, code?: string }> }}
   */
  function validate(draft) {
    const errors = []
    const activityType = draft?.activityType ?? ''

    // Layer A: envelope (common fields + payload + correctAnswer schemas).
    const envelope = validateWithSchema(ajv, envelopeSchema, draft)
    for (const e of envelope.errors) errors.push({ path: e.path, message: e.message, code: 'ENVELOPE' })

    // Layer B: activity-specific payload semantic rules (schema already ran).
    if (errors.length === 0 && engine.has(activityType)) {
      const plugin = engine.get(activityType)
      let semantic
      try {
        semantic = plugin.validatePayload(draft.payload)
      } catch {
        semantic = { valid: false, errors: [] }
      }
      if (semantic && semantic.valid === false) {
        for (const e of semantic.errors ?? []) errors.push(toField(e))
      }
    }

    // Layer C: cross payload↔correctAnswer integrity.
    if (errors.length === 0 && draft?.payload && draft?.correctAnswer) {
      const rule = CROSS_DOC_RULES[activityType]
      if (rule) {
        for (const e of rule(draft.payload, draft.correctAnswer)) errors.push(toField(e))
      }
    }

    return { valid: errors.length === 0, errors }
  }

  return { validate, engine, envelopeSchema }
}

export default { createQuestionValidator }