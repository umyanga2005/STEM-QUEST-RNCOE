/**
 * Game Session — local demo API server (Task 4.4) extended for the Student
 * registration + session stack (Task 5.1).
 *
 * Runs the Hono app on Node's built-in http server (no extra dependency) with
 * in-memory repositories seeded from `demo/seed-data.js`. Intended for
 * `npm run api` + the Vite dev proxy. Correct answers stay server-side — this
 * process is the authority in the demo stack. The game and student Hono apps
 * are composed by URL prefix so each keeps its own not-found behaviour.
 */

import { createServer } from 'node:http'
import { Hono } from 'hono'
import { createGameApi } from './server.js'
import { createStudentGameApi } from './student-server.js'
import { createMemoryStore, createMemoryRepositories } from '../repositories/memory.js'
import { seedStoreFromBaseData, demoBaseData } from '../demo/seed-data.js'
import { demoMatchingQuestions } from '../demo/matching-demo-questions.js'
import { demoOrderingQuestions } from '../demo/ordering-demo-questions.js'
import { demoSortingQuestions } from '../demo/sorting-demo-questions.js'
import { demoFillCompleteQuestions } from '../demo/fill-complete-demo-questions.js'
import { demoPatternQuestions } from '../demo/pattern-demo-questions.js'
import { demoMemoryQuestions } from '../demo/memory-demo-questions.js'
import { demoScenarioQuestions } from '../demo/scenario-demo-questions.js'
import { demoNumberLogicQuestions } from '../demo/number-logic-demo-questions.js'
import GameSessionService from '../service/game-session-service.js'
import { createStudentApi } from '../../student/api/server.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'
import { createMissionApi } from '../../mission/api/server.js'
import { createMissionMemoryRepositories, seedMissionStore } from '../../mission/repositories/memory.js'
import { MissionService } from '../../mission/service/mission-service.js'
import { missionDemoStreams } from '../../mission/demo/seed.js'
import { ProgressionService } from '../../progression/service/progression-service.js'
import { createLeaderboardApi } from '../../leaderboard/api/server.js'
import {
  createLeaderboardMemoryStore,
  createLeaderboardMemoryRepositories,
} from '../../leaderboard/repositories/memory.js'
import { LeaderboardService } from '../../leaderboard/service/leaderboard-service.js'
import { createAchievementsApi } from '../../achievements/api/server.js'
import { createAchievementsMemoryRepositories } from '../../achievements/repositories/memory.js'
import { AchievementsService } from '../../achievements/service/achievements-service.js'
import { createAdminApi } from '../../admin/api/server.js'
import { createAdminMemoryRepositories, seedAdminStore } from '../../admin/repositories/memory.js'
import { AdminService } from '../../admin/service/admin-service.js'
import { createQuestionMemoryRepositories, seedQuestionStore } from '../../admin/questions/repositories/memory.js'
import { QuestionService } from '../../admin/questions/service/question-service.js'
import { createQuestionValidator } from '../../admin/questions/validation/question-validator.js'

export function createDemoApi() {
  const store = createMemoryStore()
  const baseData = demoBaseData()
  seedStoreFromBaseData(store, baseData)
  store.questions.push(
    ...demoMatchingQuestions(),
    ...demoOrderingQuestions(),
    ...demoSortingQuestions(),
    ...demoFillCompleteQuestions(),
    ...demoPatternQuestions(),
    ...demoMemoryQuestions(),
    ...demoScenarioQuestions(),
    ...demoNumberLogicQuestions()
  )
  const repos = createMemoryRepositories(store)
  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)

  // Single source of student identity for the student flow: the student
  // feature's store, with the game demo store as a legacy fallback (Task 4.4
  // x-student-id demo). Registered students must be visible to the
  // authoritative GameSessionService, not just the demo student.
  repos.studentRepository = {
    findById: async (id) =>
      (await studentRepos.studentRepository.findById(id)) ??
      store.students.find((s) => s.id === id) ??
      null,
  }

  const leaderboardRepos = createLeaderboardMemoryRepositories(createLeaderboardMemoryStore())
  const achievementsRepos = createAchievementsMemoryRepositories()
  const missionRepos = createMissionMemoryRepositories()
  seedMissionStore(missionRepos.store, {
    streams: missionDemoStreams(baseData.streams),
    levels: baseData.levels,
    streamProgress: [],
    levelProgress: [],
    specialAccess: baseData.specialAccess ?? [],
  })
  const missionService = new MissionService({
    streamRepository: missionRepos.streamRepository,
    levelRepository: missionRepos.levelRepository,
    progressRepository: missionRepos.progressRepository,
    specialAccessRepository: missionRepos.specialAccessRepository,
  })
  const missionApp = createMissionApi({ studentService, missionService })

  const leaderboardService = new LeaderboardService({
    studentRepository: repos.studentRepository,
    streamRepository: missionRepos.streamRepository,
    leaderboardRepository: leaderboardRepos.leaderboardRepository,
  })

  const achievementsService = new AchievementsService({
    progressionRepository: repos.progressionRepository,
    badgeRepository: achievementsRepos.badgeRepository,
    studentBadgeRepository: achievementsRepos.studentBadgeRepository,
    certificateRepository: achievementsRepos.certificateRepository,
    studentRepository: repos.studentRepository,
    streamRepository: missionRepos.streamRepository,
  })
  const service = new GameSessionService({ ...repos, leaderboardService, achievementsService })
  const gameApp = createGameApi({ service })

  const studentGameApp = createStudentGameApi({ studentService, gameService: service })

  const leaderboardApp = createLeaderboardApi({ studentService, leaderboardService })

  const achievementsApp = createAchievementsApi({ studentService, achievementsService })

  // Student-facing progress overview reuses the ProgressionService with the
  // mission stream catalogue (Task 5.6) — unlock/completion paths are unchanged.
  const profileProgressionService = new ProgressionService({
    progressionRepository: repos.progressionRepository,
    levelRepository: repos.levelRepository,
    specialAccessRepository: repos.specialAccessRepository,
    streamRepository: missionRepos.streamRepository,
  })
  const studentApp = createStudentApi({ service: studentService, progressionService: profileProgressionService })

  const adminRepos = createAdminMemoryRepositories()
  seedAdminStore(adminRepos.store, [
    { id: 'u1', display_name: 'Console Admin', role: 'superadmin', is_active: true }
  ])
  let supabaseClientForAdmin = null
  if (!supabaseClientForAdmin) {
    supabaseClientForAdmin = {
      auth: {
        getUser: async (token) => {
          if (token) return { data: { user: { id: 'u1', email: 'admin@stem-quest.dev' } }, error: null }
          return { data: { user: null }, error: new Error('invalid token') }
        }
      }
    }
  }
  const adminService = new AdminService({
    adminRepository: adminRepos.adminRepository,
    supabaseClient: supabaseClientForAdmin
  })
  const questionRepos = createQuestionMemoryRepositories()
  seedQuestionStore(questionRepos.store, {
    streams: baseData.streams,
    levels: baseData.levels,
    activityTypes: baseData.activityTypes,
    questions: store.questions.map((q) => ({
      ...q,
      stream_id: q.stream_id ?? q.streamId ?? 1,
      level_id: q.level_id ?? q.levelId ?? 1,
      activity_type_id: q.activity_type_id ?? q.activityTypeId ?? 1,
      grade_min: q.grade_min ?? q.gradeMin ?? 6,
      grade_max: q.grade_max ?? q.gradeMax ?? 8,
      base_points: q.base_points ?? q.basePoints ?? 100,
      correct_answer: q.correct_answer ?? q.correctAnswer ?? {},
      status: q.status ?? 'published',
      version: q.version ?? 1,
      created_at: q.created_at ?? new Date().toISOString(),
      updated_at: q.updated_at ?? new Date().toISOString(),
    })),
  })
  const questionService = new QuestionService({
    questionRepository: questionRepos.questionRepository,
    catalogueRepository: questionRepos.catalogueRepository,
    validator: createQuestionValidator(),
    adminActionRepository: questionRepos.adminActionRepository,
    mediaRepository: questionRepos.mediaRepository,
  })
  const adminApp = createAdminApi({ adminService, questionService })

  return {
    app: createStackedApp({ gameApp, studentApp, studentGameApp, missionApp, leaderboardApp, achievementsApp, adminApp }),
    service,
    store,
    studentService,
    missionService,
    adminService,
    questionService,
  }
}

/**
 * Composes Hono apps by URL prefix. Each sub-app keeps its own notFound/
 * onError handling scoped to its prefix; the admin/leaderboard/mission/
 * achievements prefixes are mounted BEFORE the generic student prefix so
 * their routes win. Anything else falls through to a game-style 404 so the
 * demo behaves as before for unknown routes.
 */
export function createStackedApp({ gameApp, studentApp, studentGameApp = null, missionApp = null, leaderboardApp = null, achievementsApp = null, adminApp = null }) {
  const app = new Hono()
  app.get('/', (c) =>
    c.json({ status: 'ok', service: 'STEM QUEST API Server', message: 'STEM QUEST backend API service is operational.' })
  )
  app.get('/api', (c) =>
    c.json({ status: 'ok', service: 'STEM QUEST API Server', message: 'STEM QUEST backend API service is operational.' })
  )
  if (adminApp) app.use('/api/admin/*', (c) => adminApp.fetch(c.req.raw, c.env))
  if (achievementsApp) {
    app.use('/api/student/achievements/*', (c) => achievementsApp.fetch(c.req.raw, c.env))
    app.use('/api/student/certificates/*', (c) => achievementsApp.fetch(c.req.raw, c.env))
    app.use('/api/certificates/*', (c) => achievementsApp.fetch(c.req.raw, c.env))
  }
  if (leaderboardApp) app.use('/api/student/leaderboards/*', (c) => leaderboardApp.fetch(c.req.raw, c.env))
  if (missionApp) app.use('/api/student/mission/*', (c) => missionApp.fetch(c.req.raw, c.env))
  if (studentGameApp) app.use('/api/student/game/*', (c) => studentGameApp.fetch(c.req.raw, c.env))
  app.use('/api/student/*', (c) => studentApp.fetch(c.req.raw, c.env))
  app.use('/api/*', (c) => gameApp.fetch(c.req.raw, c.env))
  app.notFound((c) =>
    c.json({ error: { code: 'GAME_NOT_FOUND', category: 'AVAILABILITY', message: 'Endpoint not found.' } }, 404)
  )
  return app
}

export function handle(app, req, res) {
  const url = new URL(req.url, 'http://localhost:4100')
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = chunks.length ? Buffer.concat(chunks).toString('utf8') : null
    const headers = { ...req.headers }
    const init = { method: req.method, headers }
    if (body) {
      init.body = body
      headers['content-type'] = headers['content-type'] ?? 'application/json'
    }
    ;(async () => {
      try {
        const resp = await app.request(url.pathname + url.search, init)
        const text = await resp.text()
        res.writeHead(resp.status, Object.fromEntries(resp.headers.entries()))
        res.end(text)
      } catch (err) {
        console?.error?.(err)
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { code: 'GAME_INTERNAL', category: 'INTERNAL', message: 'Internal server error.' } }))
      }
    })()
  })
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href

if (isMain) {
  const { app } = createDemoApi()
  const port = Number(process.env.PORT) || 4100
  createServer((req, res) => handle(app, req, res)).listen(port, () => {
    console.log(`STEM QUEST demo API listening on http://localhost:${port}`)
  })
}

export default { createDemoApi, createStackedApp, handle }