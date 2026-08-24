/**
 * Leaderboard — finishSession hook tests (Task 5.7).
 *
 * GameSessionService.finishSession records the best score after progression
 * is written, with the authoritative server-computed values. The write is
 * best-effort by design: a failing leaderboardService must never roll the
 * completed session back or 500 the finish. Runs over the in-memory demo
 * store — no live project.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryStore, createMemoryRepositories } from '../../game-session/repositories/memory.js'
import { demoBaseData, seedStoreFromBaseData } from '../../game-session/demo/seed-data.js'
import GameSessionService from '../../game-session/service/game-session-service.js'

function makeService({ leaderboardService } = {}) {
  const store = createMemoryStore()
  seedStoreFromBaseData(store, demoBaseData())
  // Base-100 questions only so a perfect session always totals 300.
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  const repos = createMemoryRepositories(store)
  const service = new GameSessionService({ ...repos, leaderboardService })
  return { service, store, repos }
}

function correctFor(question) {
  return {
    placements: question.correctAnswer.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })),
  }
}

async function playPerfectSession(service) {
  const { session } = await service.startSession({ studentId: 1, streamId: 1, levelId: 1 })
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    const question = await service.questionRepository.getById(current.questionId)
    const res = await service.submitRound({
      sessionId: session.id,
      roundId: current.roundId,
      studentId: 1,
      submission: { response: correctFor(question), interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1 } },
    })
    current = res.nextRound ?? null
  }
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  return { session, finished }
}

test('finishSession calls recordBestScore once with the authoritative values', async () => {
  const calls = []
  const leaderboardService = { recordBestScore: async (args) => { calls.push(args); return { updated: true } } }
  const { service } = makeService({ leaderboardService })

  const { finished } = await playPerfectSession(service)
  assert.equal(calls.length, 1)
  const call = calls[0]
  assert.equal(call.studentId, 1)
  assert.equal(call.streamId, 1)
  assert.equal(call.score, 300)
  assert.equal(typeof call.achievedAt, 'number')
  assert.ok(call.achievedAt > 0)
  assert.equal(typeof call.completionTimeMs, 'number', 'server clock produces a completion time')
  assert.equal(finished.sessionScore, 300)
})

test('a re-finish does NOT write the leaderboard again (idempotent)', async () => {
  const calls = []
  const leaderboardService = { recordBestScore: async (args) => { calls.push(args); return { updated: true } } }
  const { service } = makeService({ leaderboardService })

  const { session } = await playPerfectSession(service)
  await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(calls.length, 1, 'only the first finish writes the best score')
})

test('a throwing leaderboardService never breaks the finished session', async () => {
  const leaderboardService = { recordBestScore: async () => { throw new Error('db hiccup') } }
  const { service } = makeService({ leaderboardService })

  const { finished } = await playPerfectSession(service)
  assert.equal(finished.status, 'completed')
  assert.equal(finished.sessionScore, 300)
})

test('finishSession works unchanged without a leaderboardService', async () => {
  const { service } = makeService({})
  const { finished } = await playPerfectSession(service)
  assert.equal(finished.status, 'completed')
  assert.equal(finished.sessionScore, 300)
})

export default { tests: true }