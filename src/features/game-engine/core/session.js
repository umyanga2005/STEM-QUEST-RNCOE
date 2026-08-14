/**
 * Game Engine — session lifecycle (Task 4.3, design doc §7).
 *
 * Pure state machine over a plain session object. No persistence here: the
 * repository adapter (Supabase) is a separate later task; this module only
 * encodes the rules — who the session belongs to, what state transitions are
 * legal, and which round may be answered next. Answer validation and final
 * scoring live in the Activity Engine + Central Scoring Service and are
 * injected by callers, keeping this module dependency-free.
 *
 * Session shape:
 * {
 *   id, studentId, streamId, levelId, seed,
 *   status: 'started' | 'completed' | 'abandoned',
 *   questionIds: string[3],
 *   rounds: [{ id, questionId, status: 'pending' | 'submitted', result? }],
 *   totalPoints?: number, startedAt, finishedAt?
 * }
 */

import { gameError } from './errors.js'
import { QUESTIONS_PER_SESSION } from './selection.js'

export const SESSION_STATUS = Object.freeze({
  STARTED: 'started',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
})

export const ROUND_STATUS = Object.freeze({
  PENDING: 'pending',
  SUBMITTED: 'submitted',
})

export const MAX_SESSION_POINTS = 300

let roundSeq = 0

/** Deterministic, test-friendly round id generator (injectable via opts). */
function nextRoundId() {
  roundSeq += 1
  return `r${roundSeq}`
}

/**
 * Creates a game session for one (stream, level) with exactly 3 selected
 * questions.
 * @param {object} input
 * @param {string} input.id - session id (assigned by the caller/repository)
 * @param {string} input.studentId
 * @param {string} input.streamId
 * @param {string} input.levelId
 * @param {string} input.seed - the session seed used for selection
 * @param {string[]} input.questionIds - exactly 3, in round order
 * @param {object} [opts]
 * @param {() => string} [opts.makeRoundId]
 * @returns {object} session
 * @throws {GameEngineError} GAME_INVALID_INPUT on malformed input
 */
export function createGameSession(
  { id, studentId, streamId, levelId, seed, questionIds },
  { makeRoundId = nextRoundId } = {}
) {
  if (!id || typeof id !== 'string') {
    throw gameError.invalidInput('session id is required')
  }
  if (!studentId || typeof studentId !== 'string') {
    throw gameError.invalidInput('studentId is required')
  }
  if (!streamId || !levelId || !seed) {
    throw gameError.invalidInput('streamId, levelId and seed are required')
  }
  if (
    !Array.isArray(questionIds) ||
    questionIds.length !== QUESTIONS_PER_SESSION
  ) {
    throw gameError.invalidInput(
      `exactly ${QUESTIONS_PER_SESSION} questionIds are required`
    )
  }
  if (new Set(questionIds).size !== questionIds.length) {
    throw gameError.invalidInput('questionIds must be unique within a session')
  }

  const rounds = questionIds.map((questionId) => ({
    id: makeRoundId(),
    questionId,
    status: ROUND_STATUS.PENDING,
  }))

  return {
    id,
    studentId,
    streamId,
    levelId,
    seed,
    status: SESSION_STATUS.STARTED,
    questionIds: questionIds.slice(),
    rounds,
    startedAt: Date.now(),
  }
}

/**
 * Guards that `studentId` may operate on `session`. Throws the student-safe
 * error otherwise. Returns the session for chaining.
 */
export function guardSessionForStudent(session, studentId) {
  if (!session || typeof session.id !== 'string') {
    throw gameError.sessionNotFound()
  }
  if (session.studentId !== studentId) {
    throw gameError.wrongStudent()
  }
  return session
}

/**
 * Returns the current (first pending) round, or null when all are submitted.
 */
export function getCurrentRound(session) {
  if (!session) return null
  return session.rounds.find((r) => r.status === ROUND_STATUS.PENDING) ?? null
}

/**
 * Marks a round submitted. Only the current round may be submitted, only in a
 * started session, and never twice. Returns a new session object (immutable
 * update). When the last pending round is submitted the session becomes
 * 'completed' (points are assigned separately via finishSession).
 *
 * @param {object} session
 * @param {string} roundId
 * @param {object} [result] - opaque round result (feedback detail, etc.)
 * @returns {object} updated session
 */
export function submitRound(session, roundId, result = null) {
  if (session.status !== SESSION_STATUS.STARTED) {
    throw gameError.sessionNotActive(`status is "${session.status}"`)
  }
  const index = session.rounds.findIndex((r) => r.id === roundId)
  if (index === -1) throw gameError.roundNotFound(roundId)

  const round = session.rounds[index]
  if (round.status === ROUND_STATUS.SUBMITTED) {
    throw gameError.roundAlreadySubmitted(roundId)
  }
  const current = getCurrentRound(session)
  if (current.id !== roundId) {
    throw gameError.roundNotCurrent(roundId, current.id)
  }

  const rounds = session.rounds.map((r, i) =>
    i === index ? { ...r, status: ROUND_STATUS.SUBMITTED, result } : r
  )
  const allSubmitted = rounds.every((r) => r.status === ROUND_STATUS.SUBMITTED)

  return {
    ...session,
    rounds,
    status: allSubmitted ? SESSION_STATUS.COMPLETED : SESSION_STATUS.STARTED,
  }
}

/**
 * Finalizes a completed session with its server-computed total.
 * @param {object} session
 * @param {number} totalPoints - central-scoring session sum (0–300)
 * @returns {object} finalized session
 * @throws {GameEngineError} GAME_SESSION_INVALID_STATE when not all rounds are
 *   submitted, or GAME_INVALID_INPUT for out-of-range points
 */
export function finishSession(session, totalPoints) {
  if (!session.rounds.every((r) => r.status === ROUND_STATUS.SUBMITTED)) {
    throw gameError.invalidState('cannot finish with pending rounds')
  }
  if (
    typeof totalPoints !== 'number' ||
    Number.isNaN(totalPoints) ||
    totalPoints < 0 ||
    totalPoints > MAX_SESSION_POINTS
  ) {
    throw gameError.invalidInput(
      `totalPoints must be a number between 0 and ${MAX_SESSION_POINTS}`
    )
  }
  return {
    ...session,
    status: SESSION_STATUS.COMPLETED,
    totalPoints,
    finishedAt: Date.now(),
  }
}

export default {
  SESSION_STATUS,
  ROUND_STATUS,
  MAX_SESSION_POINTS,
  createGameSession,
  guardSessionForStudent,
  getCurrentRound,
  submitRound,
  finishSession,
}
