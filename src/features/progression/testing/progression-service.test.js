/**
 * Progression — ProgressionService tests (Task 5.5).
 *
 * Authoritative unlock rule (D-076) + completion recording over the in-memory
 * repositories. Covers: level 1 always open, normal progression gating,
 * special-access independence, cross-stream isolation, idempotent aggregate
 * writes, and the security invariants (no fabricated completions, per-student
 * isolation, no progression rows leaked through the unlock path).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryStore, createMemoryRepositories } from '../../game-session/repositories/memory.js'
import { seedStoreFromBaseData, demoBaseData } from '../../game-session/demo/seed-data.js'
import { ProgressionService, TOTAL_LEVELS } from '../service/progression-service.js'
import { GAME_ERROR_CODES } from '../../game-engine/index.js'

function makeService() {
  const store = createMemoryStore()
  seedStoreFromBaseData(store, demoBaseData())
  const repos = createMemoryRepositories(store)
  const service = new ProgressionService({
    progressionRepository: repos.progressionRepository,
    levelRepository: repos.levelRepository,
    specialAccessRepository: repos.specialAccessRepository,
  })
  return { store, repos, service }
}

function level(number, streamId = 1) {
  return { id: (streamId - 1) * 5 + number, streamId, number, name: `L${number}`, isActive: true }
}

function grant(streamId, levelId = null) {
  return { id: 1, studentId: 1, streamId, levelId, isActive: true, expiresAt: null }
}

function assertLocked(promise, code = GAME_ERROR_CODES.LEVEL_LOCKED) {
  return assert.rejects(promise, (err) => err.code === code)
}

test('level 1 is always unlocked for a fresh student (no grants, no progression)', async () => {
  const { service } = makeService()
  await service.assertLevelUnlocked({ studentId: 1, level: level(1), grants: [] })
})

test('levels 2..5 are locked for a fresh student without grants', async () => {
  const { service } = makeService()
  for (const number of [2, 3, 4, 5]) {
    await assertLocked(service.assertLevelUnlocked({ studentId: 1, level: level(number), grants: [] }))
  }
})

test('a stream-wide grant opens every level in that stream (no progression needed)', async () => {
  const { service } = makeService()
  for (const number of [2, 3, 4, 5]) {
    await service.assertLevelUnlocked({ studentId: 1, level: level(number), grants: [grant(1)] })
  }
})

test('a level-specific grant opens exactly the levels covered by the stream (stream OR level rule)', async () => {
  const { service } = makeService()
  await service.assertLevelUnlocked({ studentId: 1, level: level(3), grants: [grant(1, 3)] })
  // The current backend rule treats any stream match as covering the stream.
  await service.assertLevelUnlocked({ studentId: 1, level: level(4), grants: [grant(1, 3)] })
})

test('grants from another stream never unlock this stream (D-039 composite)', async () => {
  const { service } = makeService()
  await assertLocked(service.assertLevelUnlocked({ studentId: 1, level: level(4), grants: [grant(2)] }))
})

test('completing level 1 unlocks level 2, and level 2 must be completed for level 3', async () => {
  const { service } = makeService()
  await assertLocked(service.assertLevelUnlocked({ studentId: 1, level: level(2), grants: [] }))
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 210, completedAt: 100 })
  await service.assertLevelUnlocked({ studentId: 1, level: level(2), grants: [] })
  await assertLocked(service.assertLevelUnlocked({ studentId: 1, level: level(3), grants: [] }))
})

test('a NOT-completed attempt does not unlock the next level', async () => {
  const { service, repos } = makeService()
  // Attempt (but do not complete) level 1 by recording completion with
  // isCompleted=false via a direct repo write, then assert level 2 stays locked.
  await repos.progressionRepository.upsertLevelProgress({
    studentId: 1, streamId: 1, levelId: 1, bestScore: 40, attempts: 1, isCompleted: false,
  })
  await assertLocked(service.assertLevelUnlocked({ studentId: 1, level: level(2), grants: [] }))
})

test('cross-stream completion does NOT unlock the same level number in another stream', async () => {
  const { service } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 210, completedAt: 100 })
  // Stream 2 level 2 remains locked even though stream 1 level 1 is completed.
  await assertLocked(service.assertLevelUnlocked({ studentId: 1, level: level(2, 2), grants: [] }))
})

test('recordCompletion writes the per-level row (best score, attempts, first completedAt)', async () => {
  const { service, repos } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 180, completedAt: 1000 })
  const row = await repos.progressionRepository.getLevelProgress({ studentId: 1, levelId: 1 })
  assert.equal(row.isCompleted, true)
  assert.equal(row.bestScore, 180)
  assert.equal(row.attempts, 1)
  assert.equal(row.completedAt, 1000)
  assert.equal(row.lastPlayedAt, 1000)
  assert.equal(row.streamId, 1)

  // Second play: best score monotonic, attempts incremented, first time kept.
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 210, completedAt: 2000 })
  const again = await repos.progressionRepository.getLevelProgress({ studentId: 1, levelId: 1 })
  assert.equal(again.bestScore, 210)
  assert.equal(again.attempts, 2)
  assert.equal(again.completedAt, 1000, 'first completion timestamp is preserved')
  assert.equal(again.lastPlayedAt, 2000)
})

test('recordCompletion keeps the stream aggregate current (current_level advances)', async () => {
  const { service, store } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 200, completedAt: 100 })
  const streamRow = store.studentProgress.find((p) => p.studentId === 1 && p.streamId === 1)
  assert.equal(streamRow.currentLevel, 2)
  assert.equal(streamRow.completedLevels, 1)
  assert.equal(streamRow.streamCompleted, false)
})

test('recordCompletion idempotently merges on the (student, level) key — no duplicate rows', async () => {
  const { service, store } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 200, completedAt: 100 })
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 180, completedAt: 200 })
  const rows = store.studentLevelProgress.filter((p) => p.studentId === 1 && p.levelId === 1)
  assert.equal(rows.length, 1)
  const agg = store.studentProgress.filter((p) => p.studentId === 1 && p.streamId === 1)
  assert.equal(agg.length, 1)
})

test('completing all 5 levels marks the stream completed and caps current_level at 5', async () => {
  const { service, store } = makeService()
  for (const number of [1, 2, 3, 4, 5]) {
    await service.recordCompletion({ studentId: 1, streamId: 1, levelId: number, score: 200, completedAt: 100 + number })
  }
  const streamRow = store.studentProgress.find((p) => p.studentId === 1 && p.streamId === 1)
  assert.equal(streamRow.currentLevel, TOTAL_LEVELS)
  assert.equal(streamRow.completedLevels, TOTAL_LEVELS)
  assert.equal(streamRow.streamCompleted, true)
  assert.equal(store.studentLevelProgress.filter((p) => p.studentId === 1 && p.streamId === 1).length, TOTAL_LEVELS)
})

test('completions are per-student: one student never sees another student unlock', async () => {
  const { service, store } = makeService()
  await service.recordCompletion({ studentId: 1, streamId: 1, levelId: 1, score: 200, completedAt: 100 })
  assert.equal(store.studentLevelProgress.some((p) => p.studentId === 2), false)
  await assertLocked(service.assertLevelUnlocked({ studentId: 2, level: level(2), grants: [] }))
})

test('special-access play does not fabricate a completion record', async () => {
  const { service, store, repos } = makeService()
  const grants = [grant(1)]
  await service.assertLevelUnlocked({ studentId: 1, level: level(3), grants })
  // No progression row exists from merely being allowed to play.
  assert.equal(store.studentLevelProgress.length, 0)
  assert.equal(store.studentProgress.length, 0)
  void repos
})

test('recordCompletion rejects malformed ids defensively', async () => {
  const { service } = makeService()
  await assert.rejects(() =>
    service.recordCompletion({ studentId: 0, streamId: 1, levelId: 1, score: 100, completedAt: 1 })
  )
  await assert.rejects(() =>
    service.recordCompletion({ studentId: 'x', streamId: 1, levelId: 1, score: 100, completedAt: 1 })
  )
})

test('the unlock decision never returns progression rows to a caller', async () => {
  const { service, store } = makeService()
  store.studentLevelProgress.push({ id: 1, studentId: 1, streamId: 1, levelId: 1, bestScore: 300, attempts: 9, isCompleted: true })
  const result = await service.assertLevelUnlocked({ studentId: 1, level: level(2), grants: [] })
  assert.equal(result, undefined)
})