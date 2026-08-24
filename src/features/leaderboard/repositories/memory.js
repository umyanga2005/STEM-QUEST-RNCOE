/**
 * Leaderboard — in-memory repositories (Task 5.7).
 *
 * Plain-object store + repository implementations used by unit/integration
 * tests and the local demo API. They match the repository contracts in
 * `contracts.js` and reproduce the approved tie-break exactly
 * (score DESC, completion_time_ms ASC, achieved_at ASC — D-010/D-029).
 * No Supabase dependency — tests never touch the live project.
 */

export function createLeaderboardMemoryStore() {
  return { entries: [] }
}

/** Seeds the leaderboard store with raw entries (tests + demo). */
export function seedLeaderboardStore(store, entries = []) {
  store.entries.push(...entries)
  return store
}

/** The approved tie-break comparator used by every listTopForStream. */
export function compareLeaderboardEntries(a, b) {
  if (a.score !== b.score) return b.score - a.score
  const aTime = a.completionTimeMs ?? null
  const bTime = b.completionTimeMs ?? null
  if (aTime !== bTime) {
    if (aTime === null) return 1 // NULLS LAST for completion_time_ms ASC
    if (bTime === null) return -1
    return aTime - bTime
  }
  return a.achievedAt - b.achievedAt
}

export class MemoryLeaderboardRepository {
  constructor(store) {
    this.store = store
    this.nextId = 1
  }

  async listTopForStream(streamId, { limit } = {}) {
    return this.store.entries
      .filter((e) => Number(e.streamId) === Number(streamId))
      .sort(compareLeaderboardEntries)
      .slice(0, limit ?? 10)
  }

  async findByStudentAndStream(studentId, streamId) {
    const entry = this.store.entries.find(
      (e) => Number(e.studentId) === Number(studentId) && Number(e.streamId) === Number(streamId)
    )
    return entry ? { ...entry } : null
  }

  async upsert(row) {
    const studentId = Number(row.studentId)
    const streamId = Number(row.streamId)
    const existing = this.store.entries.find(
      (e) => Number(e.studentId) === studentId && Number(e.streamId) === streamId
    )
    const next = {
      id: existing?.id ?? this.nextId++,
      studentId,
      streamId,
      score: Number(row.score),
      completionTimeMs: row.completionTimeMs ?? null,
      achievedAt: Number(row.achievedAt),
      displayName: String(row.displayName),
      updatedAt: row.updatedAt ?? Number(row.achievedAt),
    }
    if (existing) {
      Object.assign(existing, next)
      return { ...existing }
    }
    this.store.entries.push(next)
    return { ...next }
  }
}

/** Builds the in-memory leaderboard repository over one store. */
export function createLeaderboardMemoryRepositories(store = createLeaderboardMemoryStore()) {
  return {
    store,
    leaderboardRepository: new MemoryLeaderboardRepository(store),
  }
}

export default {
  createLeaderboardMemoryStore,
  createLeaderboardMemoryRepositories,
  seedLeaderboardStore,
  compareLeaderboardEntries,
}