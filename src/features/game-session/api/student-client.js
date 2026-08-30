/**
 * Game Session — student browser API client (Task 5.3).
 *
 * The ONLY game surface the `/student/game` React screen may touch. Pure
 * fetching against the student-authenticated Hono adapter; all authority
 * stays in GameSessionService behind it. Correct answers and scores are never
 * computed here — the adapter returns only safe descriptors and results.
 *
 * Reuses the student client's error type (StudentApiError) so a 401 from the
 * session check is indistinguishable from the rest of the student flow and
 * the expired-session guard reacts identically.
 */

import { StudentApiError } from '../../student/api/client.js'

const BASE = '/api/student/game'

async function request(path, { method = 'GET', token, json } = {}) {
  const headers = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  if (json !== undefined) headers['content-type'] = 'application/json'

  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : undefined,
  })

  const parsed = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new StudentApiError(resp.status, parsed?.error)
  }
  return parsed
}

export const gameStudentClient = Object.freeze({
  startSession({ token, streamId, levelId, metadata }) {
    return request('/session', { method: 'POST', token, json: { streamId, levelId, metadata } })
  },
  getCurrentRound({ token, sessionId }) {
    return request(`/session/${encodeURIComponent(sessionId)}/current`, { token })
  },
  submitRound({ token, sessionId, roundId, response, interactionMetrics }) {
    return request(`/session/${encodeURIComponent(sessionId)}/rounds/${encodeURIComponent(roundId)}/submit`, {
      method: 'POST',
      token,
      json: { response, interactionMetrics },
    })
  },
  finishSession({ token, sessionId }) {
    return request(`/session/${encodeURIComponent(sessionId)}/finish`, { method: 'POST', token })
  },
  abandonSession({ token, sessionId }) {
    return request(`/session/${encodeURIComponent(sessionId)}/abandon`, { method: 'POST', token })
  },
})

export default gameStudentClient