/**
 * Progression — student progress overview tests (Task 5.6).
 *
 * `ProgressionService.getStudentOverview` is the safe projection the Profile
 * dashboard renders. Covers the fresh-student zero state, per-stream
 * currentLevel / completedLevels / completionPercent / bestScore /
 * totalAttempts, the completed-stream state, special-access reflection,
 * cross-student isolation, and the secrecy invariants (no per-level attempts
 * or best scores, no special-access internals, no raw rows).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryStore, createMemoryRepositories } from '../../game-session/repositories/memory.js'
import { seedStoreFromBaseData, demoBaseData } from '../../game-session/demo/seed-data.js'
import { createMissionMemoryRepositories, seedMissionStore } from '../../mission/repositories/memory.js'
import { missionDemoStreams } from '../../mission/demo/seed.js'
import { ProgressionService } from '../service/progression-service.js'

function makeService() {
  const store = createMemoryStore()
  seedStoreFromBaseData(store, demoBaseData())
  const gameRepos = createMemoryRepositories(store)
  const missionRepos = createMissionMemoryRepositories()
  seedMissionStore(missionRepos.store, {
    streams: missionDemoStreams(store.streams),
    levels: store.levels,
    streamProgress: [],
    levelProgress: [],
    specialAccess: store.specialAccess ?? [],
  })
  const service = new ProgressionService({
    progressionRepository: gameRepos.progressionRepository,
    levelRepository: gameRepos.levelRepository,
    specialAccessRepository: gameRepos.specialAccessRepository,
    streamRepository: missionRepos.streamRepository,
  })
  return { store, gameRepos, service }
}

function science(overview) {
  return overview.streams.find((s) => s.slug === 'science')
}

test('a fresh student sees the all-zero overview across all four streams', async () => {
  const { service } = makeService()
  const overview = await service.getStudentOverview({ studentId: 1 })

  assert.equal(overview.streams.length, 4)
  assert.deepEqual(overview.streams.map((s) => s.slug), ['science', 'technology', 'engineering', 'mathematics'])
  assert.equal(overview.overall.totalLevels, 20)
  assert.equal(overview.overall.completedLevels, 0)
  assert.equal(overview.overall.completedStreams, 0)
  assert.equal(overview.overall.totalAttempts, 0)
  assert.equal(overview.overall.bestScore, null)

  for (const stream of overview.streams) {
    assert.equal(stream.totalLevels, 5)
    assert.equal(stream.completedLevels, 0)
    assert.equal(stream.completed, false)
    assert.equal(stream.inProgress, false)
    assert.equal(stream.currentLevel, 1)
    assert.equal(stream.completionPercent, 0)
    assert.equal(stream.bestScore, null)
    assert.equal(stream.totalAttempts, 0)
    assert.equal(stream.levels.length, 5)
    assert.equal(stream.nextLevel.number, 1, 'level 1 is always the next playable level')
    assert.equal(stream.nextLevel.access, 'available')
  }
})

test('overview never leaks per-level attempts, best scores or raw rows', async () => {
  const { service } = makeService()
  const overview = await service.getStudentOverview({ studentId: 1 })
  const raw = JSON.stringify(overview)
  for (const stream of overview.streams) {
    for (const level of stream.levels) {
      assert.deepEqual(Object.keys(level).sort(), ['access', 'id', 'name', 'number', 'replayable', 'status'])
    }
  }
  assert.ok(!raw.includes('special_access'), 'special-access internals never leak')
  assert.ok(!raw.includes('studentLevelProgress'), 'raw row keys never leak')
  assert.ok(!raw.includes('streamProgress'), 'raw stream aggregate keys never leak')
})

test('completing level 1 advances the science stream overview truthfully', async () => {
  const { service } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 210, completedAt: 1000 })
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 180, completedAt: 2000 })

  const overview = await service.getStudentOverview({ studentId: 1 })
  const s = science(overview)

  assert.equal(s.completedLevels, 1)
  assert.equal(s.totalLevels, 5)
  assert.equal(s.completed, false)
  assert.equal(s.inProgress, true)
  assert.equal(s.currentLevel, 2)
  assert.equal(s.completionPercent, 20)
  assert.equal(s.bestScore, 210, 'best of the completed level 1 plays')
  assert.equal(s.totalAttempts, 2)
  assert.equal(s.nextLevel.number, 2)
  assert.equal(s.nextLevel.name, 'Easy')
  assert.equal(s.levels[0].status, 'completed')
  assert.equal(s.levels[0].replayable, true)
  assert.equal(s.levels[1].access, 'available', 'level 2 unlocked by progression (D-076)')
  assert.equal(s.levels[2].access, 'locked')

  assert.equal(overview.overall.completedLevels, 1)
  assert.equal(overview.overall.completedStreams, 0)
  assert.equal(overview.overall.totalAttempts, 2)
  assert.equal(overview.overall.bestScore, 210)
})

test('a completed stream shows completed, currentLevel clamped and no next level', async () => {
  const { service } = makeService()
  for (const number of [1, 2, 3, 4, 5]) {
    await service.recordCompletion({ studentId: 1, streamId: 1, levelId: number, score: 200, completedAt: 100 + number })
  }
  const overview = await service.getStudentOverview({ studentId: 1 })
  const s = science(overview)
  assert.equal(s.completed, true)
  assert.equal(s.inProgress, false)
  assert.equal(s.currentLevel, 5)
  assert.equal(s.completedLevels, 5)
  assert.equal(s.completionPercent, 100)
  assert.equal(s.nextLevel, null)
  assert.equal(s.levels.every((l) => l.status === 'completed'), true)
  assert.equal(overview.overall.completedStreams, 1)
  assert.equal(overview.overall.completedLevels, 5)
})

test('best score aggregates across streams (per-stream maxima)', async () => {
  const { service } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 240, completedAt: 100 })
  await service.recordCompletion({ studentId: 1, streamId: 2, levelId: 6, score: 260, completedAt: 200 })
  const overview = await service.getStudentOverview({ studentId: 1 })
  assert.equal(overview.overall.bestScore, 260)
  assert.equal(overview.overall.completedLevels, 2)
  assert.equal(science(overview).bestScore, 240)
  assert.equal(overview.streams.find((s) => s.slug === 'technology').bestScore, 260)
})

test('special access reflects in the overview access model but fabricates nothing', async () => {
  const { store, service } = makeService()
  store.specialAccess.push({
    id: 1, studentId: 1, streamId: 1, levelId: null, isActive: true, expiresAt: null,
  })
  const overview = await service.getStudentOverview({ studentId: 1 })
  const s = science(overview)
  assert.equal(s.levels[1].access, 'special', 'level 2 shows the grant entitlement')
  assert.equal(s.levels[4].access, 'special')
  assert.equal(s.nextLevel.number, 1, 'level 1 is still the next playable level')
  assert.equal(s.completedLevels, 0, 'a grant never fabricates completion')
  assert.equal(overview.overall.completedLevels, 0)
})

test('overview is isolated per student', async () => {
  const { service } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 210, completedAt: 100 })
  const other = await service.getStudentOverview({ studentId: 2 })
  assert.equal(other.overall.completedLevels, 0)
  assert.equal(other.overall.totalAttempts, 0)
  assert.equal(other.overall.bestScore, null)
  assert.equal(science(other).nextLevel.number, 1)
})

test('rejects malformed student ids defensively', async () => {
  const { service } = makeService()
  await assert.rejects(() => service.getStudentOverview({ studentId: 0 }))
  await assert.rejects(() => service.getStudentOverview({ studentId: 'x' }))
  await assert.rejects(() => service.getStudentOverview({ studentId: NaN }))
})