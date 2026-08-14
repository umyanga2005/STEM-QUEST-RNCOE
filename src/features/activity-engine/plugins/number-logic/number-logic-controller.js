/**
 * Activity Engine — number-logic interaction controller (Task 4.13).
 *
 * Pure, framework-free state logic for the number-logic renderer. Number /
 * Logic Challenge is CONSTRUCTED ENTRY — the student must work out a value
 * (or sequence of values, or multi-step parts) and enter it, never pick from
 * visible choices. All interactions reduce to the same high-level operations,
 * so the interaction rules are unit-testable in Node without a DOM.
 *
 * The interaction follows the payload's `answerFormat`:
 *
 *   - integer / decimal / percent: one numeric input (percent shows a % suffix).
 *   - fraction:                    two numeric inputs joined by "/".
 *   - expression:                  one text input (scored against authored
 *                                  accepted forms; NO eval).
 *   - sequence:                    a dynamic list of numeric inputs the student
 *                                  extends with "Add value" (the expected count
 *                                  lives in the server's answer, so the student
 *                                  reads it from the problem text).
 *   - parts[]:                     multi-step; each part gets its own input
 *                                  surface (per-part partial credit).
 *
 * The controller owns ONLY student interaction state. No correct answer, no
 * accepted values, no tolerance, no correctness flags, no score ever live
 * here — those are server-only answer facts.
 *
 * The submitted response shape (schema-compatible, strict):
 *   - single-part (non-fraction, non-sequence):  `{ value: <string> }`
 *   - single-part fraction:                      `{ value: "3/4" }`
 *   - single-part sequence:                      `{ values: ["2","4","6"] }`
 *   - multi-part:                                `{ parts: [{ partId, value }] }`
 */

const SEQUENCE_MAX = 12

/** trim + collapse internal whitespace — the expression normalization convention. */
export function normalizeExpression(value) {
  return String(value).trim().replace(/\s+/g, ' ')
}

function blank(value) {
  return typeof value !== 'string' || value.trim() === ''
}

/** Creates a per-part interaction sub-state (mirrors the single-part shape). */
function createPartState(part) {
  return {
    id: part.id,
    answerFormat: part.answerFormat,
    raw: '',
    num: '',
    den: '',
    values: [],
  }
}

/**
 * Creates a fresh interaction state.
 *
 * @param {object} opts
 * @param {string} [opts.answerFormat] - top-level payload answerFormat
 * @param {Array<{ id: string, label: string, answerFormat: string }>} [opts.parts]
 * @returns {object} immutable interaction state
 */
export function createNumberLogicState({ answerFormat = 'integer', parts = [] } = {}) {
  if (Array.isArray(parts) && parts.length > 0) {
    return {
      multi: true,
      parts: parts.map(createPartState),
    }
  }
  return {
    multi: false,
    answerFormat,
    raw: '',
    num: '',
    den: '',
    values: [],
  }
}

/** True once the interaction holds enough entered value(s) to submit. */
export function isComplete(state) {
  if (state.multi) {
    return state.parts.every((part) => isPartComplete(part))
  }
  switch (state.answerFormat) {
    case 'fraction':
      return !blank(state.num) && !blank(state.den)
    case 'sequence':
      return (
        state.values.length >= 2 &&
        state.values.every((value) => !blank(value))
      )
    default:
      return !blank(state.raw)
  }
}

function isPartComplete(part) {
  switch (part.answerFormat) {
    case 'fraction':
      return !blank(part.num) && !blank(part.den)
    case 'sequence':
      return part.values.length >= 2 && part.values.every((value) => !blank(value))
    default:
      return !blank(part.raw)
  }
}

// ---------------------------------------------------------------------------
// single-part interactions
// ---------------------------------------------------------------------------

/** Records the raw entered value (integer/decimal/percent/expression). */
export function setValue(state, value) {
  if (state.multi || typeof value !== 'string') return state
  return { ...state, raw: value }
}

/** Records a fraction as two numeric strings (single-part fraction). */
export function setFraction(state, numerator, denominator) {
  if (state.multi || state.answerFormat !== 'fraction') return state
  if (typeof numerator !== 'string' || typeof denominator !== 'string') return state
  return { ...state, num: numerator, den: denominator }
}

/** Records one element of a single-part sequence (index-based). */
export function setSequenceElement(state, index, value) {
  if (state.multi || state.answerFormat !== 'sequence' || typeof value !== 'string') return state
  const values = [...state.values]
  values[index] = value
  return { ...state, values }
}

/** Appends an empty sequence slot (capped at the schema's 12-element bound). */
export function addSequenceElement(state) {
  if (state.multi || state.answerFormat !== 'sequence') return state
  if (state.values.length >= SEQUENCE_MAX) return state
  return { ...state, values: [...state.values, ''] }
}

/** Removes one sequence slot. */
export function removeSequenceElement(state, index) {
  if (state.multi || state.answerFormat !== 'sequence') return state
  return { ...state, values: state.values.filter((_, i) => i !== index) }
}

// ---------------------------------------------------------------------------
// multi-part interactions
// ---------------------------------------------------------------------------

function findPart(state, partId) {
  if (!state.multi) return null
  return state.parts.find((part) => part.id === partId) ?? null
}

function updatePart(state, partId, patch) {
  if (!state.multi) return state
  return {
    ...state,
    parts: state.parts.map((part) => (part.id === partId ? { ...part, ...patch } : part)),
  }
}

/** Records a raw value for a non-fraction, non-sequence part. */
export function setPartValue(state, partId, value) {
  const part = findPart(state, partId)
  if (!part || typeof value !== 'string') return state
  if (part.answerFormat === 'fraction' || part.answerFormat === 'sequence') return state
  return updatePart(state, partId, { raw: value })
}

/** Records a fraction for a fraction-typed part. */
export function setPartFraction(state, partId, numerator, denominator) {
  const part = findPart(state, partId)
  if (!part || part.answerFormat !== 'fraction') return state
  if (typeof numerator !== 'string' || typeof denominator !== 'string') return state
  return updatePart(state, partId, { num: numerator, den: denominator })
}

/** Records one element of a sequence-typed part. */
export function setPartSequenceElement(state, partId, index, value) {
  const part = findPart(state, partId)
  if (!part || part.answerFormat !== 'sequence' || typeof value !== 'string') return state
  const values = [...part.values]
  values[index] = value
  return updatePart(state, partId, { values })
}

/** Appends an empty slot to a sequence-typed part. */
export function addPartSequenceElement(state, partId) {
  const part = findPart(state, partId)
  if (!part || part.answerFormat !== 'sequence') return state
  if (part.values.length >= SEQUENCE_MAX) return state
  return updatePart(state, partId, { values: [...part.values, ''] })
}

/** Removes one slot from a sequence-typed part. */
export function removePartSequenceElement(state, partId, index) {
  const part = findPart(state, partId)
  if (!part || part.answerFormat !== 'sequence') return state
  return updatePart(state, partId, {
    values: part.values.filter((_, i) => i !== index),
  })
}

// ---------------------------------------------------------------------------
// clear / reset / serialize
// ---------------------------------------------------------------------------

/** Clears every entered value back to the initial empty state. */
export function clear(state) {
  if (state.multi) {
    return {
      ...state,
      parts: state.parts.map((part) => ({
        id: part.id,
        answerFormat: part.answerFormat,
        raw: '',
        num: '',
        den: '',
        values: [],
      })),
    }
  }
  return { ...state, raw: '', num: '', den: '', values: [] }
}

/** Alias of `clear` for symmetric naming. */
export function reset(state) {
  return clear(state)
}

/** Formats one part's entered value as the single `value` string. */
function formatPartValue(part) {
  if (part.answerFormat === 'fraction') {
    return `${part.num.trim()}/${part.den.trim()}`
  }
  if (part.answerFormat === 'sequence') {
    return part.values.map((value) => value.trim()).join(', ')
  }
  return part.raw.trim()
}

/**
 * Serializes the schema-compatible response (see module header). The renderer
 * gates submission on `isComplete`, so the serialized shape is complete; the
 * server re-validates every value (counts, types, ranges, tolerance) and is
 * the authority on correctness.
 */
export function buildResponse(state) {
  if (state.multi) {
    return {
      parts: state.parts.map((part) => ({
        partId: part.id,
        value: formatPartValue(part),
      })),
    }
  }
  switch (state.answerFormat) {
    case 'fraction':
      return { value: `${state.num.trim()}/${state.den.trim()}` }
    case 'sequence':
      return { values: state.values.map((value) => value.trim()) }
    default:
      return { value: state.raw.trim() }
  }
}

export default {
  createNumberLogicState,
  setValue,
  setFraction,
  setSequenceElement,
  addSequenceElement,
  removeSequenceElement,
  setPartValue,
  setPartFraction,
  setPartSequenceElement,
  addPartSequenceElement,
  removePartSequenceElement,
  isComplete,
  clear,
  reset,
  buildResponse,
  normalizeExpression,
}