/**
 * Game Session — round lifecycle reducer tests (Task 5.3).
 *
 * PURE state-machine coverage of the in-play flow: IDLE → STARTING → PLAYING
 * ⇄ SUBMITTING → ROUND_RESULT → (next round → PLAYING | finish →
 * SESSION_COMPLETE), the resume edge, error recovery (no auto-retry loop),
 * and the navigation-guard predicate.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROUND_PHASE,
  createInitialRoundState,
  beginStart,
  sessionStarted,
  beginSubmit,
  roundSubmitted,
  continueToNext,
  beginFinish,
  onFinished,
  failRound,
  hasActiveSession,
} from '../round/round-lifecycle.js'

const SESSION = { id: 7, sessionCode: 'ABC123' }
const ROUND_1 = { roundId: 1, roundNumber: 1, totalRounds: 3, activityType: 'drag-drop' }
const ROUND_2 = { roundId: 2, roundNumber: 2, totalRounds: 3, activityType: 'matching' }

const SUBMIT_RESULT = {
  roundResult: { sessionId: 7, roundId: 1, correct: true, correctnessFraction: 1, pointsEarned: 100 },
  feedback: { title: 'All correct' },
  progress: { current: 1, total: 3, completed: false },
  score: { roundScore: 100, sessionRunningTotal: 100 },
  nextRound: ROUND_2,
}

test('full lifecycle: idle → starting → playing → submitting → result → next → complete', () => {
  let s = createInitialRoundState()
  assert.equal(s.phase, ROUND_PHASE.IDLE)
  assert.equal(hasActiveSession(s), false)

  s = beginStart(s)
  assert.equal(s.phase, ROUND_PHASE.STARTING)
  assert.equal(hasActiveSession(s), true)

  s = sessionStarted(s, { session: SESSION, currentRound: ROUND_1 })
  assert.equal(s.phase, ROUND_PHASE.PLAYING)
  assert.equal(s.sessionId, 7)
  assert.equal(s.sessionCode, 'ABC123')
  assert.equal(s.currentRound, ROUND_1)
  assert.equal(s.finished, null)

  s = beginSubmit(s)
  assert.equal(s.phase, ROUND_PHASE.SUBMITTING)
  assert.equal(s.currentRound, ROUND_1, 'the round stays visible while submitting')

  s = roundSubmitted(s, SUBMIT_RESULT)
  assert.equal(s.phase, ROUND_PHASE.ROUND_RESULT)
  assert.equal(s.currentRound, null)
  assert.equal(s.nextRound, ROUND_2)
  assert.equal(s.score.sessionRunningTotal, 100)
  assert.equal(s.roundResult.correct, true)

  s = continueToNext(s)
  assert.equal(s.phase, ROUND_PHASE.PLAYING)
  assert.equal(s.currentRound, ROUND_2)
  assert.equal(s.nextRound, null, 'the played round is consumed')
})

test('last round: result → finishing → sessionComplete', () => {
  let s = createInitialRoundState()
  s = beginStart(s)
  s = sessionStarted(s, { session: SESSION, currentRound: ROUND_1 })
  s = roundSubmitted(s, {
    ...SUBMIT_RESULT,
    progress: { current: 3, total: 3, completed: true },
    nextRound: null,
  })
  assert.equal(s.phase, ROUND_PHASE.ROUND_RESULT)

  s = continueToNext(s)
  assert.equal(s.phase, ROUND_PHASE.FINISHING, 'no next round means finishing')

  s = onFinished(s, { sessionId: 7, sessionScore: 200, status: 'completed', result: 'passed' })
  assert.equal(s.phase, ROUND_PHASE.SESSION_COMPLETE)
  assert.equal(s.finished.sessionScore, 200)
  assert.equal(hasActiveSession(s), false)
})

test('beginFinish is explicit and only valid from roundResult', () => {
  let s = createInitialRoundState()
  assert.equal(beginFinish(s), s, 'cannot finish from idle')

  s = beginStart(s)
  s = sessionStarted(s, { session: SESSION, currentRound: ROUND_1 })
  assert.equal(beginFinish(s), s, 'cannot finish while playing')

  s = roundSubmitted(s, { ...SUBMIT_RESULT, progress: { current: 3, total: 3, completed: true }, nextRound: null })
  s = beginFinish(s)
  assert.equal(s.phase, ROUND_PHASE.FINISHING)
})

test('resume edge: active session with all rounds answered has no current round', () => {
  let s = createInitialRoundState()
  s = beginStart(s)
  s = sessionStarted(s, { session: SESSION, currentRound: null })
  assert.equal(s.phase, ROUND_PHASE.FINISHING, 'page must finish the exhausted active session')
  assert.equal(s.sessionId, 7)
})

test('submit failure returns to playing (retry) without losing the round', () => {
  let s = createInitialRoundState()
  s = beginStart(s)
  s = sessionStarted(s, { session: SESSION, currentRound: ROUND_1 })
  s = beginSubmit(s)
  s = failRound(s, { code: 'GAME_INTERNAL', message: 'An unexpected problem occurred.' })
  assert.equal(s.phase, ROUND_PHASE.PLAYING)
  assert.equal(s.currentRound, ROUND_1)
  assert.equal(s.error.code, 'GAME_INTERNAL')
})

test('start failure returns to idle so the user can retry (no auto loop)', () => {
  let s = createInitialRoundState()
  s = beginStart(s)
  s = failRound(s, { code: 'GAME_LEVEL_LOCKED', message: 'Locked.' })
  assert.equal(s.phase, ROUND_PHASE.IDLE)
  assert.equal(hasActiveSession(s), false)
})

test('finish failure returns to roundResult so the result is still shown', () => {
  let s = createInitialRoundState()
  s = beginStart(s)
  s = sessionStarted(s, { session: SESSION, currentRound: ROUND_1 })
  s = roundSubmitted(s, { ...SUBMIT_RESULT, progress: { current: 3, total: 3, completed: true }, nextRound: null })
  s = beginFinish(s)
  s = failRound(s, { code: 'GAME_SESSION_NOT_ACTIVE', message: 'Not active.' })
  assert.equal(s.phase, ROUND_PHASE.ROUND_RESULT)
})

test('hasActiveSession guards exactly the in-play phases', () => {
  assert.equal(hasActiveSession(createInitialRoundState()), false)
  assert.equal(hasActiveSession({ phase: ROUND_PHASE.STARTING }), true)
  assert.equal(hasActiveSession({ phase: ROUND_PHASE.PLAYING }), true)
  assert.equal(hasActiveSession({ phase: ROUND_PHASE.SUBMITTING }), true)
  assert.equal(hasActiveSession({ phase: ROUND_PHASE.ROUND_RESULT }), true)
  assert.equal(hasActiveSession({ phase: ROUND_PHASE.FINISHING }), true)
  assert.equal(hasActiveSession({ phase: ROUND_PHASE.SESSION_COMPLETE }), false)
})