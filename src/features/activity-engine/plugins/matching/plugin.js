/**
 * Activity Engine — matching plugin (Task 4.5).
 *
 * The second production activity plugin. Implements the 7-method plugin
 * contract for the `matching` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json, which allows
 * shared targets and renders distractors non-scorable).
 *
 * Security: the plugin never emits correct-answer data. `render` builds a
 * client-safe descriptor (left cards + a merged, shuffled target pool so the
 * client cannot tell legitimate targets from distractors); the correct-answer
 * document only flows through `validateAnswer` (server-only), and the semantic
 * port of the catalog's cross-document pairing rules runs there — where both
 * documents exist.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (matching). These are the catalog rules
 * `matching.pairs-cover-left` and `matching.pair-right-exists`. They need both
 * the payload and the correct-answer document, so they run server-side (in
 * `validateAnswer`) and are also exposed here for authoring tooling/tests.
 *
 * Rules enforced:
 *  - every left item appears in `correctAnswer.pairs` exactly once
 *  - every `rightId` in the pairs references an id that exists in
 *    `payload.rightItems` — never a distractor, which matches nothing
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validatePairs(payload, correctAnswer) {
  const errors = []
  const leftIds = Array.isArray(payload?.leftItems) ? payload.leftItems.map((card) => card.id) : []
  const rightItems = Array.isArray(payload?.rightItems) ? payload.rightItems : []
  const pairs = Array.isArray(correctAnswer?.pairs) ? correctAnswer.pairs : []

  const rightItemIds = new Set(rightItems.map((card) => card.id))
  const seen = new Set()
  for (const pair of pairs) {
    const { leftId, rightId } = pair ?? {}
    if (leftId === undefined || leftId === null) continue
    if (seen.has(leftId)) {
      errors.push({
        ruleId: 'matching.pairs-cover-left',
        message: `left item "${leftId}" is paired more than once`,
        path: '/pairs',
      })
    }
    seen.add(leftId)
    if (!rightItemIds.has(rightId)) {
      errors.push({
        ruleId: 'matching.pair-right-exists',
        message: `pair for left item "${leftId}" references unknown right item "${rightId}" (distractors never match)`,
        path: '/pairs',
      })
    }
  }
  for (const leftId of leftIds) {
    if (!seen.has(leftId)) {
      errors.push({
        ruleId: 'matching.pairs-cover-left',
        message: `left item "${leftId}" has no pair`,
        path: '/pairs',
      })
    }
  }
  return errors
}

/**
 * Payload-only semantic rules (authoring-time). Matching cards are matched by
 * id, so ids must be unique within every card set and disjoint across the
 * three sets — otherwise a pairing (or the payload itself) becomes
 * ambiguous. These are meaning the JSON Schema cannot fully express (its id
 * uniqueness checks are pure deep-equality).
 */
const semanticRules = [
  createSemanticRule('matching.left-ids-unique', (payload) => {
    const ids = payload.leftItems.map((card) => card.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'left item ids must be unique', path: '/leftItems' }
  }),
  createSemanticRule('matching.right-ids-unique', (payload) => {
    const ids = payload.rightItems.map((card) => card.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'right item ids must be unique', path: '/rightItems' }
  }),
  createSemanticRule('matching.distractor-ids-unique', (payload) => {
    const ids = (payload.distractors ?? []).map((card) => card.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'distractor ids must be unique', path: '/distractors' }
  }),
  createSemanticRule('matching.card-ids-disjoint', (payload) => {
    const distractorsList = payload.distractors ?? []
    const left = new Set(payload.leftItems.map((card) => card.id))
    const right = new Set(payload.rightItems.map((card) => card.id))
    const distractors = new Set(distractorsList.map((card) => card.id))
    const overlap = [...payload.leftItems, ...payload.rightItems, ...distractorsList]
      .map((card) => card.id)
      .filter((id) => left.has(id) && (right.has(id) || distractors.has(id)))
    return new Set(overlap).size === 0
      ? true
      : { message: `card ids must be disjoint across left/right/distractor sets: ${[...new Set(overlap)].join(', ')}`, path: '/' }
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

function cardView(card) {
  return Object.freeze({
    id: card.id,
    text: typeof card.text === 'string' ? card.text : '',
    image: card.image ?? null,
    ariaLabel: card.ariaLabel ?? card.text ?? card.id,
  })
}

export const matchingPlugin = {
  type: 'matching',
  name: 'Matching',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data.
   * Distractors are merged with the right items and shuffled together so the
   * client cannot distinguish decoys from real targets.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}

    const leftItems = Array.isArray(payload.leftItems) ? payload.leftItems : []
    const rightItems = Array.isArray(payload.rightItems) ? payload.rightItems : []
    const distractors = Array.isArray(payload.distractors) ? payload.distractors : []
    const shuffleOn = payload.shuffle !== false

    const displayLeft = shuffleOn ? shuffle(leftItems) : leftItems
    const targets = shuffleOn ? shuffle([...rightItems, ...distractors]) : [...rightItems, ...distractors]

    return Object.freeze({
      kind: 'matching',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      enableShuffle: shuffleOn,
      allowRetry: payload.allowRetry !== false,
      leftItems: Object.freeze(displayLeft.map(cardView)),
      targets: Object.freeze(targets.map(cardView)),
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
   * @param {{ submission, payload, correctAnswer }} ctx
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError} on authoring-integrity or submission-shape failure
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validatePairs(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('matching', integrity)
    }

    const response = submission.response ?? {}
    const rawConnections = response.connections
    const hasConnections = rawConnections !== undefined && rawConnections !== null
    if (hasConnections && !Array.isArray(rawConnections)) {
      throw engineError.answerInvalid('matching', '`response.connections` must be an array')
    }
    const connections = hasConnections
      ? rawConnections.filter((c) => c && typeof c.leftId === 'string' && typeof c.rightId === 'string')
      : []
    if (hasConnections && !rawConnections.every((c) => c && typeof c.leftId === 'string' && typeof c.rightId === 'string')) {
      throw engineError.answerInvalid(
        'matching',
        '`response.connections` must be an array of elements with string `leftId` and `rightId`'
      )
    }

    const leftCardIds = payload.leftItems.map((card) => card.id)
    const knownLeft = new Set(leftCardIds)
    const distractorIds = Array.isArray(payload.distractors) ? payload.distractors.map((card) => card.id) : []
    const knownRight = new Set([
      ...payload.rightItems.map((card) => card.id),
      ...distractorIds,
    ])

    for (const c of connections) {
      if (!knownLeft.has(c.leftId)) {
        throw engineError.answerInvalid('matching', `unknown left item id "${c.leftId}" in connection`)
      }
      if (!knownRight.has(c.rightId)) {
        throw engineError.answerInvalid('matching', `invalid target id "${c.rightId}" in connection`)
      }
    }

    // Dedupe normalization on duplicate connection records, preserving
    // semantic results (an exact duplicate record adds no information).
    const seenRecords = new Set()
    const submittedRightByLeft = new Map()
    for (const c of connections) {
      const key = `${c.leftId}\u0000${c.rightId}`
      if (seenRecords.has(key)) continue
      seenRecords.add(key)
      if (submittedRightByLeft.has(c.leftId)) {
        throw engineError.answerInvalid('matching', `left item "${c.leftId}" connected more than once`)
      }
      submittedRightByLeft.set(c.leftId, c.rightId)
    }

    // Every left card must be matched — a missing required match is not a
    // valid submission (a truncated/knowledge-gapped response would inflate
    // the score otherwise).
    for (const leftId of leftCardIds) {
      if (!submittedRightByLeft.has(leftId)) {
        throw engineError.answerInvalid('matching', `missing required match for left item "${leftId}"`)
      }
    }

    const correctRightByLeft = new Map(correctAnswer.pairs.map((p) => [p.leftId, p.rightId]))
    const results = leftCardIds.map((leftId) => {
      const rightId = submittedRightByLeft.get(leftId)
      return Object.freeze({
        leftId,
        rightId,
        correct: rightId === correctRightByLeft.get(leftId),
      })
    })
    const correctCount = results.filter((r) => r.correct).length

    return {
      correct: correctCount === results.length && results.length > 0,
      detail: Object.freeze({
        total: results.length,
        correctCount,
        connections: Object.freeze(results),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct pairs ÷ total left items
   * (D-047). The engine guards the fraction; the central scoring service does
   * the arithmetic.
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
      evidence: detail?.connections ?? null,
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

  /** Learning-oriented feedback; never reveals the correct pairs. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you could connect every card.',
        explanation: 'Time pressure can make matching harder.',
        guidance: 'Slow down, read both columns, and connect the cards you are sure about first.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'All connected',
        message: 'Every card is in the right place.',
        explanation: 'Your pairings match the expected relationships.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} cards are matched correctly.`,
        explanation: 'Some pairs connect to the wrong target.',
        guidance: 'Re-read each card and think about the relationship it describes on its own.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'None of the cards are matched correctly.',
      explanation: 'Compare each card on the left with the ideas on the right.',
      guidance: 'Match each card to the target it best pairs with, then try again.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['matching'] = false`. Matching
   * works with pointer, touch, and keyboard — including on voice-only
   * devices, where cards can be matched by name instead of dragged.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['matching'] === false) return false
    return true
  },
}

/**
 * Registers the matching plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerMatching(engine) {
  return engine.register(matchingPlugin)
}

export default matchingPlugin