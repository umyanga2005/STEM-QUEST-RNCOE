/**
 * Activity Engine — find-word plugin (Task 9).
 *
 * Implements the 7-method plugin contract for the `find-word` activity type
 * (letter-grid word search) against the payload/correct-answer schemas in
 * `schemas/activities/find-word/`.
 *
 * Domain model:
 *   - payload.grid           — rows of single-letter cells (client-safe)
 *   - payload.words[]        — { id, label } (labels are shown to the student
 *                               up front — this is a search game, not a
 *                               guessing game)
 *   - payload.allowRetry     — whether the student may clear a wrong
 *                               selection and try again (client-only hint)
 *   - correctAnswer.placements[] — { wordId, startRow, startCol, endRow,
 *                               endCol } straight-line coordinates, SERVER-ONLY
 *
 * Submission shape: `{ selections: [{ wordId, startRow, startCol, endRow,
 * endCol }] }`. Partial credit = correct words found ÷ total words (same
 * honest-denominator principle as fill-complete/D-055): an incomplete
 * submission scores whatever it legitimately found, never more.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'
import { validateFindWordAnswer, scoreSelections } from './find-word-controller.js'

const semanticRules = [
  createSemanticRule('find-word.grid-rows-consistent', (payload) => {
    const width = payload.grid[0]?.length ?? 0
    return payload.grid.every((row) => row.length === width)
      ? true
      : { message: 'every grid row must have the same number of cells', path: '/grid' }
  }),
  createSemanticRule('find-word.word-ids-unique', (payload) => {
    const ids = payload.words.map((w) => w.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'word ids must be unique', path: '/words' }
  }),
]

export const findWordPlugin = {
  type: 'find-word',
  name: 'Find the Word',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never reads `correctAnswer` — the grid
   * and word list are the entire student-visible surface; placements stay
   * server-only.
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}
    const grid = Array.isArray(payload.grid) ? payload.grid : []
    const words = Array.isArray(payload.words) ? payload.words : []

    return Object.freeze({
      kind: 'find-word',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      grid: Object.freeze(grid.map((row) => Object.freeze([...row]))),
      words: Object.freeze(words.map((w) => Object.freeze({ id: w.id, label: w.label }))),
      allowRetry: payload.allowRetry !== false,
    })
  },

  /** Authoring-time payload validation (schema layer runs first in the engine). */
  validatePayload(payload) {
    return applySemanticRules(semanticRules, payload)
  },

  /**
   * Server-only correctness evaluation. An inconsistent payload↔correctAnswer
   * pair is an authoring bug (`ACTIVITY_PAYLOAD_SEMANTIC_INVALID`), never a
   * student mistake. A malformed submission shape is rejected before scoring.
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateFindWordAnswer(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('find-word', integrity)
    }

    const response = submission.response ?? {}
    const rawSelections = response.selections
    if (!Array.isArray(rawSelections)) {
      throw engineError.answerInvalid('find-word', '`response.selections` must be an array')
    }
    const wordIds = new Set(payload.words.map((w) => w.id))
    const seen = new Set()
    for (const sel of rawSelections) {
      if (
        !sel ||
        typeof sel.wordId !== 'string' ||
        !Number.isInteger(sel.startRow) ||
        !Number.isInteger(sel.startCol) ||
        !Number.isInteger(sel.endRow) ||
        !Number.isInteger(sel.endCol)
      ) {
        throw engineError.answerInvalid(
          'find-word',
          '`response.selections` must be an array of { wordId, startRow, startCol, endRow, endCol }'
        )
      }
      if (!wordIds.has(sel.wordId)) {
        throw engineError.answerInvalid('find-word', `unknown word id "${sel.wordId}"`)
      }
      if (seen.has(sel.wordId)) {
        throw engineError.answerInvalid('find-word', `word "${sel.wordId}" submitted more than once`)
      }
      seen.add(sel.wordId)
    }

    const { total, correctCount, results } = scoreSelections(payload, correctAnswer, rawSelections)
    return {
      correct: correctCount === total && total > 0,
      detail: Object.freeze({ total, correctCount, words: results }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct words ÷ total words — the
   * denominator is always the full word list, so an incomplete search never
   * scores higher than what was actually found.
   */
  scoringInputs(ctx, validation) {
    const detail = validation.detail
    const total = detail?.total ?? 0
    const correctCount = detail?.correctCount ?? 0
    const metrics = ctx.submission.interactionMetrics
    return {
      correctnessFraction: total > 0 ? correctCount / total : 0,
      scorableUnits: total,
      correctUnits: correctCount,
      attemptsUsed: metrics.attemptsUsed,
      hintsUsed: metrics.hintsUsed,
      interactionMetrics: metrics,
      evidence: detail?.words ?? null,
    }
  },

  /** Authored, progressive hints — never derived from word placements. */
  buildHints(question) {
    const hints = Array.isArray(question?.hints) ? question.hints : []
    return hints.map((hint, index) => ({
      id: `hint-${index + 1}`,
      level: typeof hint.level === 'number' && hint.level >= 1 ? hint.level : index + 1,
      text: typeof hint.text === 'string' ? hint.text : '',
    }))
  },

  /** Learning-oriented feedback; never reveals unfound placements. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you found every word.',
        explanation: 'Scanning a full grid under time pressure is hard.',
        guidance: 'Try scanning row by row first, then check diagonals.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Every word found',
        message: 'You found every hidden word in the grid.',
        explanation: 'Each selection traced a real word from the list.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} words found.`,
        explanation: 'Some words on the list are still hidden in the grid.',
        guidance: 'Check horizontal, vertical and diagonal lines you have not tried yet.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'None of the words were found yet.',
      explanation: 'None of your selections matched a word on the list.',
      guidance: 'Start from a letter that matches the first letter of a word, then scan outward.',
    }
  },

  /**
   * Availability decision. Tap-to-select is the core interaction (no drag
   * dependency), so it is available broadly by default.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['find-word'] === false) return false
    return true
  },
}

export function registerFindWord(engine) {
  return engine.register(findWordPlugin)
}

export default findWordPlugin
