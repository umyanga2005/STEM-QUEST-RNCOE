/**
 * Achievements — shared test helpers (Task 5.8).
 *
 * Builds a complete in-memory harness (achievements + mission streams +
 * student + progression) so service/API tests are deterministic and never
 * touch Supabase.
 */

import { createAchievementsMemoryRepositories, createAchievementsMemoryStore } from '../repositories/memory.js'
import { createMissionMemoryRepositories, seedMissionStore } from '../../mission/repositories/memory.js'
import { missionDemoStreams } from '../../mission/demo/seed.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { createMemoryStore } from '../../game-session/repositories/memory.js'
import { MemoryProgressionRepository } from '../../progression/repositories/memory.js'

/** The 4 demo streams as plain rows (id 1..4). */
export const DEMO_STREAMS = [
  { id: 1, slug: 'science', name: 'Science', displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', displayOrder: 2, isActive: true },
  { id: 3, slug: 'engineering', name: 'Engineering', displayOrder: 3, isActive: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', displayOrder: 4, isActive: true },
]

/**
 * Returns a fully wired in-memory harness.
 * @returns {{
 *   achievementsStore: object, achievementsRepos: object,
 *   missionRepos: object, studentRepos: object, progressionRepo: object,
 *   streams: object[], students: object[]
 * }}
 */
export function createAchievementsHarness() {
  const achievementsStore = createAchievementsMemoryStore()
  const achievementsRepos = createAchievementsMemoryRepositories(achievementsStore)

  const missionRepos = createMissionMemoryRepositories()
  seedMissionStore(missionRepos.store, {
    streams: missionDemoStreams(DEMO_STREAMS),
    levels: [],
    streamProgress: [],
    levelProgress: [],
    specialAccess: [],
  })

  const studentRepos = createStudentMemoryRepositories()
  const student = {
    id: 1,
    initials: 'SS',
    fullName: 'Smoke Student',
    schoolId: 1,
    grade: 7,
    loginCode: 'abcd',
    status: 'active',
  }
  studentRepos.store.students.push(student)

  const gameStore = createMemoryStore()
  const progressionRepo = new MemoryProgressionRepository(gameStore)

  return {
    achievementsStore,
    achievementsRepos,
    missionRepos,
    studentRepos,
    progressionRepo,
    streams: missionRepos.store.streams,
    students: studentRepos.store.students,
    student,
  }
}

export default {
  DEMO_STREAMS,
  createAchievementsHarness,
}