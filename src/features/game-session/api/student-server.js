/**
 * Game Session — student-authenticated Hono API (Task 5.3).
 *
 * The real `/student/game` screen talks to the SAME authoritative
 * GameSessionService through this thin adapter. Unlike the Task 4.4 demo
 * boundary (`x-student-id` header — temporary, documented there), every route
 * here authenticates through StudentService.getMe with the opaque session
 * token (Authorization: Bearer) and derives `studentId` from the token —
 * NEVER from the client. No scoring, no validation, no answer logic here: the
 * service stays the security boundary (D-005/D-027/D-033).
 *
 * Endpoints:
 *   POST /api/student/game/session                      → start (or resume the
 *                                                          student's active
 *                                                          session for stream)
 *   GET  /api/student/game/session/:sessionId/current   → current round
 *   POST /api/student/game/session/:sessionId/rounds/:roundId/submit
 *   POST /api/student/game/session/:sessionId/finish
 *
 * Error mapping composes the existing game API map (GameEngineError +
 * ActivityEngineError) with the student API map (StudentError), so 401s from
 * the session check surface identically to the rest of the student flow and
 * the UI can redirect on expiry.
 */

import { Hono } from 'hono'
import gameServer from './server.js'
import studentServer from '../../student/api/server.js'
import { StudentError } from '../../student/errors.js'

const TOKEN_HEADER_RE = /^Bearer\s+(.+)$/i

function bearerToken(c) {
  const header = c.req.header('authorization') ?? ''
  const match = TOKEN_HEADER_RE.exec(header)
  return match ? match[1] : null
}

async function readJson(c) {
  try {
    return await c.req.json()
  } catch {
    return {} // validation happens server-side; malformed bodies map to 400
  }
}

export function errorToHttp(err) {
  if (err instanceof StudentError) {
    return studentServer.errorToHttp(err)
  }
  return gameServer.errorToHttp(err)
}

/** Builds the student-authenticated game Hono app over the given services. */
export function createStudentGameApi({ studentService, gameService }) {
  const app = new Hono()

  const authenticate = async (c) => {
    const { student } = await studentService.getMe({ token: bearerToken(c) })
    c.set('game.student', student)
  }

  const currentStudentId = (c) => c.get('game.student').id

  app.post('/api/student/game/session', async (c) => {
    await authenticate(c)
    const body = await readJson(c)
    const result = await gameService.startSession({
      studentId: currentStudentId(c),
      streamId: body?.streamId,
      levelId: body?.levelId,
      metadata: body?.metadata ?? { source: 'student-game-ui' },
    })
    return c.json(result, 201)
  })

  app.get('/api/student/game/session/:sessionId/current', async (c) => {
    await authenticate(c)
    const result = await gameService.getCurrentRound({
      sessionId: c.req.param('sessionId'),
      studentId: currentStudentId(c),
    })
    return c.json(result)
  })

  app.post('/api/student/game/session/:sessionId/rounds/:roundId/submit', async (c) => {
    await authenticate(c)
    const body = await readJson(c)
    const result = await gameService.submitRound({
      sessionId: c.req.param('sessionId'),
      roundId: c.req.param('roundId'),
      studentId: currentStudentId(c),
      submission: {
        response: body?.response,
        interactionMetrics: body?.interactionMetrics,
      },
    })
    return c.json(result)
  })

  app.post('/api/student/game/session/:sessionId/finish', async (c) => {
    await authenticate(c)
    const result = await gameService.finishSession({
      sessionId: c.req.param('sessionId'),
      studentId: currentStudentId(c),
    })
    return c.json(result)
  })

  app.post('/api/student/game/session/:sessionId/abandon', async (c) => {
    await authenticate(c)
    const result = await gameService.abandonSession({
      sessionId: c.req.param('sessionId'),
      studentId: currentStudentId(c),
    })
    return c.json(result)
  })

  app.notFound((c) =>
    c.json(
      { error: { code: 'GAME_NOT_FOUND', category: 'AVAILABILITY', message: 'Endpoint not found.' } },
      404
    )
  )

  app.onError((err, c) => {
    const known = errorToHttp(err)
    if (known.status >= 500) console?.error?.(err)
    return c.json({ error: known.body, session: null }, known.status)
  })

  return app
}

export default {
  createStudentGameApi,
  errorToHttp,
  studentServer,
}
