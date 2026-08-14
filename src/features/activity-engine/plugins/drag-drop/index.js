/**
 * Activity Engine — drag-drop plugin entry (Task 4.2).
 *
 * Public surface for the first real activity plugin: the plugin object (7
 * methods), the React renderer, and a registration helper that wires the
 * plugin into an engine facade.
 */

import { dragDropPlugin, registerDragDrop } from './plugin.js'
import { DragDropActivity } from './DragDropActivity.jsx'

export { dragDropPlugin, registerDragDrop, validateMappings } from './plugin.js'
export { DragDropActivity } from './DragDropActivity.jsx'

export default { dragDropPlugin, DragDropActivity, registerDragDrop }
