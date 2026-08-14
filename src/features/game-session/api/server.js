/**
 * Game Session — Hono API (Task 4.4).
 *
 * Minimal, decided backend transport (D-019 — Hono / Node.js). The service
 * is the security boundary; these routes only (de)serialize and map errors to
 * HTTP. No scoring, no validation logic here.
 *
 * Endpoints:
 *   POST /api/game/sessions                              → start
 *   GET  /api/game/sessions/:sessionId/current           → current round
 *   POST /api/game/sessions/:sessionId/rounds/:roundId/submit
 *   POST /api/game/sessions/:sessionId/finish
 *
 * Student identity: for Task 4.4 the demo/test boundary injects the student
 * id via the `x-student-id` header. Real student-session tokens (D-040) land
 * here in a later task — this header is temporary and documented.
 */

import { Hono } from 'hono'
import { GameEngineError, gameCategoryOf } from '../../game-engine/core/errors.js'
import { ActivityEngineError, categoryOf } from '../../activity-engine/errors/index.js'

export const STUDENT_ID_HEADER = 'x-student-id'

async function readJson(c) {
  try {
    return await c.req.json()
  } catch {
    return {} // validation happens server-side; malformed bodies map to 400
  }
}

function errorToHttp(err) {
  if (err instanceof GameEngineError) {
    const statusByCode = {
      GAME_SESSION_NOT_FOUND: 404,
      GAME_ROUND_NOT_FOUND: 404,
      GAME_SESSION_WRONG_STUDENT: 403,
      GAME_SESSION_NOT_ACTIVE: 409,
      GAME_SESSION_INVALID_STATE: 409,
      GAME_ROUND_NOT_CURRENT: 409,
      GAME_ROUND_ALREADY_SUBMITTED: 409,
      GAME_INSUFFICIENT_POOL: 409,
      GAME_LEVEL_LOCKED: 409,
      GAME_ACTIVITY_UNAVAILABLE: 409,
      GAME_INVALID_INPUT: 400,
      GAME_INTERNAL: 500,
    }
    return { status: statusByCode[err.code] ?? 500, body: err.toPublic() }
  }
  if (err instanceof ActivityEngineError) {
    const status = err.code?.startsWith('ACTIVITY_ANSWER') || err.code === 'SCORING_INPUTS_INVALID'
      ? 400
      : err.code?.startsWith('SECURITY')
      ? 403
      : 422
    return { status, body: err.toPublic() }
  }
  // Unknown errors must never leak internals.
  return { status: 500, body: { code: 'GAME_INTERNAL', category: 'INTERNAL', message: 'An unexpected problem occurred.' } }
}

export function createGameApi({ service }) {
  const app = new Hono()

  app.get('/api/health', (c) => c.json({ ok: true, service: 'stem-quest', ts: Date.now() }))

  app.post('/api/game/sessions', async (c) => {
    const body = await readJson(c)
    const result = await service.startSession({
      studentId: body?.studentId,
      streamId: body?.streamId,
      levelId: body?.levelId,
      metadata: body?.metadata ?? { source: 'api' },
    })
    return c.json(result, 201)
  })

  app.get('/api/game/sessions/:sessionId/current', async (c) => {
    const result = await service.getCurrentRound({
      sessionId: c.req.param('sessionId'),
      studentId: requireStudentId(c),
    })
    return c.json(result)
  })

  app.post('/api/game/sessions/:sessionId/rounds/:roundId/submit', async (c) => {
    const body = await readJson(c)
    const result = await service.submitRound({
      sessionId: c.req.param('sessionId'),
      roundId: c.req.param('roundId'),
      studentId: requireStudentId(c),
      submission: {
        response: body?.response,
        interactionMetrics: body?.interactionMetrics,
      },
    })
    return c.json(result)
  })

  app.post('/api/game/sessions/:sessionId/finish', async (c) => {
    const result = await service.finishSession({
      sessionId: c.req.param('sessionId'),
      studentId: requireStudentId(c),
    })
    return c.json(result)
  })

  app.notFound((c) =>
    c.json({ error: { code: 'GAME_NOT_FOUND', category: 'AVAILABILITY', message: 'Endpoint not found.' } }, 404)
  )

  app.onError((err, c) => {
    const known = errorToHttp(err)
    if (known.status >= 500) console?.error?.(err)
    return c.json({ error: known.body, session: null }, known.status)
  })

  return app
}

function requireStudentId(c) {
  const id = c.req.header(STUDENT_ID_HEADER)
  if (id === undefined || id === '') {
    const err = new GameEngineError({
      code: 'GAME_INVALID_INPUT',
      message: `Missing "${STUDENT_ID_HEADER}" header (temporary test/demo identity boundary).`,
    })
    throw err
  }
  return id
}

export default { createGameApi, STUDENT_ID_HEADER, errorToHttp, gameCategoryOf, categoryOf }