/**
 * Admin Question Builder — client-side draft validation (Task 5.10).
 *
 * Authoring-time feedback using the CLIENT-SAFE engine (payload + common
 * schemas only). correct-answer schemas and correctness evaluation are
 * deliberately NOT reachable here (see activity-engine/index.js), so they
 * never enter the browser bundle. Envelope fields the client can reason
 * about (required prompt/explanation, grade bounds) are checked here for
 * instant feedback; the authoritative, server-side validation (all three
 * layers incl. cross-doc correctAnswer rules) still runs on every save.
 */

import { createDefaultClientActivityEngine } from '../../activity-engine/index.js'

let cached = null

/** One shared client engine instance (payload-only, all ten plugins). */
export function getClientEngine() {
  if (!cached) cached = createDefaultClientActivityEngine()
  return cached
}

export function validateClientDraft(draft) {
  const engine = getClientEngine()
  const errors = []

  if (!draft.activityType || !engine.has(draft.activityType)) {
    return { valid: false, errors: [{ path: '/activityType', message: 'Choose an activity type.' }] }
  }

  if (typeof draft.prompt !== 'string' || draft.prompt.trim().length < 10) {
    errors.push({ path: '/prompt', message: 'The prompt must be at least 10 characters.' })
  }
  if (typeof draft.explanation !== 'string' || draft.explanation.trim().length < 10) {
    errors.push({ path: '/explanation', message: 'The explanation must be at least 10 characters.' })
  }
  if (draft.gradeMin < 6 || draft.gradeMin > 11) {
    errors.push({ path: '/gradeMin', message: 'Grade must be between 6 and 11.' })
  }
  if (draft.gradeMax < 6 || draft.gradeMax > 11) {
    errors.push({ path: '/gradeMax', message: 'Grade must be between 6 and 11.' })
  }
  if (draft.gradeMax < draft.gradeMin) {
    errors.push({ path: '/gradeMax', message: 'Maximum grade must be at least the minimum grade.' })
  }

  if (draft.payload && typeof draft.payload === 'object') {
    const result = engine.validatePayload(draft.activityType, draft.payload)
    if (!result.valid) {
      for (const err of result.errors) {
        errors.push({ path: `/payload${err.path ?? ''}`, message: err.message })
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export function activityTypeOptions() {
  return getClientEngine().list()
}

export default { validateClientDraft, getClientEngine, activityTypeOptions }