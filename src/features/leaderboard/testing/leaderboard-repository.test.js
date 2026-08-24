/**
 * Leaderboard — repository tests (Task 5.7).
 *
 * Memory + Supabase (via the deterministic fake client) implementations of
 * the repository contract, including the approved tie-break ordering
 * (score DESC, completion_time_ms ASC NULLS LAST, achieved_at ASC), stream
 * isolation, Top-N limiting and the (student_id, stream_id) upsert merge.
 * No live Supabase project is ever contacted.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  createLeaderboardMemoryStore,
  createLeaderboardMemoryRepositories,
  seedLeaderboardStore,
  compareLeaderboardEntries,
} from '../repositories/memory.js'
import { createSupabaseLeaderboardRepositories, rowToLeaderboardEntry } from '../repositories/supabase.js'
import { createFakeSupabaseClient } from '../../game-session/testing/fake-supabase-client.js'

const ENTRY = (o = {}) => ({
  id: 1,
  studentId: 1,
  streamId: 1,
  score: 300,
  completionTimeMs: 60000,
  achievedAt: 1000,
  displayName: 'QA Quest Admin Demo',
  updatedAt: 1000,
  ...o,
})

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

function memoryRepo() {
  const store = createLeaderboardMemoryStore()
  const { leaderboardRepository } = createLeaderboardMemoryRepositories(store)
  return { store, repo: leaderboardRepository }
}

test('memory: compareLeaderboardEntries sorts score desc, time asc, achieved_at asc', () => {
  const a = ENTRY({ score: 200 })
  const b = ENTRY({ score: 300 })
  const c = ENTRY({ score: 300, completionTimeMs: 90000 })
  const d = ENTRY({ score: 300, completionTimeMs: 60000, achievedAt: 500 })
  const sorted = [a, b, c, d].sort(compareLeaderboardEntries)
  assert.deepEqual(sorted.map((e) => [e.score, e.completionTimeMs, e.achievedAt]), [
    [300, 60000, 500],
    [300, 60000, 1000],
    [300, 90000, 1000],
    [200, 60000, 1000],
  ])
})

test('memory: a null completion time ranks last among equal scores', () => {
  const withTime = ENTRY({ score: 300, completionTimeMs: 70000 })
  const noTime = ENTRY({ score: 300, completionTimeMs: null })
  assert.equal(compareLeaderboardEntries(noTime, withTime), 1, 'null time sorts after a real time')
  assert.equal(compareLeaderboardEntries(withTime, noTime), -1)
})

test('memory: listTopForStream returns the approved Top-N, isolated by stream', async () => {
  const { repo } = memoryRepo()
  await repo.upsert(ENTRY({ studentId: 1, streamId: 1, score: 150, achievedAt: 100 }))
  await repo.upsert(ENTRY({ studentId: 2, streamId: 1, score: 300, achievedAt: 200 }))
  await repo.upsert(ENTRY({ studentId: 3, streamId: 1, score: 220, achievedAt: 300 }))
  await repo.upsert(ENTRY({ studentId: 4, streamId: 2, score: 300, achievedAt: 400 }))

  const science = await repo.listTopForStream(1, { limit: 10 })
  assert.deepEqual(science.map((e) => e.studentId), [2, 3, 1])

  const tech = await repo.listTopForStream(2, { limit: 10 })
  assert.deepEqual(tech.map((e) => e.studentId), [4])

  const capped = await repo.listTopForStream(1, { limit: 2 })
  assert.deepEqual(capped.map((e) => e.studentId), [2, 3])
})

test('memory: listTopForStream returns [] for an empty stream', async () => {
  const { repo } = memoryRepo()
  assert.deepEqual(await repo.listTopForStream(9, { limit: 10 }), [])
})

test('memory: upsert merges on (student, stream) and is idempotent', async () => {
  const { repo } = memoryRepo()
  const first = await repo.upsert(ENTRY({ studentId: 7, streamId: 3, score: 200, achievedAt: 100 }))
  const second = await repo.upsert(ENTRY({ studentId: 7, streamId: 3, score: 250, achievedAt: 200 }))
  assert.equal(first.id, second.id, 'same row id after merge')
  assert.equal(second.score, 250)
  assert.deepEqual(await repo.findByStudentAndStream(7, 3), second)

  // a different stream for the same student is a different entry
  const other = await repo.upsert(ENTRY({ studentId: 7, streamId: 4, score: 100, achievedAt: 300 }))
  assert.notEqual(other.id, second.id)
  assert.equal((await repo.listTopForStream(3, { limit: 10 })).length, 1)
  assert.equal((await repo.listTopForStream(4, { limit: 10 })).length, 1)
})

test('memory: seedLeaderboardStore seeds raw entries', async () => {
  const store = createLeaderboardMemoryStore()
  seedLeaderboardStore(store, [ENTRY({ studentId: 1, streamId: 1 }), ENTRY({ studentId: 2, streamId: 1, id: 2 })])
  assert.equal(store.entries.length, 2)
})

// ---------------------------------------------------------------------------
// Supabase (fake client)
// ---------------------------------------------------------------------------

function supabaseRepo() {
  const { client, db } = createFakeSupabaseClient()
  const { leaderboardRepository } = createSupabaseLeaderboardRepositories({ client })
  return { db, repo: leaderboardRepository }
}

function supabaseRow(o = {}) {
  return {
    id: 1,
    student_id: 1,
    stream_id: 1,
    score: 300,
    completion_time_ms: '1970-01-01T00:01:00.000Z',
    achieved_at: '1970-01-01T00:00:01.000Z',
    display_name: 'QA Quest Admin Demo',
    updated_at: '1970-01-01T00:00:01.000Z',
    ...o,
  }
}

test('supabase: rowToLeaderboardEntry maps snake_case + ISO timestamps to the domain', () => {
  assert.deepEqual(rowToLeaderboardEntry(supabaseRow()), {
    id: 1,
    studentId: 1,
    streamId: 1,
    score: 300,
    completionTimeMs: 60000,
    achievedAt: 1000,
    displayName: 'QA Quest Admin Demo',
    updatedAt: 1000,
  })
  const nullTime = rowToLeaderboardEntry(supabaseRow({ completion_time_ms: null }))
  assert.equal(nullTime.completionTimeMs, null)
})

test('supabase: listTopForStream uses the approved multi-column ordering', async () => {
  const { db, repo } = supabaseRepo()
  db.tables.leaderboard_entries.rows.push(
    supabaseRow({ id: 1, student_id: 1, score: 200, achieved_at: '2026-01-01T00:00:00Z' }),
    supabaseRow({ id: 2, student_id: 2, score: 300, completion_time_ms: '2026-01-01T00:02:00Z', achieved_at: '2026-01-01T00:00:02Z' }),
    supabaseRow({ id: 3, student_id: 3, score: 300, completion_time_ms: '2026-01-01T00:01:00Z', achieved_at: '2026-01-01T00:00:03Z' }),
    supabaseRow({ id: 4, student_id: 4, score: 300, completion_time_ms: null, achieved_at: '2026-01-01T00:00:01Z' }),
    supabaseRow({ id: 5, student_id: 5, score: 300, completion_time_ms: '2026-01-01T00:01:00Z', achieved_at: '2026-01-01T00:00:01Z' })
  )
  db.tables.leaderboard_entries.nextId = 6

  const rows = await repo.listTopForStream(1, { limit: 10 })
  assert.deepEqual(rows.map((e) => e.studentId), [5, 3, 2, 4, 1], 'score desc, time asc NULLS LAST, achieved_at asc')
  assert.equal(rows[0].score, 300)
  assert.equal(rows[4].studentId, 1, 'the score-200 row ranks last')
})

test('supabase: listTopForStream filters by stream and caps at the limit', async () => {
  const { db, repo } = supabaseRepo()
  for (let i = 1; i <= 5; i += 1) {
    db.tables.leaderboard_entries.rows.push(
      supabaseRow({ id: i, student_id: i, stream_id: 1, score: 300 - i, achieved_at: `2026-01-0${i}T00:00:00Z` })
    )
  }
  db.tables.leaderboard_entries.rows.push(supabaseRow({ id: 6, student_id: 6, stream_id: 2, score: 300, achieved_at: '2026-01-01T00:00:00Z' }))
  db.tables.leaderboard_entries.nextId = 7

  const tech = await repo.listTopForStream(2, { limit: 10 })
  assert.deepEqual(tech.map((e) => e.studentId), [6])
  const capped = await repo.listTopForStream(1, { limit: 3 })
  assert.equal(capped.length, 3)
})

test('supabase: findByStudentAndStream returns null when absent', async () => {
  const { repo } = supabaseRepo()
  assert.equal(await repo.findByStudentAndStream(1, 1), null)
})

test('supabase: upsert inserts new rows and merges on the unique key', async () => {
  const { db, repo } = supabaseRepo()
  const inserted = await repo.upsert({
    studentId: 9,
    streamId: 1,
    score: 180,
    completionTimeMs: 45000,
    achievedAt: 5000,
    displayName: 'QA Quest Admin Demo',
  })
  assert.equal(inserted.studentId, 9)
  assert.equal(inserted.score, 180)
  assert.equal(inserted.completionTimeMs, 45000)
  assert.equal(db.tables.leaderboard_entries.rows.length, 1)

  const merged = await repo.upsert({
    studentId: 9,
    streamId: 1,
    score: 250,
    completionTimeMs: 40000,
    achievedAt: 6000,
    displayName: 'QA Quest Admin Demo',
  })
  assert.equal(merged.id, inserted.id, 'same row, not a second insert')
  assert.equal(merged.score, 250)
  assert.equal(db.tables.leaderboard_entries.rows.length, 1, 'no duplicate row after merge')
})

export default { tests: true }