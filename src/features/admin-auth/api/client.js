/**
 * Admin auth — browser API client (Task 5.9).
 *
 * Pure fetching against the Hono admin API. The ONLY request the console
 * makes is `GET /api/admin/me` with the Supabase access token; the server
 * validates the token and authorizes against `public.admins`. No Supabase
 * calls here beyond the browser's own sign-in (admin-auth-client). Tokens are
 * sent in the Authorization header, never in URLs.
 */

const BASE = '/api/admin'

export class AdminApiError extends Error {
  constructor(status, payload) {
    super(payload?.message ?? `Request failed (${status})`)
    this.name = 'AdminApiError'
    this.status = status
    this.code = payload?.code ?? null
  }
}

async function request(path, { token } = {}) {
  const headers = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  const resp = await fetch(`${BASE}${path}`, { headers })
  const parsed = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new AdminApiError(resp.status, parsed?.error)
  }
  return parsed
}

export const adminApiClient = Object.freeze({
  /** Safe admin identity: `{ admin: { id, displayName, role } }`. */
  getMe(token) {
    return request('/me', { token })
  },
})

export default adminApiClient