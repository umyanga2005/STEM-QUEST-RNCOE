/**
 * Game Session — Central Scoring Service (Task 4.4, D-023/D-041).
 *
 * The ONLY place final points are computed. Server-only. Consumes normalized
 * scoring inputs (correctnessFraction from the plugin) plus authoritative
 * server facts (hint/attempt counts, overtime from server timestamps) and
 * game_settings config. The browser never runs this and never submits any
 * authoritative value.
 *
 * Formula (design §18):
 *   Earned Base      = round(basePoints × correctnessFraction)
 *   Question Score   = Earned Base − hint − attempt − overtime deductions
 *   Clamp            = [0, 100]
 *   Session Score    = Q1 + Q2 + Q3  (max 300)
 *
 * Overtime is computed here from server-side elapsed time and the allowed
 * time (level default or question timer_override_seconds). A partial second
 * of overtime counts as one full second (deterministic; never under-counted).
 */

import { gameError } from '../../game-engine/core/errors.js'

export const MAX_QUESTION_SCORE = 100
export const MAX_SESSION_SCORE = 300

function nonNegativeNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw gameError.invalidInput(`${field} must be a finite, non-negative number`)
  }
  return value
}

/**
 * Computes the overtime seconds from authoritative server elapsed time.
 * @param {object} input
 * @param {number} input.timeTakenMs - server-determined elapsed time for the round
 * @param {number} input.allowedSeconds - level default or question override
 * @returns {number} integer seconds >= 0
 */
export function computeOvertimeSeconds({ timeTakenMs, allowedSeconds }) {
  nonNegativeNumber(timeTakenMs, 'timeTakenMs')
  nonNegativeNumber(allowedSeconds, 'allowedSeconds')
  const overMs = timeTakenMs - allowedSeconds * 1000
  return overMs > 0 ? Math.ceil(overMs / 1000) : 0
}

/**
 * Resolves the allowed time for a question.
 * @param {object} opts
 * @param {?number} [opts.timerOverrideSeconds] - question override
 * @param {number} opts.levelDefaultSeconds - level default
 * @returns {number}
 */
export function resolveAllowedSeconds({ timerOverrideSeconds, levelDefaultSeconds }) {
  nonNegativeNumber(levelDefaultSeconds, 'levelDefaultSeconds')
  if (timerOverrideSeconds === null || timerOverrideSeconds === undefined) {
    return levelDefaultSeconds
  }
  nonNegativeNumber(timerOverrideSeconds, 'timerOverrideSeconds')
  return timerOverrideSeconds
}

/**
 * @typedef {object} QuestionScoreInput
 * @property {number} basePoints - snapshot from the question (default 100)
 * @property {number} correctnessFraction - plugin-reported, in [0, 1]
 * @property {number} hintsUsed - server-recorded (driver of the deduction)
 * @property {number} attempts - server-recorded total attempts (>= 1)
 * @property {number} [overtimeSeconds] - server-computed (default 0)
 * @property {number} [overtimePenaltyPerSecond] - level penalty (D-034, default 1)
 * @property {number} hintDeduction - game_settings scoring.hint_deduction
 * @property {number} attemptDeduction - game_settings scoring.attempt_deduction
 */

/**
 * Scores one question. Clamps to [0, 100].
 * @param {QuestionScoreInput} input
 * @returns {number} whole points
 */
export function scoreQuestion(input) {
  const {
    basePoints = 100,
    correctnessFraction,
    hintsUsed = 0,
    attempts = 1,
    overtimeSeconds = 0,
    overtimePenaltyPerSecond = 1,
    hintDeduction = 5,
    attemptDeduction = 10,
  } = input

  nonNegativeNumber(basePoints, 'basePoints')
  if (
    typeof correctnessFraction !== 'number' ||
    !Number.isFinite(correctnessFraction) ||
    correctnessFraction < 0 ||
    correctnessFraction > 1
  ) {
    throw gameError.invalidInput('correctnessFraction must be a finite number in [0, 1]')
  }
  nonNegativeNumber(hintsUsed, 'hintsUsed')
  nonNegativeNumber(attempts, 'attempts')
  nonNegativeNumber(overtimeSeconds, 'overtimeSeconds')
  nonNegativeNumber(overtimePenaltyPerSecond, 'overtimePenaltyPerSecond')
  nonNegativeNumber(hintDeduction, 'hintDeduction')
  nonNegativeNumber(attemptDeduction, 'attemptDeduction')

  const earnedBase = Math.round(basePoints * correctnessFraction)
  const hintTotal = hintDeduction * Math.floor(hintsUsed)
  const attemptTotal = attemptDeduction * Math.max(0, Math.ceil(attempts - 1))
  // D-034: the overtime deduction is the level's per-second penalty × seconds.
  const overtimeTotal = overtimeSeconds * overtimePenaltyPerSecond

  // Round the final total so fractional penalties (e.g. 0.5pt/s) accumulate
  // fairly instead of being rounded before subtraction (97.5 → 98, not 97).
  const raw = Math.round(earnedBase - hintTotal - attemptTotal - overtimeTotal)
  return Math.max(0, Math.min(MAX_QUESTION_SCORE, raw))
}

/**
 * Builds the per-round breakdown payload for the `scores.round_breakdown`
 * JSONB ledger.
 */
export function buildRoundBreakdown(rounds) {
  return rounds.map((r) => ({
    roundNumber: r.roundNumber,
    questionId: r.questionId,
    pointsEarned: r.pointsEarned,
    attempts: r.attempts,
    hintsUsed: r.hintsUsed,
    overtimeSeconds: r.overtimeSeconds,
    timeTakenMs: r.timeTakenMs,
  }))
}

/**
 * Sums round scores into the session total, clamped to [0, 300].
 * @param {number[]} roundScores
 * @returns {number}
 */
export function sumSessionScore(roundScores) {
  if (!Array.isArray(roundScores) || !roundScores.every((n) => Number.isFinite(n))) {
    throw gameError.invalidInput('roundScores must be an array of finite numbers')
  }
  const total = roundScores.reduce((sum, n) => sum + Math.max(0, n), 0)
  return Math.max(0, Math.min(MAX_SESSION_SCORE, total))
}

export const centralScoring = Object.freeze({
  computeOvertimeSeconds,
  resolveAllowedSeconds,
  scoreQuestion,
  sumSessionScore,
  buildRoundBreakdown,
})

export default centralScoring