/**
 * Student — Hono API tests (Task 5.1).
 *
 * Exercises the transport over in-memory repositories (no Supabase): route
 * wiring, the Bearer auth header contract, JSON + multipart handling, and
 * error-to-HTTP mapping. Also verifies the stacked demo app keeps the game
 * API working while serving the student API by prefix.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createStudentApi } from '../api/server.js'
import { createStudentMemoryRepositories } from '../repositories/memory.js'
import { StudentService } from '../service/student-service.js'
import { createStackedApp } from '../../game-session/api/dev-server.js'
import { createGameApi } from '../../game-session/api/server.js'
import { createMemoryStore, createMemoryRepositories } from '../../game-session/repositories/memory.js'
import GameSessionService from '../../game-session/service/game-session-service.js'

const VALID = { initials: 'A', name: 'Amaya Silva', school: 'Colombo High', grade: 7 }

function makeApi() {
  const repos = createStudentMemoryRepositories()
  const service = new StudentService(repos)
  const app = createStudentApi({ service })
  return { app, service, repos }
}

async function json(app, path, { method = 'GET', body, headers = {} } = {}) {
  const init = { method, headers }
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const resp = await app.request(path, init)
  const data = await resp.json().catch(() => null)
  return { status: resp.status, data }
}

test('POST /api/student/register returns 201 with token, loginCode and safe student', async () => {
  const { app, repos } = makeApi()
  const { status, data } = await json(app, '/api/student/register', { method: 'POST', body: VALID })
  assert.equal(status, 201)
  assert.equal(typeof data.token, 'string')
  assert.equal(data.loginCode.length, 9)
  assert.equal(data.student.name, 'Amaya Silva')
  assert.equal(data.student.school, 'Colombo High')
  assert.equal(data.student.grade, 7)
  assert.equal(data.expiresAt > Date.now(), true)
  assert.equal(repos.store.students.length, 1)
  assert.equal(repos.store.schools.length, 1)
})

test('register rejects unknown privileged fields with 400', async () => {
  const { app } = makeApi()
  const { status, data } = await json(app, '/api/student/register', {
    method: 'POST',
    body: { ...VALID, isAdmin: true },
  })
  assert.equal(status, 400)
  assert.equal(data.error.code, 'STUDENT_UNEXPECTED_FIELD')
  assert.equal(data.error.category, 'VALIDATION')
})

test('register rejects invalid grades with 400 and safe public message', async () => {
  const { app } = makeApi()
  for (const grade of [5, 12, 6.5, 'abc']) {
    const { status, data } = await json(app, '/api/student/register', { method: 'POST', body: { ...VALID, grade } })
    assert.equal(status, 400)
    assert.equal(data.error.code, 'STUDENT_INVALID_INPUT')
    assert.equal(data.error.category, 'VALIDATION')
  }
})

test('register rejects malformed JSON with 400', async () => {
  const { app } = makeApi()
  const resp = await app.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  })
  const data = await resp.json()
  assert.equal(resp.status, 400)
  assert.equal(data.error.code, 'STUDENT_INVALID_INPUT')
})

test('GET /api/student/me requires a Bearer token', async () => {
  const { app } = makeApi()
  const none = await json(app, '/api/student/me')
  assert.equal(none.status, 401)
  assert.equal(none.data.error.code, 'STUDENT_UNAUTHORIZED')

  const wrong = await json(app, '/api/student/me', { headers: { authorization: 'Basic dXNlcjpwYXNz' } })
  assert.equal(wrong.status, 401)

  const forged = await json(app, '/api/student/me', { headers: { authorization: 'Bearer forged-token' } })
  assert.equal(forged.status, 401)
  assert.equal(forged.data.error.code, 'STUDENT_INVALID_TOKEN')
})

test('GET /api/student/me returns safe identity fields for a valid token', async () => {
  const { app } = makeApi()
  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })
  const { status, data } = await json(app, '/api/student/me', {
    headers: { authorization: `Bearer ${reg.data.token}` },
  })
  assert.equal(status, 200)
  assert.deepEqual(Object.keys(data.student).sort(), ['avatarUrl', 'grade', 'id', 'initials', 'name', 'school'])
  assert.ok(!JSON.stringify(data).includes(reg.data.token), 'token never echoed back')
  assert.ok(!JSON.stringify(data).includes('tokenHash'))
  assert.ok(!JSON.stringify(data).includes('loginCode'))
})

test('Bearer token parsing accepts case-insensitive scheme and ignores spaces', async () => {
  const { app } = makeApi()
  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })
  const { status } = await json(app, '/api/student/me', {
    headers: { authorization: `bearer ${reg.data.token}` },
  })
  assert.equal(status, 200)
})

test('PUT /api/student/me/avatar uploads a valid multipart photo', async () => {
  const { app, repos } = makeApi()
  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })
  const formData = new FormData()
  formData.append('photo', new Blob([new Uint8Array(64)], { type: 'image/jpeg' }), 'selfie.jpg')
  const resp = await app.request('/api/student/me/avatar', {
    method: 'PUT',
    headers: { authorization: `Bearer ${reg.data.token}` },
    body: formData,
  })
  const data = await resp.json()
  assert.equal(resp.status, 200)
  assert.match(data.student.avatarUrl, /^data:image\/jpeg;base64,/)
  assert.equal(repos.store.avatars['1/profile.jpg'] !== undefined, true)
  assert.equal(repos.store.students[0].profilePhotoPath, '1/profile.jpg')
})

test('PUT avatar rejects wrong MIME and oversized uploads', async () => {
  const { app } = makeApi()
  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })

  const svg = new FormData()
  svg.append('photo', new Blob([new Uint8Array(16)], { type: 'image/svg+xml' }), 'x.svg')
  const svgResp = await app.request('/api/student/me/avatar', {
    method: 'PUT',
    headers: { authorization: `Bearer ${reg.data.token}` },
    body: svg,
  })
  assert.equal(svgResp.status, 400)
  assert.equal((await svgResp.json()).error.code, 'STUDENT_AVATAR_INVALID')

  const big = new FormData()
  big.append('photo', new Blob([new Uint8Array(204801)], { type: 'image/png' }), 'big.png')
  const bigResp = await app.request('/api/student/me/avatar', {
    method: 'PUT',
    headers: { authorization: `Bearer ${reg.data.token}` },
    body: big,
  })
  assert.equal(bigResp.status, 400)
  assert.equal((await bigResp.json()).error.code, 'STUDENT_AVATAR_TOO_LARGE')
})

test('PUT avatar requires auth and a photo field', async () => {
  const { app } = makeApi()
  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })

  const noAuth = new FormData()
  noAuth.append('photo', new Blob([new Uint8Array(16)], { type: 'image/jpeg' }), 'a.jpg')
  const noAuthResp = await app.request('/api/student/me/avatar', { method: 'PUT', body: noAuth })
  assert.equal(noAuthResp.status, 401)

  const emptyForm = new FormData()
  const emptyResp = await app.request('/api/student/me/avatar', {
    method: 'PUT',
    headers: { authorization: `Bearer ${reg.data.token}` },
    body: emptyForm,
  })
  assert.equal(emptyResp.status, 400)
  assert.equal((await emptyResp.json()).error.code, 'STUDENT_AVATAR_INVALID')
})

test('unknown student routes return a 404 with a safe body', async () => {
  const { app } = makeApi()
  const { status, data } = await json(app, '/api/student/nope')
  assert.equal(status, 404)
  assert.equal(data.error.category, 'AVAILABILITY')
})

test('stacked demo app serves both game and student APIs by prefix', async () => {
  const gameStore = createMemoryStore()
  const gameRepos = createMemoryRepositories(gameStore)
  const gameApp = createGameApi({ service: new GameSessionService(gameRepos) })
  const studentRepos = createStudentMemoryRepositories()
  const studentApp = createStudentApi({ service: new StudentService(studentRepos) })
  const app = createStackedApp({ gameApp, studentApp })

  const health = await json(app, '/api/health')
  assert.equal(health.status, 200)
  assert.equal(health.data.ok, true)

  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })
  assert.equal(reg.status, 201)
  assert.ok(reg.data.token)

  const me = await json(app, '/api/student/me', { headers: { authorization: `Bearer ${reg.data.token}` } })
  assert.equal(me.status, 200)
  assert.equal(me.data.student.name, 'Amaya Silva')

  const unknown = await json(app, '/unknown-route')
  assert.equal(unknown.status, 404)
  assert.equal(unknown.data.error.code, 'GAME_NOT_FOUND')
})