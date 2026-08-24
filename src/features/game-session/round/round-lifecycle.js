/**
 * Game Session — round lifecycle reducer (Task 5.3).
 *
 * PURE state machine for the in-play round flow. React owns ephemeral UI
 * state only; all authority stays in GameSessionService (D-016/D-027). The
 * reducer never computes correctness, scores, or progression — it only holds
 * what the server returned and drives the UI between phases:
 *
 *   IDLE → STARTING → PLAYING ⇄ SUBMITTING → ROUND_RESULT
 *                                                   │
 *                next round → PLAYING               │ (last round)
 *                                                   ↓
 *                                           FINISHING → SESSION_COMPLETE
 *
 * The timer is display-only and lives in the page (backend timestamps decide
 * overtime). Unit-tested in isolation; no I/O, no React, no side effects.
 */

export const ROUND_PHASE = Object.freeze({
  IDLE: 'idle',
  STARTING: 'starting',
  PLAYING: 'playing',
  SUBMITTING: 'submitting',
  ROUND_RESULT: 'roundResult',
  FINISHING: 'finishing',
  SESSION_COMPLETE: 'sessionComplete',
})

/** Phases in which an active session exists (navigation guard warns). */
export const ACTIVE_SESSION_PHASES = Object.freeze([
  ROUND_PHASE.STARTING,
  ROUND_PHASE.PLAYING,
  ROUND_PHASE.SUBMITTING,
  ROUND_PHASE.ROUND_RESULT,
  ROUND_PHASE.FINISHING,
])

export function createInitialRoundState() {
  return {
    phase: ROUND_PHASE.IDLE,
    sessionId: null,
    sessionCode: null,
    currentRound: null,
    roundResult: null,
    feedback: null,
    progress: null,
    score: null,
    nextRound: null,
    finished: null,
    error: null,
  }
}

export function beginStart(state) {
  if (state.phase === ROUND_PHASE.STARTING) return state
  return { ...state, phase: ROUND_PHASE.STARTING, error: null }
}

/** Server answered start/resume. `currentRound` may be null only when an
 * active session already has every round answered (resume edge) — the page
 * then finishes it. */
export function sessionStarted(state, { session, currentRound }) {
  const hasRound = Boolean(currentRound)
  return {
    ...state,
    phase: hasRound ? ROUND_PHASE.PLAYING : ROUND_PHASE.FINISHING,
    sessionId: session?.id ?? null,
    sessionCode: session?.sessionCode ?? null,
    currentRound: hasRound ? currentRound : null,
    roundResult: null,
    feedback: null,
    progress: null,
    score: null,
    nextRound: null,
    finished: null,
    error: null,
  }
}

export function beginSubmit(state) {
  if (state.phase !== ROUND_PHASE.PLAYING) return state
  return { ...state, phase: ROUND_PHASE.SUBMITTING, error: null }
}

export function roundSubmitted(state, { roundResult, feedback, progress, score, nextRound }) {
  return {
    ...state,
    phase: ROUND_PHASE.ROUND_RESULT,
    currentRound: null,
    roundResult: roundResult ?? null,
    feedback: feedback ?? null,
    progress: progress ?? null,
    score: score ?? null,
    nextRound: nextRound ?? null,
    error: null,
  }
}

/** Continue to the server-provided next round (or finish the last one). */
export function continueToNext(state) {
  if (state.phase !== ROUND_PHASE.ROUND_RESULT) return state
  if (!state.nextRound) {
    return { ...state, phase: ROUND_PHASE.FINISHING }
  }
  return {
    ...state,
    phase: ROUND_PHASE.PLAYING,
    currentRound: state.nextRound,
    roundResult: null,
    feedback: null,
    progress: null,
    score: null,
    nextRound: null,
    error: null,
  }
}

/** Explicitly start finishing (last round result shown, user taps see results). */
export function beginFinish(state) {
  if (state.phase !== ROUND_PHASE.ROUND_RESULT) return state
  return { ...state, phase: ROUND_PHASE.FINISHING, error: null }
}

export function onFinished(state, finished) {
  return {
    ...state,
    phase: ROUND_PHASE.SESSION_COMPLETE,
    finished: finished ?? null,
    error: null,
  }
}

/** Recover from a failed server call, returning to the phase where the user
 * can retry. `error` carries a safe public message only. */
export function failRound(state, error) {
  const phase =
    state.phase === ROUND_PHASE.STARTING
      ? ROUND_PHASE.IDLE
      : state.phase === ROUND_PHASE.SUBMITTING
        ? ROUND_PHASE.PLAYING
        : state.phase === ROUND_PHASE.FINISHING
          ? ROUND_PHASE.ROUND_RESULT
          : state.phase
  return { ...state, phase, error: error ?? null }
}

export function hasActiveSession(state) {
  return ACTIVE_SESSION_PHASES.includes(state.phase)
}

export default {
  ROUND_PHASE,
  ACTIVE_SESSION_PHASES,
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
}