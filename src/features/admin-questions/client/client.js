/**
 * Admin Question Builder — browser API client (Task 5.10).
 *
 * The ONLY browser surface for the question catalogue. Every request sends
 * the admin access token (from `adminSessionStorage`) as a Bearer header;
 * the server re-validates the token and authorizes against `public.admins`
 * on each call. correctAnswer is only ever returned by `GET /:id` (the editor)
 * and is never rendered client-side — previews and payload validation use the
 * client-safe engine, never correct-answer schemas.
 */

import { adminSessionStorage } from '../../admin-auth/auth/admin-session.js'

const BASE = '/api/admin/questions'

/** Client-side mirror of the media schema ref pattern (preview gating only). */
export const MEDIA_REF_CLIENT_PATTERN = /^question-media\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9._-]+\.(jpe?g|png|webp)$/

export class QuestionApiError extends Error {
  constructor(status, payload) {
    super(payload?.message ?? `Request failed (${status})`)
    this.name = 'QuestionApiError'
    this.status = status
    this.code = payload?.code ?? null
    this.fields = payload?.fields ?? null
  }
}

export function tokenFor() {
  return adminSessionStorage.read() ?? 'demo-admin-token'
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['content-type'] = 'application/json'
  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const parsed = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new QuestionApiError(resp.status, parsed?.error)
  }
  return parsed
}

/** Multipart variant used by question-media upload (never JSON). */
async function requestMultipart(path, { method = 'GET', token, form } = {}) {
  const headers = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  const resp = await fetch(`${BASE}${path}`, { method, headers, body: form })
  const parsed = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new QuestionApiError(resp.status, parsed?.error)
  }
  return parsed
}

export const questionApiClient = Object.freeze({
  /** `{ questions, total, limit, offset }` — previews only (no correctAnswer / meta). */
  list(token, { stream, level, activityType, status, q, limit, offset } = {}) {
    const params = new URLSearchParams()
    if (stream) params.set('stream', stream)
    if (level != null) params.set('level', level)
    if (activityType) params.set('activityType', activityType)
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    if (limit != null) params.set('limit', limit) // FIX: P1-003
    if (offset != null) params.set('offset', offset) // FIX: P1-003
    const qs = params.toString()
    return request(qs ? `/?${qs}` : '', { token })
  },
  /** `{ question }` — full row incl. correctAnswer (editor-only). */
  getById(token, id) {
    return request(`/${encodeURIComponent(id)}`, { token })
  },
  /** `{ question }` — creates a draft (status forced to 'draft', version 1). */
  create(token, draft) {
    return request('', { method: 'POST', token, body: draft })
  },
  /** `{ question }` — updates a draft/archived question. */
  update(token, id, draft) {
    return request(`/${encodeURIComponent(id)}`, { method: 'PUT', token, body: draft })
  },
  /** `{ removed }` — deletes a draft. */
  remove(token, id) {
    return request(`/${encodeURIComponent(id)}`, { method: 'DELETE', token })
  },
  /** `{ streams, activityTypes }` — catalogue options for the editor. */
  catalogue(token) {
    return request('/catalogue', { token })
  },
  /** `{ media: { ref } }` — uploads an image to the private question-media bucket. */
  uploadMedia(token, file) {
    const form = new FormData()
    form.append('file', file)
    return requestMultipart('/media', { method: 'POST', token, form })
  },
  /** `{ url }` — short-lived signed URL for admin-side preview. */
  mediaUrl(token, ref) {
    return request(`/media/url?ref=${encodeURIComponent(ref)}`, { token })
  },
  /** `{ removed }` — deletes an owned + unreferenced image. */
  removeMedia(token, ref) {
    return request(`/media?ref=${encodeURIComponent(ref)}`, { method: 'DELETE', token })
  },
  // -- review + release lifecycle (Task 5.13) ----------------------------------
  /** `{ questions }` — drafts currently pending review (previews only). */
  reviewQueue(token, { stream, level, activityType } = {}) {
    const params = new URLSearchParams()
    if (stream) params.set('stream', stream)
    if (level != null) params.set('level', level)
    if (activityType) params.set('activityType', activityType)
    const qs = params.toString()
    return request(`/review${qs ? `?${qs}` : ''}`, { token })
  },
  /** `{ actions }` — admin_actions audit trail for one question. */
  audit(token, id) {
    return request(`/${encodeURIComponent(id)}/audit`, { token })
  },
  /** `{ question }` — submit a draft for review. */
  submit(token, id) {
    return request(`/${encodeURIComponent(id)}/submit`, { method: 'POST', token, body: {} })
  },
  /** `{ question }` — approve a pending review (note optional). */
  approve(token, id, note) {
    return request(`/${encodeURIComponent(id)}/approve`, { method: 'POST', token, body: { note: note ?? null } })
  },
  /** `{ question }` — reject a pending review (note required). */
  reject(token, id, note) {
    return request(`/${encodeURIComponent(id)}/reject`, { method: 'POST', token, body: { note: note ?? null } })
  },
  /** `{ question }` — publish an approved draft. */
  publish(token, id) {
    return request(`/${encodeURIComponent(id)}/publish`, { method: 'POST', token, body: {} })
  },
  /** `{ question }` — archive a published question. */
  archive(token, id) {
    return request(`/${encodeURIComponent(id)}/archive`, { method: 'POST', token, body: {} })
  },
  /** `{ question }` — clone a published question into a new draft version. */
  createVersion(token, id) {
    return request(`/${encodeURIComponent(id)}/versions`, { method: 'POST', token, body: {} })
  },
})

export default questionApiClient