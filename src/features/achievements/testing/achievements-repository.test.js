/**
 * Achievements — repository tests (Task 5.8).
 *
 * Memory + Supabase (via the deterministic fake client) implementations of
 * the repository contract: the 4-badge catalogue, idempotent awards under
 * UNIQUE(student_id, badge_id), idempotent certificate issues under
 * UNIQUE(student_id, stream_id), the student-list projection and the
 * snake_case↔domain mapping. No live Supabase project is ever contacted.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  createAchievementsMemoryStore,
  createAchievementsMemoryRepositories,
  STREAM_COMPLETION_BADGES,
} from '../repositories/memory.js'
import {
  createSupabaseAchievementsRepositories,
  rowToBadge,
  rowToStudentBadge,
  rowToCertificate,
} from '../repositories/supabase.js'
import { createFakeSupabaseClient } from '../../game-session/testing/fake-supabase-client.js'

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

function memoryRepos() {
  const store = createAchievementsMemoryStore()
  const repos = createAchievementsMemoryRepositories(store)
  return { store, ...repos }
}

test('memory: the store is seeded with the 4 stream-completion badges', () => {
  const { store } = memoryRepos()
  assert.equal(store.badges.length, 4)
  assert.deepEqual(store.badges.map((b) => b.slug), STREAM_COMPLETION_BADGES.map((b) => b.slug))
})

test('memory: award is idempotent under (student, badge)', async () => {
  const { store, studentBadgeRepository } = memoryRepos()
  const first = await studentBadgeRepository.award({ studentId: 1, badgeId: 1, awardedAt: 100, metadata: { stream: 'science' } })
  const second = await studentBadgeRepository.award({ studentId: 1, badgeId: 1, awardedAt: 200 })
  assert.equal(second.id, first.id, 'no second row')
  assert.equal(store.studentBadges.length, 1)
  assert.deepEqual(await studentBadgeRepository.listByStudent(1), [first])
})

test('memory: issue is idempotent under (student, stream)', async () => {
  const { store, certificateRepository } = memoryRepos()
  const first = await certificateRepository.issue({ studentId: 1, streamId: 1, title: 'X', certificateCode: 'SQ-AAAAAA-BBBBBB', earnedAt: 100 })
  const second = await certificateRepository.issue({ studentId: 1, streamId: 1, title: 'Y', certificateCode: 'SQ-CCCCCC-DDDDDD', earnedAt: 200 })
  assert.equal(second.id, first.id, 're-issue returns the existing row')
  assert.equal(store.certificates.length, 1)
  assert.equal(second.certificateCode, 'SQ-AAAAAA-BBBBBB', 'code not overwritten')
  const byCode = await certificateRepository.findByCode('SQ-AAAAAA-BBBBBB')
  assert.equal(byCode.id, first.id)
})

// ---------------------------------------------------------------------------
// Supabase (fake client)
// ---------------------------------------------------------------------------

function supabaseRepos() {
  const { client, db } = createFakeSupabaseClient()
  const repos = createSupabaseAchievementsRepositories({ client })
  return { db, ...repos }
}

function badgeRow(o = {}) {
  return { id: 1, slug: 'science-completion', name: 'Science Completion', description: 'desc', icon: 'science', criteria: { type: 'stream_completion', stream: 'science' }, is_active: true, ...o }
}

function studentBadgeRow(o = {}) {
  return { id: 1, student_id: 1, badge_id: 1, awarded_at: '2026-08-16T10:00:00.000Z', metadata: null, ...o }
}

function certificateRow(o = {}) {
  return {
    id: 1,
    certificate_code: 'SQ-AAAAAA-BBBBBB',
    student_id: 1,
    stream_id: 1,
    title: 'Science Completion Certificate',
    earned_at: '2026-08-16T10:00:00.000Z',
    document_path: null,
    generated_at: null,
    revoked: false,
    revoked_at: null,
    ...o,
  }
}

test('supabase: row mappers convert snake_case + ISO timestamps', () => {
  assert.deepEqual(rowToBadge(badgeRow()), {
    id: 1,
    slug: 'science-completion',
    name: 'Science Completion',
    description: 'desc',
    icon: 'science',
    criteria: { type: 'stream_completion', stream: 'science' },
    isActive: true,
  })
  assert.equal(rowToStudentBadge(studentBadgeRow()).awardedAt, new Date('2026-08-16T10:00:00.000Z').valueOf())
  assert.equal(rowToCertificate(certificateRow({ revoked: true, revoked_at: '2026-08-16T11:00:00.000Z' })).revoked, true)
  assert.equal(rowToCertificate(certificateRow()).documentPath, null)
})

test('supabase: badgeRepository lists the 4 active catalogue badges', async () => {
  const { db, badgeRepository } = supabaseRepos()
  const badges = await badgeRepository.listActive()
  assert.equal(badges.length, 4)
  assert.equal(badges[0].slug, 'science-completion')
  db.tables.badges.rows[0].is_active = false
  const after = await badgeRepository.listActive()
  assert.equal(after.length, 3, 'inactive badges are filtered')
  assert.equal(await badgeRepository.findBySlug('science-completion'), null)
})

test('supabase: award inserts once and is a no-op on repeat', async () => {
  const { db, studentBadgeRepository } = supabaseRepos()
  const first = await studentBadgeRepository.award({ studentId: 1, badgeId: 1, awardedAt: 100, metadata: { stream: 'science' } })
  assert.equal(first.badgeId, 1)
  assert.equal(first.awardedAt, 100, 'epoch ms round-trips through ISO')
  assert.equal(db.tables.student_badges.rows.length, 1)

  const second = await studentBadgeRepository.award({ studentId: 1, badgeId: 1, awardedAt: 200 })
  assert.equal(second.id, first.id)
  assert.equal(db.tables.student_badges.rows.length, 1, 'no duplicate row')
})

test('supabase: certificate issue is idempotent and code-lookup works', async () => {
  const { db, certificateRepository } = supabaseRepos()
  const first = await certificateRepository.issue({ studentId: 1, streamId: 1, title: 'T', certificateCode: 'SQ-AAAAAA-BBBBBB', earnedAt: 100 })
  assert.equal(first.certificateCode, 'SQ-AAAAAA-BBBBBB')
  assert.equal(db.tables.certificates.rows.length, 1)

  const again = await certificateRepository.issue({ studentId: 1, streamId: 1, title: 'T2', certificateCode: 'SQ-XXXXXX-YYYYYY', earnedAt: 200 })
  assert.equal(again.id, first.id, 're-issue returns the existing row')
  assert.equal(db.tables.certificates.rows.length, 1)

  assert.equal((await certificateRepository.findByCode('SQ-AAAAAA-BBBBBB')).id, first.id)
  assert.equal(await certificateRepository.findByCode('SQ-MISSING-000000'), null)
  assert.equal((await certificateRepository.findById(first.id)).studentId, 1)
})

test('supabase: listByStudent is per-student and orders by earned_at desc', async () => {
  const { certificateRepository } = supabaseRepos()
  await certificateRepository.issue({ studentId: 1, streamId: 1, title: 'A', certificateCode: 'SQ-AAAAAA-BBBBBB', earnedAt: 100 })
  await certificateRepository.issue({ studentId: 1, streamId: 2, title: 'B', certificateCode: 'SQ-CCCCCC-DDDDDD', earnedAt: 200 })
  await certificateRepository.issue({ studentId: 2, streamId: 1, title: 'C', certificateCode: 'SQ-EEEEEE-FFFFFF', earnedAt: 300 })
  const mine = await certificateRepository.listByStudent(1)
  assert.equal(mine.length, 2)
  assert.equal(mine[0].streamId, 2, 'most recent first')
  assert.equal((await certificateRepository.listByStudent(2)).length, 1, 'student isolation')
})

export default { tests: true }