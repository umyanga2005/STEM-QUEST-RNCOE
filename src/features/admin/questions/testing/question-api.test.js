/**
 * Admin Question Builder — Hono API contract tests (Task 5.10).
 *
 * `GET/POST/PUT/DELETE /api/admin/questions*` composed inside the real admin
 * app (`createAdminApi`) behind `requireAdmin`, and through the full production
 * stack over the deterministic fake PostgREST client. The auth matrix is the
 * security core: no token → 401, bogus token → 401, valid identity without an
 * admins row → 403. An authenticated admin can author, and published rows are
 * never editable.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createAdminApi } from '../../api/server.js'
import { adminError } from '../../errors.js'
import { QuestionService } from '../service/question-service.js'
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

const ADMIN_TOKEN = 'jwt-admin-1'
const PLAIN_TOKEN = 'jwt-plain-1'
const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111'
const PLAIN_USER_ID = '22222222-2222-4222-8222-222222222222'

const auth = (token) => ({ authorization: `Bearer ${token}` })

/** Admin app over a memory QuestionService (no Supabase needed). */
function buildAdminApp() {
  const store = createQuestionMemoryStore()
  seedQuestionStore(store, seedQuestionCatalogue(store))
  const repos = createQuestionMemoryRepositories(store)
  const questionService = new QuestionService({
    questionRepository: repos.questionRepository,
    catalogueRepository: repos.catalogueRepository,
    validator: createQuestionValidator(),
  })
  const adminService = {
    resolveAdmin: async (t) => {
      if (t === ADMIN_TOKEN) return { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' }
      throw adminError.invalidToken('token rejected by Supabase Auth')
    },
  }
  return { app: createAdminApi({ adminService, questionService }), questionService, repos, store }
}

test('GET /api/admin/questions without a token → 401', async () => {
  const { app } = buildAdminApp()
  const resp = await app.request('/api/admin/questions')
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, 'ADMIN_UNAUTHENTICATED')
})

test('GET /api/admin/questions with a bogus token → 401', async () => {
  const { app } = buildAdminApp()
  const resp = await app.request('/api/admin/questions', { headers: auth('student-opaque-token') })
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, 'ADMIN_INVALID_TOKEN')
})

test('POST /api/admin/questions creates a draft (201)', async () => {
  const { app } = buildAdminApp()
  const resp = await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft()),
  })
  assert.equal(resp.status, 201)
  const body = await resp.json()
  assert.equal(body.question.status, 'draft')
  assert.equal(body.question.version, 1)
  assert.equal(body.question.activityType, 'drag-drop')
})

test('POST rejects an invalid draft with field-level VALIDATION errors', async () => {
  const { app } = buildAdminApp()
  const draft = makeDragDropDraft()
  draft.correctAnswer.mappings = [{ itemId: 'nucleus', zoneId: 'control' }]
  const resp = await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(draft),
  })
  assert.equal(resp.status, 400)
  const body = await resp.json()
  assert.equal(body.error.code, QUESTION_ERROR_CODES.VALIDATION)
  assert.ok(Array.isArray(body.error.fields) && body.error.fields.length > 0)
  assert.ok(body.error.fields.some((f) => f.code === 'drag-drop.mappings-cover-items'))
})

test('POST rejects a forged field with UNEXPECTED_FIELD (400)', async () => {
  const { app } = buildAdminApp()
  const resp = await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify({ ...makeDragDropDraft(), studentId: 999 }),
  })
  assert.equal(resp.status, 400)
  const body = await resp.json()
  assert.equal(body.error.code, QUESTION_ERROR_CODES.UNEXPECTED_FIELD)
})

test('GET list returns previews (no correctAnswer), GET :id returns full row', async () => {
  const { app } = buildAdminApp()
  const created = await (await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft()),
  })).json()

  const list = await (await app.request('/api/admin/questions', { headers: auth(ADMIN_TOKEN) })).json()
  assert.equal(list.questions.length, 1)
  assert.equal('correctAnswer' in list.questions[0], false)
  assert.equal('meta' in list.questions[0], false)

  const detail = await (await app.request(`/api/admin/questions/${created.question.id}`, { headers: auth(ADMIN_TOKEN) })).json()
  assert.ok(detail.question.correctAnswer, 'detail returns correctAnswer')
  assert.equal(detail.question.id, created.question.id)
})

test('GET :id on an unknown id → 404 QUESTION_NOT_FOUND', async () => {
  const { app } = buildAdminApp()
  const resp = await app.request('/api/admin/questions/999999', { headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 404)
  const body = await resp.json()
  assert.equal(body.error.code, QUESTION_ERROR_CODES.NOT_FOUND)
})

test('PUT edits a draft', async () => {
  const { app } = buildAdminApp()
  const created = await (await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft()),
  })).json()
  const resp = await app.request(`/api/admin/questions/${created.question.id}`, {
    method: 'PUT',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft({ prompt: 'Edited by admin' })),
  })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.question.prompt, 'Edited by admin')
  assert.equal(body.question.version, 1)
})

test('GET /catalogue returns stream + activity-type options', async () => {
  const { app } = buildAdminApp()
  const resp = await app.request('/api/admin/questions/catalogue', { headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.streams.length, 4)
  assert.equal(body.activityTypes.length, 10)
  assert.ok(body.activityTypes.some((a) => a.slug === 'scenario-challenge'))
})

test('DELETE removes a draft', async () => {
  const { app } = buildAdminApp()
  const created = await (await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft()),
  })).json()
  const resp = await app.request(`/api/admin/questions/${created.question.id}`, {
    method: 'DELETE',
    headers: auth(ADMIN_TOKEN),
  })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.removed, true)
})

// ---------------------------------------------------------------------------
// Through the full production stack over the deterministic fake Supabase
// ---------------------------------------------------------------------------

function buildFake() {
  const { client, db } = createFakeSupabaseClient()
  addFakeAuthUser(db, { token: ADMIN_TOKEN, userId: ADMIN_USER_ID })
  addFakeAuthUser(db, { token: PLAIN_TOKEN, userId: PLAIN_USER_ID })
  seedFakeAdmin(db, { authUserId: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' })
  return { client, db }
}

test('production stack: admin can list/create/read/update/delete a question', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })

  const listResp = await app.request('/api/admin/questions', { headers: auth(ADMIN_TOKEN) })
  assert.equal(listResp.status, 200)
  assert.equal((await listResp.json()).questions.length, 0)

  const createResp = await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft()),
  })
  assert.equal(createResp.status, 201)
  const created = (await createResp.json()).question

  const detailResp = await app.request(`/api/admin/questions/${created.id}`, { headers: auth(ADMIN_TOKEN) })
  const detail = (await detailResp.json()).question
  assert.equal(detail.correctAnswer.mappings.length, 2)
  assert.equal(detail.stream, 'science')
  assert.equal(detail.level, 1)
  assert.equal(detail.activityType, 'drag-drop')

  const putResp = await app.request(`/api/admin/questions/${created.id}`, {
    method: 'PUT',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft({ prompt: 'Renamed' })),
  })
  assert.equal((await putResp.json()).question.prompt, 'Renamed')

  const delResp = await app.request(`/api/admin/questions/${created.id}`, { method: 'DELETE', headers: auth(ADMIN_TOKEN) })
  assert.equal((await delResp.json()).removed, true)
  const after = await (await app.request('/api/admin/questions', { headers: auth(ADMIN_TOKEN) })).json()
  assert.equal(after.questions.length, 0)
})

test('production stack: a valid identity without an admins row → 403', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/questions', { headers: auth(PLAIN_TOKEN) })
  assert.equal(resp.status, 403)
  const body = await resp.json()
  assert.equal(body.error.code, 'ADMIN_FORBIDDEN')
})

test('production stack: a student session token never grants admin → 401', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/questions', { headers: auth('student-opaque-token') })
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, 'ADMIN_INVALID_TOKEN')
})

test('production stack: no secret leaks from question payloads', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })
  await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(makeDragDropDraft()),
  })
  const resp = await app.request('/api/admin/questions', { headers: auth(ADMIN_TOKEN) })
  const payload = JSON.stringify(await resp.json())
  assert.ok(!/service-role|service_role|token|secret/.test(payload), 'no secrets in question payloads')
})

export default { tests: true }