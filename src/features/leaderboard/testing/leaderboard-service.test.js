/**
 * Leaderboard — service tests (Task 5.7).
 *
 * LeaderboardService behaviour: strict-better best-score writes, display-name
 * derivation from the student record (never caller-supplied), stream
 * validation, Top-N projection with no private fields, and the parallel
 * all-boards read. All via deterministic in-memory repos — no live project.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { LeaderboardService, isBetterScore, TOP_N } from '../service/leaderboard-service.js'
import { LeaderboardError, LEADERBOARD_ERROR_CODES } from '../errors.js'
import { createLeaderboardMemoryRepositories } from '../repositories/memory.js'

const STREAMS = [
  { id: 1, slug: 'science', name: 'Science', themeColor: '#22d3ee', displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', themeColor: null, displayOrder: 2, isActive: true },
  { id: 3, slug: 'engineering', name: 'Engineering', themeColor: null, displayOrder: 3, isActive: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', themeColor: null, displayOrder: 4, isActive: true },
]

// 15 students so TOP_N (10) capping can be exercised with distinct rows.
const STUDENTS = Array.from({ length: 15 }, (_, i) => ({
  id: 11 + i,
  initials: `S${i}`,
  fullName: `Student ${i}`,
  grade: 7,
  status: 'active',
}))

function build() {
  const leaderboardRepos = createLeaderboardMemoryRepositories()
  const studentRepository = {
    findById: async (id) => STUDENTS.find((s) => s.id === Number(id)) ?? null,
  }
  const streamRepository = {
    listActive: async () => STREAMS.filter((s) => s.isActive !== false).sort((a, b) => a.displayOrder - b.displayOrder),
    findById: async (id) => STREAMS.find((s) => s.id === Number(id)) ?? null,
  }
  const service = new LeaderboardService({
    studentRepository,
    streamRepository,
    leaderboardRepository: leaderboardRepos.leaderboardRepository,
  })
  return { service, store: leaderboardRepos.store }
}

// ---------------------------------------------------------------------------
// isBetterScore (pure tie-break rule, D-010/D-029)
// ---------------------------------------------------------------------------

const BASE = { score: 300, completionTimeMs: 60000, achievedAt: 1000 }

test('isBetterScore: higher score always wins', () => {
  assert.equal(isBetterScore(BASE, { ...BASE, score: 320 }), true)
  assert.equal(isBetterScore(BASE, { ...BASE, score: 200 }), false)
})

test('isBetterScore: equal score favours the lower completion time', () => {
  assert.equal(isBetterScore(BASE, { ...BASE, completionTimeMs: 50000 }), true)
  assert.equal(isBetterScore(BASE, { ...BASE, completionTimeMs: 70000 }), false)
})

test('isBetterScore: equal score + known time beats a missing time', () => {
  assert.equal(isBetterScore({ ...BASE, completionTimeMs: null }, { ...BASE, completionTimeMs: 70000 }), true)
  assert.equal(isBetterScore(BASE, { ...BASE, completionTimeMs: null }), false)
})

test('isBetterScore: equal score + time favours the earlier achieved_at', () => {
  assert.equal(isBetterScore(BASE, { ...BASE, achievedAt: 900 }), true)
  assert.equal(isBetterScore(BASE, { ...BASE, achievedAt: 1100 }), false)
})

test('isBetterScore: exact equal attempt is NOT better', () => {
  assert.equal(isBetterScore(BASE, { ...BASE }), false)
})

// ---------------------------------------------------------------------------
// recordBestScore
// ---------------------------------------------------------------------------

test('recordBestScore writes the display name from the student record', async () => {
  const { service, store } = build()
  const result = await service.recordBestScore({
    studentId: 11,
    streamId: 1,
    score: 300,
    completionTimeMs: 60000,
    achievedAt: 1000,
  })
  assert.equal(result.updated, true)
  assert.equal(store.entries.length, 1)
  assert.equal(store.entries[0].displayName, 'S0 Student 0')
  assert.equal(store.entries[0].studentId, 11)
})

test('recordBestScore only overwrites with a strictly-better attempt', async () => {
  const { service, store } = build()
  await service.recordBestScore({ studentId: 11, streamId: 1, score: 300, completionTimeMs: 60000, achievedAt: 1000 })

  const worse = await service.recordBestScore({ studentId: 11, streamId: 1, score: 200, completionTimeMs: 30000, achievedAt: 2000 })
  assert.equal(worse.updated, false)
  assert.equal(store.entries[0].score, 300)

  const faster = await service.recordBestScore({ studentId: 11, streamId: 1, score: 300, completionTimeMs: 40000, achievedAt: 3000 })
  assert.equal(faster.updated, true)
  assert.equal(store.entries[0].completionTimeMs, 40000)

  const later = await service.recordBestScore({ studentId: 11, streamId: 1, score: 300, completionTimeMs: 40000, achievedAt: 9000 })
  assert.equal(later.updated, false, 'equal score + equal time, later achieved_at is a no-op')
})

test('recordBestScore accepts a null completion time (server has no clock data)', async () => {
  const { service } = build()
  const result = await service.recordBestScore({ studentId: 11, streamId: 1, score: 150, completionTimeMs: null, achievedAt: 1000 })
  assert.equal(result.updated, true)
  assert.equal(result.entry.completionTimeMs, null)
})

test('recordBestScore skips when the student record is gone (best-effort)', async () => {
  const { service, store } = build()
  const result = await service.recordBestScore({ studentId: 999, streamId: 1, score: 100, achievedAt: 1000 })
  assert.equal(result.updated, false)
  assert.equal(store.entries.length, 0)
})

test('recordBestScore rejects invalid input', async () => {
  const { service } = build()
  const base = { studentId: 11, streamId: 1, score: 100, achievedAt: 1000 }
  for (const bad of [
    { ...base, studentId: 0 },
    { ...base, streamId: 'x' },
    { ...base, score: -5 },
    { ...base, score: 301 },
    { ...base, score: 100.5 },
    { ...base, achievedAt: 0 },
    { ...base, achievedAt: NaN },
  ]) {
    await assert.rejects(service.recordBestScore(bad), (err) => err instanceof LeaderboardError
      && err.code === LEADERBOARD_ERROR_CODES.INVALID_INPUT)
  }
})

// ---------------------------------------------------------------------------
// Reads + projection
// ---------------------------------------------------------------------------

test('getTopForStream returns the approved Top-N with rank 1..N', async () => {
  const { service } = build()
  await service.recordBestScore({ studentId: 11, streamId: 1, score: 150, achievedAt: 100 })
  await service.recordBestScore({ studentId: 12, streamId: 1, score: 300, achievedAt: 200 })
  await service.recordBestScore({ studentId: 11, streamId: 1, score: 280, achievedAt: 300 })

  const { stream, entries } = await service.getTopForStream({ streamId: 1 })
  assert.equal(stream.slug, 'science')
  assert.equal(stream.themeColor, '#22d3ee')
  assert.deepEqual(entries.map((e) => [e.rank, e.studentId, e.score]), [
    [1, 12, 300],
    [2, 11, 280],
  ])
  assert.ok(entries.every((e) => e.displayName && typeof e.displayName === 'string'))
})

test('getTopForStream caps at TOP_N and rejects an unknown stream', async () => {
  const { service } = build()
  for (let i = 0; i < 15; i += 1) {
    await service.recordBestScore({ studentId: 11 + i, streamId: 1, score: i + 1, achievedAt: i + 1 })
  }
  const { entries } = await service.getTopForStream({ streamId: 1 })
  assert.equal(entries.length, TOP_N)
  assert.equal(entries[0].score, 15, 'highest first')
  assert.equal(entries[9].score, 6, 'the lowest of the top ten')

  await assert.rejects(service.getTopForStream({ streamId: 99 }), (err) => err.code === LEADERBOARD_ERROR_CODES.STREAM_UNAVAILABLE)
  await assert.rejects(service.getTopForStream({ streamId: 0 }), (err) => err.code === LEADERBOARD_ERROR_CODES.INVALID_INPUT)
})

test('getAllLeaderboards returns exactly the active streams, isolated', async () => {
  const { service } = build()
  await service.recordBestScore({ studentId: 11, streamId: 1, score: 300, achievedAt: 100 })
  await service.recordBestScore({ studentId: 11, streamId: 4, score: 200, achievedAt: 200 })

  const { leaderboards } = await service.getAllLeaderboards()
  assert.equal(leaderboards.length, 4)
  assert.deepEqual(leaderboards.map((b) => b.stream.slug), ['science', 'technology', 'engineering', 'mathematics'])
  assert.deepEqual(leaderboards.find((b) => b.stream.id === 1).entries.map((e) => e.studentId), [11])
  assert.deepEqual(leaderboards.find((b) => b.stream.id === 4).entries.map((e) => e.studentId), [11])
  assert.equal(leaderboards.find((b) => b.stream.id === 2).entries.length, 0)
})

test('public entries carry rank, displayName and score only (studentId is internal, never in the returned projection)', async () => {
  const { service } = build()
  await service.recordBestScore({ studentId: 11, streamId: 1, score: 300, achievedAt: 100 })
  const { entries } = await service.getTopForStream({ streamId: 1 })
  assert.deepEqual(entries[0], { rank: 1, studentId: 11, displayName: 'S0 Student 0', score: 300 })
  const serialized = JSON.stringify(entries)
  assert.ok(!serialized.includes('token'))
  assert.ok(!serialized.includes('loginCode'))
  assert.ok(!serialized.includes('grade'))
})

export default { tests: true }