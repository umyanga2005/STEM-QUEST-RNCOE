/**
 * Leaderboard — Hono API tests (Task 5.7).
 *
 * Transport-level coverage of the public read endpoints. The leaderboard
 * prefix is mounted BEFORE the generic student prefix (mirroring the
 * production composition). Auth is OPTIONAL: no token, invalid token and a
 * valid token all get the same public boards; only the valid token turns on
 * the server-derived `self` highlight. The response never carries student
 * ids, tokens, hashes, schools, grades or login codes.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'

import { createLeaderboardApi } from '../api/server.js'
import { LeaderboardService } from '../service/leaderboard-service.js'
import { createLeaderboardMemoryRepositories } from '../repositories/memory.js'
import { createStudentApi } from '../../student/api/server.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'

const STREAMS = [
  { id: 1, slug: 'science', name: 'Science', themeColor: '#22d3ee', displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', themeColor: null, displayOrder: 2, isActive: true },
  { id: 3, slug: 'engineering', name: 'Engineering', themeColor: null, displayOrder: 3, isActive: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', themeColor: null, displayOrder: 4, isActive: true },
]

function buildStack() {
  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)

  const leaderboardRepos = createLeaderboardMemoryRepositories()
  const leaderboardService = new LeaderboardService({
    studentRepository: studentRepos.studentRepository,
    streamRepository: {
      listActive: async () => STREAMS,
      findById: async (id) => STREAMS.find((s) => s.id === Number(id)) ?? null,
    },
    leaderboardRepository: leaderboardRepos.leaderboardRepository,
  })

  const leaderboardApp = createLeaderboardApi({ studentService, leaderboardService })
  const studentApp = createStudentApi({ service: studentService })

  const root = new Hono()
  root.use('/api/student/leaderboards/*', (c) => leaderboardApp.fetch(c.req.raw, c.env))
  root.use('/api/student/*', (c) => studentApp.fetch(c.req.raw, c.env))

  return { app: root, leaderboardService, studentService }
}

async function register(app, initials = 'SS') {
  const resp = await app.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initials, name: 'Smoke Student', school: 'Colombo High', grade: 7 }),
  })
  assert.equal(resp.status, 201)
  const body = await resp.json()
  return { token: body.token, id: body.student.id }
}

test('GET /api/student/leaderboards returns all four public boards (no token)', async () => {
  const { app, leaderboardService } = buildStack()
  const a = await register(app, 'SS')
  const b = await register(app, 'B2')
  await leaderboardService.recordBestScore({ studentId: a.id, streamId: 1, score: 300, achievedAt: 1000 })
  await leaderboardService.recordBestScore({ studentId: b.id, streamId: 1, score: 240, achievedAt: 2000 })
  await leaderboardService.recordBestScore({ studentId: b.id, streamId: 4, score: 120, achievedAt: 3000 })

  const resp = await app.request('/api/student/leaderboards')
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.leaderboards.length, 4)
  assert.deepEqual(body.leaderboards.map((l) => l.stream.slug), ['science', 'technology', 'engineering', 'mathematics'])

  const science = body.leaderboards[0]
  assert.deepEqual(science.entries.map((e) => [e.rank, e.score]), [
    [1, 300],
    [2, 240],
  ])
  assert.equal(science.entries[0].displayName, 'SS Smoke Student')
  assert.ok(science.entries.every((e) => e.self === false), 'no token → no self highlight')

  const math = body.leaderboards[3]
  assert.deepEqual(math.entries.map((e) => [e.rank, e.displayName, e.score]), [[1, 'B2 Smoke Student', 120]])
})

test('GET /api/student/leaderboards never leaks private fields', async () => {
  const { app, leaderboardService } = buildStack()
  const a = await register(app, 'SS')
  await leaderboardService.recordBestScore({ studentId: a.id, streamId: 1, score: 300, achievedAt: 1000 })

  const resp = await app.request('/api/student/leaderboards')
  const text = JSON.stringify(await resp.json())
  for (const leaked of ['studentId', 'student_id', 'token', 'tokenHash', 'loginCode', 'school', 'grade', 'initials']) {
    assert.ok(!text.includes(leaked), `must not leak "${leaked}"`)
  }
})

test('valid token highlights the caller’s own entry only', async () => {
  const { app, leaderboardService } = buildStack()
  const a = await register(app, 'SS')
  const b = await register(app, 'B2')
  await leaderboardService.recordBestScore({ studentId: a.id, streamId: 1, score: 300, achievedAt: 1000 })
  await leaderboardService.recordBestScore({ studentId: b.id, streamId: 1, score: 240, achievedAt: 2000 })

  const resp = await app.request('/api/student/leaderboards', { headers: { authorization: `Bearer ${b.token}` } })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  const science = body.leaderboards[0]
  assert.deepEqual(science.entries.map((e) => e.self), [false, true], 'only the caller’s row is self')
})

test('invalid or expired token still returns the public boards without a highlight', async () => {
  const { app, leaderboardService } = buildStack()
  const a = await register(app, 'SS')
  await leaderboardService.recordBestScore({ studentId: a.id, streamId: 1, score: 300, achievedAt: 1000 })

  const bogus = await app.request('/api/student/leaderboards', { headers: { authorization: 'Bearer not-a-real-token' } })
  assert.equal(bogus.status, 200)
  const body = await bogus.json()
  assert.ok(body.leaderboards[0].entries.every((e) => e.self === false), 'invalid token is treated as anonymous')
})

test('GET /api/student/leaderboards/:streamId returns one board with self highlight', async () => {
  const { app, leaderboardService } = buildStack()
  const a = await register(app, 'SS')
  await leaderboardService.recordBestScore({ studentId: a.id, streamId: 3, score: 280, achievedAt: 1000 })

  const resp = await app.request('/api/student/leaderboards/3', { headers: { authorization: `Bearer ${a.token}` } })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.stream.slug, 'engineering')
  assert.deepEqual(body.entries, [{ rank: 1, displayName: 'SS Smoke Student', score: 280, self: true }])
})

test('unknown stream is a 404, malformed stream is a 400', async () => {
  const { app } = buildStack()
  const missing = await app.request('/api/student/leaderboards/999')
  assert.equal(missing.status, 404)
  assert.equal((await missing.json()).error.code, 'LEADERBOARD_STREAM_UNAVAILABLE')

  const malformed = await app.request('/api/student/leaderboards/abc')
  assert.equal(malformed.status, 400)
  assert.equal((await malformed.json()).error.code, 'LEADERBOARD_INVALID_INPUT')
})

test('unknown leaderboard routes fall through to a 404', async () => {
  const { app } = buildStack()
  const resp = await app.request('/api/student/leaderboards/1/extra')
  assert.equal(resp.status, 404)
})

export default { tests: true }