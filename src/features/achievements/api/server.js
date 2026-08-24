/**
 * Achievements — Hono API (Task 5.8).
 *
 * Thin transport over the AchievementsService. The student routes are
 * authenticated via the opaque session token (StudentService is the identity
 * boundary); the public verification route is read-only and exposes only the
 * safe certificate surface.
 *
 * Endpoints:
 *   GET  /api/student/achievements                 → badge catalogue + awarded state
 *   GET  /api/student/certificates                 → the student's certificates
 *   GET  /api/student/certificates/:id/pdf         → on-demand PDF (application/pdf)
 *   GET  /api/certificates/verify/:certificateCode → public verification (safe)
 *
 * Auth header: `Authorization: Bearer <token>` — the raw opaque session token.
 * The client can never write: badges/certificates are backend-authored only.
 */

import { Hono } from 'hono'
import { AchievementsError, achievementsError } from '../errors.js'
import studentServer from '../../student/api/server.js'

const TOKEN_HEADER_RE = /^Bearer\s+(.+)$/i

function bearerToken(c) {
  const header = c.req.header('authorization') ?? ''
  const match = TOKEN_HEADER_RE.exec(header)
  return match ? match[1] : null
}

const STATUS_BY_ACHIEVEMENTS_CODE = {
  ACHIEVEMENTS_INVALID_INPUT: 400,
  ACHIEVEMENTS_UNAUTHORIZED: 401,
  ACHIEVEMENTS_NOT_FOUND: 404,
  ACHIEVEMENTS_REVOKED: 410,
  ACHIEVEMENTS_PDF_FAILED: 500,
  ACHIEVEMENTS_INTERNAL: 500,
}

export function errorToHttp(err) {
  if (err instanceof AchievementsError) {
    return { status: STATUS_BY_ACHIEVEMENTS_CODE[err.code] ?? 500, body: err.toPublic() }
  }
  return studentServer.errorToHttp(err)
}

/** Resolves the session token to the caller's student id (identity boundary). */
async function requireStudent(c, studentService) {
  const token = bearerToken(c)
  if (!token) throw achievementsError.unauthorized('missing token')
  const { student } = await studentService.getMe({ token })
  if (!student) throw achievementsError.unauthorized('invalid token')
  return student.id
}

/** Builds the achievements Hono app over the given services. */
export function createAchievementsApi({ studentService, achievementsService }) {
  const app = new Hono()

  app.get('/api/student/achievements', async (c) => {
    const studentId = await requireStudent(c, studentService)
    return c.json(await achievementsService.getStudentAchievements({ studentId }))
  })

  app.get('/api/student/certificates', async (c) => {
    const studentId = await requireStudent(c, studentService)
    return c.json(await achievementsService.getStudentCertificates({ studentId }))
  })

  app.get('/api/student/certificates/:id/pdf', async (c) => {
    const studentId = await requireStudent(c, studentService)
    const { pdf, filename } = await achievementsService.getCertificatePdf({
      certificateId: Number(c.req.param('id')),
      studentId,
    })
    return c.body(pdf, 200, {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${filename}"`,
      'cache-control': 'private, max-age=60',
    })
  })

  // Public verification — safe surface only (D-031): code, title, stream,
  // recipient name, earned date and revocation state.
  app.get('/api/certificates/verify/:certificateCode', async (c) => {
    const result = await achievementsService.verifyCertificate({
      certificateCode: c.req.param('certificateCode'),
    })
    return c.json(result)
  })

  app.notFound((c) =>
    c.json(
      { error: { code: 'ACHIEVEMENTS_NOT_FOUND', category: 'AVAILABILITY', message: 'This achievement is not available right now.' } },
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
  createAchievementsApi,
  errorToHttp,
}