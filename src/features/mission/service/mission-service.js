/**
 * Mission — MissionService (Task 5.2).
 *
 * Server-only orchestration for the student stream + level selection UI.
 * Composes read-only catalogue + progression repositories through the pure
 * access resolver. The service is NOT an identity boundary: the request is
 * authenticated upstream by StudentService.getMe (D-005/D-027) and the
 * student object is passed in. Play entitlement itself remains enforced by
 * ProgressionService.assertLevelUnlocked at session start (D-033/D-076).
 */

import { missionError } from '../errors.js'
import {
  buildLevelContext,
  buildStreamSummary,
  LEVEL_ACCESS,
} from '../access/access-resolver.js'

export class MissionService {
  constructor({ streamRepository, levelRepository, progressRepository, specialAccessRepository }) {
    this.repos = {
      streamRepository,
      levelRepository,
      progressRepository,
      specialAccessRepository,
    }
  }

  /**
   * Returns the active streams with their selection summaries for a student.
   * @param {{ studentId: number }} input
   * @returns {Promise<{ streams: object[] }>}
   */
  async getMissionOverview({ studentId }) {
    const sid = Number(studentId)
    if (!Number.isInteger(sid) || sid <= 0) throw missionError.invalidInput('missing student id')
    const [streams, progress, grants] = await Promise.all([
      this.repos.streamRepository.listActive(),
      this.repos.progressRepository.getStudentProgress(sid),
      this.repos.specialAccessRepository.getActiveGrants(sid),
    ])

    const summaries = []
    for (const stream of streams) {
      const levels = await this.repos.levelRepository.listForStream(stream.id)
      const levelContexts = buildLevelContexts(levels, { grants, progressByLevelMap: progressByLevelMap(progress) })
      summaries.push(buildStreamSummary({ stream, levelContexts }))
    }
    return { streams: summaries }
  }

  /**
   * Returns one stream plus its fully-resolved level cards for selection.
   * @param {{ studentId: number, streamId: number }} input
   * @returns {Promise<{ stream: object, levels: object[] }>}
   */
  async getMissionLevels({ studentId, streamId }) {
    const sid = Number(studentId)
    const stid = Number(streamId)
    if (!Number.isInteger(sid) || sid <= 0) throw missionError.invalidInput('missing student id')
    if (!Number.isInteger(stid) || stid <= 0) throw missionError.invalidInput('missing stream id')

    const stream = await this.repos.streamRepository.findById(stid)
    if (!stream || stream.isActive === false) throw missionError.streamUnavailable()

    const [levels, progress, grants] = await Promise.all([
      this.repos.levelRepository.listForStream(stid),
      this.repos.progressRepository.getStudentProgress(sid),
      this.repos.specialAccessRepository.getActiveGrants(sid),
    ])
    if (levels.length === 0) throw missionError.streamUnavailable()

    const map = progressByLevelMap(progress)
    const levelContexts = buildLevelContexts(levels, { grants, progressByLevelMap: map })
    return {
      stream: buildStreamSummary({ stream, levelContexts }),
      levels: levelContexts,
    }
  }

  /** Summary counts for tests/instrumentation. */
  static countByAccess(levelContexts) {
    return levelContexts.reduce(
      (acc, l) => {
        acc[l.access] = (acc[l.access] ?? 0) + 1
        return acc
      },
      { [LEVEL_ACCESS.AVAILABLE]: 0, [LEVEL_ACCESS.LOCKED]: 0, [LEVEL_ACCESS.SPECIAL]: 0 }
    )
  }
}

function progressByLevelMap({ streamProgress, levelProgress }) {
  void streamProgress
  const map = new Map()
  for (const row of levelProgress) map.set(Number(row.levelId), row)
  return map
}

/**
 * Resolves each level's selection context, threading in the same-stream
 * previous level so normal progression unlocks (D-076) surface truthfully.
 */
function buildLevelContexts(levels, { grants, progressByLevelMap }) {
  return levels.map((level) => {
    const previousLevel = levels.find((l) => Number(l.number) === Number(level.number) - 1) ?? null
    const previousLevelProgress = previousLevel ? progressByLevelMap.get(Number(previousLevel.id)) ?? null : null
    return buildLevelContext({ level, grants, progressByLevel: progressByLevelMap, previousLevel, previousLevelProgress })
  })
}

export default {
  MissionService,
}