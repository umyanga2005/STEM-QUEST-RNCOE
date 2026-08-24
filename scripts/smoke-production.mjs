#!/usr/bin/env node
/**
 * Task 5.4/5.5/5.6 — live production smoke test.
 *
 * Verifies the real Supabase integration end-to-end against the linked STEM
 * QUEST project:
 *
 *   1. Project identity + DB baseline (21 tables, RLS, seed catalogue).
 *   2. Controlled test fixtures (tagged, cleaned up afterwards) so the pool
 *      is never polluted: one smoke school/student + 3 published drag-drop
 *      questions tagged `smoke-test` (built from approved Task 3.2 fixtures).
 *   3. Real HTTP flow over `npm run api:production`: register, me, avatar,
 *      profile update (Task 5.6), mission, start/resume, submit ×3, finish
 *      (level 1), then the deferred progression checks (level 2 unlocked by
 *      completion, rows written), and the full 401/403/404/409 error matrix
 *      + security payload probe.
 *   4. Task 5.6 progress overview: GET /me/progress stays zero for a fresh
 *      student, advances truthfully after each level completion, never leaks
 *      attempts/bestScore per level, and stays isolated between students.
 *   5. Database assertions: one completed level-1 session + a level-2 session,
 *      6 answered rounds, 6 student_answers, 2 score ledger rows,
 *      student_progress + student_level_progress rows, hashed session token,
 *      private avatar object, correct answers present server-side only.
 *   6. Admin auth (Task 5.9): a temporary Supabase Auth admin user + `admins`
 *      row signs in and gets a safe `GET /api/admin/me`; the 401/403 matrix
 *      (missing/bogus/student token, non-admin identity) holds live; the
 *      temporary auth users + rows are removed afterwards.
 *   7. Question review + publish workflow (Task 5.13): the admin creates a
 *      release-ready draft, submits it (pending), sees it in the review queue,
 *      rejects it (note required), re-submits (fresh pending), approves it,
 *      publishes it (approved only), clones a draft v2, and publishing v2
 *      archives v1. The audit trail + `admin_actions` rows are verified and
 *      never leak secrets.
 *   8. Question media (Task 5.12): the admin uploads a real image to the
 *      private `question-media` bucket through the backend, gets a safe ref +
 *      signed preview URL, the student token is refused, invalid/oversized/
 *      traversal inputs are rejected, ownership isolation holds, and media
 *      referenced by a draft cannot be deleted until the draft is removed.
 *   9. Cleanup of every test row + uploaded object + verification that the DB
 *      and Storage return to their exact baseline.
 *
 * Run: `npm run smoke:production` (loads `.env` via `--env-file`).
 * Exits non-zero on the first failed check.
 */

import { createClient } from '@supabase/supabase-js'
import { createServer } from 'node:http'
import { createProductionApi, handle } from '../src/features/game-session/api/production-server.js'
import { demoQuestions } from '../src/features/game-session/demo/seed-data.js'

const PROJECT_REF = 'fmauqixvdpdgrghuapfs'
const TAG = 'smoke-test'
const PORT = Number(process.env.PORT) || 4101
const BASE = `http://localhost:${PORT}`

let passed = 0
function check(label, ok, detail = '') {
  passed += 1
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`  [${String(passed).padStart(2)}] ${mark}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) process.exitCode = 1
}

/** Plays a full 3-round session (all correct) then finishes it. */
async function playAndFinish(base, bearer, sessionId, correctByQuestionId) {
  let current = await (async () => {
    const resp = await fetch(`${base}/api/student/game/session/${sessionId}/current`, { headers: bearer })
    return (await resp.json()).currentRound
  })()
  for (let i = 0; i < 3; i += 1) {
    const correct = correctByQuestionId.get(current.questionId)
    const response = { placements: correct.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })) }
    const sub = await fetch(`${base}/api/student/game/session/${sessionId}/rounds/${current.roundId}/submit`, {
      method: 'POST',
      headers: { ...bearer, 'content-type': 'application/json' },
      body: JSON.stringify({ response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1 } }),
    })
    const body = await sub.json()
    check(`submit level round ${i + 1} (server-scored, correct)`, sub.status === 200
      && body.roundResult?.correct === true && body.roundResult?.pointsEarned > 0, `points=${body.roundResult?.pointsEarned}`)
    if (!body.nextRound) break
    current = body.nextRound
  }
  const finish = await fetch(`${base}/api/student/game/session/${sessionId}/finish`, { method: 'POST', headers: bearer })
  const finishBody = await finish.json()
  check(`finish persists completed session + ledger`, finish.status === 200 && finishBody.status === 'completed'
    && finishBody.roundBreakdown?.length === 3 && finishBody.result === 'passed',
    `score=${finishBody.sessionScore}/300 code=${finishBody.sessionCode}`)
  return finishBody
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run via `npm run smoke:production`).')
  }
  const urlRef = new URL(url).hostname.split('.')[0]
  check(`project identity: ${urlRef} matches linked project ${PROJECT_REF}`, urlRef === PROJECT_REF, url)

  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  // Dedicated auth client for Supabase Auth operations (Task 5.9). Supabase-js
  // switches the effective Authorization of a client to the signed-in user's
  // access token, which would subject every subsequent db.from() query to RLS
  // as that user. Keeping auth on its own client preserves the service-role
  // data client above.
  const authDb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // Every question id created through the admin API during the run (incl. ones
  // later deleted). Their immutable admin_actions audit rows are swept with the
  // questions so the DB returns to its exact baseline (Task 5.13).
  const smokeAuditTargetIds = new Set()

  // Idempotent removal of any smoke-test rows left by an aborted run, so a
  // re-run always starts from a clean, deterministic pool. Deletes in FK-safe
  // order: ledger/sessions before students (ON DELETE RESTRICT), questions
  // after sessions (session_rounds reference questions with RESTRICT).
  async function cleanupSmokeData(schoolName) {
    let schoolQuery = db.from('schools').select('id')
    schoolQuery = schoolName
      ? schoolQuery.eq('name', schoolName)
      : schoolQuery.ilike('name', 'STEM QUEST Smoke %')
    const { data: smokeSchools } = await schoolQuery
    const schoolIds = (smokeSchools ?? []).map((s) => s.id)
    if (schoolIds.length) {
      const { data: smokeStudents } = await db.from('students').select('id').in('school_id', schoolIds)
      const studentIds = (smokeStudents ?? []).map((s) => s.id)
      if (studentIds.length) {
        // Ledger + sessions first (their FKs to students are RESTRICT); rounds
        // and answers cascade off the session delete.
        await db.from('scores').delete().in('student_id', studentIds)
        await db.from('game_sessions').delete().in('student_id', studentIds)
        for (const table of ['student_progress', 'student_level_progress', 'special_access', 'student_sessions', 'leaderboard_entries', 'student_badges', 'certificates']) {
          await db.from(table).delete().in('student_id', studentIds)
        }
        await db.from('students').delete().in('id', studentIds)
      }
      await db.from('schools').delete().in('id', schoolIds)
    }
    // Questions last: session_rounds reference them with RESTRICT, so they can
    // only be removed once every smoke session (and its rounds) is gone.
    const { data: smokeQuestionIds } = await db.from('questions').select('id').contains('tags', [TAG])
    for (const id of smokeAuditTargetIds) smokeQuestionIds.push({ id })
    await db.from('questions').delete().contains('tags', [TAG])
    // admin_actions audit rows (Task 5.13) are immutable and not FK-linked to
    // questions, so they must be swept explicitly to restore the baseline.
    const auditIds = [...new Set((smokeQuestionIds ?? []).map((q) => String(q.id)))]
    if (auditIds.length) {
      await db.from('admin_actions').delete().in('target_id', auditIds)
    }
  }
  await cleanupSmokeData()

  // -- 1. DB baseline -------------------------------------------------------
  const [streams, levels, atypes, settings, badges] = await Promise.all([
    countWhere(db, 'streams'),
    countWhere(db, 'levels'),
    countWhere(db, 'activity_types'),
    countWhere(db, 'game_settings'),
    countWhere(db, 'badges'),
  ])
  check('DB catalogue seed intact', streams === 4 && levels === 20 && atypes === 10 && settings === 8 && badges === 4,
    `streams=${streams} levels=${levels} activity_types=${atypes} settings=${settings} badges=${badges}`)

  const baseline = {
    questions: await countWhere(db, 'questions'),
    students: await countWhere(db, 'students'),
    schools: await countWhere(db, 'schools'),
    sessions: await countWhere(db, 'game_sessions'),
    scores: await countWhere(db, 'scores'),
    answers: await countWhere(db, 'student_answers'),
    levelProgress: await countWhere(db, 'student_level_progress'),
    streamProgress: await countWhere(db, 'student_progress'),
    leaderboard: await countWhere(db, 'leaderboard_entries'),
    studentBadges: await countWhere(db, 'student_badges'),
    certificates: await countWhere(db, 'certificates'),
    admins: await countWhere(db, 'admins'),
    adminActions: await countWhere(db, 'admin_actions'),
  }
  check('no leftover smoke fixtures after pre-cleanup (idempotent re-run)', baseline.questions === 0 && baseline.leaderboard === 0
    && baseline.studentBadges === 0 && baseline.certificates === 0 && baseline.admins === 0,
    `questions=${baseline.questions} leaderboard=${baseline.leaderboard} student_badges=${baseline.studentBadges} certificates=${baseline.certificates} admins=${baseline.admins}`)

  // Task 5.10: the builder's Supabase repositories write a `meta` column
  // (0004_add_questions_meta.sql). Probing the column here confirms the live
  // project has it before any builder write is attempted.
  const { error: metaColumnErr } = await db.from('questions').select('id, meta').limit(1)
  check('DB: questions.meta column exists (0004 applied)', metaColumnErr === null, metaColumnErr?.message ?? '')

  // Task 5.12: the private question-media bucket must be empty before the run
  // (leftover smoke objects were swept with the leftover admin auth users).
  const { data: mediaBaselineObjects } = await db.storage.from('question-media').list()
  check('storage: question-media bucket is empty at baseline', Array.isArray(mediaBaselineObjects) && mediaBaselineObjects.length === 0,
    `objects=${mediaBaselineObjects?.length}`)

  // Admin smoke auth users (Task 5.9): created + removed around the run so the
  // Supabase Auth user pool returns to its exact baseline. The `public.admins`
  // rows reference these users with ON DELETE CASCADE (0001), so deleting the
  // auth user also removes the admin row.
  const createdAdminAuthIds = []
  const uploadedMediaRefs = []
  // Removes any question-media objects owned by a (smoke) admin auth user, so
  // storage also returns to its exact baseline (Task 5.12).
  async function sweepMediaForUsers(ownerIds) {
    if (!ownerIds.length) return
    const { data: objects } = await db.storage.from('question-media').list()
    const owned = (objects ?? [])
      .map((o) => o.name)
      .filter((name) => ownerIds.some((id) => name.startsWith(`${id}/uploads/`)))
    if (owned.length) await db.storage.from('question-media').remove(owned)
  }
  async function sweepLeftoverAdminUsers() {
    const { data: users } = await authDb.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const leftovers = (users?.users ?? []).filter((u) => /@stem-quest\.test$/.test(u.email ?? ''))
    await sweepMediaForUsers(leftovers.map((u) => u.id))
    for (const u of leftovers) {
      try {
        await authDb.auth.admin.deleteUser(u.id)
      } catch {
        /* best effort */
      }
    }
  }
  async function cleanupAdminAuth() {
    await sweepMediaForUsers(createdAdminAuthIds)
    for (const id of createdAdminAuthIds) {
      try {
        await authDb.auth.admin.deleteUser(id)
      } catch (err) {
        console.warn(`  admin auth user cleanup failed for ${id}: ${err.message}`)
      }
    }
    createdAdminAuthIds.length = 0
    await sweepLeftoverAdminUsers()
  }
  await sweepLeftoverAdminUsers()

  // -- 2. Controlled fixtures -------------------------------------------------
  const now = Date.now()
  const schoolName = `STEM QUEST Smoke ${now}`
  // 3 published level-1 questions + 3 level-2 clones (progression flow plays
  // level 2 after completing level 1). All tagged smoke-test.
  const questionRows = demoQuestions()
    .slice(0, 3)
    .map((q) => ({
      stream_id: q.streamId,
      level_id: q.levelId,
      activity_type_id: q.activityTypeId,
      prompt: q.prompt,
      instructions: q.instructions ?? null,
      explanation: null,
      payload: q.payload,
      correct_answer: q.correctAnswer,
      hints: q.hints ?? null,
      tags: [TAG],
      grade_min: q.gradeMin,
      grade_max: q.gradeMax,
      difficulty: q.difficulty,
      base_points: q.basePoints,
      timer_override_seconds: q.timerOverrideSeconds ?? null,
      status: 'published',
    }))
    .concat(
      demoQuestions()
        .slice(0, 3)
        .map((q) => ({
          stream_id: q.streamId,
          level_id: 2,
          activity_type_id: q.activityTypeId,
          prompt: `[L2] ${q.prompt}`,
          instructions: q.instructions ?? null,
          explanation: null,
          payload: q.payload,
          correct_answer: q.correctAnswer,
          hints: q.hints ?? null,
          tags: [TAG],
          grade_min: q.gradeMin,
          grade_max: q.gradeMax,
          difficulty: q.difficulty + 1,
          base_points: q.basePoints,
          timer_override_seconds: q.timerOverrideSeconds ?? null,
          status: 'published',
        }))
    )
  const { data: insertedQuestions, error: insertQErr } = await db.from('questions').insert(questionRows).select('*')
  if (insertQErr) throw new Error(`seed questions failed: ${insertQErr.message}`)
  const seededQuestions = insertedQuestions
  check('seeded 6 published smoke-test questions', seededQuestions.length === 6, `ids=${seededQuestions.map((x) => x.id).join(',')}`)

  const correctByQuestionId = new Map(seededQuestions.map((row) => [row.id, row.correct_answer]))

  // -- 3. Server + HTTP flow ---------------------------------------------------
  const { app, achievementsService } = await createProductionApi()
  const server = createServer((req, res) => handle(app, req, res))
  await new Promise((resolve) => server.listen(PORT, resolve))
  console.log(`\nProduction server on ${BASE}\n`)

  try {
    const json = async (resp) => ({ status: resp.status, body: await resp.json().catch(() => null) })
    const bearer = (token) => ({ authorization: `Bearer ${token}` })

    const health = await fetch(`${BASE}/api/health`)
    const healthBody = await health.json()
    check('health endpoint', health.status === 200 && healthBody.ok === true)

    // register (student A)
    const reg = await json(await fetch(`${BASE}/api/student/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initials: 'SS', name: 'Smoke Student', school: schoolName, grade: 7 }),
    }))
    check('register student', reg.status === 201 && typeof reg.body.token === 'string', `studentId=${reg.body.student?.id}`)
    const tokenA = reg.body.token
    const studentA = reg.body.student.id

    const me = await json(await fetch(`${BASE}/api/student/me`, { headers: bearer(tokenA) }))
    check('me returns safe identity', me.status === 200 && me.body.student.id === studentA && !JSON.stringify(me.body).includes('token'),
      `name=${me.body.student?.name}`)

    // avatar upload (valid 1x1 PNG)
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
    const form = new FormData()
    form.append('photo', new Blob([png], { type: 'image/png' }), 'profile.png')
    const avatar = await json(await fetch(`${BASE}/api/student/me/avatar`, { method: 'PUT', headers: bearer(tokenA), body: form }))
    check('avatar upload stored privately', avatar.status === 200 && /student-avatars/.test(avatar.body.student?.avatarUrl ?? ''),
      avatar.body.student?.avatarUrl)

    // mission
    const mission = await json(await fetch(`${BASE}/api/student/mission/streams`, { headers: bearer(tokenA) }))
    check('mission streams (4)', mission.status === 200 && mission.body.streams?.length === 4,
      mission.body.streams?.map((s) => s.slug).join(','))

    const levelsResp = await json(await fetch(`${BASE}/api/student/mission/streams/1/levels`, { headers: bearer(tokenA) }))
    check('mission levels (5, level 1 available)', levelsResp.status === 200 && levelsResp.body.levels?.length === 5
      && levelsResp.body.levels[0].access === 'available')

    // -- profile update + progress overview (Task 5.6) ------------------------
    const profileSchool = `STEM QUEST Smoke ${now} Profile`
    const putProfile = await json(await fetch(`${BASE}/api/student/me`, {
      method: 'PUT',
      headers: { ...bearer(tokenA), 'content-type': 'application/json' },
      body: JSON.stringify({ initials: 'SS', name: 'Smoke Student', school: profileSchool, grade: 8 }),
    }))
    check('profile update persists (school + grade)', putProfile.status === 200
      && putProfile.body.student?.school === profileSchool && putProfile.body.student?.grade === 8,
      `school=${putProfile.body.student?.school}`)

    const meAfter = await json(await fetch(`${BASE}/api/student/me`, { headers: bearer(tokenA) }))
    check('me reflects the profile update', meAfter.status === 200 && meAfter.body.student?.school === profileSchool
      && meAfter.body.student?.grade === 8 && meAfter.body.student?.name === 'Smoke Student')

    const putForeignScore = await json(await fetch(`${BASE}/api/student/me`, {
      method: 'PUT',
      headers: { ...bearer(tokenA), 'content-type': 'application/json' },
      body: JSON.stringify({ initials: 'SS', name: 'Smoke Student', school: profileSchool, grade: 8, score: 1000 }),
    }))
    check('profile update rejects foreign score field', putForeignScore.status === 400
      && putForeignScore.body.error?.code === 'STUDENT_UNEXPECTED_FIELD')

    const putForgedId = await json(await fetch(`${BASE}/api/student/me`, {
      method: 'PUT',
      headers: { ...bearer(tokenA), 'content-type': 'application/json' },
      body: JSON.stringify({ initials: 'SS', name: 'Smoke Student', school: profileSchool, grade: 8, studentId: 999999 }),
    }))
    check('profile update rejects a forged studentId', putForgedId.status === 400
      && putForgedId.body.error?.code === 'STUDENT_UNEXPECTED_FIELD')

    const freshProgress = await json(await fetch(`${BASE}/api/student/me/progress`, { headers: bearer(tokenA) }))
    const freshStreams = freshProgress.body.streams ?? []
    check('fresh progress overview: 4 streams, all zero, level 1 next',
      freshProgress.status === 200 && freshStreams.length === 4
      && freshStreams.every((s) => s.completedLevels === 0 && s.currentLevel === 1 && s.nextLevel?.number === 1)
      && freshProgress.body.overall?.completedLevels === 0 && freshProgress.body.overall?.totalAttempts === 0,
      `overall=${JSON.stringify(freshProgress.body.overall)}`)

    // game session start
    const start = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST',
      headers: { ...bearer(tokenA), 'content-type': 'application/json' },
      body: JSON.stringify({ streamId: 1, levelId: 1 }),
    }))
    check('start session (201, safe descriptor)', start.status === 201 && start.body.currentRound?.totalRounds === 3
      && start.body.currentRound?.activityType === 'drag-drop' && start.body.currentRound?.timer?.allowedSeconds === 90,
      `session=${start.body.session?.id} round=${start.body.currentRound?.roundId}`)
    const sessionId = start.body.session.id

    const current = await json(await fetch(`${BASE}/api/student/game/session/${sessionId}/current`, { headers: bearer(tokenA) }))
    check('current round resumes', current.status === 200 && current.body.currentRound?.roundId === start.body.currentRound.roundId)

    const resume = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST',
      headers: { ...bearer(tokenA), 'content-type': 'application/json' },
      body: JSON.stringify({ streamId: 1, levelId: 1 }),
    }))
    check('second start resumes same active session', resume.status === 201 && resume.body.session.id === sessionId)

    // submit 3 correct answers
    let round = start.body.currentRound
    let scoreTotal = null
    for (let i = 0; i < 3; i += 1) {
      const correct = correctByQuestionId.get(round.questionId)
      const response = { placements: correct.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })) }
      const sub = await json(await fetch(`${BASE}/api/student/game/session/${sessionId}/rounds/${round.roundId}/submit`, {
        method: 'POST',
        headers: { ...bearer(tokenA), 'content-type': 'application/json' },
        body: JSON.stringify({ response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1 } }),
      }))
      const ok = sub.status === 200 && sub.body.roundResult?.correct === true && sub.body.roundResult?.pointsEarned > 0
        && sub.body.progress?.completed === (i === 2)
      check(`submit round ${i + 1} (server-scored, correct)`, ok, `points=${sub.body.roundResult?.pointsEarned}`)
      scoreTotal = sub.body.score?.sessionRunningTotal
      if (sub.body.nextRound) round = sub.body.nextRound
      if (!ok) break
    }

    const doneCurrent = await json(await fetch(`${BASE}/api/student/game/session/${sessionId}/current`, { headers: bearer(tokenA) }))
    check('no pending round after all answers', doneCurrent.body.currentRound === null)

    const finish = await json(await fetch(`${BASE}/api/student/game/session/${sessionId}/finish`, { method: 'POST', headers: bearer(tokenA) }))
    check('finish persists completed session + ledger', finish.status === 200 && finish.body.status === 'completed'
      && finish.body.roundBreakdown?.length === 3 && finish.body.result === 'passed',
      `score=${finish.body.sessionScore}/300 code=${finish.body.sessionCode}`)

    // re-finish is idempotent: same payload, no extra writes
    const refinish = await json(await fetch(`${BASE}/api/student/game/session/${sessionId}/finish`, { method: 'POST', headers: bearer(tokenA) }))
    check('re-finish returns the same completion payload', refinish.status === 200
      && refinish.body.sessionScore === finish.body.sessionScore && refinish.body.status === 'completed')

    // -- deferred progression (Task 5.5) ---------------------------------------
    const { data: levelRow1 } = await db.from('student_level_progress')
      .select('*').eq('student_id', studentA).eq('level_id', 1).maybeSingle()
    check('DB: level-1 progression row completed (attempts 1)',
      levelRow1?.is_completed === true && levelRow1?.attempts === 1 && levelRow1?.best_score === scoreTotal,
      `best=${levelRow1?.best_score}`)

    const { data: streamRow } = await db.from('student_progress')
      .select('*').eq('student_id', studentA).eq('stream_id', 1).maybeSingle()
    check('DB: stream aggregate advanced (current_level 2)',
      streamRow?.current_level === 2 && streamRow?.completed_levels === 1 && streamRow?.stream_completed === false)

    const progressL1 = await json(await fetch(`${BASE}/api/student/me/progress`, { headers: bearer(tokenA) }))
    const scienceL1 = progressL1.body.streams?.find((s) => s.slug === 'science')
    check('progress overview after level 1: science 1/5, current level 2, next level 2',
      progressL1.status === 200 && scienceL1?.completedLevels === 1 && scienceL1?.currentLevel === 2
      && scienceL1?.completionPercent === 20 && scienceL1?.completed === false && scienceL1?.inProgress === true
      && scienceL1?.nextLevel?.number === 2 && scienceL1?.levels[1].access === 'available'
      && scienceL1?.bestScore === scoreTotal && scienceL1?.totalAttempts === 1,
      `science=${JSON.stringify({ completedLevels: scienceL1?.completedLevels, currentLevel: scienceL1?.currentLevel, next: scienceL1?.nextLevel?.number })}`)

    // Level 2 is now unlocked by progression (not by any grant).
    const start2 = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST',
      headers: { ...bearer(tokenA), 'content-type': 'application/json' },
      body: JSON.stringify({ streamId: 1, levelId: 2 }),
    }))
    check('level 2 unlocked by level-1 completion (201)', start2.status === 201,
      `session=${start2.body.session?.id}`)
    const session2Id = start2.body.session?.id
    const finish2 = await playAndFinish(BASE, bearer(tokenA), session2Id, correctByQuestionId)

    const { data: levelRow2 } = await db.from('student_level_progress')
      .select('*').eq('student_id', studentA).eq('level_id', 2).maybeSingle()
    check('DB: level-2 progression row completed after finish',
      levelRow2?.is_completed === true && levelRow2?.attempts === 1)

    const { data: streamRow2 } = await db.from('student_progress')
      .select('*').eq('student_id', studentA).eq('stream_id', 1).maybeSingle()
    check('DB: stream aggregate now at level 3',
      streamRow2?.current_level === 3 && streamRow2?.completed_levels === 2)

    const progressL2 = await json(await fetch(`${BASE}/api/student/me/progress`, { headers: bearer(tokenA) }))
    const scienceL2 = progressL2.body.streams?.find((s) => s.slug === 'science')
    check('progress overview after level 2: science 2/5, current level 3',
      progressL2.status === 200 && scienceL2?.completedLevels === 2 && scienceL2?.currentLevel === 3
      && scienceL2?.nextLevel?.number === 3 && scienceL2?.totalAttempts === 2
      && progressL2.body.overall?.completedLevels === 2 && progressL2.body.overall?.totalAttempts === 2,
      `science=${JSON.stringify({ completedLevels: scienceL2?.completedLevels, currentLevel: scienceL2?.currentLevel, next: scienceL2?.nextLevel?.number })}`)

    const levelKeys = new Set((progressL2.body.streams ?? []).flatMap((s) => (s.levels ?? []).map((l) => Object.keys(l))).flat())
    check('per-level overview rows expose only the approved level surface',
      !['attempts', 'bestScore', 'correctAnswer', 'mappings'].some((k) => levelKeys.has(k))
      && [...levelKeys].every((k) => ['id', 'number', 'name', 'status', 'access', 'replayable'].includes(k)),
      `keys=${[...levelKeys].join(',')}`)

    // Level 3 passes the unlock gate now (level 2 completed) — the chain
    // advanced. It fails only on the missing level-3 pool, NOT on a lock.
    const level3Start = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { ...bearer(tokenA), 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 1, levelId: 3 }),
    }))
    check('level 3 no longer level-locked after level 2 (pool-limited only)', level3Start.status === 409
      && level3Start.body.error?.code === 'GAME_INSUFFICIENT_POOL', `code=${level3Start.body.error?.code}`)

    // -- live leaderboard (Task 5.7) ------------------------------------------
    const lbAll = await json(await fetch(`${BASE}/api/student/leaderboards`, { headers: bearer(tokenA) }))
    check('leaderboards endpoint lists all four streams',
      lbAll.status === 200 && (lbAll.body.leaderboards ?? []).length === 4
      && lbAll.body.leaderboards.every((b) => ['science', 'technology', 'engineering', 'mathematics'].includes(b.stream.slug)),
      (lbAll.body.leaderboards ?? []).map((b) => b.stream.slug).join(','))

    const lbSci = await json(await fetch(`${BASE}/api/student/leaderboards/1`, { headers: bearer(tokenA) }))
    const sciLb = lbSci.body
    check('science board returns A’s best score (300) at rank 1 with self highlight',
      lbSci.status === 200 && sciLb.stream?.slug === 'science'
      && sciLb.entries?.length === 1 && sciLb.entries[0].rank === 1
      && sciLb.entries[0].score === 300 && sciLb.entries[0].displayName === 'SS Smoke Student'
      && sciLb.entries[0].self === true,
      JSON.stringify(sciLb.entries))

    const lbTech = await json(await fetch(`${BASE}/api/student/leaderboards/2`, { headers: bearer(tokenA) }))
    check('technology board is stream-isolated (empty for A)',
      lbTech.status === 200 && lbTech.body.entries?.length === 0)

    const lbPublic = await json(await fetch(`${BASE}/api/student/leaderboards/1`))
    check('public board (no token) still returns the score with self=false',
      lbPublic.status === 200 && lbPublic.body.entries[0]?.score === 300 && lbPublic.body.entries[0]?.self === false)

    const { data: lbRow } = await db.from('leaderboard_entries')
      .select('*').eq('student_id', studentA).eq('stream_id', 1).maybeSingle()
    check('DB: one leaderboard row with the derived display name + best score 300',
      lbRow?.score === 300 && lbRow?.display_name === 'SS Smoke Student' && lbRow?.student_id === studentA)

    // best-score rule: a lower-scoring replay must NOT overwrite the 300.
    const replay = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { ...bearer(tokenA), 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 1, levelId: 1 }),
    }))
    const replayId = replay.body.session.id
    let replayRound = replay.body.currentRound
    for (let i = 0; i < 3; i += 1) {
      const correct = correctByQuestionId.get(replayRound.questionId)
      let response
      if (i === 0) {
        // deliberately wrong first round (swap two item zones) -> total < 300
        const [first, second] = correct.mappings
        response = { placements: correct.mappings.map((m) => (m === first ? { itemId: second.itemId, zoneId: second.zoneId } : m === second ? { itemId: first.itemId, zoneId: first.zoneId } : { itemId: m.itemId, zoneId: m.zoneId })) }
      } else {
        response = { placements: correct.mappings.map((m) => ({ itemId: m.itemId, zoneId: m.zoneId })) }
      }
      const sub = await json(await fetch(`${BASE}/api/student/game/session/${replayId}/rounds/${replayRound.roundId}/submit`, {
        method: 'POST', headers: { ...bearer(tokenA), 'content-type': 'application/json' }, body: JSON.stringify({ response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 1 } }),
      }))
      if (sub.body.nextRound) replayRound = sub.body.nextRound
    }
    const replayFinish = await json(await fetch(`${BASE}/api/student/game/session/${replayId}/finish`, { method: 'POST', headers: bearer(tokenA) }))
    check('lower-scoring replay finishes cleanly', replayFinish.status === 200)
    const lbAfterReplay = await json(await fetch(`${BASE}/api/student/leaderboards/1`, { headers: bearer(tokenA) }))
    check('a lower-scoring replay does NOT overwrite the best score',
      lbAfterReplay.body.entries[0]?.score === 300 && lbAfterReplay.body.entries[0]?.rank === 1)
    const { count: lbCount } = await db.from('leaderboard_entries')
      .select('*', { count: 'exact', head: true }).eq('student_id', studentA).eq('stream_id', 1)
    check('DB: replay kept a single best-score row', lbCount === 1)

    const lbUnknown = await json(await fetch(`${BASE}/api/student/leaderboards/999`))
    check('404 for an unknown stream leaderboard', lbUnknown.status === 404
      && lbUnknown.body.error?.code === 'LEADERBOARD_STREAM_UNAVAILABLE')

    // -- live badges + certificates (Task 5.8) ----------------------------------
    const achNone = await json(await fetch(`${BASE}/api/student/achievements`, { headers: bearer(tokenA) }))
    const achBadgesNone = achNone.body.badges ?? []
    check('achievements catalogue: 4 badges, none awarded for a non-completer',
      achNone.status === 200 && achBadgesNone.length === 4
      && achBadgesNone.every((b) => b.awarded === false),
      achBadgesNone.map((b) => b.slug).join(','))

    const certNone = await json(await fetch(`${BASE}/api/student/certificates`, { headers: bearer(tokenA) }))
    check('no certificates before any stream completion',
      certNone.status === 200 && certNone.body.certificates?.length === 0)

    // Fresh student C completes stream 1 via the service role (the smoke pool
    // has no level 3+ questions, so a full playthrough is impossible here).
    // The achievements hook reads the trusted student_progress.stream_completed
    // gate and awards the badge + issues the certificate exactly as
    // GameSessionService.finishSession would (same method, same gate).
    const regC = await json(await fetch(`${BASE}/api/student/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initials: 'CC', name: 'Certified Kid', school: schoolName, grade: 8 }),
    }))
    const tokenC = regC.body.token
    const studentC = regC.body.student.id
    const completedAt = Date.now()
    const { error: seedProgErr } = await db.from('student_progress').upsert({
      student_id: studentC,
      stream_id: 1,
      current_level: 5,
      completed_levels: 5,
      stream_completed: true,
    }, { onConflict: 'student_id,stream_id' }).select()
    if (seedProgErr) throw new Error(`seed stream progress failed: ${seedProgErr.message}`)

    const award = await achievementsService.awardForCompletion({ studentId: studentC, streamId: 1, completedAt })
    check('completion hook awards the science badge + issues the certificate',
      award.badgeAwarded === true && award.certificateIssued === true,
      `badge=${award.badge?.slug} certificate=${award.certificate?.code}`)

    const { data: sbRow } = await db.from('student_badges').select('*').eq('student_id', studentC).maybeSingle()
    check('DB: one student_badges row (science-completion)',
      Boolean(sbRow) && sbRow.badge_id === 1, `badgeId=${sbRow?.badge_id}`)

    const { data: certRow } = await db.from('certificates').select('*').eq('student_id', studentC).maybeSingle()
    check('DB: one certificates row — public code, no stored PDF, not revoked',
      Boolean(certRow) && /^SQ-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(certRow.certificate_code)
      && certRow.document_path === null && certRow.generated_at === null && certRow.revoked === false,
      certRow?.certificate_code)

    const achAfter = await json(await fetch(`${BASE}/api/student/achievements`, { headers: bearer(tokenC) }))
    const scienceBadge = achAfter.body.badges?.find((b) => b.slug === 'science-completion')
    check('achievements catalogue now shows the awarded badge',
      achAfter.status === 200 && scienceBadge?.awarded === true && typeof scienceBadge.awardedAt === 'number')

    const certList = await json(await fetch(`${BASE}/api/student/certificates`, { headers: bearer(tokenC) }))
    const cert = certList.body.certificates?.[0]
    check('certificates list returns the issued certificate (no revoked rows shown)',
      certList.status === 200 && certList.body.certificates?.length === 1
      && certList.body.revokedCount === 0 && /^SQ-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(cert.code)
      && typeof cert.pdfUrl === 'string', `code=${cert?.code}`)

    const pdfResp = await fetch(`${BASE}${cert.pdfUrl}`, { headers: bearer(tokenC) })
    const pdfBytes = Buffer.from(await pdfResp.arrayBuffer())
    check('on-demand PDF is a valid PDF (application/pdf, %PDF header, xref)',
      pdfResp.status === 200 && pdfResp.headers.get('content-type') === 'application/pdf'
      && pdfBytes.subarray(0, 5).toString() === '%PDF-' && pdfBytes.includes(Buffer.from('xref')),
      `${pdfBytes.length} bytes`)

    const verify = await json(await fetch(`${BASE}/api/certificates/verify/${cert.code}`))
    const verifyPayload = JSON.stringify(verify.body)
    check('public verification returns safe data (no private fields)',
      verify.status === 200 && verify.body.valid === true && verify.body.certificate?.code === cert.code
      && verify.body.certificate?.studentName === 'CC Certified Kid'
      && !/studentId|student_id|loginCode|token|hash|score/.test(verifyPayload),
      JSON.stringify(verify.body.certificate))

    const foreignPdf = await fetch(`${BASE}${cert.pdfUrl}`, { headers: bearer(tokenA) })
    check('another student cannot download C’s certificate (404 ownership)',
      foreignPdf.status === 404)

    const { error: revokeErr } = await db.from('certificates')
      .update({ revoked: true, revoked_at: new Date(completedAt).toISOString() }).eq('id', cert.id)
    if (revokeErr) throw new Error(`revoke failed: ${revokeErr.message}`)
    const revokedList = await json(await fetch(`${BASE}/api/student/certificates`, { headers: bearer(tokenC) }))
    check('revoked certificate leaves the student list (revokedCount 1)',
      revokedList.status === 200 && revokedList.body.certificates?.length === 0 && revokedList.body.revokedCount === 1)
    const revokedPdf = await fetch(`${BASE}/api/student/certificates/${cert.id}/pdf`, { headers: bearer(tokenC) })
    check('revoked certificate returns 410 on the PDF route', revokedPdf.status === 410)
    const verifyRevoked = await json(await fetch(`${BASE}/api/certificates/verify/${cert.code}`))
    check('public verification flags the revoked certificate',
      verifyRevoked.status === 200 && verifyRevoked.body.valid === false && verifyRevoked.body.certificate?.revoked === true)

    const verifyUnknown = await json(await fetch(`${BASE}/api/certificates/verify/SQ-NOPE00-NOPE00`))
    check('public verification of an unknown code returns 404',
      verifyUnknown.status === 404 && verifyUnknown.body.error?.code === 'ACHIEVEMENTS_NOT_FOUND')

    const achPayload = JSON.stringify([achNone.body, certNone.body, achAfter.body, certList.body, verify.body, verifyRevoked.body])
    check('no private fields leak from achievements payloads',
      !/studentId|student_id|loginCode|school|grade|tokenHash/.test(achPayload))

    // security payload probe across the whole session flow
    const allPayloads = JSON.stringify([start.body, current.body, resume.body, finish.body, refinish.body, start2.body, finish2, freshProgress.body, progressL1.body, progressL2.body])
    check('no scoring secrets in any payload', !/correctAnswer|correct_answer|correctnessFraction|acceptableIds/.test(allPayloads))

    // -- error matrix ---------------------------------------------------------
    const noToken = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 1, levelId: 1 }),
    }))
    check('401 missing token', noToken.status === 401 && noToken.body.error?.code === 'STUDENT_UNAUTHORIZED')

    const bogus = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { ...bearer('not-a-token'), 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 1, levelId: 1 }),
    }))
    check('401 bogus token', bogus.status === 401 && bogus.body.error?.code === 'STUDENT_INVALID_TOKEN')

    const regB = await json(await fetch(`${BASE}/api/student/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initials: 'B2', name: 'Smoke Student B', school: schoolName, grade: 8 }),
    }))
    const tokenB = regB.body.token
    const foreign = await json(await fetch(`${BASE}/api/student/game/session/${sessionId}/current`, { headers: bearer(tokenB) }))
    check('403 foreign student', foreign.status === 403 && foreign.body.error?.code === 'GAME_SESSION_WRONG_STUDENT')

    const lbForeign = await json(await fetch(`${BASE}/api/student/leaderboards/1`, { headers: bearer(tokenB) }))
    check('student B (never played) has no entry on the science board',
      lbForeign.status === 200 && lbForeign.body.entries.every((e) => e.self === false))

    const lbPayloads = JSON.stringify([lbAll.body, lbSci.body, lbTech.body, lbPublic.body, lbForeign.body])
    check('no private fields leak from leaderboard payloads',
      !/studentId|student_id|loginCode|school|grade|tokenHash/.test(lbPayloads))

    // A fresh student is still locked on level 2 (no progression, no grants).
    const lockedB = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { ...bearer(tokenB), 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 1, levelId: 2 }),
    }))
    check('409 locked level for a fresh student', lockedB.status === 409 && lockedB.body.error?.code === 'GAME_LEVEL_LOCKED')

    // Another student cannot start the level-2 session A just unlocked.
    const lockedB2 = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { ...bearer(tokenB), 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 1, levelId: 3 }),
    }))
    check('409 locked level for a fresh student (chain intact)', lockedB2.status === 409
      && lockedB2.body.error?.code === 'GAME_LEVEL_LOCKED')

    const progressB = await json(await fetch(`${BASE}/api/student/me/progress`, { headers: bearer(tokenB) }))
    const scienceB = progressB.body.streams?.find((s) => s.slug === 'science')
    check('progress is isolated per student (B stays zero while A advanced)',
      progressB.status === 200 && scienceB?.completedLevels === 0 && scienceB?.currentLevel === 1
      && progressB.body.overall?.completedLevels === 0 && progressB.body.overall?.bestScore === null,
      `B science=${JSON.stringify({ completedLevels: scienceB?.completedLevels, currentLevel: scienceB?.currentLevel })}`)

    const fresh = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { ...bearer(tokenA), 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 1, levelId: 1 }),
    }))
    const freshId = fresh.body.session?.id

    const badRound = await json(await fetch(`${BASE}/api/student/game/session/${freshId}/rounds/999999/submit`, {
      method: 'POST', headers: { ...bearer(tokenA), 'content-type': 'application/json' }, body: JSON.stringify({ response: {}, interactionMetrics: {} }),
    }))
    check('404 unknown round', badRound.status === 404 && badRound.body.error?.code === 'GAME_ROUND_NOT_FOUND')

    const unknownSession = await json(await fetch(`${BASE}/api/student/game/session/999999/current`, { headers: bearer(tokenA) }))
    check('404 unknown session', unknownSession.status === 404 && unknownSession.body.error?.code === 'GAME_SESSION_NOT_FOUND')

    const earlyFinish = await json(await fetch(`${BASE}/api/student/game/session/${freshId}/finish`, { method: 'POST', headers: bearer(tokenA) }))
    check('409 finish before complete', earlyFinish.status === 409 && earlyFinish.body.error?.code === 'GAME_SESSION_INVALID_STATE')

    const badBody = await json(await fetch(`${BASE}/api/student/game/session`, {
      method: 'POST', headers: { ...bearer(tokenA), 'content-type': 'application/json' }, body: JSON.stringify({ streamId: 'x', levelId: 'y' }),
    }))
    check('409 malformed stream/level input', badBody.status === 409)

    // -- admin auth + authorization (Task 5.9) --------------------------------
    const adminEmail = `smoke-admin-${now}@stem-quest.test`
    const adminPassword = `Sm0ke-Admin-${now}`
    const plainEmail = `smoke-plain-${now}@stem-quest.test`
    const plainPassword = `Sm0ke-Plain-${now}`

    const createAdmin = await authDb.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true })
    if (createAdmin.error) throw new Error(`admin auth user create failed: ${createAdmin.error.message}`)
    const adminAuthId = createAdmin.data.user.id
    createdAdminAuthIds.push(adminAuthId)
    const { error: adminRowErr } = await db.from('admins').insert({
      id: adminAuthId,
      display_name: 'Smoke Console Admin',
      role: 'admin',
      is_active: true,
    })
    if (adminRowErr) throw new Error(`admins insert failed: ${adminRowErr.message}`)

    const adminSignIn = await authDb.auth.signInWithPassword({ email: adminEmail, password: adminPassword })
    if (adminSignIn.error) throw new Error(`admin sign-in failed: ${adminSignIn.error.message}`)
    const adminToken = adminSignIn.data.session.access_token

    const adminMe = await json(await fetch(`${BASE}/api/admin/me`, { headers: bearer(adminToken) }))
    check('admin /me returns the safe identity for an active admin',
      adminMe.status === 200 && adminMe.body.admin?.id === adminAuthId
      && adminMe.body.admin?.displayName === 'Smoke Console Admin' && adminMe.body.admin?.role === 'admin',
      `role=${adminMe.body.admin?.role}`)

    const adminPayload = JSON.stringify(adminMe.body)
    check('admin /me never leaks credentials or secrets',
      !/token|password|email|service-role|service_role|access_token|refresh_token/.test(adminPayload),
      JSON.stringify(adminMe.body))

    const adminNoToken = await json(await fetch(`${BASE}/api/admin/me`))
    check('admin 401 missing token', adminNoToken.status === 401
      && adminNoToken.body.error?.code === 'ADMIN_UNAUTHENTICATED')

    const adminBogus = await json(await fetch(`${BASE}/api/admin/me`, { headers: bearer('not-a-jwt') }))
    check('admin 401 bogus token', adminBogus.status === 401
      && adminBogus.body.error?.code === 'ADMIN_INVALID_TOKEN')

    const adminWithStudentToken = await json(await fetch(`${BASE}/api/admin/me`, { headers: bearer(tokenB) }))
    check('a student session token never grants admin (401)',
      adminWithStudentToken.status === 401 && adminWithStudentToken.body.error?.code === 'ADMIN_INVALID_TOKEN')

    const createPlain = await authDb.auth.admin.createUser({ email: plainEmail, password: plainPassword, email_confirm: true })
    if (createPlain.error) throw new Error(`plain auth user create failed: ${createPlain.error.message}`)
    createdAdminAuthIds.push(createPlain.data.user.id)
    const plainSignIn = await authDb.auth.signInWithPassword({ email: plainEmail, password: plainPassword })
    if (plainSignIn.error) throw new Error(`plain sign-in failed: ${plainSignIn.error.message}`)
    const plainToken = plainSignIn.data.session.access_token

    const plainMe = await json(await fetch(`${BASE}/api/admin/me`, { headers: bearer(plainToken) }))
    check('a valid Supabase identity that is not an admin → 403 ADMIN_FORBIDDEN',
      plainMe.status === 403 && plainMe.body.error?.code === 'ADMIN_FORBIDDEN',
      `code=${plainMe.body.error?.code}`)

    const { data: adminRow, error: adminRowQueryError } = await db.from('admins').select('id, role, is_active').eq('id', adminAuthId).maybeSingle()
    check('DB: admin row exists with is_active + role',
      Boolean(adminRow) && adminRow.role === 'admin' && adminRow.is_active === true,
      adminRowQueryError ? `query error: ${adminRowQueryError.message}` : '')

    // -- question builder (Task 5.10) -----------------------------------------
    const builder = async (path, init = {}) => {
      const resp = await fetch(`${BASE}/api/admin/questions${path}`, {
        ...init,
        headers: { ...(init.headers ?? {}), authorization: `Bearer ${adminToken}` },
      })
      return { status: resp.status, body: await resp.json().catch(() => null) }
    }

    const catalogue = await builder('/catalogue')
    check('builder catalogue returns 4 streams + 10 activity types',
      catalogue.status === 200 && catalogue.body.streams?.length === 4 && catalogue.body.activityTypes?.length === 10,
      `streams=${catalogue.body.streams?.length} types=${catalogue.body.activityTypes?.length}`)

    const beforeList = await builder('')
    check('builder list returns the seeded smoke-test pool (6 published, no drafts yet)',
      beforeList.status === 200 && Array.isArray(beforeList.body.questions) && beforeList.body.questions.length === 6
      && beforeList.body.questions.every((q) => q.status === 'published'),
      `listed=${beforeList.body.questions?.length}`)

    const draftBody = {
      stream: 'science',
      level: 1,
      activityType: 'drag-drop',
      prompt: 'Match each part of a cell to its role in the smoke question.',
      explanation: 'The nucleus controls the cell and the membrane protects it.',
      gradeMin: 6,
      gradeMax: 8,
      difficulty: 2,
      basePoints: 100,
      topic: 'biology',
      subtopic: 'cells',
      tags: [TAG],
      status: 'published',
      payload: {
        schemaVersion: '1.0',
        mode: 'multi-target',
        allowRetry: true,
        randomizeItems: true,
        items: [
          { id: 'nucleus', label: 'Nucleus' },
          { id: 'membrane', label: 'Cell membrane' },
        ],
        zones: [
          { id: 'control', label: 'Controls the cell' },
          { id: 'boundary', label: 'Outer boundary' },
        ],
      },
      correctAnswer: {
        mappings: [
          { itemId: 'nucleus', zoneId: 'control' },
          { itemId: 'membrane', zoneId: 'boundary' },
        ],
      },
      meta: {
        objective: 'Identify the role of cell parts.',
      },
    }

    const created = await builder('', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draftBody) })
    const createdQuestion = created.body.question
    check('builder create forces status draft + version 1 (D-044, client cannot publish)',
      created.status === 201 && createdQuestion?.status === 'draft' && createdQuestion?.version === 1
      && createdQuestion?.activitySchemaVersion === '1.0' && createdQuestion?.topic === 'biology'
      && createdQuestion?.subtopic === 'cells' && createdQuestion?.stream === 'science',
      `id=${createdQuestion?.id} status=${createdQuestion?.status} version=${createdQuestion?.version}`)

    const builderId = createdQuestion?.id
    if (builderId != null) smokeAuditTargetIds.add(builderId)
    check('builder create persists authoring meta (0004)',
      createdQuestion?.meta?.objective === 'Identify the role of cell parts.',
      JSON.stringify(createdQuestion?.meta))

    const full = await builder(`/${builderId}`)
    check('builder get returns the full admin surface incl. correctAnswer + meta',
      full.status === 200 && Array.isArray(full.body.question?.correctAnswer?.mappings)
      && full.body.question?.meta?.objective === 'Identify the role of cell parts.',
      `id=${full.body.question?.id}`)

    const listed = await builder('')
    const listedRow = listed.body.questions?.find((q) => q.id === builderId)
    const listedPayload = JSON.stringify(listed.body)
    check('builder list exposes previews only — no correctAnswer, no meta',
      listed.status === 200 && listedRow && !('correctAnswer' in listedRow) && !('meta' in listedRow)
      && !/correctAnswer|mappings/.test(listedPayload),
      `listed=${listed.body.questions?.length}`)

    const updated = await builder(`/${builderId}`, {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...draftBody, status: 'draft', prompt: 'Match each part of a cell to its role (revised).' }),
    })
    check('builder update edits a draft in place, preserving version',
      updated.status === 200 && updated.body.question?.prompt === 'Match each part of a cell to its role (revised).'
      && updated.body.question?.version === 1 && updated.body.question?.status === 'draft',
      `version=${updated.body.question?.version} prompt=${updated.body.question?.prompt}`)

    const invalid = await builder('', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...draftBody, prompt: 'Match each part of a cell to its role in the smoke question.', payload: { schemaVersion: '1.0', mode: 'multi-target', items: 'nope', zones: [] } }),
    })
    check('builder rejects an invalid draft (400 QUESTION_VALIDATION_FAILED)',
      invalid.status === 400 && invalid.body.error?.code === 'QUESTION_VALIDATION_FAILED'
      && Array.isArray(invalid.body.error?.fields) && invalid.body.error?.fields?.length > 0,
      `code=${invalid.body.error?.code} fields=${invalid.body.error?.fields?.length}`)

    const afterInvalid = await builder('')
    check('the rejected draft was NOT persisted (pool unchanged at 6 + 1 valid draft)',
      afterInvalid.status === 200 && afterInvalid.body.questions?.length === 7
      && afterInvalid.body.questions.find((q) => q.id === builderId),
      `listed=${afterInvalid.body.questions?.length}`)

    const unknown = await builder('/999999')
    check('builder 404 for an unknown question id',
      unknown.status === 404 && unknown.body.error?.code === 'QUESTION_NOT_FOUND')

    const removed = await builder(`/${builderId}`, { method: 'DELETE' })
    check('builder delete removes the draft', removed.status === 200 && removed.body.removed === true)

    const finalList = await builder('')
    check('builder list is back to the 6 seeded questions after delete (no draft remains)',
      finalList.status === 200 && finalList.body.questions?.length === 6
      && !finalList.body.questions.some((q) => q.id === builderId),
      `listed=${finalList.body.questions?.length}`)

    const builderNoAuth = await fetch(`${BASE}/api/admin/questions/`)
    check('builder route stays behind admin auth (401 without token)',
      builderNoAuth.status === 401 && (await builderNoAuth.json()).error?.code === 'ADMIN_UNAUTHENTICATED')

    const builderPayloads = JSON.stringify([created.body, full.body, listed.body, updated.body, invalid.body, removed.body])
    check('no secret keys leak from any builder payload',
      !/service-role|service_role|access_token|refresh_token|password/.test(builderPayloads))

    // -- question review + publish workflow (Task 5.13) ----------------------
    const reviewBody = {
      ...draftBody,
      prompt: 'Match each part of a cell to its role in the review workflow.',
      meta: { objective: 'Identify the role of cell parts.', feedback: { correct: 'Correct!', incorrect: 'Not quite.' } },
    }
    const reviewCreated = await builder('', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reviewBody) })
    const reviewId = reviewCreated.body?.question?.id
    if (reviewId != null) smokeAuditTargetIds.add(reviewId)
    check('review: create a draft for the workflow (201)',
      reviewCreated.status === 201 && reviewId != null && reviewCreated.body.question?.status === 'draft',
      `id=${reviewId}`)

    const submit = await builder(`/${reviewId}/submit`, { method: 'POST' })
    check('review: submitting a release-ready draft marks it pending (200)',
      submit.status === 200 && submit.body.question?.status === 'draft'
      && submit.body.question?.meta?.review?.state === 'pending'
      && submit.body.question?.meta?.review?.version === 1
      && submit.body.question?.meta?.review?.submittedByAdminId === adminAuthId,
      `state=${submit.body.question?.meta?.review?.state}`)

    const queue = await builder('/review')
    const queued = queue.body.questions?.find((q) => q.id === reviewId)
    const queuePayload = JSON.stringify(queue.body)
    check('review queue lists the pending draft as a preview only',
      queue.status === 200 && queued && queued.status === 'draft'
      && !('correctAnswer' in queued) && !('meta' in queued)
      && !/correctAnswer|"meta"/.test(queuePayload),
      `queued=${queue.body.questions?.length}`)

    const rejectNoNote = await builder(`/${reviewId}/reject`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })
    check('review: rejecting without a note is refused (400 REVIEW_NOTE_REQUIRED)',
      rejectNoNote.status === 400 && rejectNoNote.body.error?.code === 'QUESTION_REVIEW_NOTE_REQUIRED')

    const reject = await builder(`/${reviewId}/reject`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: 'tighten the prompt' }) })
    check('review: rejection with a note records the reason and stays a draft (200)',
      reject.status === 200 && reject.body.question?.status === 'draft'
      && reject.body.question?.meta?.review?.state === 'rejected'
      && reject.body.question?.meta?.review?.note === 'tighten the prompt'
      && reject.body.question?.meta?.review?.reviewerAdminId === adminAuthId,
      `state=${reject.body.question?.meta?.review?.state}`)

    const resubmit = await builder(`/${reviewId}/submit`, { method: 'POST' })
    check('review: re-submitting a rejected draft creates a fresh pending review (200)',
      resubmit.status === 200 && resubmit.body.question?.meta?.review?.state === 'pending'
      && resubmit.body.question?.meta?.review?.version === 1
      && resubmit.body.question?.meta?.review?.note === undefined,
      `state=${resubmit.body.question?.meta?.review?.state}`)

    const approve = await builder(`/${reviewId}/approve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: 'approved for publish' }) })
    check('review: approval flips the review to approved (200)',
      approve.status === 200 && approve.body.question?.meta?.review?.state === 'approved'
      && approve.body.question?.meta?.review?.reviewerAdminId === adminAuthId,
      `state=${approve.body.question?.meta?.review?.state}`)

    const queueAfterApprove = await builder('/review')
    check('approved drafts leave the pending queue',
      queueAfterApprove.status === 200 && !queueAfterApprove.body.questions?.some((q) => q.id === reviewId),
      `queued=${queueAfterApprove.body.questions?.length}`)

    const publish = await builder(`/${reviewId}/publish`, { method: 'POST' })
    check('review: an approved draft publishes (200)',
      publish.status === 200 && publish.body.question?.status === 'published'
      && publish.body.question?.meta?.review?.state === 'approved',
      `status=${publish.body.question?.status}`)

    const publishAgain = await builder(`/${reviewId}/publish`, { method: 'POST' })
    check('review: publishing a published question is refused (409 INVALID_STATE)',
      publishAgain.status === 409 && publishAgain.body.error?.code === 'QUESTION_INVALID_STATE')

    const versioned = await builder(`/${reviewId}/versions`, { method: 'POST' })
    const v2Id = versioned.body?.question?.id
    if (v2Id != null) smokeAuditTargetIds.add(v2Id)
    check('review: a published question clones into a draft v2 (201)',
      versioned.status === 201 && v2Id != null && versioned.body.question?.status === 'draft'
      && versioned.body.question?.version === 2
      && versioned.body.question?.meta?.sourceQuestionId === reviewId
      && versioned.body.question?.meta?.sourceVersion === 1,
      `v2=${v2Id}`)

    const archiveDraft = await builder(`/${v2Id}/archive`, { method: 'POST' })
    check('review: archiving a draft is refused (409 INVALID_STATE)',
      archiveDraft.status === 409 && archiveDraft.body.error?.code === 'QUESTION_INVALID_STATE')

    const v2Submit = await builder(`/${v2Id}/submit`, { method: 'POST' })
    check('review: the v2 draft submits for review (200)',
      v2Submit.status === 200 && v2Submit.body.question?.meta?.review?.state === 'pending')

    const v2Approve = await builder(`/${v2Id}/approve`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: 'v2 approved' }) })
    const v2Publish = await builder(`/${v2Id}/publish`, { method: 'POST' })
    check('review: publishing v2 archives v1 (v1 superseded)',
      v2Approve.status === 200 && v2Publish.status === 200 && v2Publish.body.question?.status === 'published')

    const v1AfterV2 = await builder(`/${reviewId}`)
    check('review: v1 is archived once v2 publishes, content untouched',
      v1AfterV2.status === 200 && v1AfterV2.body.question?.status === 'archived'
      && v1AfterV2.body.question?.prompt === reviewBody.prompt
      && v1AfterV2.body.question?.version === 1,
      `status=${v1AfterV2.body.question?.status}`)

    const audit = await builder(`/${reviewId}/audit`)
    const auditActions = audit.body.actions?.map((a) => a.action) ?? []
    check('review: audit trail records the lifecycle newest-first',
      audit.status === 200 && auditActions[0] === 'QUESTION_ARCHIVED'
      && auditActions.includes('QUESTION_PUBLISHED') && auditActions.includes('QUESTION_APPROVED')
      && auditActions.includes('QUESTION_REJECTED') && auditActions.includes('QUESTION_SUBMITTED')
      && auditActions.includes('QUESTION_CREATED')
      && audit.body.actions?.every((a) => a.adminId === adminAuthId),
      auditActions.join(','))

    const { data: dbAudit } = await db.from('admin_actions').select('*').eq('target_type', 'question').eq('target_id', String(reviewId)).order('id', { ascending: false })
    check('DB: admin_actions rows persisted for the full workflow',
      Array.isArray(dbAudit) && dbAudit.length === 7
      && dbAudit[0].action === 'QUESTION_ARCHIVED' && dbAudit[0].details?.supersededByVersion === 2,
      `rows=${dbAudit?.length}`)

    const { data: dbV1 } = await db.from('questions').select('id, status, meta').eq('id', reviewId).maybeSingle()
    check('DB: v1 question archived with its review envelope intact',
      dbV1?.status === 'archived' && dbV1?.meta?.review?.state === 'approved',
      `status=${dbV1?.status}`)

    const reviewPayloads = JSON.stringify([reviewCreated.body, submit.body, queue.body, reject.body, approve.body, publish.body, versioned.body, v1AfterV2.body, audit.body])
    check('no secret keys leak from any review payload',
      !/service-role|service_role|access_token|refresh_token|password/.test(reviewPayloads))

    // -- question media (Task 5.12) ------------------------------------------
    const SMOKE_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01])
    const mediaUpload = async (form, { token = adminToken } = {}) => {
      const resp = await fetch(`${BASE}/api/admin/questions/media`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      })
      return { status: resp.status, body: await resp.json().catch(() => null) }
    }

    const mediaForm = () => {
      const form = new FormData()
      form.append('file', new Blob([SMOKE_JPEG], { type: 'image/jpeg' }), 'smoke-diagram.jpg')
      return form
    }

    const uploaded = await mediaUpload(mediaForm())
    const mediaRef = uploaded.body?.media?.ref
    check('media upload succeeds via the backend (201, safe ref)',
      uploaded.status === 201 && /^question-media\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9._-]+\.jpe?g$/.test(mediaRef ?? '')
      && mediaRef.startsWith(`question-media/${adminAuthId}/uploads/`) && !mediaRef.includes('smoke-diagram'),
      `ref=${mediaRef}`)
    uploadedMediaRefs.push(mediaRef)

    const mediaFolder = mediaRef.slice(0, mediaRef.lastIndexOf('/'))
    const { data: mediaObjects } = await db.storage.from('question-media').list(mediaFolder)
    check('storage: uploaded object exists in the private question-media bucket',
      Array.isArray(mediaObjects) && mediaObjects.some((o) => mediaRef?.endsWith(o.name)), `objects=${mediaObjects?.length}`)

    const previewUrl = await json(await fetch(`${BASE}/api/admin/questions/media/url?ref=${encodeURIComponent(mediaRef)}`, { headers: bearer(adminToken) }))
    check('media preview returns a signed URL for the admin only',
      previewUrl.status === 200 && typeof previewUrl.body.url === 'string' && /object\/sign\//.test(previewUrl.body.url),
      previewUrl.body?.url ? 'signed' : previewUrl.body?.error?.code)

    const studentUpload = await mediaUpload(mediaForm(), { token: tokenB })
    check('a student session token cannot upload media (401 ADMIN_INVALID_TOKEN)',
      studentUpload.status === 401 && studentUpload.body?.error?.code === 'ADMIN_INVALID_TOKEN')

    const badContent = new FormData()
    badContent.append('file', new Blob([new TextEncoder().encode('not an image at all')], { type: 'image/png' }), 'x.png')
    const badContentResp = await mediaUpload(badContent)
    check('media upload rejects content that is not an image (400)',
      badContentResp.status === 400 && badContentResp.body?.error?.code === 'QUESTION_MEDIA_VALIDATION_FAILED'
      && badContentResp.body?.error?.fields?.[0]?.code === 'CONTENT')

    const oversized = new FormData()
    oversized.append('file', new Blob([new Uint8Array(1048577)], { type: 'image/jpeg' }), 'big.jpg')
    const oversizedResp = await mediaUpload(oversized)
    check('media upload rejects an oversized image (400 TOO_LARGE)',
      oversizedResp.status === 400 && oversizedResp.body?.error?.fields?.[0]?.code === 'TOO_LARGE')

    const traversalResp = await json(await fetch(`${BASE}/api/admin/questions/media/url?ref=${encodeURIComponent('question-media/../../etc/passwd.png')}`, { headers: bearer(adminToken) }))
    check('media preview rejects a path-traversal ref (400)',
      traversalResp.status === 400 && traversalResp.body?.error?.code === 'QUESTION_MEDIA_VALIDATION_FAILED')

    const foreignRef = 'question-media/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/uploads/smoke.png'
    const foreignDel = await json(await fetch(`${BASE}/api/admin/questions/media?ref=${encodeURIComponent(foreignRef)}`, { method: 'DELETE', headers: bearer(adminToken) }))
    check('media isolation: an admin cannot delete another admin\'s media (403 MEDIA_FORBIDDEN)',
      foreignDel.status === 403 && foreignDel.body?.error?.code === 'QUESTION_MEDIA_FORBIDDEN')

    // A draft referencing the media blocks its deletion; removing the draft
    // frees it (non-destructive lifecycle).
    const mediaDraftBody = { ...draftBody, prompt: 'Match each part of a cell to its role with a shared image.', payload: { ...draftBody.payload, items: draftBody.payload.items.map((item, i) => (i === 0 ? { ...item, image: { ref: mediaRef, alt: 'shared smoke image' } } : item)) } }
    const mediaDraft = await builder('', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mediaDraftBody) })
    smokeAuditTargetIds.add(mediaDraft.body?.question?.id)
    check('a draft can reference the uploaded media (201)',
      mediaDraft.status === 201 && mediaDraft.body.question?.payload?.items?.[0]?.image?.ref === mediaRef)

    const inUseDel = await json(await fetch(`${BASE}/api/admin/questions/media?ref=${encodeURIComponent(mediaRef)}`, { method: 'DELETE', headers: bearer(adminToken) }))
    check('media referenced by a draft cannot be deleted (409 MEDIA_IN_USE)',
      inUseDel.status === 409 && inUseDel.body?.error?.code === 'QUESTION_MEDIA_IN_USE')

    const mediaDraftRemoved = await builder(`/${mediaDraft.body.question.id}`, { method: 'DELETE' })
    check('removing the draft does not touch storage',
      mediaDraftRemoved.status === 200 && mediaDraftRemoved.body.removed === true)

    const mediaDel = await json(await fetch(`${BASE}/api/admin/questions/media?ref=${encodeURIComponent(mediaRef)}`, { method: 'DELETE', headers: bearer(adminToken) }))
    check('unreferenced media is deletable (200)',
      mediaDel.status === 200 && mediaDel.body.removed === true)

    const { data: mediaAfter } = await db.storage.from('question-media').list(mediaFolder)
    check('storage: uploaded object removed from the bucket',
      Array.isArray(mediaAfter) && mediaAfter.every((o) => !mediaRef?.endsWith(o.name)), `objects=${mediaAfter?.length}`)

    const mediaPayloads = JSON.stringify([uploaded.body, previewUrl.body, studentUpload.body, badContentResp.body, inUseDel.body])
    check('no secret keys leak from any media payload',
      !/service-role|service_role|access_token|refresh_token|password|SUPABASE_/.test(mediaPayloads))
    uploadedMediaRefs.length = 0

    // -- 4. database assertions -------------------------------------------------
    const { data: dbSession, error: dbSessionError } = await db.from('game_sessions').select('*').eq('id', sessionId).maybeSingle()
    check('DB: session completed + total score', dbSession?.status === 'completed' && dbSession.total_score === scoreTotal
      && dbSession.selected_question_ids.length === 3,
      dbSessionError ? `query error: ${dbSessionError.message}` : `total=${dbSession?.total_score}`)

    const { data: dbRounds } = await db.from('session_rounds').select('*').eq('session_id', sessionId)
    check('DB: exactly 3 answered rounds', dbRounds?.length === 3 && dbRounds.every((r) => r.status === 'answered'))

    const { data: dbAnswers } = await db.from('student_answers').select('*').eq('session_id', sessionId)
    check('DB: 3 student_answers audit rows', dbAnswers?.length === 3 && dbAnswers.every((a) => a.was_correct === true))

    const { data: dbScore } = await db.from('scores').select('*').eq('session_id', sessionId).maybeSingle()
    check('DB: score ledger row matches', dbScore?.score === scoreTotal && dbScore.round_breakdown?.length === 3)

    const { data: dbSession2 } = await db.from('game_sessions').select('*').eq('id', session2Id).maybeSingle()
    check('DB: level-2 session also completed', dbSession2?.status === 'completed' && dbSession2.total_score > 0)

    const { data: dbScore2 } = await db.from('scores').select('*').eq('session_id', session2Id).maybeSingle()
    check('DB: level-2 score ledger row present', Boolean(dbScore2) && dbScore2.round_breakdown?.length === 3)

    const { data: dbSessionRow } = await db.from('student_sessions').select('*').eq('student_id', studentA).order('id', { ascending: false }).limit(1).maybeSingle()
    check('DB: token stored hashed only', dbSessionRow?.token_hash && dbSessionRow.token_hash !== tokenA
      && new Date(dbSessionRow.expires_at).valueOf() > Date.now())

    const { data: avatarObjects } = await db.storage.from('student-avatars').list(String(studentA))
    check('DB: private avatar object present', Array.isArray(avatarObjects) && avatarObjects.some((o) => o.name === 'profile.png'))

    const { data: questionCheck } = await db.from('questions').select('id, correct_answer').eq('id', seededQuestions[0].id).maybeSingle()
    check('DB: correct answers server-side only', Boolean(questionCheck?.correct_answer))
  } finally {
    server.close()

    // -- 5. cleanup + verification (always runs, even after a mid-run failure) --
    // No-arg cleanup matches the ilike 'STEM QUEST Smoke %' pattern so BOTH the
    // original smoke school and the profile-update school are removed.
    console.log('\nCleanup')
    await cleanupSmokeData()
    // Best-effort removal of any media uploaded during the run, then the
    // leftover-admin sweep (which also clears their media objects).
    for (const ref of uploadedMediaRefs) {
      try {
        await db.storage.from('question-media').remove([ref.slice('question-media/'.length)])
      } catch {
        /* best effort */
      }
    }
    await cleanupAdminAuth()

    const after = {
      questions: await countWhere(db, 'questions'),
      students: await countWhere(db, 'students'),
      schools: await countWhere(db, 'schools'),
      sessions: await countWhere(db, 'game_sessions'),
      scores: await countWhere(db, 'scores'),
      answers: await countWhere(db, 'student_answers'),
      levelProgress: await countWhere(db, 'student_level_progress'),
      streamProgress: await countWhere(db, 'student_progress'),
      leaderboard: await countWhere(db, 'leaderboard_entries'),
      studentBadges: await countWhere(db, 'student_badges'),
      certificates: await countWhere(db, 'certificates'),
      admins: await countWhere(db, 'admins'),
      adminActions: await countWhere(db, 'admin_actions'),
    }
    const restored =
      after.questions === baseline.questions &&
      after.students === baseline.students &&
      after.schools === baseline.schools &&
      after.sessions === baseline.sessions &&
      after.scores === baseline.scores &&
      after.answers === baseline.answers &&
      after.levelProgress === baseline.levelProgress &&
      after.streamProgress === baseline.streamProgress &&
      after.leaderboard === baseline.leaderboard &&
      after.studentBadges === baseline.studentBadges &&
      after.certificates === baseline.certificates &&
      after.admins === baseline.admins &&
      after.adminActions === baseline.adminActions
    check('DB restored to exact baseline', restored, `questions=${after.questions} students=${after.students} schools=${after.schools} sessions=${after.sessions} scores=${after.scores} answers=${after.answers} level_progress=${after.levelProgress} stream_progress=${after.streamProgress} leaderboard=${after.leaderboard} student_badges=${after.studentBadges} certificates=${after.certificates} admins=${after.admins} admin_actions=${after.adminActions}`)

    const { data: mediaAfterObjects } = await db.storage.from('question-media').list()
    check('storage restored to exact baseline (question-media empty)',
      Array.isArray(mediaAfterObjects) && mediaAfterObjects.length === 0,
      `objects=${mediaAfterObjects?.length}`)
  }

  console.log(`\nSmoke result: ${passed} checks`)
}

async function countWhere(db, table) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`count ${table} failed: ${error.message}`)
  return count
}

main().catch((err) => {
  console.error(`\nSMOKE FAILED: ${err.message}`)
  process.exit(1)
})