/**
 * Game Session — activity renderer registry (Task 5.3).
 *
 * Maps each of the ten activity types to its plugin React renderer. This is
 * the ONLY place the game shell touches the plugin components, and the map
 * passes ONLY the client-safe descriptor the server built
 * (`buildSafeRoundDescriptor`) plus the authored progressive hints — correct
 * answers never reach this boundary (D-021). Each plugin component shares the
 * same `onSubmit({ response, interactionMetrics })` contract.
 */

import { DragDropActivity } from '../../activity-engine/plugins/drag-drop/index.js'
import { MatchingActivity } from '../../activity-engine/plugins/matching/index.js'
import { OrderingActivity } from '../../activity-engine/plugins/ordering/index.js'
import { SortingActivity } from '../../activity-engine/plugins/sorting/index.js'
import { FillCompleteActivity } from '../../activity-engine/plugins/fill-complete/index.js'
import { ImageInteractionActivity } from '../../activity-engine/plugins/image-interaction/index.js'
import { PatternActivity } from '../../activity-engine/plugins/pattern/index.js'
import { MemoryActivity } from '../../activity-engine/plugins/memory/index.js'
import { ScenarioChallengeActivity } from '../../activity-engine/plugins/scenario-challenge/index.js'
import { NumberLogicActivity } from '../../activity-engine/plugins/number-logic/index.js'

export const ACTIVITY_RENDERERS = Object.freeze({
  'drag-drop': DragDropActivity,
  matching: MatchingActivity,
  ordering: OrderingActivity,
  sorting: SortingActivity,
  'fill-complete': FillCompleteActivity,
  'image-interaction': ImageInteractionActivity,
  pattern: PatternActivity,
  memory: MemoryActivity,
  'scenario-challenge': ScenarioChallengeActivity,
  'number-logic': NumberLogicActivity,
})

export const ACTIVITY_TYPES = Object.freeze(Object.keys(ACTIVITY_RENDERERS))

export function activityComponentFor(activityType) {
  return ACTIVITY_RENDERERS[activityType] ?? null
}

export default {
  ACTIVITY_RENDERERS,
  ACTIVITY_TYPES,
  activityComponentFor,
}