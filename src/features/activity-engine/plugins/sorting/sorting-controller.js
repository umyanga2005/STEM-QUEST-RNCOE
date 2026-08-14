/**
 * Activity Engine — sorting interaction controller (Task 4.7).
 *
 * Pure, framework-free state logic for the sorting renderer. Pointer,
 * touch, and keyboard interactions all reduce to the same high-level
 * operations, so the sorting rules are unit-testable in Node without a DOM:
 *
 *   - create a sorting state (unassigned tray + category targets)
 *   - select an item (tap/click, Space/Enter)
 *   - place/reassign the selected item into a category
 *   - clear an item's category
 *   - reset back to the initial (all-unassigned) state
 *   - verify coverage before submit
 *
 * Every operation returns a new state object (immutability by spread), which
 * keeps the React renderer free of sorting logic.
 */

export function createSortState(itemIds, categoryIds) {
  const assignment = {}
  for (const id of itemIds) assignment[id] = null
  return {
    itemIds: [...itemIds],
    categories: [...categoryIds],
    assignment,
    selectedItem: null,
  }
}

/** Toggle selection of an item. Selecting an assigned item reopens it. */
export function selectItem(state, itemId) {
  if (!state.itemIds.includes(itemId)) return state
  if (state.selectedItem === itemId) return { ...state, selectedItem: null }
  return { ...state, selectedItem: itemId }
}

/**
 * Place the selected item into `categoryId` (reassignment replaces any prior
 * category). No-op when nothing is selected or the category is unknown.
 * Returns the same reference when idle so React can bail out of re-renders.
 */
export function assignItem(state, categoryId) {
  if (state.selectedItem === null) return state
  if (!state.categories.includes(categoryId)) return state
  const assignment = { ...state.assignment, [state.selectedItem]: categoryId }
  return { ...state, assignment, selectedItem: null }
}

/** Clear a single item's category, leaving it unassigned in the tray. */
export function clearAssignment(state, itemId) {
  if (!state.itemIds.includes(itemId)) return state
  if (state.assignment[itemId] === null || state.assignment[itemId] === undefined) return state
  return { ...state, assignment: { ...state.assignment, [itemId]: null } }
}

/** Back to every item unassigned (used by the "Clear" affordance). */
export function resetSort(state) {
  return createSortState(state.itemIds, state.categories)
}

/** The category an item currently sits in, or null when unassigned. */
export function isAssigned(state, itemId) {
  return state.assignment[itemId] ?? null
}

/** True when every item has exactly one category (submit gate). */
export function isComplete(state) {
  return state.itemIds.every((id) => state.assignment[id] !== null)
}

/** Materialize the response the engine expects (schema-compatible). */
export function buildResponse(state) {
  return {
    assignments: state.itemIds.map((itemId) => ({
      itemId,
      categoryId: state.assignment[itemId] ?? null,
    })),
  }
}

export default {
  createSortState,
  selectItem,
  assignItem,
  clearAssignment,
  resetSort,
  isAssigned,
  isComplete,
  buildResponse,
}
