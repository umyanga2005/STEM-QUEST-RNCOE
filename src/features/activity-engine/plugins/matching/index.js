/**
 * Activity Engine — matching plugin entry (Task 4.5).
 *
 * Public surface for the second production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

import { matchingPlugin, registerMatching } from './plugin.js'
import { MatchingActivity } from './MatchingActivity.jsx'

export { matchingPlugin, registerMatching, validatePairs } from './plugin.js'
export {
  createMatchState,
  toggleSelect,
  chooseTarget,
  clearMatch,
  resetMatches,
  allMatched,
  buildResponse,
} from './matching-controller.js'
export { MatchingActivity } from './MatchingActivity.jsx'

export default { matchingPlugin, MatchingActivity, registerMatching }