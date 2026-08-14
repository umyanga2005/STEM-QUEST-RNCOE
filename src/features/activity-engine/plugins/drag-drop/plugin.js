/**
 * Activity Engine — drag-drop plugin (Task 4.2).
 *
 * The first real production activity plugin. Implements the 7-method plugin
 * contract for the `drag-drop` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json).
 *
 * Security: the plugin never emits correct-answer data. `render` builds a
 * client-safe descriptor; the correct-answer document only flows through
 * `validateAnswer` (server-only), and the semantic port of the catalog's
 * cross-document rules runs there — where both documents exist.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (drag-drop). These are the catalog rules
 * `drag-drop.mappings-cover-items` and `drag-drop.mappings-zone-exists`.
 * They need both the payload and the correct-answer document, so they run
 * server-side (in `validateAnswer`) and are also exposed here for authoring
 * tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateMappings(payload, correctAnswer) {
  const errors = []
  const items = Array.isArray(payload?.items) ? payload.items : []
  const zones = Array.isArray(payload?.zones) ? payload.zones : []
  const mappings = Array.isArray(correctAnswer?.mappings) ? correctAnswer.mappings : []

  const itemIds = new Set(items.map((item) => item.id))
  const zoneIds = new Set(zones.map((zone) => zone.id))

  const seen = new Set()
  for (const mapping of mappings) {
    const { itemId, zoneId } = mapping ?? {}
    if (itemId === undefined || itemId === null) continue
    if (seen.has(itemId)) {
      errors.push({
        ruleId: 'drag-drop.mappings-cover-items',
        message: `item "${itemId}" is mapped more than once`,
        path: '/mappings',
      })
    }
    seen.add(itemId)
    if (!zoneIds.has(zoneId)) {
      errors.push({
        ruleId: 'drag-drop.mappings-zone-exists',
        message: `mapping for item "${itemId}" references unknown zone "${zoneId}"`,
        path: '/mappings',
      })
    }
  }
  for (const itemId of itemIds) {
    if (!seen.has(itemId)) {
      errors.push({
        ruleId: 'drag-drop.mappings-cover-items',
        message: `item "${itemId}" has no mapping`,
        path: '/mappings',
      })
    }
  }
  return errors
}

/**
 * Payload-only semantic rules (authoring-time). These catch meaning the JSON
 * Schema cannot express: id uniqueness is only deep-equality in the schema, so
 * duplicate ids with different labels would pass it; item/zone id collisions
 * would make a correct-answer mapping ambiguous; `single-target` mode is
 * defined as exactly one zone.
 */
const semanticRules = [
  createSemanticRule('drag-drop.item-ids-unique', (payload) => {
    const ids = payload.items.map((item) => item.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'item ids must be unique', path: '/items' }
  }),
  createSemanticRule('drag-drop.zone-ids-unique', (payload) => {
    const ids = payload.zones.map((zone) => zone.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'zone ids must be unique', path: '/zones' }
  }),
  createSemanticRule('drag-drop.item-zone-ids-disjoint', (payload) => {
    const itemIds = new Set(payload.items.map((item) => item.id))
    const zoneIds = new Set(payload.zones.map((zone) => zone.id))
    const overlap = [...itemIds].filter((id) => zoneIds.has(id))
    return overlap.length === 0
      ? true
      : { message: `item and zone ids must not overlap: ${overlap.join(', ')}`, path: '/' }
  }),
  createSemanticRule('drag-drop.single-target-requires-one-zone', (payload) => {
    if (payload.mode === 'single-target' && payload.zones.length !== 1) {
      return {
        message: 'single-target mode requires exactly one zone',
        path: '/mode',
      }
    }
    return true
  }),
]

/** Fisher–Yates shuffle. Used only when the payload opts in (randomizeItems). */
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

function zoneView(zone) {
  return Object.freeze({
    id: zone.id,
    label: typeof zone.label === 'string' ? zone.label : '',
    image: zone.image ?? null,
    ariaLabel: zone.ariaLabel ?? zone.label ?? zone.id,
  })
}

export const dragDropPlugin = {
  type: 'drag-drop',
  name: 'Drag & Drop',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}

    const items = Array.isArray(payload.items) ? payload.items : []
    const zones = Array.isArray(payload.zones) ? payload.zones : []
    const randomizeItems = payload.randomizeItems !== false
    const displayItems = randomizeItems ? shuffle(items) : items

    return Object.freeze({
      kind: 'drag-drop',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      mode: payload.mode === 'single-target' ? 'single-target' : 'multi-target',
      allowRetry: payload.allowRetry !== false,
      randomizeItems,
      items: Object.freeze(displayItems.map(itemView)),
      zones: Object.freeze(zones.map(zoneView)),
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
    const integrity = validateMappings(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('drag-drop', integrity)
    }

    const response = submission.response ?? {}
    const rawPlacements = response.placements
    if (rawPlacements !== undefined && rawPlacements !== null && !Array.isArray(rawPlacements)) {
      throw engineError.answerInvalid('drag-drop', '`response.placements` must be an array')
    }
    const placements = Array.isArray(rawPlacements) ? rawPlacements : []
    if (!placements.every((p) => p && typeof p.itemId === 'string' && typeof p.zoneId === 'string')) {
      throw engineError.answerInvalid(
        'drag-drop',
        '`response.placements` must be an array of { itemId, zoneId }'
      )
    }

    const knownItemIds = new Set(payload.items.map((item) => item.id))
    const knownZoneIds = new Set(payload.zones.map((zone) => zone.id))
    for (const p of placements) {
      if (!knownItemIds.has(p.itemId)) {
        throw engineError.answerInvalid('drag-drop', `unknown item id "${p.itemId}" in placement`)
      }
      if (!knownZoneIds.has(p.zoneId)) {
        throw engineError.answerInvalid('drag-drop', `unknown zone id "${p.zoneId}" in placement`)
      }
    }

    const correctZoneByItem = new Map(correctAnswer.mappings.map((m) => [m.itemId, m.zoneId]))
    const submittedZoneByItem = new Map()
    for (const p of placements) {
      if (submittedZoneByItem.has(p.itemId)) {
        throw engineError.answerInvalid('drag-drop', `item "${p.itemId}" placed more than once`)
      }
      submittedZoneByItem.set(p.itemId, p.zoneId)
    }

    const results = payload.items.map((item) => {
      const zoneId = submittedZoneByItem.get(item.id) ?? null
      return Object.freeze({
        itemId: item.id,
        zoneId,
        correct: zoneId === correctZoneByItem.get(item.id),
      })
    })
    const correctCount = results.filter((r) => r.correct).length

    return {
      correct: correctCount === results.length && results.length > 0,
      detail: Object.freeze({
        total: results.length,
        correctCount,
        placements: Object.freeze(results),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct placements ÷ total items
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
      evidence: detail?.placements ?? null,
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

  /** Learning-oriented feedback; never reveals the correct placements. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0

    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'All correct',
        message: 'Every item is in the right zone.',
        explanation: 'Your placements match the expected arrangement.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} items are placed correctly.`,
        explanation: 'Some items landed in the wrong zone.',
        guidance: 'Re-read each zone label and think about which items share that property.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'None of the items are in the right zone.',
      explanation: 'Compare each item against the zone labels.',
      guidance: 'Match each item to the zone it belongs in, then try again.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['drag-drop'] = false`, and
   * voice-only devices are not offered pointer/touch dragging.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['drag-drop'] === false) return false
    if (ctx.device === 'voice-only') return false
    return true
  },
}

/**
 * Registers the drag-drop plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerDragDrop(engine) {
  return engine.register(dragDropPlugin)
}

export default dragDropPlugin
