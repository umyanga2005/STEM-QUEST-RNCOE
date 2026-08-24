/**
 * Game Session — Supabase repository contract tests (Task 5.4).
 *
 * Validates every production repository adapter (game-session, student,
 * mission) against a deterministic in-memory fake of the live PostgREST
 * surface. Exercises the exact call patterns the services use and asserts the
 * domain round-trips — so a column-name drift between the repos and the 0001
 * migration fails loudly here, without needing a live database.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createFakeSupabaseClient, questionFixtureToRow } from './fake-supabase-client.js'
import { createSupabaseRepositories } from '../repositories/supabase.js'
import { createSupabaseStudentRepositories } from '../../student/repositories/supabase.js'
import { createSupabaseMissionRepositories } from '../../mission/repositories/supabase.js'
import { demoQuestions } from '../demo/seed-data.js'

/** Seeds the first N demo drag-drop questions as published rows. */
function seedQuestions(db, count = 3) {
  demoQuestions()
    .slice(0, count)
    .forEach((q) => db.tables.questions.rows.push(questionFixtureToRow(q)))
  return db
}

const DAY = 86_400_000

test('game-session question repository: eligible + byId round-trip', async () => {
  const { client, db } = createFakeSupabaseClient()
  seedQuestions(db, 3)
  const repos = createSupabaseRepositories({ client })

  const eligible = await repos.questionRepository.getEligibleQuestions({ streamId: 1, levelId: 1 })
  assert.equal(eligible.length, 3, '3 published questions for science level 1')
  assert.ok(eligible.every((q) => q.activityType === 'drag-drop'), 'activity slug joined from activity_types')
  assert.ok(eligible.every((q) => 'correctAnswer' in q && typeof q.correctAnswer.mappings === 'object'))

  const byId = await repos.questionRepository.getById(eligible[0].id)
  assert.equal(byId.id, eligible[0].id)
  assert.equal(byId.activityType, 'drag-drop')
  assert.ok(byId.correctAnswer.mappings.length > 0)

  const missing = await repos.questionRepository.getById(99_999)
  assert.equal(missing, null)
})

test('game-session repository: create → find → update → score lifecycle', async () => {
  const { client, db } = createFakeSupabaseClient()
  seedQuestions(db, 3)
  const repos = createSupabaseRepositories({ client })
  db.tables.students.rows.push({ id: 7, initials: 'QA', full_name: 'Quest Admin', school_id: 1, grade: 7, status: 'active', is_archived: false })
  db.tables.students.nextId = 8

  const session = await repos.gameSessionRepository.createSession({
    sessionCode: 'ABC123XY',
    studentId: 7,
    streamId: 1,
    levelId: 1,
    seed: 's1',
    selectedQuestionIds: [1, 2, 3],
    startedAt: Date.now(),
    metadata: { source: 'test' },
  })
  assert.ok(session.id > 0)
  assert.deepEqual(session.selectedQuestionIds, [1, 2, 3])
  assert.equal(session.status, 'active')

  const found = await repos.gameSessionRepository.findById(session.id)
  assert.equal(found.sessionCode, 'ABC123XY')

  const active = await repos.gameSessionRepository.findActiveByStudentStream(7, 1)
  assert.equal(active.id, session.id)
  const otherStream = await repos.gameSessionRepository.findActiveByStudentStream(7, 2)
  assert.equal(otherStream, null)

  const updated = await repos.gameSessionRepository.setTotalScore(session.id, 250)
  assert.equal(updated.totalScore, 250)

  const finished = await repos.gameSessionRepository.update(session.id, {
    status: 'completed',
    completedAt: Date.now(),
    totalScore: 250,
    totalTimeMs: 120_000,
    result: 'passed',
  })
  assert.equal(finished.status, 'completed')
  assert.equal(finished.result, 'passed')

  const score = await repos.gameSessionRepository.insertScore({
    sessionId: session.id,
    studentId: 7,
    streamId: 1,
    levelId: 1,
    score: 250,
    totalTimeMs: 120_000,
    roundBreakdown: [{ roundNumber: 1 }, { roundNumber: 2 }, { roundNumber: 3 }],
  })
  assert.equal(score.score, 250)
})

test('session round repository: create, order, markAnswered, appendAnswer, findById', async () => {
  const { client, db } = createFakeSupabaseClient()
  seedQuestions(db, 3)
  const repos = createSupabaseRepositories({ client })
  db.tables.students.rows.push({ id: 7, initials: 'QA', full_name: 'Quest Admin', school_id: 1, grade: 7, status: 'active', is_archived: false })
  db.tables.students.nextId = 8
  const startedAt = Date.now()
  const session = await repos.gameSessionRepository.createSession({
    sessionCode: 'SESS1234',
    studentId: 7,
    streamId: 1,
    levelId: 1,
    seed: 's',
    selectedQuestionIds: [1, 2, 3],
    startedAt,
  })

  const rounds = await repos.roundRepository.createRoundsForSession(
    session.id,
    [1, 2, 3].map((n) => ({
      roundNumber: n,
      questionId: n,
      activityTypeId: 1,
      activityType: 'drag-drop',
      basePoints: 100,
      startedAt,
    }))
  )
  assert.equal(rounds.length, 3)
  assert.deepEqual(rounds.map((r) => r.roundNumber), [1, 2, 3])
  assert.ok(rounds.every((r) => r.activityType === 'drag-drop'))
  assert.ok(rounds.every((r) => r.status === 'pending'))

  const fromDb = await repos.roundRepository.findBySessionId(session.id)
  assert.equal(fromDb.length, 3)
  assert.deepEqual(fromDb.map((r) => r.roundNumber), [1, 2, 3], 'ordered by round_number asc')

  const answered = await repos.roundRepository.markAnswered(rounds[0].id, {
    status: 'answered',
    attempts: 2,
    hintsUsed: 1,
    overtimeSeconds: 0,
    pointsEarned: 75,
    timeTakenMs: 30_000,
    answerData: { placements: [] },
    validationResult: { ok: true },
    answeredAt: startedAt + 30_000,
  })
  assert.equal(answered.status, 'answered')
  assert.equal(answered.pointsEarned, 75)
  assert.equal(answered.hintsUsed, 1)

  const byId = await repos.roundRepository.findById(rounds[0].id)
  assert.equal(byId.attempts, 2)

  const answer = await repos.roundRepository.appendAnswer({
    sessionId: session.id,
    roundId: rounds[0].id,
    questionId: rounds[0].questionId,
    attemptNumber: 1,
    answer: { placements: [] },
    validation: { ok: true },
    wasCorrect: false,
    pointsEarned: 75,
    timeTakenMs: 30_000,
  })
  assert.ok(answer.id > 0)
  assert.equal(answer.was_correct, false)
  assert.equal(db.tables.student_answers.rows.length, 1)

  const recent = await repos.gameSessionRepository.getRecentQuestionIds(7, { lastSessions: 5 })
  assert.deepEqual(recent.sort((a, b) => a - b), [1, 2, 3], 'round questions from the last sessions')
})

test('special access repository: active grants vs expired grants', async () => {
  const { client, db } = createFakeSupabaseClient()
  const repos = createSupabaseRepositories({ client })
  const now = Date.now()
  db.tables.special_access.rows.push(
    { id: 1, student_id: 7, stream_id: 1, level_id: null, is_active: true, expires_at: null },
    { id: 2, student_id: 7, stream_id: 2, level_id: null, is_active: true, expires_at: new Date(now + DAY).toISOString() },
    { id: 3, student_id: 7, stream_id: 3, level_id: null, is_active: true, expires_at: new Date(now - DAY).toISOString() },
    { id: 4, student_id: 7, stream_id: 4, level_id: null, is_active: false, expires_at: null }
  )

  const grants = await repos.specialAccessRepository.getActiveGrants(7)
  assert.equal(grants.length, 2, 'active + not-expired only')
  assert.ok(grants.every((g) => g.isActive))
  assert.deepEqual(grants.map((g) => g.streamId).sort(), [1, 2])
})

test('student, level and settings repositories', async () => {
  const { client, db } = createFakeSupabaseClient()
  const repos = createSupabaseRepositories({ client })
  db.tables.students.rows.push({ id: 7, initials: 'QA', full_name: 'Quest Admin', school_id: 1, grade: 7, status: 'active', is_archived: false })

  const student = await repos.studentRepository.findById(7)
  assert.equal(student.fullName, 'Quest Admin')
  assert.equal(student.status, 'active')
  assert.equal(await repos.studentRepository.findById(99_999), null)

  const level = await repos.levelRepository.findLevel({ streamId: 1, levelId: 1 })
  assert.equal(level.number, 1)
  assert.equal(level.defaultTimeSeconds, 90)
  const sameLevelWrongStream = await repos.levelRepository.findLevel({ streamId: 2, levelId: 2 })
  assert.equal(sameLevelWrongStream, null, 'composite FK: level 2 belongs to stream 1, not stream 2')

  const config = await repos.settingsRepository.getScoringConfig()
  assert.equal(config.hintDeduction, 5)
  assert.equal(config.attemptDeduction, 10)
  assert.equal(config.questionsPerSession, 3)
})

test('student repositories: school, student, session, settings, avatar storage', async () => {
  const { client, db } = createFakeSupabaseClient()
  const repos = createSupabaseStudentRepositories({ client })

  const school = await repos.schoolRepository.create({ name: 'Colombo High' })
  assert.ok(school.id > 0)

  const byName = await repos.schoolRepository.findByName('colombo high')
  assert.equal(byName.id, school.id, 'ilike match is case-insensitive')

  const student = await repos.studentRepository.create({
    initials: 'AS',
    fullName: 'Amaya Silva',
    schoolId: school.id,
    grade: 7,
    loginCode: 'AB12CD',
  })
  assert.equal(student.status, 'active', 'DB default applied')
  assert.equal((await repos.studentRepository.findByLoginCode('AB12CD')).id, student.id)

  await repos.sessionRepository.create({
    studentId: student.id,
    tokenHash: 'hash-abc',
    ipAddress: null,
    userAgent: null,
    expiresAt: Date.now() + 3_600_000,
  })
  const found = await repos.sessionRepository.findByTokenHash('hash-abc')
  assert.equal(found.studentId, student.id)
  assert.ok(found.expiresAt > Date.now())

  const ttl = await repos.settingsRepository.getSessionTtlSeconds()
  assert.equal(ttl, 3600)

  const path = await repos.avatarRepository.upload({
    studentId: student.id,
    buffer: new Uint8Array(16),
    mimeType: 'image/png',
  })
  assert.equal(path, `${student.id}/profile.png`)
  assert.ok(db.storage['student-avatars'][path], 'object stored in the private bucket')

  const url = await repos.avatarRepository.signedUrl(path)
  assert.match(url, new RegExp(`student-avatars/${student.id}/profile\\.png`))
})

test('mission repositories: streams, levels, progress, special access', async () => {
  const { client, db } = createFakeSupabaseClient()
  const repos = createSupabaseMissionRepositories({ client })

  const streams = await repos.streamRepository.listActive()
  assert.equal(streams.length, 4)
  assert.deepEqual(streams.map((s) => s.displayOrder), [1, 2, 3, 4], 'ordered by display_order')

  const levels = await repos.levelRepository.listForStream(1)
  assert.equal(levels.length, 5)
  assert.deepEqual(levels.map((l) => l.number), [1, 2, 3, 4, 5])

  db.tables.student_progress.rows.push({ id: 1, student_id: 7, stream_id: 1, current_level: 1, completed_levels: 0, stream_completed: false })
  db.tables.student_level_progress.rows.push({ id: 1, student_id: 7, stream_id: 1, level_id: 1, best_score: 200, attempts: 2, is_completed: true, last_played_at: new Date().toISOString() })

  const progress = await repos.progressRepository.getStudentProgress(7)
  assert.equal(progress.streamProgress.length, 1)
  assert.equal(progress.levelProgress.length, 1)
  assert.equal(progress.levelProgress[0].bestScore, 200)
  assert.equal(progress.levelProgress[0].isCompleted, true)

  db.tables.special_access.rows.push({ id: 1, student_id: 7, stream_id: 2, level_id: null, is_active: true, expires_at: null })
  const grants = await repos.specialAccessRepository.getActiveGrants(7)
  assert.equal(grants.length, 1)
  assert.equal(grants[0].streamId, 2)
})