/**
 * Mission — repository contracts (Task 5.2).
 *
 * Domain-shape definitions and interface documentation only — no runtime
 * logic. In-memory and Supabase implementations both map to/from these
 * objects. Mirrors the 0001 migration columns for `streams`, `levels`,
 * `student_progress`, `student_level_progress` and `special_access` exactly
 * (no new tables, no schema changes, D-039 composite FKs respected).
 *
 * Access/progression data is READ-ONLY here: the backend (game-session
 * layer) remains the authority for what a student may actually play
 * (D-027/D-033). This layer only surfaces that state to the selection UI.
 */

/**
 * @typedef {object} Stream
 * @property {number} id
 * @property {string} slug - `science` | `technology` | `engineering` | `mathematics`
 * @property {string} name
 * @property {?string} description - student-friendly description (nullable)
 * @property {?string} themeColor - UI accent (nullable; frontend has slug fallbacks)
 * @property {number} displayOrder
 * @property {boolean} isActive
 */

/**
 * @typedef {object} Level
 * @property {number} id
 * @property {number} streamId - stream the level belongs to (composite FK, D-039)
 * @property {number} number - 1..5 (game difficulty tier, NOT grade)
 * @property {string} name - Beginner/Easy/Intermediate/Advanced/Hard
 * @property {boolean} isActive
 */

/**
 * @typedef {object} StreamProgressRow
 * @property {number} studentId
 * @property {number} streamId
 * @property {number} currentLevel - 1..5 aggregate
 * @property {number} completedLevels - 0..5
 * @property {boolean} streamCompleted
 */

/**
 * @typedef {object} LevelProgressRow
 * @property {number} studentId
 * @property {number} streamId
 * @property {number} levelId
 * @property {number} bestScore - 0..300
 * @property {number} attempts - number of completed sessions
 * @property {boolean} isCompleted
 * @property {?number} lastPlayedAt - epoch ms
 */

/**
 * @typedef {object} SpecialAccessGrant
 * @property {number} id
 * @property {number} studentId
 * @property {?number} streamId - stream-wide grant
 * @property {?number} levelId - level-specific grant (paired with streamId)
 * @property {boolean} isActive
 * @property {?number} expiresAt - epoch ms
 */

/**
 * @typedef {object} StreamRepository
 * @property {() => Promise<Stream[]>} listActive
 *           - active streams in display order.
 * @property {(id: number) => Promise<Stream|null>} findById
 */

/**
 * @typedef {object} LevelRepository
 * @property {(streamId: number) => Promise<Level[]>} listForStream
 *           - active levels for a stream, ordered by level number.
 */

/**
 * @typedef {object} ProgressRepository
 * @property {(studentId: number) => Promise<{ streamProgress: StreamProgressRow[], levelProgress: LevelProgressRow[] }>} getStudentProgress
 */

/**
 * @typedef {object} SpecialAccessRepository
 * @property {(studentId: number) => Promise<SpecialAccessGrant[]>} getActiveGrants
 */

export default {
  contracts: true,
}