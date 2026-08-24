/**
 * Achievements — AchievementsService completion-hook tests (Task 5.8).
 *
 * Verifies the single backend write path (`awardForCompletion`) used by
 * GameSessionService.finishSession: it only fires when the trusted
 * `student_progress.stream_completed` flag is true, awards the badge AND
 * issues the certificate exactly once, and stays idempotent (architecture
 * §11).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AchievementsService } from '../service/achievements-service.js'
import { AchievementsError } from '../errors.js'
import { createAchievementsHarness } from './helpers.js'

function buildService(harness = createAchievementsHarness()) {
  const service = new AchievementsService({
    progressionRepository: harness.progressionRepo,
    badgeRepository: harness.achievementsRepos.badgeRepository,
    studentBadgeRepository: harness.achievementsRepos.studentBadgeRepository,
    certificateRepository: harness.achievementsRepos.certificateRepository,
    studentRepository: harness.studentRepos.studentRepository,
    streamRepository: harness.missionRepos.streamRepository,
  })
  return { harness, service }
}

function markStreamCompleted(harness, studentId, streamId) {
  harness.progressionRepo.upsertStreamProgress({
    studentId,
    streamId,
    currentLevel: 6,
    completedLevels: 5,
    streamCompleted: true,
    updatedAt: Date.now(),
  })
}

test('awardForCompletion is a no-op until the stream is completed', async () => {
  const { harness, service } = buildService()
  const result = await service.awardForCompletion({ studentId: 1, streamId: 1, completedAt: Date.now() })
  assert.deepEqual(result, { badgeAwarded: false, certificateIssued: false, reason: 'stream-not-completed' })
  assert.equal(harness.achievementsStore.studentBadges.length, 0)
  assert.equal(harness.achievementsStore.certificates.length, 0)
})

test('awardForCompletion awards the badge and issues the certificate on completion', async () => {
  const { harness, service } = buildService()
  markStreamCompleted(harness, 1, 1)
  const result = await service.awardForCompletion({ studentId: 1, streamId: 1, completedAt: Date.now() })
  assert.equal(result.badgeAwarded, true)
  assert.equal(result.certificateIssued, true)
  assert.equal(harness.achievementsStore.studentBadges.length, 1)
  assert.equal(harness.achievementsStore.certificates.length, 1)
  assert.equal(harness.achievementsStore.studentBadges[0].badgeId, 1, 'science-completion badge')
})

test('awardForCompletion is idempotent across repeated finish calls', async () => {
  const { harness, service } = buildService()
  markStreamCompleted(harness, 1, 1)
  await service.awardForCompletion({ studentId: 1, streamId: 1, completedAt: Date.now() })
  const second = await service.awardForCompletion({ studentId: 1, streamId: 1, completedAt: Date.now() + 1000 })
  assert.equal(second.badgeAwarded, false)
  assert.equal(second.certificateIssued, false)
  assert.equal(harness.achievementsStore.studentBadges.length, 1, 'no duplicate badge')
  assert.equal(harness.achievementsStore.certificates.length, 1, 'no duplicate certificate')
})

test('awardForCompletion is per-stream: two streams yield two awards', async () => {
  const { harness, service } = buildService()
  markStreamCompleted(harness, 1, 1)
  markStreamCompleted(harness, 1, 2)
  await service.awardForCompletion({ studentId: 1, streamId: 1, completedAt: Date.now() })
  await service.awardForCompletion({ studentId: 1, streamId: 2, completedAt: Date.now() })
  assert.equal(harness.achievementsStore.studentBadges.length, 2)
  assert.equal(harness.achievementsStore.certificates.length, 2)
})

test('awardForCompletion rejects malformed input', async () => {
  const { service } = buildService()
  await assert.rejects(service.awardForCompletion({ studentId: 'x', streamId: 1, completedAt: 1 }), (err) => err instanceof AchievementsError)
  await assert.rejects(service.awardForCompletion({ studentId: 1, streamId: 0, completedAt: 1 }), (err) => err instanceof AchievementsError)
})

export default { tests: true }