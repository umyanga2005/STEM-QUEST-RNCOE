/**
 * Activity Engine — sorting plugin entry (Task 4.7).
 *
 * Public surface for the fourth production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

import { sortingPlugin, registerSorting } from './plugin.js'
import { SortingActivity } from './SortingActivity.jsx'

export { sortingPlugin, registerSorting, validateAssignments } from './plugin.js'
export {
  createSortState,
  selectItem,
  assignItem,
  clearAssignment,
  resetSort,
  isAssigned,
  isComplete,
  buildResponse,
} from './sorting-controller.js'
export { SortingActivity } from './SortingActivity.jsx'

export default { sortingPlugin, SortingActivity, registerSorting }
