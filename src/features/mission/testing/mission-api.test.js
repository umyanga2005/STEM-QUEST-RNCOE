/**
 * Mission — Hono API tests (Task 5.2).
 *
 * Transport-level coverage: the mission app authenticates through
 * StudentService with a REAL registered session token (same lightweight
 * session as Task 5.1 — no second auth system), returns the streams + levels
 * payloads, and maps 401/400/404 correctly. StudentError and MissionError
 * both round-trip to HTTP.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'

import { createMissionApi } from '../api/server.js'
import { MissionService } from '../service/mission-service.js'
import {
  createMissionMemoryStore,
  createMissionMemoryRepositories,
  seedMissionStore,
} from '../repositories/memory.js'
import { createStudentApi } from '../../student/api/server.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'

const STREAMS = [
  { id: 1, slug: 'science', name: 'Science', description: 'Energy and matter.', themeColor: null, displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', description: null, themeColor: null, displayOrder: 2, isActive: true },
  { id: 3, slug: 'engineering', name: 'Engineering', description: null, themeColor: null, displayOrder: 3, isActive: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', description: null, themeColor: null, displayOrder: 4, isActive: true },
]
const LEVEL_NAMES = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Hard']

function levelsForStream(streamId) {
  return LEVEL_NAMES.map((name, i) => ({ id: (streamId - 1) * 5 + (i + 1), streamId, number: i + 1, name, isActive: true }))
}

function buildStack() {
  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)

  const store = createMissionMemoryStore()
  seedMissionStore(store, {
    streams: STREAMS,
    levels: STREAMS.flatMap((s) => levelsForStream(s.id)),
  })
  const missionRepos = createMissionMemoryRepositories(store)
  const missionService = new MissionService(missionRepos)
  const missionApp = createMissionApi({ studentService, missionService })
  const studentApp = createStudentApi({ service: studentService })

  // Mirror the production composition (dev-server createStackedApp): the
  // mission prefix is mounted before the generic student prefix.
  const root = new Hono()
  root.use('/api/student/mission/*', (c) => missionApp.fetch(c.req.raw, c.env))
  root.use('/api/student/*', (c) => studentApp.fetch(c.req.raw, c.env))

  return { app: root, studentService }
}

async function register(app, initials = 'A') {
  const resp = await app.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initials, name: 'Amaya Silva', school: 'Colombo High', grade: 7 }),
  })
  assert.equal(resp.status, 201)
  return (await resp.json()).token
}

test('streams endpoint returns the four streams for a valid session', async () => {
  const { app } = buildStack()
  const token = await register(app)
  const resp = await app.request('/api/student/mission/streams', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.streams.length, 4)
  assert.deepEqual(body.streams.map((s) => s.slug), ['science', 'technology', 'engineering', 'mathematics'])
  assert.equal(body.streams[0].levelCount, 5)
})

test('levels endpoint returns five resolved level cards', async () => {
  const { app } = buildStack()
  const token = await register(app)
  const resp = await app.request('/api/student/mission/streams/1/levels', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.stream.slug, 'science')
  assert.equal(body.levels.length, 5)
  assert.deepEqual(body.levels[0], {
    id: 1,
    number: 1,
    name: 'Beginner',
    access: 'available',
    status: 'not-started',
    selectable: true,
    replayable: false,
  })
  assert.equal(body.levels[1].access, 'locked')
  assert.equal(body.levels[1].selectable, false)
})

test('missing or invalid tokens are rejected with 401 (session is the only auth)', async () => {
  const { app } = buildStack()
  const missing = await app.request('/api/student/mission/streams')
  assert.equal(missing.status, 401)
  const missingBody = await missing.json()
  assert.equal(missingBody.error.code, 'STUDENT_UNAUTHORIZED')

  const bogus = await app.request('/api/student/mission/streams', { headers: { authorization: 'Bearer nope' } })
  assert.equal(bogus.status, 401)
  const bogusBody = await bogus.json()
  assert.equal(bogusBody.error.code, 'STUDENT_INVALID_TOKEN')
  assert.equal(bogusBody.error.category, 'SECURITY')
})

test('expired sessions are rejected with 401 so the UI can redirect', async () => {
  let now = Date.now()
  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService({ ...studentRepos, now: () => now })
  const store = createMissionMemoryStore()
  seedMissionStore(store, { streams: STREAMS, levels: STREAMS.flatMap((s) => levelsForStream(s.id)) })
  const missionRepos = createMissionMemoryRepositories(store)
  const missionService = new MissionService(missionRepos)
  const missionApp = createMissionApi({ studentService, missionService })
  const studentApp = createStudentApi({ service: studentService })
  const root = new Hono()
  root.use('/api/student/mission/*', (c) => missionApp.fetch(c.req.raw, c.env))
  root.use('/api/student/*', (c) => studentApp.fetch(c.req.raw, c.env))

  const reg = await root.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initials: 'A', name: 'Amaya', school: 'Colombo High', grade: 7 }),
  })
  const { token } = await reg.json()

  now += 2 * 3600 * 1000 // advance past the 1-hour session TTL
  const resp = await root.request('/api/student/mission/streams', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, 'STUDENT_TOKEN_EXPIRED')
})

test('unknown streams and malformed ids map to 404 / 400', async () => {
  const { app } = buildStack()
  const token = await register(app)
  const unknown = await app.request('/api/student/mission/streams/999/levels', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(unknown.status, 404)
  assert.equal((await unknown.json()).error.code, 'MISSION_STREAM_UNAVAILABLE')

  const malformed = await app.request('/api/student/mission/streams/abc/levels', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(malformed.status, 400)
  assert.equal((await malformed.json()).error.code, 'MISSION_INVALID_INPUT')
})

test('unknown mission endpoints 404 within the mission scope', async () => {
  const { app } = buildStack()
  const token = await register(app)
  const resp = await app.request('/api/student/mission/streams/1/foo', { headers: { authorization: `Bearer ${token}` } })
  assert.equal(resp.status, 404)
  assert.equal((await resp.json()).error.code, 'MISSION_NOT_FOUND')
})