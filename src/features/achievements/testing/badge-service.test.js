/**
 * Achievements — BadgeService tests (Task 5.8).
 *
 * Covers the badge catalogue projection, backend-only awarding on stream
 * completion, and idempotency (a repeat completion never duplicates a badge).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BadgeService } from '../service/badge-service.js'
import { AchievementsError } from '../errors.js'
import { createAchievementsHarness } from './helpers.js'

function buildService(harness = createAchievementsHarness()) {
  const service = new BadgeService({
    badgeRepository: harness.achievementsRepos.badgeRepository,
    studentBadgeRepository: harness.achievementsRepos.studentBadgeRepository,
    streamRepository: harness.missionRepos.streamRepository,
  })
  return { harness, service }
}

test('getStudentAchievements lists the 4 active badges with awarded state', async () => {
  const { service } = buildService()
  const { badges } = await service.getStudentAchievements({ studentId: 1 })
  assert.equal(badges.length, 4)
  assert.deepEqual(
    badges.map((b) => b.slug),
    ['science-completion', 'technology-completion', 'engineering-completion', 'mathematics-completion']
  )
  assert.ok(badges.every((b) => b.awarded === false && b.awardedAt === null), 'no badge is awarded yet')
  assert.ok(badges.every((b) => b.criteria.type === 'stream_completion'), 'criteria exposed read-only')
})

test('awardStreamCompletionBadge awards the matching stream badge once', async () => {
  const { harness, service } = buildService()
  const at = Date.UTC(2026, 7, 16, 10)
  const first = await service.awardStreamCompletionBadge({ studentId: 1, streamId: 1, completedAt: at })
  assert.equal(first.awarded, true)
  assert.equal(first.badge.slug, 'science-completion')

  const repeat = await service.awardStreamCompletionBadge({ studentId: 1, streamId: 1, completedAt: at + 1000 })
  assert.equal(repeat.awarded, false, 'a repeat completion is a no-op')
  assert.equal(repeat.badge.slug, 'science-completion')

  assert.equal(harness.achievementsStore.studentBadges.length, 1, 'exactly one student_badges row')
})

test('awardStreamCompletionBadge maps every stream slug to its badge', async () => {
  const { harness, service } = buildService()
  for (const streamId of [1, 2, 3, 4]) {
    const result = await service.awardStreamCompletionBadge({
      studentId: 1,
      streamId,
      completedAt: Date.UTC(2026, 7, 16),
    })
    assert.equal(result.awarded, true, `stream ${streamId} awarded`)
  }
  assert.equal(harness.achievementsStore.studentBadges.length, 4)
})

test('awardStreamCompletionBadge is a no-op for unknown/inactive streams', async () => {
  const { harness, service } = buildService()
  const unknown = await service.awardStreamCompletionBadge({ studentId: 1, streamId: 999, completedAt: 1 })
  assert.deepEqual(unknown, { awarded: false, reason: 'no-stream' })
  harness.missionRepos.store.streams[0].isActive = false
  const inactive = await service.awardStreamCompletionBadge({ studentId: 1, streamId: 1, completedAt: 1 })
  assert.equal(inactive.awarded, false)
})

test('badges stay isolated between students', async () => {
  const { harness, service } = buildService()
  await service.awardStreamCompletionBadge({ studentId: 1, streamId: 1, completedAt: Date.now() })
  harness.students.push({ id: 2, initials: 'B2', fullName: 'Student B', status: 'active' })

  const a = await service.getStudentAchievements({ studentId: 1 })
  const b = await service.getStudentAchievements({ studentId: 2 })
  assert.equal(a.badges.find((x) => x.slug === 'science-completion').awarded, true)
  assert.equal(b.badges.find((x) => x.slug === 'science-completion').awarded, false, 'student B sees nothing')
})

test('rejects malformed ids', async () => {
  const { service } = buildService()
  await assert.rejects(service.getStudentAchievements({ studentId: 'x' }), (err) => err instanceof AchievementsError)
  await assert.rejects(
    service.awardStreamCompletionBadge({ studentId: 0, streamId: 1, completedAt: 1 }),
    (err) => err instanceof AchievementsError
  )
})

export default { tests: true }