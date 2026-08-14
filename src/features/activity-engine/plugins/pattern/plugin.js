/**
 * Activity Engine — pattern plugin (Task 4.10).
 *
 * The seventh production activity plugin. Implements the 7-method plugin
 * contract for the `pattern` activity type against the Task 3.2 schema
 * contract (payload.schema.json + correct-answer.schema.json).
 *
 * Domain model:
 *   - payload.sequence[]       — 3..8 visible elements { id, text?|number?|shape?|image?, ariaLabel? }
 *   - payload.interaction      — "construct-next" | "fill-missing" | "complete-sequence"
 *   - payload.missingAt        — fill-missing: index of the hidden element (0..7)
 *   - payload.constructCount   — construct-next: how many NEXT elements the
 *                                student must construct (1..3)
 *   - payload.candidates[]     — 2..8-element construction bank (student-facing,
 *                                required for every mode by the schema)
 *   - correctAnswer.type       — "candidate" | "numeric" | "text"
 *   - correctAnswer.acceptableIds[] — candidate: the acceptable candidate ids
 *                                (MULTIPLE VALID SOLUTIONS are explicit: any
 *                                acceptable id earns full credit)
 *   - correctAnswer.value/tolerance|min/max — numeric: value±tolerance or range
 *   - correctAnswer.accepted[] — text: accepted normalized strings
 *   - correctAnswer.rule       — optional human-readable rule (feedback only)
 *
 * Pattern is SEQUENCE REASONING, not MCQ: the student must construct the next
 * element(s) (construct-next), fill the hidden element (fill-missing), or
 * complete the sequence by appending the next element (complete-sequence).
 * The student answers by selecting candidate(s) from the construction bank
 * OR by typing a value. The submitted response is `{ selected: [ids] }` or
 * `{ value }` — exactly what the controller's `buildResponse` emits.
 *
 * Answer units: construct-next → constructCount elements; the other modes are
 * a single element. Partial credit = correct answer units ÷ required units
 * (D-041/D-047, report §6: correctConstructed ÷ requiredCount). Plugins never
 * compute the final score (D-041).
 *
 * Multiple valid solutions: `acceptableIds` is a SET, so any acceptable
 * candidate earns full credit for its position(s). No fuzzy matching, no
 * inferred alternative rules — only explicitly authored acceptable answers
 * are valid.
 *
 * Security: correct-answer data never reaches the render path. `render` builds
 * a client-safe descriptor (visible sequence + mode + public candidate bank +
 * missingAt/constructCount) and never reads the correct-answer document. The
 * acceptable ids/values only flow through `validateAnswer` (server-only),
 * where the semantic port of the catalog rule
 * `pattern.acceptable-ids-exist` also runs.
 */

import { applySemanticRules, createSemanticRule } from '../../validation/semantic/index.js'
import { engineError } from '../../errors/index.js'
import { normalizeTextAnswer, parseNumericValue } from './pattern-controller.js'

/**
 * Payload-only semantic rules (authoring-time). The JSON Schema's
 * `uniqueItems` is pure deep-equality (two elements sharing an id with
 * different display data pass it), and `missingAt`'s schema bound (0..7) is
 * independent of the actual sequence length. These catch that meaning.
 */
const semanticRules = [
  createSemanticRule('pattern.sequence-ids-unique', (payload) => {
    const ids = payload.sequence.map((element) => element.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'sequence element ids must be unique', path: '/sequence' }
  }),
  createSemanticRule('pattern.candidate-ids-unique', (payload) => {
    const ids = payload.candidates.map((candidate) => candidate.id)
    return new Set(ids).size === ids.length
      ? true
      : { message: 'candidate ids must be unique', path: '/candidates' }
  }),
  createSemanticRule('pattern.sequence-candidates-disjoint', (payload) => {
    const sequenceIds = new Set(payload.sequence.map((e) => e.id))
    const overlap = payload.candidates.map((c) => c.id).filter((id) => sequenceIds.has(id))
    return overlap.length === 0
      ? true
      : { message: `sequence and candidate ids must not overlap (${overlap.join(', ')})`, path: '/candidates' }
  }),
  createSemanticRule('pattern.fill-missing-missing-at-in-range', (payload) => {
    if (payload.interaction !== 'fill-missing') return true
    return payload.missingAt >= 0 && payload.missingAt < payload.sequence.length
      ? true
      : {
          message: `missingAt ${payload.missingAt} is outside the sequence (length ${payload.sequence.length})`,
          path: '/missingAt',
        }
  }),
]

/**
 * Cross-document integrity checks ported from `schemas/validate.py`
 * `_check_pair` (pattern). This is the catalog rule
 * `pattern.acceptable-ids-exist` — acceptableIds must reference known
 * candidates, and missingAt must be in range — extended with the invariants
 * that make scoring honest:
 *
 *   - candidate type: every acceptable id must exist among payload candidates;
 *   - construct-next (candidate): full credit must be attainable — the
 *     acceptable set must be at least as large as constructCount;
 *   - construct-next (numeric/text): the schema can express a single value per
 *     answer, so multi-element construction cannot be numeric/text;
 *   - numeric: a (min, max) range must be ordered;
 *   - text: accepted strings must be non-blank after trimming.
 *
 * It needs both documents, so it runs server-side (in `validateAnswer`) and is
 * also exposed here for authoring tooling/tests.
 *
 * @param {object} payload - validated payload
 * @param {object} correctAnswer - server-only correct-answer document
 * @returns {Array<{ ruleId: string, message: string, path: string }>}
 */
export function validatePatternAnswer(payload, correctAnswer) {
  const errors = []
  const candidateIds = new Set((payload?.candidates ?? []).map((c) => c.id))
  const interaction = payload?.interaction

  if (correctAnswer?.type === 'candidate') {
    for (const id of correctAnswer.acceptableIds ?? []) {
      if (!candidateIds.has(id)) {
        errors.push({
          ruleId: 'pattern.acceptable-ids-exist',
          message: `acceptableIds reference unknown candidate "${id}"`,
          path: '/acceptableIds',
        })
      }
    }
    if (interaction === 'construct-next') {
      const count = payload?.constructCount ?? 1
      if ((correctAnswer.acceptableIds?.length ?? 0) < count) {
        errors.push({
          ruleId: 'pattern.construct-count-attainable',
          message:
            `constructCount ${count} exceeds the ${correctAnswer.acceptableIds?.length ?? 0} ` +
            'acceptable candidate(s); full credit would be impossible',
          path: '/acceptableIds',
        })
      }
    }
  }

  if (interaction === 'fill-missing') {
    const missingAt = payload?.missingAt
    if (
      typeof missingAt !== 'number' ||
      missingAt < 0 ||
      missingAt >= (payload?.sequence?.length ?? 0)
    ) {
      errors.push({
        ruleId: 'pattern.acceptable-ids-exist',
        message: `missingAt ${missingAt} is outside the sequence`,
        path: '/missingAt',
      })
    }
  }

  if (interaction === 'construct-next' && correctAnswer?.type !== 'candidate') {
    if ((payload?.constructCount ?? 1) !== 1) {
      errors.push({
        ruleId: 'pattern.construct-next-single-value',
        message:
          `a "${correctAnswer?.type}" answer is a single value and cannot serve a ` +
          `constructCount of ${payload?.constructCount}`,
        path: '/constructCount',
      })
    }
  }

  if (correctAnswer?.type === 'numeric') {
    if (correctAnswer.min !== undefined && correctAnswer.max !== undefined) {
      if (correctAnswer.min > correctAnswer.max) {
        errors.push({
          ruleId: 'pattern.numeric-range-valid',
          message: `numeric range min ${correctAnswer.min} exceeds max ${correctAnswer.max}`,
          path: '/min',
        })
      }
    }
  }

  if (correctAnswer?.type === 'text') {
    for (const accepted of correctAnswer.accepted ?? []) {
      if (normalizeTextAnswer(accepted) === '') {
        errors.push({
          ruleId: 'pattern.accepted-values-nonblank',
          message: 'accepted text values must be non-blank after trimming',
          path: '/accepted',
        })
      }
    }
  }

  return errors
}

export const patternPlugin = {
  type: 'pattern',
  name: 'Pattern',
  version: '1.0.0',
  schemaVersion: '1.0',

  /**
   * Client-safe render descriptor. Never contains correct-answer data — the
   * acceptable ids/values (`correctAnswer.*`) are never read here. The
   * descriptor carries the visible sequence, the interaction mode, and the
   * PUBLIC candidate bank (inherently student-facing), plus the public
   * missingAt/constructCount slot markers the renderer needs to build the
   * sequence surface. Which candidate/value is CORRECT is never revealed.
   * @returns {object} frozen descriptor consumed by the React renderer
   */
  render(ctx) {
    const question = ctx.question ?? {}
    const payload = question.payload ?? {}
    const interaction = payload.interaction ?? 'complete-sequence'
    const sequence = Array.isArray(payload.sequence) ? payload.sequence : []
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : []
    const toElement = (element) =>
      Object.freeze({
        id: element.id,
        number: typeof element.number === 'number' ? element.number : null,
        text: typeof element.text === 'string' ? element.text : '',
        shape: typeof element.shape === 'string' ? element.shape : null,
        imageRef: typeof element.image?.ref === 'string' ? element.image.ref : null,
        ariaLabel: typeof element.ariaLabel === 'string' ? element.ariaLabel : '',
      })

    return Object.freeze({
      kind: 'pattern',
      prompt: typeof question.prompt === 'string' ? question.prompt : '',
      instructions: typeof question.instructions === 'string' ? question.instructions : '',
      interaction,
      missingAt:
        interaction === 'fill-missing' && typeof payload.missingAt === 'number'
          ? payload.missingAt
          : null,
      constructCount:
        interaction === 'construct-next' && typeof payload.constructCount === 'number'
          ? payload.constructCount
          : null,
      units: interaction === 'construct-next' ? payload.constructCount ?? 1 : 1,
      sequence: Object.freeze(sequence.map(toElement)),
      candidates: Object.freeze(candidates.map(toElement)),
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
   * (`validatePatternAnswer`) throw `ACTIVITY_PAYLOAD_SEMANTIC_INVALID` —
   * those are author bugs, never student mistakes. Every submission-shape or
   * reference failure throws `ACTIVITY_ANSWER_INVALID`.
   *
   * @returns {{ correct: boolean, detail: object }}
   * @throws {ActivityEngineError}
   */
  validateAnswer({ submission, payload, correctAnswer }) {
    const integrity = validatePatternAnswer(payload, correctAnswer)
    if (integrity.length > 0) {
      throw engineError.payloadSemanticInvalid('pattern', integrity)
    }

    const response = submission.response ?? {}
    const parsed = parseResponse(response)
    const units = payload.interaction === 'construct-next' ? payload.constructCount : 1
    const candidateById = new Map(payload.candidates.map((c) => [c.id, c]))

    switch (correctAnswer.type) {
      case 'candidate':
        return validateCandidateAnswer({ parsed, units, candidateById, correctAnswer, interaction: payload.interaction })
      case 'numeric':
        return validateNumericAnswer({ parsed, candidateById, correctAnswer, interaction: payload.interaction })
      case 'text':
        return validateTextAnswer({ parsed, candidateById, correctAnswer, interaction: payload.interaction })
      default:
        throw engineError.answerInvalid('pattern', 'unsupported correct-answer type')
    }
  },

  /**
   * Raw scoring inputs. Plugins never compute the final score (D-041). The
   * engine guards the fraction; the central scoring service does the
   * arithmetic. The evidence (submitted candidate ids/values with a per-unit
   * correctness flag) never carries the acceptable ids/values.
   */
  scoringInputs(ctx, validation) {
    const detail = validation.detail
    const required = detail?.required ?? 0
    const correctUnits = detail?.correctUnits ?? 0
    const metrics = ctx.submission.interactionMetrics
    return {
      correctnessFraction: required > 0 ? correctUnits / required : 0,
      scorableUnits: required,
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

  /** Learning-oriented feedback; never reveals the acceptable answer. */
  feedback(ctx, validation, state) {
    const detail = validation?.detail ?? {}
    const total = detail.required ?? 1
    const correctCount = detail.correctUnits ?? 0
    const fraction = total > 0 ? correctCount / total : 0
    const interaction = detail.mode ?? 'complete-sequence'
    const label =
      interaction === 'fill-missing'
        ? 'missing element'
        : interaction === 'construct-next'
          ? 'next element'
          : 'next element'

    if (ctx.submission?.state === 'timeout' || state === 'timeout') {
      return {
        state: 'timeout',
        title: 'Time is up',
        message: 'The clock ran out before you completed the sequence.',
        explanation: 'Time pressure can make spotting patterns harder.',
        guidance: 'Look for a repeating step — add, subtract, multiply, or an alternating position.',
      }
    }
    if (fraction === 1) {
      return {
        state: state ?? 'correct',
        title: 'Everything correct',
        message: `The ${label} you supplied completes the sequence.`,
        explanation: 'Your answer matches what the pattern expects.',
        guidance: 'Nice work — move on to the next challenge.',
      }
    }
    if (fraction > 0) {
      return {
        state: state ?? 'partial',
        title: 'Almost there',
        message: `${correctCount} of ${total} elements are correct.`,
        explanation: 'Part of your answer continues the pattern, part does not.',
        guidance:
          'Compare the step between consecutive elements, then check the element(s) you supplied again.',
      }
    }
    return {
      state: state ?? 'incorrect',
      title: 'Not quite',
      message: 'The element you supplied does not continue the pattern yet.',
      explanation: 'The answer does not match what the pattern expects.',
      guidance: 'Look for the rule that turns one element into the next, then try again.',
    }
  },

  /**
   * Availability decision. The activity is available by default; callers can
   * opt out per deployment via `featureFlags['pattern'] = false`. Candidate
   * choices are real buttons and typed entry uses native inputs, so a broad
   * range of devices and input methods can play it.
   */
  availableOn(ctx) {
    const flags = ctx.featureFlags ?? {}
    if (flags['pattern'] === false) return false
    return true
  },
}

/**
 * Response shape gate. The schema-compatible submission is EITHER
 * `{ selected: [ids] }` (candidate path) or `{ value }` (typed path). Both,
 * neither, malformed arrays, unexpected fields, and non-finite numbers are
 * rejected — a malformed or forged response is never coerced into a valid one.
 */
function parseResponse(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw engineError.answerInvalid('pattern', '`response` must be an object')
  }
  const keys = Object.keys(response)
  const unexpected = keys.filter((key) => key !== 'selected' && key !== 'value')
  if (unexpected.length > 0) {
    throw engineError.answerInvalid('pattern', `unexpected fields: ${unexpected.join(', ')}`)
  }
  const hasSelected = 'selected' in response
  const hasValue = 'value' in response
  if (!hasSelected && !hasValue) {
    throw engineError.answerInvalid('pattern', 'provide `selected` candidate ids or a `value`')
  }
  if (hasSelected && hasValue) {
    throw engineError.answerInvalid('pattern', 'answer must select candidates OR type a value, not both')
  }
  if (hasSelected) {
    if (!Array.isArray(response.selected)) {
      throw engineError.answerInvalid('pattern', '`response.selected` must be an array of candidate ids')
    }
    for (const id of response.selected) {
      if (typeof id !== 'string' || id.length === 0) {
        throw engineError.answerInvalid('pattern', 'each selected id must be a non-empty string')
      }
    }
    return { kind: 'selected', ids: response.selected }
  }
  if (typeof response.value !== 'string' && typeof response.value !== 'number') {
    throw engineError.answerInvalid('pattern', '`response.value` must be a string or a number')
  }
  if (typeof response.value === 'number' && !Number.isFinite(response.value)) {
    throw engineError.answerInvalid('pattern', '`response.value` must be finite')
  }
  return { kind: 'value', value: response.value }
}

/**
 * Candidate-type evaluation. Multiple valid solutions are explicit: a
 * submitted candidate is correct iff its id is in `acceptableIds`. The typed
 * path resolves a submitted value to the candidate(s) that display that value
 * — a value matching no candidate, or matching more than one, is rejected
 * (no silent coercion, no guessing).
 */
function validateCandidateAnswer({ parsed, units, candidateById, correctAnswer, interaction }) {
  let ids
  if (parsed.kind === 'selected') {
    ids = parsed.ids
  } else {
    const matches = []
    for (const candidate of candidateById.values()) {
      if (typeof candidate.number === 'number') {
        const typed = parseNumericValue(parsed.value)
        if (typed === candidate.number) matches.push(candidate.id)
      } else if (typeof candidate.text === 'string') {
        if (normalizeTextAnswer(candidate.text) === normalizeTextAnswer(parsed.value)) {
          matches.push(candidate.id)
        }
      }
    }
    if (matches.length === 0) {
      throw engineError.answerInvalid('pattern', 'a typed value must match one of the visible candidates')
    }
    if (matches.length > 1) {
      throw engineError.answerInvalid('pattern', 'the typed value matches more than one candidate')
    }
    ids = matches
  }

  if (ids.length !== units) {
    throw engineError.answerInvalid('pattern', `expected ${units} selected candidate(s), got ${ids.length}`)
  }
  const seen = new Set()
  for (const id of ids) {
    if (!candidateById.has(id)) {
      throw engineError.answerInvalid('pattern', `unknown candidate id "${id}"`)
    }
    if (seen.has(id)) {
      throw engineError.answerInvalid('pattern', `candidate "${id}" selected more than once`)
    }
    seen.add(id)
  }

  const acceptable = new Set(correctAnswer.acceptableIds)
  const correctUnits = ids.filter((id) => acceptable.has(id)).length
  return {
    correct: correctUnits === units,
    detail: {
      mode: interaction,
      answerType: 'candidate',
      required: units,
      correctUnits,
      submitted: ids.map((id) => ({ id, correct: acceptable.has(id) })),
    },
  }
}

/** Numeric-type evaluation (single value). Exact/tolerance/range, never fuzzy. */
function validateNumericAnswer({ parsed, candidateById, correctAnswer, interaction }) {
  let submittedValue
  if (parsed.kind === 'selected') {
    if (parsed.ids.length !== 1) {
      throw engineError.answerInvalid('pattern', 'a numeric answer is a single value')
    }
    const candidate = candidateById.get(parsed.ids[0])
    if (typeof candidate?.number !== 'number') {
      throw engineError.answerInvalid('pattern', 'the selected candidate has no numeric value')
    }
    submittedValue = candidate.number
  } else {
    submittedValue = parsed.value
  }

  const n = parseNumericValue(submittedValue)
  if (Number.isNaN(n)) {
    throw engineError.answerInvalid('pattern', '`value` must be a finite number')
  }
  let correct = false
  if (correctAnswer.min !== undefined && correctAnswer.max !== undefined) {
    correct = n >= correctAnswer.min && n <= correctAnswer.max
  } else {
    const tolerance =
      typeof correctAnswer.tolerance === 'number' && correctAnswer.tolerance >= 0
        ? correctAnswer.tolerance
        : 0
    correct = Math.abs(n - correctAnswer.value) <= tolerance
  }
  return {
    correct,
    detail: {
      mode: interaction,
      answerType: 'numeric',
      required: 1,
      correctUnits: correct ? 1 : 0,
      submitted: [{ value: submittedValue, correct }],
    },
  }
}

/** Text-type evaluation (single value). Trim + case-fold, exact, never fuzzy. */
function validateTextAnswer({ parsed, candidateById, correctAnswer, interaction }) {
  let submittedValue
  if (parsed.kind === 'selected') {
    if (parsed.ids.length !== 1) {
      throw engineError.answerInvalid('pattern', 'a text answer is a single value')
    }
    const candidate = candidateById.get(parsed.ids[0])
    if (typeof candidate?.text !== 'string') {
      throw engineError.answerInvalid('pattern', 'the selected candidate has no text value')
    }
    submittedValue = candidate.text
  } else {
    submittedValue = parsed.value
    if (typeof submittedValue !== 'string' || normalizeTextAnswer(submittedValue) === '') {
      throw engineError.answerInvalid('pattern', '`value` must be a non-blank string')
    }
  }

  const accepted = new Set(correctAnswer.accepted.map(normalizeTextAnswer))
  const correct = accepted.has(normalizeTextAnswer(submittedValue))
  return {
    correct,
    detail: {
      mode: interaction,
      answerType: 'text',
      required: 1,
      correctUnits: correct ? 1 : 0,
      submitted: [{ value: submittedValue, correct }],
    },
  }
}

/**
 * Registers the pattern plugin on an engine facade.
 * @param {object} engine - engine from `createClientActivityEngine()` /
 *                          `createServerActivityEngine()`
 * @returns {object} the same engine (chainable)
 */
export function registerPattern(engine) {
  return engine.register(patternPlugin)
}

export default patternPlugin
