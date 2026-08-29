/**
 * Game Session — student-authenticated API tests (Task 5.3).
 *
 * Transport-level coverage of the real `/student/game` adapter. Every route
 * authenticates through StudentService with a REAL registered session token
 * (the SAME Task 5.1 session — no second auth system); `studentId` comes from
 * the token, never from the body/header. Exercises the full flow (start →
 * current → submit → progression → finish), resume, error mapping (401/403/
 * 404/409/400), and the security boundary (no correctAnswer leaks, forged
 * student ids ignored).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'

import { createGameApi } from '../api/server.js'
import { createStudentGameApi } from '../api/student-server.js'
import { createMemoryStore, createMemoryRepositories } from '../repositories/memory.js'
import { demoBaseData, seedStoreFromBaseData } from '../demo/seed-data.js'
import { demoMatchingQuestions } from '../demo/matching-demo-questions.js'
import { demoOrderingQuestions } from '../demo/ordering-demo-questions.js'
import { demoSortingQuestions } from '../demo/sorting-demo-questions.js'
import { demoFillCompleteQuestions } from '../demo/fill-complete-demo-questions.js'
import { demoImageInteractionQuestions } from '../demo/image-interaction-demo-questions.js'
import { demoPatternQuestions } from '../demo/pattern-demo-questions.js'
import { demoMemoryQuestions } from '../demo/memory-demo-questions.js'
import { demoScenarioQuestions } from '../demo/scenario-demo-questions.js'
import { demoNumberLogicQuestions } from '../demo/number-logic-demo-questions.js'
import GameSessionService from '../service/game-session-service.js'
import { createStudentApi } from '../../student/api/server.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'

const ALL_TEN_DEMO_QUESTIONS = () => [
  ...demoMatchingQuestions(),
  ...demoOrderingQuestions(),
  ...demoSortingQuestions(),
  ...demoFillCompleteQuestions(),
  ...demoImageInteractionQuestions(),
  ...demoPatternQuestions(),
  ...demoMemoryQuestions(),
  ...demoScenarioQuestions(),
  ...demoNumberLogicQuestions(),
]

/** Mirrors the production composition (dev-server createStackedApp). */
function buildStack({ allTenTypes = false } = {}) {
  const gameStore = createMemoryStore()
  seedStoreFromBaseData(gameStore, demoBaseData())
  if (gameStore.questions.length === 0) {
    for (let i = 1; i <= 6; i += 1) {
      gameStore.questions.push({
        id: i,
        streamId: 1,
        levelId: 1,
        activityType: 'drag-drop',
        prompt: 'Mock drag drop prompt',
        status: 'published',
        payload: {
          items: [{ id: 'i1', label: 'Item 1' }],
          zones: [{ id: 'z1', label: 'Zone 1' }],
        },
        correctAnswer: { mappings: [{ itemId: 'i1', zoneId: 'z1' }] },
      })
    }
  }
  if (allTenTypes) {
    gameStore.questions.push(...ALL_TEN_DEMO_QUESTIONS())
  }
  const gameRepos = createMemoryRepositories(gameStore)

  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)

  // Mirrors the production dev-server composition: registered students are
  // the single source of identity (demo store remains a legacy fallback).
  gameRepos.studentRepository = {
    findById: async (id) =>
      (await studentRepos.studentRepository.findById(id)) ??
      gameStore.students.find((s) => s.id === id) ??
      null,
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

async function register(app, initials = 'A', name = 'Amaya Silva') {
  const resp = await app.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initials, name, school: 'Colombo High', grade: 7 }),
  })
  assert.equal(resp.status, 201)
  const body = await resp.json()
  return { token: body.token, studentId: body.student.id }
}

const auth = (token) => ({ authorization: `Bearer ${token}` })

function correctDragDropResponse(gameStore, questionId) {
  const q = gameStore.questions.find((x) => x.id === Number(questionId))
  assert.ok(q, `question ${questionId} exists in the demo pool`)
  return {
    placements: q.correctAnswer.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })),
  }
}

test('full flow: start → submit all 3 rounds → finish over the student API', async () => {
  const { app, gameStore } = buildStack()
  const { token } = await register(app)

  const start = await app.request(
    '/api/student/game/session',
    { method: 'POST', headers: auth(token), body: JSON.stringify({ streamId: 1, levelId: 1 }) }
  )
  assert.equal(start.status, 201)
  const { session, currentRound } = await start.json()
  assert.equal(session.status, 'active')
  assert.ok(currentRound.sessionId, 'safe descriptor carries the session id')
  assert.equal(currentRound.totalRounds, 3)
  assert.equal(currentRound.progress.current, 1)
  assert.equal(currentRound.activityType, 'drag-drop')
  assert.equal(currentRound.activity.kind, 'drag-drop')
  // D-034/D-059: assert the contract, not a fixed fixture — a level-1 demo
  // question may carry a per-question timer override (question 4 = 45s).
  const selected = gameStore.questions.find((x) => x.id === currentRound.questionId)
  assert.equal(currentRound.timer.allowedSeconds, selected?.timerOverrideSeconds ?? 90,
    'level 1 default timer or question override (D-034)')
  assert.ok(Array.isArray(currentRound.hints))

  let round = currentRound
  let lastResult = null
  for (let i = 0; i < 3; i += 1) {
    const response = correctDragDropResponse(gameStore, round.questionId)
    const submit = await app.request(
      `/api/student/game/session/${round.sessionId}/rounds/${round.roundId}/submit`,
      { method: 'POST', headers: auth(token), body: JSON.stringify({ response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1 } }) }
    )
    assert.equal(submit.status, 200)
    const result = await submit.json()
    assert.equal(result.roundResult.correct, true)
    assert.equal(result.roundResult.correctnessFraction, 1)
    assert.ok(result.roundResult.pointsEarned > 0)
    assert.equal(result.progress.completed, i === 2)
    lastResult = result
    if (result.nextRound) {
      round = result.nextRound
    }
  }
  assert.equal(lastResult.progress.current, 3)

  const current = await app.request(`/api/student/game/session/${session.id}/current`, { headers: auth(token) })
  const currentBody = await current.json()
  assert.equal(currentBody.currentRound, null, 'no pending round after all answers')

  const finish = await app.request(`/api/student/game/session/${session.id}/finish`, { method: 'POST', headers: auth(token) })
  assert.equal(finish.status, 200)
  const finished = await finish.json()
  assert.equal(finished.status, 'completed')
  assert.equal(finished.roundBreakdown.length, 3)
  assert.ok(finished.sessionScore > 0 && finished.sessionScore <= 300)
  assert.ok(['passed', 'attempted'].includes(finished.result))
})

test('start resumes the student’s active session for the stream (deterministic refresh)', async () => {
  const { app } = buildStack()
  const { token } = await register(app)

  const first = await app.request(
    '/api/student/game/session',
    { method: 'POST', headers: auth(token), body: JSON.stringify({ streamId: 1, levelId: 1 }) }
  )
  assert.equal(first.status, 201)
  const firstBody = await first.json()

  const second = await app.request(
    '/api/student/game/session',
    { method: 'POST', headers: auth(token), body: JSON.stringify({ streamId: 1, levelId: 1 }) }
  )
  assert.equal(second.status, 201)
  const secondBody = await second.json()
  assert.equal(secondBody.session.id, firstBody.session.id, 'same active session is resumed')
  assert.equal(secondBody.currentRound.roundId, firstBody.currentRound.roundId)
})

test('mixed ten-type pool: start returns a safe descriptor for one of the ten types', async () => {
  const { app } = buildStack({ allTenTypes: true })
  const { token } = await register(app)

  const start = await app.request(
    '/api/student/game/session',
    { method: 'POST', headers: auth(token), body: JSON.stringify({ streamId: 1, levelId: 1 }) }
  )
  assert.equal(start.status, 201)
  const body = await start.json()
  const serialized = JSON.stringify(body)
  assert.equal(body.currentRound.activity.kind, body.currentRound.activityType)
  assert.ok(!serialized.includes('correctAnswer'), 'correct answers never leave the server')
  assert.ok(!serialized.includes('"correctnessFraction"'), 'scoring internals never reach the client')
})

test('missing, bogus and forged-token requests are rejected', async () => {
  const { app } = buildStack()
  const { token: tokenA, studentId: studentA } = await register(app, 'A', 'Amaya A')
  const { token: tokenB } = await register(app, 'B', 'Bella B')

  const missing = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  assert.equal(missing.status, 401)
  assert.equal((await missing.json()).error.code, 'STUDENT_UNAUTHORIZED')

  const bogus = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth('nope'),
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  assert.equal(bogus.status, 401)
  assert.equal((await bogus.json()).error.code, 'STUDENT_INVALID_TOKEN')

  // A second student can never reach session A's rounds (token is identity).
  const start = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(tokenA),
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  const { session } = await start.json()
  assert.equal(start.status, 201)

  const wrong = await app.request(`/api/student/game/session/${session.id}/current`, { headers: auth(tokenB) })
  assert.equal(wrong.status, 403)
  assert.equal((await wrong.json()).error.code, 'GAME_SESSION_WRONG_STUDENT')

  assert.ok(studentA > 0, 'a real registered student backs the session')
})

test('locked levels, exhausted pools and bad inputs map to 409 / 400', async () => {
  const { app } = buildStack()
  const { token } = await register(app)

  const locked = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 1, levelId: 2 }),
  })
  assert.equal(locked.status, 409)
  assert.equal((await locked.json()).error.code, 'GAME_LEVEL_LOCKED')

  const empty = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 2, levelId: 6 }),
  })
  assert.equal(empty.status, 409)
  assert.equal((await empty.json()).error.code, 'GAME_INSUFFICIENT_POOL')

  const badBody = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 'x', levelId: 'y' }),
  })
  assert.equal(badBody.status, 409, 'NaN level lookups fail safe')
})

test('session state guards: unknown session 404, finish-before-complete 409', async () => {
  const { app } = buildStack()
  const { token } = await register(app)

  const unknown = await app.request('/api/student/game/session/999/current', { headers: auth(token) })
  assert.equal(unknown.status, 404)
  assert.equal((await unknown.json()).error.code, 'GAME_SESSION_NOT_FOUND')

  const start = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  const { session } = await start.json()

  const early = await app.request(`/api/student/game/session/${session.id}/finish`, { method: 'POST', headers: auth(token) })
  assert.equal(early.status, 409)
  assert.equal((await early.json()).error.code, 'GAME_SESSION_INVALID_STATE')

  const badRound = await app.request(`/api/student/game/session/${session.id}/rounds/999/submit`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ response: {}, interactionMetrics: {} }),
  })
  assert.equal(badRound.status, 404)
  assert.equal((await badRound.json()).error.code, 'GAME_ROUND_NOT_FOUND')
})