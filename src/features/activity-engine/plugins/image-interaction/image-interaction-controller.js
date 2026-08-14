/**
 * Activity Engine — image-interaction interaction controller (Task 4.9).
 *
 * Pure, framework-free state logic for the image-interaction renderer. All
 * interaction paths (tap toggling, label select/place/move/remove, clearing,
 * resetting) reduce to the same high-level operations, so the interaction
 * rules are unit-testable in Node without a DOM.
 *
 * Two modes (per the Task 3.2 payload schema):
 *
 *   - tap:   the student taps hotspots on the image. A tap is recorded as the
 *            normalized percentage coordinate (x, y) of the pointer at the
 *            moment of selection, together with the hotspot it hit. Re-tapping
 *            an already-selected hotspot removes it (toggle), so accidental
 *            duplicate selections cannot occur.
 *   - label: the student picks a label, then places it on a hotspot. A label
 *            is placed on exactly one hotspot; it can be moved or returned to
 *            the tray. Completion requires every label to be placed.
 *
 * Coordinates use the schema's normalized percentage system (x, y in [0, 100],
 * relative to the displayed image), so hit-testing stays correct when the
 * image resizes responsively. `toPercentCoordinates` converts a pointer event
 * against a display bounding rect into that system — the function is pure
 * (it takes the rect as an argument), so it is DOM-free and unit-testable.
 *
 * Controller state keeps ONLY the student's interaction. No correct answer,
 * no expected hotspot ids, no expected coordinates, no correctness flags ever
 * live here.
 */

/** Converts a pointer position into normalized percentage coordinates. */
export function toPercentCoordinates(clientX, clientY, rect = {}) {
  const { left = 0, top = 0, width = 0, height = 0 } = rect
  if (width <= 0 || height <= 0) return { x: 0, y: 0 }
  const clamp = (value) => Math.min(100, Math.max(0, value))
  return {
    x: clamp(((clientX - left) / width) * 100),
    y: clamp(((clientY - top) / height) * 100),
  }
}

/**
 * Aspect-corrected hit test for one hotspot against a normalized point.
 *
 * The schema defines circle `radius` as "% of image width" while `y` is "% of
 * image height"; to keep the hit region a true circle in display space the
 * vertical offset is rescaled by the image aspect ratio. Rectangle hotspots
 * are hit-tested directly in normalized space (`width` "% of image width",
 * `height` "% of image height").
 *
 * @param {object} hotspot - payload hotspot { id, x, y, shape, radius?, width?, height? }
 * @param {number} x - normalized x in [0, 100]
 * @param {number} y - normalized y in [0, 100]
 * @param {number} imageWidth - natural image width in pixels
 * @param {number} imageHeight - natural image height in pixels
 * @returns {boolean}
 */
export function hitTestPoint(hotspot, x, y, imageWidth, imageHeight) {
  const hotspotX = Number(hotspot?.x)
  const hotspotY = Number(hotspot?.y)
  if (!Number.isFinite(hotspotX) || !Number.isFinite(hotspotY)) return false
  const dx = x - hotspotX
  const dy = y - hotspotY
  if (hotspot?.shape === 'rect') {
    const halfW = (Number(hotspot?.width) || 0) / 2
    const halfH = (Number(hotspot?.height) || 0) / 2
    return Math.abs(dx) <= halfW && Math.abs(dy) <= halfH
  }
  const radius = Number(hotspot?.radius) || 0
  const width = Number(imageWidth) > 0 ? Number(imageWidth) : 1
  const height = Number(imageHeight) > 0 ? Number(imageHeight) : 1
  const dyScaled = dy * (height / width)
  return dx * dx + dyScaled * dyScaled <= radius * radius
}

/**
 * Creates an interaction state.
 *
 * @param {object} opts
 * @param {'tap'|'label'} opts.mode
 * @param {Array<{ id: string }>} [opts.hotspotDefs] - safe hotspot metadata (tap mode)
 * @param {Array<{ id: string, text: string }>} [opts.labelDefs] - public labels (label mode)
 * @returns {object} immutable interaction state
 */
export function createImageInteractionState({ mode = 'tap', hotspotDefs = [], labelDefs = [] } = {}) {
  return {
    mode,
    selections: [], // tap: [{ hotspotId, x, y }], selection order, one per selected hotspot
    pendingLabelId: null, // label: label selected but not yet placed
    placements: [], // label: [{ labelId, hotspotId }]
    hotspotDefs,
    labelDefs,
  }
}

/** Finds the first payload hotspot containing a normalized point (payload order). */
export function findHotspotAtPoint(hotspotDefs, x, y, imageWidth, imageHeight) {
  for (const hotspot of hotspotDefs) {
    if (hitTestPoint(hotspot, x, y, imageWidth, imageHeight)) return hotspot
  }
  return null
}

// ---------------------------------------------------------------------------
// Tap mode
// ---------------------------------------------------------------------------

/** True when the hotspot is currently selected. */
export function isHotspotSelected(state, hotspotId) {
  return state.selections.some((s) => s.hotspotId === hotspotId)
}

/**
 * Toggles a hotspot's selected state. Selecting records the normalized tap
 * coordinate (replacing any previous coordinate for the same hotspot);
 * re-selecting removes the selection. Unknown hotspot ids are no-ops.
 */
export function toggleTap(state, hotspotId, x, y) {
  if (!state.hotspotDefs.some((h) => h.id === hotspotId)) return state
  if (isHotspotSelected(state, hotspotId)) {
    return {
      ...state,
      selections: state.selections.filter((s) => s.hotspotId !== hotspotId),
    }
  }
  return {
    ...state,
    selections: [...state.selections, { hotspotId, x, y }],
  }
}

/** Records a selection without toggling (no-op when already selected). */
export function selectHotspot(state, hotspotId, x, y) {
  if (isHotspotSelected(state, hotspotId)) return state
  return toggleTap(state, hotspotId, x, y)
}

/** Removes one selection (same as toggling off). */
export function clearTap(state, hotspotId) {
  if (!isHotspotSelected(state, hotspotId)) return state
  return {
    ...state,
    selections: state.selections.filter((s) => s.hotspotId !== hotspotId),
  }
}

/** Number of selected hotspots. */
export function selectedCount(state) {
  return state.selections.length
}

// ---------------------------------------------------------------------------
// Label mode
// ---------------------------------------------------------------------------

/** Selects a label for placement (toggle: selecting the same label deselects). */
export function selectLabel(state, labelId) {
  if (!state.labelDefs.some((l) => l.id === labelId)) return state
  return { ...state, pendingLabelId: state.pendingLabelId === labelId ? null : labelId }
}

/** The currently selected (pending) label id, or null. */
export function getPendingLabel(state) {
  return state.pendingLabelId
}

/** Clears the pending label selection. */
export function clearPendingLabel(state) {
  if (state.pendingLabelId === null) return state
  return { ...state, pendingLabelId: null }
}

/** True when the label currently has a placement. */
export function isLabelPlaced(state, labelId) {
  return state.placements.some((p) => p.labelId === labelId)
}

/** The hotspot id a label is placed on, or null. */
export function getPlacement(state, labelId) {
  const placement = state.placements.find((p) => p.labelId === labelId)
  return placement ? placement.hotspotId : null
}

/**
 * Places a label on a hotspot (upsert: moving an already-placed label replaces
 * its target; the previous target becomes available again). Unknown ids are
 * no-ops. A placed label is removed from the pending selection.
 */
export function placeLabel(state, labelId, hotspotId) {
  if (!state.labelDefs.some((l) => l.id === labelId)) return state
  if (!state.hotspotDefs.some((h) => h.id === hotspotId)) return state
  const pendingLabelId = state.pendingLabelId === labelId ? null : state.pendingLabelId
  const existing = state.placements.some((p) => p.labelId === labelId)
  return {
    ...state,
    pendingLabelId,
    placements: existing
      ? state.placements.map((p) => (p.labelId === labelId ? { labelId, hotspotId } : p))
      : [...state.placements, { labelId, hotspotId }],
  }
}

/** Replaces an existing placement (no-op for unplaced/unknown labels). */
export function moveLabel(state, labelId, hotspotId) {
  if (!isLabelPlaced(state, labelId)) return state
  return placeLabel(state, labelId, hotspotId)
}

/** Removes a placement, returning the label to the tray. */
export function removePlacement(state, labelId) {
  if (!isLabelPlaced(state, labelId)) return state
  return { ...state, placements: state.placements.filter((p) => p.labelId !== labelId) }
}

/** Number of placed labels. */
export function placedCount(state) {
  return state.placements.length
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/** Clears all interaction state back to the initial empty state. */
export function clearInteraction(state) {
  return {
    ...state,
    selections: [],
    pendingLabelId: null,
    placements: [],
  }
}

/** Alias of `clearInteraction` for symmetric naming. */
export function resetInteraction(state) {
  return clearInteraction(state)
}

/**
 * Completion gate. Tap mode: at least one hotspot selected (the client cannot
 * know how many are required — that is server-only). Label mode: every label
 * placed.
 */
export function isComplete(state) {
  if (state.mode === 'label') {
    return state.labelDefs.length > 0 && state.placements.length === state.labelDefs.length
  }
  return state.selections.length > 0
}

/**
 * Serializes the schema-compatible response.
 *
 *   - tap:   `{ taps: [{ x, y }] }` — the normalized coordinates of each
 *            distinct selection, in selection order. The server independently
 *            re-maps every tap to its hotspot via the payload geometry.
 *   - label: `{ placements: [{ labelId, hotspotId }] }` — one entry per label
 *            in payload order (completion guarantees all labels are present).
 */
export function buildResponse(state) {
  if (state.mode === 'label') {
    const byLabelId = new Map(state.placements.map((p) => [p.labelId, p.hotspotId]))
    return {
      placements: state.labelDefs.map((label) => ({
        labelId: label.id,
        hotspotId: byLabelId.get(label.id),
      })),
    }
  }
  return { taps: state.selections.map(({ x, y }) => ({ x, y })) }
}

export default {
  toPercentCoordinates,
  hitTestPoint,
  findHotspotAtPoint,
  createImageInteractionState,
  isHotspotSelected,
  toggleTap,
  selectHotspot,
  clearTap,
  selectedCount,
  selectLabel,
  getPendingLabel,
  clearPendingLabel,
  isLabelPlaced,
  getPlacement,
  placeLabel,
  moveLabel,
  removePlacement,
  placedCount,
  clearInteraction,
  resetInteraction,
  isComplete,
  buildResponse,
}
