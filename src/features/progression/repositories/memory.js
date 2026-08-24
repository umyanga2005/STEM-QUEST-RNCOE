/**
 * Progression — in-memory repository (Task 5.5).
 *
 * Plain-object store + repository implementation used by unit/integration
 * tests and the local demo API. Operates on the game-session memory store's
 * `studentProgress` / `studentLevelProgress` arrays (no Supabase dependency).
 */

export class MemoryProgressionRepository {
  constructor(store) {
    this.store = store
  }

  async getLevelProgress({ studentId, levelId }) {
    const row = this.store.studentLevelProgress.find(
      (p) => Number(p.studentId) === Number(studentId) && Number(p.levelId) === Number(levelId)
    )
    return row ?? null
  }

  async getStreamProgress({ studentId, streamId }) {
    const row = this.store.studentProgress.find(
      (p) => Number(p.studentId) === Number(studentId) && Number(p.streamId) === Number(streamId)
    )
    return row ?? null
  }

  async listLevelProgress({ studentId, streamId }) {
    return this.store.studentLevelProgress.filter(
      (p) => Number(p.studentId) === Number(studentId) && Number(p.streamId) === Number(streamId)
    )
  }

  async upsertLevelProgress(row) {
    const existing = this.store.studentLevelProgress.find(
      (p) => Number(p.studentId) === Number(row.studentId) && Number(p.levelId) === Number(row.levelId)
    )
    if (existing) {
      Object.assign(existing, { ...row, id: existing.id })
      return existing
    }
    const copy = { id: this.store.studentLevelProgress.length + 1, ...row }
    this.store.studentLevelProgress.push(copy)
    return copy
  }

  async upsertStreamProgress(row) {
    const existing = this.store.studentProgress.find(
      (p) => Number(p.studentId) === Number(row.studentId) && Number(p.streamId) === Number(row.streamId)
    )
    if (existing) {
      Object.assign(existing, { ...row, id: existing.id })
      return existing
    }
    const copy = { id: this.store.studentProgress.length + 1, ...row }
    this.store.studentProgress.push(copy)
    return copy
  }
}

export function createProgressionRepository(store) {
  return new MemoryProgressionRepository(store)
}

export default {
  MemoryProgressionRepository,
  createProgressionRepository,
}