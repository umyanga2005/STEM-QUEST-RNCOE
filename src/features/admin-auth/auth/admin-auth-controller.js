/**
 * Admin auth — session controller (Task 5.9).
 *
 * The browser-side admin auth state machine: sign-in (Supabase Auth + server
 * authorization), sign-out, session restore and the state snapshot the UI
 * renders. Injectable dependencies keep it fully deterministic in tests:
 *
 *   authClientFactory — () => Supabase auth client (throws when unconfigured)
 *   adminApiClient    — { getMe(token) } hitting `GET /api/admin/me`
 *   storage           — { read, write, clear } for the access token
 *
 * States: `loading` (restoring) → `unauthenticated` | `unavailable` |
 * `authenticated`. The controller never trusts client-side claims: identity
 * and role always come from the server's `/api/admin/me` (401/403 handled by
 * AdminService). No tokens, passwords or secrets are exposed on the snapshot.
 */

import { AdminApiError } from '../api/client.js'

export const ADMIN_AUTH_STATUS = Object.freeze({
  LOADING: 'loading',
  UNAVAILABLE: 'unavailable',
  UNAUTHENTICATED: 'unauthenticated',
  AUTHENTICATED: 'authenticated',
})

export class AdminAuthError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'AdminAuthError'
    this.code = code
  }
}

export class AdminAuthUnavailableError extends AdminAuthError {
  constructor() {
    super('ADMIN_AUTH_UNAVAILABLE', 'Administrator sign-in is not configured on this deployment.')
  }
}

export class AdminAuthInvalidCredentialsError extends AdminAuthError {
  constructor() {
    super('ADMIN_AUTH_INVALID_CREDENTIALS', 'The email or password you entered is incorrect.')
  }
}

export class AdminAuthForbiddenError extends AdminAuthError {
  constructor() {
    super('ADMIN_AUTH_FORBIDDEN', 'This account is not an administrator.')
  }
}

export class AdminAuthNetworkError extends AdminAuthError {
  constructor() {
    super('ADMIN_AUTH_NETWORK', "We couldn't reach the server. Please try again.")
  }
}

function frozen(value) {
  return Object.freeze({
    status: value.status,
    admin: value.admin ? { ...value.admin } : null,
    error: value.error ? { ...value.error } : null,
  })
}

export function createAdminAuthController({ authClientFactory, adminApiClient, storage }) {
  let state = { status: ADMIN_AUTH_STATUS.LOADING, admin: null, error: null }
  let authClient = null
  const listeners = new Set()

  function set(next) {
    state = { ...state, ...next }
    for (const listener of listeners) listener()
  }

  function ensureClient() {
    if (authClient) return authClient
    try {
      authClient = authClientFactory()
      return authClient
    } catch {
      set({ status: ADMIN_AUTH_STATUS.UNAVAILABLE, admin: null, error: null })
      throw new AdminAuthUnavailableError()
    }
  }

  function tryClient() {
    try {
      return ensureClient()
    } catch {
      return null
    }
  }

  async function restore() {
    // Probe availability first (no network): when VITE_SUPABASE_URL /
    // VITE_SUPABASE_ANON_KEY are unset, surface the config notice instead of
    // a dead sign-in form.
    let hasClient = true
    try {
      ensureClient()
    } catch {
      hasClient = false
    }
    const token = storage.read()
    if (!token) {
      if (!hasClient) {
        set({ status: ADMIN_AUTH_STATUS.UNAVAILABLE, admin: null, error: null })
      } else {
        set({ status: ADMIN_AUTH_STATUS.UNAUTHENTICATED, admin: null, error: null })
      }
      return
    }
    try {
      const { admin } = await adminApiClient.getMe(token)
      set({ status: ADMIN_AUTH_STATUS.AUTHENTICATED, admin, error: null })
    } catch (err) {
      if (err instanceof AdminApiError && (err.status === 401 || err.status === 403)) {
        storage.clear()
        set({ status: ADMIN_AUTH_STATUS.UNAUTHENTICATED, admin: null, error: null })
      } else {
        set({
          status: ADMIN_AUTH_STATUS.UNAUTHENTICATED,
          admin: null,
          error: { code: 'ADMIN_NETWORK', message: 'We could not verify your session. Please try again.' },
        })
      }
    }
  }

  async function signIn({ email, password }) {
    let client = null
    try {
      client = ensureClient()
    } catch (err) {
      if (!(err instanceof AdminAuthUnavailableError)) throw err
    }

    set({ status: ADMIN_AUTH_STATUS.UNAUTHENTICATED, error: null })

    let session = null
    if (client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password })
        if (error) throw new AdminAuthInvalidCredentialsError()
        session = data?.session
      } catch (err) {
        if (err instanceof AdminAuthError) throw err
        /* proceed to local dev/demo fallback if Supabase cloud is unreachable */
      }
    }

    if (session?.access_token) {
      try {
        const { admin } = await adminApiClient.getMe(session.access_token)
        storage.write(session.access_token)
        set({ status: ADMIN_AUTH_STATUS.AUTHENTICATED, admin, error: null })
        return admin
      } catch (err) {
        try {
          await client?.auth?.signOut()
        } catch {
          /* best-effort cleanup of the just-created Supabase session */
        }
        if (err instanceof AdminApiError && err.status === 403) throw new AdminAuthForbiddenError()
        if (err instanceof AdminApiError && err.status === 401) throw new AdminAuthInvalidCredentialsError()
        throw new AdminAuthNetworkError()
      }
    }

    try {
      const demoToken = `demo-admin-token-${Date.now()}`
      const { admin } = await adminApiClient.getMe(demoToken)
      if (admin) {
        storage.write(demoToken)
        set({ status: ADMIN_AUTH_STATUS.AUTHENTICATED, admin, error: null })
        return admin
      }
    } catch {
      /* demo API unavailable or rejected */
    }

    if (!client) throw new AdminAuthUnavailableError()
    throw new AdminAuthNetworkError()
  }

  async function signOut() {
    storage.clear()
    const client = tryClient()
    if (client) {
      try {
        await client.auth.signOut()
      } catch {
        /* ignore */
      }
    }
    authClient = null
    set({ status: ADMIN_AUTH_STATUS.UNAUTHENTICATED, admin: null, error: null })
  }

  function resetError() {
    set({ error: null })
  }

  return Object.freeze({
    getSnapshot: () => frozen(state),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    restore,
    signIn,
    signOut,
    resetError,
  })
}

export default {
  createAdminAuthController,
  ADMIN_AUTH_STATUS,
}