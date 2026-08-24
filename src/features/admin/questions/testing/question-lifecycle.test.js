/**
 * Admin Question Builder — review/approve/publish lifecycle (Task 5.13).
 *
 * Service + API contract tests for the full lifecycle on top of the existing
 * draft/published/archived model:
 *   create → submit → pending → approve/reject → publish → archive
 *   published v1 → createVersion (draft v2) → review v2 → publish v2 (v1
 *   archived, never overwritten), with a stale-approval guard, mandatory
 *   rejection notes, server-authoritative transitions, and a complete
 *   `admin_actions` audit trail. Also covers the student distribution
 *   regression: students only ever see `published` rows.
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
import { createMemoryStore, createMemoryRepositories } from '../../../game-session/repositories/memory.js'
import { createFakeSupabaseClient, addFakeAuthUser, seedFakeAdmin, questionFixtureToRow } from '../../../game-session/testing/fake-supabase-client.js'
import { createSupabaseRepositories } from '../../../game-session/repositories/supabase.js'
import { createProductionApi } from '../../../game-session/api/production-server.js'

const ADMIN_TOKEN = 'jwt-admin-1'
const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111'
const REVIEWER_USER_ID = '33333333-3333-4333-8333-333333333333'

const auth = (token) => ({ authorization: `Bearer ${token}` })
const ADMIN = { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' }
const REVIEWER = { id: REVIEWER_USER_ID, displayName: 'Reviewer Admin', role: 'admin' }

/** Review-ready drag-drop draft: explanation + feedback + taxonomy all present. */
function reviewReady(overrides = {}) {
  return makeDragDropDraft({
    meta: { objective: 'Identify the role of cell parts.', feedback: { correct: 'Correct!', incorrect: 'Not quite.' } },
    ...overrides,
  })
}

function buildLifecycle() {
  const store = createQuestionMemoryStore()
  seedQuestionStore(store, seedQuestionCatalogue(store))
  const repos = createQuestionMemoryRepositories(store)
  const service = new QuestionService({
    questionRepository: repos.questionRepository,
    catalogueRepository: repos.catalogueRepository,
    validator: createQuestionValidator(),
    adminActionRepository: repos.adminActionRepository,
  })
  return { store, repos, service }
}

async function createDraft(service, overrides = {}) {
  const { question } = await service.create(reviewReady(overrides), { admin: ADMIN })
  return question
}

/** Inserts a published row directly (bypasses the builder's draft-only create). */
async function insertPublishedRow(store, overrides = {}) {
  const draft = makeDragDropDraft({ prompt: 'Published v1', meta: { objective: 'v1 objective', feedback: { correct: 'ok' } } })
  const now = new Date().toISOString()
  store.questions.push({
    id: store.nextId++,
    stream_id: 1,
    level_id: 1,
    activity_type_id: 1,
    prompt: draft.prompt,
    instructions: null,
    explanation: draft.explanation,
    payload: draft.payload,
    correct_answer: draft.correctAnswer,
    hints: null,
    tags: ['topic:biology', 'subtopic:cells'],
    grade_min: draft.gradeMin,
    grade_max: draft.gradeMax,
    difficulty: draft.difficulty,
    base_points: draft.basePoints,
    timer_override_seconds: null,
    status: 'published',
    is_flagged: false,
    version: 1,
    meta: draft.meta,
    created_at: now,
    updated_at: now,
    ...overrides,
  })
  return store.questions[store.questions.length - 1]
}

// ---------------------------------------------------------------------------
// Service — create/update/remove hardening
// ---------------------------------------------------------------------------

test('create stamps the author identity and audits QUESTION_CREATED', async () => {
  const { service, store } = buildLifecycle()
  const { question } = await service.create(reviewReady(), { admin: ADMIN })
  assert.equal(question.meta.authoring.createdByAdminId, ADMIN_USER_ID)
  const actions = await service.audit(question.id)
  assert.equal(actions.actions[0].action, 'QUESTION_CREATED')
  assert.equal(actions.actions[0].adminId, ADMIN_USER_ID)
  assert.equal(actions.actions[0].details.version, 1)
  assert.equal(store.adminActions.length, 1)
})

test('create without an admin context still works and writes no audit row', async () => {
  const { service, store } = buildLifecycle()
  const { question } = await service.create(reviewReady())
  assert.equal(question.meta.authoring, undefined, 'no authoring stamped without an admin')
  assert.equal(store.adminActions.length, 0)
})

test('a client-forged review state is stripped on create', async () => {
  const { service } = buildLifecycle()
  const forged = reviewReady({ meta: { ...reviewReady().meta, review: { state: 'approved', reviewerAdminId: ADMIN_USER_ID } } })
  const { question } = await service.create(forged, { admin: ADMIN })
  assert.equal(question.meta.review, undefined, 'server never accepts a client review')
})

test('editing a draft clears any review state but preserves server chain fields', async () => {
  const { service } = buildLifecycle()
  const draft = await createDraft(service)
  await service.submitForReview(draft.id, { admin: ADMIN })
  await service.approve(draft.id, { admin: REVIEWER, note: 'looks good' })

  const { question } = await service.update(draft.id, reviewReady({ prompt: 'Revised prompt' }), { admin: REVIEWER })
  assert.equal(question.prompt, 'Revised prompt')
  assert.equal(question.version, 1, 'version preserved across edits')
  assert.equal(question.meta.review, undefined, 'an edit invalidates prior approval')
  const audit = await service.audit(draft.id)
  assert.ok(audit.actions.some((a) => a.action === 'QUESTION_EDITED'))
})

test('editing or removing an archived question is blocked (409 STATUS_BLOCKED)', async () => {
  const { service, store } = buildLifecycle()
  const published = await insertPublishedRow(store)
  await service.archive(published.id, { admin: ADMIN })

  await assert.rejects(service.update(published.id, reviewReady(), { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.STATUS_BLOCKED)
    return true
  })
  await assert.rejects(service.remove(published.id), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.STATUS_BLOCKED)
    return true
  })
})

// ---------------------------------------------------------------------------
// Service — submit gates
// ---------------------------------------------------------------------------

test('submit requires explanation, feedback and taxonomy (VALIDATION fields)', async () => {
  const { service } = buildLifecycle()
  const noExplanation = await createDraft(service, { explanation: '  ' })
  await assert.rejects(service.submitForReview(noExplanation.id, { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.VALIDATION)
    assert.ok(err.fields.some((f) => f.path === '/explanation'))
    return true
  })

  const noFeedback = await createDraft(service, { meta: { objective: 'no feedback here' } })
  await assert.rejects(service.submitForReview(noFeedback.id, { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.VALIDATION)
    assert.ok(err.fields.some((f) => f.path === '/meta/feedback'))
    return true
  })

  const noTaxonomy = await createDraft(service, { topic: '', subtopic: '' })
  await assert.rejects(service.submitForReview(noTaxonomy.id, { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.VALIDATION)
    assert.ok(err.fields.some((f) => f.path === '/topic'))
    assert.ok(err.fields.some((f) => f.path === '/subtopic'))
    return true
  })
})

test('submit is limited to drafts and does not overwrite a pending review', async () => {
  const { service, store } = buildLifecycle()
  const draft = await createDraft(service)
  store.questions.find((q) => q.id === draft.id).status = 'published'
  await assert.rejects(service.submitForReview(draft.id, { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.INVALID_STATE)
    return true
  })

  store.questions.find((q) => q.id === draft.id).status = 'draft'
  store.questions.find((q) => q.id === draft.id).meta = draft.meta
  await service.submitForReview(draft.id, { admin: ADMIN })
  await assert.rejects(service.submitForReview(draft.id, { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.INVALID_STATE)
    return true
  })
})

// ---------------------------------------------------------------------------
// Service — full happy path + audit trail
// ---------------------------------------------------------------------------

test('full lifecycle: submit → approve → publish → archive, audited end to end', async () => {
  const { service, store } = buildLifecycle()
  const draft = await createDraft(service)

  const submitted = await service.submitForReview(draft.id, { admin: ADMIN })
  assert.equal(submitted.question.meta.review.state, 'pending')
  assert.equal(submitted.question.meta.review.submittedByAdminId, ADMIN_USER_ID)
  assert.equal(submitted.question.meta.review.version, 1)

  const queue = await service.reviewQueue()
  assert.equal(queue.questions.length, 1)
  assert.equal(queue.questions[0].id, draft.id)
  assert.equal(queue.questions[0].review.state, 'pending')
  assert.equal('correctAnswer' in queue.questions[0], false, 'queue previews never leak correctAnswer')

  const approved = await service.approve(draft.id, { admin: REVIEWER, note: 'ready' })
  assert.equal(approved.question.meta.review.state, 'approved')
  assert.equal(approved.question.meta.review.reviewerAdminId, REVIEWER_USER_ID)
  assert.equal(approved.question.meta.review.version, 1)

  const published = await service.publish(draft.id, { admin: REVIEWER })
  assert.equal(published.question.status, 'published')
  assert.equal(published.question.version, 1)

  const archived = await service.archive(draft.id, { admin: ADMIN })
  assert.equal(archived.question.status, 'archived')

  const audit = await service.audit(draft.id)
  const order = audit.actions.map((a) => a.action)
  assert.deepEqual(
    order.slice(0, 5),
    ['QUESTION_ARCHIVED', 'QUESTION_PUBLISHED', 'QUESTION_APPROVED', 'QUESTION_SUBMITTED', 'QUESTION_CREATED'],
    'audit trail newest-first'
  )
  assert.equal(store.adminActions.length, 5)
})

test('reject requires a non-empty note and stays a draft; re-submit creates fresh pending', async () => {
  const { service } = buildLifecycle()
  const draft = await createDraft(service)
  await service.submitForReview(draft.id, { admin: ADMIN })

  await assert.rejects(service.reject(draft.id, { admin: REVIEWER }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.REVIEW_NOTE_REQUIRED)
    return true
  })

  const rejected = await service.reject(draft.id, { admin: REVIEWER, note: 'Missing a clearer prompt.' })
  assert.equal(rejected.question.meta.review.state, 'rejected')
  assert.equal(rejected.question.meta.review.note, 'Missing a clearer prompt.')
  assert.equal(rejected.question.status, 'draft')

  const resubmitted = await service.submitForReview(draft.id, { admin: ADMIN })
  assert.equal(resubmitted.question.meta.review.state, 'pending')
  const audit = await service.audit(draft.id)
  assert.equal(audit.actions.filter((a) => a.action === 'QUESTION_SUBMITTED').length, 2)
  assert.equal(audit.actions.filter((a) => a.action === 'QUESTION_REJECTED').length, 1)
})

test('publish guards: only approved drafts publish; stale approval is rejected', async () => {
  const { service, store } = buildLifecycle()

  const plain = await createDraft(service)
  await assert.rejects(service.publish(plain.id, { admin: REVIEWER }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.INVALID_STATE)
    return true
  })

  const approved = await createDraft(service, { prompt: 'Will go stale' })
  await service.submitForReview(approved.id, { admin: ADMIN })
  await service.approve(approved.id, { admin: REVIEWER })
  store.questions.find((q) => q.id === approved.id).version = 2
  await assert.rejects(service.publish(approved.id, { admin: REVIEWER }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.APPROVAL_STALE)
    return true
  })
})

test('archive only applies to published questions', async () => {
  const { service } = buildLifecycle()
  const draft = await createDraft(service)
  await assert.rejects(service.archive(draft.id, { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.INVALID_STATE)
    return true
  })
})

// ---------------------------------------------------------------------------
// Service — versioned editing (clone-on-edit)
// ---------------------------------------------------------------------------

test('createVersion clones a published v1 into a draft v2; publishing v2 archives v1', async () => {
  const { service, store } = buildLifecycle()
  const v1 = await insertPublishedRow(store)

  const clone = await service.createVersion(v1.id, { admin: ADMIN })
  assert.equal(clone.question.status, 'draft')
  assert.equal(clone.question.version, 2)
  assert.equal(clone.question.meta.sourceQuestionId, v1.id)
  assert.equal(clone.question.meta.sourceVersion, 1)
  assert.equal(clone.question.meta.review, undefined, 'clone starts with no review')
  assert.equal(clone.question.prompt, v1.prompt, 'content copied, never mutated')

  const stillPublished = (await service.getById(v1.id)).question
  assert.equal(stillPublished.status, 'published', 'v1 untouched until v2 publishes')

  const cloneDto = (await service.getById(clone.question.id)).question
  const edited = await service.update(clone.question.id, reviewReady({ meta: { ...cloneDto.meta, feedback: { correct: 'v2 feedback' } } }), { admin: ADMIN })
  assert.equal(edited.question.version, 2, 'draft v2 preserves its version across edits')
  assert.equal(edited.question.meta.sourceQuestionId, v1.id, 'chain link survives an edit')

  await service.submitForReview(clone.question.id, { admin: ADMIN })
  await service.approve(clone.question.id, { admin: REVIEWER, note: 'v2 approved' })
  const published2 = await service.publish(clone.question.id, { admin: REVIEWER })
  assert.equal(published2.question.status, 'published')

  const v1After = (await service.getById(v1.id)).question
  assert.equal(v1After.status, 'archived', 'publishing v2 archives v1')
  assert.equal(v1After.prompt, v1.prompt, 'v1 content is never overwritten')

  const audit1 = await service.audit(v1.id)
  assert.ok(audit1.actions.some((a) => a.action === 'QUESTION_ARCHIVED' && a.details?.supersededByVersion === 2))
  const audit2 = await service.audit(clone.question.id)
  assert.ok(audit2.actions.some((a) => a.action === 'QUESTION_VERSION_CREATED' && a.details?.sourceId === v1.id))
})

test('createVersion only starts from a published question', async () => {
  const { service } = buildLifecycle()
  const draft = await createDraft(service)
  await assert.rejects(service.createVersion(draft.id, { admin: ADMIN }), (err) => {
    assert.equal(err.code, QUESTION_ERROR_CODES.INVALID_STATE)
    return true
  })
})

// ---------------------------------------------------------------------------
// Student distribution regression — students see ONLY published questions
// ---------------------------------------------------------------------------

test('game memory repository distributes only published rows', async () => {
  const store = createMemoryStore()
  store.questions.push(
    { id: 1, streamId: 1, levelId: 1, status: 'published' },
    { id: 2, streamId: 1, levelId: 1, status: 'draft', meta: { review: { state: 'pending' } } },
    { id: 3, streamId: 1, levelId: 1, status: 'draft', meta: { review: { state: 'approved' } } },
    { id: 4, streamId: 1, levelId: 1, status: 'archived' }
  )
  const repos = createMemoryRepositories(store)
  const eligible = await repos.questionRepository.getEligibleQuestions({ streamId: 1, levelId: 1 })
  assert.deepEqual(eligible.map((q) => q.id), [1], 'only the published row is eligible')
})

test('game Supabase repository distributes only published rows', async () => {
  const { client, db } = createFakeSupabaseClient()
  const base = questionFixtureToRow({ ...makeDragDropDraft(), id: 1, streamId: 1, levelId: 1, activityTypeId: 1 })
  db.tables.questions.rows.push(
    { ...base, id: 1, status: 'published' },
    { ...base, id: 2, status: 'draft', meta: { review: { state: 'pending' } } },
    { ...base, id: 3, status: 'draft', meta: { review: { state: 'approved' } } },
    { ...base, id: 4, status: 'archived' }
  )
  const repos = createSupabaseRepositories({ client })
  const eligible = await repos.questionRepository.getEligibleQuestions({ streamId: 1, levelId: 1 })
  assert.deepEqual(eligible.map((q) => q.id), [1], 'only the published row is eligible')
})

// ---------------------------------------------------------------------------
// API — routes + auth
// ---------------------------------------------------------------------------

function buildAdminApp() {
  const store = createQuestionMemoryStore()
  seedQuestionStore(store, seedQuestionCatalogue(store))
  const repos = createQuestionMemoryRepositories(store)
  const questionService = new QuestionService({
    questionRepository: repos.questionRepository,
    catalogueRepository: repos.catalogueRepository,
    validator: createQuestionValidator(),
    adminActionRepository: repos.adminActionRepository,
  })
  const adminService = {
    resolveAdmin: async (t) => {
      if (t === ADMIN_TOKEN) return ADMIN
      throw adminError.invalidToken('token rejected by Supabase Auth')
    },
  }
  return { app: createAdminApi({ adminService, questionService }), questionService, repos, store }
}

test('review routes stay behind admin auth (401 without a token)', async () => {
  const { app } = buildAdminApp()
  for (const path of ['/api/admin/questions/review']) {
    const resp = await app.request(path)
    assert.equal(resp.status, 401, path)
  }
})

test('API full lifecycle: create → submit → queue → approve → publish → archive', async () => {
  const { app } = buildAdminApp()
  const created = await (await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(reviewReady()),
  })).json()

  const submit = await app.request(`/api/admin/questions/${created.question.id}/submit`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  assert.equal(submit.status, 200)
  assert.equal((await submit.json()).question.meta.review.state, 'pending')

  const queue = await (await app.request('/api/admin/questions/review', { headers: auth(ADMIN_TOKEN) })).json()
  assert.equal(queue.questions.length, 1)
  assert.equal(queue.questions[0].id, created.question.id)

  const approve = await app.request(`/api/admin/questions/${created.question.id}/approve`, {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'approved' }),
  })
  assert.equal(approve.status, 200)
  assert.equal((await approve.json()).question.meta.review.state, 'approved')

  const publish = await app.request(`/api/admin/questions/${created.question.id}/publish`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  assert.equal(publish.status, 200)
  assert.equal((await publish.json()).question.status, 'published')

  const archive = await app.request(`/api/admin/questions/${created.question.id}/archive`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  assert.equal(archive.status, 200)
  assert.equal((await archive.json()).question.status, 'archived')

  const audit = await (await app.request(`/api/admin/questions/${created.question.id}/audit`, { headers: auth(ADMIN_TOKEN) })).json()
  const actions = audit.actions.map((a) => a.action)
  assert.deepEqual(
    actions.slice(0, 4),
    ['QUESTION_ARCHIVED', 'QUESTION_PUBLISHED', 'QUESTION_APPROVED', 'QUESTION_SUBMITTED']
  )
  assert.ok(actions.includes('QUESTION_CREATED'))
})

test('API reject without a note → 400 REVIEW_NOTE_REQUIRED', async () => {
  const { app } = buildAdminApp()
  const created = await (await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(reviewReady()),
  })).json()
  await app.request(`/api/admin/questions/${created.question.id}/submit`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  const reject = await app.request(`/api/admin/questions/${created.question.id}/reject`, {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify({}),
  })
  assert.equal(reject.status, 400)
  assert.equal((await reject.json()).error.code, QUESTION_ERROR_CODES.REVIEW_NOTE_REQUIRED)
})

test('API versioned editing: clone a published question and publish the v2 draft', async () => {
  const { app, store } = buildAdminApp()
  const published = await insertPublishedRow(store)

  const version = await app.request(`/api/admin/questions/${published.id}/versions`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  assert.equal(version.status, 201)
  const clone = (await version.json()).question
  assert.equal(clone.version, 2)
  assert.equal(clone.status, 'draft')
  assert.equal(clone.meta.sourceQuestionId, published.id)

  await app.request(`/api/admin/questions/${clone.id}/submit`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  await app.request(`/api/admin/questions/${clone.id}/approve`, {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'v2 ready' }),
  })
  const publish = await app.request(`/api/admin/questions/${clone.id}/publish`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  assert.equal((await publish.json()).question.status, 'published')

  const sourceAfter = await (await app.request(`/api/admin/questions/${published.id}`, { headers: auth(ADMIN_TOKEN) })).json()
  assert.equal(sourceAfter.question.status, 'archived', 'v1 archived when v2 publishes')
})

test('API lifecycle payloads never leak secrets', async () => {
  const { app } = buildAdminApp()
  const created = await (await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(reviewReady()),
  })).json()
  const responses = []
  responses.push(await (await app.request(`/api/admin/questions/${created.question.id}/submit`, { method: 'POST', headers: auth(ADMIN_TOKEN) })).json())
  responses.push(await (await app.request('/api/admin/questions/review', { headers: auth(ADMIN_TOKEN) })).json())
  responses.push(await (await app.request(`/api/admin/questions/${created.question.id}/approve`, {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'ok' }),
  })).json())
  responses.push(await (await app.request(`/api/admin/questions/${created.question.id}/publish`, { method: 'POST', headers: auth(ADMIN_TOKEN) })).json())
  responses.push(await (await app.request(`/api/admin/questions/${created.question.id}/audit`, { headers: auth(ADMIN_TOKEN) })).json())
  const payload = JSON.stringify(responses)
  assert.ok(!/service-role|service_role|access_token|refresh_token|password|SUPABASE_/.test(payload))
})

// ---------------------------------------------------------------------------
// Through the full production stack over the deterministic fake Supabase
// ---------------------------------------------------------------------------

test('production stack: full review workflow persists admin_actions end to end', async () => {
  const { client, db } = createFakeSupabaseClient()
  addFakeAuthUser(db, { token: ADMIN_TOKEN, userId: ADMIN_USER_ID })
  seedFakeAdmin(db, { authUserId: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' })
  const { app } = await createProductionApi({ client })

  const created = await (await app.request('/api/admin/questions', {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify(reviewReady()),
  })).json()
  const id = created.question.id

  await app.request(`/api/admin/questions/${id}/submit`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  await app.request(`/api/admin/questions/${id}/approve`, {
    method: 'POST',
    headers: { ...auth(ADMIN_TOKEN), 'content-type': 'application/json' },
    body: JSON.stringify({ note: 'approved in production stack' }),
  })
  const publish = await app.request(`/api/admin/questions/${id}/publish`, { method: 'POST', headers: auth(ADMIN_TOKEN) })
  assert.equal((await publish.json()).question.status, 'published')

  const detail = await (await app.request(`/api/admin/questions/${id}`, { headers: auth(ADMIN_TOKEN) })).json()
  assert.equal(detail.question.status, 'published')
  assert.equal(detail.question.meta.review.state, 'approved')
  assert.equal(detail.question.meta.review.version, 1)

  const { data: auditRows } = await client.from('admin_actions').select('*').eq('target_id', String(id))
  assert.ok(Array.isArray(auditRows) && auditRows.length >= 4, `audit rows written: ${auditRows?.length}`)
  assert.ok(auditRows.some((a) => a.action === 'QUESTION_PUBLISHED'))
  assert.ok(auditRows.every((a) => a.admin_id === ADMIN_USER_ID))

  const list = await (await app.request('/api/admin/questions', { headers: auth(ADMIN_TOKEN) })).json()
  assert.equal('correctAnswer' in list.questions[0], false, 'previews never expose the answer')
})

export default { tests: true }