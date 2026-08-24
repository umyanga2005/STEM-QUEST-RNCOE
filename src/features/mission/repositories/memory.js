/**
 * Mission — in-memory repositories (Task 5.2).
 *
 * Plain-object stores + repository implementations used by unit/integration
 * tests and the local demo API. They match the repository contracts in
 * `contracts.js`. No Supabase dependency — tests never touch the live
 * project.
 */

export function createMissionMemoryStore() {
  return {
    streams: [],
    levels: [],
    streamProgress: [],
    levelProgress: [],
    specialAccess: [],
  }
}

/** Seeds the mission store from a game-session `demoBaseData()`-shaped object. */
export function seedMissionStore(store, { streams = [], levels = [], streamProgress = [], levelProgress = [], specialAccess = [] } = {}) {
  store.streams.push(...streams)
  store.levels.push(...levels)
  store.streamProgress.push(...streamProgress)
  store.levelProgress.push(...levelProgress)
  store.specialAccess.push(...specialAccess)
  return store
}

class MemoryStreamRepository {
  constructor(store) {
    this.store = store
  }

  async listActive() {
    return this.store.streams
      .filter((s) => s.isActive !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
  }

  async findById(id) {
    return this.store.streams.find((s) => s.id === Number(id)) ?? null
  }
}

class MemoryLevelRepository {
  constructor(store) {
    this.store = store
  }

  async listForStream(streamId) {
    return this.store.levels
      .filter((l) => l.streamId === Number(streamId) && l.isActive !== false)
      .sort((a, b) => a.number - b.number)
  }
}

class MemoryProgressRepository {
  constructor(store) {
    this.store = store
  }

  async getStudentProgress(studentId) {
    return {
      streamProgress: this.store.streamProgress.filter((p) => p.studentId === Number(studentId)),
      levelProgress: this.store.levelProgress.filter((p) => p.studentId === Number(studentId)),
    }
  }
}

class MemorySpecialAccessRepository {
  constructor(store) {
    this.store = store
  }

  async getActiveGrants(studentId) {
    const now = Date.now()
    return this.store.specialAccess.filter(
      (g) =>
        g.studentId === Number(studentId) &&
        g.isActive === true &&
        (g.expiresAt === null || g.expiresAt === undefined || g.expiresAt > now)
    )
  }
}

/** Builds all in-memory mission repositories over one store. */
export function createMissionMemoryRepositories(store = createMissionMemoryStore()) {
  return {
    store,
    streamRepository: new MemoryStreamRepository(store),
    levelRepository: new MemoryLevelRepository(store),
    progressRepository: new MemoryProgressRepository(store),
    specialAccessRepository: new MemorySpecialAccessRepository(store),
  }
}

export default {
  createMissionMemoryStore,
  createMissionMemoryRepositories,
  seedMissionStore,
}