/**
 * Mission — selection state model (Task 5.2).
 *
 * PURE reducer-style state for the stream → level → begin flow. Kept outside
 * React so it is unit-testable and framework-free (mirrors the registration
 * controller pattern). The steps mirror the approved registration progress
 * strip: Register → Choose your stream → Begin the mission.
 *
 * Step graph:
 *   STREAMS --selectStream--> LEVELS --selectLevel--> READY
 *      ^                          |                        |
 *      +-------backToStreams------+    backToLevels -------+
 *
 * Selection never mutates server data; `selectLevel` refuses locked levels
 * (the API's `selectable` flag — the backend still re-checks entitlement).
 */

export const SELECTION_STEP = Object.freeze({
  STREAMS: 'streams',
  LEVELS: 'levels',
  READY: 'ready',
})

export function createInitialSelectionState() {
  return {
    step: SELECTION_STEP.STREAMS,
    selectedStreamId: null,
    selectedLevelId: null,
  }
}

/** Moves to the level picker for the chosen stream. */
export function selectStream(state, stream) {
  if (!stream?.id) return state
  return {
    step: SELECTION_STEP.LEVELS,
    selectedStreamId: Number(stream.id),
    selectedLevelId: null,
  }
}

/** Picks a level (must be selectable) and reaches the ready/begin step. */
export function selectLevel(state, level) {
  if (!level?.id || level.selectable === false) return state
  return {
    step: SELECTION_STEP.READY,
    selectedStreamId: state.selectedStreamId,
    selectedLevelId: Number(level.id),
  }
}

/** Back to the stream picker, discarding the level choice. */
export function backToStreams(_state) {
  return { ...createInitialSelectionState(), step: SELECTION_STEP.STREAMS }
}

/** Back to the level picker for the already-chosen stream. */
export function backToLevels(state) {
  if (state.selectedStreamId == null) return backToStreams(state)
  return { step: SELECTION_STEP.LEVELS, selectedStreamId: state.selectedStreamId, selectedLevelId: null }
}

/** True only when both a stream and a level are chosen. */
export function canBegin(state) {
  return state.step === SELECTION_STEP.READY && state.selectedStreamId != null && state.selectedLevelId != null
}

export default {
  SELECTION_STEP,
  createInitialSelectionState,
  selectStream,
  selectLevel,
  backToStreams,
  backToLevels,
  canBegin,
}