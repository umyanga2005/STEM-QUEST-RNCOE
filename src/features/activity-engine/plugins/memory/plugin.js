/**
 * Activity Engine — memory plugin (Task 4.11).
 *
 * The eighth production activity plugin. Implements the 7-method plugin
 * contract for the `memory` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.cards[]            — 4..12 cards { id, text?|image?, ariaLabel? }
 *   - payload.revealSeconds      — memorization countdown (5..30)
 *   - payload.recallPrompt       — how to recall ("Match each formula to its name.")
 *   - payload.deckType           — "pairs" (groups of 2) | "sets" (groups of 3–4)
 *   - payload.shuffle            — deck display order is shuffled when true
 *   - payload.maxAttempts        — optional re-reveal (study-again) limit (1..5)
 *   - correctAnswer.groups[]     — server-only expected groups
 *                                { groupId, cardIds[] } covering every card once
 *
 * Memory is a genuine RECALL activity, not MCQ and not matching-disguised: the
 * student first OBSERVES the deck (memorize phase, `revealSeconds` countdown),
 * then the deck is re-presented WITHOUT any grouping and the student
 * reconstructs the authored groups from memory. The submitted response is
 * `{ groups: [{ cardIds }] }` — exactly what the controller's `buildResponse`
 * emits. Ordering never matters: groups are unordered sets of card ids and the
 * group list is unordered.
 *
 * Answer units: one per group. Partial credit = correct groups ÷ total groups
 * (D-041/D-047, report §6: completedGroups ÷ totalGroups). Plugins never
 * compute the final score (D-041).
 *
 * Security: correct-answer data never reaches the render path. `render` builds
 * a client-safe descriptor (deck + recall prompt + deckType + revealSeconds +
 * maxAttempts + shuffle) and never reads the correct-answer document. The
 * expected groups only flow through `validateAnswer` (server-only), where the
 * semantic port of the catalog rule `memory.groups-cover-cards` also runs.
 * The cards ARE the public memorization material (intentionally visible via
 * the payload); the grouping is the hidden answer.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'
import { groupSizeRange, shuffleList } from './memory-controller.js'

/**
 * Payload-only semantic rules (authoring-time). The JSON Schema's
 * `uniqueItems` is pure deep-equality (two cards sharing an id with different
 * display data pass it), and the schema's 4..12 card bound is independent of
 * whether the deck can actually be partitioned into valid groups for its
 * deckType. These catch that meaning.
 */
const semanticRules = [
  createSemanticRule('memory.card-ids-unique', (payload) => {
    const ids = payload.cards.map((card) => card.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'card ids must be unique', path: '/cards' }
  }),
  createSemanticRule('memory.deck-size-consistent', (payload) => {
    const count = payload.cards.length
    // A pairs deck must split into groups of 2 (even count); a sets deck must
    // split into ≥2 groups of 3–4 (the schema's own deckType description),
    // which every count from 6..12 satisfies and 4–5 cannot.
    if (payload.deckType === 'pairs') {
      return count % 2 === 0
        ? true
        : {
            message: `a pairs deck must hold an even number of cards (got ${count})`,
            path: '/cards',
          }
    }
    return count >= 6
      ? true
      : {
          message: `${count} cards cannot be partitioned into ≥2 groups of 3–4 (a sets deck needs at least 6 cards)`,
          path: '/cards',
        }
  }),
]

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (memory). This is the catalog rule
 * `memory.groups-cover-cards` — every payload card must appear in exactly one
 * group — extended with deck-type size consistency so the authored answer can
 * never contradict the deck's documented group sizes. It needs both documents,
 * so it runs server-side (in `validateAnswer`) and is also exposed here for
 * authoring tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateMemoryAnswer(payload, correctAnswer) {
  const errors = []
  const cards = Array.isArray(payload?.cards) ? payload.cards : []
  const groups = Array.isArray(correctAnswer?.groups) ? correctAnswer.groups : []

  const cardIds = new Set(cards.map((card) => card.id))
  const seen = new Set()
  for (const group of groups) {
    for (const id of group?.cardIds ?? []) {
      if (!cardIds.has(id)) {
        errors.push({
          ruleId: 'memory.groups-cover-cards',
          message: `group "${group?.groupId}" references unknown card "${id}"`,
          path: `/groups`,
        })
      } else if (seen.has(id)) {
        errors.push({
          ruleId: 'memory.groups-cover-cards',
          message: `card "${id}" appears in more than one group`,
          path: '/groups',
        })
      } else {
        seen.add(id)
      }
    }
  }
  for (const card of cards) {
    if (!seen.has(card.id)) {
      errors.push({
        ruleId: 'memory.groups-cover-cards',
        message: `card "${card.id}" is missing from every group`,
        path: '/groups',
      })
    }
  }

  const [min, max] = groupSizeRange(payload?.deckType)
  for (const group of groups) {
    const size = group?.cardIds?.length ?? 0
    if (size < min || size > max) {
      errors.push({
        ruleId: 'memory.group-size-matches-deck',
        message:
          `a "${payload?.deckType}" group must hold ${min === max ? min : `${min}–${max}`} ` +
          `cards (group "${group?.groupId}" has ${size})`,
        path: `/groups`,
      })
    }
  }

  return errors
}

function cardView(card) {
  return Object.freeze({
    id: card.id,
    text: typeof card.text === 'string' ? card.text : '',
    imageRef: typeof card.image?.ref === 'string' ? card.image.ref : null,
    ariaLabel: typeof card.ariaLabel === 'string' ? card.ariaLabel : '',
  })
}

export const memoryPlugin = {
  type: 'memory',
  name: 'Memory',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data — the
   * expected groups (`correctAnswer.groups`) are never read here. The
   * descriptor carries the PUBLIC deck (the memorization material), the recall
   * prompt, and the public deck metadata (deckType, revealSeconds, maxAttempts,
   * shuffle). The grouping is never revealed.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}
    const cards = Array.isArray(payload.cards) ? payload.cards : []
    const shuffleOn = payload.shuffle !== false

    return Object.freeze({
      kind: 'memory',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      recallPrompt: typeof payload.recallPrompt === 'string' ? payload.recallPrompt : '',
      revealSeconds:
        typeof payload.revealSeconds === 'number' ? payload.revealSeconds : 10,
      deckType: payload.deckType === 'sets' ? 'sets' : 'pairs',
      maxAttempts: typeof payload.maxAttempts === 'number' ? payload.maxAttempts : null,
      shuffle: shuffleOn,
      cards: Object.freeze((shuffleOn ? shuffleList(cards) : cards).map(cardView)),
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
   * Server-only answer validation. Authoring-integrity failures
   * (`validateMemoryAnswer`) throw `ACTIVITY_PAYLOAD_SEMANTIC_INVALID` —
   * those are author bugs, never student mistakes. The submission must be a
   * complete, structurally-valid recall: every card placed exactly once into
   * groups of the deck's valid size. Unknown ids, missing cards, duplicate
   * cards, malformed arrays, and unexpected fields are rejected with
   * `ACTIVITY_ANSWER_INVALID` — a truncated/forged response can never inflate
   * partial credit.
   *
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError}
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateMemoryAnswer(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('memory', integrity)
    }

    const response = submission.response ?? {}
    const groups = parseResponse(response)
    const knownCards = new Set(payload.cards.map((card) => card.id))

    // Reference integrity: every placed card must exist.
    for (const ids of groups) {
      for (const id of ids) {
        if (!knownCards.has(id)) {
          throw engineError.answerInvalid('memory', `unknown card id "${id}"`)
        }
      }
    }

    // Completeness: a full recall places every card exactly once. Missing or
    // cross-group-duplicate cards would distort the partial-credit denominator.
    const seen = new Set()
    for (const ids of groups) {
      for (const id of ids) {
        if (seen.has(id)) {
          throw engineError.answerInvalid('memory', `card "${id}" placed in more than one group`)
        }
        seen.add(id)
      }
    }
    for (const card of payload.cards) {
      if (!seen.has(card.id)) {
        throw engineError.answerInvalid('memory', `missing required placement for card "${card.id}"`)
      }
    }

    // Deck-type size consistency: a pairs group is exactly 2; a sets group 3–4.
    const [minSize, maxSize] = groupSizeRange(payload.deckType)
    for (const ids of groups) {
      if (ids.length < minSize || ids.length > maxSize) {
        throw engineError.answerInvalid(
          'memory',
          `a "${payload.deckType}" group must hold ${minSize === maxSize ? minSize : `${minSize}–${maxSize}`} cards`
        )
      }
    }

    const expectedGroups = correctAnswer.groups.map((group) => group.cardIds)
    const submitted = groups.map((ids) => {
      const correct = expectedGroups.some(
        (expected) =>
          expected.length === ids.length && expected.every((id) => ids.includes(id))
      )
      return Object.freeze({ cardIds: [...ids], correct })
    })
    const correctCount = submitted.filter((g) => g.correct).length

    return {
      correct: correctCount === expectedGroups.length && expectedGroups.length > 0,
      detail: Object.freeze({
        mode: payload.deckType,
        total: expectedGroups.length,
        correctCount,
        submitted: Object.freeze(submitted),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct groups ÷ total groups
   * (D-041/D-047). The engine guards the fraction; the central scoring service
   * does the arithmetic. The evidence (submitted group ids with a per-group
   * correctness flag) never carries the expected grouping for wrong groups.
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
      evidence: detail?.submitted ?? null,
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

  /** Learning-oriented feedback; never reveals the expected grouping. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0
    const unit = total === 1 ? 'group' : 'groups'

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you finished recalling the groups.',
        explanation: 'Time pressure can make recall harder than it needs to be.',
        guidance: 'Next time, study the deck until you can say the groups from memory.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Everything correct',
        message: `You recalled all ${total} ${unit} exactly.`,
        explanation: 'Your groups match the ones shown during the memory phase.',
        guidance: 'Great recall — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} ${unit} are correct.`,
        explanation: 'Some of your groups match the memory phase, some do not.',
        guidance: 'Think about what linked each group together, then re-study next time.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'None of your groups match the ones shown.',
      explanation: 'The grouping did not match the memory phase.',
      guidance: 'Use the recall prompt to think about the relationship between the cards.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['memory'] = false`. Card targets
   * are real buttons and the phases are keyboard-reachable, so a broad range
   * of devices and input methods can play it.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['memory'] === false) return false
    return true
  },
}

/**
 * Response shape gate. The schema-compatible submission is a single object
 * `{ groups: [{ cardIds: string[] }] }` — 2..6 groups (schema bound), each with
 * a 2..4-card array of non-empty strings with no intra-group duplicates, and no
 * unexpected fields anywhere. groupId is never part of the response (the
 * student does not know group ids). Malformed or forged responses are rejected,
 * never silently coerced.
 */
function parseResponse(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw engineError.answerInvalid('memory', '`response` must be an object')
  }
  const keys = Object.keys(response)
  if (keys.length !== 1 || keys[0] !== 'groups') {
    throw engineError.answerInvalid('memory', '`response` must contain exactly the `groups` field')
  }
  if (!Array.isArray(response.groups)) {
    throw engineError.answerInvalid('memory', '`response.groups` must be an array')
  }
  if (response.groups.length < 2 || response.groups.length > 6) {
    throw engineError.answerInvalid('memory', '`response.groups` must contain 2–6 groups')
  }
  return response.groups.map((group, index) => {
    if (!group || typeof group !== 'object' || Array.isArray(group)) {
      throw engineError.answerInvalid('memory', `group ${index + 1} must be an object`)
    }
    const groupKeys = Object.keys(group)
    if (groupKeys.length !== 1 || groupKeys[0] !== 'cardIds') {
      throw engineError.answerInvalid('memory', `group ${index + 1} must contain exactly the "cardIds" field`)
    }
    if (!Array.isArray(group.cardIds)) {
      throw engineError.answerInvalid('memory', `group ${index + 1} "cardIds" must be an array`)
    }
    if (group.cardIds.length < 2 || group.cardIds.length > 4) {
      throw engineError.answerInvalid('memory', `group ${index + 1} must contain 2–4 card ids`)
    }
    const seen = new Set()
    for (const id of group.cardIds) {
      if (typeof id !== 'string' || id.length === 0) {
        throw engineError.answerInvalid('memory', 'each card id must be a non-empty string')
      }
      if (seen.has(id)) {
        throw engineError.answerInvalid('memory', `group ${index + 1} contains duplicate card "${id}"`)
      }
      seen.add(id)
    }
    return group.cardIds
  })
}

/**
 * Registers the memory plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerMemory(engine) {
  return engine.register(memoryPlugin)
}

export default memoryPlugin