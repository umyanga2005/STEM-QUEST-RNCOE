/**
 * Game Session — progression integration tests (Task 5.5).
 *
 * End-to-end over the student-authenticated API + in-memory stack: session
 * start is gated by ProgressionService (D-076), finish writes the deferred
 * progression rows, re-finish is idempotent, and the unlock + completion
 * behaviour is correct across streams, students and special access.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'

import { createGameApi } from '../api/server.js'
import { createStudentGameApi } from '../api/student-server.js'
import { createMemoryStore, createMemoryRepositories } from '../repositories/memory.js'
import { demoBaseData, seedStoreFromBaseData } from '../demo/seed-data.js'
import GameSessionService from '../service/game-session-service.js'
import { createStudentApi } from '../../student/api/server.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'

function buildStack() {
  const gameStore = createMemoryStore()
  seedStoreFromBaseData(gameStore, demoBaseData())
  // Add level-2 and level-3 questions so progression-unlocked levels play.
  const base = gameStore.questions[0]
  for (let i = 0; i < 4; i += 1) {
    gameStore.questions.push({ ...base, id: 2000 + i, levelId: 2 })
  }
  for (let i = 0; i < 4; i += 1) {
    gameStore.questions.push({ ...base, id: 3000 + i, levelId: 3 })
  }
  const gameRepos = createMemoryRepositories(gameStore)

  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)
  gameRepos.studentRepository = {
    findById: async (id) => (await studentRepos.studentRepository.findById(id)) ?? null,
  }
  const gameService = new GameSessionService(gameRepos)
  const gameApp = createGameApi({ service: gameService })
  const studentApp = createStudentApi({ service: studentService })
  const studentGameApp = createStudentGameApi({ studentService, gameService })

  const root = new Hono()
  root.use('/api/student/game/*', (c) => studentGameApp.fetch(c.req.raw, c.env))
  root.use('/api/student/*', (c) => studentApp.fetch(c.req.raw, c.env))
  root.use('/api/*', (c) => gameApp.fetch(c.req.raw, c.env))

  return { app: root, gameStore, gameService }
}

async function register(app, initials = 'A') {
  const resp = await app.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initials, name: 'Amaya Silva', school: 'Colombo High', grade: 7 }),
  })
  assert.equal(resp.status, 201)
  const body = await resp.json()
  return { token: body.token, studentId: body.student.id }
}

const auth = (token) => ({ authorization: `Bearer ${token}` })

function correctResponse(gameStore, questionId) {
  const q = gameStore.questions.find((x) => x.id === Number(questionId))
  assert.ok(q, `question ${questionId} exists in the pool`)
  return {
    placements: q.correctAnswer.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })),
  }
}

async function startSession(app, token, streamId, levelId) {
  return app.request('/api/student/game/session', {
    method: 'POST',
    headers: { ...auth(token), 'content-type': 'application/json' },
    body: JSON.stringify({ streamId, levelId }),
  })
}

/** Plays + finishes a full 3-round session for the given level, returning the finish body. */
async function completeSession(app, gameStore, token, streamId, levelId) {
  const start = await startSession(app, token, streamId, levelId)
  assert.equal(start.status, 201, `level ${levelId} start should succeed`)
  let { session, currentRound } = await start.json()
  for (let i = 0; i < 3; i += 1) {
    const q = currentRound.questionId
    const sub = await app.request(`/api/student/game/session/${session.id}/rounds/${currentRound.roundId}/submit`, {
      method: 'POST',
      headers: { ...auth(token), 'content-type': 'application/json' },
      body: JSON.stringify({ response: correctResponse(gameStore, q), interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }),
    })
    assert.equal(sub.status, 200)
    const body = await sub.json()
    if (body.nextRound) currentRound = body.nextRound
  }
  const finish = await app.request(`/api/student/game/session/${session.id}/finish`, { method: 'POST', headers: auth(token) })
  assert.equal(finish.status, 200)
  return { finish: await finish.json(), sessionId: session.id }
}

test('fresh students cannot start level 2 (D-076) but level 1 is always open', async () => {
  const { app } = buildStack()
  const { token } = await register(app)

  const locked = await startSession(app, token, 1, 2)
  assert.equal(locked.status, 409)
  const lockedBody = await locked.json()
  assert.equal(lockedBody.error.code, 'GAME_LEVEL_LOCKED')

  const open = await startSession(app, token, 1, 1)
  assert.equal(open.status, 201)
})

test('full flow: completing level 1 unlocks level 2 and persists progression rows', async () => {
  const { app, gameStore } = buildStack()
  const { token, studentId } = await register(app)

  await completeSession(app, gameStore, token, 1, 1)

  // Deferred progression rows are written by finishSession.
  const levelRow = gameStore.studentLevelProgress.find((p) => p.studentId === studentId && p.levelId === 1)
  assert.ok(levelRow, 'student_level_progress row exists')
  assert.equal(levelRow.isCompleted, true)
  assert.equal(levelRow.attempts, 1)
  const streamRow = gameStore.studentProgress.find((p) => p.studentId === studentId && p.streamId === 1)
  assert.ok(streamRow, 'student_progress row exists')
  assert.equal(streamRow.currentLevel, 2)
  assert.equal(streamRow.completedLevels, 1)

  // Level 2 is now playable through the same unlock gate.
  const level2 = await startSession(app, token, 1, 2)
  assert.equal(level2.status, 201)
})

test('re-finishing a completed session is idempotent (no duplicate progression writes)', async () => {
  const { app, gameStore } = buildStack()
  const { token, studentId } = await register(app)

  const { finish, sessionId } = await completeSession(app, gameStore, token, 1, 1)

  const again = await app.request(`/api/student/game/session/${sessionId}/finish`, { method: 'POST', headers: auth(token) })
  assert.equal(again.status, 200)
  const againBody = await again.json()
  assert.equal(againBody.sessionScore, finish.sessionScore)
  assert.equal(againBody.status, 'completed')
  assert.equal(againBody.result, finish.result)
  assert.equal(againBody.roundBreakdown.length, 3)

  const levelRows = gameStore.studentLevelProgress.filter((p) => p.studentId === studentId && p.levelId === 1)
  assert.equal(levelRows.length, 1, 'no duplicate level row from idempotent re-finish')
  assert.equal(levelRows[0].attempts, 1, 'attempts are not double-counted by re-finish')
})

test('completion is stream-specific: stream 1 progress never unlocks stream 2', async () => {
  const { app, gameStore } = buildStack()
  const { token } = await register(app)

  await completeSession(app, gameStore, token, 1, 1)

  const other = await startSession(app, token, 2, 2)
  assert.equal(other.status, 409)
  assert.equal((await other.json()).error.code, 'GAME_LEVEL_LOCKED')
})

test('completing a special-access level writes a normal completion record', async () => {
  const { app, gameStore } = buildStack()
  const { token, studentId } = await register(app)

  // Grant the student stream-wide access to science, then play level 3 directly.
  gameStore.specialAccess.push({ id: 99, studentId, streamId: 1, levelId: null, isActive: true, expiresAt: null })

  const level3 = await startSession(app, token, 1, 3)
  assert.equal(level3.status, 201)

  await completeSession(app, gameStore, token, 1, 3)

  const levelRow = gameStore.studentLevelProgress.find((p) => p.studentId === studentId && p.levelId === 3)
  assert.ok(levelRow, 'a completed special-access play still records progression')
  assert.equal(levelRow.isCompleted, true)
})

test('another student never sees or inherits the first student unlock', async () => {
  const { app, gameStore } = buildStack()
  const { token, studentId } = await register(app, 'A')
  const { token: tokenB, studentId: studentB } = await register(app, 'B')

  await completeSession(app, gameStore, token, 1, 1)

  assert.equal(gameStore.studentLevelProgress.some((p) => p.studentId === studentB), false)
  const lockedB = await startSession(app, tokenB, 1, 2)
  assert.equal(lockedB.status, 409, 'student B is still locked on level 2')
  void studentId
})

test('finish payload leaks no scoring secrets or progression internals', async () => {
  const { app, gameStore } = buildStack()
  const { token } = await register(app)

  const { finish, sessionId } = await completeSession(app, gameStore, token, 1, 1)
  const again = await app.request(`/api/student/game/session/${sessionId}/finish`, { method: 'POST', headers: auth(token) })
  const againBody = await again.json()
  const all = JSON.stringify([finish, againBody])
  assert.ok(!/correctAnswer|correct_answer|correctnessFraction|acceptableIds|studentId|streamId|levelId/.test(all), 'no internals leak')
  assert.ok(!/isCompleted|bestScore|currentLevel/.test(all), 'no progression internals leak')
})

test('startSession still refuses a locked level even with a completed SESSION (progress is per level, not per session)', async () => {
  const { app, gameStore } = buildStack()
  const { token } = await register(app)

  await completeSession(app, gameStore, token, 1, 1)
  // Level 3 remains locked: only level 2 became available.
  const level3 = await startSession(app, token, 1, 3)
  assert.equal(level3.status, 409)
  assert.equal((await level3.json()).error.code, 'GAME_LEVEL_LOCKED')
})

test('a completed level remains replayable (level 1 start still works after completion)', async () => {
  const { app, gameStore } = buildStack()
  const { token } = await register(app)

  await completeSession(app, gameStore, token, 1, 1)
  const replay = await startSession(app, token, 1, 1)
  assert.equal(replay.status, 201)
})