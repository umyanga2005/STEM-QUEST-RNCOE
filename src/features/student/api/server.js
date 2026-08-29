/**
 * Student — Hono API (Task 5.1).
 *
 * Thin transport over the StudentService. The service is the security
 * boundary; these routes only (de)serialize, authenticate via the opaque
 * session token, and map errors to HTTP. No registration/session logic here.
 *
 * Endpoints:
 *   POST /api/student/register        → { initials, name, school, grade }
 *   GET  /api/student/me              → Authorization: Bearer <token>
 *   PUT  /api/student/me              → full profile update of the 4 editable
 *                                       fields { initials, name, school, grade }
 *   GET  /api/student/me/progress     → safe student progress overview
 *                                       (requires progressionService)
 *   PUT  /api/student/me/avatar       → multipart field "photo" (optional)
 *
 * Auth header: `Authorization: Bearer <token>` — the raw opaque session token
 * issued once at registration. Never a Supabase key, never a token hash.
 */

import { Hono } from 'hono'
import { StudentError, STUDENT_ERROR_CODES, studentCategoryOf } from '../errors.js'

const TOKEN_HEADER_RE = /^Bearer\s+(.+)$/i

async function readJson(c) {
  try {
    return await c.req.json()
  } catch {
    return {} // server-side validation maps malformed bodies to 400
  }
}

/** Extracts a File-like multipart upload from field `photo`. */
async function readPhotoFile(c) {
  let body
  try {
    body = await c.req.parseBody()
  } catch {
    return null
  }
  const file = body && typeof body === 'object' ? body['photo'] : undefined
  if (!file || typeof file === 'string') return null
  return file
}

function bearerToken(c) {
  const header = c.req.header('authorization') ?? ''
  const match = TOKEN_HEADER_RE.exec(header)
  return match ? match[1] : null
}

function errorToHttp(err) {
  if (err instanceof StudentError) {
    const statusByCode = {
      STUDENT_INVALID_INPUT: 400,
      STUDENT_UNEXPECTED_FIELD: 400,
      STUDENT_UNAUTHORIZED: 401,
      STUDENT_INVALID_TOKEN: 401,
      STUDENT_TOKEN_EXPIRED: 401,
      STUDENT_TOKEN_REVOKED: 401,
      STUDENT_NOT_FOUND: 404,
      STUDENT_DISABLED: 403,
      STUDENT_AVATAR_INVALID: 400,
      STUDENT_AVATAR_TOO_LARGE: 400,
      STUDENT_AVATAR_STORAGE_FAILED: 500,
      STUDENT_INTERNAL: 500,
    }
    return { status: statusByCode[err.code] ?? 500, body: err.toPublic() }
  }
  return { status: 500, body: { code: 'STUDENT_INTERNAL', category: 'INTERNAL', message: 'An unexpected problem occurred. Please try again.' } }
}

export function createStudentApi({ service, progressionService = null }) {
  const app = new Hono()

  app.post('/api/student/register', async (c) => {
    const body = await readJson(c)
    const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = c.req.header('user-agent') || null
    const result = await service.register({ body, ipAddress, userAgent })
    return c.json(result, 201)
  })

  app.post('/api/student/kiosk-login', async (c) => {
    const body = await readJson(c)
    const ipAddress = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = c.req.header('user-agent') || null
    const result = await service.loginByKioskCode({
      loginCode: body?.loginCode,
      ipAddress,
      userAgent,
    })
    return c.json(result, 200)
  })

  app.get('/api/student/me', async (c) => {
    const result = await service.getMe({ token: bearerToken(c) })
    return c.json(result)
  })

  app.put('/api/student/me', async (c) => {
    const body = await readJson(c)
    const result = await service.updateProfile({ token: bearerToken(c), body })
    return c.json(result)
  })

  app.get('/api/student/me/progress', async (c) => {
    if (!progressionService?.getStudentOverview) {
      throw new StudentError({
        code: STUDENT_ERROR_CODES.INTERNAL,
        message: 'The progress overview service is not available.',
      })
    }
    const { student } = await service.getMe({ token: bearerToken(c) })
    const result = await progressionService.getStudentOverview({ studentId: student.id })
    return c.json(result)
  })

  app.put('/api/student/me/avatar', async (c) => {
    const token = bearerToken(c)
    const file = await readPhotoFile(c)
    const buffer = file ? new Uint8Array(await file.arrayBuffer()) : null
    const result = await service.uploadAvatar({
      token,
      file: file
        ? { size: file.size, mimeType: file.type, buffer }
        : { size: 0, mimeType: '', buffer },
    })
    return c.json(result)
  })

  app.notFound((c) =>
    c.json({ error: { code: 'STUDENT_NOT_FOUND', category: 'AVAILABILITY', message: 'Endpoint not found.' } }, 404)
  )

  app.onError((err, c) => {
    const known = errorToHttp(err)
    if (known.status >= 500) console?.error?.(err)
    return c.json({ error: known.body }, known.status)
  })

  return app
}

export default {
  createStudentApi,
  studentCategoryOf,
  errorToHttp,
}