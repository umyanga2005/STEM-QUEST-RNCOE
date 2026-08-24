/**
 * Mission — MissionService tests (Task 5.2).
 *
 * Service-level coverage over in-memory repositories: overview summaries,
 * per-stream level cards, the unlock model (level 1 open; levels 2..5 need a
 * stream-wide or level-specific grant — the SAME rule GameSessionService
 * enforces), progression status, grade-is-not-a-gate, and availability errors.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MissionService } from '../service/mission-service.js'
import { MissionError } from '../errors.js'
import {
  createMissionMemoryStore,
  createMissionMemoryRepositories,
  seedMissionStore,
} from '../repositories/memory.js'

const STREAMS = [
  { id: 1, slug: 'science', name: 'Science', description: 'Energy and matter.', themeColor: null, displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', description: 'Tools of the digital world.', themeColor: null, displayOrder: 2, isActive: true },
  { id: 3, slug: 'engineering', name: 'Engineering', description: 'Design and build.', themeColor: null, displayOrder: 3, isActive: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', description: 'Numbers and patterns.', themeColor: null, displayOrder: 4, isActive: true },
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

test('overview returns all four active streams in display order', async () => {
  const service = buildService()
  const { streams } = await service.getMissionOverview({ studentId: 42 })
  assert.equal(streams.length, 4)
  assert.deepEqual(streams.map((s) => s.slug), ['science', 'technology', 'engineering', 'mathematics'])
  assert.equal(streams[0].levelCount, 5)
  assert.equal(streams[0].unlockedCount, 1, 'only level 1 open without grants')
})

test('overview stream summaries carry approved description text', async () => {
  const service = buildService()
  const { streams } = await service.getMissionOverview({ studentId: 42 })
  assert.equal(streams[0].description, 'Energy and matter.')
})

test('levels endpoint returns five levels with access/status and selectable flags', async () => {
  const service = buildService()
  const { stream, levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.equal(stream.slug, 'science')
  assert.equal(levels.length, 5)
  assert.deepEqual(
    levels.map((l) => l.number),
    [1, 2, 3, 4, 5]
  )
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'locked', 'locked', 'locked', 'locked']
  )
  assert.equal(levels[0].selectable, true)
  assert.equal(levels[1].selectable, false)
})

test('a stream-wide grant marks levels 2..5 as special access', async () => {
  const service = buildService({
    specialAccess: [{ id: 1, studentId: 42, streamId: 1, levelId: null, isActive: true, expiresAt: null }],
  })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'special', 'special', 'special', 'special']
  )
  assert.ok(levels.every((l) => l.selectable))
})

test('a level-specific grant still covers the whole stream (current backend rule)', async () => {
  const service = buildService({
    specialAccess: [{ id: 2, studentId: 42, streamId: 1, levelId: 3, isActive: true, expiresAt: null }],
  })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'special', 'special', 'special', 'special']
  )
})

test('expired and inactive grants never unlock levels', async () => {
  const service = buildService({
    specialAccess: [
      { id: 3, studentId: 42, streamId: 1, levelId: null, isActive: false, expiresAt: null },
      { id: 4, studentId: 42, streamId: 1, levelId: null, isActive: true, expiresAt: Date.now() - 1000 },
      { id: 5, studentId: 99, streamId: 1, levelId: null, isActive: true, expiresAt: null },
    ],
  })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.deepEqual(
    levels.map((l) => l.access),
    ['available', 'locked', 'locked', 'locked', 'locked']
  )
})

test('completed and attempted levels surface as progression status (replay allowed)', async () => {
  const service = buildService({
    levelProgress: [
      { studentId: 42, streamId: 1, levelId: 1, bestScore: 210, attempts: 4, isCompleted: true, lastPlayedAt: Date.now() },
      { studentId: 42, streamId: 1, levelId: 2, bestScore: 60, attempts: 2, isCompleted: false, lastPlayedAt: Date.now() },
    ],
  })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.equal(levels[0].status, 'completed')
  assert.equal(levels[0].replayable, true, 'completed levels remain replayable')
  assert.equal(levels[1].status, 'in-progress')
  assert.equal(levels[2].status, 'not-started')
})

test('grade is suitability metadata only and never gates a level', async () => {
  const service = buildService()
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  for (const level of levels) assert.equal('grade' in level, false)
})

test('student id is required and validated', async () => {
  const service = buildService()
  await assert.rejects(() => service.getMissionOverview({ studentId: NaN }), MissionError)
  await assert.rejects(() => service.getMissionLevels({ studentId: 0, streamId: 1 }), MissionError)
})

test('unknown or inactive streams are unavailable', async () => {
  const service = buildService({
    streams: [{ ...STREAMS[0], isActive: false }],
    levels: [],
  })
  await assert.rejects(() => service.getMissionLevels({ studentId: 42, streamId: 999 }), (err) => {
    assert.equal(err.code, 'MISSION_STREAM_UNAVAILABLE')
    return true
  })
  await assert.rejects(() => service.getMissionLevels({ studentId: 42, streamId: 1 }), (err) => {
    assert.equal(err.code, 'MISSION_STREAM_UNAVAILABLE')
    return true
  })
})

test('inactive levels are excluded from the picker', async () => {
  const service = buildService({
    levels: levelsForStream(1).map((l) => (l.number === 4 ? { ...l, isActive: false } : l)),
  })
  const { levels } = await service.getMissionLevels({ studentId: 42, streamId: 1 })
  assert.equal(levels.length, 4)
  assert.ok(!levels.some((l) => l.number === 4))
})