/**
 * Activity Engine — find-word plugin entry (Task 9).
 *
 * Public surface: the plugin object (7 methods), the pure grid/scoring
 * controller, the React renderer, and a registration helper that wires the
 * plugin into an engine facade.
 */

import { findWordPlugin, registerFindWord } from './plugin.js'
import { FindWordActivity } from './FindWordActivity.jsx'

export { findWordPlugin, registerFindWord } from './plugin.js'
export {
  cellsBetween,
  wordAlongPath,
  placementSpells,
  validateFindWordAnswer,
  scoreSelections,
} from './find-word-controller.js'
export { FindWordActivity } from './FindWordActivity.jsx'

export default { findWordPlugin, FindWordActivity, registerFindWord }
