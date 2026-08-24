/**
 * Mission — error model (Task 5.2).
 *
 * One consistent error type with stable machine-readable codes for the
 * student mission-selection layer, mirroring the Student / Game Engine /
 * Activity Engine error style. Categories keep public messages safe — never
 * leak server internals, tokens, or personal data.
 *
 * Authentication itself is delegated to the existing StudentService
 * (`/me` session check) — this layer only maps its own availability/
 * validation failures. No second authentication system (D-005/D-027).
 */

/** Stable Mission error codes. */
export const MISSION_ERROR_CODES = Object.freeze({
  UNAUTHORIZED: 'MISSION_UNAUTHORIZED',
  INVALID_INPUT: 'MISSION_INVALID_INPUT',
  STREAM_UNAVAILABLE: 'MISSION_STREAM_UNAVAILABLE',
  LEVEL_UNAVAILABLE: 'MISSION_LEVEL_UNAVAILABLE',
  INTERNAL: 'MISSION_INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [MISSION_ERROR_CODES.UNAUTHORIZED]: 'SECURITY',
  [MISSION_ERROR_CODES.INVALID_INPUT]: 'VALIDATION',
  [MISSION_ERROR_CODES.STREAM_UNAVAILABLE]: 'AVAILABILITY',
  [MISSION_ERROR_CODES.LEVEL_UNAVAILABLE]: 'AVAILABILITY',
  [MISSION_ERROR_CODES.INTERNAL]: 'INTERNAL',
})

const PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  SECURITY: 'Your session could not be verified. Please start again.',
  VALIDATION: 'Please choose a valid mission and try again.',
  AVAILABILITY: 'This mission is not available right now.',
  INTERNAL: 'An unexpected problem occurred. Please try again.',
})

export function missionCategoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? 'INTERNAL'
}

export class MissionError extends Error {
  constructor({ code, message, path = null, details = null }) {
    super(message)
    this.name = 'MissionError'
    this.code = code
    this.path = path
    this.details = details
  }

  get category() {
    return missionCategoryOf(this.code)
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

export const missionError = Object.freeze({
  unauthorized() {
    return new MissionError({
      code: MISSION_ERROR_CODES.UNAUTHORIZED,
      message: 'A student session token is required for mission selection.',
    })
  },
  invalidInput(reason) {
    return new MissionError({
      code: MISSION_ERROR_CODES.INVALID_INPUT,
      message: `Invalid mission selection input: ${reason}`,
      details: { reason },
    })
  },
  streamUnavailable() {
    return new MissionError({
      code: MISSION_ERROR_CODES.STREAM_UNAVAILABLE,
      message: 'The requested STEM stream is not available.',
    })
  },
  levelUnavailable() {
    return new MissionError({
      code: MISSION_ERROR_CODES.LEVEL_UNAVAILABLE,
      message: 'The requested level is not available for this stream.',
    })
  },
  internal(reason) {
    return new MissionError({
      code: MISSION_ERROR_CODES.INTERNAL,
      message: 'Unexpected Mission Selection Service failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  MissionError,
  MISSION_ERROR_CODES,
  missionCategoryOf,
  missionError,
}