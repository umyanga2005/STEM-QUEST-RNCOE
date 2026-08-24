/**
 * Leaderboard — repository contracts (Task 5.7).
 *
 * Domain-shape definitions and interface documentation only — no runtime
 * logic. In-memory and Supabase implementations both map to/from these
 * objects. Mirrors the 0001 migration `leaderboard_entries` table exactly
 * (no new tables, no schema changes): a materialised best score per
 * (student, stream) with a privacy-safe public display name.
 *
 * Security model: the table is the ONLY Realtime-broadcast table (D-029)
 * and carries no personal data beyond a display name. `studentId` exists in
 * the domain row for server-side matching (self-highlight) but is stripped
 * at the API boundary — the browser response never contains it. The client
 * can never write here; scores/rank/display_name/completion_time are
 * decided exclusively by the backend (D-027).
 */

/**
 * @typedef {object} LeaderboardEntry
 * @property {number} id
 * @property {number} studentId
 * @property {number} streamId - stream the entry belongs to (composite FK, D-039)
 * @property {number} score - best 0..300 session score (materialised)
 * @property {?number} completionTimeMs - total completion time of that best session
 * @property {number} achievedAt - epoch ms of the best session completion
 * @property {string} displayName - privacy-safe public label (`initials fullName`)
 * @property {number} updatedAt - epoch ms of the last write
 */

/**
 * @typedef {object} LeaderboardRepository
 * @property {(streamId: number, opts: { limit: number }) => Promise<LeaderboardEntry[]>} listTopForStream
 *           - top entries for a stream ordered by the approved tie-break
 *             (score DESC, completion_time_ms ASC, achieved_at ASC) and capped
 *             at `limit` (default TOP_N = 10).
 * @property {(studentId: number, streamId: number) => Promise<LeaderboardEntry|null>} findByStudentAndStream
 *           - the single materialised best row for (student, stream).
 * @property {(row: LeaderboardEntry) => Promise<LeaderboardEntry>} upsert
 *           - insert-or-merge on (student_id, stream_id); returns the stored row.
 */

export default {
  contracts: true,
}