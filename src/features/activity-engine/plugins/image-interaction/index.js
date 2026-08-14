/**
 * Activity Engine — image-interaction plugin entry (Task 4.9).
 *
 * Public surface for the sixth production activity plugin: the plugin object
 * (7 methods), the pure interaction controller, the React renderer, and a
 * registration helper that wires the plugin into an engine facade.
 */

import { imageInteractionPlugin, registerImageInteraction } from './plugin.js'

export {
  imageInteractionPlugin,
  registerImageInteraction,
  validateImageInteractionAnswer,
} from './plugin.js'
export {
  createImageInteractionState,
  toPercentCoordinates,
  hitTestPoint,
  findHotspotAtPoint,
  isHotspotSelected,
  toggleTap,
  selectHotspot,
  clearTap,
  selectedCount,
  selectLabel,
  getPendingLabel,
  clearPendingLabel,
  isLabelPlaced,
  getPlacement,
  placeLabel,
  moveLabel,
  removePlacement,
  placedCount,
  clearInteraction,
  resetInteraction,
  isComplete,
  buildResponse,
} from './image-interaction-controller.js'
export { ImageInteractionActivity } from './ImageInteractionActivity.jsx'

export default { imageInteractionPlugin, ImageInteractionActivity, registerImageInteraction }
