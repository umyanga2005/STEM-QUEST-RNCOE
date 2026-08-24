/**
 * Progression — repository contracts (Task 5.5).
 *
 * Domain-shape definitions and interface documentation only — no runtime
 * logic. Mirrors the 0001 migration (student_progress / student_level_progress)
 * and keeps the ProgressionService persistence-agnostic (D-052). In-memory and
 * Supabase implementations both map to/from these domain objects.
 */

/**
 * @typedef {object} StudentLevelProgress
 * @property {number} studentId
 * @property {number} streamId
 * @property {number} levelId
 * @property {number} bestScore - 0..300 (best completion score, monotonic)
 * @property {number} attempts - lifetime attempts for this level
 * @property {boolean} isCompleted - completed at least once
 * @property {?number} completedAt - epoch ms of first completion
 * @property {?number} lastPlayedAt - epoch ms of most recent play
 */

/**
 * @typedef {object} StudentStreamProgress
 * @property {number} studentId
 * @property {number} streamId
 * @property {number} currentLevel - next level to attempt (1..5)
 * @property {number} completedLevels - 0..5
 * @property {boolean} streamCompleted - true once all 5 levels are completed
 * @property {?number} updatedAt - epoch ms of last write
 */

/**
 * @typedef {object} ProgressionRepository
 * @property {(args: { studentId: number, levelId: number }) => Promise<StudentLevelProgress|null>} getLevelProgress
 *           - one level row for a student, or null when never recorded.
 * @property {(args: { studentId: number, streamId: number }) => Promise<StudentLevelProgress[]>} listLevelProgress
 *           - all level rows for a (student, stream) — used to recompute the
 *             stream aggregate after a completion.
 * @property {(args: { studentId: number, streamId: number }) => Promise<StudentStreamProgress|null>} getStreamProgress
 *           - one stream aggregate row for a student, or null when never
 *             recorded — the trusted `stream_completed` read used by the
 *             achievements layer (Task 5.8) before issuing badges/certificates.
 * @property {(row: StudentLevelProgress) => Promise<StudentLevelProgress>} upsertLevelProgress
 *           - upsert on UNIQUE(student_id, level_id); best_score monotonic,
 *             attempts increment are the SERVICE's responsibility (max/clamp
 *             need the existing row, which PostgREST upsert cannot compute).
 * @property {(row: StudentStreamProgress) => Promise<StudentStreamProgress>} upsertStreamProgress
 *           - upsert on UNIQUE(student_id, stream_id).
 */