/**
 * Activity Engine — matching interaction controller (Task 4.5).
 *
 * Pure, framework-free state logic for the matching renderer. Pointer, touch,
 * and keyboard interactions all reduce to the same high-level operations, so
 * the matching rules are unit-testable in Node without a DOM:
 *
 *   - select a card (tap, click, Space/Enter)
 *   - attach the selected card to a target
 *   - detach a matched card (remove/reassign a match where allowed)
 *   - verify coverage before submit
 *
 * Every operation returns a new state object (immutability by spread), which
 * keeps the React renderer free of matching logic.
 */

export function createMatchState(leftIds) {
  const connections = {}
  for (const id of leftIds) connections[id] = null
  return { leftIds: [...leftIds], connections, selectedLeft: null }
}

/**
 * Toggle selection of a left card. Selecting a card that already has a match
 * reopens it so the learner can reassign the match.
 */
export function toggleSelect(state, leftId) {
  if (!state.leftIds.includes(leftId)) return state
  if (state.selectedLeft === leftId) return { ...state, selectedLeft: null }
  return { ...state, selectedLeft: leftId }
}

/**
 * Attach the selected left card to a target id (a right item or distractor).
 * No-op when nothing is selected. Returns the same reference when idle so
 * React can bail out of re-renders.
 */
export function chooseTarget(state, rightId) {
  if (state.selectedLeft === null) return state
  const connections = { ...state.connections, [state.selectedLeft]: rightId }
  return { ...state, connections, selectedLeft: null }
}

/** Detach a single match, leaving the card unconnected. */
export function clearMatch(state, leftId) {
  if (state.connections[leftId] === null || state.connections[leftId] === undefined) return state
  return { ...state, connections: { ...state.connections, [leftId]: null } }
}

/** Back to every card unconnected (used by the "Clear" affordance). */
export function resetMatches(state) {
  return createMatchState(state.leftIds)
}

/** True when every left card has a target connection (submit gate). */
export function allMatched(state) {
  return state.leftIds.every((id) => state.connections[id] !== null)
}

/** Materialize the response the engine expects. */
export function buildResponse(state) {
  return {
    connections: state.leftIds.map((leftId) => ({
      leftId,
      rightId: state.connections[leftId] ?? null,
    })),
  }
}

export default {
  createMatchState,
  toggleSelect,
  chooseTarget,
  clearMatch,
  resetMatches,
  allMatched,
  buildResponse,
}