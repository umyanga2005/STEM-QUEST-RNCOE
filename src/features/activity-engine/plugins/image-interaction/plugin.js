/**
 * Activity Engine — image-interaction plugin (Task 4.9).
 *
 * The sixth production activity plugin. Implements the 7-method plugin
 * contract for the `image-interaction` activity type against the Task 3.2
 * schema contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.image / imageWidth / imageHeight — the interaction surface
 *   - payload.mode          — "tap" | "label"
 *   - payload.hotspots[]    — 1..8 regions { id, x, y, shape?, radius?/width?/height? }
 *                             (normalized % coordinates; public geometry)
 *   - payload.labels[]      — label mode only: draggable labels { id, text }
 *   - correctAnswer.requiredHotspots[] — tap mode: hotspot ids that must be selected
 *   - correctAnswer.placements[]       — label mode: expected { labelId, hotspotId }
 *
 * Tap mode is exact-response *identification*: the student taps the hotspot(s)
 * the instruction asks for. The submitted response is `{ taps: [{ x, y }] }` —
 * normalized percentage coordinates. The server independently re-maps every
 * tap to the hotspot whose region contains it (via the payload geometry, the
 * same pure hit-test the renderer uses), so correctness is decided server-side
 * and a forged coordinate is never trusted.
 *
 * Label mode places labels onto hotspot targets; the submitted response is
 * `{ placements: [{ labelId, hotspotId }] }` — the exact schema-compatible
 * shape `buildResponse` emits. The schema's placement representation is
 * id-based (no coordinates, no invented tolerance).
 *
 * Scoring: tap = (correct hits − over-selects) / required, floor 0 — extra
 * selections are errors, so "tap everything" never scores. label = correct
 * placements ÷ labels. Plugins never compute the final score (D-041).
 *
 * Security: correct-answer data never reaches the render path. `render` builds
 * a client-safe descriptor (image metadata + public hotspot geometry + labels)
 * and never reads the correct-answer document. Required hotspots and expected
 * placements only flow through `validateAnswer` (server-only), where the
 * semantic port of the catalog rule `image-interaction.hotspots-exist` runs.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'
import { hitTestPoint } from './image-interaction-controller.js'

/** Range check for a normalized coordinate (schema: 0..100). */
function isNormalizedCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (image-interaction). This is the catalog rule
 * `image-interaction.hotspots-exist`, extended with the invariants that make
 * scoring honest: the answer's mode must match the payload's mode, and label
 * mode must cover every payload label exactly once. It needs both documents,
 * so it runs server-side (in `validateAnswer`) and is also exposed here for
 * authoring tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateImageInteractionAnswer(payload, correctAnswer) {
  const errors = []
  const hotspotIds = new Set((payload?.hotspots ?? []).map((h) => h.id))
  const labelIds = new Set((payload?.labels ?? []).map((l) => l.id))

  if (correctAnswer?.mode !== payload?.mode) {
    errors.push({
      ruleId: 'image-interaction.hotspots-exist',
      message: `answer mode "${correctAnswer?.mode}" does not match payload mode "${payload?.mode}"`,
      path: '/mode',
    })
    return errors
  }

  if (payload?.mode === 'tap') {
    if (Array.isArray(correctAnswer?.placements) && correctAnswer.placements.length > 0) {
      errors.push({
        ruleId: 'image-interaction.hotspots-exist',
        message: 'a tap-mode correct answer must not contain placements',
        path: '/placements',
      })
    }
    for (const hotspotId of correctAnswer?.requiredHotspots ?? []) {
      if (!hotspotIds.has(hotspotId)) {
        errors.push({
          ruleId: 'image-interaction.hotspots-exist',
          message: `requiredHotspots reference unknown hotspot "${hotspotId}"`,
          path: '/requiredHotspots',
        })
      }
    }
  } else {
    if (Array.isArray(correctAnswer?.requiredHotspots) && correctAnswer.requiredHotspots.length > 0) {
      errors.push({
        ruleId: 'image-interaction.hotspots-exist',
        message: 'a label-mode correct answer must not contain requiredHotspots',
        path: '/requiredHotspots',
      })
    }
    if (labelIds.size === 0) {
      errors.push({
        ruleId: 'image-interaction.hotspots-exist',
        message: 'label mode requires payload labels',
        path: '/labels',
      })
    }
    const seen = new Set()
    for (const placement of correctAnswer?.placements ?? []) {
      const { labelId, hotspotId } = placement ?? {}
      if (!labelIds.has(labelId)) {
        errors.push({
          ruleId: 'image-interaction.hotspots-exist',
          message: `placement references unknown label "${labelId}"`,
          path: '/placements',
        })
      } else if (seen.has(labelId)) {
        errors.push({
          ruleId: 'image-interaction.hotspots-exist',
          message: `label "${labelId}" has more than one placement`,
          path: '/placements',
        })
      }
      if (!hotspotIds.has(hotspotId)) {
        errors.push({
          ruleId: 'image-interaction.hotspots-exist',
          message: `placement references unknown hotspot "${hotspotId}"`,
          path: '/placements',
        })
      }
      seen.add(labelId)
    }
    for (const label of payload?.labels ?? []) {
      if (!seen.has(label.id)) {
        errors.push({
          ruleId: 'image-interaction.hotspots-exist',
          message: `label "${label.id}" has no placement in the correct answer`,
          path: '/placements',
        })
      }
    }
  }
  return errors
}

/**
 * Payload-only semantic rules (authoring-time). The JSON Schema's
 * `uniqueItems` is pure deep-equality (two hotspots sharing an id with
 * different geometry pass it), and the schema's `radius`/`width`/`height`
 * fields are optional while `shape` defaults to "circle" — a hotspot without
 * a hit region is unusable. These catch that meaning.
 */
const semanticRules = [
  createSemanticRule('image-interaction.hotspot-ids-unique', (payload) => {
    const ids = payload.hotspots.map((hotspot) => hotspot.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'hotspot ids must be unique', path: '/hotspots' }
  }),
  createSemanticRule('image-interaction.label-ids-unique', (payload) => {
    const ids = (payload.labels ?? []).map((label) => label.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'label ids must be unique', path: '/labels' }
  }),
  createSemanticRule('image-interaction.hotspots-and-labels-disjoint', (payload) => {
    const hotspotIds = new Set(payload.hotspots.map((h) => h.id))
    const overlap = (payload.labels ?? []).map((l) => l.id).filter((id) => hotspotIds.has(id))
    return overlap.length === 0
      ? true
      : { message: `hotspot and label ids must not overlap (${overlap.join(', ')})`, path: '/labels' }
  }),
  createSemanticRule('image-interaction.label-mode-requires-labels', (payload) => {
    if (payload.mode !== 'label') return true
    return Array.isArray(payload.labels) && payload.labels.length > 0
      ? true
      : { message: 'label mode requires a non-empty labels array', path: '/labels' }
  }),
  createSemanticRule('image-interaction.hit-shape-defined', (payload) => {
    for (const hotspot of payload.hotspots) {
      if (hotspot.shape === 'rect') {
        if (hotspot.width === undefined || hotspot.height === undefined) {
          return {
            message: `rect hotspot "${hotspot.id}" must define both width and height`,
            path: `/hotspots/${hotspot.id}`,
          }
        }
      } else if (hotspot.radius === undefined) {
        return {
          message: `circle hotspot "${hotspot.id}" must define a radius`,
          path: `/hotspots/${hotspot.id}`,
        }
      }
    }
    return true
  }),
]

export const imageInteractionPlugin = {
  type: 'image-interaction',
  name: 'Image Interaction',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data — the
   * required hotspots (`correctAnswer.requiredHotspots`) and expected
   * placements (`correctAnswer.placements`) are never read here. The
   * descriptor carries the image metadata, the mode, and the PUBLIC hotspot
   * geometry (id, center, shape, hit region) plus the labels, which the
   * renderer needs to build the interaction surface. The image may itself
   * contain visible educational content — that is fine; the server-side
   * answer mapping is never exposed.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}
    const hotspots = Array.isArray(payload.hotspots) ? payload.hotspots : []
    const labels = Array.isArray(payload.labels) ? payload.labels : []
    const image = payload.image ?? {}

    return Object.freeze({
      kind: 'image-interaction',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      mode: payload.mode ?? 'tap',
      imageWidth: typeof payload.imageWidth === 'number' ? payload.imageWidth : 1,
      imageHeight: typeof payload.imageHeight === 'number' ? payload.imageHeight : 1,
      image: Object.freeze({
        ref: typeof image.ref === 'string' ? image.ref : '',
        alt: typeof image.alt === 'string' ? image.alt : '',
        role: typeof image.role === 'string' ? image.role : 'illustration',
        width: typeof image.width === 'number' ? image.width : null,
        height: typeof image.height === 'number' ? image.height : null,
      }),
      hotspots: Object.freeze(
        hotspots.map((hotspot) =>
          Object.freeze({
            id: hotspot.id,
            x: hotspot.x,
            y: hotspot.y,
            shape: hotspot.shape ?? 'circle',
            radius: typeof hotspot.radius === 'number' ? hotspot.radius : null,
            width: typeof hotspot.width === 'number' ? hotspot.width : null,
            height: typeof hotspot.height === 'number' ? hotspot.height : null,
            label: typeof hotspot.label === 'string' ? hotspot.label : '',
            ariaLabel: typeof hotspot.ariaLabel === 'string' ? hotspot.ariaLabel : '',
          })
        )
      ),
      labels: Object.freeze(
        labels.map((label) => Object.freeze({ id: label.id, text: label.text }))
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
   * Server-only answer validation. Authoring-integrity failures
   * (`validateImageInteractionAnswer`) throw `ACTIVITY_PAYLOAD_SEMANTIC_INVALID`
   * — those are author bugs, never student mistakes. Every submission-shape
   * or reference failure throws `ACTIVITY_ANSWER_INVALID`.
   *
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError}
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateImageInteractionAnswer(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('image-interaction', integrity)
    }

    const response = submission.response ?? {}
    return payload.mode === 'label'
      ? validateLabelAnswer(response, payload, correctAnswer)
      : validateTapAnswer(response, payload, correctAnswer)
  },

  /**
   * Raw scoring inputs. Plugins never compute the final score (D-041). The
   * engine guards the fraction; the central scoring service does the
   * arithmetic. The evidence (submitted taps/placements with a per-unit
   * correctness flag) never carries the required hotspots or expected
   * placements.
   */
  scoringInputs(ctx, validation) {
    const detail = validation.detail
    const total = detail?.required ?? 0
    const correctUnits = detail?.correctUnits ?? 0
    let correctnessFraction
    if (detail?.mode === 'tap') {
      const wrongUnits = detail?.wrongUnits ?? 0
      correctnessFraction = total > 0 ? (correctUnits - wrongUnits) / total : 0
      correctnessFraction = Math.max(0, Math.min(1, correctnessFraction))
    } else {
      correctnessFraction = total > 0 ? correctUnits / total : 0
    }
    const metrics = ctx.submission.interactionMetrics
    return {
      correctnessFraction,
      scorableUnits: total,
      correctUnits,
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

  /** Learning-oriented feedback; never reveals the expected hotspot/placement. */
  feedback(ctx, validation, state) {
    const detail = validation?.detail ?? {}
    const total = detail.required ?? 1
    const correctCount = detail.correctUnits ?? 0
    const wrongCount = detail.wrongUnits ?? 0
    const fraction =
      detail.mode === 'tap' && total > 0
        ? Math.max(0, Math.min(1, (correctCount - wrongCount) / total))
        : total > 0
          ? correctCount / total
          : 0
    const isLabel = detail.mode === 'label'

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: isLabel
          ? 'The clock ran out before every label was placed.'
          : 'The clock ran out before you identified every target.',
        explanation: 'Time pressure can make reading a diagram harder.',
        guidance: isLabel
          ? 'Place the labels you are sure about first, then check the remaining targets.'
          : 'Find the targets you are sure about first, then work through the rest.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Everything correct',
        message: isLabel
          ? 'Every label is placed on the right target.'
          : 'Every target you selected is correct.',
        explanation: 'Your interaction matches exactly what the image shows.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: isLabel
          ? `${correctCount} of ${total} labels are placed correctly.`
          : `${correctCount} of ${total} targets are identified correctly.`,
        explanation: isLabel
          ? 'Some labels are on the wrong target.'
          : 'Some selections are not the targets the image shows.',
        guidance: isLabel
          ? 'Re-read the labels and compare them with the shapes in the image.'
          : 'Look closely at the shapes in the image and check each selection.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: isLabel
        ? 'None of the labels are on the right target yet.'
        : 'None of the selected targets are correct yet.',
      explanation: 'The interaction does not match what the image shows.',
      guidance: isLabel
        ? 'Look for the clue in the image, then place each label again.'
        : 'Look for the clue in the image, then try again.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['image-interaction'] = false`.
   * Both modes offer a keyboard path (tap targets and label/placement
   * controls are real buttons), so a broad range of devices can play it.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['image-interaction'] === false) return false
    return true
  },
}

/** Server-side tap answer validation. */
function validateTapAnswer(response, payload, correctAnswer) {
  const taps = response.taps
  if (!Array.isArray(taps)) {
    throw engineError.answerInvalid('image-interaction', '`response.taps` must be an array of { x, y }')
  }
  const required = new Set(correctAnswer.requiredHotspots)
  const imageWidth = payload.imageWidth
  const imageHeight = payload.imageHeight

  const hits = []
  for (const tap of taps) {
    if (
      !tap ||
      typeof tap.x !== 'number' ||
      typeof tap.y !== 'number' ||
      !Number.isFinite(tap.x) ||
      !Number.isFinite(tap.y)
    ) {
      throw engineError.answerInvalid('image-interaction', 'each tap must provide finite numeric x and y')
    }
    if (!isNormalizedCoordinate(tap.x) || !isNormalizedCoordinate(tap.y)) {
      throw engineError.answerInvalid('image-interaction', 'tap coordinates must be normalized to [0, 100]')
    }
    let hotspotId = null
    for (const hotspot of payload.hotspots) {
      if (hitTestPoint(hotspot, tap.x, tap.y, imageWidth, imageHeight)) {
        hotspotId = hotspot.id
        break
      }
    }
    if (hotspotId === null) {
      throw engineError.answerInvalid('image-interaction', 'a tap coordinate does not land on any hotspot')
    }
    hits.push({ x: tap.x, y: tap.y, hotspotId })
  }

  const hitSet = new Set(hits.map((hit) => hit.hotspotId))
  const correctUnits = [...required].filter((id) => hitSet.has(id)).length
  const wrongUnits = [...hitSet].filter((id) => !required.has(id)).length
  const correct = correctUnits === required.size && wrongUnits === 0

  return {
    correct,
    detail: {
      mode: 'tap',
      required: required.size,
      correctUnits,
      wrongUnits,
      submitted: hits.map((hit) => ({
        x: hit.x,
        y: hit.y,
        hotspotId: hit.hotspotId,
        correct: required.has(hit.hotspotId),
      })),
    },
  }
}

/** Server-side label answer validation. */
function validateLabelAnswer(response, payload, correctAnswer) {
  const placements = response.placements
  if (!Array.isArray(placements)) {
    throw engineError.answerInvalid('image-interaction', '`response.placements` must be an array of { labelId, hotspotId }')
  }
  const labelIds = new Set(payload.labels.map((l) => l.id))
  const hotspotIds = new Set(payload.hotspots.map((h) => h.id))
  const seen = new Set()

  for (const placement of placements) {
    if (!placement || typeof placement.labelId !== 'string' || typeof placement.hotspotId !== 'string') {
      throw engineError.answerInvalid('image-interaction', 'each placement must be { labelId, hotspotId }')
    }
    if (!labelIds.has(placement.labelId)) {
      throw engineError.answerInvalid('image-interaction', `unknown label id "${placement.labelId}"`)
    }
    if (seen.has(placement.labelId)) {
      throw engineError.answerInvalid('image-interaction', `label "${placement.labelId}" placed more than once`)
    }
    if (!hotspotIds.has(placement.hotspotId)) {
      throw engineError.answerInvalid('image-interaction', `unknown hotspot id "${placement.hotspotId}"`)
    }
    seen.add(placement.labelId)
  }

  for (const label of payload.labels) {
    if (!seen.has(label.id)) {
      throw engineError.answerInvalid('image-interaction', `missing required placement for label "${label.id}"`)
    }
  }

  const expected = new Map(correctAnswer.placements.map((p) => [p.labelId, p.hotspotId]))
  const byLabelId = new Map(placements.map((p) => [p.labelId, p.hotspotId]))
  const correctUnits = payload.labels.filter(
    (label) => byLabelId.get(label.id) === expected.get(label.id)
  ).length
  const correct = correctUnits === payload.labels.length

  return {
    correct,
    detail: {
      mode: 'label',
      required: payload.labels.length,
      correctUnits,
      wrongUnits: payload.labels.length - correctUnits,
      submitted: payload.labels.map((label) => ({
        labelId: label.id,
        hotspotId: byLabelId.get(label.id),
        correct: byLabelId.get(label.id) === expected.get(label.id),
      })),
    },
  }
}

/**
 * Registers the image-interaction plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerImageInteraction(engine) {
  return engine.register(imageInteractionPlugin)
}

export default imageInteractionPlugin
