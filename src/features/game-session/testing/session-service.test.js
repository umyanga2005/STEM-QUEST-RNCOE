/**
 * Game Session — GameSessionService tests (Task 4.4).
 *
 * Exercises the full server-authoritative pipeline over in-memory
 * repositories (no Supabase): start → selection → safe descriptor →
 * submitRound (validateAnswer → scoringInputs → Central Scoring Service) →
 * round progression → finishSession (0–300). Also proves the security
 * boundary: forged correctness/score/overtime/session values are never
 * believed and correct answers never appear in responses.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryStore, createMemoryRepositories } from '../repositories/memory.js'
import { demoBaseData, seedStoreFromBaseData } from '../demo/seed-data.js'
import GameSessionService from '../service/game-session-service.js'
import { GAME_ERROR_CODES } from '../../game-engine/core/errors.js'
import { selectRoundQuestions } from '../../game-engine/index.js'
import { ERROR_CODES as ACTIVITY_ERROR_CODES } from '../../activity-engine/errors/index.js'

import matchingGradePayload from '../../../../schemas/examples/matching/valid-payload-grade6-7.json' with { type: 'json' }
import matchingGradeAnswer from '../../../../schemas/examples/matching/valid-correct-answer.json' with { type: 'json' }
import matchingPhysicsPayload from '../../../../schemas/examples/matching/valid-payload-grade9-11.json' with { type: 'json' }
import matchingPhysicsAnswer from '../../../../schemas/examples/matching/grade9-11-correct-answer.json' with { type: 'json' }
import sortingGradePayload from '../../../../schemas/examples/sorting/valid-payload-grade6-7.json' with { type: 'json' }
import sortingGradeAnswer from '../../../../schemas/examples/sorting/valid-correct-answer.json' with { type: 'json' }
import sortingPhysicsPayload from '../../../../schemas/examples/sorting/valid-payload-grade9-11.json' with { type: 'json' }
import fillGradePayload from '../../../../schemas/examples/fill-complete/valid-payload-grade6-7.json' with { type: 'json' }
import fillGradeAnswer from '../../../../schemas/examples/fill-complete/valid-correct-answer.json' with { type: 'json' }
import fillPhysicsPayload from '../../../../schemas/examples/fill-complete/valid-payload-grade9-11.json' with { type: 'json' }
import fillMinimalPayload from '../../../../schemas/examples/fill-complete/minimal-valid-payload.json' with { type: 'json' }
import patternMinimalPayload from '../../../../schemas/examples/pattern/minimal-valid-payload.json' with { type: 'json' }
import patternMinimalAnswer from '../../../../schemas/examples/pattern/valid-correct-answer.json' with { type: 'json' }
import patternShapesPayload from '../../../../schemas/examples/pattern/valid-payload-grade6-7.json' with { type: 'json' }
import patternFillPayload from '../../../../schemas/examples/pattern/valid-payload-grade9-11.json' with { type: 'json' }
import memoryMinimalPayload from '../../../../schemas/examples/memory/minimal-valid-payload.json' with { type: 'json' }
import memoryGrade911Payload from '../../../../schemas/examples/memory/valid-payload-grade9-11.json' with { type: 'json' }
import memoryGrade911Answer from '../../../../schemas/examples/memory/valid-correct-answer.json' with { type: 'json' }
import scenarioMinimalPayload from '../../../../schemas/examples/scenario/minimal-valid-payload.json' with { type: 'json' }
import scenarioGrade67Payload from '../../../../schemas/examples/scenario/valid-payload-grade6-7.json' with { type: 'json' }
import scenarioGrade911Payload from '../../../../schemas/examples/scenario/valid-payload-grade9-11.json' with { type: 'json' }
import scenarioGrade911Answer from '../../../../schemas/examples/scenario/valid-correct-answer.json' with { type: 'json' }
import numberLogicMinimalPayload from '../../../../schemas/examples/number-logic/minimal-valid-payload.json' with { type: 'json' }
import numberLogicGrade67Payload from '../../../../schemas/examples/number-logic/valid-payload-grade6-7.json' with { type: 'json' }
import numberLogicGrade911Payload from '../../../../schemas/examples/number-logic/valid-payload-grade9-11.json' with { type: 'json' }
import numberLogicFractionAnswer from '../../../../schemas/examples/number-logic/valid-correct-answer.json' with { type: 'json' }
import numberLogicPartialCreditAnswer from '../../../../schemas/examples/number-logic/partial-credit.json' with { type: 'json' }

/** Movable clock so server timestamps are controllable (time authority). */
function makeClock(start = 1_000_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms) => {
      t += ms
    },
    set: (v) => {
      t = v
    },
  }
}

/** Fully-populated service over the in-memory demo store. */
function makeService(opts = {}) {
  const store = createMemoryStore()
  seedStoreFromBaseData(store, demoBaseData())
  const repos = createMemoryRepositories(store)
  const clock = opts.clock ?? makeClock()
  const service = new GameSessionService({ ...repos, now: clock.now })
  return { store, repos, service, clock }
}

function correctFor(question) {
  return {
    placements: question.correctAnswer.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })),
  }
}

function wrongFor(question) {
  const correct = new Map(question.correctAnswer.mappings.map((m) => [m.itemId, m.zoneId]))
  const zones = question.payload.zones.map((z) => z.id)
  return {
    placements: question.payload.items.map((item) => {
      const zoneId = zones.find((z) => z !== correct.get(item.id)) ?? correct.get(item.id)
      return { itemId: item.id, zoneId }
    }),
  }
}

function partialFor(question, correctCount) {
  const { items } = question.payload
  const correct = new Map(question.correctAnswer.mappings.map((m) => [m.itemId, m.zoneId]))
  const zones = question.payload.zones.map((z) => z.id)
  const placements = items.map((item, i) => {
    let zoneId
    if (i < correctCount) {
      zoneId = correct.get(item.id)
    } else {
      zoneId = zones.find((z) => z !== correct.get(item.id)) ?? correct.get(item.id)
    }
    return { itemId: item.id, zoneId }
  })
  return { placements }
}

const submit = (service, sessionId, roundId, studentId, response, interaction = {}) =>
  service.submitRound({
    sessionId,
    roundId,
    studentId,
    submission: {
      response,
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1, ...interaction },
    },
  })

async function startDemoSession(service) {
  const result = await service.startSession({ studentId: 1, streamId: 1, levelId: 1 })
  return result
}

/**
 * Shrinks a service's pool to base-100 questions so numeric assertions are
 * independent of which questions random selection happens to pick.
 */
function useBase100Pool(store) {
  store.questions = store.questions.filter((q) => q.basePoints === 100)
}

// ---------------------------------------------------------------------------
// A. SESSION START
// ---------------------------------------------------------------------------

test('A1: startSession succeeds and returns a session + current round', async () => {
  const { service, store } = makeService()
  const result = await startDemoSession(service)
  assert.ok(result.session)
  assert.ok(result.session.id)
  assert.ok(result.currentRound)
  assert.equal(result.currentRound.roundNumber, 1)
  assert.equal(store.gameSessions.length, 1)
})

test('A2/A3: exactly 3 question ids are selected and persisted', async () => {
  const { service, store } = makeService()
  const { session } = await startDemoSession(service)
  const ids = store.gameSessions[0].selectedQuestionIds
  assert.equal(ids.length, 3)
  assert.equal(new Set(ids).size, 3)
  assert.deepEqual(session.id, store.gameSessions[0].id)
})

test('A4: the session seed is persisted', async () => {
  const { service, store } = makeService()
  await startDemoSession(service)
  const seed = store.gameSessions[0].seed
  assert.ok(typeof seed === 'string' && /^[0-9a-f]{16}$/.test(seed), 'seed must be 16 hex chars')
})

test('A5: stream and level are persisted', async () => {
  const { service, store } = makeService()
  await startDemoSession(service)
  const s = store.gameSessions[0]
  assert.equal(s.streamId, 1)
  assert.equal(s.levelId, 1)
  assert.equal(s.status, 'active')
})

test('A6: exactly 3 rounds are persisted in order', async () => {
  const { service, store } = makeService()
  const { session } = await startDemoSession(service)
  const rounds = store.rounds.filter((r) => r.sessionId === session.id)
  assert.equal(rounds.length, 3)
  assert.deepEqual(rounds.map((r) => r.roundNumber), [1, 2, 3])
  for (const r of rounds) {
    assert.equal(r.status, 'pending')
    assert.ok(r.basePoints > 0)
  }
})

test('A7: safe descriptor carries render info, timer config and hints', async () => {
  const { service } = makeService()
  const { currentRound } = await startDemoSession(service)
  assert.equal(currentRound.totalRounds, 3)
  assert.equal(currentRound.activityType, 'drag-drop')
  assert.equal(currentRound.activity.kind, 'drag-drop')
  assert.ok(Array.isArray(currentRound.activity.items))
  assert.ok(Array.isArray(currentRound.activity.zones))
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.equal(currentRound.timer.mode, 'countdown')
  assert.ok(Array.isArray(currentRound.hints))
  assert.deepEqual(currentRound.progress, { current: 1, total: 3, completed: false })
})

test('A8: no correct-answer data appears anywhere in the start response', async () => {
  const { service } = makeService()
  const result = await startDemoSession(service)
  const raw = JSON.stringify(result)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('mappings'))
  assert.ok(!raw.includes('zoneId')) // positional answers never appear
})

// ---------------------------------------------------------------------------
// B. SELECTION (through repository + Game Engine D-022)
// ---------------------------------------------------------------------------

test('B9: D-022 selection works through the repository', async () => {
  const { repos } = makeService()
  const pool = await repos.questionRepository.getEligibleQuestions({ streamId: 1, levelId: 1 })
  assert.equal(pool.length, 6)
  const result = selectRoundQuestions({
    streamId: '1',
    levelId: '1',
    studentId: '1',
    seed: '0'.repeat(16),
    questionPool: pool.map((q) => ({ id: String(q.id), streamId: '1', levelId: '1', activityType: 'drag-drop' })),
  })
  assert.equal(result.questionIds.length, 3)
})

test('B10: strict diversity — 3 distinct activity types when the pool allows', async () => {
  const { repos } = makeService()
  const base = (await repos.questionRepository.getEligibleQuestions({ streamId: 1, levelId: 1 }))[0]
  const pool = []
  for (let i = 0; i < 9; i += 1) {
    pool.push({
      id: String(100 + i),
      streamId: '1',
      levelId: '1',
      activityType: ['drag-drop', 'matching', 'ordering', 'sorting'][i % 4],
    })
  }
  void base
  const result = selectRoundQuestions({
    streamId: '1',
    levelId: '1',
    studentId: '1',
    seed: 'a'.repeat(16),
    questionPool: pool,
    recentQuestionIds: [],
  })
  const types = new Set(result.questionIds.map((id) => pool.find((q) => q.id === id).activityType))
  assert.equal(types.size, 3, 'all 3 rounds must be different types')
})

test('B11: last-5-sessions repeat avoidance through the repositories', async () => {
  const { service, store } = makeService()
  // Simulate a prior completed session whose 3 question ids are now "recent".
  const recentIds = [store.questions[0].id, store.questions[1].id, store.questions[2].id]
  store.gameSessions.push({
    id: 99,
    sessionCode: 'PAST0001',
    studentId: 1,
    streamId: 1,
    levelId: 1,
    seed: 'f'.repeat(16),
    selectedQuestionIds: [...recentIds],
    status: 'completed',
    startedAt: 500,
    completedAt: 600,
    totalScore: 200,
  })
  for (let i = 0; i < 3; i += 1) {
    store.rounds.push({
      id: 100 + i,
      sessionId: 99,
      roundNumber: i + 1,
      questionId: recentIds[i],
      activityType: 'drag-drop',
      status: 'answered',
      basePoints: 100,
      startedAt: 500,
    })
  }
  await startDemoSession(service)
  const freshRow = store.gameSessions[store.gameSessions.length - 1]
  for (const id of freshRow.selectedQuestionIds) {
    assert.ok(!recentIds.includes(id), `recent question ${id} must not repeat (pool has non-recent)`)
  }
})

test('B12: deterministic seed reproduces the same selection', async () => {
  const { repos } = makeService()
  const pool = (await repos.questionRepository.getEligibleQuestions({ streamId: 1, levelId: 1 })).map((q) => ({
    id: String(q.id),
    streamId: '1',
    levelId: '1',
    activityType: 'drag-drop',
  }))
  const args = { streamId: '1', levelId: '1', studentId: '1', seed: 'b'.repeat(16), questionPool: pool }
  const one = selectRoundQuestions({ ...args })
  const two = selectRoundQuestions({ ...args })
  assert.deepEqual(one.questionIds, two.questionIds)
})

test('B13: insufficient pool surfaces as a student-safe error', async () => {
  const { service, store } = makeService()
  store.questions = store.questions.slice(0, 2)
  await assert.rejects(
    service.startSession({ studentId: 1, streamId: 1, levelId: 1 }),
    (err) => err.code === GAME_ERROR_CODES.INSUFFICIENT_POOL
  )
})

test('B14: special access — level 3 locked without a grant, unlocked with one', async () => {
  const { service, store } = makeService()
  const base = store.questions[0]
  for (let i = 0; i < 3; i += 1) {
    store.questions.push({ ...base, id: 1000 + i, levelId: 3 })
  }
  await assert.rejects(
    service.startSession({ studentId: 1, streamId: 1, levelId: 3 }),
    (err) => err.code === GAME_ERROR_CODES.LEVEL_LOCKED
  )
  store.specialAccess.push({ id: 1, studentId: 1, streamId: 1, levelId: null, isActive: true, expiresAt: null })
  const { session } = await service.startSession({ studentId: 1, streamId: 1, levelId: 3 })
  assert.equal(session.levelId, 3)
})

test('B14b: a previous-level completion unlocks the level (level 1 open by default)', async () => {
  const { service } = makeService()
  const { session } = await service.startSession({ studentId: 1, streamId: 1, levelId: 1 })
  assert.equal(session.levelId, 1)
})

// ---------------------------------------------------------------------------
// C. ACTIVITY ENGINE INTEGRATION
// ---------------------------------------------------------------------------

test('C15: the service registry resolves the drag-drop plugin', async () => {
  const { service } = makeService()
  assert.equal(service.activityEngine.has('drag-drop'), true)
  assert.ok(service.activityEngine.list().some((p) => p.type === 'drag-drop'))
})

test('C16: client descriptor payload is safe render info only', async () => {
  const { service } = makeService()
  const { currentRound } = await startDemoSession(service)
  const activity = currentRound.activity
  assert.equal(activity.kind, 'drag-drop')
  assert.ok(activity.items.every((i) => 'id' in i && 'label' in i))
  assert.ok(activity.zones.every((z) => 'id' in z && 'label' in z))
  assert.ok(!('mappings' in activity))
  assert.ok(!('correct' in activity))
})

test('C17: correct mappings are absent from any client-bound descriptor', async () => {
  const { service, store } = makeService()
  const { session } = await startDemoSession(service)
  const allRounds = await service.roundRepository.findBySessionId(session.id)
  assert.equal(allRounds.length, 3)
  // Round rows only snapshot scoring counters — the answer document stays in
  // the question seed and never crosses the service boundary.
  const roundRowJson = JSON.stringify(store.rounds.filter((r) => r.sessionId === session.id))
  assert.ok(!roundRowJson.includes('mappings'))
  assert.ok(JSON.stringify(store.questions.map((q) => q.correctAnswer)).includes('mappings'))
})

test('C17b: the descriptor serializer never emits correct mappings', async () => {
  const { service } = makeService()
  const { currentRound } = await startDemoSession(service)
  assert.ok(!JSON.stringify(currentRound.activity).includes('mappings'))
  assert.ok(!JSON.stringify(currentRound).includes('correctAnswer'))
})

test('C18: server loads the full question (correct answer) during submission', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const real = repos.questionRepository.getById.bind(repos.questionRepository)
  let loads = 0
  repos.questionRepository.getById = async (id) => {
    loads += 1
    return real(id)
  }
  const question = await repos.questionRepository.getById(currentRound.questionId)
  assert.ok(question.correctAnswer.mappings.length > 0)
  const before = loads
  await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  assert.ok(loads > before, 'submit must load the server-side question for validation')
})

test('C19: validateAnswer executes server-side (fully correct verdict)', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.pointsEarned, question.basePoints)
})

test('C20: scoringInputs executes server-side (partial credit 0.75)', async () => {
  const { service, repos, store } = makeService()
  // Clone question 1 (4 items, base 100) so the current round always
  // supports an exact 3-of-4 partial score regardless of selection order.
  const base1 = store.questions[0]
  store.questions = []
  for (let i = 0; i < 3; i += 1) {
    store.questions.push({ ...base1, id: 100 + i })
  }
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  assert.equal(question.payload.items.length, 4)
  const res = await submit(service, session.id, currentRound.roundId, 1, partialFor(question, 3))
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0.75)
  assert.equal(res.roundResult.pointsEarned, 75)
})

// ---------------------------------------------------------------------------
// D. CENTRAL SCORING (through the service)
// ---------------------------------------------------------------------------

test('D21: fully correct answer scores the full 100', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  assert.equal(res.score.roundScore, 100)
})

test('D22: zero-correct submission scores 0', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, wrongFor(question))
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.score.roundScore, 0)
})

test('D23: hint deduction applies from config', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question), { hintsUsed: 1 })
  assert.equal(res.score.roundScore, 95)
})

test('D24: attempt deduction applies beyond the first attempt', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question), { attemptsUsed: 2 })
  assert.equal(res.score.roundScore, 90)
})

test('D25: overtime uses authoritative server timing (level 1: 90s, 1pt/s)', async () => {
  const { service, repos, clock, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  clock.advance(100_000) // 100s server elapsed vs 90s allowed
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  assert.equal(res.roundResult.pointsEarned, 90)
  assert.equal(res.score.roundScore, 90)
})

test('D26: timer_override_seconds replaces the level default', async () => {
  const { service, repos, store, clock } = makeService()
  // Clone question 4 (base 80, timerOverrideSeconds 45) so every round
  // uses the override regardless of selection order.
  const base4 = store.questions[3]
  store.questions = []
  for (let i = 0; i < 3; i += 1) {
    store.questions.push({ ...base4, id: 4000 + i })
  }
  const { session, currentRound } = await startDemoSession(service)
  assert.equal(currentRound.timer.allowedSeconds, 45)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  clock.advance(50_000) // 50s server elapsed vs 45s override → 5s overtime
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  assert.equal(res.score.roundScore, 75) // 80 − 5×1
})

test('D26b: overtime penalty per second comes from the level (level 5: 5pt/s)', async () => {
  const { service, store, clock, repos } = makeService()
  const base = store.questions[0]
  store.questions = []
  for (let i = 0; i < 3; i += 1) {
    store.questions.push({ ...base, id: 3000 + i, levelId: 5 })
  }
  store.specialAccess.push({ id: 9, studentId: 1, streamId: 1, levelId: null, isActive: true, expiresAt: null })
  const { session, currentRound } = await service.startSession({ studentId: 1, streamId: 1, levelId: 5 })
  assert.equal(currentRound.timer.overtimePenaltyPerSecond, 5)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  clock.advance(50_000) // 50s vs 45s allowed → 5s × 5pt/s = 25
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  assert.equal(res.score.roundScore, 75)
})

test('D27: score floor is 0', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, wrongFor(question), {
    hintsUsed: 99,
    attemptsUsed: 3,
  })
  assert.equal(res.score.roundScore, 0)
})

test('D29: session maximum is 300 when all three rounds are perfect', async () => {
  const { service, store } = makeService()
  // Only base-100 questions so a perfect session always totals 300.
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  const { session } = await startDemoSession(service)
  const rounds = await service.roundRepository.findBySessionId(session.id)
  for (const round of rounds) {
    const question = await service.questionRepository.getById(round.questionId)
    const { currentRound: current } = await service.getCurrentRound({ sessionId: session.id, studentId: 1 })
    const res = await submit(service, session.id, current.roundId, 1, correctFor(question))
    assert.equal(res.score.roundScore, 100)
  }
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
})

// ---------------------------------------------------------------------------
// E. SESSION FLOW
// ---------------------------------------------------------------------------

test('E31: round 1 submit makes round 2 current', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  assert.ok(res.nextRound)
  assert.equal(res.nextRound.roundNumber, 2)
  const fresh = await service.getCurrentRound({ sessionId: session.id, studentId: 1 })
  assert.equal(fresh.currentRound.roundNumber, 2)
})

test('E32: round 2 submit makes round 3 current', async () => {
  const { service, repos } = makeService()
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  for (let i = 0; i < 2; i += 1) {
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, correctFor(question))
    assert.ok(res.progress.current === i + 1)
    if (res.nextRound) current = res.nextRound
    else current = null
  }
  assert.equal(current.roundNumber, 3)
})

test('E33: round 3 submit completes the session', async () => {
  const { service, repos } = makeService()
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  let last
  while (current) {
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, correctFor(question))
    last = res
    current = res.nextRound
  }
  assert.equal(last.progress.current, 3)
  assert.equal(last.progress.completed, true)
  assert.equal(last.nextRound, null)
})

test('E34: final score aggregates the three rounds (0–300)', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, correctFor(question))
    current = res.nextRound
  }
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(finished.status, 'completed')
  assert.equal(finished.roundBreakdown.length, 3)
})

test('E35: a completed session cannot be submitted to', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  const rest = await service.roundRepository.findBySessionId(session.id)
  for (const round of rest) {
    if (round.status !== 'answered') {
      const q = await repos.questionRepository.getById(round.questionId)
      await submit(service, session.id, round.id, 1, correctFor(q))
    }
  }
  await service.finishSession({ sessionId: session.id, studentId: 1 })
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, correctFor(question)),
    (err) => err.code === GAME_ERROR_CODES.SESSION_NOT_ACTIVE
  )
})

test('E36: wrong student is rejected for session operations', async () => {
  const { service } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  await assert.rejects(
    service.getCurrentRound({ sessionId: session.id, studentId: 999 }),
    (err) => err.code === GAME_ERROR_CODES.SESSION_WRONG_STUDENT
  )
  await assert.rejects(
    service.submitRound({ sessionId: session.id, roundId: currentRound.roundId, studentId: 999, submission: { response: {} } }),
    (err) => err.code === GAME_ERROR_CODES.SESSION_WRONG_STUDENT
  )
})

test('E37: the current-round guard rejects out-of-order submissions', async () => {
  const { service } = makeService()
  const { session } = await startDemoSession(service)
  const rounds = await service.roundRepository.findBySessionId(session.id)
  const late = rounds.find((r) => r.roundNumber === 2)
  await assert.rejects(
    service.submitRound({ sessionId: session.id, roundId: late.id, studentId: 1, submission: { response: {} } }),
    (err) => err.code === GAME_ERROR_CODES.ROUND_NOT_CURRENT
  )
})

test('E38: a round cannot be submitted twice', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, correctFor(question)),
    (err) => err.code === GAME_ERROR_CODES.ROUND_ALREADY_SUBMITTED
  )
})

// ---------------------------------------------------------------------------
// F. SECURITY (forgery resistance + boundary)
// ---------------------------------------------------------------------------

test('F39: forged correctnessFraction is ignored (wrong answer stays 0)', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: wrongFor(question),
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.pointsEarned, 0)
  assert.equal(res.score.roundScore, 0)
})

test('F40: forged score values are ignored; server computes points', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: correctFor(question),
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      score: 999,
      earnedBase: 999,
    },
  })
  assert.equal(res.score.roundScore, 100)
  assert.equal(res.score.sessionRunningTotal, 100)
})

test('F41: forged overtime cannot shorten the server-observed time', async () => {
  const { service, repos, clock, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  clock.advance(100_000) // server elapsed = 100s → 10s overtime
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: correctFor(question),
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 0 },
      overtimeSeconds: 0,
    },
  })
  assert.equal(res.score.roundScore, 90)
})

test('F42: the client cannot forge the final session score', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, correctFor(question))
    current = res.nextRound
  }
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300) // server-aggregated, not client-supplied
})

test('F43: session responses contain no correct answers (service-level)', async () => {
  const { service, repos } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  let current = res.nextRound
  while (current) {
    const q = await repos.questionRepository.getById(current.questionId)
    const r = await submit(service, session.id, current.roundId, 1, correctFor(q))
    current = r.nextRound
  }
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  for (const raw of [JSON.stringify(session), JSON.stringify(currentRound), JSON.stringify(res), JSON.stringify(finished)]) {
    assert.ok(!raw.includes('correctAnswer'))
    assert.ok(!raw.includes('mappings'))
  }
})

test('F44: submitting correct-answer-bearing responses is rejected by shape', async () => {
  const { service } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  await assert.rejects(
    service.submitRound({
      sessionId: session.id,
      roundId: currentRound.roundId,
      studentId: 1,
      submission: { response: { placements: [], correctAnswer: { mappings: [] } } },
    })
  )
})

// ---------------------------------------------------------------------------
// G. PERSISTENCE / CONSISTENCY
// ---------------------------------------------------------------------------

test('G46: game_sessions repository persists the full audit row', async () => {
  const { service, store } = makeService()
  const { session } = await startDemoSession(service)
  const row = store.gameSessions.find((s) => s.id === session.id)
  assert.ok(row.seed)
  assert.equal(row.selectedQuestionIds.length, 3)
  assert.equal(row.status, 'active')
  assert.equal(row.studentId, 1)
  assert.equal(row.streamId, 1)
  assert.equal(row.levelId, 1)
  void service
})

test('G47: session_rounds repository persists scoring snapshots', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question), { hintsUsed: 1 })
  const round = store.rounds.find((r) => r.id === currentRound.roundId)
  assert.equal(round.status, 'answered')
  assert.equal(round.pointsEarned, 95)
  assert.equal(round.hintsUsed, 1)
  assert.equal(round.attempts, 1)
  assert.ok(round.answeredAt)
  assert.ok(round.answerData)
  assert.ok(round.validationResult)
  assert.equal(res.score.roundScore, 95)
})

test('G48/G49: a failed total-update does not corrupt round state', async () => {
  const { service, repos, store } = makeService()
  useBase100Pool(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)

  // Force the session-total write to fail AFTER the round was marked answered.
  const realSetTotal = repos.gameSessionRepository.setTotalScore.bind(repos.gameSessionRepository)
  let fails = true
  repos.gameSessionRepository.setTotalScore = async (id, score) => {
    if (fails) throw new Error('simulated ledger write failure')
    return realSetTotal(id, score)
  }

  await assert.rejects(
    service.submitRound({
      sessionId: session.id,
      roundId: currentRound.roundId,
      studentId: 1,
      submission: {
        response: correctFor(question),
        interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      },
    }),
    /ledger write failure/
  )

  // Round 1 is still correctly recorded (auditable, not doubled/corrupted).
  const round = store.rounds.find((r) => r.id === currentRound.roundId)
  assert.equal(round.status, 'answered')
  assert.equal(round.pointsEarned, 100)

  // The session is still active and consistent: round 2 becomes current.
  const fresh = await service.getCurrentRound({ sessionId: session.id, studentId: 1 })
  assert.equal(fresh.session.status, 'active')
  assert.equal(fresh.currentRound.roundNumber, 2)

  // Recovery: subsequent writes succeed and finishSession aggregates correctly.
  fails = false
  let current = fresh.currentRound
  while (current) {
    const q = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, correctFor(q))
    current = res.nextRound
  }
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(store.answers.filter((a) => a.sessionId === session.id).length, 3)
})

test('G50: sessions stay auditable — seed, ids and per-attempt evidence survive', async () => {
  const { service, repos, store } = makeService()
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, correctFor(question))
  const row = store.gameSessions.find((s) => s.id === session.id)
  assert.equal(row.seed.length, 16)
  assert.equal(row.selectedQuestionIds.length, 3)
  const answer = store.answers.find((a) => a.roundId === currentRound.roundId)
  assert.ok(answer)
  assert.equal(answer.wasCorrect, true)
  assert.equal(answer.pointsEarned, res.score.roundScore)
  assert.ok(answer.validation)
  assert.equal(store.rounds.filter((r) => r.sessionId === session.id).length, 3)
})

test('D028: a second concurrent active session for the same (student, stream) resumes', async () => {
  const { service } = makeService()
  const first = await startDemoSession(service)
  const second = await startDemoSession(service)
  assert.equal(first.session.id, second.session.id)
  assert.equal(first.session.sessionCode, second.session.sessionCode)
})

// ---------------------------------------------------------------------------
// M. MATCHING INTEGRATION (Task 4.5 — second production activity plugin)
// ---------------------------------------------------------------------------

/** Full question row for the matching activity, from the Task 3.2 fixtures. */
function matchingQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 2,
    activityType: 'matching',
    prompt: 'Match each item to its description.',
    instructions: 'Tap a left card, then its partner on the right.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Read each left card carefully before choosing.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** A store whose question pool is purely matching questions (base-100). */
function poolAllMatching(store) {
  store.questions = [
    matchingQuestion(501, matchingGradePayload, matchingGradeAnswer),
    matchingQuestion(502, matchingPhysicsPayload, matchingPhysicsAnswer),
    matchingQuestion(503, matchingGradePayload, { ...matchingGradeAnswer }),
  ]
}

function matchingConnections(question, overrides = {}) {
  const correct = new Map(question.correctAnswer.pairs.map((p) => [p.leftId, p.rightId]))
  const rightIds = [
    ...question.payload.rightItems.map((c) => c.id),
    ...(question.payload.distractors ?? []).map((c) => c.id),
  ]
  return {
    connections: question.payload.leftItems.map((card) => {
      const target = correct.get(card.id)
      const override = overrides[card.id]
      const chosen =
        override === 'WRONG'
          ? rightIds.find((id) => id !== target) ?? target
          : override ?? target
      return { leftId: card.id, rightId: chosen }
    }),
  }
}

test('M51: the service registry resolves the matching plugin next to drag-drop', async () => {
  const { service } = makeService()
  assert.equal(service.activityEngine.has('matching'), true)
  assert.ok(service.activityEngine.list().some((p) => p.type === 'matching'))
  assert.equal(service.activityEngine.has('drag-drop'), true)
})

test('M52: a matching round produces a safe client descriptor end-to-end', async () => {
  const { service, store } = makeService()
  poolAllMatching(store)
  const { currentRound } = await startDemoSession(service)

  // Random selection may legitimately pick either the 3-item grade question
  // or the 4-item physics question, so this test asserts the descriptor
  // contract rather than a specific fixture's item count.
  assert.equal(currentRound.activityType, 'matching')
  assert.equal(currentRound.activity.kind, 'matching')
  assert.ok(Array.isArray(currentRound.activity.leftItems))
  assert.ok(Array.isArray(currentRound.activity.targets))
  assert.ok(currentRound.activity.leftItems.length > 0)
  assert.ok(currentRound.activity.targets.length >= currentRound.activity.leftItems.length)
  for (const card of [...currentRound.activity.leftItems, ...currentRound.activity.targets]) {
    assert.equal(typeof card.id, 'string')
    assert.equal(typeof card.text, 'string')
  }
  assert.ok(!('pairs' in currentRound.activity))
  assert.ok(!JSON.stringify(currentRound).includes('correctAnswer'))
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.ok(currentRound.hints.length > 0)
})

test('M53: a fully-correct matching answer scores the full 100', async () => {
  const { service, repos, store } = makeService()
  poolAllMatching(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, matchingConnections(question))
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
  assert.equal(res.score.roundScore, 100)
})

test('M54: a partially-correct matching answer earns proportional partial credit', async () => {
  const { service, repos, store } = makeService()
  // Force the 3-pair grade payload into every round so the math is fixed.
  store.questions = [
    matchingQuestion(504, matchingGradePayload, matchingGradeAnswer),
    matchingQuestion(505, matchingGradePayload, { ...matchingGradeAnswer }),
    matchingQuestion(506, matchingGradePayload, { ...matchingGradeAnswer }),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const response = matchingConnections(question, { l3: 'WRONG' })
  const res = await submit(service, session.id, currentRound.roundId, 1, response)
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 2 / 3)
  assert.equal(res.roundResult.pointsEarned, 67) // round(100 × 2/3)
})

test('M55: a physics matching round scores 0.75 when one of four links is a distractor', async () => {
  const { service, repos, store } = makeService()
  // Only the 4-pair physics question is eligible, so round 1 must use it.
  store.questions = [
    matchingQuestion(502, matchingPhysicsPayload, matchingPhysicsAnswer),
    matchingQuestion(503, matchingPhysicsPayload, matchingPhysicsAnswer),
    matchingQuestion(507, matchingPhysicsPayload, matchingPhysicsAnswer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  assert.equal(question.payload.leftItems.length, 4)
  assert.equal(question.payload.distractors.length, 1)
  const response = matchingConnections(question, { l4: 'd1' })
  const res = await submit(service, session.id, currentRound.roundId, 1, response)
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0.75)
  assert.equal(res.roundResult.pointsEarned, 75)
})

test('M56: an unknown matching target is rejected by the engine through the service', async () => {
  const { service, repos, store } = makeService()
  poolAllMatching(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const correct = new Map(question.correctAnswer.pairs.map((p) => [p.leftId, p.rightId]))
  const response = {
    connections: question.payload.leftItems.map((card) => ({
      leftId: card.id,
      rightId: card.id === question.payload.leftItems[0].id ? 'hacked-9' : correct.get(card.id),
    })),
  }
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, response),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('M57: a missing required matching link is rejected before scoring', async () => {
  const { service, repos, store } = makeService()
  poolAllMatching(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const response = matchingConnections(question)
  // Drop the very last connection (a required match is now missing).
  response.connections.pop()
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, response),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('M58: a matching answer is scored only on connections — forged fraction is ignored', async () => {
  const { service, repos, store } = makeService()
  store.questions = [
    matchingQuestion(514, matchingGradePayload, matchingGradeAnswer),
    matchingQuestion(515, matchingGradePayload, { ...matchingGradeAnswer }),
    matchingQuestion(516, matchingGradePayload, { ...matchingGradeAnswer }),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const response = matchingConnections(question, { l1: 'WRONG' })
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response,
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
      score: 999,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 2 / 3)
  assert.equal(res.roundResult.pointsEarned, 67)
})

test('M59: a mixed drag-drop + matching session runs to completion (0–300)', async () => {
  const { service, repos, store } = makeService()
  // Mix drag-drop (base 100) with matching questions so both plugins resolve.
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  store.questions.push(
    matchingQuestion(601, matchingGradePayload, matchingGradeAnswer),
    matchingQuestion(602, matchingPhysicsPayload, matchingPhysicsAnswer)
  )
  const { session } = await startDemoSession(service)
  const types = new Set()
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    types.add(current.activityType)
    const question = await repos.questionRepository.getById(current.questionId)
    const response =
      question.activityType === 'matching'
        ? matchingConnections(question)
        : correctFor(question)
    const res = await submit(service, session.id, current.roundId, 1, response)
    assert.equal(res.roundResult.correct, true)
    current = res.nextRound
  }
  assert.ok(types.has('drag-drop') && types.has('matching'))
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(finished.roundBreakdown.length, 3)
})

// ---------------------------------------------------------------------------
// S. SORTING INTEGRATION (Task 4.7 — fourth production activity plugin)
// ---------------------------------------------------------------------------

/** Full question row for the sorting activity, from the Task 3.2 fixtures. */
function sortingQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 4,
    activityType: 'sorting',
    prompt: 'Sort each item into the group it belongs to.',
    instructions: 'Select an item, then tap the group that fits it. Every item must be placed before you can submit.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Read each group label carefully before sorting.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** A store whose question pool is purely sorting questions (base-100). */
function poolAllSorting(store) {
  store.questions = [
    sortingQuestion(701, sortingGradePayload, sortingGradeAnswer),
    sortingQuestion(702, sortingPhysicsPayload, sortingGradeAnswer),
    sortingQuestion(703, sortingGradePayload, { ...sortingGradeAnswer }),
  ]
}

function sortingAssignments(question, overrides = {}) {
  const correct = new Map(question.correctAnswer.assignments.map((a) => [a.itemId, a.categoryId]))
  const categoryIds = question.payload.categories.map((c) => c.id)
  return {
    assignments: question.payload.items.map((item) => {
      const override = overrides[item.id]
      const chosen =
        override === 'WRONG'
          ? categoryIds.find((id) => id !== correct.get(item.id)) ?? correct.get(item.id)
          : override ?? correct.get(item.id)
      return { itemId: item.id, categoryId: chosen }
    }),
  }
}

test('S1: a sorting round produces a safe client descriptor end-to-end', async () => {
  const { service, store } = makeService()
  poolAllSorting(store)
  const { currentRound } = await startDemoSession(service)
  assert.equal(currentRound.activityType, 'sorting')
  assert.equal(currentRound.activity.kind, 'sorting')
  assert.ok(Array.isArray(currentRound.activity.items))
  assert.ok(Array.isArray(currentRound.activity.categories))
  assert.ok(currentRound.activity.items.length > 0)
  assert.ok(currentRound.activity.categories.length >= 2)
  for (const card of [...currentRound.activity.items, ...currentRound.activity.categories]) {
    assert.equal(typeof card.id, 'string')
    assert.equal(typeof card.label, 'string')
  }
  assert.ok(!('assignments' in currentRound.activity))
  assert.ok(!JSON.stringify(currentRound).includes('correctAnswer'))
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.ok(currentRound.hints.length > 0)
})

test('S2: a fully-correct sorting answer scores the full 100', async () => {
  const { service, repos, store } = makeService()
  poolAllSorting(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, sortingAssignments(question))
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
  assert.equal(res.score.roundScore, 100)
})

test('S3: a partially-correct sorting answer earns proportional partial credit', async () => {
  const { service, repos, store } = makeService()
  // Only the 6-item grade payload is eligible, so the fraction is fixed.
  store.questions = [
    sortingQuestion(704, sortingGradePayload, sortingGradeAnswer),
    sortingQuestion(705, sortingGradePayload, { ...sortingGradeAnswer }),
    sortingQuestion(706, sortingGradePayload, { ...sortingGradeAnswer }),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  // 4 of 6 correct → 2/3.
  const res = await submit(
    service,
    session.id,
    currentRound.roundId,
    1,
    sortingAssignments(question, { i3: 'WRONG', i6: 'WRONG' })
  )
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 2 / 3)
  assert.equal(res.roundResult.pointsEarned, 67) // round(100 × 2/3)
})

test('S4: a forged sorting correctnessFraction/score is ignored by the server', async () => {
  const { service, repos, store } = makeService()
  store.questions = [
    sortingQuestion(714, sortingGradePayload, sortingGradeAnswer),
    sortingQuestion(715, sortingGradePayload, { ...sortingGradeAnswer }),
    sortingQuestion(716, sortingGradePayload, { ...sortingGradeAnswer }),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: sortingAssignments(question, { i3: 'WRONG', i6: 'WRONG' }),
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
      score: 999,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 2 / 3)
  assert.equal(res.roundResult.pointsEarned, 67)
})

test('S5: a sorting round rejects an unknown category id through the service', async () => {
  const { service, repos, store } = makeService()
  poolAllSorting(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const response = sortingAssignments(question)
  response.assignments[0].categoryId = 'hacked-9'
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, response),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('S6: a sorting round rejects a missing assignment before scoring', async () => {
  const { service, repos, store } = makeService()
  poolAllSorting(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const response = sortingAssignments(question)
  response.assignments.pop()
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, response),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('S7: a mixed drag-drop + sorting session runs to completion (0–300)', async () => {
  const { service, repos, store } = makeService()
  // Mix drag-drop (base 100) with sorting questions so both plugins resolve;
  // diversity selection must surface the sorting type.
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  store.questions.push(
    sortingQuestion(801, sortingGradePayload, sortingGradeAnswer),
    sortingQuestion(802, sortingPhysicsPayload, sortingGradeAnswer)
  )
  const { session } = await startDemoSession(service)
  const types = new Set()
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    types.add(current.activityType)
    const question = await repos.questionRepository.getById(current.questionId)
    const response =
      question.activityType === 'sorting'
        ? sortingAssignments(question)
        : correctFor(question)
    const res = await submit(service, session.id, current.roundId, 1, response)
    assert.equal(res.roundResult.correct, true)
    current = res.nextRound
  }
  assert.ok(types.has('drag-drop') && types.has('sorting'))
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(finished.roundBreakdown.length, 3)
})

// ---------------------------------------------------------------------------
// FC. FILL & COMPLETE INTEGRATION (Task 4.8 — fifth production activity plugin)
// ---------------------------------------------------------------------------

/** Full question row for the fill-complete activity, from the Task 3.2 fixtures. */
function fillCompleteQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 5,
    activityType: 'fill-complete',
    prompt: 'Type the missing word or value into each blank.',
    instructions: 'Read the text and complete every blank. Every blank must be filled before you can submit.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Read the text around each blank for the clue.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** A store whose question pool is purely fill-complete questions (base-100). */
function poolAllFillComplete(store) {
  store.questions = [
    fillCompleteQuestion(901, fillGradePayload, fillGradeAnswer),
    fillCompleteQuestion(902, fillPhysicsPayload, {
      numeric: [{ blankId: 'b1', value: 50, tolerance: 0.1 }],
    }),
    fillCompleteQuestion(903, fillGradePayload, { ...fillGradeAnswer }),
  ]
}

/** Correct (or overridden) Fill/Complete answers, respecting blank types. */
function fillAnswers(question, overrides = {}) {
  const text = new Map((question.correctAnswer.answers ?? []).map((e) => [e.blankId, e.accepted[0]]))
  const numeric = new Map(
    (question.correctAnswer.numeric ?? []).map((e) => [e.blankId, String(e.min ?? e.value)])
  )
  const expression = new Map(
    (question.correctAnswer.expression ?? []).map((e) => [e.blankId, e.accepted[0]])
  )
  const wrongByType = { text: 'zzzz', number: '999', expression: 'nope' }
  return {
    answers: question.payload.blanks.map((blank) => {
      const override = overrides[blank.id]
      let value
      if (override === 'WRONG') {
        value = wrongByType[blank.type]
      } else {
        value =
          override ??
          (blank.type === 'number'
            ? numeric.get(blank.id)
            : blank.type === 'expression'
              ? expression.get(blank.id)
              : text.get(blank.id))
      }
      return { blankId: blank.id, value }
    }),
  }
}

test('FC1: a fill-complete round produces a safe client descriptor end-to-end', async () => {
  const { service, store } = makeService()
  poolAllFillComplete(store)
  const { currentRound } = await startDemoSession(service)
  assert.equal(currentRound.activityType, 'fill-complete')
  assert.equal(currentRound.activity.kind, 'fill-complete')
  assert.equal(typeof currentRound.activity.template, 'string')
  assert.ok(currentRound.activity.template.includes('___'))
  assert.ok(Array.isArray(currentRound.activity.blanks))
  assert.ok(currentRound.activity.blanks.length > 0)
  for (const blank of currentRound.activity.blanks) {
    assert.equal(typeof blank.id, 'string')
    assert.equal(typeof blank.type, 'string')
    assert.equal(typeof blank.maxLength, 'number')
  }
  assert.ok(!('answers' in currentRound.activity))
  assert.ok(!('accepted' in currentRound.activity))
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.ok(currentRound.hints.length > 0)
})

test('FC2/FC3: no correctAnswer or accepted-answer set reaches the client', async () => {
  const { service, store } = makeService()
  poolAllFillComplete(store)
  const { currentRound } = await startDemoSession(service)
  const raw = JSON.stringify(currentRound)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('accepted'))
  assert.ok(!raw.includes('"value"'))
})

test('FC4: a fully-correct fill-complete submission scores the full 100', async () => {
  const { service, repos, store } = makeService()
  poolAllFillComplete(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, fillAnswers(question))
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
  assert.equal(res.score.roundScore, 100)
})

test('FC5: a partially-correct fill-complete answer earns proportional partial credit', async () => {
  const { service, repos, store } = makeService()
  // Only the 2-blank grade payload is eligible, so 1-of-2 always scores 0.5.
  store.questions = [
    fillCompleteQuestion(911, fillGradePayload, fillGradeAnswer),
    fillCompleteQuestion(912, fillGradePayload, { ...fillGradeAnswer }),
    fillCompleteQuestion(913, fillGradePayload, { ...fillGradeAnswer }),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, fillAnswers(question, { b2: 'WRONG' }))
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0.5)
  assert.equal(res.roundResult.pointsEarned, 50) // round(100 × 0.5)
})

test('FC6/FC7: forged correctnessFraction and score are ignored by the server', async () => {
  const { service, repos, store } = makeService()
  store.questions = [
    fillCompleteQuestion(921, fillGradePayload, fillGradeAnswer),
    fillCompleteQuestion(922, fillGradePayload, { ...fillGradeAnswer }),
    fillCompleteQuestion(923, fillGradePayload, { ...fillGradeAnswer }),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: fillAnswers(question, { b2: 'WRONG' }),
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
      score: 999,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0.5)
  assert.equal(res.roundResult.pointsEarned, 50)
})

test('FC8: a fill-complete round rejects an unknown blank id through the service', async () => {
  const { service, repos, store } = makeService()
  poolAllFillComplete(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const response = fillAnswers(question)
  response.answers[0] = { blankId: 'hacked-9', value: 'whatever' }
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, response),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('FC9: a fill-complete round rejects a missing blank before scoring', async () => {
  const { service, repos, store } = makeService()
  poolAllFillComplete(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const response = fillAnswers(question)
  response.answers.pop()
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, response),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('FC10: a mixed drag-drop + fill-complete session runs to completion (0–300)', async () => {
  const { service, repos, store } = makeService()
  // Mix drag-drop (base 100) with fill-complete questions so both plugins
  // resolve; diversity selection must surface the fill-complete type.
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  store.questions.push(
    fillCompleteQuestion(931, fillGradePayload, fillGradeAnswer),
    fillCompleteQuestion(932, fillMinimalPayload, {
      numeric: [{ blankId: 'b1', value: 100, tolerance: 0 }],
    })
  )
  const { session } = await startDemoSession(service)
  const types = new Set()
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    types.add(current.activityType)
    const question = await repos.questionRepository.getById(current.questionId)
    const response =
      question.activityType === 'fill-complete'
        ? fillAnswers(question)
        : correctFor(question)
    const res = await submit(service, session.id, current.roundId, 1, response)
    assert.equal(res.roundResult.correct, true)
    current = res.nextRound
  }
  assert.ok(types.has('drag-drop') && types.has('fill-complete'))
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(finished.roundBreakdown.length, 3)
})

// ---------------------------------------------------------------------------
// PA. PATTERN INTEGRATION (Task 4.10 — seventh production activity plugin)
// ---------------------------------------------------------------------------

function patternQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 7,
    activityType: 'pattern',
    prompt: 'Continue the pattern.',
    instructions: 'Choose the element(s) that continue the sequence.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Study the step between consecutive elements.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** A store whose question pool is purely pattern questions (all three modes). */
function poolAllPattern(store) {
  store.questions = [
    patternQuestion(601, patternMinimalPayload, patternMinimalAnswer),
    patternQuestion(602, patternShapesPayload, { type: 'candidate', acceptableIds: ['c1'] }),
    patternQuestion(603, patternFillPayload, { type: 'numeric', value: 9, tolerance: 0 }),
  ]
}

// construct-next with two answer units (partial credit is meaningful).
const patternConstructTwoPayload = {
  schemaVersion: '1.0',
  sequence: [
    { id: 'p1', number: 2 },
    { id: 'p2', number: 4 },
    { id: 'p3', number: 6 },
  ],
  interaction: 'construct-next',
  constructCount: 2,
  candidates: [
    { id: 'c1', number: 8 },
    { id: 'c2', number: 10 },
    { id: 'c3', number: 12 },
    { id: 'c4', number: 7 },
  ],
}

/** Correct (or overridden) pattern responses for any mode/answer type. */
function patternAnswers(question, overrides = {}) {
  const a = question.correctAnswer
  const interaction = question.payload.interaction
  if (a.type === 'candidate') {
    const count = interaction === 'construct-next' ? question.payload.constructCount : 1
    const picked = a.acceptableIds.slice(0, count).map((id, i) => overrides.replace?.[i] ?? id)
    return { selected: picked }
  }
  if (a.type === 'numeric') {
    if (overrides.wrong) {
      const wrong =
        a.min !== undefined ? a.max + 1 : a.value + (a.tolerance ?? 0) + 1
      return { value: String(wrong) }
    }
    return { value: String(a.min !== undefined ? a.min : a.value) }
  }
  if (a.type === 'text') {
    return { value: overrides.wrong ? 'zzz-nope' : a.accepted[0] }
  }
  throw new Error(`unsupported pattern answer type "${a.type}"`)
}

test('PA1: a pattern round produces a safe client descriptor end-to-end', async () => {
  const { service, store } = makeService()
  store.questions = [
    patternQuestion(611, patternMinimalPayload, patternMinimalAnswer),
    patternQuestion(612, patternMinimalPayload, patternMinimalAnswer),
    patternQuestion(613, patternMinimalPayload, patternMinimalAnswer),
  ]
  const { currentRound } = await startDemoSession(service)
  assert.equal(currentRound.activityType, 'pattern')
  assert.equal(currentRound.activity.kind, 'pattern')
  assert.equal(currentRound.activity.interaction, 'construct-next')
  assert.equal(currentRound.activity.units, 1)
  assert.equal(currentRound.activity.constructCount, 1)
  assert.ok(currentRound.activity.sequence.length >= 3)
  assert.deepEqual(currentRound.activity.sequence.map((e) => e.number), [2, 4, 6])
  assert.deepEqual(currentRound.activity.candidates.map((c) => c.number), [8, 10, 7])
  assert.ok(!('acceptableIds' in currentRound.activity))
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.ok(currentRound.hints.length > 0)
})

test('PA2/PA3: no correctAnswer, acceptable ids or accepted values reach the client', async () => {
  const { service, store } = makeService()
  poolAllPattern(store)
  const { currentRound } = await startDemoSession(service)
  const raw = JSON.stringify(currentRound)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('acceptableIds'))
  assert.ok(!raw.includes('"accepted"'))
  assert.ok(!raw.includes('"correct"'))
})

test('PA4: a fully-correct pattern submission scores the full 100', async () => {
  const { service, repos, store } = makeService()
  poolAllPattern(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, patternAnswers(question))
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
  assert.equal(res.score.roundScore, 100)
})

test('PA5: a partially-correct pattern answer earns proportional partial credit', async () => {
  const { service, repos, store } = makeService()
  store.questions = [
    patternQuestion(621, patternConstructTwoPayload, { type: 'candidate', acceptableIds: ['c1', 'c2'] }),
    patternQuestion(622, patternConstructTwoPayload, { type: 'candidate', acceptableIds: ['c1', 'c2'] }),
    patternQuestion(623, patternConstructTwoPayload, { type: 'candidate', acceptableIds: ['c1', 'c2'] }),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  assert.equal(question.payload.constructCount, 2)
  const res = await submit(service, session.id, currentRound.roundId, 1, { selected: ['c1', 'c4'] })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0.5)
  assert.equal(res.roundResult.pointsEarned, 50)
})

test('PA6/PA7: forged correctnessFraction and score are ignored by the server', async () => {
  const { service, store } = makeService()
  store.questions = [
    patternQuestion(631, patternMinimalPayload, patternMinimalAnswer),
    patternQuestion(632, patternMinimalPayload, patternMinimalAnswer),
    patternQuestion(633, patternMinimalPayload, patternMinimalAnswer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: { selected: ['c3'] }, // 7 is not the next even number
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
      score: 999,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0)
  assert.equal(res.roundResult.pointsEarned, 0)
})

test('PA8: a malformed pattern answer is rejected by the engine through the service', async () => {
  const { service, store } = makeService()
  poolAllPattern(store)
  const { session, currentRound } = await startDemoSession(service)
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, { selected: ['c1'], value: '8' }),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('PA9: a mixed drag-drop + pattern session runs to completion (0–300)', async () => {
  const { service, repos, store } = makeService()
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  store.questions.push(
    patternQuestion(641, patternMinimalPayload, patternMinimalAnswer),
    patternQuestion(642, patternShapesPayload, { type: 'candidate', acceptableIds: ['c1'] })
  )
  const { session } = await startDemoSession(service)
  const types = new Set()
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    types.add(current.activityType)
    const question = await repos.questionRepository.getById(current.questionId)
    const response = question.activityType === 'pattern' ? patternAnswers(question) : correctFor(question)
    const res = await submit(service, session.id, current.roundId, 1, response)
    assert.equal(res.roundResult.correct, true)
    current = res.nextRound
  }
  assert.ok(types.has('drag-drop') && types.has('pattern'))
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(finished.roundBreakdown.length, 3)
})

test('PA10: an all-pattern pool runs to completion with per-round safe descriptors', async () => {
  const { service, repos, store } = makeService()
  poolAllPattern(store)
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  let rounds = 0
  while (current) {
    rounds += 1
    const raw = JSON.stringify(current)
    assert.ok(!raw.includes('correctAnswer'))
    assert.ok(!raw.includes('acceptableIds'))
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, patternAnswers(question))
    assert.equal(res.roundResult.correct, true)
    assert.equal(res.roundResult.pointsEarned, 100)
    current = res.nextRound
  }
  assert.equal(rounds, 3)
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
})

// ---------------------------------------------------------------------------
// ME. MEMORY INTEGRATION (Task 4.11 — eighth production activity plugin)
// ---------------------------------------------------------------------------

const memoryPairsAnswer = {
  groups: [
    { groupId: 'g1', cardIds: ['c1', 'c2'] },
    { groupId: 'g2', cardIds: ['c3', 'c4'] },
  ],
}

// A sets deck (groups of 3) with a self-consistent answer, for partial credit.
const memorySetsPayload = {
  schemaVersion: '1.0',
  cards: [
    { id: 'c1', text: 'Solid' },
    { id: 'c2', text: 'Liquid' },
    { id: 'c3', text: 'Gas' },
    { id: 'c4', text: 'Rock' },
    { id: 'c5', text: 'Water' },
    { id: 'c6', text: 'Air' },
  ],
  revealSeconds: 15,
  recallPrompt: 'Group each state of matter with an example.',
  deckType: 'sets',
  shuffle: true,
  maxAttempts: 2,
}
const memorySetsAnswer = {
  groups: [
    { groupId: 'g1', cardIds: ['c1', 'c2', 'c3'] },
    { groupId: 'g2', cardIds: ['c4', 'c5', 'c6'] },
  ],
}

function memoryQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 8,
    activityType: 'memory',
    prompt: 'Memorize the deck, then rebuild the groups from memory.',
    instructions: 'Study the cards during the memory phase, then reconstruct the groups.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Think about what linked each group together.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** A fully-correct memory response built from the correct-answer groups. */
function memoryAnswerFrom(correctAnswer) {
  return { groups: correctAnswer.groups.map((group) => ({ cardIds: [...group.cardIds] })) }
}

/** A store whose question pool is purely memory questions. */
function poolAllMemory(store) {
  store.questions = [
    memoryQuestion(701, memoryMinimalPayload, memoryPairsAnswer),
    memoryQuestion(702, memorySetsPayload, memorySetsAnswer),
    memoryQuestion(703, memoryGrade911Payload, memoryGrade911Answer),
  ]
}

test('ME1: a memory round produces a safe client descriptor end-to-end', async () => {
  const { service, store } = makeService()
  store.questions = [
    memoryQuestion(711, memoryMinimalPayload, memoryPairsAnswer),
    memoryQuestion(712, memoryMinimalPayload, memoryPairsAnswer),
    memoryQuestion(713, memoryMinimalPayload, memoryPairsAnswer),
  ]
  const { currentRound } = await startDemoSession(service)
  assert.equal(currentRound.activityType, 'memory')
  assert.equal(currentRound.activity.kind, 'memory')
  assert.equal(currentRound.activity.deckType, 'pairs')
  assert.equal(currentRound.activity.revealSeconds, 10)
  assert.equal(currentRound.activity.maxAttempts, null)
  assert.equal(currentRound.activity.cards.length, 4)
  assert.deepEqual(currentRound.activity.cards.map((c) => c.id).sort(), ['c1', 'c2', 'c3', 'c4'])
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.ok(currentRound.hints.length > 0)
})

test('ME2/ME3: no correctAnswer, groups or groupId reach the client', async () => {
  const { service, store } = makeService()
  poolAllMemory(store)
  const { currentRound } = await startDemoSession(service)
  const raw = JSON.stringify(currentRound)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('"groups"'))
  assert.ok(!raw.includes('groupId'))
  assert.ok(!raw.includes('cardIds'))
  assert.ok(!raw.includes('"correct"'))
})

test('ME4: a fully-correct memory submission scores the full 100', async () => {
  const { service, repos, store } = makeService()
  poolAllMemory(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, memoryAnswerFrom(question.correctAnswer))
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
  assert.equal(res.score.roundScore, 100)
})

test('ME5: a partially-correct memory answer earns proportional partial credit', async () => {
  const { service, repos, store } = makeService()
  store.questions = [
    memoryQuestion(721, memoryGrade911Payload, memoryGrade911Answer),
    memoryQuestion(722, memoryGrade911Payload, memoryGrade911Answer),
    memoryQuestion(723, memoryGrade911Payload, memoryGrade911Answer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  assert.equal(question.correctAnswer.groups.length, 3)
  // One correct group (c1,c2) + two wrong groups covering the other four cards.
  const res = await submit(service, session.id, currentRound.roundId, 1, {
    groups: [
      { cardIds: ['c1', 'c2'] },
      { cardIds: ['c3', 'c5'] },
      { cardIds: ['c4', 'c6'] },
    ],
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 1 / 3)
  assert.equal(res.roundResult.pointsEarned, 33)
})

test('ME6/ME7: forged correctnessFraction and score are ignored by the server', async () => {
  const { service, store } = makeService()
  store.questions = [
    memoryQuestion(731, memoryMinimalPayload, memoryPairsAnswer),
    memoryQuestion(732, memoryMinimalPayload, memoryPairsAnswer),
    memoryQuestion(733, memoryMinimalPayload, memoryPairsAnswer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: { groups: [{ cardIds: ['c1', 'c3'] }, { cardIds: ['c2', 'c4'] }] }, // both wrong
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
      score: 999,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0)
  assert.equal(res.roundResult.pointsEarned, 0)
})

test('ME8: a malformed memory answer is rejected by the engine through the service', async () => {
  const { service, store } = makeService()
  poolAllMemory(store)
  const { session, currentRound } = await startDemoSession(service)
  // Incomplete recall: only two cards placed, two missing.
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, { groups: [{ cardIds: ['c1', 'c2'] }] }),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('ME9: a mixed drag-drop + memory session runs to completion (0–300)', async () => {
  const { service, repos, store } = makeService()
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  store.questions.push(
    memoryQuestion(741, memoryMinimalPayload, memoryPairsAnswer),
    memoryQuestion(742, memorySetsPayload, memorySetsAnswer)
  )
  const { session } = await startDemoSession(service)
  const types = new Set()
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    types.add(current.activityType)
    const question = await repos.questionRepository.getById(current.questionId)
    const response =
      question.activityType === 'memory'
        ? memoryAnswerFrom(question.correctAnswer)
        : correctFor(question)
    const res = await submit(service, session.id, current.roundId, 1, response)
    assert.equal(res.roundResult.correct, true)
    current = res.nextRound
  }
  assert.ok(types.has('drag-drop') && types.has('memory'))
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(finished.roundBreakdown.length, 3)
})

test('ME10: an all-memory pool runs to completion with per-round safe descriptors', async () => {
  const { service, repos, store } = makeService()
  poolAllMemory(store)
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  let rounds = 0
  while (current) {
    rounds += 1
    const raw = JSON.stringify(current)
    assert.ok(!raw.includes('correctAnswer'))
    assert.ok(!raw.includes('"groups"'))
    assert.ok(!raw.includes('groupId'))
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, memoryAnswerFrom(question.correctAnswer))
    assert.equal(res.roundResult.correct, true)
    assert.equal(res.roundResult.pointsEarned, 100)
    current = res.nextRound
  }
  assert.equal(rounds, 3)
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
})

// ---------------------------------------------------------------------------
// SC. SCENARIO-CHALLENGE INTEGRATION (Task 4.12 — ninth production activity plugin)
// ---------------------------------------------------------------------------

const scenarioMinimalAnswer = {
  optimalPath: [
    { decisionId: 'd1', optionId: 'o1' },
    { decisionId: 'd2', optionId: 'o3' },
  ],
}
const scenarioGrade67Answer = {
  optimalPath: [
    { decisionId: 'd1', optionId: 'o1' },
    { decisionId: 'd2', optionId: 'o4' },
  ],
  acceptableOptions: { d1: ['o3'] },
}

function scenarioQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 9,
    activityType: 'scenario-challenge',
    prompt: 'Work through the scenario and make the best decisions.',
    instructions: 'Read the mission, then choose at each decision.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Weigh the consequence of each choice before acting.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** A fully-correct scenario response built from the correct-answer optimalPath. */
function scenarioAnswerFrom(correctAnswer) {
  return { path: correctAnswer.optimalPath.map((step) => ({ decisionId: step.decisionId, optionId: step.optionId })) }
}

/** A store whose question pool is purely scenario questions. */
function poolAllScenario(store) {
  store.questions = [
    scenarioQuestion(901, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(902, scenarioGrade67Payload, scenarioGrade67Answer),
    scenarioQuestion(903, scenarioGrade911Payload, scenarioGrade911Answer),
  ]
}

test('SC1: a scenario round produces a safe client descriptor end-to-end', async () => {
  const { service, store } = makeService()
  store.questions = [
    scenarioQuestion(911, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(912, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(913, scenarioMinimalPayload, scenarioMinimalAnswer),
  ]
  const { currentRound } = await startDemoSession(service)
  assert.equal(currentRound.activityType, 'scenario-challenge')
  assert.equal(currentRound.activity.kind, 'scenario-challenge')
  assert.equal(currentRound.activity.scenarioText, "Your lab light won't turn on. You must troubleshoot.")
  assert.equal(currentRound.activity.entryDecision, 'd1')
  assert.equal(currentRound.activity.decisions.length, 2)
  const d1 = currentRound.activity.decisions.find((d) => d.id === 'd1')
  assert.equal(d1.options.length, 2)
  assert.equal(d1.options[0].nextDecision, 'd2')
  assert.equal(d1.options[0].outcomeText, 'The switch is fine.')
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.ok(currentRound.hints.length > 0)
})

test('SC2/SC3: no correctAnswer, optimalPath or acceptableOptions reach the client', async () => {
  const { service, store } = makeService()
  poolAllScenario(store)
  const { currentRound } = await startDemoSession(service)
  const raw = JSON.stringify(currentRound)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('optimalPath'))
  assert.ok(!raw.includes('acceptableOptions'))
  assert.ok(!raw.includes('"correct"'))
})

test('SC4: a fully-optimal scenario submission scores the full 100', async () => {
  const { service, repos, store } = makeService()
  poolAllScenario(store)
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  const res = await submit(service, session.id, currentRound.roundId, 1, scenarioAnswerFrom(question.correctAnswer))
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
  assert.equal(res.score.roundScore, 100)
})

test('SC5: an authored acceptable alternative scores full credit', async () => {
  const { service, repos, store } = makeService()
  store.questions = [
    scenarioQuestion(921, scenarioGrade67Payload, scenarioGrade67Answer),
    scenarioQuestion(922, scenarioGrade67Payload, scenarioGrade67Answer),
    scenarioQuestion(923, scenarioGrade67Payload, scenarioGrade67Answer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const question = await repos.questionRepository.getById(currentRound.questionId)
  assert.ok(question.correctAnswer.acceptableOptions)
  // o3 at d1 is authored as acceptable; o4 at d2 is the optimal option.
  const res = await submit(service, session.id, currentRound.roundId, 1, {
    path: [
      { decisionId: 'd1', optionId: 'o3' },
      { decisionId: 'd2', optionId: 'o4' },
    ],
  })
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
})

test('SC6: a sub-optimal terminal branch earns proportional partial credit', async () => {
  const { service, store } = makeService()
  store.questions = [
    scenarioQuestion(931, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(932, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(933, scenarioMinimalPayload, scenarioMinimalAnswer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  // First decision optimal (o1), final decision sub-optimal (o4): 1 of 2.
  const res = await submit(service, session.id, currentRound.roundId, 1, {
    path: [
      { decisionId: 'd1', optionId: 'o1' },
      { decisionId: 'd2', optionId: 'o4' },
    ],
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0.5)
  assert.equal(res.roundResult.pointsEarned, 50)
})

test('SC7: a bad decision chain scores zero', async () => {
  const { service, store } = makeService()
  poolAllScenario(store)
  const { session, currentRound } = await startDemoSession(service)
  // "Replace the bulb immediately" is a terminal wrong move at d1.
  const res = await submit(service, session.id, currentRound.roundId, 1, {
    path: [{ decisionId: 'd1', optionId: 'o2' }],
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0)
  assert.equal(res.roundResult.pointsEarned, 0)
})

test('SC8: a malformed scenario answer is rejected by the engine through the service', async () => {
  const { service, store } = makeService()
  poolAllScenario(store)
  const { session, currentRound } = await startDemoSession(service)
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, { path: [{ decisionId: 'd1' }] }),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('SC9: forged correctnessFraction and score are ignored by the server', async () => {
  const { service, store } = makeService()
  store.questions = [
    scenarioQuestion(941, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(942, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(943, scenarioMinimalPayload, scenarioMinimalAnswer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: { path: [{ decisionId: 'd1', optionId: 'o2' }] }, // zero-credit wrong move
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
      score: 999,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0)
  assert.equal(res.roundResult.pointsEarned, 0)
})

test('SC10: an impossible decision jump is rejected by the engine through the service', async () => {
  const { service, store } = makeService()
  store.questions = [
    scenarioQuestion(951, scenarioGrade911Payload, scenarioGrade911Answer),
    scenarioQuestion(952, scenarioGrade911Payload, scenarioGrade911Answer),
    scenarioQuestion(953, scenarioGrade911Payload, scenarioGrade911Answer),
  ]
  const { session, currentRound } = await startDemoSession(service)
  // o1 at d1 leads to d2, not d3 — a forged jump.
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, {
      path: [
        { decisionId: 'd1', optionId: 'o1' },
        { decisionId: 'd3', optionId: 'o6' },
      ],
    }),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('SC11: a mixed drag-drop + scenario session runs to completion (0–300)', async () => {
  const { service, repos, store } = makeService()
  store.questions = store.questions.filter((q) => q.basePoints === 100)
  store.questions.push(
    scenarioQuestion(961, scenarioMinimalPayload, scenarioMinimalAnswer),
    scenarioQuestion(962, scenarioGrade67Payload, scenarioGrade67Answer)
  )
  const { session } = await startDemoSession(service)
  const types = new Set()
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  while (current) {
    types.add(current.activityType)
    const question = await repos.questionRepository.getById(current.questionId)
    const response =
      question.activityType === 'scenario-challenge'
        ? scenarioAnswerFrom(question.correctAnswer)
        : correctFor(question)
    const res = await submit(service, session.id, current.roundId, 1, response)
    assert.equal(res.roundResult.correct, true)
    current = res.nextRound
  }
  assert.ok(types.has('drag-drop') && types.has('scenario-challenge'))
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
  assert.equal(finished.roundBreakdown.length, 3)
})

test('SC12: an all-scenario pool runs to completion with per-round safe descriptors', async () => {
  const { service, repos, store } = makeService()
  poolAllScenario(store)
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  let rounds = 0
  while (current) {
    rounds += 1
    const raw = JSON.stringify(current)
    assert.ok(!raw.includes('correctAnswer'))
    assert.ok(!raw.includes('optimalPath'))
    assert.ok(!raw.includes('acceptableOptions'))
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, scenarioAnswerFrom(question.correctAnswer))
    assert.equal(res.roundResult.correct, true)
    assert.equal(res.roundResult.pointsEarned, 100)
    current = res.nextRound
  }
  assert.equal(rounds, 3)
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
})

// Ordering has no demo questions in the store, so SC13 supplies its own
// base-100 fixtures inline (self-consistent permutation of the minimal payload).
const orderingMinimalPayload = {
  schemaVersion: '1.0',
  items: [
    { id: 'i1', label: 'First' },
    { id: 'i2', label: 'Second' },
    { id: 'i3', label: 'Third' },
  ],
  shuffle: true,
}
const orderingMinimalAnswer = { order: ['i1', 'i2', 'i3'] }

function orderingQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 3,
    activityType: 'ordering',
    prompt: 'Put the steps in the correct order.',
    instructions: 'Arrange the sequence from first to last.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Look for the clue that starts the sequence.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

// Self-consistent inline fixture for SC13's find-word slot (same pattern NL
// uses below — no schemas/examples fixture file for this newer plugin yet).
const findWordGrid = [
  ['A', 'T', 'O', 'M', 'X'],
  ['X', 'C', 'E', 'L', 'L'],
  ['X', 'X', 'X', 'X', 'X'],
  ['X', 'X', 'X', 'X', 'X'],
]
const findWordPayload = {
  schemaVersion: '1.0',
  grid: findWordGrid,
  words: [
    { id: 'w1', label: 'ATOM' },
    { id: 'w2', label: 'CELL' },
  ],
  allowRetry: true,
}
const findWordAnswer = {
  placements: [
    { wordId: 'w1', startRow: 0, startCol: 0, endRow: 0, endCol: 3 },
    { wordId: 'w2', startRow: 1, startCol: 1, endRow: 1, endCol: 4 },
  ],
}

function findWordQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 11,
    activityType: 'find-word',
    prompt: 'Find the hidden words in the grid.',
    instructions: 'Tap the first letter, then the last letter of each word.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Scan each row, then each column, then the diagonals.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** A fully-correct find-word response built straight from the correct-answer document. */
function findWordAnswers(question) {
  return { selections: question.correctAnswer.placements.map((p) => ({ ...p })) }
}

test('SC13: all ten production activity plugins run across sessions to 300 each (10-type coverage)', async () => {
  // A session holds 3 rounds, so split the ten production plugins into three
  // deterministic triples plus a fourth session that guarantees number-logic
  // is exercised through a real session (number-logic has no seed questions,
  // and a 3-round session cannot hold ten unique types).
  const TRIPLES = [
    ['drag-drop', 'matching', 'ordering'],
    ['sorting', 'fill-complete', 'find-word'],
    ['pattern', 'memory', 'scenario-challenge'],
    ['number-logic', 'number-logic', 'drag-drop'],
  ]

  function oneQuestionFor(store, type, index) {
    const base = 2000 + index
    switch (type) {
      case 'drag-drop':
        // The seeded store already carries base-100 drag-drop questions.
        return store.questions.find((q) => q.activityType === 'drag-drop' && q.basePoints === 100)
      case 'matching':
        return matchingQuestion(base, matchingGradePayload, matchingGradeAnswer)
      case 'ordering':
        return orderingQuestion(base, orderingMinimalPayload, orderingMinimalAnswer)
      case 'sorting':
        return sortingQuestion(base, sortingGradePayload, sortingGradeAnswer)
      case 'fill-complete':
        return fillCompleteQuestion(base, fillGradePayload, fillGradeAnswer)
      case 'find-word':
        return findWordQuestion(base, findWordPayload, findWordAnswer)
      case 'pattern':
        return patternQuestion(base, patternMinimalPayload, patternMinimalAnswer)
      case 'memory':
        return memoryQuestion(base, memoryMinimalPayload, memoryPairsAnswer)
      case 'scenario-challenge':
        return scenarioQuestion(base, scenarioMinimalPayload, scenarioMinimalAnswer)
      case 'number-logic':
        return numberLogicQuestion(base, numberLogicMinimalPayload, { type: 'exact', value: 4 })
      default:
        throw new Error(`unhandled type ${type}`)
    }
  }

  function responseFor(question) {
    switch (question.activityType) {
      case 'drag-drop':
        return correctFor(question)
      case 'matching':
        return matchingConnections(question)
      case 'ordering':
        return { order: [...question.correctAnswer.order] }
      case 'sorting':
        return sortingAssignments(question)
      case 'fill-complete':
        return fillAnswers(question)
      case 'find-word':
        return findWordAnswers(question)
      case 'pattern':
        return patternAnswers(question)
      case 'memory':
        return memoryAnswerFrom(question.correctAnswer)
      case 'scenario-challenge':
        return scenarioAnswerFrom(question.correctAnswer)
      case 'number-logic':
        return numberLogicAnswerFrom(question.correctAnswer)
      default:
        throw new Error(`unhandled type ${question.activityType}`)
    }
  }

  const covered = new Set()
  for (const triple of TRIPLES) {
    const { service, repos, store } = makeService()
    store.questions = triple.map((type, i) => oneQuestionFor(store, type, i)).filter(Boolean)
    assert.equal(store.questions.length, 3, `triple ${triple.join(', ')} needs exactly 3 questions`)

    const expectedTypes = new Set(triple)
    const { session } = await startDemoSession(service)
    let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
    const sessionTypes = new Set()
    let rounds = 0
    while (current) {
      rounds += 1
      covered.add(current.activityType)
      sessionTypes.add(current.activityType)
      const question = await repos.questionRepository.getById(current.questionId)
      const res = await submit(service, session.id, current.roundId, 1, responseFor(question))
      assert.equal(res.roundResult.correct, true, `${question.activityType} round should be fully correct`)
      assert.equal(res.roundResult.pointsEarned, 100)
      current = res.nextRound
    }
    assert.equal(rounds, 3)
    assert.deepEqual([...sessionTypes].sort(), [...expectedTypes].sort(), `${triple.join(', ')} should be covered by this session`)
    const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
    assert.equal(finished.sessionScore, 300)
    assert.equal(finished.roundBreakdown.length, 3)
  }

  assert.deepEqual([...covered].sort(), [
    'drag-drop',
    'matching',
    'ordering',
    'sorting',
    'fill-complete',
    'find-word',
    'pattern',
    'memory',
    'scenario-challenge',
    'number-logic',
  ].sort())
})

// ---------------------------------------------------------------------------
// NL. NUMBER / LOGIC CHALLENGE INTEGRATION (Task 4.13 — tenth & final
//     production activity plugin)
//
// The schema fixtures cover exact-integer, fraction and multi-part decimal
// challenges. Sequence / percent / accepted-set answer types have no schema
// example, so NL supplies its own self-consistent inline fixtures (exactly
// like SC13 does for ordering).
// ---------------------------------------------------------------------------

const numberLogicSequencePayload = {
  schemaVersion: '1.0',
  problem: 'Continue the sequence: 2, 4, 6, ...',
  answerFormat: 'sequence',
}
const numberLogicSequenceAnswer = { type: 'sequence', values: [2, 4, 6], tolerance: 0 }

const numberLogicPercentPayload = {
  schemaVersion: '1.0',
  problem: 'What is 50% of 100?',
  answerFormat: 'percent',
}
const numberLogicPercentAnswer = { type: 'percent', value: 50 }

const numberLogicExpressionPayload = {
  schemaVersion: '1.0',
  problem: 'Write x squared as an expression.',
  answerFormat: 'expression',
  inputMode: 'text',
}
const numberLogicExpressionAnswer = { type: 'accepted-set', accepted: ['x^2', 'x*x'] }

function numberLogicQuestion(id, payload, correctAnswer) {
  return {
    id,
    streamId: 1,
    levelId: 1,
    activityTypeId: 10,
    activityType: 'number-logic',
    prompt: 'Work out the value and enter it below.',
    instructions: 'Type your answer, then press Submit.',
    payload,
    correctAnswer,
    hints: [{ level: 1, text: 'Read the problem carefully and show your working.' }],
    basePoints: 100,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** Serializes one correct-answer unit spec into the controller's response value. */
function serializeNumberLogicUnit(spec) {
  if (spec.type === 'fraction') return `${spec.numerator}/${spec.denominator}`
  if (spec.type === 'accepted-set') return spec.accepted[0]
  return String(spec.value ?? spec.min)
}

/** A fully-correct number-logic response built from the correct-answer document. */
function numberLogicAnswerFrom(correctAnswer) {
  if (Array.isArray(correctAnswer.parts)) {
    return {
      parts: correctAnswer.parts.map((part) => ({ partId: part.partId, value: serializeNumberLogicUnit(part) })),
    }
  }
  if (correctAnswer.type === 'sequence') {
    return { values: correctAnswer.values.map(String) }
  }
  return { value: serializeNumberLogicUnit(correctAnswer) }
}

/** A store whose question pool is purely number-logic questions. */
function poolAllNumberLogic(store) {
  store.questions = [
    numberLogicQuestion(1010, numberLogicMinimalPayload, { type: 'exact', value: 4 }),
    numberLogicQuestion(1011, numberLogicGrade67Payload, numberLogicFractionAnswer),
    numberLogicQuestion(1012, numberLogicGrade911Payload, numberLogicPartialCreditAnswer),
  ]
}

test('NL1: a number-logic round produces a safe client descriptor end-to-end', async () => {
  const { service, store } = makeService()
  store.questions = [1010, 1011, 1012].map((id) =>
    numberLogicQuestion(id, numberLogicMinimalPayload, { type: 'exact', value: 4 })
  )
  const { currentRound } = await startDemoSession(service)
  assert.equal(currentRound.activityType, 'number-logic')
  assert.equal(currentRound.activity.kind, 'number-logic')
  assert.equal(currentRound.activity.answerFormat, numberLogicMinimalPayload.answerFormat)
  assert.equal(currentRound.activity.problem, numberLogicMinimalPayload.problem)
  assert.ok(currentRound.timer.allowedSeconds > 0)
  assert.ok(currentRound.hints.length > 0)
})

test('NL2: the render descriptor for a multi-step challenge exposes part metadata only', async () => {
  const { service, store } = makeService()
  store.questions = [1020, 1021, 1022].map((id) =>
    numberLogicQuestion(id, numberLogicGrade911Payload, numberLogicPartialCreditAnswer)
  )
  const { currentRound } = await startDemoSession(service)
  const descriptor = currentRound.activity
  const raw = JSON.stringify(currentRound)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('partial-credit'))
  assert.deepEqual(
    descriptor.parts.map((p) => ({ id: p.id, label: p.label, answerFormat: p.answerFormat })),
    numberLogicGrade911Payload.parts.map((p) => ({ id: p.id, label: p.label, answerFormat: p.answerFormat }))
  )
  for (const key of ['type', 'value', 'tolerance', 'min', 'max', 'numerator', 'denominator']) {
    assert.equal(Object.prototype.hasOwnProperty.call(descriptor, key), false, `${key} must not be in the descriptor`)
  }
})

test('NL3: a fully-correct exact-integer submission scores the full 100', async () => {
  const { service, store } = makeService()
  store.questions = [1030, 1031, 1032].map((id) =>
    numberLogicQuestion(id, numberLogicMinimalPayload, { type: 'exact', value: 4 })
  )
  const { session, currentRound } = await startDemoSession(service)
  const res = await submit(service, session.id, currentRound.roundId, 1, { value: '4' })
  assert.equal(res.roundResult.correct, true)
  assert.equal(res.roundResult.correctnessFraction, 1)
  assert.equal(res.roundResult.pointsEarned, 100)
  assert.equal(res.score.roundScore, 100)
})

test('NL4: fraction equivalents (6/8) and percent "%" form score full credit through the service', async () => {
  const frac = makeService()
  frac.store.questions = [1020, 1021, 1022].map((id) =>
    numberLogicQuestion(id, numberLogicGrade67Payload, numberLogicFractionAnswer)
  )
  const fs = await startDemoSession(frac.service)
  const equiv = await submit(frac.service, fs.session.id, fs.currentRound.roundId, 1, { value: '6/8' })
  assert.equal(equiv.roundResult.correct, true)
  assert.equal(equiv.roundResult.pointsEarned, 100)

  const pct = makeService()
  pct.store.questions = [1023, 1024, 1025].map((id) =>
    numberLogicQuestion(id, numberLogicPercentPayload, numberLogicPercentAnswer)
  )
  const ps = await startDemoSession(pct.service)
  const withSign = await submit(pct.service, ps.session.id, ps.currentRound.roundId, 1, { value: '50%' })
  assert.equal(withSign.roundResult.correct, true)
  assert.equal(withSign.roundResult.pointsEarned, 100)
})

test('NL5: a multi-step challenge awards proportional per-step partial credit', async () => {
  const { service, store } = makeService()
  store.questions = [1030, 1031, 1032].map((id) =>
    numberLogicQuestion(id, numberLogicGrade911Payload, numberLogicPartialCreditAnswer)
  )
  const { session, currentRound } = await startDemoSession(service)
  // p1 (exact 18) correct, p2 (tolerance 18 ± 0.01) wrong: 1 of 2 steps.
  const res = await submit(service, session.id, currentRound.roundId, 1, {
    parts: [
      { partId: 'p1', value: '18' },
      { partId: 'p2', value: '19' },
    ],
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0.5)
  assert.equal(res.roundResult.pointsEarned, 50)
})

test('NL6: a sequence challenge awards per-element partial credit (2 of 3 → 67)', async () => {
  const { service, store } = makeService()
  store.questions = [1030, 1031, 1032].map((id) =>
    numberLogicQuestion(id, numberLogicSequencePayload, numberLogicSequenceAnswer)
  )
  const { session, currentRound } = await startDemoSession(service)
  const res = await submit(service, session.id, currentRound.roundId, 1, { values: ['2', '4', '5'] })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 2 / 3)
  assert.equal(res.roundResult.pointsEarned, 67)
})

test('NL7: an accepted-set expression matches an authored form exactly (no eval)', async () => {
  const { service, store } = makeService()
  store.questions = [1033, 1034, 1035].map((id) =>
    numberLogicQuestion(id, numberLogicExpressionPayload, numberLogicExpressionAnswer)
  )
  const { session, currentRound } = await startDemoSession(service)
  const ok = await submit(service, session.id, currentRound.roundId, 1, { value: 'x*x' })
  assert.equal(ok.roundResult.correct, true)
  assert.equal(ok.roundResult.pointsEarned, 100)
  const nextRound = ok.nextRound
  const bad = await submit(service, session.id, nextRound.roundId, 1, { value: 'x^3' })
  assert.equal(bad.roundResult.correct, false)
  assert.equal(bad.roundResult.pointsEarned, 0)
})

test('NL8: a malformed number-logic answer is rejected by the engine through the service', async () => {
  const { service, store } = makeService()
  poolAllNumberLogic(store)
  const { session, currentRound } = await startDemoSession(service)
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, { value: 'abc' }),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
  await assert.rejects(
    submit(service, session.id, currentRound.roundId, 1, { value: '4', score: 999 }),
    (err) => err.code === ACTIVITY_ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('NL9: forged correctnessFraction and score are ignored by the server', async () => {
  const { service, store } = makeService()
  store.questions = [1030, 1031, 1032].map((id) =>
    numberLogicQuestion(id, numberLogicMinimalPayload, { type: 'exact', value: 4 })
  )
  const { session, currentRound } = await startDemoSession(service)
  const res = await service.submitRound({
    sessionId: session.id,
    roundId: currentRound.roundId,
    studentId: 1,
    submission: {
      response: { value: '99' }, // wrong for every pooled question
      interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      correctnessFraction: 1,
      score: 999,
    },
  })
  assert.equal(res.roundResult.correct, false)
  assert.equal(res.roundResult.correctnessFraction, 0)
  assert.equal(res.roundResult.pointsEarned, 0)
})

test('NL10: an all-number-logic pool runs to completion with per-round safe descriptors (0–300)', async () => {
  const { service, repos, store } = makeService()
  poolAllNumberLogic(store)
  const { session } = await startDemoSession(service)
  let current = (await service.getCurrentRound({ sessionId: session.id, studentId: 1 })).currentRound
  let rounds = 0
  while (current) {
    rounds += 1
    const raw = JSON.stringify(current)
    assert.ok(!raw.includes('correctAnswer'))
    assert.ok(!raw.includes('partial-credit'))
    const question = await repos.questionRepository.getById(current.questionId)
    const res = await submit(service, session.id, current.roundId, 1, numberLogicAnswerFrom(question.correctAnswer))
    assert.equal(res.roundResult.correct, true)
    assert.equal(res.roundResult.pointsEarned, 100)
    current = res.nextRound
  }
  assert.equal(rounds, 3)
  const finished = await service.finishSession({ sessionId: session.id, studentId: 1 })
  assert.equal(finished.sessionScore, 300)
})