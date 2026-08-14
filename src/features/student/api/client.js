/**
 * Student — browser API client (Task 5.1).
 *
 * The ONLY student surface React may touch. Pure fetching against the Hono
 * API; all authority stays server-side. No Supabase calls here — the browser
 * never talks to Supabase (D-027).
 */

const BASE = '/api/student'

export class StudentApiError extends Error {
  constructor(status, payload) {
    super(payload?.message ?? `Request failed (${status})`)
    this.name = 'StudentApiError'
    this.status = status
    this.code = payload?.code ?? null
    this.category = payload?.category ?? null
  }
}

async function request(path, { method = 'GET', token, json, formData } = {}) {
  const headers = {}
  let body
  if (token) headers['authorization'] = `Bearer ${token}`
  if (formData) {
    body = formData
  } else if (json !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(json)
  }

  const resp = await fetch(`${BASE}${path}`, { method, headers, body })
  const parsed = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new StudentApiError(resp.status, parsed?.error)
  }
  return parsed
}

export const studentApiClient = Object.freeze({
  registerStudent({ initials, name, school, grade }) {
    return request('/register', { method: 'POST', json: { initials, name, school, grade } })
  },
  getMe(token) {
    return request('/me', { token })
  },
  uploadAvatar({ token, file }) {
    const formData = new FormData()
    formData.append('photo', file)
    return request('/me/avatar', { method: 'PUT', token, formData })
  },
})

export default studentApiClient