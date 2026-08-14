/**
 * Activity Engine — error model (Task 4.1).
 *
 * One consistent error type with stable machine-readable codes. Errors are
 * categorised so callers can distinguish developer/configuration errors from
 * authoring errors, invalid student answers, unavailable activities, and
 * internal engine failures — without leaking server internals to students.
 */

/** Stable error codes, grouped by category. */
export const ERROR_CODES = Object.freeze({
  // developer / configuration errors
  REGISTRATION_DUPLICATE_TYPE: 'REGISTRATION_DUPLICATE_TYPE',
  REGISTRATION_MISSING_METHOD: 'REGISTRATION_MISSING_METHOD',
  REGISTRATION_INVALID_IDENTIFIER: 'REGISTRATION_INVALID_IDENTIFIER',
  REGISTRATION_INVALID_METADATA: 'REGISTRATION_INVALID_METADATA',
  ENGINE_CLIENT_MODE: 'ENGINE_CLIENT_MODE',
  ENGINE_INTERNAL: 'ENGINE_INTERNAL',

  // authoring errors (validatePayload)
  ACTIVITY_PAYLOAD_INVALID: 'ACTIVITY_PAYLOAD_INVALID',
  ACTIVITY_PAYLOAD_SEMANTIC_INVALID: 'ACTIVITY_PAYLOAD_SEMANTIC_INVALID',
  SCHEMA_NOT_FOUND: 'SCHEMA_NOT_FOUND',
  SCHEMA_VERSION_INCOMPATIBLE: 'SCHEMA_VERSION_INCOMPATIBLE',

  // invalid student answers (validateAnswer)
  ACTIVITY_ANSWER_INVALID: 'ACTIVITY_ANSWER_INVALID',
  SCORING_INPUTS_INVALID: 'SCORING_INPUTS_INVALID',

  // unavailable activities
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  ACTIVITY_UNAVAILABLE: 'ACTIVITY_UNAVAILABLE',

  // security boundary
  SECURITY_CORRECT_ANSWER_EXPOSED: 'SECURITY_CORRECT_ANSWER_EXPOSED',
})

/**
 * Categorisation of every error code. Used to decide what a student-facing
 * public error message may reveal.
 */
export const ERROR_CATEGORIES = Object.freeze({
  DEVELOPER: 'DEVELOPER',
  AUTHORING: 'AUTHORING',
  STUDENT_ANSWER: 'STUDENT_ANSWER',
  AVAILABILITY: 'AVAILABILITY',
  SECURITY: 'SECURITY',
  INTERNAL: 'INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [ERROR_CODES.REGISTRATION_DUPLICATE_TYPE]: ERROR_CATEGORIES.DEVELOPER,
  [ERROR_CODES.REGISTRATION_MISSING_METHOD]: ERROR_CATEGORIES.DEVELOPER,
  [ERROR_CODES.REGISTRATION_INVALID_IDENTIFIER]: ERROR_CATEGORIES.DEVELOPER,
  [ERROR_CODES.REGISTRATION_INVALID_METADATA]: ERROR_CATEGORIES.DEVELOPER,
  [ERROR_CODES.ENGINE_CLIENT_MODE]: ERROR_CATEGORIES.DEVELOPER,
  [ERROR_CODES.ENGINE_INTERNAL]: ERROR_CATEGORIES.INTERNAL,
  [ERROR_CODES.ACTIVITY_PAYLOAD_INVALID]: ERROR_CATEGORIES.AUTHORING,
  [ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID]: ERROR_CATEGORIES.AUTHORING,
  [ERROR_CODES.SCHEMA_NOT_FOUND]: ERROR_CATEGORIES.AUTHORING,
  [ERROR_CODES.SCHEMA_VERSION_INCOMPATIBLE]: ERROR_CATEGORIES.AUTHORING,
  [ERROR_CODES.ACTIVITY_ANSWER_INVALID]: ERROR_CATEGORIES.STUDENT_ANSWER,
  [ERROR_CODES.SCORING_INPUTS_INVALID]: ERROR_CATEGORIES.INTERNAL,
  [ERROR_CODES.ACTIVITY_NOT_FOUND]: ERROR_CATEGORIES.AVAILABILITY,
  [ERROR_CODES.ACTIVITY_UNAVAILABLE]: ERROR_CATEGORIES.AVAILABILITY,
  [ERROR_CODES.SECURITY_CORRECT_ANSWER_EXPOSED]: ERROR_CATEGORIES.SECURITY,
})

/** Safe, generic public message per category (never reveals internals). */
const PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  [ERROR_CATEGORIES.DEVELOPER]: 'The activity could not be configured.',
  [ERROR_CATEGORIES.AUTHORING]: 'This question could not be used.',
  [ERROR_CATEGORIES.STUDENT_ANSWER]: 'Your answer could not be processed.',
  [ERROR_CATEGORIES.AVAILABILITY]: 'This activity is not available.',
  [ERROR_CATEGORIES.SECURITY]: 'This activity is not available.',
  [ERROR_CATEGORIES.INTERNAL]: 'An unexpected problem occurred.',
})

export function categoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? ERROR_CATEGORIES.INTERNAL
}

/**
 * The single Activity Engine error type.
 */
export class ActivityEngineError extends Error {
  constructor({ code, message, activityType = null, path = null, details = null }) {
    super(message)
    this.name = 'ActivityEngineError'
    this.code = code
    this.activityType = activityType
    this.path = path
    this.details = details
  }

  get category() {
    return categoryOf(this.code)
  }

  /** Machine-readable form; never includes stack or server internals. */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
      activityType: this.activityType,
      path: this.path,
      details: this.details,
    }
  }

  /**
   * Student-safe public form. The message is the generic category message;
   * code/category are safe to expose; internal details are never included.
   */
  toPublic() {
    return {
      code: this.code,
      category: this.category,
      message: PUBLIC_MESSAGE_BY_CATEGORY[this.category],
    }
  }
}

/** Factory helpers to keep call sites terse and codes consistent. */
export const engineError = Object.freeze({
  duplicateType(type) {
    return new ActivityEngineError({
      code: ERROR_CODES.REGISTRATION_DUPLICATE_TYPE,
      message: `Activity type "${type}" is already registered.`,
      activityType: type,
    })
  },
  missingMethod(type, method) {
    return new ActivityEngineError({
      code: ERROR_CODES.REGISTRATION_MISSING_METHOD,
      message: `Plugin "${type}" must implement method "${method}".`,
      activityType: type,
    })
  },
  invalidIdentifier(type) {
    return new ActivityEngineError({
      code: ERROR_CODES.REGISTRATION_INVALID_IDENTIFIER,
      message: `Invalid activity type identifier "${type}".`,
      activityType: type,
    })
  },
  invalidMetadata(type, reason) {
    return new ActivityEngineError({
      code: ERROR_CODES.REGISTRATION_INVALID_METADATA,
      message: `Invalid plugin metadata for "${type}": ${reason}`,
      activityType: type,
    })
  },
  notFound(type) {
    return new ActivityEngineError({
      code: ERROR_CODES.ACTIVITY_NOT_FOUND,
      message: `Activity type "${type}" is not registered.`,
      activityType: type,
    })
  },
  unavailable(type, reason) {
    return new ActivityEngineError({
      code: ERROR_CODES.ACTIVITY_UNAVAILABLE,
      message: `Activity "${type}" is not available in this context.`,
      activityType: type,
      details: reason ? { reason } : null,
    })
  },
  payloadInvalid(type, errors) {
    return new ActivityEngineError({
      code: ERROR_CODES.ACTIVITY_PAYLOAD_INVALID,
      message: `Payload for activity "${type}" does not match its schema.`,
      activityType: type,
      details: { errors },
    })
  },
  payloadSemanticInvalid(type, errors) {
    return new ActivityEngineError({
      code: ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID,
      message: `Payload for activity "${type}" failed semantic rules.`,
      activityType: type,
      details: { errors },
    })
  },
  answerInvalid(type, reason) {
    return new ActivityEngineError({
      code: ERROR_CODES.ACTIVITY_ANSWER_INVALID,
      message: `Answer submitted for "${type}" is not a valid submission.`,
      activityType: type,
      details: reason ? { reason } : null,
    })
  },
  scoringInvalid(type, reason) {
    return new ActivityEngineError({
      code: ERROR_CODES.SCORING_INPUTS_INVALID,
      message: `Plugin "${type}" returned invalid scoring inputs.`,
      activityType: type,
      details: reason ? { reason } : null,
    })
  },
  schemaNotFound(type) {
    return new ActivityEngineError({
      code: ERROR_CODES.SCHEMA_NOT_FOUND,
      message: `No schema contract is registered for activity "${type}".`,
      activityType: type,
    })
  },
  schemaVersionIncompatible(type, pluginVersion, schemaVersion) {
    return new ActivityEngineError({
      code: ERROR_CODES.SCHEMA_VERSION_INCOMPATIBLE,
      message:
        `Plugin "${type}" schemaVersion "${pluginVersion}" is not compatible ` +
        `with the resolved schema version "${schemaVersion}".`,
      activityType: type,
      details: { pluginVersion, schemaVersion },
    })
  },
  clientMode(method) {
    return new ActivityEngineError({
      code: ERROR_CODES.ENGINE_CLIENT_MODE,
      message: `"${method}" is server-only and unavailable in client mode.`,
    })
  },
  correctAnswerExposed() {
    return new ActivityEngineError({
      code: ERROR_CODES.SECURITY_CORRECT_ANSWER_EXPOSED,
      message: 'Correct-answer data must never reach the render context.',
    })
  },
  internal(reason) {
    return new ActivityEngineError({
      code: ERROR_CODES.ENGINE_INTERNAL,
      message: 'Unexpected Activity Engine failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  ActivityEngineError,
  ERROR_CODES,
  ERROR_CATEGORIES,
  categoryOf,
  engineError,
}
