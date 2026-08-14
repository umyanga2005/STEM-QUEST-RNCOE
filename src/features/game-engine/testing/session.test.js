import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  createGameSession,
  guardSessionForStudent,
  getCurrentRound,
  submitRound,
  finishSession,
  SESSION_STATUS,
  ROUND_STATUS,
  MAX_SESSION_POINTS,
} from '../core/session.js'
import { GAME_ERROR_CODES } from '../core/errors.js'
let seq = 0
function makeRoundId() {
  seq += 1
  return `round-${seq}`
}

function buildSession(overrides = {}) {
  return createGameSession(
    {
      id: 'sess-1',
      studentId: 'stu-1',
      streamId: 'science',
      levelId: 'L1',
      seed: 'a1b2c3d4e5f60718',
      questionIds: ['q1', 'q2', 'q3'],
      ...overrides,
    },
    { makeRoundId }
  )
}

test('createGameSession builds started session with 3 pending rounds', () => {
  const s = buildSession()
  assert.equal(s.status, SESSION_STATUS.STARTED)
  assert.deepEqual(s.questionIds, ['q1', 'q2', 'q3'])
  assert.equal(s.rounds.length, 3)
  assert.ok(s.rounds.every((r) => r.status === ROUND_STATUS.PENDING))
  assert.equal(getCurrentRound(s).id, s.rounds[0].id)
})

test('createGameSession rejects wrong question count', () => {
  assert.throws(
    () => buildSession({ questionIds: ['q1', 'q2'] }),
    (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT
  )
  assert.throws(
    () => buildSession({ questionIds: ['q1', 'q2', 'q3', 'q4'] }),
    (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT
  )
})

test('createGameSession rejects duplicate question ids', () => {
  assert.throws(
    () => buildSession({ questionIds: ['q1', 'q1', 'q3'] }),
    (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT
  )
})

test('createGameSession rejects missing core fields', () => {
  assert.throws(() => buildSession({ studentId: undefined }), (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT)
  assert.throws(() => buildSession({ seed: undefined }), (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT)
})

test('guardSessionForStudent rejects wrong student and missing session', () => {
  const s = buildSession()
  assert.throws(
    () => guardSessionForStudent(s, 'other-student'),
    (err) => err.code === GAME_ERROR_CODES.SESSION_WRONG_STUDENT
  )
  assert.throws(
    () => guardSessionForStudent(null, 'stu-1'),
    (err) => err.code === GAME_ERROR_CODES.SESSION_NOT_FOUND
  )
  assert.equal(guardSessionForStudent(s, 'stu-1'), s)
})

test('rounds must be submitted in order', () => {
  let s = buildSession()
  const r1 = s.rounds[0]
  const r2 = s.rounds[1]
  assert.throws(
    () => submitRound(s, r2.id),
    (err) => err.code === GAME_ERROR_CODES.ROUND_NOT_CURRENT
  )
  s = submitRound(s, r1.id, { correct: true })
  assert.equal(s.rounds[0].status, ROUND_STATUS.SUBMITTED)
  assert.equal(s.rounds[0].result.correct, true)
  assert.equal(s.status, SESSION_STATUS.STARTED)
  assert.equal(getCurrentRound(s).id, r2.id)
})

test('submitRound rejects unknown round and double submission', () => {
  const s = buildSession()
  assert.throws(
    () => submitRound(s, 'nope'),
    (err) => err.code === GAME_ERROR_CODES.ROUND_NOT_FOUND
  )
  const s1 = submitRound(s, s.rounds[0].id)
  assert.throws(
    () => submitRound(s1, s.rounds[0].id),
    (err) => err.code === GAME_ERROR_CODES.ROUND_ALREADY_SUBMITTED
  )
})

test('submitting all rounds completes the session', () => {
  let s = buildSession()
  for (const r of s.rounds) s = submitRound(s, r.id)
  assert.equal(s.status, SESSION_STATUS.COMPLETED)
  assert.equal(getCurrentRound(s), null)
})

test('submitRound on a non-started session throws SESSION_NOT_ACTIVE', () => {
  let s = buildSession()
  for (const r of s.rounds) s = submitRound(s, r.id)
  assert.throws(
    () => submitRound(s, s.rounds[0].id),
    (err) => err.code === GAME_ERROR_CODES.SESSION_NOT_ACTIVE
  )
})

test('finishSession requires all rounds submitted', () => {
  let s = buildSession()
  s = submitRound(s, s.rounds[0].id)
  assert.throws(
    () => finishSession(s, 300),
    (err) => err.code === GAME_ERROR_CODES.SESSION_INVALID_STATE
  )
})

test('finishSession validates 0–300 points and records total', () => {
  let s = buildSession()
  for (const r of s.rounds) s = submitRound(s, r.id)
  assert.throws(() => finishSession(s, -1), (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT)
  assert.throws(() => finishSession(s, 301), (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT)
  assert.throws(() => finishSession(s, NaN), (err) => err.code === GAME_ERROR_CODES.INVALID_INPUT)
  const done = finishSession(s, MAX_SESSION_POINTS)
  assert.equal(done.status, SESSION_STATUS.COMPLETED)
  assert.equal(done.totalPoints, MAX_SESSION_POINTS)
  assert.ok(done.finishedAt)
})

test('session/round state machine is immutable (original unchanged)', () => {
  const s = buildSession()
  const next = submitRound(s, s.rounds[0].id)
  assert.equal(s.rounds[0].status, ROUND_STATUS.PENDING, 'original must not mutate')
  assert.equal(next.rounds[0].status, ROUND_STATUS.SUBMITTED)
})

test('GameEngineError public form is student-safe', () => {
  let s = buildSession()
  try {
    submitRound(s, 'bogus')
  } catch (err) {
    const pub = err.toPublic()
    assert.equal(pub.code, GAME_ERROR_CODES.ROUND_NOT_FOUND)
    assert.equal(pub.category, 'STUDENT_ANSWER')
    assert.ok(!err.toJSON().stack)
  }
})
