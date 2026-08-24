/**
 * Mission — progression-based access tests (Task 5.5).
 *
 * The selection picker must surface normal-progression unlocks truthfully:
 * completing level N unlocks level N+1 as 'available' (mirroring
 * ProgressionService.assertLevelUnlocked at session start), special-access
 * stays 'special', completion is stream-specific, and no progression
 * internals ever leak into the payload.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MissionService } from '../service/mission-service.js'
import {
  createMissionMemoryStore,
  createMissionMemoryRepositories,
  seedMissionStore,
} from '../repositories/memory.js'
import { resolveLevelAccess, LEVEL_ACCESS } from '../access/access-resolver.js'

const STREAMS = [
  { id: 1, slug: 'science', name: 'Science', description: 'Energy and matter.', themeColor: null, displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', description: 'Tools of the digital world.', themeColor: null, displayOrder: 2, isActive: true },
]
const LEVEL_NAMES = ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Hard']

function levelsForStream(streamId) {
  return LEVEL_NAMES.map((name, i) => ({
    id: (streamId - 1) * 5 + (i + 1),
    streamId,
    number: i + 1,
    name,
    isActive: true,
  }))
}

function buildService(overrides = {}) {
  const store = createMissionMemoryStore()
  seedMissionStore(store, {
    streams: STREAMS,
    levels: STREAMS.flatMap((s) => levelsForStream(s.id)),
    ...overrides,
  })
  const repos = createMissionMemoryRepositories(store)
  return new MissionService(repos)
}

function completedLevel(levelId) {
  return { studentId: 42, streamId: Math.ceil(levelId / 5), levelId, bestScore: 210, attempts: 1, isCompleted: true, lastPlayedAt: Date.now() }
}

test('completing level 1 turns level 2 available (normal progression, not special)', async () => {
  const service = buildService({ levelProgress: [completedLevel(1)] })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'available', 'locked', 'locked', 'locked']
  )
  assert.equal(levels[1].selectable, true, 'a progression-unlocked level is selectable')
})

test('levels stay locked until their predecessor is completed (chain, not leapfrog)', async () => {
  const service = buildService({ levelProgress: [completedLevel(1), completedLevel(2)] })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'available', 'available', 'locked', 'locked']
  )
})

test('progression unlock is stream-specific in the picker', async () => {
  const service = buildService({ levelProgress: [completedLevel(1)] }) // science L1
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 2 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'locked', 'locked', 'locked', 'locked']
  )
})

test('a completed level remains completed AND selectable (replay) and unlocks the next', async () => {
  const service = buildService({ levelProgress: [completedLevel(1)] })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.equal(levels[0].status, 'completed')
  assert.equal(levels[0].replayable, true)
  assert.equal(levels[0].access, LEVEL_ACCESS.AVAILABLE)
  assert.equal(levels[1].access, LEVEL_ACCESS.AVAILABLE)
})

test('special access still reports special and never fabricates normal progression', async () => {
  const service = buildService({
    specialAccess: [{ id: 1, studentId: 42, streamId: 1, levelId: null, isActive: true, expiresAt: null }],
  })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'special', 'special', 'special', 'special']
  )
  assert.ok(levels.every((l) => !('isCompleted' in l) && !('bestScore' in l)), 'no progression internals leak')
})

test('overview unlockedCount reflects progression unlocks', async () => {
  const service = buildService({ levelProgress: [completedLevel(1), completedLevel(2)] })
  const { streams } = await service.getMissionOverview({ studentId: 42 })
  const science = streams.find((s) => s.slug === 'science')
  assert.equal(science.unlockedCount, 3, 'L1..L3 unlocked by progression')
  assert.equal(science.completedCount, 2)
  const tech = streams.find((s) => s.slug === 'technology')
  assert.equal(tech.unlockedCount, 1, 'other streams untouched')
})

test('resolveLevelAccess stays backward compatible when no previous level is given', () => {
  // Existing callers (tests / other consumers) without progression context
  // must keep the old behaviour: level 1 open, higher levels grant-gated.
  assert.equal(resolveLevelAccess({ level: { id: 102, streamId: 1, number: 2 }, grants: [] }), LEVEL_ACCESS.LOCKED)
  assert.equal(resolveLevelAccess({ level: { id: 101, streamId: 1, number: 1 }, grants: [] }), LEVEL_ACCESS.AVAILABLE)
  assert.equal(
    resolveLevelAccess({ level: { id: 102, streamId: 1, number: 2 }, grants: [{ id: 9, streamId: 1, levelId: null, isActive: true }] }),
    LEVEL_ACCESS.SPECIAL
  )
})

test('an attempted-but-uncompleted previous level never unlocks the next', async () => {
  const service = buildService({
    levelProgress: [{ studentId: 42, streamId: 1, levelId: 1, bestScore: 60, attempts: 2, isCompleted: false, lastPlayedAt: Date.now() }],
  })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'locked', 'locked', 'locked', 'locked']
  )
  assert.equal(levels[0].status, 'in-progress')
})