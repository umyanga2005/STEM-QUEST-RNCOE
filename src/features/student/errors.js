/**
 * Student — error model (Task 5.1).
 *
 * One consistent error type with stable machine-readable codes for the
 * student registration/session layer, mirroring the Game Engine / Activity
 * Engine error style. Categories keep public messages safe (never leak
 * server internals, token material, or personal data).
 */

/** Stable Student error codes. */
export const STUDENT_ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'STUDENT_INVALID_INPUT',
  UNEXPECTED_FIELD: 'STUDENT_UNEXPECTED_FIELD',
  UNAUTHORIZED: 'STUDENT_UNAUTHORIZED',
  INVALID_TOKEN: 'STUDENT_INVALID_TOKEN',
  TOKEN_EXPIRED: 'STUDENT_TOKEN_EXPIRED',
  TOKEN_REVOKED: 'STUDENT_TOKEN_REVOKED',
  NOT_FOUND: 'STUDENT_NOT_FOUND',
  DISABLED: 'STUDENT_DISABLED',
  AVATAR_INVALID: 'STUDENT_AVATAR_INVALID',
  AVATAR_TOO_LARGE: 'STUDENT_AVATAR_TOO_LARGE',
  AVATAR_STORAGE_FAILED: 'STUDENT_AVATAR_STORAGE_FAILED',
  INTERNAL: 'STUDENT_INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [STUDENT_ERROR_CODES.INVALID_INPUT]: 'VALIDATION',
  [STUDENT_ERROR_CODES.UNEXPECTED_FIELD]: 'VALIDATION',
  [STUDENT_ERROR_CODES.UNAUTHORIZED]: 'SECURITY',
  [STUDENT_ERROR_CODES.INVALID_TOKEN]: 'SECURITY',
  [STUDENT_ERROR_CODES.TOKEN_EXPIRED]: 'SECURITY',
  [STUDENT_ERROR_CODES.TOKEN_REVOKED]: 'SECURITY',
  [STUDENT_ERROR_CODES.NOT_FOUND]: 'AVAILABILITY',
  [STUDENT_ERROR_CODES.DISABLED]: 'AVAILABILITY',
  [STUDENT_ERROR_CODES.AVATAR_INVALID]: 'VALIDATION',
  [STUDENT_ERROR_CODES.AVATAR_TOO_LARGE]: 'VALIDATION',
  [STUDENT_ERROR_CODES.AVATAR_STORAGE_FAILED]: 'INTERNAL',
  [STUDENT_ERROR_CODES.INTERNAL]: 'INTERNAL',
})

const PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  VALIDATION: 'Please check the details you entered and try again.',
  SECURITY: 'Your session could not be verified. Please start again.',
  AVAILABILITY: 'This student record is not available.',
  INTERNAL: 'An unexpected problem occurred. Please try again.',
})

export function studentCategoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? 'INTERNAL'
}

export class StudentError extends Error {
  constructor({ code, message, path = null, details = null }) {
    super(message)
    this.name = 'StudentError'
    this.code = code
    this.path = path
    this.details = details
  }

  get category() {
    return studentCategoryOf(this.code)
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

export const studentError = Object.freeze({
  invalidInput(reason) {
    return new StudentError({
      code: STUDENT_ERROR_CODES.INVALID_INPUT,
      message: `Invalid student input: ${reason}`,
      details: { reason },
    })
  },
  unexpectedField(field) {
    return new StudentError({
      code: STUDENT_ERROR_CODES.UNEXPECTED_FIELD,
      message: `Unexpected field "${field}" is not allowed in this request.`,
      details: { field },
    })
  },
  unauthorized() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.UNAUTHORIZED,
      message: 'A student session token is required.',
    })
  },
  invalidToken() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.INVALID_TOKEN,
      message: 'The session token is not recognised.',
    })
  },
  tokenExpired() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.TOKEN_EXPIRED,
      message: 'The session token has expired.',
    })
  },
  tokenRevoked() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.TOKEN_REVOKED,
      message: 'The session token has been revoked.',
    })
  },
  notFound() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.NOT_FOUND,
      message: 'Student record not found.',
    })
  },
  disabled() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.DISABLED,
      message: 'This student account is not active.',
    })
  },
  avatarInvalid(reason) {
    return new StudentError({
      code: STUDENT_ERROR_CODES.AVATAR_INVALID,
      message: `Profile photo rejected: ${reason}`,
      details: { reason },
    })
  },
  avatarTooLarge() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.AVATAR_TOO_LARGE,
      message: 'Profile photo is larger than 200 KB.',
    })
  },
  avatarStorageFailed() {
    return new StudentError({
      code: STUDENT_ERROR_CODES.AVATAR_STORAGE_FAILED,
      message: 'The profile photo could not be stored.',
    })
  },
  internal(reason) {
    return new StudentError({
      code: STUDENT_ERROR_CODES.INTERNAL,
      message: 'Unexpected Student Service failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  StudentError,
  STUDENT_ERROR_CODES,
  studentCategoryOf,
  studentError,
}