/**
 * Activity Engine — feedback contract (Task 4.1, report §11).
 *
 * `plugin.feedback(ctx, validation, state)` returns learning-oriented
 * feedback. The engine normalizes and allow-lists the output so a buggy
 * plugin can never leak correct-answer data through the feedback channel.
 */

import { engineError } from '../errors/index.js'
import { FEEDBACK_STATES } from './contexts.js'

const ALLOWED_STATES = new Set(FEEDBACK_STATES)

/**
 * Normalizes and validates a plugin's raw feedback output.
 *
 * @param {object} raw - `{ state, title, message, explanation?, guidance? }`
 * @param {object} [opts] - `{ activityType }`
 * @returns {object} frozen `{ state, title, message, explanation?, guidance? }`
 * @throws {ActivityEngineError} SECURITY_CORRECT_ANSWER_EXPOSED
 */
export function normalizeFeedback(raw, { activityType } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw engineError.internal('feedback must return an object')
  }

  const state = raw.state ?? 'incorrect'
  if (!ALLOWED_STATES.has(state)) {
    throw engineError.internal(`feedback returned an invalid state "${state}"`)
  }

  const safe = Object.freeze({
    state,
    title: typeof raw.title === 'string' ? raw.title : '',
    message: typeof raw.message === 'string' ? raw.message : '',
    explanation: typeof raw.explanation === 'string' ? raw.explanation : null,
    guidance: typeof raw.guidance === 'string' ? raw.guidance : null,
  })

  // Reject any raw output that carries answer data under known names.
  for (const key of ['correctAnswer', 'correct_answer', 'answerKey']) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      throw engineError.correctAnswerExposed()
    }
  }
  void activityType
  return safe
}