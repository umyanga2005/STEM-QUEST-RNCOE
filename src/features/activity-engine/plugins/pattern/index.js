/**
 * Activity Engine — pattern plugin entry (Task 4.10).
 *
 * Public surface for the seventh production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

import { patternPlugin, registerPattern } from './plugin.js'
import { PatternActivity } from './PatternActivity.jsx'

export {
  patternPlugin,
  registerPattern,
  validatePatternAnswer,
} from './plugin.js'
export {
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
} from './pattern-controller.js'
export { PatternActivity } from './PatternActivity.jsx'

export default { patternPlugin, PatternActivity, registerPattern }