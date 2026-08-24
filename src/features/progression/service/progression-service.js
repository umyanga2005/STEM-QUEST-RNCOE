/**
 * Progression — ProgressionService (Task 5.5).
 *
 * Authoritative backend progression:
 *
 *  - Normal unlock (D-076): level 1 is always open; level N is unlocked only
 *    when level N-1 is completed for the SAME stream, or an active
 *    special-access grant covers the stream or level. The client (Mission UI)
 *    never invents unlocks — the session start re-checks here.
 *  - Completion recording: GameSessionService.finishSession calls
 *    recordCompletion() exactly once per finished session; rows are written to
 *    student_level_progress (UPSERT on student_id+level_id) and the stream
 *    aggregate student_progress (UPSERT on student_id+stream_id). Both writes
 *    are idempotent by their unique keys.
 *
 * special_access stays an independent entitlement: a grant opens a level for
 * play but never fabricates a completion record.
 */

import { gameError } from '../../game-engine/index.js'
import { buildLevelContext, LEVEL_ACCESS, LEVEL_STATUS } from '../../mission/access/access-resolver.js'

/** Levels per stream (0001 migration levels are 1..5 per stream). */
export const TOTAL_LEVELS = 5

export class ProgressionService {
  /**
   * @param {object} deps
   * @param {import('../repositories/contracts.js').ProgressionRepository} deps.progressionRepository
   * @param {import('../../game-session/repositories/contracts.js').LevelRepository} deps.levelRepository
   * @param {import('../../game-session/repositories/contracts.js').SpecialAccessRepository} deps.specialAccessRepository
   * @param {import('../../mission/repositories/contracts.js').StreamRepository} [deps.streamRepository]
   *           - required only for the student-facing progress overview
   *             (Task 5.6); the unlock/completion paths do not need it.
   */
  constructor({ progressionRepository, levelRepository, specialAccessRepository, streamRepository = null }) {
    this.progressionRepository = progressionRepository
    this.levelRepository = levelRepository
    this.specialAccessRepository = specialAccessRepository
    this.streamRepository = streamRepository
  }

  /**
   * Authoritative unlock gate evaluated at session start (D-076).
   * Throws `gameError.levelLocked` when the level is not playable.
   * @param {{ studentId: number, level: object, grants?: object[] }} input
   */
  async assertLevelUnlocked({ studentId, level, grants = [] }) {
    if (Number(level.number) === 1) return
    const covered = grants.some(
      (g) => Number(g.streamId) === Number(level.streamId) || Number(g.levelId) === Number(level.id)
    )
    if (covered) return
    const previous = await this.findPreviousLevel(level)
    if (previous) {
      const progress = await this.progressionRepository.getLevelProgress({
        studentId: Number(studentId),
        levelId: previous.id,
      })
      if (progress?.isCompleted) return
    }
    throw gameError.levelLocked(level.streamId, level.id)
  }

  /** Returns the same-stream level immediately before `level`, or null. */
  async findPreviousLevel(level) {
    const levels = await this.levelRepository.listForStream(level.streamId)
    return levels.find((l) => Number(l.number) === Number(level.number) - 1) ?? null
  }

  /**
   * Records a completed session (called once per finished session).
   * Writes the per-level row and recomputes + writes the stream aggregate.
   * @param {{ studentId: number, streamId: number, levelId: number,
   *   score: number, completedAt: number }} input
   */
  async recordCompletion({ studentId, streamId, levelId, score, completedAt }) {
    const sid = Number(studentId)
    const stid = Number(streamId)
    const lid = Number(levelId)
    if (!Number.isInteger(sid) || sid <= 0 || !Number.isInteger(stid) || stid <= 0 || !Number.isInteger(lid) || lid <= 0) {
      throw new Error('recordCompletion: invalid student/stream/level id')
    }

    const existing = await this.progressionRepository.getLevelProgress({ studentId: sid, levelId: lid })
    await this.progressionRepository.upsertLevelProgress({
      studentId: sid,
      streamId: stid,
      levelId: lid,
      bestScore: Math.max(existing?.bestScore ?? 0, score),
      attempts: (existing?.attempts ?? 0) + 1,
      isCompleted: true,
      completedAt: existing?.completedAt ?? completedAt,
      lastPlayedAt: completedAt,
    })

    // Recompute the stream aggregate from the (student, stream) level rows.
    const levels = await this.levelRepository.listForStream(stid)
    const numberById = new Map(levels.map((l) => [Number(l.id), Number(l.number)]))
    const rows = await this.progressionRepository.listLevelProgress({ studentId: sid, streamId: stid })
    const completed = rows.filter((p) => p.isCompleted)
    let maxCompletedNumber = 0
    for (const p of completed) {
      const n = numberById.get(Number(p.levelId))
      if (n !== undefined) maxCompletedNumber = Math.max(maxCompletedNumber, n)
    }

    const completedLevels = Math.min(completed.length, TOTAL_LEVELS)
    const currentLevel = Math.min(Math.max(maxCompletedNumber + 1, 1), TOTAL_LEVELS)
    await this.progressionRepository.upsertStreamProgress({
      studentId: sid,
      streamId: stid,
      currentLevel,
      completedLevels,
      streamCompleted: completed.length >= TOTAL_LEVELS,
      updatedAt: completedAt,
    })
  }

  /**
   * Student-facing progress overview for the Profile dashboard (Task 5.6).
   *
   * Safe, derived projection ONLY: per-stream + overall progression computed
   * from the (student, level) rows and the pure mission access resolver so
   * the profile mirrors the selection UI truthfully. Never returns raw DB
   * rows, special-access internals, per-level attempts/best scores, scoring
   * internals or admin fields.
   *
   * Requires `streamRepository` (injected at composition); unlocks/completion
   * never need it.
   * @param {{ studentId: number }} input
   * @returns {Promise<{
   *   streams: Array<{
   *     id: number, slug: string, name: string, description: ?string,
   *     themeColor: ?string, currentLevel: number, completedLevels: number,
   *     totalLevels: number, completionPercent: number, completed: boolean,
   *     inProgress: boolean, bestScore: ?number, totalAttempts: number,
   *     nextLevel: ?{ id: number, number: number, name: string, access: string },
   *     levels: Array<{ id: number, number: number, name: string, status: string, access: string, replayable: boolean }>
   *   }>,
   *   overall: { totalLevels: number, completedLevels: number,
   *     completedStreams: number, totalAttempts: number, bestScore: ?number }
   * }>}
   */
  async getStudentOverview({ studentId }) {
    const sid = Number(studentId)
    if (!Number.isInteger(sid) || sid <= 0) {
      throw new Error('getStudentOverview: invalid student id')
    }

    const streams = await this.streamRepository.listActive()
    const grants = await this.specialAccessRepository.getActiveGrants(sid)

    const streamViews = []
    let overallCompletedLevels = 0
    let overallTotalLevels = 0
    let overallCompletedStreams = 0
    let overallAttempts = 0
    let overallBestScore = null

    for (const stream of streams) {
      const levels = await this.levelRepository.listForStream(stream.id)
      const rows = await this.progressionRepository.listLevelProgress({ studentId: sid, streamId: stream.id })
      const progressByLevel = new Map(rows.map((p) => [Number(p.levelId), p]))

      const contexts = levels.map((level, i) => {
        const previousLevel = i > 0 ? levels[i - 1] : null
        const previousLevelProgress = previousLevel ? progressByLevel.get(Number(previousLevel.id)) ?? null : null
        return buildLevelContext({ level, grants, progressByLevel, previousLevel, previousLevelProgress })
      })

      const completedContexts = contexts.filter((c) => c.status === LEVEL_STATUS.COMPLETED)
      const completedLevels = completedContexts.length
      const totalLevels = contexts.length
      const completed = totalLevels > 0 && completedLevels >= totalLevels

      let maxCompletedNumber = 0
      for (const row of rows) {
        if (row.isCompleted) {
          const number = levels.find((l) => Number(l.id) === Number(row.levelId))?.number ?? 0
          maxCompletedNumber = Math.max(maxCompletedNumber, number)
        }
      }
      const currentLevel = Math.min(Math.max(maxCompletedNumber + 1, 1), Math.max(totalLevels, 1))
      const inProgress = !completed && rows.some((p) => p.attempts > 0)

      const completedScores = rows.filter((p) => p.isCompleted).map((p) => Number(p.bestScore) || 0)
      const bestScore = completedScores.length > 0 ? Math.max(...completedScores) : null
      const totalAttempts = rows.reduce((sum, p) => sum + (Number(p.attempts) || 0), 0)

      const nextContext = completed
        ? null
        : (contexts.find((c) => c.access !== LEVEL_ACCESS.LOCKED && c.status !== LEVEL_STATUS.COMPLETED)
            ?? contexts.find((c) => c.access !== LEVEL_ACCESS.LOCKED)
            ?? null)

      streamViews.push({
        id: Number(stream.id),
        slug: stream.slug,
        name: stream.name,
        description: stream.description ?? null,
        themeColor: stream.themeColor ?? null,
        currentLevel,
        completedLevels,
        totalLevels,
        completionPercent: totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0,
        completed,
        inProgress,
        bestScore,
        totalAttempts,
        nextLevel: nextContext
          ? { id: nextContext.id, number: nextContext.number, name: nextContext.name, access: nextContext.access }
          : null,
        levels: contexts.map((c) => ({
          id: c.id,
          number: c.number,
          name: c.name,
          status: c.status,
          access: c.access,
          replayable: c.replayable,
        })),
      })

      overallCompletedLevels += completedLevels
      overallTotalLevels += totalLevels
      if (completed) overallCompletedStreams += 1
      overallAttempts += totalAttempts
      if (bestScore !== null) overallBestScore = overallBestScore === null ? bestScore : Math.max(overallBestScore, bestScore)
    }

    return {
      streams: streamViews,
      overall: {
        totalLevels: overallTotalLevels,
        completedLevels: overallCompletedLevels,
        completedStreams: overallCompletedStreams,
        totalAttempts: overallAttempts,
        bestScore: overallBestScore,
      },
    }
  }
}

export default {
  ProgressionService,
  TOTAL_LEVELS,
}