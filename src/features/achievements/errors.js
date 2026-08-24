/**
 * Achievements — error model (Task 5.8).
 *
 * One consistent error type with stable machine-readable codes, mirroring the
 * Leaderboard / Student error style. Categories keep public messages safe —
 * never leak server internals, tokens, codes or personal data.
 *
 * The student routes are authenticated (401 when a valid session token is
 * absent); the public certificate verification route never exposes private
 * data and distinguishes valid / revoked / unknown codes safely (D-031).
 */

/** Stable Achievements error codes. */
export const ACHIEVEMENTS_ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'ACHIEVEMENTS_INVALID_INPUT',
  UNAUTHORIZED: 'ACHIEVEMENTS_UNAUTHORIZED',
  NOT_FOUND: 'ACHIEVEMENTS_NOT_FOUND',
  REVOKED: 'ACHIEVEMENTS_REVOKED',
  PDF_FAILED: 'ACHIEVEMENTS_PDF_FAILED',
  INTERNAL: 'ACHIEVEMENTS_INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [ACHIEVEMENTS_ERROR_CODES.INVALID_INPUT]: 'VALIDATION',
  [ACHIEVEMENTS_ERROR_CODES.UNAUTHORIZED]: 'AUTHENTICATION',
  [ACHIEVEMENTS_ERROR_CODES.NOT_FOUND]: 'AVAILABILITY',
  [ACHIEVEMENTS_ERROR_CODES.REVOKED]: 'AVAILABILITY',
  [ACHIEVEMENTS_ERROR_CODES.PDF_FAILED]: 'INTERNAL',
  [ACHIEVEMENTS_ERROR_CODES.INTERNAL]: 'INTERNAL',
})

const PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  VALIDATION: 'Please choose valid achievements and try again.',
  AUTHENTICATION: 'Please sign in to view your achievements.',
  AVAILABILITY: 'This certificate is not available right now.',
  INTERNAL: 'An unexpected problem occurred. Please try again.',
})

export function achievementsCategoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? 'INTERNAL'
}

export class AchievementsError extends Error {
  constructor({ code, message, path = null, details = null }) {
    super(message)
    this.name = 'AchievementsError'
    this.code = code
    this.path = path
    this.details = details
  }

  get category() {
    return achievementsCategoryOf(this.code)
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

export const achievementsError = Object.freeze({
  invalidInput(reason) {
    return new AchievementsError({
      code: ACHIEVEMENTS_ERROR_CODES.INVALID_INPUT,
      message: `Invalid achievements input: ${reason}`,
      details: { reason },
    })
  },
  unauthorized(reason) {
    return new AchievementsError({
      code: ACHIEVEMENTS_ERROR_CODES.UNAUTHORIZED,
      message: `Authentication required: ${reason}`,
      details: { reason },
    })
  },
  notFound(reason) {
    return new AchievementsError({
      code: ACHIEVEMENTS_ERROR_CODES.NOT_FOUND,
      message: `Not found: ${reason}`,
      details: { reason },
    })
  },
  revoked(reason) {
    return new AchievementsError({
      code: ACHIEVEMENTS_ERROR_CODES.REVOKED,
      message: `Certificate revoked: ${reason}`,
      details: { reason },
    })
  },
  pdfFailed(reason) {
    return new AchievementsError({
      code: ACHIEVEMENTS_ERROR_CODES.PDF_FAILED,
      message: 'Certificate generation failed.',
      details: reason ? { reason } : null,
    })
  },
  internal(reason) {
    return new AchievementsError({
      code: ACHIEVEMENTS_ERROR_CODES.INTERNAL,
      message: 'Unexpected Achievements Service failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  AchievementsError,
  ACHIEVEMENTS_ERROR_CODES,
  achievementsCategoryOf,
  achievementsError,
}