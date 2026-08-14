/**
 * Activity Engine — ordering plugin entry (Task 4.6).
 *
 * Public surface for the third production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

import { orderingPlugin, registerOrdering } from './plugin.js'
import { OrderingActivity } from './OrderingActivity.jsx'

export { orderingPlugin, registerOrdering, validateSequence } from './plugin.js'
export {
  createOrderState,
  isAnchored,
  canMove,
  moveItem,
  swap,
  reset,
  isComplete,
  buildResponse,
} from './ordering-controller.js'
export { OrderingActivity } from './OrderingActivity.jsx'

export default { orderingPlugin, OrderingActivity, registerOrdering }
