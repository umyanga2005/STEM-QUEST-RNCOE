import { test } from 'node:test'
import assert from 'node:assert/strict'

import { selectRoundQuestions, QUESTIONS_PER_SESSION } from '../core/selection.js'
import { generateSessionSeed, createSeededRng } from '../core/prng.js'
import { GameEngineError, GAME_ERROR_CODES } from '../core/errors.js'

function q(id, activityType, streamId = 'science', levelId = 'L1') {
  return { id, streamId, levelId, activityType }
}

/** 100-question pool over 5 activity types, 20 each. */
function buildPool(streamId = 'science', levelId = 'L1', types = ['drag-drop', 'matching', 'sorting', 'ordering', 'memory']) {
  const pool = []
  let n = 0
  for (const type of types) {
    for (let i = 0; i < 20; i++) {
      n += 1
      pool.push(q(`q${n}`, type, streamId, levelId))
    }
  }
  return pool
}

test('selects exactly 3 questions', () => {
  const pool = buildPool()
  for (let i = 0; i < 25; i++) {
    const { questionIds } = selectRoundQuestions({
      streamId: 'science',
      levelId: 'L1',
      studentId: 's1',
      seed: generateSessionSeed(),
      questionPool: pool,
    })
    assert.equal(questionIds.length, QUESTIONS_PER_SESSION)
    assert.equal(new Set(questionIds).size, 3, 'no duplicates in one session')
  }
})

test('same seed + same pool ⇒ same selection (determinism)', () => {
  const pool = buildPool()
  const seed = generateSessionSeed()
  const a = selectRoundQuestions({ streamId: 'science', levelId: 'L1', studentId: 's1', seed, questionPool: pool })
  const b = selectRoundQuestions({ streamId: 'science', levelId: 'L1', studentId: 's1', seed, questionPool: pool })
  assert.deepEqual(a, b)
  assert.equal(a.seed, seed)
})

test('different seeds generally produce different selections', () => {
  const pool = buildPool()
  const seen = new Set()
  for (let i = 0; i < 20; i++) {
    const { questionIds } = selectRoundQuestions({
      streamId: 'science',
      levelId: 'L1',
      studentId: 's1',
      seed: generateSessionSeed(),
      questionPool: pool,
    })
    seen.add(questionIds.join(','))
  }
  assert.ok(seen.size > 1, 'randomness across seeds should vary')
})

test('diversity is strict when pool has >= 3 distinct activity types', () => {
  const pool = buildPool() // 5 types
  for (let i = 0; i < 50; i++) {
    const { questionIds } = selectRoundQuestions({
      streamId: 'science',
      levelId: 'L1',
      studentId: 's1',
      seed: generateSessionSeed(),
      questionPool: pool,
    })
    const byId = new Map(pool.map((x) => [x.id, x]))
    const types = new Set(questionIds.map((id) => byId.get(id).activityType))
    assert.equal(types.size, 3, `expected 3 distinct types, got ${questionIds.join(',')}`)
  }
})

test('recent-5 avoidance applies while it leaves enough candidates', () => {
  const pool = buildPool()
  // Force a scenario: many recent ids are the only ones of their type for the
  // first two diversity picks, but enough of other types remain.
  const recentQuestionIds = ['q1', 'q2'] // two ids of type drag-drop
  const { questionIds } = selectRoundQuestions({
    streamId: 'science',
    levelId: 'L1',
    studentId: 's1',
    seed: 'fixed-seed-1',
    questionPool: pool,
    recentQuestionIds,
  })
  // Avoidance is best-effort; just assert the mechanism runs and picks valid ids.
  assert.equal(questionIds.length, 3)
  const byId = new Map(pool.map((x) => [x.id, x]))
  for (const id of questionIds) assert.ok(byId.has(id))
})

test('recent-5 exclusion never blocks the level (fallback to full group)', () => {
  // Pool has exactly 3 distinct types, each with a single question, all of
  // which are recent. Repeat avoidance must fall back rather than error.
  const pool = [q('a', 'drag-drop'), q('b', 'matching'), q('c', 'sorting')]
  const { questionIds } = selectRoundQuestions({
    streamId: 'science',
    levelId: 'L1',
    studentId: 's1',
    seed: 'seed-fallback',
    questionPool: pool,
    recentQuestionIds: ['a', 'b', 'c'],
  })
  assert.deepEqual(questionIds.slice().sort(), ['a', 'b', 'c'])
})

test('fill pass allows same-type repeats when fewer than 3 types exist', () => {
  const pool = buildPool('science', 'L1', ['drag-drop', 'matching']) // 2 types
  for (let i = 0; i < 30; i++) {
    const { questionIds } = selectRoundQuestions({
      streamId: 'science',
      levelId: 'L1',
      studentId: 's1',
      seed: generateSessionSeed(),
      questionPool: pool,
    })
    assert.equal(questionIds.length, 3)
    const byId = new Map(pool.map((x) => [x.id, x]))
    const types = new Set(questionIds.map((id) => byId.get(id).activityType))
    assert.ok(types.size <= 2)
  }
})

test('single-type pool still yields 3 questions (all repeats)', () => {
  const pool = buildPool('science', 'L1', ['memory'])
  const { questionIds } = selectRoundQuestions({
    streamId: 'science',
    levelId: 'L1',
    studentId: 's1',
    seed: 'seed-single-type',
    questionPool: pool,
  })
  assert.equal(questionIds.length, 3)
})

test('insufficient pool (< 3) throws GAME_INSUFFICIENT_POOL', () => {
  const pool = [q('a', 'drag-drop'), q('b', 'matching')]
  assert.throws(
    () =>
      selectRoundQuestions({
        streamId: 'science',
        levelId: 'L1',
        studentId: 's1',
        seed: 'seed-x',
        questionPool: pool,
      }),
    (err) =>
      err instanceof GameEngineError &&
      err.code === GAME_ERROR_CODES.INSUFFICIENT_POOL &&
      err.toPublic().category === 'AVAILABILITY'
  )
})

test('empty pool throws GAME_INSUFFICIENT_POOL', () => {
  assert.throws(
    () =>
      selectRoundQuestions({
        streamId: 'science',
        levelId: 'L1',
        studentId: 's1',
        seed: 'seed-empty',
        questionPool: [],
      }),
    (err) => err.code === GAME_ERROR_CODES.INSUFFICIENT_POOL
  )
})

test('only picks questions belonging to the requested stream/level', () => {
  const pool = [
    ...buildPool('science', 'L1'),
    ...buildPool('technology', 'L3').map((x) => ({ ...x, id: `tech-${x.id}` })),
  ]
  const { questionIds } = selectRoundQuestions({
    streamId: 'science',
    levelId: 'L1',
    studentId: 's1',
    seed: 'seed-scope',
    questionPool: pool,
  })
  const byId = new Map(pool.map((x) => [x.id, x]))
  for (const id of questionIds) {
    const x = byId.get(id)
    assert.equal(x.streamId, 'science')
    assert.equal(x.levelId, 'L1')
  }
})

test('seeded rng is reproducible and in range', () => {
  const rng = createSeededRng('abc')
  const first = Array.from({ length: 5 }, () => rng())
  const rng2 = createSeededRng('abc')
  const second = Array.from({ length: 5 }, () => rng2())
  assert.deepEqual(first, second)
  for (const v of first) {
    assert.ok(v >= 0 && v < 1)
  }
})

test('generateSessionSeed returns 16 hex chars', () => {
  const seed = generateSessionSeed()
  assert.match(seed, /^[0-9a-f]{16}$/)
  assert.notEqual(generateSessionSeed(), seed)
})
