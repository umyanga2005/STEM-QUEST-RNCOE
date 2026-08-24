/**
 * Admin Question Builder — error model (Task 5.10).
 *
 * One consistent error type for the question authoring surface, mirroring the
 * Admin / Achievements / Leaderboard error style. The public message is always
 * generic; field-level validation detail travels in `fields` and is only
 * included for VALIDATION errors (safe, authored by the schema rules — never
 * server internals). correctAnswer payloads and service-role secrets never
 * appear in any public form.
 */

/** Stable Question Builder error codes. */
export const QUESTION_ERROR_CODES = Object.freeze({
  UNAUTHORIZED: 'QUESTION_UNAUTHORIZED',
  VALIDATION: 'QUESTION_VALIDATION_FAILED',
  NOT_FOUND: 'QUESTION_NOT_FOUND',
  STATUS_BLOCKED: 'QUESTION_STATUS_BLOCKED',
  CATALOG_UNKNOWN: 'QUESTION_CATALOG_UNKNOWN',
  UNEXPECTED_FIELD: 'QUESTION_UNEXPECTED_FIELD',
  MEDIA_VALIDATION: 'QUESTION_MEDIA_VALIDATION_FAILED',
  MEDIA_NOT_FOUND: 'QUESTION_MEDIA_NOT_FOUND',
  MEDIA_IN_USE: 'QUESTION_MEDIA_IN_USE',
  MEDIA_FORBIDDEN: 'QUESTION_MEDIA_FORBIDDEN',
  INVALID_STATE: 'QUESTION_INVALID_STATE',
  REVIEW_NOTE_REQUIRED: 'QUESTION_REVIEW_NOTE_REQUIRED',
  APPROVAL_STALE: 'QUESTION_APPROVAL_STALE',
  INTERNAL: 'QUESTION_INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [QUESTION_ERROR_CODES.UNAUTHORIZED]: 'AUTHORIZATION',
  [QUESTION_ERROR_CODES.VALIDATION]: 'VALIDATION',
  [QUESTION_ERROR_CODES.NOT_FOUND]: 'AVAILABILITY',
  [QUESTION_ERROR_CODES.STATUS_BLOCKED]: 'VALIDATION',
  [QUESTION_ERROR_CODES.CATALOG_UNKNOWN]: 'VALIDATION',
  [QUESTION_ERROR_CODES.UNEXPECTED_FIELD]: 'VALIDATION',
  [QUESTION_ERROR_CODES.MEDIA_VALIDATION]: 'VALIDATION',
  [QUESTION_ERROR_CODES.MEDIA_NOT_FOUND]: 'AVAILABILITY',
  [QUESTION_ERROR_CODES.MEDIA_IN_USE]: 'VALIDATION',
  [QUESTION_ERROR_CODES.MEDIA_FORBIDDEN]: 'AUTHORIZATION',
  [QUESTION_ERROR_CODES.INVALID_STATE]: 'VALIDATION',
  [QUESTION_ERROR_CODES.REVIEW_NOTE_REQUIRED]: 'VALIDATION',
  [QUESTION_ERROR_CODES.APPROVAL_STALE]: 'VALIDATION',
  [QUESTION_ERROR_CODES.INTERNAL]: 'INTERNAL',
})

const PUBLIC_MESSAGE_BY_CODE = Object.freeze({
  [QUESTION_ERROR_CODES.UNAUTHORIZED]: 'This action requires administrator access.',
  [QUESTION_ERROR_CODES.VALIDATION]: 'The question draft does not pass validation.',
  [QUESTION_ERROR_CODES.NOT_FOUND]: 'The requested question was not found.',
  [QUESTION_ERROR_CODES.STATUS_BLOCKED]: 'Published questions are versioned and cannot be edited directly.',
  [QUESTION_ERROR_CODES.CATALOG_UNKNOWN]: 'The question references an unknown stream, level or activity type.',
  [QUESTION_ERROR_CODES.UNEXPECTED_FIELD]: 'The question draft contains a field this builder does not accept.',
  [QUESTION_ERROR_CODES.MEDIA_VALIDATION]: 'The uploaded image is not valid.',
  [QUESTION_ERROR_CODES.MEDIA_NOT_FOUND]: 'The requested image was not found.',
  [QUESTION_ERROR_CODES.MEDIA_IN_USE]: 'The image is still referenced by another question.',
  [QUESTION_ERROR_CODES.MEDIA_FORBIDDEN]: 'This image belongs to a different administrator account.',
  [QUESTION_ERROR_CODES.INVALID_STATE]: 'The question is not in a state that allows this lifecycle action.',
  [QUESTION_ERROR_CODES.REVIEW_NOTE_REQUIRED]: 'A review note is required for this lifecycle action.',
  [QUESTION_ERROR_CODES.APPROVAL_STALE]: 'The approved review no longer matches the current question version.',
  [QUESTION_ERROR_CODES.INTERNAL]: 'An unexpected problem occurred. Please try again.',
})

export function questionCategoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? 'INTERNAL'
}

export class QuestionError extends Error {
  constructor({ code, message, details = null, fields = null }) {
    super(message)
    this.name = 'QuestionError'
    this.code = code
    this.details = details
    this.fields = fields
  }

  get category() {
    return questionCategoryOf(this.code)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      fields: this.fields,
      details: this.details,
    }
  }

  toPublic() {
    const out = {
      code: this.code,
      category: this.category,
      message: PUBLIC_MESSAGE_BY_CODE[this.code],
    }
    if (this.fields && this.fields.length > 0) {
      // Field-level detail is safe: it is produced by the schema/semantic
      // rules, never by server internals. The messages are human-readable
      // authoring guidance about the draft itself.
      out.fields = this.fields
    }
    return out
  }
}

export const questionError = Object.freeze({
  unauthorized(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.UNAUTHORIZED,
      message: `Question builder authorization failed: ${reason}`,
      details: { reason },
    })
  },
  validation(fields) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.VALIDATION,
      message: 'The question draft failed one or more validation layers.',
      fields: fields ?? [],
    })
  },
  notFound(reason = 'unknown question id') {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.NOT_FOUND,
      message: `Question not found: ${reason}`,
      details: { reason },
    })
  },
  statusBlocked(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.STATUS_BLOCKED,
      message: `Cannot edit a published question: ${reason}`,
      details: { reason },
    })
  },
  catalogUnknown(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.CATALOG_UNKNOWN,
      message: `Unknown catalogue reference: ${reason}`,
      details: { reason },
    })
  },
  unexpectedField(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.UNEXPECTED_FIELD,
      message: `Unexpected field: ${reason}`,
      details: { reason },
    })
  },
  mediaValidation(fields) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.MEDIA_VALIDATION,
      message: 'The uploaded image failed validation.',
      fields: fields ?? [],
    })
  },
  mediaNotFound(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.MEDIA_NOT_FOUND,
      message: `Question media not found: ${reason}`,
      details: { reason },
    })
  },
  mediaInUse(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.MEDIA_IN_USE,
      message: `Question media is still referenced: ${reason}`,
      details: { reason },
    })
  },
  mediaForbidden(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.MEDIA_FORBIDDEN,
      message: `Question media ownership mismatch: ${reason}`,
      details: { reason },
    })
  },
  invalidState(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.INVALID_STATE,
      message: `Question lifecycle state mismatch: ${reason}`,
      details: { reason },
    })
  },
  reviewNoteRequired() {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.REVIEW_NOTE_REQUIRED,
      message: 'A review note is required when rejecting a question.',
    })
  },
  approvalStale(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.APPROVAL_STALE,
      message: `The approved review does not match the current version: ${reason}`,
      details: { reason },
    })
  },
  internal(reason) {
    return new QuestionError({
      code: QUESTION_ERROR_CODES.INTERNAL,
      message: 'Unexpected Question Builder failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  QuestionError,
  QUESTION_ERROR_CODES,
  questionCategoryOf,
  questionError,
}