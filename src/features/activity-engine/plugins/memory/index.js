/**
 * Activity Engine — memory plugin entry (Task 4.11).
 *
 * Public surface for the eighth production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

export {
  memoryPlugin,
  registerMemory,
  validateMemoryAnswer,
} from './plugin.js'
export {
  shuffleList,
  groupSizeRange,
  createMemoryState,
  isMemorizing,
  isRecalling,
  minGroupSize,
  maxGroupSize,
  startRecall,
  canReviewAgain,
  reviewAgain,
  placedCardIds,
  remainingCardIds,
  toggleCard,
  selectedIds,
  canPlaceGroup,
  placeGroup,
  removeGroup,
  clearSelection,
  clear,
  reset,
  isComplete,
  buildResponse,
} from './memory-controller.js'
export { MemoryActivity } from './MemoryActivity.jsx'

export default { memoryPlugin, MemoryActivity, registerMemory }