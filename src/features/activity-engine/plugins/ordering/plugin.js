/**
 * Activity Engine — ordering plugin (Task 4.6).
 *
 * The third production activity plugin. Implements the 7-method plugin
 * contract for the `ordering` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.items[]          — 3..8 item cards (id, label, image, ariaLabel)
 *   - payload.anchors[]        — optional (max 3) locked positions
 *                               { position, itemId } (gameplay locks)
 *   - payload.shuffle          — display order is server-shuffled when true
 *   - correctAnswer.order[]    — the expected sequence: a complete permutation
 *                               of payload item ids (server-only)
 *
 * Ordering is SEQUENCE CONSTRUCTION, not rank assignment: the student builds an
 * ordered sequence and per-position credit is awarded. The position itself is
 * the rank — there is no separate "rank" field, and no score fields live in the
 * answer document.
 *
 * Security: correct-answer data never reaches the render path. `render` builds
 * a client-safe descriptor (a display order, locked anchors, shuffle flag) and
 * never reads the correct-answer document. `correctAnswer.order` only flows
 * through `validateAnswer` (server-only), where the semantic port of the
 * catalog rule `ordering.order-permutation` also runs.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (ordering). This is the catalog rule
 * `ordering.order-permutation`: the expected sequence must be a complete
 * permutation of the payload item ids and must agree with every anchored
 * position. It needs both documents, so it runs server-side (in
 * `validateAnswer`) and is also exposed here for authoring tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateSequence(payload, correctAnswer) {
  const errors = []
  const items = Array.isArray(payload?.items) ? payload.items : []
  const itemIds = items.map((item) => item.id)
  const order = Array.isArray(correctAnswer?.order) ? correctAnswer.order : []

  const seen = new Set()
  for (const id of order) {
    if (id === undefined || id === null) continue
    if (seen.has(id)) {
      errors.push({
        ruleId: 'ordering.order-permutation',
        message: `order has a duplicate id "${id}"`,
        path: '/order',
      })
    }
    seen.add(id)
  }

  const known = new Set(itemIds)
  for (const id of order) {
    if (!known.has(id)) {
      errors.push({
        ruleId: 'ordering.order-permutation',
        message: `order references unknown item id "${id}"`,
        path: '/order',
      })
    }
  }
  for (const id of itemIds) {
    if (!seen.has(id)) {
      errors.push({
        ruleId: 'ordering.order-permutation',
        message: `item "${id}" is missing from the order`,
        path: '/order',
      })
    }
  }

  for (const anchor of payload.anchors ?? []) {
    const { position, itemId } = anchor ?? {}
    if (order[position] !== itemId) {
      errors.push({
        ruleId: 'ordering.order-permutation',
        message: `anchored position ${position} must hold item "${itemId}"`,
        path: '/anchors',
      })
    }
  }
  return errors
}

/**
 * Payload-only semantic rules (authoring-time). Ordering is a sequence of item
 * ids, so ids must be unique by value, and anchors must reference real items at
 * valid, distinct positions. With shuffle enabled, anchored positions are
 * excluded from the shuffled pool — a fully-anchored sequence has nothing left
 * to shuffle (a degenerate configuration the author should fix).
 */
const semanticRules = [
  createSemanticRule('ordering.item-ids-unique', (payload) => {
    const ids = payload.items.map((item) => item.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'item ids must be unique', path: '/items' }
  }),
  createSemanticRule('ordering.anchor-positions-in-range', (payload) => {
    const count = payload.items.length
    const bad = (payload.anchors ?? []).filter(
      (a) => a.position < 0 || a.position >= count
    )
    return bad.length === 0
      ? true
      : { message: 'anchor positions must be valid indexes within the items array', path: '/anchors' }
  }),
  createSemanticRule('ordering.anchor-ids-exist', (payload) => {
    const known = new Set(payload.items.map((item) => item.id))
    const bad = (payload.anchors ?? []).filter((a) => !known.has(a.itemId))
    return bad.length === 0
      ? true
      : { message: 'every anchor itemId must reference an existing item', path: '/anchors' }
  }),
  createSemanticRule('ordering.anchor-positions-unique', (payload) => {
    const positions = (payload.anchors ?? []).map((a) => a.position)
    return new Set(positions).size === positions.length
      ? true
      : { message: 'anchor positions must be distinct', path: '/anchors' }
  }),
  createSemanticRule('ordering.anchor-items-distinct', (payload) => {
    const itemIds = (payload.anchors ?? []).map((a) => a.itemId)
    return new Set(itemIds).size === itemIds.length
      ? true
      : { message: 'an item cannot be anchored in more than one position', path: '/anchors' }
  }),
  createSemanticRule('ordering.shuffle-excludes-anchors', (payload) => {
    const anchors = payload.anchors ?? []
    if (payload.shuffle === false || anchors.length === 0) return true
    if (anchors.length >= payload.items.length) {
      return {
        message: 'shuffle is enabled but every position is anchored — nothing can be shuffled',
        path: '/anchors',
      }
    }
    return true
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

function itemView(item, anchored) {
  return Object.freeze({
    id: item.id,
    label: typeof item.label === 'string' ? item.label : '',
    image: item.image ?? null,
    ariaLabel: item.ariaLabel ?? item.label ?? item.id,
    anchored,
  })
}

/**
 * Builds the initial display order. Anchors are ALWAYS honoured: anchored
 * itemIds stay at their locked positions and are excluded from any shuffle.
 * When `shuffle` is enabled only the free (non-anchored) positions are
 * re-ordered.
 */
function buildDisplayOrder(payload, shuffleOn) {
  const items = Array.isArray(payload.items) ? payload.items : []
  const anchors = Array.isArray(payload.anchors) ? payload.anchors : []

  const freeItems = items.filter(
    (item) => !anchors.some((a) => a.itemId === item.id)
  )
  const orderedFree = shuffleOn ? shuffle(freeItems) : freeItems
  const anchorMap = new Map(anchors.map((a) => [a.position, a.itemId]))

  const result = []
  let freeIndex = 0
  for (let position = 0; position < items.length; position += 1) {
    const anchoredId = anchorMap.get(position)
    if (anchoredId !== undefined) {
      result.push(items.find((item) => item.id === anchoredId))
    } else {
      result.push(orderedFree[freeIndex])
      freeIndex += 1
    }
  }
  return result.filter(Boolean)
}

export const orderingPlugin = {
  type: 'ordering',
  name: 'Ordering',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data — the
   * expected sequence (`correctAnswer.order`) is never read here. The descriptor
   * carries the display order (anchors pinned, free positions optionally
   * shuffled), the anchor locks, and the shuffle configuration.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}
    const shuffleOn = payload.shuffle !== false

    const display = buildDisplayOrder(payload, shuffleOn)
    const anchoredIds = new Set(
      (Array.isArray(payload.anchors) ? payload.anchors : []).map((a) => a.itemId)
    )

    return Object.freeze({
      kind: 'ordering',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      shuffle: shuffleOn,
      items: Object.freeze(
        display.map((item) => itemView(item, anchoredIds.has(item.id)))
      ),
      anchors: Object.freeze(
        (Array.isArray(payload.anchors) ? payload.anchors : []).map((a) =>
          Object.freeze({ position: a.position, itemId: a.itemId })
        )
      ),
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
   * mistakes. A student submission must be an exact permutation of the payload
   * item ids (duplicate / missing / unknown / malformed / incomplete orders are
   * rejected before scoring). Anchors are gameplay locks: a submitted order
   * that does not honour an anchor is simply scored incorrect at that position
   * — it is never treated as an authoring error.
   *
   * @param {{ submission, payload, correctAnswer }} ctx
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError} on authoring-integrity or submission-shape failure
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateSequence(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('ordering', integrity)
    }

    const response = submission.response ?? {}
    const rawOrder = response.order
    if (!Array.isArray(rawOrder)) {
      throw engineError.answerInvalid('ordering', '`response.order` must be an array')
    }
    if (!rawOrder.every((id) => typeof id === 'string')) {
      throw engineError.answerInvalid('ordering', '`response.order` must be an array of item id strings')
    }

    const itemIds = payload.items.map((item) => item.id)
    const known = new Set(itemIds)

    const seen = new Set()
    for (const id of rawOrder) {
      if (seen.has(id)) {
        throw engineError.answerInvalid('ordering', `submitted order contains duplicate id "${id}"`)
      }
      seen.add(id)
      if (!known.has(id)) {
        throw engineError.answerInvalid('ordering', `unknown item id "${id}" in submitted order`)
      }
    }

    // A complete permutation must contain every item exactly once; fewer items
    // means missing ids, more means unknown ids (both already covered above).
    if (rawOrder.length !== itemIds.length) {
      throw engineError.answerInvalid('ordering', 'submitted order must include every item exactly once (complete permutation)')
    }

    const expected = correctAnswer.order
    const results = rawOrder.map((itemId, index) =>
      Object.freeze({ index, correct: itemId === expected[index] })
    )
    const correctCount = results.filter((r) => r.correct).length

    return {
      correct: correctCount === results.length && results.length > 0,
      detail: Object.freeze({
        total: results.length,
        correctCount,
        positions: Object.freeze(results),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct positions ÷ total positions
   * (D-047). The engine guards the fraction; the central scoring service does
   * the arithmetic. The position detail is safe (index + correctness) and
   * never carries the expected item ids.
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
      evidence: detail?.positions ?? null,
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

  /** Learning-oriented feedback; never reveals the correct sequence. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you finished the sequence.',
        explanation: 'Time pressure can make ordering harder.',
        guidance: 'Slow down, read the items, and lock the ones you are sure about first.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'In the right order',
        message: 'In the right order.',
        explanation: 'Every step in your sequence is positioned correctly.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} steps are in the correct position.`,
        explanation: 'Some steps are positioned differently to the expected sequence.',
        guidance: 'Think about the clue in the question and which step must come before which.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'Try reviewing the sequence and ordering clues.',
      explanation: 'Re-read the prompt and think about the relationship between the steps.',
      guidance: 'Look for the clue that tells you which step starts the sequence, then order the rest.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['ordering'] = false`. Ordering
   * works with pointer drag, tap-select, and keyboard (Up/Down), so it is also
   * offered on voice-only devices. No grade restriction is hard-coded —
   * availability is a deployment concern, not a LEVEL/GRADE concern.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['ordering'] === false) return false
    return true
  },
}

/**
 * Registers the ordering plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerOrdering(engine) {
  return engine.register(orderingPlugin)
}

export default orderingPlugin