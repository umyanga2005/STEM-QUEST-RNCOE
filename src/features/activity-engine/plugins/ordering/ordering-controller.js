/**
 * Activity Engine — ordering interaction controller (Task 4.6).
 *
 * Pure, framework-free state logic for the ordering renderer. Pointer drag,
 * tap/click, and keyboard (Up/Down) interactions all reduce to the same
 * high-level operations, so the ordering rules are unit-testable in Node
 * without a DOM:
 *
 *   - create an ordered sequence state
 *   - move an item to another position (anchor-guarded)
 *   - swap two free positions (anchor-guarded)
 *   - query whether a position/item is anchored
 *   - reset back to the initial display order
 *   - verify the sequence is complete (submit gate)
 *   - build the submission response the plugin expects
 *
 * Anchors are gameplay locks: an anchored item can never change position, an
 * anchored slot can never receive another item, and the resulting order always
 * preserves every anchor. Moving a free item across a locked anchor does not
 * disturb the anchor — only the free (non-anchored) positions are re-arranged.
 *
 * Every operation returns a new state object (immutability by spread), which
 * keeps the React renderer free of ordering logic.
 */

/**
 * Creates the ordering state. The controller works on an array of item ids
 * indexed by position; `anchors` is a list of { position, itemId } locks. The
 * initial `order` is the renderer's display order, and it is snapshotted as
 * the `seed` used by `reset` (anchors are pinned in place by construction).
 */
export function createOrderState(order, anchors = []) {
  const anchorMap = new Map(anchors.map((a) => [a.position, a.itemId]))
  const anchoredIds = new Set(anchorMap.values())
  const freePool = order.filter((id) => !anchoredIds.has(id))
  const seed = []
  let freeIndex = 0
  for (let position = 0; position < order.length; position += 1) {
    if (anchorMap.has(position)) {
      seed[position] = anchorMap.get(position)
    } else {
      seed[position] = freePool[freeIndex]
      freeIndex += 1
    }
  }
  return {
    order: [...seed],
    anchors: anchorMap,
    seed,
  }
}

function inRange(state, index) {
  return index >= 0 && index < state.order.length
}

/** Position (number) or item id (string) — returns true when anchor-locked. */
export function isAnchored(state, positionOrId) {
  if (typeof positionOrId === 'string') {
    return [...state.anchors.values()].includes(positionOrId)
  }
  return state.anchors.has(positionOrId)
}

/** True when a position may be used as a move source/target (not anchored). */
export function canMove(state, position) {
  return inRange(state, position) && !state.anchors.has(position)
}

/**
 * Moves the item at `fromPosition` to `toPosition`. Both must be free
 * (non-anchored) positions, otherwise it is a no-op. Moves re-arrange only the
 * free positions, so an anchor can never be moved, removed, or duplicated —
 * moving another item across a locked anchor leaves the anchor untouched.
 */
export function moveItem(state, fromPosition, toPosition) {
  if (
    fromPosition === toPosition ||
    !inRange(state, fromPosition) ||
    !inRange(state, toPosition) ||
    state.anchors.has(fromPosition) ||
    state.anchors.has(toPosition)
  ) {
    return state
  }
  const freePositions = freeSlots(state)
  const freeItems = freePositions.map((p) => state.order[p])
  const fromIdx = freePositions.indexOf(fromPosition)
  const toIdx = freePositions.indexOf(toPosition)
  const [moved] = freeItems.splice(fromIdx, 1)
  freeItems.splice(toIdx, 0, moved)
  return rebuildFree(state, freeItems)
}

/**
 * Swaps the items held by two free positions. Anchored positions are excluded:
 * if either side is locked (or indexes coincide) it is a no-op.
 */
export function swap(state, aPosition, bPosition) {
  if (
    aPosition === bPosition ||
    !inRange(state, aPosition) ||
    !inRange(state, bPosition) ||
    state.anchors.has(aPosition) ||
    state.anchors.has(bPosition)
  ) {
    return state
  }
  const order = [...state.order]
  ;[order[aPosition], order[bPosition]] = [order[bPosition], order[aPosition]]
  return { ...state, order }
}

/** Back to the initial display order (anchors preserved by construction). */
export function reset(state) {
  return { ...state, order: [...state.seed] }
}

/** True when every position holds an item (the submit gate). */
export function isComplete(state) {
  return state.order.length === state.order.filter(Boolean).length
}

/** Materialize the response the engine expects: a full id-per-position order. */
export function buildResponse(state) {
  return { order: [...state.order] }
}

/** Positions not locked by an anchor, in ascending order. */
function freeSlots(state) {
  return state.order
    .map((_, index) => index)
    .filter((index) => !state.anchors.has(index))
}

/** Rebuild `order` with anchored positions pinned and free items re-filled. */
function rebuildFree(state, freeItems) {
  const order = [...state.order]
  const free = freeSlots(state)
  free.forEach((position, i) => {
    order[position] = freeItems[i]
  })
  return { ...state, order }
}

export default {
  createOrderState,
  isAnchored,
  canMove,
  moveItem,
  swap,
  reset,
  isComplete,
  buildResponse,
}