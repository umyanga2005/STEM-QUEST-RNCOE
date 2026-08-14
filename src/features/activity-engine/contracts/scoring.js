/**
 * Activity Engine — scoring input contract (Task 4.1, report §8–§9).
 *
 * The plugin returns *raw* scoring inputs; the engine validates and
 * normalizes them. The plugin NEVER computes the final score — it only
 * reports facts (correctness fraction, attempts, hints, bonus flags).
 */

import { engineError } from '../errors/index.js'

function nonNegativeInt(value, fallback, activityType, field) {
  if (value === undefined) return fallback
  if (!Number.isInteger(value) || value < 0) {
    throw engineError.scoringInvalid(
      activityType,
      `\`${field}\` must be a non-negative integer`
    )
  }
  return value
}

/**
 * Normalizes and guards raw scoring inputs produced by a plugin.
 *
 * @param {object} raw - `{ correctnessFraction, scorableUnits, correctUnits,
 *                        attemptsUsed, hintsUsed, bonusFlags, interactionMetrics, evidence }`
 * @param {object} [opts] - `{ activityType }`
 * @returns {object} frozen normalized scoring inputs
 * @throws {ActivityEngineError} SCORING_INPUTS_INVALID
 */
export function normalizeScoringInputs(raw, { activityType } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw engineError.scoringInvalid(activityType, 'scoring inputs must be an object')
  }

  const { correctnessFraction } = raw
  if (
    typeof correctnessFraction !== 'number' ||
    !Number.isFinite(correctnessFraction) ||
    correctnessFraction < 0 ||
    correctnessFraction > 1
  ) {
    throw engineError.scoringInvalid(
      activityType,
      '`correctnessFraction` must be a finite number in [0, 1]'
    )
  }

  const scorableUnits = nonNegativeInt(raw.scorableUnits, 1, activityType, 'scorableUnits')
  const correctUnits = nonNegativeInt(raw.correctUnits, 0, activityType, 'correctUnits')
  const attemptsUsed = nonNegativeInt(raw.attemptsUsed, 1, activityType, 'attemptsUsed')
  const hintsUsed = nonNegativeInt(raw.hintsUsed, 0, activityType, 'hintsUsed')

  const bonusFlags = Array.isArray(raw.bonusFlags)
    ? Object.freeze(raw.bonusFlags.filter((f) => typeof f === 'string'))
    : Object.freeze([])

  const interactionMetrics = raw.interactionMetrics
    ? normalizeInteractionMetrics(raw.interactionMetrics, activityType)
    : null

  const evidence = raw.evidence === undefined ? null : raw.evidence

  return Object.freeze({
    activityType: activityType ?? null,
    correctnessFraction,
    scorableUnits,
    correctUnits,
    attemptsUsed,
    hintsUsed,
    bonusFlags,
    interactionMetrics,
    evidence,
  })
}

function normalizeInteractionMetrics(raw, activityType) {
  if (raw === null || typeof raw !== 'object') return null
  const timeTakenSec = raw.timeTakenSec
  if (
    timeTakenSec !== undefined &&
    (typeof timeTakenSec !== 'number' || !Number.isFinite(timeTakenSec) || timeTakenSec < 0)
  ) {
    throw engineError.scoringInvalid(activityType, '`timeTakenSec` must be a non-negative number')
  }
  return Object.freeze({
    attemptsUsed: nonNegativeInt(raw.attemptsUsed, 1, activityType, 'interactionMetrics.attemptsUsed'),
    hintsUsed: nonNegativeInt(raw.hintsUsed, 0, activityType, 'interactionMetrics.hintsUsed'),
    timeTakenSec: timeTakenSec ?? null,
    reducedMotion: raw.reducedMotion === true,
  })
}
