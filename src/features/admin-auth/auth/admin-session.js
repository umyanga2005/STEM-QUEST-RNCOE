/**
 * Admin auth — session token storage (Task 5.9).
 *
 * The ONLY value stored in the browser for the admin console is the Supabase
 * access token issued at sign-in. Stored minimal and session-scoped (cleared
 * when the tab closes — right for a shared exhibition kiosk, mirroring the
 * student token storage). Never stored here: the password, refresh token,
 * service-role key, or any Supabase secret. On expiry the server returns 401
 * and the console returns to the login screen.
 *
 * Injection-friendly (storage argument) so tests can drive it without a DOM.
 */

const DEFAULT_KEY = 'stemquest.admin.token'

export function createAdminSessionStorage({ storage = globalThis.sessionStorage, key = DEFAULT_KEY } = {}) {
  return Object.freeze({
    read() {
      try {
        return storage?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    write(token) {
      try {
        storage?.setItem(key, token)
      } catch {
        // Storage unavailable (e.g. private mode) — the admin must sign in
        // again after a refresh, but the current tab still works.
      }
    },
    clear() {
      try {
        storage?.removeItem(key)
      } catch {
        // ignore
      }
    },
  })
}

export const adminSessionStorage = createAdminSessionStorage()

export default adminSessionStorage