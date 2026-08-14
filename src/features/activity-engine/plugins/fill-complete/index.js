/**
 * Activity Engine — fill-complete plugin entry (Task 4.8).
 *
 * Public surface for the fifth production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

import { fillCompletePlugin, registerFillComplete } from './plugin.js'

export {
  fillCompletePlugin,
  registerFillComplete,
  validateBlankAnswers,
  normalizeTextAnswer,
  normalizeExpression,
  parseNumericValue,
} from './plugin.js'
export {
  createFillState,
  setBlankValue,
  getBlankValue,
  clearBlank,
  resetFill,
  isBlankAnswered,
  isComplete,
  answeredCount,
  buildResponse,
} from './fill-complete-controller.js'
export { FillCompleteActivity } from './FillCompleteActivity.jsx'

export default { fillCompletePlugin, FillCompleteActivity, registerFillComplete }