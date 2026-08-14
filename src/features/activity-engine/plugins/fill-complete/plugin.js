/**
 * Activity Engine — fill-complete plugin (Task 4.8).
 *
 * The fifth production activity plugin. Implements the 7-method plugin
 * contract for the `fill-complete` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.template      — text with `___` placeholders, one per blank
 *   - payload.blanks[]      — 1..4 blanks { id, type, label?, prefix?, suffix?,
 *                             maxLength? }, type ∈ { text, number, expression }
 *   - payload.keypad        — "default" | "numeric" | "text"
 *   - correctAnswer.answers[]      — TEXT blanks: { blankId, accepted[] }
 *   - correctAnswer.numeric[]      — NUMBER blanks: value/tolerance or min/max
 *   - correctAnswer.expression[]   — EXPRESSION blanks: { blankId, accepted[] }
 *
 * Fill & Complete is BLANK COMPLETION, not MCQ: the student types the value
 * into each blank. Partial credit = correct blanks ÷ total blanks (D-041 /
 * D-047). The submitted response is `{ answers: [{ blankId, value }] }` — the
 * deterministic shape `buildResponse` emits.
 *
 * Security: correct-answer data never reaches the render path. `render` builds
 * a client-safe descriptor (template + blank metadata + keypad) and never
 * reads the correct-answer document. Accepted values only flow through
 * `validateAnswer` (server-only), where the semantic port of the catalog rule
 * `fill-complete.blanks-referenced` also runs.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'

/**
 * ANSWER NORMALIZATION (Task 3.2 convention, exact — never fuzzy).
 *   - text:       trim + case-fold. No internal-whitespace collapse, no
 *                 substring matching, no typo correction.
 *   - expression: whitespace normalization only (trim + collapse internal
 *                 whitespace to single spaces). No case-fold, no arithmetic
 *                 equivalence — canonical forms must be listed explicitly.
 *   - number:     trim + parse to a finite number; compared via tolerance or
 *                 the (min, max) range. Not a string match.
 */

/** trim + case-fold for text answers (both sides of the comparison). */
export function normalizeTextAnswer(value) {
  return String(value).trim().toLowerCase()
}

/** whitespace normalization for expression answers (both sides). */
export function normalizeExpression(value) {
  return String(value).trim().replace(/\s+/g, ' ')
}

/**
 * Parses a numeric answer from a number or a string. Returns NaN when the
 * value is not a finite number (callers reject NaN as type-incompatible).
 */
export function parseNumericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return NaN
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (fill-complete). This is the catalog rule
 * `fill-complete.blanks-referenced`, extended with the invariants that make
 * scoring honest: every payload blank must have EXACTLY ONE answer entry, in
 * the group matching its type, and numeric entries must be definable
 * (value, or a (min, max) range). It needs both documents, so it runs
 * server-side (in `validateAnswer`) and is also exposed here for authoring
 * tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateBlankAnswers(payload, correctAnswer) {
  const errors = []
  const blanks = Array.isArray(payload?.blanks) ? payload.blanks : []
  const blankTypeById = new Map(blanks.map((blank) => [blank.id, blank.type]))
  const seen = new Set()

  const groups = {
    text: Array.isArray(correctAnswer?.answers) ? correctAnswer.answers : [],
    number: Array.isArray(correctAnswer?.numeric) ? correctAnswer.numeric : [],
    expression: Array.isArray(correctAnswer?.expression) ? correctAnswer.expression : [],
  }

  for (const [expectedType, entries] of Object.entries(groups)) {
    for (const entry of entries) {
      const { blankId } = entry ?? {}
      if (blankId === undefined || blankId === null) continue
      if (!blankTypeById.has(blankId)) {
        errors.push({
          ruleId: 'fill-complete.blanks-referenced',
          message: `answer entry references unknown blank "${blankId}"`,
          path: '/',
        })
        continue
      }
      const actualType = blankTypeById.get(blankId)
      if (actualType !== expectedType) {
        errors.push({
          ruleId: 'fill-complete.blanks-referenced',
          message: `blank "${blankId}" is type "${actualType}" but has a "${expectedType}" answer entry`,
          path: '/',
        })
        continue
      }
      if (seen.has(blankId)) {
        errors.push({
          ruleId: 'fill-complete.blanks-referenced',
          message: `blank "${blankId}" has more than one answer entry`,
          path: '/',
        })
      }
      seen.add(blankId)

      if (expectedType === 'number') {
        const hasValue = entry.value !== undefined && entry.value !== null
        const hasRange = entry.min !== undefined && entry.max !== undefined
        if (!hasValue && !hasRange) {
          errors.push({
            ruleId: 'fill-complete.blanks-referenced',
            message: `numeric blank "${blankId}" has neither a value nor a (min, max) range`,
            path: '/',
          })
        }
        if ((entry.min === undefined) !== (entry.max === undefined)) {
          errors.push({
            ruleId: 'fill-complete.blanks-referenced',
            message: `numeric blank "${blankId}" must define both min and max together`,
            path: '/',
          })
        }
      }
      if (expectedType === 'text' || expectedType === 'expression') {
        if (!Array.isArray(entry.accepted) || entry.accepted.length === 0) {
          errors.push({
            ruleId: 'fill-complete.blanks-referenced',
            message: `"${expectedType}" blank "${blankId}" must list at least one accepted form`,
            path: '/',
          })
        }
      }
    }
  }

  for (const blank of blanks) {
    if (!seen.has(blank.id)) {
      errors.push({
        ruleId: 'fill-complete.blanks-referenced',
        message: `blank "${blank.id}" has no answer entry`,
        path: '/',
      })
    }
  }
  return errors
}

/**
 * Payload-only semantic rules (authoring-time). The JSON Schema's
 * `uniqueItems` is pure deep-equality, so two blanks sharing an id with
 * different types/labels pass it; the schema's `template` description states
 * "one placeholder per blank, in order", which is a cross-field constraint a
 * schema cannot express. These catch that meaning.
 */
const semanticRules = [
  createSemanticRule('fill-complete.blank-ids-unique', (payload) => {
    const ids = payload.blanks.map((blank) => blank.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'blank ids must be unique', path: '/blanks' }
  }),
  createSemanticRule('fill-complete.placeholder-count-matches-blanks', (payload) => {
    const placeholders = (payload.template.match(/___/g) ?? []).length
    return placeholders === payload.blanks.length
      ? true
      : {
          message:
            `template must contain exactly one "___" placeholder per blank ` +
            `(found ${placeholders} placeholders for ${payload.blanks.length} blanks)`,
          path: '/template',
        }
  }),
]

export const fillCompletePlugin = {
  type: 'fill-complete',
  name: 'Fill / Complete',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data — the
   * accepted values (`correctAnswer.*`) are never read here. The descriptor
   * carries the template, per-blank metadata (id, type, label, prefix,
   * suffix, maxLength) and the keypad hint so the renderer can pick the right
   * mobile input mode.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}

    const blanks = Array.isArray(payload.blanks) ? payload.blanks : []

    return Object.freeze({
      kind: 'fill-complete',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      template: typeof payload.template === 'string' ? payload.template : '',
      blanks: Object.freeze(
        blanks.map((blank) =>
          Object.freeze({
            id: blank.id,
            type: blank.type,
            label: typeof blank.label === 'string' ? blank.label : '',
            prefix: typeof blank.prefix === 'string' ? blank.prefix : '',
            suffix: typeof blank.suffix === 'string' ? blank.suffix : '',
            maxLength: typeof blank.maxLength === 'number' ? blank.maxLength : 24,
          })
        )
      ),
      keypad: payload.keypad ?? 'default',
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
   * mistakes. A student submission must answer every payload blank exactly
   * once. Unknown, duplicate, missing, malformed, empty, or type-incompatible
   * answers are rejected before scoring so a truncated/forged response can
   * never inflate partial credit (honest denominator, D-055 principle).
   *
   * @param {{ submission, payload, correctAnswer }} ctx
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError} on authoring-integrity or submission-shape failure
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateBlankAnswers(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('fill-complete', integrity)
    }

    const response = submission.response ?? {}
    const rawAnswers = response.answers
    if (!Array.isArray(rawAnswers)) {
      throw engineError.answerInvalid('fill-complete', '`response.answers` must be an array')
    }
    if (
      !rawAnswers.every(
        (a) =>
          a &&
          typeof a.blankId === 'string' &&
          (typeof a.value === 'string' || typeof a.value === 'number')
      )
    ) {
      throw engineError.answerInvalid(
        'fill-complete',
        '`response.answers` must be an array of { blankId, value }'
      )
    }

    const blankById = new Map(payload.blanks.map((blank) => [blank.id, blank]))
    const seen = new Set()
    const valueById = new Map()
    for (const a of rawAnswers) {
      if (!blankById.has(a.blankId)) {
        throw engineError.answerInvalid('fill-complete', `unknown blank id "${a.blankId}"`)
      }
      if (seen.has(a.blankId)) {
        throw engineError.answerInvalid('fill-complete', `blank "${a.blankId}" answered more than once`)
      }
      seen.add(a.blankId)

      const blank = blankById.get(a.blankId)
      if (blank.type === 'number') {
        if (typeof a.value === 'number') {
          if (!Number.isFinite(a.value)) {
            throw engineError.answerInvalid('fill-complete', `blank "${a.blankId}" must be a finite number`)
          }
        } else if (a.value.trim() === '' || Number.isNaN(parseNumericValue(a.value))) {
          throw engineError.answerInvalid('fill-complete', `blank "${a.blankId}" requires a numeric answer`)
        }
      } else if (typeof a.value !== 'string' || a.value.trim() === '') {
        throw engineError.answerInvalid('fill-complete', `blank "${a.blankId}" requires a text answer`)
      }
      valueById.set(a.blankId, a.value)
    }

    // A complete submission must answer every required blank exactly once;
    // fewer entries means missing answers (a truncated response would inflate
    // the partial-credit denominator otherwise).
    for (const blank of payload.blanks) {
      if (!seen.has(blank.id)) {
        throw engineError.answerInvalid('fill-complete', `missing required answer for blank "${blank.id}"`)
      }
    }

    const answerByBlankId = new Map()
    for (const group of ['answers', 'numeric', 'expression']) {
      for (const entry of correctAnswer[group] ?? []) {
        answerByBlankId.set(entry.blankId, entry)
      }
    }

    const results = payload.blanks.map((blank) => {
      const entry = answerByBlankId.get(blank.id)
      const submitted = valueById.get(blank.id)
      return Object.freeze({
        blankId: blank.id,
        type: blank.type,
        submitted,
        correct: isBlankCorrect(blank.type, entry, submitted),
      })
    })
    const correctCount = results.filter((r) => r.correct).length

    return {
      correct: correctCount === results.length && results.length > 0,
      detail: Object.freeze({
        total: results.length,
        correctCount,
        blanks: Object.freeze(results),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correct blanks ÷ total blanks
   * (D-041/D-047). The engine guards the fraction; the central scoring
   * service does the arithmetic. The per-blank evidence (blankId, type,
   * submitted value, correctness) never carries the expected/accepted value.
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
      evidence: detail?.blanks ?? null,
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

  /** Learning-oriented feedback; never reveals the accepted answers. */
  feedback(ctx, validation, state) {
    const total = validation.detail?.total ?? 1
    const correctCount = validation.detail?.correctCount ?? 0
    const fraction = total > 0 ? correctCount / total : 0

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you filled every blank.',
        explanation: 'Time pressure can make recalling answers harder.',
        guidance: 'Type the answers you are sure about first, then think through the rest.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Every blank correct',
        message: 'Every blank is filled in correctly.',
        explanation: 'All of your answers match what the question expects.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} blanks are filled in correctly.`,
        explanation: 'Some blanks do not match what the question expects.',
        guidance: 'Re-read the text around each blank and check the clue it gives.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'None of the blanks are correct yet.',
      explanation: 'The answers do not match what the question expects.',
      guidance: 'Look for the clue in the surrounding text, then try again.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['fill-complete'] = false`.
   * Typing is the core interaction (no pointer/drag dependency), so a broad
   * range of devices and input methods can still play it.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['fill-complete'] === false) return false
    return true
  },
}

/** Exact correctness of a single blank, per its type and answer entry. */
function isBlankCorrect(type, entry, submitted) {
  switch (type) {
    case 'text': {
      const accepted = entry.accepted.map(normalizeTextAnswer)
      return accepted.includes(normalizeTextAnswer(submitted))
    }
    case 'number': {
      const n = parseNumericValue(submitted)
      if (Number.isNaN(n)) return false
      if (entry.min !== undefined && entry.max !== undefined) {
        return n >= entry.min && n <= entry.max
      }
      const tolerance =
        typeof entry.tolerance === 'number' && entry.tolerance >= 0 ? entry.tolerance : 0
      return Math.abs(n - entry.value) <= tolerance
    }
    case 'expression': {
      const accepted = entry.accepted.map(normalizeExpression)
      return accepted.includes(normalizeExpression(submitted))
    }
    default:
      return false
  }
}

/**
 * Registers the fill-complete plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerFillComplete(engine) {
  return engine.register(fillCompletePlugin)
}

export default fillCompletePlugin
