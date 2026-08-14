/**
 * Game Session — browser API client (Task 4.4).
 *
 * The ONLY game-session surface React may touch. It does pure fetching; all
 * authority stays server-side. Correct answers and scores are never computed
 * here — the server returns only safe descriptors and results.
 */

const BASE = '/api/game'

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.message ?? `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = payload?.code ?? null
    this.category = payload?.category ?? null
  }
}

async function request(path, { method = 'GET', studentId, body } = {}) {
  const headers = {}
  if (studentId !== undefined) headers['x-student-id'] = String(studentId)
  if (body !== undefined) headers['content-type'] = 'application/json'

  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new ApiError(resp.status, json?.error)
  }
  return json
}

export const gameApiClient = Object.freeze({
  startSession({ studentId, streamId, levelId, metadata }) {
    return request('/sessions', { method: 'POST', studentId, body: { studentId, streamId, levelId, metadata } })
  },
  getCurrentRound({ sessionId, studentId }) {
    return request(`/sessions/${sessionId}/current`, { studentId })
  },
  submitRound({ sessionId, roundId, studentId, response, interactionMetrics }) {
    return request(`/sessions/${sessionId}/rounds/${roundId}/submit`, {
      method: 'POST',
      studentId,
      body: { response, interactionMetrics },
    })
  },
  finishSession({ sessionId, studentId }) {
    return request(`/sessions/${sessionId}/finish`, { method: 'POST', studentId })
  },
})

export default gameApiClient