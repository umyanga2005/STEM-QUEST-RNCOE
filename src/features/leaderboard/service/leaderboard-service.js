/**
 * Leaderboard — LeaderboardService (Task 5.7).
 *
 * Server-only orchestration over the materialised `leaderboard_entries`
 * table (0001 migration §20 — no schema changes). Responsibilities:
 *
 *   - recordBestScore(): the single write path, called by
 *     GameSessionService.finishSession after the session completes. Only a
 *     strictly-better score is written (D-029): better score, or equal score
 *     with a lower completion time, or equal score+time achieved earlier.
 *     The display name is derived from the student record server-side — the
 *     caller can never supply a display name or a rank (D-027).
 *   - getTopForStream() / getAllLeaderboards(): public read projections that
 *     return ONLY { rank, displayName, score } plus the stream identity.
 *     `studentId` is attached internally so the API layer can highlight the
 *     caller's own entry, then stripped before the response leaves the server.
 *
 * Scores, ranks, completion times and display names are always server
 * authoritative. The client can read, never write.
 */

import { leaderboardError } from '../errors.js'

/** Exact number of rows materialised per stream (leaderboard.top_n seed = 10). */
export const TOP_N = 10

const MAX_SCORE = 300

function validId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

/** The approved strictly-better rule (D-010/D-029). Exported for tests. */
export function isBetterScore(existing, candidate) {
  if (candidate.score !== existing.score) return candidate.score > existing.score
  // Equal score: a known completion time beats a missing one.
  const candidateTime = candidate.completionTimeMs ?? null
  const existingTime = existing.completionTimeMs ?? null
  if (existingTime === null && candidateTime !== null) return true
  if (candidateTime !== null && existingTime !== null && candidateTime !== existingTime) {
    return candidateTime < existingTime
  }
  // Equal score + equal time: earlier achieved_at wins.
  return candidate.achievedAt < existing.achievedAt
}

function toPublicStream(stream) {
  return {
    id: stream.id,
    slug: stream.slug,
    name: stream.name,
    themeColor: stream.themeColor ?? null,
  }
}

export class LeaderboardService {
  /**
   * @param {object} deps
   * @param {import('../../game-session/repositories/contracts.js').StudentRepository} deps.studentRepository
   *           - `findById` must resolve `{ id, initials, fullName, status }`.
   * @param {import('../../mission/repositories/contracts.js').StreamRepository} deps.streamRepository
   * @param {import('../repositories/contracts.js').LeaderboardRepository} deps.leaderboardRepository
   */
  constructor({ studentRepository, streamRepository, leaderboardRepository }) {
    this.studentRepository = studentRepository
    this.streamRepository = streamRepository
    this.leaderboardRepository = leaderboardRepository
  }

  /**
   * Records a new best score for (student, stream). Idempotent and
   * strictly-better only: a worse/equal attempt is a no-op.
   * @param {{ studentId: number, streamId: number, score: number,
   *   completionTimeMs: ?number, achievedAt: number }} input
   * @returns {Promise<{ updated: boolean, entry?: object }>}
   */
  async recordBestScore({ studentId, streamId, score, completionTimeMs = null, achievedAt }) {
    const sid = Number(studentId)
    const stid = Number(streamId)
    const pts = Number(score)
    if (!validId(sid)) throw leaderboardError.invalidInput('student id')
    if (!validId(stid)) throw leaderboardError.invalidInput('stream id')
    if (!Number.isInteger(pts) || pts < 0 || pts > MAX_SCORE) {
      throw leaderboardError.invalidInput('score must be an integer between 0 and 300')
    }
    const at = Number(achievedAt)
    if (!Number.isFinite(at) || at <= 0) throw leaderboardError.invalidInput('achievedAt')

    const candidate = {
      studentId: sid,
      streamId: stid,
      score: pts,
      completionTimeMs: completionTimeMs === null || completionTimeMs === undefined ? null : Number(completionTimeMs),
      achievedAt: at,
    }

    const existing = await this.leaderboardRepository.findByStudentAndStream(sid, stid)
    if (existing && !isBetterScore(existing, candidate)) {
      return { updated: false }
    }

    // Display name is derived from the authoritative student record — never
    // accepted from a caller. Skip (do not throw) when the record is gone;
    // the session completion/progression stays authoritative either way.
    const student = await this.studentRepository.findById(sid)
    if (!student) {
      console?.warn?.(`leaderboard: student ${sid} not found; skipping best-score write`)
      return { updated: false }
    }
    const displayName = student.fullName ? `${student.initials} ${student.fullName}` : `${student.initials}`

    const stored = await this.leaderboardRepository.upsert({
      ...candidate,
      displayName,
      updatedAt: at,
    })
    return { updated: true, entry: stored }
  }

  /**
   * Top scores for one stream. Validates the stream (404 for unknown), then
   * returns the approved Top-N with `studentId` attached for server-side
   * self-highlight only — the API layer strips it.
   * @param {{ streamId: number, limit?: number }} input
   * @returns {Promise<{ stream: object, entries: Array<{ rank: number, studentId: number, displayName: string, score: number }> }>}
   */
  async getTopForStream({ streamId, limit }) {
    const stid = Number(streamId)
    if (!validId(stid)) throw leaderboardError.invalidInput('stream id')
    const stream = await this.streamRepository.findById(stid)
    if (!stream || stream.isActive === false) throw leaderboardError.streamUnavailable()

    const cap = Math.min(Math.max(Number(limit) || TOP_N, 1), TOP_N)
    const rows = await this.leaderboardRepository.listTopForStream(stid, { limit: cap })
    return {
      stream: toPublicStream(stream),
      entries: rows.map((row, i) => ({
        rank: i + 1,
        studentId: row.studentId,
        displayName: row.displayName,
        score: row.score,
      })),
    }
  }

  /**
   * Top scores for every active stream, fetched in parallel (one small query
   * per stream — no N+1) for the `/leaderboards` page + exhibition board.
   * @param {{ limit?: number }} [input]
   * @returns {Promise<{ leaderboards: Array<{ stream: object, entries: Array<object> }> }>}
   */
  async getAllLeaderboards({ limit } = {}) {
    const streams = await this.streamRepository.listActive()
    const results = await Promise.all(
      streams.map((stream) => {
        const cap = Math.min(Math.max(Number(limit) || TOP_N, 1), TOP_N)
        return this.leaderboardRepository.listTopForStream(stream.id, { limit: cap }).then((rows) => ({
          stream: toPublicStream(stream),
          entries: rows.map((row, i) => ({
            rank: i + 1,
            studentId: row.studentId,
            displayName: row.displayName,
            score: row.score,
          })),
        }))
      })
    )
    return { leaderboards: results }
  }
}

export default {
  LeaderboardService,
  TOP_N,
  isBetterScore,
}