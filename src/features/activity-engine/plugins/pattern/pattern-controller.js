/**
 * Activity Engine — pattern interaction controller (Task 4.10).
 *
 * Pure, framework-free state logic for the pattern renderer. All interaction
 * paths (candidate selection, typed entry, clearing, resetting) reduce to the
 * same high-level operations, so the interaction rules are unit-testable in
 * Node without a DOM.
 *
 * Three interaction modes (per the Task 3.2 payload schema):
 *
 *   - construct-next:   the student constructs the NEXT `constructCount`
 *                       elements of the sequence (1..3 positions).
 *   - fill-missing:     the sequence has ONE hidden element at `missingAt`;
 *                       the student supplies the value for that slot.
 *   - complete-sequence:the student completes the sequence by appending the
 *                       NEXT element.
 *
 * The answer is expressed EITHER by selecting candidate(s) (a candidate bank)
 * or by typing a value. The two paths are mutually exclusive: selecting a
 * candidate clears any typed value, and typing clears the candidate selection.
 *
 *   - Candidate path: state.selected is the ordered list of chosen candidate
 *     ids (length = required units: constructCount for construct-next, else 1).
 *   - Typed path:     state.value is the raw (untrimmed) input string. The
 *     server is the authority on numeric/text parsing; the controller only
 *     tracks what was typed.
 *
 * The controller owns ONLY student interaction state. No correct answer, no
 * acceptable ids/values, no correctness flags, no score ever live here.
 */

/** trim + case-fold, the project's text normalization convention. */
export function normalizeTextAnswer(value) {
  return String(value).trim().toLowerCase()
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
 * Creates an interaction state.
 *
 * @param {object} opts
 * @param {'construct-next'|'fill-missing'|'complete-sequence'} opts.interaction
 * @param {Array<{ id: string }>} [opts.sequence] - public sequence elements
 * @param {Array<{ id: string }>} [opts.candidates] - public candidate bank
 * @param {number} [opts.constructCount] - construct-next: elements to construct
 * @returns {object} immutable interaction state
 */
export function createPatternState({
  interaction = 'complete-sequence',
  sequence = [],
  candidates = [],
  constructCount = 1,
} = {}) {
  const units = interaction === 'construct-next' ? constructCount : 1
  return {
    interaction,
    sequence,
    candidates,
    constructCount,
    units,
    selected: [], // candidate ids in selection order
    value: null, // raw typed value (string) or null
  }
}

/** Number of answer units the student must supply (completion gate target). */
export function requiredUnits(state) {
  return state.units
}

/** The ordered list of selected candidate ids. */
export function selectedIds(state) {
  return [...state.selected]
}

/**
 * Selects / deselects a candidate id.
 *
 * Rules (deterministic, unit-testable):
 *   - unknown ids are no-ops;
 *   - selecting an already-selected id deselects it (toggle);
 *   - single-unit modes keep at most one selection (a new pick replaces);
 *   - multi-unit modes append up to `units`; a pick when full replaces the
 *     most recent selection;
 *   - selecting a candidate clears any typed value (the two paths are
 *     mutually exclusive).
 */
export function selectCandidate(state, candidateId) {
  if (!state.candidates.some((c) => c.id === candidateId)) return state
  const next = state.value !== null ? { ...state, value: null } : state
  const selected = next.selected
  if (selected.includes(candidateId)) {
    return { ...next, selected: selected.filter((id) => id !== candidateId) }
  }
  if (next.units === 1) return { ...next, selected: [candidateId] }
  if (selected.length < next.units) {
    return { ...next, selected: [...selected, candidateId] }
  }
  return { ...next, selected: [...selected.slice(0, -1), candidateId] }
}

/** Removes one candidate from the selection (no-op when absent). */
export function deselectCandidate(state, candidateId) {
  if (!state.selected.includes(candidateId)) return state
  return { ...state, selected: state.selected.filter((id) => id !== candidateId) }
}

/** Clears the candidate selection (keeps any typed value). */
export function clearSelection(state) {
  if (state.selected.length === 0) return state
  return { ...state, selected: [] }
}

/**
 * Records a typed answer. Storing a string switches to the typed path and
 * clears any candidate selection. Non-string values are no-ops.
 */
export function setValue(state, value) {
  if (typeof value !== 'string') return state
  return { ...state, value, selected: [] }
}

/** The raw typed value, or null when the student used the candidate path. */
export function getValue(state) {
  return state.value
}

/**
 * Completion gate. The student has supplied the required units either by
 * selecting candidates (selected.length === units) or by typing a non-blank
 * value (numeric validity is decided server-side). The gate is deliberately
 * generous — it never knows how many selections are *correct*, only that the
 * interaction is complete enough to submit.
 */
export function isComplete(state) {
  if (state.value !== null && state.value.trim() !== '') return true
  return state.selected.length === state.units
}

/** Clears both interaction paths back to the initial empty state. */
export function clear(state) {
  return { ...state, selected: [], value: null }
}

/** Alias of `clear` for symmetric naming. */
export function reset(state) {
  return clear(state)
}

/**
 * Serializes the schema-compatible response.
 *
 *   - typed path:  `{ value: "8" }` — the trimmed raw string; the server
 *                  parses numeric values and is the authority on type.
 *   - candidate:   `{ selected: ["c1", "c2"] }` — the ordered chosen ids
 *                  (length = required units; completion guarantees it).
 */
export function buildResponse(state) {
  if (state.value !== null && state.value.trim() !== '') {
    return { value: state.value.trim() }
  }
  return { selected: [...state.selected] }
}

export default {
  normalizeTextAnswer,
  parseNumericValue,
  createPatternState,
  requiredUnits,
  selectedIds,
  selectCandidate,
  deselectCandidate,
  clearSelection,
  setValue,
  getValue,
  isComplete,
  clear,
  reset,
  buildResponse,
}
