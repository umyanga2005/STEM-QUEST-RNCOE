import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  scoreQuestion,
  sumSessionScore,
  computeOvertimeSeconds,
  resolveAllowedSeconds,
  buildRoundBreakdown,
  MAX_QUESTION_SCORE,
  MAX_SESSION_SCORE,
} from '../scoring/central-scoring-service.js'

test('full correctness earns exact base (100) with no deductions', () => {
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1 }), 100)
})

test('partial correctness scales earned base (rounds to nearest)', () => {
  // 3 of 4 → 0.75 → 75
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 0.75 }), 75)
  // 1 of 3 → 0.333… → round(33.33) = 33
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1 / 3 }), 33)
})

test('zero correctness scores 0', () => {
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 0 }), 0)
})

test('hint deduction is subtracted per hint used (default 5)', () => {
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1, hintsUsed: 1 }), 95)
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1, hintsUsed: 2 }), 90)
  assert.equal(
    scoreQuestion({ basePoints: 100, correctnessFraction: 1, hintsUsed: 2, hintDeduction: 7 }),
    86
  )
})

test('attempt deduction applies only to extra attempts (default 10)', () => {
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1, attempts: 1 }), 100)
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1, attempts: 2 }), 90)
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1, attempts: 3 }), 80)
})

test('overtime deduction subtracts penalty × seconds', () => {
  assert.equal(
    scoreQuestion({ basePoints: 100, correctnessFraction: 1, overtimeSeconds: 10 }),
    90
  )
})

test('overtime penalty per second uses the level config (D-034)', () => {
  // Level 5: 45s / 5 pts per second → 5s overtime costs 25.
  assert.equal(
    scoreQuestion({ basePoints: 100, correctnessFraction: 1, overtimeSeconds: 5, overtimePenaltyPerSecond: 5 }),
    75
  )
  assert.equal(
    scoreQuestion({ basePoints: 100, correctnessFraction: 1, overtimeSeconds: 5, overtimePenaltyPerSecond: 2 }),
    90
  )
  assert.equal(
    scoreQuestion({ basePoints: 100, correctnessFraction: 1, overtimeSeconds: 5, overtimePenaltyPerSecond: 0.5 }),
    98
  )
})

test('score clamps at floor 0', () => {
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 0.5, hintsUsed: 99, attempts: 99 }), 0)
})

test('score clamps at ceiling 100', () => {
  assert.equal(scoreQuestion({ basePoints: 100, correctnessFraction: 1 }), 100)
  assert.equal(scoreQuestion({ basePoints: 80, correctnessFraction: 1 }), 80)
  assert.equal(scoreQuestion({ basePoints: 50, correctnessFraction: 1 }), 50)
})

test('base points are respected', () => {
  assert.equal(scoreQuestion({ basePoints: 80, correctnessFraction: 1 }), 80)
  assert.equal(scoreQuestion({ basePoints: 80, correctnessFraction: 0.5 }), 40)
})

test('computeOvertimeSeconds uses seconds ceiled at the allowed boundary', () => {
  assert.equal(computeOvertimeSeconds({ timeTakenMs: 90_000, allowedSeconds: 90 }), 0)
  assert.equal(computeOvertimeSeconds({ timeTakenMs: 90_500, allowedSeconds: 90 }), 1)
  assert.equal(computeOvertimeSeconds({ timeTakenMs: 95_000, allowedSeconds: 90 }), 5)
  assert.equal(computeOvertimeSeconds({ timeTakenMs: 0, allowedSeconds: 90 }), 0)
})

test('computeOvertimeSeconds guards non-negative inputs', () => {
  assert.throws(() => computeOvertimeSeconds({ timeTakenMs: -1, allowedSeconds: 90 }))
  assert.throws(() => computeOvertimeSeconds({ timeTakenMs: 100, allowedSeconds: -5 }))
})

test('resolveAllowedSeconds prefers timer override over level default', () => {
  assert.equal(
    resolveAllowedSeconds({ timerOverrideSeconds: 45, levelDefaultSeconds: 90 }),
    45
  )
  assert.equal(
    resolveAllowedSeconds({ timerOverrideSeconds: null, levelDefaultSeconds: 90 }),
    90
  )
})

test('sumSessionScore aggregates three rounds, clamped to 300', () => {
  assert.equal(sumSessionScore([100, 80, 70]), 250)
  assert.equal(sumSessionScore([100, 100, 100]), 300)
  assert.equal(sumSessionScore([0, 0, 0]), 0)
  // negative entries clamped, oversized total capped
  assert.equal(sumSessionScore([-5, 200, 100]), 300)
})

test('sumSessionScore guards inputs', () => {
  assert.throws(() => sumSessionScore('nope'))
  assert.throws(() => sumSessionScore([1, NaN]))
})

test('buildRoundBreakdown snapshots per-round scoring inputs', () => {
  const rounds = [
    { roundNumber: 1, questionId: 3, pointsEarned: 90, attempts: 1, hintsUsed: 1, overtimeSeconds: 0, timeTakenMs: 5000 },
    { roundNumber: 2, questionId: 7, pointsEarned: 80, attempts: 1, hintsUsed: 0, overtimeSeconds: 2, timeTakenMs: 92000 },
  ]
  const breakdown = buildRoundBreakdown(rounds)
  assert.deepEqual(breakdown[0], { roundNumber: 1, questionId: 3, pointsEarned: 90, attempts: 1, hintsUsed: 1, overtimeSeconds: 0, timeTakenMs: 5000 })
  assert.equal(breakdown[1].overtimeSeconds, 2)
})

test('module constants match the approved ceilings', () => {
  assert.equal(MAX_QUESTION_SCORE, 100)
  assert.equal(MAX_SESSION_SCORE, 300)
})

test('scoreQuestion guards correctnessFraction range', () => {
  assert.throws(() => scoreQuestion({ correctnessFraction: 1.1, basePoints: 100 }))
  assert.throws(() => scoreQuestion({ correctnessFraction: -0.1, basePoints: 100 }))
  assert.throws(() => scoreQuestion({ correctnessFraction: NaN, basePoints: 100 }))
  assert.throws(() => scoreQuestion({ correctnessFraction: undefined, basePoints: 100 }))
})