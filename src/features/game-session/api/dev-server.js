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
import { createMemoryStore, createMemoryRepositories } from '../repositories/memory.js'
import { seedStoreFromBaseData, demoBaseData } from '../demo/seed-data.js'
import { demoMatchingQuestions } from '../demo/matching-demo-questions.js'
import { demoSortingQuestions } from '../demo/sorting-demo-questions.js'
import { demoFillCompleteQuestions } from '../demo/fill-complete-demo-questions.js'
import { demoImageInteractionQuestions } from '../demo/image-interaction-demo-questions.js'
import { demoPatternQuestions } from '../demo/pattern-demo-questions.js'
import { demoMemoryQuestions } from '../demo/memory-demo-questions.js'
import { demoScenarioQuestions } from '../demo/scenario-demo-questions.js'
import { demoNumberLogicQuestions } from '../demo/number-logic-demo-questions.js'
import GameSessionService from '../service/game-session-service.js'
import { createStudentApi } from '../../student/api/server.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'

export function createDemoApi() {
  const store = createMemoryStore()
  seedStoreFromBaseData(store, demoBaseData())
  store.questions.push(
    ...demoMatchingQuestions(),
    ...demoSortingQuestions(),
    ...demoFillCompleteQuestions(),
    ...demoImageInteractionQuestions(),
    ...demoPatternQuestions(),
    ...demoMemoryQuestions(),
    ...demoScenarioQuestions(),
    ...demoNumberLogicQuestions()
  )
  const repos = createMemoryRepositories(store)
  const service = new GameSessionService(repos)
  const gameApp = createGameApi({ service })

  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)
  const studentApp = createStudentApi({ service: studentService })

  return { app: createStackedApp({ gameApp, studentApp }), service, store, studentService }
}

/**
 * Composes two Hono apps by URL prefix. Each sub-app keeps its own notFound/
 * onError handling scoped to its prefix; anything else falls through to a
 * game-style 404 so the demo behaves as before for unknown routes.
 */
export function createStackedApp({ gameApp, studentApp }) {
  const app = new Hono()
  app.use('/api/student/*', (c) => studentApp.fetch(c.req.raw, c.env))
  app.use('/api/*', (c) => gameApp.fetch(c.req.raw, c.env))
  app.notFound((c) =>
    c.json({ error: { code: 'GAME_NOT_FOUND', category: 'AVAILABILITY', message: 'Endpoint not found.' } }, 404)
  )
  return app
}

function handle(app, req, res) {
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