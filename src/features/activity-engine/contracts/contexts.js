/**
 * Activity Engine — context contracts (Task 4.1).
 *
 * Context objects are the shared envelope passed between the engine and
 * plugins. They are frozen, explicitly allow-listed, and never carry
 * correct-answer data.
 */

import { engineError } from '../errors/index.js'

/** Valid feedback states the engine accepts from plugins. */
export const FEEDBACK_STATES = Object.freeze([
  'correct',
  'partial',
  'incorrect',
  'timeout',
])

/** Keys that must never appear in any client-bound context. */
const FORBIDDEN_KEYS = Object.freeze(['correctAnswer', 'correct_answer', 'answerKey'])

function assertNoCorrectAnswer(obj, context) {
  if (!obj || typeof obj !== 'object') return
  for (const key of FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      throw engineError.correctAnswerExposed()
    }
  }
  void context
}

/**
 * Builds the frozen render context passed to `plugin.render(ctx)`.
 *
 * Security: throws SECURITY_CORRECT_ANSWER_EXPOSED if the caller accidentally
 * passes correct-answer data. Only allow-listed keys survive.
 *
 * @param {object} input
 * @param {object} input.question  - student-visible question (payload, prompt…)
 * @param {object} [input.state]   - client-side interaction state
 * @param {object} [input.capabilities] - device/capability context
 * @param {object} [input.dispatch]     - callback for renderer -> engine events
 * @returns {object} frozen render context
 */
export function createRenderContext(input) {
  const { question = {}, state = {}, capabilities = {}, dispatch = null } = input ?? {}
  assertNoCorrectAnswer(question, 'render.question')

  const ctx = Object.freeze({
    question: Object.freeze(question),
    state: Object.freeze(state),
    capabilities: normalizeCapabilities(capabilities),
    dispatch: typeof dispatch === 'function' ? dispatch : null,
  })
  return ctx
}

/** Device/capability context (see report §24). Never screen-size-dependent. */
export function normalizeCapabilities(raw = {}) {
  const viewport = raw.viewport
    ? Object.freeze({
        width: Number.isFinite(viewport?.width) ? viewport.width : null,
        height: Number.isFinite(viewport?.height) ? viewport.height : null,
      })
    : null
  return Object.freeze({
    reducedMotion: raw.reducedMotion === true,
    viewport,
    pointerType: ['mouse', 'touch', 'pen', 'trackpad', 'other'].includes(raw.pointerType)
      ? raw.pointerType
      : null,
    inputMode: ['mouse', 'touch', 'keyboard', 'voice'].includes(raw.inputMode)
      ? raw.inputMode
      : null,
  })
}

/**
 * Normalizes and validates an answer submission (report §7).
 *
 * @param {object} raw - `{ activityType, questionId, response, interactionMetrics }`
 * @returns {object} frozen normalized submission
 * @throws {ActivityEngineError} ACTIVITY_ANSWER_INVALID
 */
export function normalizeSubmission(raw, { activityType } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw engineError.answerInvalid(activityType, 'submission must be an object')
  }
  if (typeof raw.questionId !== 'string' || raw.questionId.trim() === '') {
    throw engineError.answerInvalid(activityType, '`questionId` is required')
  }
  if (raw.response === undefined || raw.response === null) {
    throw engineError.answerInvalid(activityType, '`response` is required')
  }
  if (typeof raw.response === 'function') {
    throw engineError.answerInvalid(activityType, '`response` must be JSON-serializable')
  }

  const metrics = raw.interactionMetrics ?? {}
  const attemptsUsed = metrics.attemptsUsed ?? 1
  const hintsUsed = metrics.hintsUsed ?? 0
  if (!Number.isInteger(attemptsUsed) || attemptsUsed < 1) {
    throw engineError.answerInvalid(activityType, '`attemptsUsed` must be an integer >= 1')
  }
  if (!Number.isInteger(hintsUsed) || hintsUsed < 0) {
    throw engineError.answerInvalid(activityType, '`hintsUsed` must be an integer >= 0')
  }
  const timeTakenSec = metrics.timeTakenSec
  if (
    timeTakenSec !== undefined &&
    (typeof timeTakenSec !== 'number' || !Number.isFinite(timeTakenSec) || timeTakenSec < 0)
  ) {
    throw engineError.answerInvalid(activityType, '`timeTakenSec` must be a non-negative number')
  }

  const submission = Object.freeze({
    activityType: activityType ?? raw.activityType ?? null,
    questionId: raw.questionId,
    response: raw.response,
    interactionMetrics: Object.freeze({
      attemptsUsed,
      hintsUsed,
      timeTakenSec: timeTakenSec ?? null,
    }),
  })
  assertNoCorrectAnswer(submission.response, 'submission.response')
  return submission
}

/**
 * Device context for availability checks (report §12).
 *
 * @param {object} raw - `{ stream, level, grade, device, featureFlags }`
 * @returns {object} frozen availability context
 */
export function normalizeAvailabilityContext(raw = {}) {
  const level = raw.level
  const grade = raw.grade
  return Object.freeze({
    stream: typeof raw.stream === 'string' ? raw.stream : null,
    level: Number.isInteger(level) ? level : null,
    grade: Number.isInteger(grade) ? grade : null,
    device: typeof raw.device === 'string' ? raw.device : null,
    featureFlags:
      raw.featureFlags && typeof raw.featureFlags === 'object'
        ? Object.freeze({ ...raw.featureFlags })
        : Object.freeze({}),
    capabilities: normalizeCapabilities(raw.capabilities),
  })
}
