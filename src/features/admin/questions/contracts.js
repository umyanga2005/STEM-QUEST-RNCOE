/**
 * Admin Question Builder — contracts (Task 5.10).
 *
 * The authoring envelope is the DB-backed version of the catalog envelope
 * (`schemas/common/question.schema.json`): the same field set, but using the
 * live `activity_types.slug` values (D-043/D-046) and the taxonomy stored in
 * `tags[]` as `topic:<slug>` / `subtopic:<slug>`. The builder never stores a
 * top-level `formatVersion` column — that belongs to the NDJSON import, not
 * the relational store. `activitySchemaVersion` mirrors the engine's
 * `schemaVersion` const for the chosen activity type.
 *
 * correctAnswer is SERVER-ONLY: it only ever appears inside a question draft
 * read/written by an authorized admin via this API, and never in any
 * student-facing payload (D-028). The client build never imports it.
 */

/** DB `activity_types.slug` values (0002 seed) — the builder's activity set. */
export const QUESTION_ACTIVITY_TYPES = Object.freeze([
  'drag-drop',
  'matching',
  'ordering',
  'sorting',
  'fill-complete',
  'find-word',
  'pattern',
  'memory',
  'scenario-challenge',
  'number-logic',
])

/** Lifecycle statuses the builder may write (D-044). */
export const QUESTION_WRITABLE_STATUSES = Object.freeze(['draft', 'archived'])

/** Review states recorded in `meta.review.state` (Task 5.13). */
export const QUESTION_REVIEW_STATES = Object.freeze(['pending', 'approved', 'rejected'])

/**
 * Admin lifecycle actions recorded in `admin_actions` (Task 5.13). One row
 * per lifecycle transition; `details` carries version/note context.
 */
export const QUESTION_LIFECYCLE_ACTIONS = Object.freeze([
  'QUESTION_CREATED',
  'QUESTION_EDITED',
  'QUESTION_SUBMITTED',
  'QUESTION_APPROVED',
  'QUESTION_REJECTED',
  'QUESTION_PUBLISHED',
  'QUESTION_ARCHIVED',
  'QUESTION_VERSION_CREATED',
])

/**
 * @typedef {object} QuestionDraft
 * @property {string} stream - stream slug (`science`…)
 * @property {number} level - level number 1..5
 * @property {string} activityType - one of QUESTION_ACTIVITY_TYPES
 * @property {string} activitySchemaVersion - engine schemaVersion (e.g. "1.0")
 * @property {string} prompt
 * @property {?string} instructions
 * @property {?string} explanation
 * @property {object} payload - activity payload (student-visible)
 * @property {object} correctAnswer - SERVER-ONLY authored answer
 * @property {?Array<{ level: number, text: string }>} hints
 * @property {?string} topic - taxonomy topic slug (stored as `topic:<slug>`)
 * @property {?string} subtopic - taxonomy subtopic slug (`subtopic:<slug>`)
 * @property {?string[]} tags - free tags (excluding topic:/subtopic: entries)
 * @property {number} gradeMin - 6..11
 * @property {number} gradeMax - 6..11, >= gradeMin
 * @property {number} difficulty - 1..5
 * @property {number} basePoints - 1..100
 * @property {?number} timerOverrideSeconds - 1..1800 or null
 * @property {?string} status - draft | archived (published is read-only here)
 * @property {?boolean} isFlagged
 * @property {?number} version
 * @property {?object} meta - authoring metadata (meta.schema.json shape)
 */

export default {
  QUESTION_ACTIVITY_TYPES,
  QUESTION_WRITABLE_STATUSES,
  QUESTION_REVIEW_STATES,
  QUESTION_LIFECYCLE_ACTIONS,
}