/**
 * Mission — Hono API (Task 5.2).
 *
 * Thin transport for the student stream + level selection UI. Every route
 * authenticates through StudentService.getMe with the opaque session token
 * (Authorization: Bearer) — the SAME lightweight session from Task 5.1
 * (D-005/D-027). No second auth system, no Supabase in the browser.
 *
 * Endpoints:
 *   GET /api/student/mission/streams                  → { streams: [...] }
 *   GET /api/student/mission/streams/:streamId/levels → { stream, levels }
 *
 * Returns only safe, selection-relevant data. Both StudentError (from the
 * session check) and MissionError are mapped to HTTP; anything unknown is a
 * 500 (server-only). The play gate itself stays in GameSessionService.
 */

import { Hono } from 'hono'
import { MissionError } from '../errors.js'
import studentServer from '../../student/api/server.js'

const TOKEN_HEADER_RE = /^Bearer\s+(.+)$/i

function bearerToken(c) {
  const header = c.req.header('authorization') ?? ''
  const match = TOKEN_HEADER_RE.exec(header)
  return match ? match[1] : null
}

const STATUS_BY_MISSION_CODE = {
  MISSION_UNAUTHORIZED: 401,
  MISSION_INVALID_INPUT: 400,
  MISSION_STREAM_UNAVAILABLE: 404,
  MISSION_LEVEL_UNAVAILABLE: 404,
  MISSION_INTERNAL: 500,
}

export function errorToHttp(err) {
  if (err instanceof MissionError) {
    return { status: STATUS_BY_MISSION_CODE[err.code] ?? 500, body: err.toPublic() }
  }
  return studentServer.errorToHttp(err)
}

/** Builds the mission Hono app over the given services. */
export function createMissionApi({ studentService, missionService }) {
  const app = new Hono()

  const authenticate = async (c) => {
    const result = await studentService.getMe({ token: bearerToken(c) })
    c.set('mission.student', result.student)
  }

  app.get('/api/student/mission/streams', async (c) => {
    await authenticate(c)
    const student = c.get('mission.student')
    const result = await missionService.getMissionOverview({ studentId: student.id })
    return c.json(result)
  })

  app.get('/api/student/mission/streams/:streamId/levels', async (c) => {
    await authenticate(c)
    const student = c.get('mission.student')
    const streamId = Number(c.req.param('streamId'))
    const result = await missionService.getMissionLevels({ studentId: student.id, streamId })
    return c.json(result)
  })

  app.notFound((c) =>
    c.json(
      { error: { code: 'MISSION_NOT_FOUND', category: 'AVAILABILITY', message: 'Endpoint not found.' } },
      404
    )
  )

  app.onError((err, c) => {
    const known = errorToHttp(err)
    if (known.status >= 500) console?.error?.(err)
    return c.json({ error: known.body }, known.status)
  })

  return app
}

export default {
  createMissionApi,
  errorToHttp,
}
