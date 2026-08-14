/**
 * Activity Engine — capability/availability context (Task 4.1, report §12 & §24).
 *
 * Availability is a boolean decision (`plugin.availableOn(context)`) based on
 * stream + level/grade + device + capability flags. Capabilities describe
 * what the current device/render session supports; they never make
 * screen-size-dependent decisions here.
 */

import { normalizeAvailabilityContext } from './contexts.js'

/**
 * Raw availability context accepted from the caller.
 *
 * @param {object} raw - `{ stream, level, grade, device, featureFlags, capabilities }`
 * @returns {object} frozen context
 */
export function normalizeAvailability(raw = {}) {
  return normalizeAvailabilityContext(raw)
}

/** Capability context passed to render (alias; see normalizeCapabilities). */
export { normalizeCapabilities } from './contexts.js'