/**
 * Game Session — achievements completion hook (Task 5.8).
 *
 * Verifies that finishSession drives the achievements awarding path through
 * the same in-memory stack the live leaderboard hook uses: after the fifth
 * (stream-completing) finish the completion badge + certificate are awarded
 * once via the hook, repeat finishes are idempotent, and a failing
 * achievements service can never break the session finish (best-effort).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createMemoryStore, createMemoryRepositories } from '../repositories/memory.js'
import { demoBaseData, seedStoreFromBaseData } from '../demo/seed-data.js'
import GameSessionService from '../service/game-session-service.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'
import {
  createMissionMemoryRepositories,
  createMissionMemoryStore,
  seedMissionStore,
} from '../../mission/repositories/memory.js'
import {
  createAchievementsMemoryStore,
  createAchievementsMemoryRepositories,
} from '../../achievements/repositories/memory.js'
import { AchievementsService } from '../../achievements/service/achievements-service.js'

const CODE = ['SQ-AAAAAA-BBBBBB']

function buildStack({ achievementsServiceFactory = (service) => service } = {}) {
  const gameStore = createMemoryStore()
  seedStoreFromBaseData(gameStore, demoBaseData())
  const base = gameStore.questions[0]
  for (const levelId of [2, 3, 4, 5]) {
    for (let i = 0; i < 3; i += 1) {
      gameStore.questions.push({ ...base, id: levelId * 1000 + i, levelId })
    }
  }
  const gameRepos = createMemoryRepositories(gameStore)

  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)
  gameRepos.studentRepository = {
    findById: async (id) => (await studentRepos.studentRepository.findById(id)) ?? null,
  }

  const missionStore = createMissionMemoryRepositories(
    seedMissionStore(createMissionMemoryStore(), {
      streams: [
        { id: 1, slug: 'science', name: 'Science', description: 'Science', isActive: true, displayOrder: 1 },
        { id: 2, slug: 'technology', name: 'Technology', description: 'Technology', isActive: true, displayOrder: 2 },
        { id: 3, slug: 'engineering', name: 'Engineering', description: 'Engineering', isActive: true, displayOrder: 3 },
        { id: 4, slug: 'mathematics', name: 'Mathematics', description: 'Mathematics', isActive: true, displayOrder: 4 },
      ],
    })
  )
  const achievementsStore = createAchievementsMemoryStore()
  const achievementsRepos = createAchievementsMemoryRepositories(achievementsStore)
  const achievementsService = new AchievementsService({
    progressionRepository: gameRepos.progressionRepository,
    badgeRepository: achievementsRepos.badgeRepository,
    studentBadgeRepository: achievementsRepos.studentBadgeRepository,
    certificateRepository: achievementsRepos.certificateRepository,
    studentRepository: gameRepos.studentRepository,
    streamRepository: missionStore.streamRepository,
    makeCertificateCode: () => CODE[0],
  })
  const wired = achievementsServiceFactory(achievementsService)
  const gameService = new GameSessionService({ ...gameRepos, achievementsService: wired })

  return { gameStore, gameService, achievementsStore, studentService }
}

async function registerStudent({ studentService }) {
  const result = await studentService.register({
    body: { initials: 'QA', name: 'Amaya Silva', school: 'Colombo High', grade: 7 },
  })
  return result.student
}

function correctResponse(gameStore, questionId) {
  const q = gameStore.questions.find((x) => x.id === Number(questionId))
  assert.ok(q, `question ${questionId} exists in the pool`)
  return {
    placements: q.correctAnswer.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })),
  }
}

async function playAndFinish(gameService, gameStore, student, streamId, levelId) {
  const session = await gameService.startSession({ studentId: student.id, streamId, levelId })
  let round = session.currentRound
  for (let i = 0; i < 3; i += 1) {
    const result = await gameService.submitRound({
      sessionId: session.session.id,
      roundId: round.roundId,
      studentId: student.id,
      submission: {
        response: correctResponse(gameStore, round.questionId),
        interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 },
      },
    })
    if (result.nextRound) round = result.nextRound
  }
  return gameService.finishSession({ studentId: student.id, sessionId: session.session.id })
}

test('finishing the final level awards the completion badge + certificate exactly once', async () => {
  const { gameStore, gameService, achievementsStore, studentService } = buildStack()
  const student = await registerStudent({ studentService })

  for (let levelId = 1; levelId <= 5; levelId += 1) {
    await playAndFinish(gameService, gameStore, student, 1, levelId)
  }

  const streamRow = gameStore.studentProgress.find((p) => p.studentId === student.id && p.streamId === 1)
  assert.equal(streamRow.streamCompleted, true, 'stream completed after level 5')

  const badges = achievementsStore.studentBadges.filter((b) => b.studentId === student.id)
  assert.equal(badges.length, 1, 'one badge awarded via the hook')
  assert.equal(badges[0].badgeId, 1, 'science-completion badge')

  const certificates = achievementsStore.certificates.filter((c) => c.studentId === student.id)
  assert.equal(certificates.length, 1, 'one certificate issued via the hook')
  assert.equal(certificates[0].certificateCode, 'SQ-AAAAAA-BBBBBB')

  // A repeat finish is idempotent: no duplicate badge/certificate rows.
  await playAndFinish(gameService, gameStore, student, 1, 5)
  assert.equal(achievementsStore.studentBadges.filter((b) => b.studentId === student.id).length, 1)
  assert.equal(achievementsStore.certificates.filter((c) => c.studentId === student.id).length, 1)
})

test('streams not yet completed never award badges or certificates', async () => {
  const { gameStore, gameService, achievementsStore, studentService } = buildStack()
  const student = await registerStudent({ studentService })

  await playAndFinish(gameService, gameStore, student, 1, 1)

  assert.equal(gameStore.studentProgress.find((p) => p.studentId === student.id && p.streamId === 1).streamCompleted, false)
  assert.equal(achievementsStore.studentBadges.filter((b) => b.studentId === student.id).length, 0)
  assert.equal(achievementsStore.certificates.filter((c) => c.studentId === student.id).length, 0)
})

test('a failing achievements service never breaks the session finish (best-effort)', async () => {
  const { gameStore, gameService, achievementsStore, studentService } = buildStack({
    achievementsServiceFactory: (service) => ({
      ...service,
      awardForCompletion: async () => {
        throw new Error('boom')
      },
    }),
  })
  const student = await registerStudent({ studentService })

  for (let levelId = 1; levelId <= 5; levelId += 1) {
    const finish = await playAndFinish(gameService, gameStore, student, 1, levelId)
    assert.equal(finish.status, 'completed', `level ${levelId} finish resolves`)
    assert.equal(finish.result, 'passed', `level ${levelId} finish is a pass`)
  }
  assert.equal(achievementsStore.studentBadges.length, 0)
  assert.equal(achievementsStore.certificates.length, 0)
})