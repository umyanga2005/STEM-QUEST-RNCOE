/**
 * Leaderboard — error model (Task 5.7).
 *
 * One consistent error type with stable machine-readable codes, mirroring
 * the Student / Mission error style. Categories keep public messages safe —
 * never leak server internals, tokens, or personal data.
 *
 * Auth is OPTIONAL on leaderboard routes (the exhibition board is public):
 * a missing/expired token simply yields no self-highlight, so this layer
 * never raises a 401. It only maps validation/availability failures.
 */

/** Stable Leaderboard error codes. */
export const LEADERBOARD_ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'LEADERBOARD_INVALID_INPUT',
  STREAM_UNAVAILABLE: 'LEADERBOARD_STREAM_UNAVAILABLE',
  INTERNAL: 'LEADERBOARD_INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [LEADERBOARD_ERROR_CODES.INVALID_INPUT]: 'VALIDATION',
  [LEADERBOARD_ERROR_CODES.STREAM_UNAVAILABLE]: 'AVAILABILITY',
  [LEADERBOARD_ERROR_CODES.INTERNAL]: 'INTERNAL',
})

const PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  VALIDATION: 'Please choose a valid leaderboard and try again.',
  AVAILABILITY: 'This leaderboard is not available right now.',
  INTERNAL: 'An unexpected problem occurred. Please try again.',
})

export function leaderboardCategoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? 'INTERNAL'
}

export class LeaderboardError extends Error {
  constructor({ code, message, path = null, details = null }) {
    super(message)
    this.name = 'LeaderboardError'
    this.code = code
    this.path = path
    this.details = details
  }

  get category() {
    return leaderboardCategoryOf(this.code)
  }

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

  toPublic() {
    return {
      code: this.code,
      category: this.category,
      message: PUBLIC_MESSAGE_BY_CATEGORY[this.category],
    }
  }
}

export const leaderboardError = Object.freeze({
  invalidInput(reason) {
    return new LeaderboardError({
      code: LEADERBOARD_ERROR_CODES.INVALID_INPUT,
      message: `Invalid leaderboard input: ${reason}`,
      details: { reason },
    })
  },
  streamUnavailable() {
    return new LeaderboardError({
      code: LEADERBOARD_ERROR_CODES.STREAM_UNAVAILABLE,
      message: 'The requested STEM stream leaderboard is not available.',
    })
  },
  internal(reason) {
    return new LeaderboardError({
      code: LEADERBOARD_ERROR_CODES.INTERNAL,
      message: 'Unexpected Leaderboard Service failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  LeaderboardError,
  LEADERBOARD_ERROR_CODES,
  leaderboardCategoryOf,
  leaderboardError,
}