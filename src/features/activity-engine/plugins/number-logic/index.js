/**
 * Activity Engine — number-logic plugin entry (Task 4.13).
 *
 * Public surface for the tenth and final production activity plugin: the
 * plugin object (7 methods), the pure interaction controller, the React
 * renderer, and a registration helper that wires the plugin into an engine
 * facade.
 */

export {
  numberLogicPlugin,
  registerNumberLogic,
  validateNumberLogicAnswer,
  parseNumericValue,
  parsePercentValue,
  reduceFraction,
  parseFractionString,
} from './plugin.js'
export {
  createNumberLogicState,
  setValue,
  setFraction,
  setSequenceElement,
  addSequenceElement,
  removeSequenceElement,
  setPartValue,
  setPartFraction,
  setPartSequenceElement,
  addPartSequenceElement,
  removePartSequenceElement,
  isComplete,
  clear,
  reset,
  buildResponse,
} from './number-logic-controller.js'
export { NumberLogicActivity } from './NumberLogicActivity.jsx'

export default { numberLogicPlugin, NumberLogicActivity, registerNumberLogic }