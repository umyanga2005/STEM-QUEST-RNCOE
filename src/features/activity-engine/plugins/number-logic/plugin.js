/**
 * Activity Engine — number-logic plugin (Task 4.13).
 *
 * The tenth and final production activity plugin. Implements the 7-method
 * plugin contract for the `number-logic` activity type against the Task 3.2
 * schema contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.problem          — the authored challenge (1..300 chars)
 *   - payload.answerFormat     — integer | decimal | fraction | percent |
 *                                sequence | expression (student-facing format)
 *   - payload.inputMode        — numeric | text (default numeric)
 *   - payload.showWork         — boolean: offers a (non-scored) work surface
 *   - payload.parts[]          — optional multi-step parts { id, label,
 *                                answerFormat } enabling per-part credit
 *   - correctAnswer.type       — exact | tolerance | range | fraction |
 *                                percent | sequence | accepted-set
 *   - correctAnswer.value      — exact/tolerance/percent central value
 *   - correctAnswer.tolerance  — absolute tolerance: |a - value| <= tolerance
 *   - correctAnswer.min/max    — range bounds (inclusive)
 *   - correctAnswer.numerator/denominator — fraction (equivalents accepted via
 *                                lowest-term normalization)
 *   - correctAnswer.values[]   — sequence: element-wise comparison with
 *                                tolerance
 *   - correctAnswer.accepted[] — accepted-set: normalized string forms
 *                                (expression answers; NO eval)
 *   - correctAnswer.parts[]    — multi-step: per-part specs { partId, type, ... }
 *
 * Number / Logic Challenge is CONSTRUCTED ENTRY, not MCQ: the student must
 * work out the value(s) and type them. The submitted response is
 * `{ value }` / `{ values }` / `{ parts: [{ partId, value }] }` — exactly what
 * the controller's `buildResponse` emits. The server is the authority on
 * numeric parsing, tolerance/range, fraction reduction, and correctness.
 *
 * Scorable-unit model (one atomic value = one unit):
 *   - single value (exact/tolerance/range/fraction/percent/accepted-set): 1 unit
 *   - sequence:                            one unit per element
 *   - multi-part:                          the sum of each part's units
 *                                          (a sequence part contributes one
 *                                          unit per element)
 * Partial credit = correctUnits ÷ scorableUnits (D-041/D-047). Plugins never
 * compute the final score (D-041).
 *
 * Multiple valid answers are EXPLICIT: an `accepted-set` lists the accepted
 * string forms verbatim; fraction equivalents are accepted via lowest-term
 * normalization. No fuzzy matching, no eval, no inferred alternative rules.
 *
 * Security: correct-answer data never reaches the render path. `render`
 * carries only public payload content (problem, answerFormat, inputMode,
 * showWork, part labels). Correctness facts only flow through `validateAnswer`
 * (server-only), where the semantic port of the catalog rule
 * `number-logic.parts-match` (validate.py `_check_pair`) also runs.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'
import { normalizeExpression } from './number-logic-controller.js'

/**
 * ANSWER NORMALIZATION (Task 3.2 convention, exact — never fuzzy).
 *   - numeric:     trim + parse to a finite number; compared via the authored
 *                  tolerance (|a - value| <= tolerance) or the (min, max) range.
 *   - percent:     trim + optional trailing "%" stripped; the authored `value`
 *                  IS the percentage number (e.g. 50 means 50%).
 *   - fraction:    "a/b" form; both sides parsed and REDUCED to lowest terms
 *                  via integer GCD, so 6/8 == 3/4. Non-integer components are
 *                  an authoring error (lowest-term reduction needs integers).
 *   - expression:  whitespace normalization only (trim + collapse internal
 *                  whitespace). Accepted forms are listed explicitly — NO eval,
 *                  no symbolic equivalence.
 *   - sequence:    element-wise comparison with the answer's tolerance.
 */

/** trim + collapse internal whitespace for expression answers. */
export { normalizeExpression }

/** Parses a numeric answer from a number or a string. NaN = not a finite number. */
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

/** Parses a percent answer: trim, strip ONE optional trailing "%", then number. */
export function parsePercentValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value !== 'string') return NaN
  let trimmed = value.trim()
  if (trimmed.endsWith('%')) trimmed = trimmed.slice(0, -1).trim()
  return parseNumericValue(trimmed)
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Reduces a fraction to lowest terms. Returns null when the components are not
 * integers, when the denominator is zero, or when the string is not a
 * fraction form. The denominator sign is normalized to be positive.
 */
export function reduceFraction(numerator, denominator) {
  if (
    !Number.isInteger(numerator) ||
    !Number.isInteger(denominator) ||
    denominator === 0
  ) {
    return null
  }
  const sign = denominator < 0 ? -1 : 1
  const a = Math.abs(numerator)
  const b = Math.abs(denominator)
  const g = gcd(a, b) || 1
  return { num: (numerator / g) * sign, den: (denominator / g) * sign }
}

/**
 * Parses a submitted fraction string "a/b" (the controller emits this form).
 * Returns null when malformed (not two numeric parts, zero denominator).
 */
export function parseFractionString(value) {
  if (typeof value !== 'string') return null
  const parts = value.trim().split('/')
  if (parts.length !== 2) return null
  const num = Number(parts[0].trim())
  const den = Number(parts[1].trim())
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null
  return reduceFraction(num, den)
}

/** The correct-answer types compatible with each payload answerFormat. */
export const COMPATIBLE_TYPES = Object.freeze({
  integer: new Set(['exact', 'tolerance', 'range']),
  decimal: new Set(['exact', 'tolerance', 'range']),
  percent: new Set(['percent', 'exact', 'tolerance', 'range']),
  fraction: new Set(['fraction']),
  sequence: new Set(['sequence']),
  expression: new Set(['accepted-set']),
})

/**
 * Payload-only semantic rules (authoring-time). The JSON Schema's
 * `uniqueItems` is pure deep-equality (two parts sharing an id with different
 * labels/answerFormats pass it), so this catches that meaning.
 */
const semanticRules = [
  createSemanticRule('number-logic.part-ids-unique', (payload) => {
    if (!Array.isArray(payload.parts)) return true
    const ids = payload.parts.map((part) => part.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'part ids must be unique', path: '/parts' }
  }),
]

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (number-logic) — the catalog rules: a multi-part payload
 * requires a per-part correct answer (and vice versa), the answer-part ids
 * must match the payload part ids exactly, and each correct-answer type must
 * carry its required fields. Extended with the invariants that make scoring
 * honest:
 *
 *   - parts-match            — payload parts ⟺ answer parts, same id set;
 *   - answer-format-compatible — the answer type must be representable by the
 *                              payload's answerFormat (the student is told to
 *                              enter a fraction/sequence/expression, so the
 *                              scoring model must consume that form);
 *   - range-ordered          — a (min, max) range must be ordered;
 *   - tolerance-valid        — tolerance must be a finite number >= 0;
 *   - fraction-integer-components — fraction components must be integers
 *                              (lowest-term normalization needs them);
 *   - accepted-nonblank      — accepted-set forms must be non-blank after
 *                              whitespace normalization;
 *   - sequence-values-valid  — sequence values must be finite numbers;
 *   - numeric-fields-finite  — value/min/max must be finite numbers.
 *
 * It needs both documents, so it runs server-side (in `validateAnswer`) and is
 * also exposed here for authoring tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validateNumberLogicAnswer(payload, correctAnswer) {
  const errors = []

  const answerParts = Array.isArray(correctAnswer?.parts) ? correctAnswer.parts : []
  const payloadParts = Array.isArray(payload?.parts) ? payload.parts : []

  if (payloadParts.length === 0 && answerParts.length > 0) {
    errors.push({
      ruleId: 'number-logic.parts-match',
      message: 'correct-answer has parts but the payload is single-part',
      path: '/parts',
    })
  }
  if (payloadParts.length > 0 && answerParts.length === 0) {
    errors.push({
      ruleId: 'number-logic.parts-match',
      message: 'multi-part payload requires a per-part correct answer',
      path: '/parts',
    })
  }
  if (payloadParts.length > 0 && answerParts.length > 0) {
    const payloadIds = payloadParts.map((p) => p.id)
    const answerIds = answerParts.map((p) => p.partId)
    const answerSet = new Set(answerIds)
    if (
      answerIds.length !== payloadIds.length ||
      payloadIds.some((id) => !answerSet.has(id)) ||
      new Set(answerIds).size !== answerIds.length
    ) {
      errors.push({
        ruleId: 'number-logic.parts-match',
        message: 'correct-answer parts must match the payload parts exactly (ids and count)',
        path: '/parts',
      })
    }
    const partByFormat = new Map(payloadParts.map((p) => [p.id, p.answerFormat]))
    for (const part of answerParts) {
      validateAnswerSpec(part, partByFormat.get(part.partId), errors, `/parts/${part.partId}`)
    }
  }

  if (payloadParts.length === 0) {
    validateAnswerSpec(correctAnswer, payload?.answerFormat, errors, '/')
  }

  return errors
}

/** Validates one answer spec (top-level or per-part) against its format. */
function validateAnswerSpec(spec, answerFormat, errors, path) {
  const type = spec?.type
  if (!type) return
  const push = (ruleId, message) => errors.push({ ruleId, message, path })

  if (answerFormat && !COMPATIBLE_TYPES[answerFormat]?.has(type)) {
    push(
      'number-logic.answer-format-compatible',
      `answer type "${type}" is not representable by answerFormat "${answerFormat}"`
    )
  }
  if (type === 'range') {
    if (typeof spec.min !== 'number' || typeof spec.max !== 'number') {
      push('number-logic.type-fields', 'type range requires min and max')
    } else if (spec.min > spec.max) {
      push('number-logic.range-ordered', `range min ${spec.min} exceeds max ${spec.max}`)
    }
  }
  if (type === 'tolerance') {
    if (typeof spec.value !== 'number' || typeof spec.tolerance !== 'number') {
      push('number-logic.type-fields', 'type tolerance requires value and tolerance')
    } else if (spec.tolerance < 0) {
      push('number-logic.tolerance-valid', `tolerance must be >= 0 (got ${spec.tolerance})`)
    }
  }
  if (type === 'exact' || type === 'percent') {
    if (typeof spec.value !== 'number') {
      push('number-logic.type-fields', `type ${type} requires value`)
    }
  }
  if (type === 'fraction') {
    if (typeof spec.numerator !== 'number' || typeof spec.denominator !== 'number') {
      push('number-logic.type-fields', 'type fraction requires numerator and denominator')
    } else if (
      !Number.isInteger(spec.numerator) ||
      !Number.isInteger(spec.denominator)
    ) {
      push(
        'number-logic.fraction-integer-components',
        'fraction numerator and denominator must be integers for lowest-term normalization'
      )
    }
  }
  if (type === 'sequence') {
    if (!Array.isArray(spec.values) || spec.values.length === 0) {
      push('number-logic.type-fields', 'type sequence requires values')
    } else if (spec.values.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
      push('number-logic.sequence-values-valid', 'sequence values must be finite numbers')
    }
  }
  if (type === 'accepted-set') {
    if (!Array.isArray(spec.accepted) || spec.accepted.length === 0) {
      push('number-logic.type-fields', 'type accepted-set requires accepted')
    } else if (spec.accepted.some((form) => normalizeExpression(form) === '')) {
      push('number-logic.accepted-nonblank', 'accepted forms must be non-blank after normalization')
    }
  }
  if (spec?.tolerance !== undefined && (typeof spec.tolerance !== 'number' || spec.tolerance < 0)) {
    push('number-logic.tolerance-valid', `tolerance must be a finite number >= 0`)
  }
  for (const field of ['value', 'min', 'max']) {
    if (spec?.[field] !== undefined && (typeof spec[field] !== 'number' || !Number.isFinite(spec[field]))) {
      push('number-logic.numeric-fields-finite', `${field} must be a finite number`)
    }
  }
}

/** Client-safe view of a public part (payload metadata only). */
function partView(part) {
  return Object.freeze({
    id: part.id,
    label: typeof part.label === 'string' ? part.label : '',
    answerFormat: part.answerFormat,
  })
}

export const numberLogicPlugin = {
  type: 'number-logic',
  name: 'Number / Logic Challenge',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Carries PUBLIC payload content only: the
   * problem, the answer format, the input mode, the showWork flag, and the
   * public multi-step part labels. The hidden answer (type, value, tolerance,
   * min/max, numerator/denominator, values, accepted) is never read here.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}
    const parts = Array.isArray(payload.parts) ? payload.parts : []

    return Object.freeze({
      kind: 'number-logic',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      problem: typeof payload.problem === 'string' ? payload.problem : '',
      answerFormat: payload.answerFormat ?? 'integer',
      inputMode: payload.inputMode ?? 'numeric',
      showWork: payload.showWork === false ? false : true,
      parts: parts.length > 0 ? Object.freeze(parts.map(partView)) : null,
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
   * (`validateNumberLogicAnswer`) throw `ACTIVITY_PAYLOAD_SEMANTIC_INVALID` —
   * those are author bugs, never student mistakes. The submission must match
   * the exact response shape for the activity's structure (single `{ value }`,
   * sequence `{ values }`, or multi-part `{ parts }`), every referenced part
   * must be answered exactly once, and every value must be parseable for its
   * answer type — malformed, missing, extra, or forged responses are rejected
   * with `ACTIVITY_ANSWER_INVALID` (honest denominator, D-055).
   *
   * Correctness is decided ONLY by the authored answer model: exact equality,
   * the authored tolerance (`|a - value| <= tolerance`), the authored
   * (min, max) range, lowest-term fraction equality, percent with optional
   * "%", element-wise sequence tolerance, or explicit accepted forms.
   *
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError}
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validateNumberLogicAnswer(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('number-logic', integrity)
    }

    const multi = Array.isArray(payload.parts) && payload.parts.length > 0
    const parsed = parseResponse(submission.response, multi)
    const answerParts = Array.isArray(correctAnswer.parts) ? correctAnswer.parts : []

    let units = []
    if (multi) {
      units = validateMultiPart(parsed, payload.parts, answerParts)
    } else if (correctAnswer.type === 'sequence') {
      if (parsed.kind !== 'values') {
        throw engineError.answerInvalid('number-logic', 'a sequence answer must provide `values`')
      }
      units = evaluateUnit(correctAnswer, parsed.values, 'answer')
    } else {
      if (parsed.kind !== 'value') {
        throw engineError.answerInvalid('number-logic', 'a single-value answer must provide `value`')
      }
      units = evaluateUnit(correctAnswer, [parsed.value], 'answer')
    }

    const correctUnits = units.filter((unit) => unit.correct).length
    return {
      correct: correctUnits === units.length && units.length > 0,
      detail: Object.freeze({
        mode: multi ? 'multi' : 'single',
        answerType: correctAnswer.type,
        required: units.length,
        correctUnits,
        units: Object.freeze(units),
      }),
    }
  },

  /**
   * Raw scoring inputs. Partial credit = correctUnits ÷ scorableUnits
   * (one atomic value = one unit). The engine guards the fraction; the central
   * scoring service does the arithmetic. The evidence (per-unit submitted value
   * with a correctness flag) never carries the expected/accepted value.
   */
  scoringInputs(ctx, validation) {
    const detail = validation.detail
    const required = detail?.required ?? 0
    const correctUnits = detail?.correctUnits ?? 0
    const metrics = ctx.submission?.interactionMetrics ?? {}
    return {
      correctnessFraction: required > 0 ? correctUnits / required : 0,
      scorableUnits: required,
      correctUnits,
      attemptsUsed: metrics.attemptsUsed ?? 0,
      hintsUsed: metrics.hintsUsed ?? 0,
      interactionMetrics: metrics,
      evidence: detail?.units ?? null,
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

  /** Learning-oriented feedback; never reveals the expected values. */
  feedback(ctx, validation, state) {
    const detail = validation?.detail ?? {}
    const required = detail.required ?? 1
    const correctCount = detail.correctUnits ?? 0
    const fraction = required > 0 ? correctCount / required : 0
    const unit = required === 1 ? 'value' : 'values'

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you entered your answer.',
        explanation: 'Time pressure can make careful reasoning harder.',
        guidance: 'Work out the relationship first, then type the value you are sure about.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Everything correct',
        message: 'Your answer matches the expected result.',
        explanation: 'Your value(s) satisfy the challenge exactly as authored.',
        guidance: 'Great reasoning — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${required} ${unit} are correct.`,
        explanation: 'Part of your answer is right; part does not satisfy the challenge yet.',
        guidance: 'Check each step of your working, then re-enter the value(s) that are off.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'Your answer does not match the expected result yet.',
      explanation: 'None of your value(s) satisfy the challenge as authored.',
      guidance: 'Re-read the problem, apply the relationship, and check your arithmetic.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['number-logic'] = false`. Entry
   * uses native form inputs and buttons, so touch, mouse, and keyboard all
   * work across devices.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['number-logic'] === false) return false
    return true
  },
}

/**
 * Response shape gate. The schema-compatible submission is EXACTLY ONE of:
 *   - `{ value }`         — single value (string or number)
 *   - `{ values }`        — sequence elements (array of strings/numbers)
 *   - `{ parts }`         — multi-part: [{ partId, value }]
 * Malformed shapes, more than one key, unexpected/forged fields (including
 * correctness/score/expected/accepted data) are rejected, never silently
 * coerced. `multi` is passed from the payload so a single-part response cannot
 * smuggle `parts` and a multi-part response must provide `parts`.
 */
function parseResponse(response, multi) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw engineError.answerInvalid('number-logic', '`response` must be an object')
  }
  const keys = Object.keys(response)
  if (keys.length !== 1) {
    throw engineError.answerInvalid(
      'number-logic',
      '`response` must contain exactly one of `value`, `values`, or `parts`'
    )
  }
  const key = keys[0]
  if (key === 'value') {
    if (multi) {
      throw engineError.answerInvalid('number-logic', 'a multi-part answer must provide `parts`')
    }
    const value = response.value
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw engineError.answerInvalid('number-logic', '`response.value` must be a string or a number')
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw engineError.answerInvalid('number-logic', '`response.value` must be finite')
    }
    return { kind: 'value', value: String(value).trim() }
  }
  if (key === 'values') {
    if (multi) {
      throw engineError.answerInvalid('number-logic', 'a multi-part answer must provide `parts`')
    }
    if (!Array.isArray(response.values) || response.values.length === 0) {
      throw engineError.answerInvalid('number-logic', '`response.values` must be a non-empty array')
    }
    if (response.values.length > 12) {
      throw engineError.answerInvalid('number-logic', '`response.values` exceeds the 12-element bound')
    }
    const values = response.values.map((value, index) => {
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw engineError.answerInvalid('number-logic', `element ${index + 1} must be a string or a number`)
      }
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw engineError.answerInvalid('number-logic', `element ${index + 1} must be finite`)
      }
      const trimmed = String(value).trim()
      if (trimmed === '') {
        throw engineError.answerInvalid('number-logic', `element ${index + 1} must not be blank`)
      }
      return trimmed
    })
    return { kind: 'values', values }
  }
  if (key === 'parts') {
    if (!multi) {
      throw engineError.answerInvalid('number-logic', 'a single-part answer cannot provide `parts`')
    }
    if (!Array.isArray(response.parts) || response.parts.length === 0) {
      throw engineError.answerInvalid('number-logic', '`response.parts` must be a non-empty array')
    }
    const parts = response.parts.map((part, index) => {
      if (!part || typeof part !== 'object' || Array.isArray(part)) {
        throw engineError.answerInvalid('number-logic', `part ${index + 1} must be an object`)
      }
      const partKeys = Object.keys(part)
      if (partKeys.length !== 2 || !partKeys.includes('partId') || !partKeys.includes('value')) {
        throw engineError.answerInvalid(
          'number-logic',
          `part ${index + 1} must contain exactly "partId" and "value"`
        )
      }
      if (typeof part.partId !== 'string' || part.partId.length === 0) {
        throw engineError.answerInvalid('number-logic', 'each partId must be a non-empty string')
      }
      const value = part.value
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw engineError.answerInvalid('number-logic', `value of part "${part.partId}" must be a string or a number`)
      }
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw engineError.answerInvalid('number-logic', `value of part "${part.partId}" must be finite`)
      }
      return { partId: part.partId, value: String(value).trim() }
    })
    return { kind: 'parts', parts }
  }
  throw engineError.answerInvalid('number-logic', `unexpected field "${key}"`)
}

/**
 * Validates a multi-part submission: every payload part answered exactly once
 * (unknown/duplicate/missing partIds are rejected), then each part evaluated
 * per its own answer spec. Returns the flattened atomic units.
 */
function validateMultiPart(parsed, payloadParts, answerParts) {
  const partByPayload = new Map(payloadParts.map((p) => [p.id, p]))
  const specByPart = new Map(answerParts.map((p) => [p.partId, p]))

  const seen = new Set()
  for (const entry of parsed.parts) {
    if (!partByPayload.has(entry.partId)) {
      throw engineError.answerInvalid('number-logic', `unknown part id "${entry.partId}"`)
    }
    if (seen.has(entry.partId)) {
      throw engineError.answerInvalid('number-logic', `part "${entry.partId}" answered more than once`)
    }
    seen.add(entry.partId)
  }
  for (const part of payloadParts) {
    if (!seen.has(part.id)) {
      throw engineError.answerInvalid('number-logic', `missing required answer for part "${part.id}"`)
    }
  }

  const units = []
  for (const entry of parsed.parts) {
    const spec = specByPart.get(entry.partId)
    const submitted = splitPartValue(spec, entry.value)
    units.push(...evaluateUnit(spec, submitted, entry.partId))
  }
  return units
}

/**
 * Splits a part's `value` string into the atomic submitted values. Sequence
 * parts are comma-separated ("2, 4, 6"); every other part is a single value.
 */
function splitPartValue(spec, value) {
  if (spec?.type === 'sequence') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
  }
  return [value]
}

/**
 * Evaluates one answer spec against the submitted atomic value(s).
 *
 * @param {object} spec - top-level or per-part correct-answer spec
 * @param {string[]} submitted - the submitted value(s) (strings)
 * @param {string} key - unit key prefix (partId, or "answer" for single-part)
 * @returns {Array<{ key, submitted, correct }>}
 * @throws {ActivityEngineError} when a value is not parseable for its type
 */
function evaluateUnit(spec, submitted, key) {
  const type = spec.type
  const requireNumeric = (value, label) => {
    const n = parseNumericValue(value)
    if (Number.isNaN(n)) {
      throw engineError.answerInvalid('number-logic', `${label} must be a finite number`)
    }
    return n
  }

  if (type === 'sequence') {
    if (submitted.length !== spec.values.length) {
      throw engineError.answerInvalid(
        'number-logic',
        `expected ${spec.values.length} sequence value(s), got ${submitted.length}`
      )
    }
    const tolerance = typeof spec.tolerance === 'number' ? spec.tolerance : 0
    return spec.values.map((expected, index) => {
      const n = requireNumeric(submitted[index], `sequence element ${index + 1}`)
      return {
        key: `${key}-element-${index + 1}`,
        submitted: submitted[index],
        correct: Math.abs(n - expected) <= tolerance,
      }
    })
  }

  const value = submitted[0]
  let correct = false
  switch (type) {
    case 'exact': {
      const n = requireNumeric(value, '`value`')
      correct = n === spec.value
      break
    }
    case 'tolerance': {
      const n = requireNumeric(value, '`value`')
      correct = Math.abs(n - spec.value) <= spec.tolerance
      break
    }
    case 'range': {
      const n = requireNumeric(value, '`value`')
      correct = n >= spec.min && n <= spec.max
      break
    }
    case 'percent': {
      const n = parsePercentValue(value)
      if (Number.isNaN(n)) {
        throw engineError.answerInvalid('number-logic', '`value` must be a percentage number')
      }
      const tolerance = typeof spec.tolerance === 'number' ? spec.tolerance : 0
      correct = Math.abs(n - spec.value) <= tolerance
      break
    }
    case 'fraction': {
      const reduced = parseFractionString(value)
      if (!reduced) {
        throw engineError.answerInvalid('number-logic', '`value` must be a fraction in "a/b" form')
      }
      const expected = reduceFraction(spec.numerator, spec.denominator)
      correct = reduced.num === expected.num && reduced.den === expected.den
      break
    }
    case 'accepted-set': {
      const normalized = normalizeExpression(value)
      if (normalized === '') {
        throw engineError.answerInvalid('number-logic', '`value` must not be blank')
      }
      correct = spec.accepted.some((form) => normalizeExpression(form) === normalized)
      break
    }
    default:
      throw engineError.answerInvalid('number-logic', 'unsupported correct-answer type')
  }
  return [{ key, submitted: value, correct }]
}

/**
 * Registers the number-logic plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerNumberLogic(engine) {
  return engine.register(numberLogicPlugin)
}

export default numberLogicPlugin