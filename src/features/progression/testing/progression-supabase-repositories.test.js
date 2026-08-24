/**
 * Progression — Supabase repository contract tests (Task 5.5).
 *
 * Validates the progression adapters (progression + game-session level
 * `listForStream`) against the deterministic in-memory fake of the live
 * PostgREST surface, including UPSERT-on-conflict idempotency and the exact
 * column names from the 0001 migration.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createFakeSupabaseClient } from '../../game-session/testing/fake-supabase-client.js'
import { createProgressionRepositories } from '../repositories/index.js'
import { createSupabaseRepositories } from '../../game-session/repositories/supabase.js'

test('levelProgress: get / list / upsert round-trip with the 0001 columns', async () => {
  const { client } = createFakeSupabaseClient()
  const { progressionRepository } = createProgressionRepositories({ client })

  assert.equal(await progressionRepository.getLevelProgress({ studentId: 7, levelId: 1 }), null)

  await progressionRepository.upsertLevelProgress({
    studentId: 7, streamId: 1, levelId: 1, bestScore: 210, attempts: 1, isCompleted: true, completedAt: 1_000, lastPlayedAt: 1_000,
  })

  const row = await progressionRepository.getLevelProgress({ studentId: 7, levelId: 1 })
  assert.equal(row.studentId, 7)
  assert.equal(row.streamId, 1)
  assert.equal(row.levelId, 1)
  assert.equal(row.bestScore, 210)
  assert.equal(row.attempts, 1)
  assert.equal(row.isCompleted, true)
  assert.equal(row.completedAt, 1_000)
  assert.equal(row.lastPlayedAt, 1_000)

  const listed = await progressionRepository.listLevelProgress({ studentId: 7, streamId: 1 })
  assert.equal(listed.length, 1)
  const otherStream = await progressionRepository.listLevelProgress({ studentId: 7, streamId: 2 })
  assert.equal(otherStream.length, 0)
})

test('levelProgress upsert is idempotent on (student_id, level_id)', async () => {
  const { client, db } = createFakeSupabaseClient()
  const { progressionRepository } = createProgressionRepositories({ client })

  await progressionRepository.upsertLevelProgress({
    studentId: 7, streamId: 1, levelId: 1, bestScore: 210, attempts: 1, isCompleted: true, completedAt: 1_000, lastPlayedAt: 1_000,
  })
  await progressionRepository.upsertLevelProgress({
    studentId: 7, streamId: 1, levelId: 1, bestScore: 250, attempts: 2, isCompleted: true, completedAt: 1_000, lastPlayedAt: 2_000,
  })

  assert.equal(db.tables.student_level_progress.rows.length, 1, 'no duplicate rows after upsert')
  const row = await progressionRepository.getLevelProgress({ studentId: 7, levelId: 1 })
  assert.equal(row.bestScore, 250)
  assert.equal(row.attempts, 2)
  assert.equal(row.completedAt, 1_000, 'service keeps the first completedAt before upserting')
  assert.equal(row.lastPlayedAt, 2_000)
})

test('streamProgress upsert is idempotent on (student_id, stream_id)', async () => {
  const { client, db } = createFakeSupabaseClient()
  const { progressionRepository } = createProgressionRepositories({ client })

  await progressionRepository.upsertStreamProgress({ studentId: 7, streamId: 1, currentLevel: 2, completedLevels: 1, streamCompleted: false, updatedAt: 1_000 })
  await progressionRepository.upsertStreamProgress({ studentId: 7, streamId: 1, currentLevel: 3, completedLevels: 2, streamCompleted: false, updatedAt: 2_000 })

  assert.equal(db.tables.student_progress.rows.length, 1)
  const rows = db.tables.student_progress.rows
  assert.equal(rows[0].current_level, 3)
  assert.equal(rows[0].completed_levels, 2)
  assert.equal(rows[0].stream_completed, false)
})

test('malformed ids never reach PostgREST (null result, no bigint NaN)', async () => {
  const { client } = createFakeSupabaseClient()
  const { progressionRepository } = createProgressionRepositories({ client })
  assert.equal(await progressionRepository.getLevelProgress({ studentId: 'x', levelId: 1 }), null)
  assert.deepEqual(await progressionRepository.listLevelProgress({ studentId: 7, streamId: 'y' }), [])
})

test('game-session levelRepository.listForStream returns active levels ascending by number', async () => {
  const { client } = createFakeSupabaseClient()
  const repos = createSupabaseRepositories({ client })
  const levels = await repos.levelRepository.listForStream(2)
  assert.equal(levels.length, 5)
  assert.deepEqual(levels.map((l) => l.number), [1, 2, 3, 4, 5])
  assert.ok(levels.every((l) => l.streamId === 2))
  assert.ok(levels.every((l) => typeof l.defaultTimeSeconds === 'number'))
})

test('game-session repo factory exposes the progression repository', async () => {
  const { client } = createFakeSupabaseClient()
  const repos = createSupabaseRepositories({ client })
  assert.ok(repos.progressionRepository, 'progressionRepository wired into the game-session factory')
  assert.equal(typeof repos.progressionRepository.getLevelProgress, 'function')
})