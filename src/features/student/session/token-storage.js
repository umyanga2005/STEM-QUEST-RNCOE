/**
 * Student — lightweight session token storage (Task 5.1).
 *
 * The ONLY value stored in the browser is the opaque session token issued at
 * registration (the architecture's intended lightweight student session).
 * Stored minimal and session-scoped (cleared when the tab closes — right for
 * a shared exhibition kiosk). Never stored here: the token hash, service-role
 * key, Supabase secrets, or admin credentials.
 *
 * Injection-friendly (storage argument) so tests can drive it without a DOM.
 */

const DEFAULT_KEY = 'stemquest.student.token'

export function createTokenStorage({ storage = globalThis.sessionStorage, key = DEFAULT_KEY } = {}) {
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
        // Storage unavailable (e.g. private mode) — the session is lost on
        // refresh but the registration still succeeds in this tab.
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

export const tokenStorage = createTokenStorage()

export default tokenStorage