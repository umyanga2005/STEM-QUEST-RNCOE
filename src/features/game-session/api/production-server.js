/**
 * Game Session — production API server (Task 5.4).
 *
 * Real Supabase composition. All three feature stacks (student, mission, game
 * session) run over service-role repositories bound to the linked STEM QUEST
 * project. The browser never touches Supabase — it talks only to these Hono
 * routes, and every trusted write flows through the service role (D-027).
 * correctAnswer and scoring internals never leave this process.
 *
 * The stacked app is identical to the demo server (mission → game → student →
 * api) so the existing client routes behave the same against the live
 * database. Repositories come from the exact 0001 migration — no new tables,
 * no schema changes.
 *
 * Run with `npm run api:production` (loads `.env` via `--env-file`).
 */

import { createServer } from 'node:http'
import { createGameApi } from './server.js'
import { createStudentGameApi } from './student-server.js'
import { createSupabaseRepositories } from '../repositories/supabase.js'
import GameSessionService from '../service/game-session-service.js'
import { createStudentApi } from '../../student/api/server.js'
import { createSupabaseStudentRepositories } from '../../student/repositories/supabase.js'
import { StudentService } from '../../student/service/student-service.js'
import { createMissionApi } from '../../mission/api/server.js'
import { createSupabaseMissionRepositories } from '../../mission/repositories/supabase.js'
import { MissionService } from '../../mission/service/mission-service.js'
import { ProgressionService } from '../../progression/service/progression-service.js'
import { createLeaderboardApi } from '../../leaderboard/api/server.js'
import { createSupabaseLeaderboardRepositories } from '../../leaderboard/repositories/supabase.js'
import { LeaderboardService } from '../../leaderboard/service/leaderboard-service.js'
import { createAchievementsApi } from '../../achievements/api/server.js'
import { createSupabaseAchievementsRepositories } from '../../achievements/repositories/supabase.js'
import { AchievementsService } from '../../achievements/service/achievements-service.js'
import { createAdminApi } from '../../admin/api/server.js'
import { createSupabaseAdminRepositories } from '../../admin/repositories/supabase.js'
import { AdminService } from '../../admin/service/admin-service.js'
import { createSupabaseQuestionRepositories } from '../../admin/questions/repositories/supabase.js'
import { QuestionService } from '../../admin/questions/service/question-service.js'
import { QuestionMediaService } from '../../admin/questions/service/media-service.js'
import { createQuestionValidator } from '../../admin/questions/validation/question-validator.js'
import { createStackedApp } from './dev-server.js'

/**
 * Builds the full production stack over Supabase repositories.
 * @param {{ client?: object }} [deps] - injectable Supabase client (tests);
 *   defaults to the process-wide server client from env.
 * @returns {Promise<{ app: object, gameService: object, studentService: object,
 *   missionService: object, gameRepos: object, studentRepos: object, missionRepos: object }>}
 */
export async function createProductionApi({ client } = {}) {
  const { getSupabaseServerClient } = await import('../repositories/supabase-client.js')
  const resolved = client ?? (await getSupabaseServerClient())

  const gameRepos = createSupabaseRepositories({ client: resolved })
  const studentRepos = createSupabaseStudentRepositories({ client: resolved })
  const missionRepos = createSupabaseMissionRepositories({ client: resolved })

  const leaderboardRepos = createSupabaseLeaderboardRepositories({ client: resolved })
  const leaderboardService = new LeaderboardService({
    studentRepository: gameRepos.studentRepository,
    streamRepository: missionRepos.streamRepository,
    leaderboardRepository: leaderboardRepos.leaderboardRepository,
  })

  const achievementsRepos = createSupabaseAchievementsRepositories({ client: resolved })
  const achievementsService = new AchievementsService({
    progressionRepository: gameRepos.progressionRepository,
    badgeRepository: achievementsRepos.badgeRepository,
    studentBadgeRepository: achievementsRepos.studentBadgeRepository,
    certificateRepository: achievementsRepos.certificateRepository,
    studentRepository: gameRepos.studentRepository,
    streamRepository: missionRepos.streamRepository,
  })

  // Admin console (Task 5.9): Supabase Auth access tokens are validated with
  // the SAME service-role client (`auth.getUser`), then authorized against
  // the existing `public.admins` table. No student session ever validates.
  const adminRepos = createSupabaseAdminRepositories({ client: resolved })
  const adminService = new AdminService({
    adminRepository: adminRepos.adminRepository,
    supabaseClient: resolved,
  })

  // Question Builder (Task 5.10): writes through the service role (no admin
  // SELECT policy on `questions`, D-028), validates against the schema family
  // (correct-answer schemas are server-only), and is composed into the admin
  // app behind the same requireAdmin middleware.
  const questionRepos = createSupabaseQuestionRepositories({ client: resolved })
  const questionService = new QuestionService({
    questionRepository: questionRepos.questionRepository,
    catalogueRepository: questionRepos.catalogueRepository,
    validator: createQuestionValidator(),
    adminActionRepository: questionRepos.adminActionRepository,
    mediaRepository: questionRepos.mediaRepository,
  })

  // Question media (Task 5.12): private `question-media` bucket uploads/preview
  // run through the service role behind the same requireAdmin middleware. The
  // browser only ever sees server-generated refs + short-lived signed URLs.
  const mediaService = new QuestionMediaService({
    mediaRepository: questionRepos.mediaRepository,
    questionRepository: questionRepos.questionRepository,
  })

  const gameService = new GameSessionService({ ...gameRepos, leaderboardService, achievementsService })
  const studentService = new StudentService(studentRepos)
  const missionService = new MissionService(missionRepos)

  // Student-facing progress overview reuses the ProgressionService with the
  // mission stream catalogue (Task 5.6) — unlock/completion paths are unchanged.
  const profileProgressionService = new ProgressionService({
    progressionRepository: gameRepos.progressionRepository,
    levelRepository: gameRepos.levelRepository,
    specialAccessRepository: gameRepos.specialAccessRepository,
    streamRepository: missionRepos.streamRepository,
  })

  const gameApp = createGameApi({ service: gameService })
  const studentApp = createStudentApi({ service: studentService, progressionService: profileProgressionService })
  const studentGameApp = createStudentGameApi({ studentService, gameService })
  const missionApp = createMissionApi({ studentService, missionService })
  const leaderboardApp = createLeaderboardApi({ studentService, leaderboardService })
  const achievementsApp = createAchievementsApi({ studentService, achievementsService })
  const adminApp = createAdminApi({ adminService, questionService, mediaService })

  return {
    app: createStackedApp({ gameApp, studentApp, studentGameApp, missionApp, leaderboardApp, achievementsApp, adminApp }),
    gameService,
    studentService,
    missionService,
    leaderboardService,
    achievementsService,
    adminService,
    questionService,
    mediaService,
    gameRepos,
    studentRepos,
    missionRepos,
  }
}

/**
 * Binary-safe Node http bridge over the Hono app (multipart avatars included).
 * Preserves the raw request body instead of decoding it to UTF-8.
 */
export function handle(app, req, res) {
  const url = new URL(req.url, 'http://localhost:4101')
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = chunks.length ? Buffer.concat(chunks) : null
    const headers = { ...req.headers }
    const init = { method: req.method, headers }
    if (body) init.body = body
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

/** Starts the production HTTP server (default port 4101). */
export function runProductionServer({ app, port = Number(process.env.PORT) || 4101 } = {}) {
  const server = createServer((req, res) => handle(app, req, res))
  server.listen(port, () => {
    console.log(`STEM QUEST production API listening on http://localhost:${port}`)
  })
  return server
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href

if (isMain) {
  const { app } = await createProductionApi()
  runProductionServer({ app })
}

export default { createProductionApi, handle, runProductionServer }