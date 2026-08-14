/**
 * Activity Engine — fill-complete interaction controller (Task 4.8).
 *
 * Pure, framework-free state logic for the fill-complete renderer. All
 * interaction paths (typing, clearing, resetting) reduce to the same
 * high-level operations, so the blank-editing rules are unit-testable in
 * Node without a DOM:
 *
 *   - create a fill state from the safe blank definitions
 *   - set / update a blank's value
 *   - clear a single blank
 *   - reset back to the initial (all-empty) state
 *   - query answered/completion status
 *   - serialize the schema-compatible response
 *
 * Every operation returns a new state object (immutability by spread). State
 * keeps ONLY the student's typed values — no correctness information ever
 * lives here. Blank ids and payload order are preserved, so the serialized
 * response is deterministic and duplicate-free.
 */

/**
 * Creates a fill state. `blankDefs` is the safe render descriptor's `blanks`
 * array: `[{ id, type, label, prefix, suffix, maxLength }]` (only `id` and
 * `type` are required by the controller).
 *
 * @param {Array<{ id: string, type: string }>} blankDefs
 * @returns {{ entries: Array<{ id, type, value }> }}
 */
export function createFillState(blankDefs = []) {
  return {
    entries: blankDefs.map(({ id, type }) => ({ id, type, value: '' })),
  }
}

/**
 * Sets (or updates) a blank's value. Returns the same reference when the id
 * is unknown (no-op) so React can bail out of re-renders.
 */
export function setBlankValue(state, blankId, value) {
  if (!state.entries.some((entry) => entry.id === blankId)) return state
  const nextValue = value === null || value === undefined ? '' : String(value)
  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === blankId ? { ...entry, value: nextValue } : entry
    ),
  }
}

/** The current raw value of a blank ('' when unknown/empty). */
export function getBlankValue(state, blankId) {
  const entry = state.entries.find((e) => e.id === blankId)
  return entry ? entry.value : ''
}

/** Clears a single blank back to ''. No-op for unknown/already-empty blanks. */
export function clearBlank(state, blankId) {
  const entry = state.entries.find((e) => e.id === blankId)
  if (!entry || entry.value === '') return state
  return {
    ...state,
    entries: state.entries.map((e) =>
      e.id === blankId ? { ...e, value: '' } : e
    ),
  }
}

/** Back to every blank empty (used by the "Clear" affordance). */
export function resetFill(state) {
  return createFillState(state.entries)
}

/** True when the blank holds a non-whitespace value (an actual answer). */
export function isBlankAnswered(state, blankId) {
  const entry = state.entries.find((e) => e.id === blankId)
  return entry ? entry.value.trim().length > 0 : false
}

/** True when every blank is answered (submit gate). */
export function isComplete(state) {
  return state.entries.every((entry) => entry.value.trim().length > 0)
}

/** Number of answered blanks (progress display "3 / 5 completed"). */
export function answeredCount(state) {
  return state.entries.filter((entry) => entry.value.trim().length > 0).length
}

/**
 * Serializes the response the engine expects: `{ answers: [{ blankId, value }] }`,
 * one entry per blank in payload order — deterministic, no duplicate ids.
 */
export function buildResponse(state) {
  return {
    answers: state.entries.map(({ id, value }) => ({ blankId: id, value })),
  }
}

export default {
  createFillState,
  setBlankValue,
  getBlankValue,
  clearBlank,
  resetFill,
  isBlankAnswered,
  isComplete,
  answeredCount,
  buildResponse,
}
