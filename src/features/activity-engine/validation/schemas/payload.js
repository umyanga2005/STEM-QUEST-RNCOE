/**
 * Activity Engine — payload schema loading (Task 4.1, report §5).
 *
 * Client-safe: these schemas describe the *student-visible* payload and carry
 * no correct-answer data. They are statically imported so the same module
 * works in the Node dev/test environment, the Vite dev server, and a
 * production build.
 */

import dragDrop from '../../../../../schemas/activities/drag-drop/payload.schema.json' with { type: 'json' }
import fillComplete from '../../../../../schemas/activities/fill-complete/payload.schema.json' with { type: 'json' }
import imageInteraction from '../../../../../schemas/activities/image-interaction/payload.schema.json' with { type: 'json' }
import matching from '../../../../../schemas/activities/matching/payload.schema.json' with { type: 'json' }
import memory from '../../../../../schemas/activities/memory/payload.schema.json' with { type: 'json' }
import numberLogic from '../../../../../schemas/activities/number-logic/payload.schema.json' with { type: 'json' }
import ordering from '../../../../../schemas/activities/ordering/payload.schema.json' with { type: 'json' }
import pattern from '../../../../../schemas/activities/pattern/payload.schema.json' with { type: 'json' }
import scenario from '../../../../../schemas/activities/scenario/payload.schema.json' with { type: 'json' }
import sorting from '../../../../../schemas/activities/sorting/payload.schema.json' with { type: 'json' }

import ids from '../../../../../schemas/common/ids.schema.json' with { type: 'json' }
import media from '../../../../../schemas/common/media.schema.json' with { type: 'json' }

/**
 * All registered payload schemas, keyed by activity type.
 * @type {Record<string, object>}
 */
export const PAYLOAD_SCHEMAS = Object.freeze({
  'drag-drop': dragDrop,
  'fill-complete': fillComplete,
  'image-interaction': imageInteraction,
  matching,
  memory,
  'number-logic': numberLogic,
  ordering,
  pattern,
  scenario,
  'scenario-challenge': scenario,
  sorting,
})

/** Common schemas referenced via $ref by activity schemas. */
export const COMMON_SCHEMAS = Object.freeze([ids, media])

/** Activity types with a registered payload schema. */
export const ACTIVITY_TYPES = Object.freeze(Object.keys(PAYLOAD_SCHEMAS))
