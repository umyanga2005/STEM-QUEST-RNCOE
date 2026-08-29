/**
 * Game Engine — 3-of-100 question selection (Task 4.3, D-022; design doc
 * `05-activity-engine-design.md` §8).
 *
 * Server-side only. Selects exactly 3 questions for a (stream, level) using a
 * seeded PRNG so the same seed + same pool + same constraints always yield
 * the same selection. Diversity is strict (one per distinct activity type
 * while possible); repeat avoidance excludes the last-5-sessions question ids
 * only while that still leaves enough candidates; fills allow same-type
 * repeats when fewer than 3 types exist; the round order is shuffled last.
 *
 * This module deliberately knows nothing about Activity Engine plugins: it
 * works on plain question objects and returns their ids.
 */

import { createSeededRng, shuffle, pickOne } from './prng.js'
import { gameError } from './errors.js'

export const QUESTIONS_PER_SESSION = 3

/**
 * @typedef {object} SelectionQuestion
 * @property {string} id
 * @property {string} streamId
 * @property {string} levelId
 * @property {string} activityType
 * @property {string} [prompt] - used to avoid duplicate prompts within a round (P3-007)
 */

/**
 * @typedef {object} SelectionInput
 * @property {string} streamId
 * @property {string} levelId
 * @property {string} studentId
 * @property {string} seed - session seed (generator: generateSessionSeed)
 * @property {SelectionQuestion[]} questionPool - eligible questions for
 *   (stream, level); special-access grants are already merged by the caller
 * @property {string[]} [recentQuestionIds] - ids the student saw in the last
 *   5 sessions, to avoid repeating
 * @property {number} [count] - default 3
 */

/**
 * @typedef {object} SelectionResult
 * @property {string[]} questionIds - exactly 3, in round order
 * @property {string} seed
 */

/**
 * Selects exactly 3 questions per D-022 §8.
 * @param {SelectionInput} input
 * @returns {SelectionResult}
 * @throws {GameEngineError} GAME_INSUFFICIENT_POOL when fewer than `count`
 *   eligible questions exist
 */
export function selectRoundQuestions({
  streamId,
  levelId,
  studentId,
  seed,
  questionPool = [],
  recentQuestionIds = [],
  count = QUESTIONS_PER_SESSION,
}) {
  const pool = questionPool.filter(
    (q) => q && q.streamId === streamId && q.levelId === levelId
  )
  if (pool.length < count) {
    throw gameError.insufficientPool(streamId, levelId, pool.length)
  }

  const rng = createSeededRng(seed)
  const recent = new Set(Array.isArray(recentQuestionIds) ? recentQuestionIds : [])
  const remaining = pool.slice()
  const chosen = []

  /** Excludes recent ids, but falls back to the full group if that would
   * empty it — repeat avoidance never blocks the level (§8). Also excludes
   * questions whose prompt text duplicates one already chosen for this
   * round (FIX: P3-007), with the same never-block-the-level fallback. */
  const candidates = (qs) => {
    const nonRecent = qs.filter((q) => !recent.has(q.id))
    const afterRecent = nonRecent.length > 0 ? nonRecent : qs
    const usedPrompts = new Set(chosen.map((q) => q.prompt).filter(Boolean))
    const nonDuplicatePrompt =
      usedPrompts.size > 0 ? afterRecent.filter((q) => !usedPrompts.has(q.prompt)) : afterRecent
    return nonDuplicatePrompt.length > 0 ? nonDuplicatePrompt : afterRecent
  }

  // 1) Diversity pass: one per distinct activity type, in shuffled type
  //    order, until we have 3.
  const types = shuffle([...new Set(pool.map((q) => q.activityType))], rng)
  for (const type of types) {
    if (chosen.length >= count) break
    const group = candidates(remaining.filter((q) => q.activityType === type))
    if (group.length === 0) continue
    const pick = pickOne(group, rng)
    chosen.push(pick)
    remaining.splice(remaining.indexOf(pick), 1)
  }

  // 2) Fill pass: only needed when fewer than `count` distinct types exist.
  while (chosen.length < count) {
    const fill = candidates(remaining)
    if (fill.length === 0) {
      throw gameError.insufficientPool(streamId, levelId, pool.length)
    }
    const pick = pickOne(fill, rng)
    chosen.push(pick)
    remaining.splice(remaining.indexOf(pick), 1)
  }

  // 3) Round order shuffle.
  shuffle(chosen, rng)

  return {
    questionIds: chosen.map((q) => q.id),
    seed: String(seed),
    studentId,
    streamId,
    levelId,
  }
}

export default {
  selectRoundQuestions,
  QUESTIONS_PER_SESSION,
}
