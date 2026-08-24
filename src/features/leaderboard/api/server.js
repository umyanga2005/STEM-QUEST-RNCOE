/**
 * Leaderboard — Hono API (Task 5.7).
 *
 * Public, read-only leaderboard transport. Auth is OPTIONAL: the exhibition
 * board is public, so a missing or expired token still gets the full
 * leaderboard — it simply loses the self-highlight. When a VALID session
 * token is present, the matching entry is flagged `self: true`
 * (derived server-side; the browser never supplies a student id).
 *
 * Endpoints:
 *   GET /api/student/leaderboards            → all four stream boards
 *   GET /api/student/leaderboards/:streamId  → one stream board
 *
 * Response projection is the ONLY safe surface: `{ rank, displayName, score,
 * self }` per entry plus stream identity. `studentId` exists on the internal
 * service result purely so the route can tag the caller's own row, then it
 * is stripped before serialisation — the response never carries a student
 * id, token, hash, school, grade or login code. The client can never write.
 */

import { Hono } from 'hono'
import { LeaderboardError } from '../errors.js'
import studentServer from '../../student/api/server.js'

const TOKEN_HEADER_RE = /^Bearer\s+(.+)$/i

function bearerToken(c) {
  const header = c.req.header('authorization') ?? ''
  const match = TOKEN_HEADER_RE.exec(header)
  return match ? match[1] : null
}

const STATUS_BY_LEADERBOARD_CODE = {
  LEADERBOARD_INVALID_INPUT: 400,
  LEADERBOARD_STREAM_UNAVAILABLE: 404,
  LEADERBOARD_INTERNAL: 500,
}

export function errorToHttp(err) {
  if (err instanceof LeaderboardError) {
    return { status: STATUS_BY_LEADERBOARD_CODE[err.code] ?? 500, body: err.toPublic() }
  }
  return studentServer.errorToHttp(err)
}

/** Strips the internal `studentId` and tags the caller's own entry. */
function toPublicEntry(entry, selfStudentId) {
  return {
    rank: entry.rank,
    displayName: entry.displayName,
    score: entry.score,
    self: selfStudentId !== null && Number(entry.studentId) === selfStudentId,
  }
}

/**
 * Resolves the session token when present and valid. Returns the student id,
 * or null when absent/invalid — a public leaderboard never 401s.
 */
async function resolveSelfStudent(c, studentService) {
  const token = bearerToken(c)
  if (!token) return null
  try {
    const { student } = await studentService.getMe({ token })
    return student.id
  } catch {
    return null
  }
}

/** Builds the leaderboard Hono app over the given services. */
export function createLeaderboardApi({ studentService, leaderboardService }) {
  const app = new Hono()

  app.get('/api/student/leaderboards', async (c) => {
    const selfStudentId = await resolveSelfStudent(c, studentService)
    const { leaderboards } = await leaderboardService.getAllLeaderboards()
    return c.json({
      leaderboards: leaderboards.map(({ stream, entries }) => ({
        stream,
        entries: entries.map((entry) => toPublicEntry(entry, selfStudentId)),
      })),
    })
  })

  app.get('/api/student/leaderboards/:streamId', async (c) => {
    const selfStudentId = await resolveSelfStudent(c, studentService)
    const { stream, entries } = await leaderboardService.getTopForStream({
      streamId: Number(c.req.param('streamId')),
    })
    return c.json({
      stream,
      entries: entries.map((entry) => toPublicEntry(entry, selfStudentId)),
    })
  })

  app.notFound((c) =>
    c.json(
      { error: { code: 'LEADERBOARD_STREAM_UNAVAILABLE', category: 'AVAILABILITY', message: 'This leaderboard is not available right now.' } },
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
  createLeaderboardApi,
  errorToHttp,
}