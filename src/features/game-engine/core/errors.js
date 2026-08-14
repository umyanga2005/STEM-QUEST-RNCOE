/**
 * Game Engine — error model (Task 4.3).
 *
 * One consistent error type with stable machine-readable codes for the
 * game/session layer, mirroring the Activity Engine error style. Categories
 * keep public messages safe (never leak server internals or answer data).
 */

/** Stable Game Engine error codes. */
export const GAME_ERROR_CODES = Object.freeze({
  SESSION_NOT_FOUND: 'GAME_SESSION_NOT_FOUND',
  SESSION_WRONG_STUDENT: 'GAME_SESSION_WRONG_STUDENT',
  SESSION_INVALID_STATE: 'GAME_SESSION_INVALID_STATE',
  SESSION_NOT_ACTIVE: 'GAME_SESSION_NOT_ACTIVE',
  ROUND_NOT_FOUND: 'GAME_ROUND_NOT_FOUND',
  ROUND_NOT_CURRENT: 'GAME_ROUND_NOT_CURRENT',
  ROUND_ALREADY_SUBMITTED: 'GAME_ROUND_ALREADY_SUBMITTED',
  INSUFFICIENT_POOL: 'GAME_INSUFFICIENT_POOL',
  ACTIVITY_UNAVAILABLE: 'GAME_ACTIVITY_UNAVAILABLE',
  LEVEL_LOCKED: 'GAME_LEVEL_LOCKED',
  INVALID_INPUT: 'GAME_INVALID_INPUT',
  INTERNAL: 'GAME_INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [GAME_ERROR_CODES.SESSION_NOT_FOUND]: 'AVAILABILITY',
  [GAME_ERROR_CODES.SESSION_WRONG_STUDENT]: 'SECURITY',
  [GAME_ERROR_CODES.SESSION_INVALID_STATE]: 'STUDENT_ANSWER',
  [GAME_ERROR_CODES.SESSION_NOT_ACTIVE]: 'STUDENT_ANSWER',
  [GAME_ERROR_CODES.ROUND_NOT_FOUND]: 'STUDENT_ANSWER',
  [GAME_ERROR_CODES.ROUND_NOT_CURRENT]: 'STUDENT_ANSWER',
  [GAME_ERROR_CODES.ROUND_ALREADY_SUBMITTED]: 'STUDENT_ANSWER',
  [GAME_ERROR_CODES.INSUFFICIENT_POOL]: 'AVAILABILITY',
  [GAME_ERROR_CODES.ACTIVITY_UNAVAILABLE]: 'AVAILABILITY',
  [GAME_ERROR_CODES.LEVEL_LOCKED]: 'AVAILABILITY',
  [GAME_ERROR_CODES.INVALID_INPUT]: 'STUDENT_ANSWER',
  [GAME_ERROR_CODES.INTERNAL]: 'INTERNAL',
})

const PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  AVAILABILITY: 'This session could not be created or is not available.',
  SECURITY: 'This session does not belong to you.',
  STUDENT_ANSWER: 'This answer could not be processed.',
  INTERNAL: 'An unexpected problem occurred.',
})

export function gameCategoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? 'INTERNAL'
}

export class GameEngineError extends Error {
  constructor({ code, message, path = null, details = null }) {
    super(message)
    this.name = 'GameEngineError'
    this.code = code
    this.path = path
    this.details = details
  }

  get category() {
    return gameCategoryOf(this.code)
  }

  /** Machine-readable form; never includes stack or internals. */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      path: this.path,
      details: this.details,
    }
  }

  /** Student-safe public form. */
  toPublic() {
    return {
      code: this.code,
      category: this.category,
      message: PUBLIC_MESSAGE_BY_CATEGORY[this.category],
    }
  }
}

/** Factory helpers for the game layer. */
export const gameError = Object.freeze({
  sessionNotFound() {
    return new GameEngineError({
      code: GAME_ERROR_CODES.SESSION_NOT_FOUND,
      message: 'Session not found.',
    })
  },
  wrongStudent() {
    return new GameEngineError({
      code: GAME_ERROR_CODES.SESSION_WRONG_STUDENT,
      message: 'Session belongs to a different student.',
    })
  },
  invalidState(reason) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.SESSION_INVALID_STATE,
      message: `Session state transition rejected: ${reason}`,
      details: { reason },
    })
  },
  sessionNotActive(reason) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.SESSION_NOT_ACTIVE,
      message: `Session is not active: ${reason}`,
      details: { reason },
    })
  },
  roundNotFound(roundId) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.ROUND_NOT_FOUND,
      message: `Round "${roundId}" not found in this session.`,
    })
  },
  roundNotCurrent(roundId, currentRoundId) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.ROUND_NOT_CURRENT,
      message: `Round "${roundId}" is not the current round (expected "${currentRoundId}").`,
      details: { roundId, currentRoundId },
    })
  },
  roundAlreadySubmitted(roundId) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.ROUND_ALREADY_SUBMITTED,
      message: `Round "${roundId}" has already been submitted.`,
    })
  },
  insufficientPool(streamId, levelId, size) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.INSUFFICIENT_POOL,
      message: `Fewer than 3 eligible questions exist for stream "${streamId}" level "${levelId}".`,
      details: { streamId, levelId, poolSize: size },
    })
  },
  activityUnavailable(type, reason) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.ACTIVITY_UNAVAILABLE,
      message: `Activity type "${type}" is not available.`,
      details: { type, reason },
    })
  },
  levelLocked(streamId, levelId) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.LEVEL_LOCKED,
      message: `Level "${levelId}" of stream "${streamId}" is locked for this student.`,
      details: { streamId, levelId },
    })
  },
  invalidInput(reason) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.INVALID_INPUT,
      message: `Invalid input: ${reason}`,
      details: { reason },
    })
  },
  internal(reason) {
    return new GameEngineError({
      code: GAME_ERROR_CODES.INTERNAL,
      message: 'Unexpected Game Engine failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  GameEngineError,
  GAME_ERROR_CODES,
  gameCategoryOf,
  gameError,
}
