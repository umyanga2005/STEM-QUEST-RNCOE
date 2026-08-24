/**
 * Mission — access resolver (Task 5.2, extended Task 5.5).
 *
 * PURE functions that derive the selection UI's access/status model from the
 * authoritative backend state. The UI is a mirror, never a gate: the actual
 * play entitlement is re-checked by ProgressionService.assertLevelUnlocked at
 * session start (D-027/D-033/D-076). No I/O, no React, no side effects here.
 *
 * Access model (per level):
 *   'available' — level 1 is always open (mirrors assertLevelUnlocked), OR a
 *                 higher level whose previous level (same stream) is completed
 *                 via normal progression.
 *   'special'   — a level 2..5 covered by an active special-access grant
 *                 (stream-wide OR level-specific, matching the backend rule).
 *   'locked'    — not playable yet.
 *
 * Status model (per level, read-only progression):
 *   'completed'    — a passing record exists.
 *   'in-progress'  — attempted at least once, not completed.
 *   'not-started'  — never attempted.
 *
 * Grade never gates levels — it is suitability metadata only (D-0xx).
 */

export const LEVEL_ACCESS = Object.freeze({
  AVAILABLE: 'available',
  LOCKED: 'locked',
  SPECIAL: 'special',
})

export const LEVEL_STATUS = Object.freeze({
  COMPLETED: 'completed',
  IN_PROGRESS: 'in-progress',
  NOT_STARTED: 'not-started',
})

/** A level is unlocked when it is level 1, covered by an active grant
 * (stream-wide or level-specific), or unlocked by normal progression (the
 * previous level in the same stream is completed — D-076). */
export function resolveLevelAccess({ level, grants = [], previousLevel = null, previousLevelProgress = null }) {
  if (level.number === 1) return LEVEL_ACCESS.AVAILABLE
  const covered = grants.some(
    (g) => Number(g.streamId) === Number(level.streamId) || Number(g.levelId) === Number(level.id)
  )
  if (covered) return LEVEL_ACCESS.SPECIAL
  if (previousLevel && previousLevelProgress?.isCompleted) return LEVEL_ACCESS.AVAILABLE
  return LEVEL_ACCESS.LOCKED
}

/** Derives the read-only progression status from a level's progress row. */
export function resolveLevelStatus({ levelProgress = null }) {
  if (levelProgress?.isCompleted) return LEVEL_STATUS.COMPLETED
  if (levelProgress && levelProgress.attempts > 0) return LEVEL_STATUS.IN_PROGRESS
  return LEVEL_STATUS.NOT_STARTED
}

export function selectableAccess(access) {
  return access !== LEVEL_ACCESS.LOCKED
}

/**
 * Builds a level's selection context.
 * @param {{ level: object, grants?: object[], progressByLevel?: Map<number, object|null>,
 *   previousLevel?: object|null, previousLevelProgress?: object|null }} input
 * @returns {{
 *   id: number, number: number, name: string,
 *   access: string, status: string, selectable: boolean, replayable: boolean
 * }}
 */
export function buildLevelContext({ level, grants = [], progressByLevel = null, previousLevel = null, previousLevelProgress = null }) {
  const access = resolveLevelAccess({ level, grants, previousLevel, previousLevelProgress })
  const progress = progressByLevel instanceof Map ? progressByLevel.get(Number(level.id)) ?? null : null
  const status = resolveLevelStatus({ levelProgress: progress })
  return {
    id: Number(level.id),
    number: level.number,
    name: level.name,
    access,
    status,
    selectable: selectableAccess(access),
    replayable: status === LEVEL_STATUS.COMPLETED,
  }
}

/**
 * Summarises a stream for the stream picker. `levelContexts` is the
 * already-resolved per-level context array for that stream.
 */
export function buildStreamSummary({ stream, levelContexts = [] }) {
  return {
    id: Number(stream.id),
    slug: stream.slug,
    name: stream.name,
    description: stream.description ?? null,
    themeColor: stream.themeColor ?? null,
    levelCount: levelContexts.length,
    unlockedCount: levelContexts.filter((l) => l.access !== LEVEL_ACCESS.LOCKED).length,
    completedCount: levelContexts.filter((l) => l.status === LEVEL_STATUS.COMPLETED).length,
  }
}

export default {
  LEVEL_ACCESS,
  LEVEL_STATUS,
  resolveLevelAccess,
  resolveLevelStatus,
  selectableAccess,
  buildLevelContext,
  buildStreamSummary,
}