/**
 * Admin Question Builder — question media API tests (Task 5.12).
 *
 * Security core of the private `question-media` upload surface:
 *   - auth matrix (missing/bogus/student token → 401, non-admin identity → 403)
 *   - upload validation (size, MIME, MIME/content mismatch, magic-byte sniff)
 *   - server-generated paths (never the client filename; traversal-proof)
 *   - ref pattern / bucket-injection rejection on preview + delete
 *   - signed-URL preview for authenticated admins only
 *   - ownership + in-use lifecycle: deleting/replacing can never destroy
 *     another question's media (incl. published/archived questions)
 *   - no secrets in any media payload
 * The suite runs against the memory repositories and, for the end-to-end
 * path, through the full production stack over the fake Supabase client.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createAdminApi } from '../../api/server.js'
import { adminError } from '../../errors.js'
import { QuestionService } from '../service/question-service.js'
import { QuestionMediaService } from '../service/media-service.js'
import { createQuestionValidator } from '../validation/question-validator.js'
import {
  createQuestionMemoryStore,
  createQuestionMemoryRepositories,
  seedQuestionStore,
} from '../repositories/memory.js'
import { QUESTION_ERROR_CODES } from '../errors.js'
import { makeDragDropDraft, seedQuestionCatalogue } from './fixtures.js'
import { createFakeSupabaseClient, addFakeAuthUser, seedFakeAdmin } from '../../../game-session/testing/fake-supabase-client.js'
import { createProductionApi } from '../../../game-session/api/production-server.js'
import { buildQuestionMediaPath, MEDIA_REF_PATTERN } from '../security/media.js'

const ADMIN_TOKEN = 'jwt-admin-1'
const PLAIN_TOKEN = 'jwt-plain-1'
const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111'
const PLAIN_USER_ID = '22222222-2222-4222-8222-222222222222'

const auth = (token) => ({ authorization: `Bearer ${token}` })

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])

function jpegForm() {
  const form = new FormData()
  form.append('file', new Blob([JPEG], { type: 'image/jpeg' }), 'photo.jpg')
  return form
}

function buildMediaApp() {
  const store = createQuestionMemoryStore()
  seedQuestionStore(store, seedQuestionCatalogue(store))
  const repos = createQuestionMemoryRepositories(store)
  const questionService = new QuestionService({
    questionRepository: repos.questionRepository,
    catalogueRepository: repos.catalogueRepository,
    validator: createQuestionValidator(),
  })
  const mediaService = new QuestionMediaService({
    mediaRepository: repos.mediaRepository,
    questionRepository: repos.questionRepository,
  })
  const adminService = {
    resolveAdmin: async (t) => {
      if (t === ADMIN_TOKEN) return { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' }
      throw adminError.invalidToken('token rejected by Supabase Auth')
    },
  }
  return { app: createAdminApi({ adminService, questionService, mediaService }), questionService, mediaService, repos, store }
}

/** Seeds a question row whose payload references `ref` (in-use guard). */
function seedReferencingQuestion(store, ref, { status = 'draft' } = {}) {
  seedQuestionStore(store, {
    questions: [
      {
        id: 9001,
        stream_id: 1,
        level_id: 1,
        activity_type_id: 1,
        prompt: 'A question that references the image.',
        payload: { schemaVersion: '1.0', media: [{ ref, alt: 'shared image' }] },
        correct_answer: {},
        status,
        version: 1,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// Auth matrix — every media route sits behind requireAdmin
// ---------------------------------------------------------------------------

test('POST /media without a token → 401 ADMIN_UNAUTHENTICATED', async () => {
  const { app } = buildMediaApp()
  const resp = await app.request('/api/admin/questions/media', { method: 'POST', body: jpegForm() })
  assert.equal(resp.status, 401)
  assert.equal((await resp.json()).error.code, 'ADMIN_UNAUTHENTICATED')
})

test('GET /media/url + DELETE /media with a bogus token → 401 ADMIN_INVALID_TOKEN', async () => {
  const { app } = buildMediaApp()
  const bad = { headers: auth('student-opaque-token') }
  const urlResp = await app.request('/api/admin/questions/media/url?ref=question-media/a/b/x.png', bad)
  assert.equal(urlResp.status, 401)
  assert.equal((await urlResp.json()).error.code, 'ADMIN_INVALID_TOKEN')
  const delResp = await app.request('/api/admin/questions/media?ref=question-media/a/b/x.png', { method: 'DELETE', ...bad })
  assert.equal(delResp.status, 401)
})

test('media routes reject a valid identity without an admins row → 403', async () => {
  const { client, db } = createFakeSupabaseClient()
  addFakeAuthUser(db, { token: PLAIN_TOKEN, userId: PLAIN_USER_ID })
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(PLAIN_TOKEN), body: jpegForm() })
  assert.equal(resp.status, 403)
  assert.equal((await resp.json()).error.code, 'ADMIN_FORBIDDEN')
})

// ---------------------------------------------------------------------------
// Upload — validation + safe server-generated paths
// ---------------------------------------------------------------------------

test('POST /media uploads a JPEG and returns a safe ref + stored object', async () => {
  const { app, store } = buildMediaApp()
  const resp = await app.request('/api/admin/questions/media', {
    method: 'POST',
    headers: auth(ADMIN_TOKEN),
    body: jpegForm(),
  })
  assert.equal(resp.status, 201)
  const body = await resp.json()
  assert.match(body.media.ref, MEDIA_REF_PATTERN)
  assert.ok(body.media.ref.startsWith(`question-media/${ADMIN_USER_ID}/uploads/`), 'owner is the admin identity')
  assert.ok(body.media.ref.endsWith('.jpg'), 'extension from the sniffed content')
  assert.equal(body.media.ref.includes('photo.jpg'), false, 'client filename is never used')
  assert.ok(store.media[body.media.ref], 'object stored at the returned path')
})

test('POST /media stores a PNG and a WebP as well', async () => {
  const { app } = buildMediaApp()
  const png = new FormData()
  png.append('file', new Blob([PNG], { type: 'image/png' }), 'x.png')
  const pngResp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(ADMIN_TOKEN), body: png })
  assert.equal(pngResp.status, 201)
  assert.ok((await pngResp.json()).media.ref.endsWith('.png'))

  const webp = new FormData()
  webp.append('file', new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], { type: 'image/webp' }), 'x.webp')
  const webpResp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(ADMIN_TOKEN), body: webp })
  assert.equal(webpResp.status, 201)
  assert.ok((await webpResp.json()).media.ref.endsWith('.webp'))
})

test('POST /media rejects an oversized image (400 MEDIA_VALIDATION)', async () => {
  const { app } = buildMediaApp()
  const big = new FormData()
  big.append('file', new Blob([new Uint8Array(1048577)], { type: 'image/jpeg' }), 'big.jpg')
  const resp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(ADMIN_TOKEN), body: big })
  assert.equal(resp.status, 400)
  const body = await resp.json()
  assert.equal(body.error.code, QUESTION_ERROR_CODES.MEDIA_VALIDATION)
  assert.equal(body.error.fields[0].code, 'TOO_LARGE')
})

test('POST /media rejects a non-image MIME type', async () => {
  const { app } = buildMediaApp()
  const svg = new FormData()
  svg.append('file', new Blob([new Uint8Array([0x3c, 0x73, 0x76, 0x67])], { type: 'image/svg+xml' }), 'x.svg')
  const resp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(ADMIN_TOKEN), body: svg })
  assert.equal(resp.status, 400)
  assert.equal((await resp.json()).error.fields[0].code, 'MIME')
})

test('POST /media rejects content that is not an image (magic-byte sniff)', async () => {
  const { app } = buildMediaApp()
  const text = new FormData()
  text.append('file', new Blob([new TextEncoder().encode('hello world not an image')], { type: 'image/png' }), 'x.png')
  const resp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(ADMIN_TOKEN), body: text })
  assert.equal(resp.status, 400)
  assert.equal((await resp.json()).error.fields[0].code, 'CONTENT')
})

test('POST /media rejects a MIME/content mismatch (claimed PNG, JPEG bytes)', async () => {
  const { app } = buildMediaApp()
  const mismatch = new FormData()
  mismatch.append('file', new Blob([JPEG], { type: 'image/png' }), 'x.png')
  const resp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(ADMIN_TOKEN), body: mismatch })
  assert.equal(resp.status, 400)
  assert.equal((await resp.json()).error.fields[0].code, 'MISMATCH')
})

test('POST /media rejects a missing/empty file field', async () => {
  const { app } = buildMediaApp()
  const empty = new FormData()
  const resp = await app.request('/api/admin/questions/media', { method: 'POST', headers: auth(ADMIN_TOKEN), body: empty })
  assert.equal(resp.status, 400)
  assert.equal((await resp.json()).error.fields[0].code, 'EMPTY')
})

test('buildQuestionMediaPath sanitizes the owner segment and never trusts filenames', () => {
  const path = buildQuestionMediaPath('../evil/../../etc', 'AbC-123', 'jpg')
  assert.equal(path, 'question-media/eviletc/uploads/abc-123.jpg')
  assert.match(path, MEDIA_REF_PATTERN)
})

// ---------------------------------------------------------------------------
// Preview (signed URL) — ref pattern + bucket injection
// ---------------------------------------------------------------------------

test('GET /media/url returns a signed URL for an existing object', async () => {
  const { app } = buildMediaApp()
  const created = await (await app.request('/api/admin/questions/media', {
    method: 'POST',
    headers: auth(ADMIN_TOKEN),
    body: jpegForm(),
  })).json()
  const resp = await app.request(`/api/admin/questions/media/url?ref=${encodeURIComponent(created.media.ref)}`, { headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.ok(body.url.startsWith(`memory://question-media/${created.media.ref}`))
})

test('GET /media/url rejects path traversal and bucket injection (400)', async () => {
  const { app } = buildMediaApp()
  for (const ref of [
    'question-media/../../etc/passwd.jpg',
    'student-avatars/1/profile.png',
    'question-media/a/b/c/../../d.png',
    '../question-media/a/b/c.png',
    'https://evil.example/x.png',
  ]) {
    const resp = await app.request(`/api/admin/questions/media/url?ref=${encodeURIComponent(ref)}`, { headers: auth(ADMIN_TOKEN) })
    assert.equal(resp.status, 400, `ref=${ref}`)
    assert.equal((await resp.json()).error.code, QUESTION_ERROR_CODES.MEDIA_VALIDATION)
  }
})

test('GET /media/url on an unknown ref → 404 MEDIA_NOT_FOUND', async () => {
  const { app } = buildMediaApp()
  const resp = await app.request('/api/admin/questions/media/url?ref=question-media/a/b/missing.png', { headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 404)
  assert.equal((await resp.json()).error.code, QUESTION_ERROR_CODES.MEDIA_NOT_FOUND)
})

// ---------------------------------------------------------------------------
// Delete — ownership + in-use lifecycle
// ---------------------------------------------------------------------------

test('DELETE /media removes an owned, unreferenced object', async () => {
  const { app, store } = buildMediaApp()
  const created = await (await app.request('/api/admin/questions/media', {
    method: 'POST',
    headers: auth(ADMIN_TOKEN),
    body: jpegForm(),
  })).json()
  const resp = await app.request(`/api/admin/questions/media?ref=${encodeURIComponent(created.media.ref)}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 200)
  assert.equal((await resp.json()).removed, true)
  assert.equal(store.media[created.media.ref], undefined, 'object removed from storage')
})

test('DELETE /media refuses an object owned by another admin (403 MEDIA_FORBIDDEN)', async () => {
  const { app } = buildMediaApp()
  const otherRef = buildQuestionMediaPath(PLAIN_USER_ID, 'abc123', 'jpg')
  const resp = await app.request(`/api/admin/questions/media?ref=${encodeURIComponent(otherRef)}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 403)
  assert.equal((await resp.json()).error.code, QUESTION_ERROR_CODES.MEDIA_FORBIDDEN)
})

test('DELETE /media refuses an object still referenced by a draft (409 MEDIA_IN_USE)', async () => {
  const { app, store } = buildMediaApp()
  const created = await (await app.request('/api/admin/questions/media', {
    method: 'POST',
    headers: auth(ADMIN_TOKEN),
    body: jpegForm(),
  })).json()
  seedReferencingQuestion(store, created.media.ref, { status: 'draft' })
  const resp = await app.request(`/api/admin/questions/media?ref=${encodeURIComponent(created.media.ref)}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 409)
  assert.equal((await resp.json()).error.code, QUESTION_ERROR_CODES.MEDIA_IN_USE)
  assert.ok(store.media[created.media.ref], 'object survives the refusal')
})

test('published/archived questions also protect their media from deletion (409)', async () => {
  const { app, store } = buildMediaApp()
  const created = await (await app.request('/api/admin/questions/media', {
    method: 'POST',
    headers: auth(ADMIN_TOKEN),
    body: jpegForm(),
  })).json()
  seedReferencingQuestion(store, created.media.ref, { status: 'published' })
  const resp = await app.request(`/api/admin/questions/media?ref=${encodeURIComponent(created.media.ref)}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 409)
  assert.equal((await resp.json()).error.code, QUESTION_ERROR_CODES.MEDIA_IN_USE)
})

test('DELETE /media on an unknown ref → 404 MEDIA_NOT_FOUND', async () => {
  const { app } = buildMediaApp()
  const ref = buildQuestionMediaPath(ADMIN_USER_ID, 'nope', 'jpg')
  const resp = await app.request(`/api/admin/questions/media?ref=${encodeURIComponent(ref)}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 404)
  assert.equal((await resp.json()).error.code, QUESTION_ERROR_CODES.MEDIA_NOT_FOUND)
})

test('no secret keys leak from any media payload', async () => {
  const { app } = buildMediaApp()
  const created = await (await app.request('/api/admin/questions/media', {
    method: 'POST',
    headers: auth(ADMIN_TOKEN),
    body: jpegForm(),
  })).json()
  const urlResp = await app.request(`/api/admin/questions/media/url?ref=${encodeURIComponent(created.media.ref)}`, { headers: auth(ADMIN_TOKEN) })
  const payload = JSON.stringify([created, await urlResp.json()])
  assert.ok(!/service-role|service_role|access_token|refresh_token|password|supabase/.test(payload), 'no secrets in media payloads')
})

// ---------------------------------------------------------------------------
// Through the full production stack over the fake Supabase client
// ---------------------------------------------------------------------------

function buildFake() {
  const { client, db } = createFakeSupabaseClient()
  addFakeAuthUser(db, { token: ADMIN_TOKEN, userId: ADMIN_USER_ID })
  addFakeAuthUser(db, { token: PLAIN_TOKEN, userId: PLAIN_USER_ID })
  seedFakeAdmin(db, { authUserId: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' })
  return { client, db }
}

test('production stack: upload → signed URL → in-use guard → clean removal', async () => {
  const { client, db } = buildFake()
  const { app } = await createProductionApi({ client })

  const uploadResp = await app.request('/api/admin/questions/media', {
    method: 'POST',
    headers: auth(ADMIN_TOKEN),
    body: jpegForm(),
  })
  assert.equal(uploadResp.status, 201)
  const { media } = await uploadResp.json()
  assert.match(media.ref, MEDIA_REF_PATTERN)
  assert.ok(db.storage['question-media'][media.ref], 'object exists in the fake bucket')

  const urlResp = await app.request(`/api/admin/questions/media/url?ref=${encodeURIComponent(media.ref)}`, { headers: auth(ADMIN_TOKEN) })
  assert.equal(urlResp.status, 200)
  assert.ok((await urlResp.json()).url.includes('question-media'))

  // A draft referencing the media is created through the builder surface, so
  // deleting the media while referenced is refused (409). The ref rides on a
  // drag-drop item's optional image (the schema-correct media slot).
  const draft = makeDragDropDraft()
  draft.payload.items[0].image = { ref: media.ref, alt: 'shared' }
  const created = await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(draft),
  })
  assert.equal(created.status, 201)
  const questionId = (await created.json()).question.id

  const blocked = await app.request(`/api/admin/questions/media?ref=${encodeURIComponent(media.ref)}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(blocked.status, 409)
  assert.equal((await blocked.json()).error.code, QUESTION_ERROR_CODES.MEDIA_IN_USE)

  // Removing the draft frees the media for deletion (non-destructive: the
  // question removal never cascades into storage).
  const removed = await app.request(`/api/admin/questions/${questionId}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(removed.status, 200)

  const delResp = await app.request(`/api/admin/questions/media?ref=${encodeURIComponent(media.ref)}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal(delResp.status, 200)
  assert.equal((await delResp.json()).removed, true)
  assert.equal(db.storage['question-media'][media.ref], undefined, 'object gone from the fake bucket')
})

export default { tests: true }