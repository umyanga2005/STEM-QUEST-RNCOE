/**
 * Activity Engine — correct-answer schema loading (Task 4.1, report §5).
 *
 * SERVER-ONLY. These schemas describe the correct-answer document and must
 * never be imported from the client entry point. Keeping this module outside
 * the client import graph is what guarantees correct-answer data never
 * reaches the browser bundle (verified by the build-time check in the report).
 */

import dragDrop from '../../../../../schemas/activities/drag-drop/correct-answer.schema.json' with { type: 'json' }
import fillComplete from '../../../../../schemas/activities/fill-complete/correct-answer.schema.json' with { type: 'json' }
import imageInteraction from '../../../../../schemas/activities/image-interaction/correct-answer.schema.json' with { type: 'json' }
import matching from '../../../../../schemas/activities/matching/correct-answer.schema.json' with { type: 'json' }
import memory from '../../../../../schemas/activities/memory/correct-answer.schema.json' with { type: 'json' }
import numberLogic from '../../../../../schemas/activities/number-logic/correct-answer.schema.json' with { type: 'json' }
import ordering from '../../../../../schemas/activities/ordering/correct-answer.schema.json' with { type: 'json' }
import pattern from '../../../../../schemas/activities/pattern/correct-answer.schema.json' with { type: 'json' }
import scenario from '../../../../../schemas/activities/scenario/correct-answer.schema.json' with { type: 'json' }
import sorting from '../../../../../schemas/activities/sorting/correct-answer.schema.json' with { type: 'json' }

/**
 * All correct-answer schemas, keyed by activity type.
 * @type {Record<string, object>}
 */
export const CORRECT_ANSWER_SCHEMAS = Object.freeze({
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
