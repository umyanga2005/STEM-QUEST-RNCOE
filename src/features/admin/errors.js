/**
 * Admin — error model (Task 5.9).
 *
 * One consistent error type with stable machine-readable codes, mirroring the
 * Achievements / Leaderboard / Student error style. Categories keep public
 * messages safe — never leak server internals, tokens, emails or Supabase
 * secrets.
 *
 * The admin API authenticates via a Supabase Auth access token (browser signs
 * in with the public anon key) and authorizes against the existing
 * `public.admins` + `public.is_admin()` model (D-024/D-028): unauthenticated
 * → 401, authenticated non-admin → 403. A student session token (an opaque
 * random string, not a JWT) never validates → 401, so it can never grant
 * admin access.
 */

/** Stable Admin error codes. */
export const ADMIN_ERROR_CODES = Object.freeze({
  UNAUTHENTICATED: 'ADMIN_UNAUTHENTICATED',
  INVALID_TOKEN: 'ADMIN_INVALID_TOKEN',
  FORBIDDEN: 'ADMIN_FORBIDDEN',
  UNAVAILABLE: 'ADMIN_UNAVAILABLE',
  INTERNAL: 'ADMIN_INTERNAL',
})

const CATEGORY_BY_CODE = Object.freeze({
  [ADMIN_ERROR_CODES.UNAUTHENTICATED]: 'AUTHENTICATION',
  [ADMIN_ERROR_CODES.INVALID_TOKEN]: 'AUTHENTICATION',
  [ADMIN_ERROR_CODES.FORBIDDEN]: 'AUTHORIZATION',
  [ADMIN_ERROR_CODES.UNAVAILABLE]: 'AVAILABILITY',
  [ADMIN_ERROR_CODES.INTERNAL]: 'INTERNAL',
})

const PUBLIC_MESSAGE_BY_CATEGORY = Object.freeze({
  AUTHENTICATION: 'Please sign in to continue.',
  AUTHORIZATION: 'This account is not an administrator.',
  AVAILABILITY: 'Administrator access is not available right now.',
  INTERNAL: 'An unexpected problem occurred. Please try again.',
})

export function adminCategoryOf(code) {
  return CATEGORY_BY_CODE[code] ?? 'INTERNAL'
}

export class AdminError extends Error {
  constructor({ code, message, details = null }) {
    super(message)
    this.name = 'AdminError'
    this.code = code
    this.details = details
  }

  get category() {
    return adminCategoryOf(this.code)
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      message: this.message,
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

export const adminError = Object.freeze({
  unauthenticated(reason) {
    return new AdminError({
      code: ADMIN_ERROR_CODES.UNAUTHENTICATED,
      message: `Authentication required: ${reason}`,
      details: { reason },
    })
  },
  invalidToken(reason) {
    return new AdminError({
      code: ADMIN_ERROR_CODES.INVALID_TOKEN,
      message: `Invalid or expired session: ${reason}`,
      details: { reason },
    })
  },
  forbidden(reason) {
    return new AdminError({
      code: ADMIN_ERROR_CODES.FORBIDDEN,
      message: `Not an administrator: ${reason}`,
      details: { reason },
    })
  },
  unavailable(reason) {
    return new AdminError({
      code: ADMIN_ERROR_CODES.UNAVAILABLE,
      message: `Admin auth unavailable: ${reason}`,
      details: { reason },
    })
  },
  internal(reason) {
    return new AdminError({
      code: ADMIN_ERROR_CODES.INTERNAL,
      message: 'Unexpected Admin Service failure.',
      details: reason ? { reason } : null,
    })
  },
})

export default {
  AdminError,
  ADMIN_ERROR_CODES,
  adminCategoryOf,
  adminError,
}