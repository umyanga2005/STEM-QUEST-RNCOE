/**
 * Student — profile API tests (Task 5.6).
 *
 * Exercises `PUT /api/student/me` and `GET /api/student/me/progress` over
 * in-memory repositories (no Supabase): route wiring, the Bearer auth
 * contract, strict-field rejection, error-to-HTTP mapping, and per-student
 * isolation of the progress overview. Also proves the stacked demo app
 * exposes the profile routes alongside the existing mission/game stack.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createStudentApi } from '../api/server.js'
import { createStudentMemoryRepositories } from '../repositories/memory.js'
import { StudentService } from '../service/student-service.js'
import { ProgressionService } from '../../progression/service/progression-service.js'
import { createMemoryStore, createMemoryRepositories } from '../../game-session/repositories/memory.js'
import { seedStoreFromBaseData, demoBaseData } from '../../game-session/demo/seed-data.js'
import { createMissionMemoryRepositories, seedMissionStore } from '../../mission/repositories/memory.js'
import { missionDemoStreams } from '../../mission/demo/seed.js'
import { createDemoApi } from '../../game-session/api/dev-server.js'

const VALID = { initials: 'A', name: 'Amaya Silva', school: 'Colombo High', grade: 7 }
const UPDATED = { initials: 'AS', name: 'Amaya Silva-Ratnayake', school: 'Kandy Girls College', grade: 10 }

function makeProgressionService() {
  const store = createMemoryStore()
  seedStoreFromBaseData(store, demoBaseData())
  const gameRepos = createMemoryRepositories(store)
  const missionRepos = createMissionMemoryRepositories()
  seedMissionStore(missionRepos.store, {
    streams: missionDemoStreams(store.streams),
    levels: store.levels,
    streamProgress: [],
    levelProgress: [],
    specialAccess: store.specialAccess ?? [],
  })
  const progressionService = new ProgressionService({
    progressionRepository: gameRepos.progressionRepository,
    levelRepository: gameRepos.levelRepository,
    specialAccessRepository: gameRepos.specialAccessRepository,
    streamRepository: missionRepos.streamRepository,
  })
  return { progressionService, gameRepos, missionRepos }
}

function makeApi({ withProgress = true } = {}) {
  const studentRepos = createStudentMemoryRepositories()
  const service = new StudentService(studentRepos)
  const { progressionService } = makeProgressionService()
  const app = createStudentApi({
    service,
    progressionService: withProgress ? progressionService : null,
  })
  return { app, service, studentRepos }
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

async function register(app) {
  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })
  return { token: reg.data.token, studentId: reg.data.student.id }
}

// ---------------------------------------------------------------------------
// PUT /api/student/me
// ---------------------------------------------------------------------------

test('PUT /api/student/me updates the authenticated student profile', async () => {
  const { app } = makeApi()
  const { token } = await register(app)
  const { status, data } = await json(app, '/api/student/me', { method: 'PUT', body: UPDATED, headers: { authorization: `Bearer ${token}` } })
  assert.equal(status, 200)
  assert.equal(data.student.name, 'Amaya Silva-Ratnayake')
  assert.equal(data.student.initials, 'AS')
  assert.equal(data.student.school, 'Kandy Girls College')
  assert.equal(data.student.grade, 10)
})

test('PUT /api/student/me rejects foreign fields with 400', async () => {
  const { app } = makeApi()
  const { token } = await register(app)
  for (const extra of [{ score: 999 }, { studentId: 2 }, { isAdmin: true }, { progression: {} }]) {
    const { status, data } = await json(app, '/api/student/me', {
      method: 'PUT', body: { ...UPDATED, ...extra }, headers: { authorization: `Bearer ${token}` },
    })
    assert.equal(status, 400)
    assert.equal(data.error.code, 'STUDENT_UNEXPECTED_FIELD')
  }
})

test('PUT /api/student/me rejects invalid values with 400 and a safe message', async () => {
  const { app } = makeApi()
  const { token } = await register(app)
  const { status, data } = await json(app, '/api/student/me', {
    method: 'PUT', body: { ...UPDATED, grade: 12 }, headers: { authorization: `Bearer ${token}` },
  })
  assert.equal(status, 400)
  assert.equal(data.error.code, 'STUDENT_INVALID_INPUT')
  assert.equal(data.error.category, 'VALIDATION')
  assert.ok(!JSON.stringify(data).includes('Amaya'), 'no personal data in the public error body')
})

test('PUT /api/student/me requires a Bearer token', async () => {
  const { app } = makeApi()
  const none = await json(app, '/api/student/me', { method: 'PUT', body: UPDATED })
  assert.equal(none.status, 401)
  assert.equal(none.data.error.code, 'STUDENT_UNAUTHORIZED')
  const forged = await json(app, '/api/student/me', { method: 'PUT', body: UPDATED, headers: { authorization: 'Bearer forged' } })
  assert.equal(forged.status, 401)
  assert.equal(forged.data.error.code, 'STUDENT_INVALID_TOKEN')
})

test('PUT /api/student/me never echoes the token or login code', async () => {
  const { app } = makeApi()
  const { token } = await register(app)
  const { data } = await json(app, '/api/student/me', { method: 'PUT', body: UPDATED, headers: { authorization: `Bearer ${token}` } })
  assert.ok(!JSON.stringify(data).includes(token))
  assert.ok(!JSON.stringify(data).includes('loginCode'))
})

// ---------------------------------------------------------------------------
// GET /api/student/me/progress
// ---------------------------------------------------------------------------

test('GET /api/student/me/progress requires a Bearer token', async () => {
  const { app } = makeApi()
  const none = await json(app, '/api/student/me/progress')
  assert.equal(none.status, 401)
  assert.equal(none.data.error.code, 'STUDENT_UNAUTHORIZED')
  const forged = await json(app, '/api/student/me/progress', { headers: { authorization: 'Bearer forged' } })
  assert.equal(forged.status, 401)
  assert.equal(forged.data.error.code, 'STUDENT_INVALID_TOKEN')
})

test('GET /api/student/me/progress returns a safe overview for the token holder', async () => {
  const { app } = makeApi()
  const { token } = await register(app)
  const { status, data } = await json(app, '/api/student/me/progress', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(status, 200)
  assert.equal(data.streams.length, 4)
  assert.equal(data.overall.totalLevels, 20)
  assert.equal(data.overall.completedLevels, 0)
  assert.equal(data.overall.completedStreams, 0)
  assert.equal(data.overall.bestScore, null)
  assert.equal(data.streams[0].nextLevel.number, 1)
  assert.equal(data.streams[0].currentLevel, 1)
  assert.equal(data.streams[0].levels.length, 5)
  for (const stream of data.streams) {
    for (const level of stream.levels) {
      assert.ok(!('attempts' in level), 'per-level attempts never leak')
      assert.ok(!('bestScore' in level), 'per-level best score never leaks')
      assert.deepEqual(Object.keys(level).sort(), ['access', 'id', 'name', 'number', 'replayable', 'status'])
    }
  }
})

test('GET /api/student/me/progress is isolated per student', async () => {
  const { app } = makeApi()
  const { token: tokenA } = await register(app)
  const regB = await json(app, '/api/student/register', {
    method: 'POST', body: { initials: 'B', name: 'Student B', school: 'Other School', grade: 8 },
  })
  const tokenB = regB.data.token

  const a = await json(app, '/api/student/me/progress', { headers: { authorization: `Bearer ${tokenA}` } })
  const b = await json(app, '/api/student/me/progress', { headers: { authorization: `Bearer ${tokenB}` } })
  assert.equal(a.data.overall.completedLevels, 0)
  assert.equal(b.data.overall.completedLevels, 0)
  assert.ok(!JSON.stringify(b.data).includes('Amaya'), 'student B never sees student A data')
  assert.equal(b.data.streams[0].name, 'Science')
})

test('GET /api/student/me/progress is a 500 when the service is not wired', async () => {
  const { app } = makeApi({ withProgress: false })
  const { token } = await register(app)
  const { status, data } = await json(app, '/api/student/me/progress', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(status, 500)
  assert.equal(data.error.code, 'STUDENT_INTERNAL')
})

test('progress overview response contains no token material or login code', async () => {
  const { app } = makeApi()
  const { token } = await register(app)
  const { data } = await json(app, '/api/student/me/progress', { headers: { authorization: `Bearer ${token}` } })
  const raw = JSON.stringify(data)
  assert.ok(!raw.includes(token))
  assert.ok(!raw.includes('loginCode'))
  assert.ok(!raw.includes('special_access'))
})

// ---------------------------------------------------------------------------
// Existing routes still work; stacked demo app exposes the profile routes
// ---------------------------------------------------------------------------

test('avatar route is unaffected by the profile additions', async () => {
  const { app } = makeApi()
  const { token } = await register(app)
  const formData = new FormData()
  formData.append('photo', new Blob([new Uint8Array(64)], { type: 'image/jpeg' }), 'selfie.jpg')
  const resp = await app.request('/api/student/me/avatar', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: formData,
  })
  const data = await resp.json()
  assert.equal(resp.status, 200)
  assert.match(data.student.avatarUrl, /(data:image\/|memory:\/\/student-avatars)/)
})

test('stacked demo app serves the profile update + progress routes', async () => {
  const { app } = createDemoApi()
  const reg = await json(app, '/api/student/register', { method: 'POST', body: VALID })
  assert.equal(reg.status, 201)
  const bearer = { authorization: `Bearer ${reg.data.token}` }

  const me = await json(app, '/api/student/me', { headers: bearer })
  assert.equal(me.status, 200)

  const put = await json(app, '/api/student/me', { method: 'PUT', body: UPDATED, headers: bearer })
  assert.equal(put.status, 200)
  assert.equal(put.data.student.name, 'Amaya Silva-Ratnayake')

  const progress = await json(app, '/api/student/me/progress', { headers: bearer })
  assert.equal(progress.status, 200)
  assert.equal(progress.data.streams.length, 4)
  assert.equal(progress.data.overall.totalLevels, 20)

  const mission = await json(app, '/api/student/mission/streams', { headers: bearer })
  assert.equal(mission.status, 200)
  assert.equal(mission.data.streams.length, 4, 'mission routes still mounted before the student prefix')
})