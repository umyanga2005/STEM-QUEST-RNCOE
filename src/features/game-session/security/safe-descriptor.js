/**
 * Game Session — safe round descriptor (Task 4.4).
 *
 * Transforms a server-side question + round into the ONLY payload that may
 * cross the API boundary. The render descriptor is produced by the activity
 * plugin (client-safe by contract — D-021); session/round metadata and the
 * timer configuration are attached. correctAnswer, the raw payload's hidden
 * semantics, scoring internals and service credentials never appear.
 */

import { gameError } from '../../game-engine/core/errors.js'

/**
 * @typedef {object} SafeRoundDescriptor
 * @property {number} sessionId
 * @property {number} roundId
 * @property {number} roundNumber
 * @property {number} totalRounds
 * @property {string} activityType
 * @property {number} questionId
 * @property {string} prompt
 * @property {?string} instructions
 * @property {object} activity - plugin render descriptor
 * @property {object[]} hints - authored progressive hints (safe)
 * @property {object} timer - UX-only configuration
 * @property {object} progress - { current, total, completed }
 */

/**
 * Builds the client-safe descriptor for one round.
 *
 * @param {object} deps
 * @param {object} deps.activityEngine - activity engine facade (any mode)
 * @param {object} deps.session
 * @param {object} deps.round - SessionRound domain object
 * @param {object} deps.question - server-side Question (correctAnswer NOT read)
 * @param {object} deps.level - Level (timer config)
 * @param {number} deps.answeredCount - rounds already submitted (for progress)
 * @param {number} deps.totalRounds
 */
export function buildSafeRoundDescriptor({
  activityEngine,
  session,
  round,
  question,
  level,
  answeredCount,
  totalRounds = 3,
}) {
  const renderDescriptor = activityEngine.render(round.activityType, {
    question: {
      prompt: question.prompt,
      instructions: question.instructions ?? undefined,
      payload: question.payload,
    },
    capabilities: { reducedMotion: false },
  })

  const hints = activityEngine.buildHints(round.activityType, question)

  const allowedSeconds = question.timerOverrideSeconds ?? level.defaultTimeSeconds

  return Object.freeze({
    sessionId: session.id,
    roundId: round.id,
    roundNumber: round.roundNumber,
    totalRounds,
    activityType: round.activityType,
    questionId: question.id,
    prompt: question.prompt,
    instructions: question.instructions ?? null,
    activity: renderDescriptor,
    hints,
    timer: Object.freeze({
      mode: 'countdown',
      allowedSeconds,
      overtimePenaltyPerSecond: level.overtimePenaltyPerSecond,
    }),
    progress: Object.freeze({
      current: answeredCount + 1,
      total: totalRounds,
      completed: false,
    }),
  })
}

/** Safe summary of a session row for API responses. */
export function toPublicSession(session) {
  if (!session || typeof session.id !== 'number') {
    throw gameError.sessionNotFound()
  }
  return Object.freeze({
    id: session.id,
    sessionCode: session.sessionCode,
    streamId: session.streamId,
    levelId: session.levelId,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt ?? null,
    totalScore: session.totalScore ?? 0,
    totalTimeMs: session.totalTimeMs ?? null,
    result: session.result ?? null,
    progress: Object.freeze({
      selected: session.selectedQuestionIds.length,
      played: session.roundsAnswered ?? 0,
    }),
  })
}

export default {
  buildSafeRoundDescriptor,
  toPublicSession,
}