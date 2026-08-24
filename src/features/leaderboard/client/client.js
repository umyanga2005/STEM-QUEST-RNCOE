/**
 * Leaderboard — browser API client (Task 5.7).
 *
 * Pure fetching against the Hono API. Leaderboards are public read surfaces:
 * the token is OPTIONAL and only enables the server-side self-highlight.
 * All authority stays server-side — scores/ranks/display names are never
 * submitted, only rendered. No Supabase calls here; the browser's single
 * approved Supabase contact is the Realtime channel (D-080), which lives in
 * the realtime module.
 */

const BASE = '/api/student/leaderboards'

export class LeaderboardApiError extends Error {
  constructor(status, payload) {
    super(payload?.message ?? `Request failed (${status})`)
    this.name = 'LeaderboardApiError'
    this.status = status
    this.code = payload?.code ?? null
    this.category = payload?.category ?? null
  }
}

async function request(path, { token } = {}) {
  const headers = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  const resp = await fetch(`${BASE}${path}`, { headers })
  const parsed = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new LeaderboardApiError(resp.status, parsed?.error)
  }
  return parsed
}

export const leaderboardApiClient = Object.freeze({
  /** All four stream boards: `{ leaderboards: [{ stream, entries }] }`. */
  getAllLeaderboards(token) {
    return request('', { token })
  },
  /** One stream board: `{ stream, entries }`. */
  getStreamLeaderboard(token, streamId) {
    return request(`/${encodeURIComponent(streamId)}`, { token })
  },
})

export default leaderboardApiClient