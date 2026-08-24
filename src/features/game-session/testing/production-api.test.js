/**
 * Game Session — production API integration tests (Task 5.4).
 *
 * The full real-Supabase composition (`createProductionApi`) over a
 * deterministic fake PostgREST client: register → me → mission → start →
 * submit ×3 → finish, plus resume determinism, error mapping (401/403/404/
 * 409) and the security boundary (correctAnswer/scoring internals never leave
 * the server, and the session ledger is written exactly once).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createFakeSupabaseClient, questionFixtureToRow } from './fake-supabase-client.js'
import { createProductionApi } from '../api/production-server.js'
import { demoQuestions } from '../demo/seed-data.js'

async function buildStack() {
  const { client, db } = createFakeSupabaseClient()
  demoQuestions()
    .slice(0, 3)
    .forEach((q) => db.tables.questions.rows.push(questionFixtureToRow(q)))
  const stack = await createProductionApi({ client })
  return { ...stack, db }
}

async function register(app, initials = 'AS', name = 'Amaya Silva', school = 'Colombo High') {
  const resp = await app.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initials, name, school, grade: 7 }),
  })
  assert.equal(resp.status, 201)
  const body = await resp.json()
  assert.ok(body.token, 'opaque session token issued once')
  return { token: body.token, student: body.student }
}

const auth = (token) => ({ authorization: `Bearer ${token}` })

function correctResponse(db, questionId) {
  const row = db.tables.questions.rows.find((q) => q.id === Number(questionId))
  assert.ok(row, `seeded question ${questionId} exists`)
  return {
    placements: row.correct_answer.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })),
  }
}

test('full production flow persists one completed session with 3 answered rounds + 1 score', async () => {
  const { app, db } = await buildStack()
  const { token } = await register(app)

  const me = await app.request('/api/student/me', { headers: auth(token) })
  assert.equal(me.status, 200)
  const meBody = await me.json()
  assert.deepEqual(Object.keys(meBody.student).sort(), ['avatarUrl', 'grade', 'id', 'initials', 'name', 'school'])
  assert.ok(!JSON.stringify(meBody).includes('token'), 'no token/hash ever returned')

  const streams = await app.request('/api/student/mission/streams', { headers: auth(token) })
  assert.equal(streams.status, 200)
  const streamsBody = await streams.json()
  assert.equal(streamsBody.streams.length, 4)

  const start = await app.request(
    '/api/student/game/session',
    { method: 'POST', headers: auth(token), body: JSON.stringify({ streamId: 1, levelId: 1 }) }
  )
  assert.equal(start.status, 201)
  const startBody = await start.json()
  assert.equal(startBody.session.status, 'active')
  const descriptor = startBody.currentRound
  assert.equal(descriptor.totalRounds, 3)
  assert.equal(descriptor.activityType, 'drag-drop')
  const qrow = db.tables.questions.rows.find((q) => q.id === descriptor.questionId)
  assert.equal(descriptor.timer.allowedSeconds, qrow?.timer_override_seconds ?? 90, 'level default or question override (D-034)')
  assert.ok(!JSON.stringify(startBody).includes('correctAnswer'), 'correctAnswer never leaves the server')

  let round = descriptor
  let last
  for (let i = 0; i < 3; i += 1) {
    const submit = await app.request(
      `/api/student/game/session/${round.sessionId}/rounds/${round.roundId}/submit`,
      {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify({ response: correctResponse(db, round.questionId), interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1 } }),
      }
    )
    assert.equal(submit.status, 200)
    last = await submit.json()
    assert.equal(last.roundResult.correct, true)
    assert.equal(last.roundResult.correctnessFraction, 1)
    assert.ok(last.roundResult.pointsEarned > 0)
    if (last.nextRound) round = last.nextRound
  }
  assert.equal(last.progress.completed, true)
  assert.equal(last.nextRound, null)

  const current = await app.request(`/api/student/game/session/${round.sessionId}/current`, { headers: auth(token) })
  assert.equal((await current.json()).currentRound, null)

  const finish = await app.request(`/api/student/game/session/${round.sessionId}/finish`, { method: 'POST', headers: auth(token) })
  assert.equal(finish.status, 200)
  const finished = await finish.json()
  assert.equal(finished.status, 'completed')
  assert.equal(finished.roundBreakdown.length, 3)
  assert.ok(finished.sessionScore > 0 && finished.sessionScore <= 300)

  const dbSessions = db.tables.game_sessions.rows
  assert.equal(dbSessions.length, 1, 'exactly one session persisted')
  assert.equal(dbSessions[0].status, 'completed')
  assert.equal(dbSessions[0].total_score, finished.sessionScore)
  assert.deepEqual(dbSessions[0].selected_question_ids.length, 3)
  assert.ok(Number.isFinite(dbSessions[0].total_time_ms), 'total_time_ms persisted as a plain bigint number, never an ISO date string')

  const rounds = db.tables.session_rounds.rows.filter((r) => r.session_id === dbSessions[0].id)
  assert.equal(rounds.length, 3)
  assert.ok(rounds.every((r) => r.status === 'answered'))
  assert.deepEqual(rounds.map((r) => r.round_number), [1, 2, 3], 'rounds always come back ordered by round_number (first pending = round 1)')

  const answers = db.tables.student_answers.rows.filter((a) => a.session_id === dbSessions[0].id)
  assert.equal(answers.length, 3, 'one student_answers audit row per round')
  assert.ok(answers.every((a) => a.was_correct === true))

  const scores = db.tables.scores.rows
  assert.equal(scores.length, 1)
  assert.equal(scores[0].session_id, dbSessions[0].id)
  assert.equal(scores[0].score, finished.sessionScore)
  assert.equal(scores[0].round_breakdown.length, 3)
  assert.ok(Number.isFinite(scores[0].total_time_ms), 'scores.total_time_ms persisted as a number')
})

test('resume: a second start returns the same active session for the stream', async () => {
  const { app } = await buildStack()
  const { token } = await register(app)
  const start = () =>
    app.request('/api/student/game/session', { method: 'POST', headers: auth(token), body: JSON.stringify({ streamId: 1, levelId: 1 }) })

  const first = await start()
  const second = await start()
  assert.equal(first.status, 201)
  assert.equal(second.status, 201)
  const [a, b] = [await first.json(), await second.json()]
  assert.equal(b.session.id, a.session.id, 'active session resumed, no duplicate')
  assert.equal(b.currentRound.roundId, a.currentRound.roundId)
})

test('auth/authorization errors: 401 no-token, 401 bogus, 403 foreign session', async () => {
  const { app } = await buildStack()
  const { token: tokenA } = await register(app, 'AS', 'Amaya A')
  const { token: tokenB } = await register(app, 'BS', 'Bella B')

  const noToken = await app.request('/api/student/game/session', {
    method: 'POST',
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  assert.equal(noToken.status, 401)
  assert.equal((await noToken.json()).error.code, 'STUDENT_UNAUTHORIZED')

  const bogus = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth('not-a-token'),
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  assert.equal(bogus.status, 401)
  assert.equal((await bogus.json()).error.code, 'STUDENT_INVALID_TOKEN')

  const start = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(tokenA),
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  const { session } = await start.json()
  const foreign = await app.request(`/api/student/game/session/${session.id}/current`, { headers: auth(tokenB) })
  assert.equal(foreign.status, 403)
  assert.equal((await foreign.json()).error.code, 'GAME_SESSION_WRONG_STUDENT')
})

test('state/availability errors: locked level 409, unknown round 404, finish-early 409, no-questions 409', async () => {
  const { app, db } = await buildStack()
  const { token } = await register(app)

  const locked = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 1, levelId: 2 }),
  })
  assert.equal(locked.status, 409)
  assert.equal((await locked.json()).error.code, 'GAME_LEVEL_LOCKED')

  const start = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  const { session, currentRound } = await start.json()

  const badRound = await app.request(`/api/student/game/session/${session.id}/rounds/999/submit`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ response: {}, interactionMetrics: {} }),
  })
  assert.equal(badRound.status, 404)
  assert.equal((await badRound.json()).error.code, 'GAME_ROUND_NOT_FOUND')

  const early = await app.request(`/api/student/game/session/${session.id}/finish`, { method: 'POST', headers: auth(token) })
  assert.equal(early.status, 409)
  assert.equal((await early.json()).error.code, 'GAME_SESSION_INVALID_STATE')

  assert.ok(currentRound)
  db.tables.questions.rows = db.tables.questions.rows.filter((q) => q.status !== 'published')
  const noPool = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 2, levelId: 6 }),
  })
  assert.equal(noPool.status, 409)
  assert.equal((await noPool.json()).error.code, 'GAME_INSUFFICIENT_POOL')
})

test('production API responses never leak scoring internals', async () => {
  const { app, db } = await buildStack()
  const { token } = await register(app)

  const start = await app.request('/api/student/game/session', {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ streamId: 1, levelId: 1 }),
  })
  const { currentRound } = await start.json()
  const submit = await app.request(`/api/student/game/session/${currentRound.sessionId}/rounds/${currentRound.roundId}/submit`, {
    method: 'POST',
    headers: auth(token),
    body: JSON.stringify({ response: correctResponse(db, currentRound.questionId), interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1 } }),
  })
  const payload = await submit.text()
  for (const forbidden of ['correctAnswer', 'correct_answer', 'acceptableIds', 'mappings']) {
    assert.ok(!payload.includes(forbidden), `payload must not contain ${forbidden}`)
  }
})