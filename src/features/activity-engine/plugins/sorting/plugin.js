/**
 * Activity Engine — sorting plugin (Task 4.7).
 *
 * The fourth production activity plugin. Implements the 7-method plugin
 * contract for the `sorting` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.items[]       — 3..12 item cards (id, label, image, ariaLabel)
 *   - payload.categories[]  — 2..5 category cards (id, label, image, ariaLabel)
 *   - payload.shuffle       — item display order is shuffled when true
 *   - correctAnswer.assignments[] — every item mapped to exactly one category
 *                               { itemId, categoryId } (server-only)
 *
 * Sorting is CLASSIFICATION: the student places each item into its category.
 * Partial credit = correct assignments ÷ total items (D-047). The submitted
 * response is `{ assignments: [{ itemId, categoryId }] }` — the exact
 * schema-compatible shape `buildResponse` emits.
 *
 * Security: correct-answer data never reaches the render path. `render` builds
 * a client-safe descriptor (item chips + category targets + shuffle flag) and
 * never reads the correct-answer document. `correctAnswer.assignments` only
 * flows through `validateAnswer` (server-only), where the semantic port of the
 * catalog rule `sorting.assignments-cover-items` also runs.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (sorting). This is the catalog rule
 * `sorting.assignments-cover-items`: every payload item must be assigned to
 * exactly one existing category. It needs both documents, so it runs
 * server-side (in `validateAnswer`) and is also exposed here for authoring
 * tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateAssignments(payload, correctAnswer) {
  const errors = []
  const items = Array.isArray(payload?.items) ? payload.items : []
  const categories = Array.isArray(payload?.categories) ? payload.categories : []
  const assignments = Array.isArray(correctAnswer?.assignments) ? correctAnswer.assignments : []

  const itemIds = new Set(items.map((item) => item.id))
  const categoryIds = new Set(categories.map((category) => category.id))

  const seen = new Set()
  for (const assignment of assignments) {
    const { itemId, categoryId } = assignment ?? {}
    if (itemId === undefined || itemId === null) continue
    if (seen.has(itemId)) {
      errors.push({
        ruleId: 'sorting.assignments-cover-items',
        message: `item "${itemId}" is assigned more than once`,
        path: '/assignments',
      })
    }
    seen.add(itemId)
    if (!categoryIds.has(categoryId)) {
      errors.push({
        ruleId: 'sorting.assignments-cover-items',
        message: `assignment for item "${itemId}" references unknown category "${categoryId}"`,
        path: '/assignments',
      })
    }
  }
  for (const itemId of itemIds) {
    if (!seen.has(itemId)) {
      errors.push({
        ruleId: 'sorting.assignments-cover-items',
        message: `item "${itemId}" has no assignment`,
        path: '/assignments',
      })
    }
  }
  return errors
}

/**
 * Payload-only semantic rules (authoring-time). The JSON Schema's
 * `uniqueItems` is pure deep-equality, so two cards sharing an id with
 * different labels pass it; item/category id collisions would make an
 * assignment ambiguous. These catch that meaning.
 */
const semanticRules = [
  createSemanticRule('sorting.item-ids-unique', (payload) => {
    const ids = payload.items.map((item) => item.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'item ids must be unique', path: '/items' }
  }),
  createSemanticRule('sorting.category-ids-unique', (payload) => {
    const ids = payload.categories.map((category) => category.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'category ids must be unique', path: '/categories' }
  }),
  createSemanticRule('sorting.item-category-ids-disjoint', (payload) => {
    const itemIds = new Set(payload.items.map((item) => item.id))
    const categoryIds = new Set(payload.categories.map((category) => category.id))
    const overlap = [...itemIds].filter((id) => categoryIds.has(id))
    return overlap.length === 0
      ? true
      : { message: `item and category ids must not overlap: ${overlap.join(', ')}`, path: '/' }
  }),
]

/** Fisher–Yates shuffle. Used only when the payload opts in (shuffle). */
function shuffle(list) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function itemView(item) {
  return Object.freeze({
    id: item.id,
    label: typeof item.label === 'string' ? item.label : '',
    image: item.image ?? null,
    ariaLabel: item.ariaLabel ?? item.label ?? item.id,
  })
}

export const sortingPlugin = {
  type: 'sorting',
  name: 'Sorting',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data — the
   * expected assignments (`correctAnswer.assignments`) are never read here.
   * The descriptor carries the item chips (optionally shuffled) and the
   * category targets.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}

    const items = Array.isArray(payload.items) ? payload.items : []
    const categories = Array.isArray(payload.categories) ? payload.categories : []
    const shuffleOn = payload.shuffle !== false

    return Object.freeze({
      kind: 'sorting',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      shuffle: shuffleOn,
      items: Object.freeze((shuffleOn ? shuffle(items) : items).map(itemView)),
      categories: Object.freeze(categories.map(itemView)),
    })
  },

  /**
   * Authoring-time payload validation (schema layer runs first in the engine).
   * @returns {{ valid: boolean, errors: Array<object> }}
   */
  validatePayload(payload) {
    return applySemanticRules(semanticRules, payload)
  },

  /**
   * Server-only correctness evaluation.
   *
   * Authoring-path failures (an inconsistent payload↔correctAnswer pair) throw
   * `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`; those are author bugs, never student
   * mistakes. A student submission must be a complete assignment set — every
   * payload item assigned to exactly one existing category. Duplicate,
   * unknown, missing, or malformed assignments are rejected before scoring so
   * a truncated/forged response can never inflate partial credit.
   *
   * @param {{ submission, payload, correctAnswer }} ctx
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError} on authoring-integrity or submission-shape failure
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateAssignments(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('sorting', integrity)
    }

    const response = submission.response ?? {}
    const rawAssignments = response.assignments
    if (!Array.isArray(rawAssignments)) {
      throw engineError.answerInvalid('sorting', '`response.assignments` must be an array')
    }
    if (!rawAssignments.every((a) => a && typeof a.itemId === 'string' && typeof a.categoryId === 'string')) {
      throw engineError.answerInvalid(
        'sorting',
        '`response.assignments` must be an array of { itemId, categoryId }'
      )
    }

    const itemIds = payload.items.map((item) => item.id)
    const knownItems = new Set(itemIds)
    const knownCategories = new Set(payload.categories.map((category) => category.id))

    const seen = new Set()
    const submittedCategoryByItem = new Map()
    for (const a of rawAssignments) {
      if (!knownItems.has(a.itemId)) {
        throw engineError.answerInvalid('sorting', `unknown item id "${a.itemId}" in assignment`)
      }
      if (!knownCategories.has(a.categoryId)) {
        throw engineError.answerInvalid('sorting', `unknown category id "${a.categoryId}" in assignment`)
      }
      if (seen.has(a.itemId)) {
        throw engineError.answerInvalid('sorting', `item "${a.itemId}" assigned more than once`)
      }
      seen.add(a.itemId)
      submittedCategoryByItem.set(a.itemId, a.categoryId)
    }

    // A complete assignment set must cover every item exactly once; fewer
    // entries means missing assignments (a truncated response would inflate
    // the partial-credit denominator otherwise).
    for (const itemId of itemIds) {
      if (!seen.has(itemId)) {
        throw engineError.answerInvalid('sorting', `missing required assignment for item "${itemId}"`)
      }
    }

    const correctCategoryByItem = new Map(
      correctAnswer.assignments.map((a) => [a.itemId, a.categoryId])
    )
    const results = itemIds.map((itemId) => {
      const categoryId = submittedCategoryByItem.get(itemId)
      return Object.freeze({
        itemId,
        categoryId,
        correct: categoryId === correctCategoryByItem.get(itemId),
      })
    })
    const correctCount = results.filter((r) => r.correct).length

    return {
      correct: correctCount === results.length && results.length > 0,
      detail: Object.freeze({
        total: results.length,
        correctCount,
        assignments: Object.freeze(results),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct assignments ÷ total items
   * (D-047). The engine guards the fraction; the central scoring service does
   * the arithmetic. The per-item evidence (itemId, submitted category,
   * correctness) never carries the expected category for incorrect items.
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
      evidence: detail?.assignments ?? null,
    }
  },

  /** Authored, progressive hints — never derived from the correct answer. */
  buildHints(question) {
    const hints = Array.isArray(question?.hints) ? question.hints : []
    return hints.map((hint, index) => ({
      id: `hint-${index + 1}`,
      level: typeof hint.level === 'number' && hint.level >= 1 ? hint.level : index + 1,
      text: typeof hint.text === 'string' ? hint.text : '',
    }))
  },

  /** Learning-oriented feedback; never reveals the expected assignments. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you sorted every item.',
        explanation: 'Time pressure can make classifying harder.',
        guidance: 'Sort the items you are sure about first, then reconsider the rest.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Everything in the right group',
        message: 'Every item is in the correct group.',
        explanation: 'Each item is classified the way the question expects.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} items are in the correct group.`,
        explanation: 'Some items are placed in the wrong group.',
        guidance: 'Re-read each group label and think about what property the misplaced items share.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'Try reviewing the groups and their clues.',
      explanation: 'None of the items are in the right group yet.',
      guidance: 'Look for the clue in the question, then place each item into the group it best fits.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['sorting'] = false`. Sorting
   * works by tapping an item then a group, and by keyboard, so voice-only
   * devices are still offered it (no pointer dragging is required).
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['sorting'] === false) return false
    return true
  },
}

/**
 * Registers the sorting plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerSorting(engine) {
  return engine.register(sortingPlugin)
}

export default sortingPlugin
