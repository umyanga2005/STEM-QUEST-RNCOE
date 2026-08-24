/**
 * Activity Engine — scenario-challenge plugin entry (Task 4.12).
 *
 * Public surface for the ninth production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

import { scenarioChallengePlugin, registerScenarioChallenge } from './plugin.js'
import { ScenarioChallengeActivity } from './ScenarioChallengeActivity.jsx'

export {
  scenarioChallengePlugin,
  registerScenarioChallenge,
  validateScenarioAnswer,
} from './plugin.js'
export {
  findDecision,
  findOption,
  createScenarioState,
  currentDecision,
  currentOptions,
  isComplete,
  pathTaken,
  stepCount,
  selectOption,
  lastOutcome,
  reset,
  buildResponse,
} from './scenario-challenge-controller.js'
export { ScenarioChallengeActivity } from './ScenarioChallengeActivity.jsx'

export default { scenarioChallengePlugin, ScenarioChallengeActivity, registerScenarioChallenge }