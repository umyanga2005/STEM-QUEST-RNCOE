/**
 * Admin — Hono API (Task 5.9).
 *
 * Thin transport over the AdminService, protected by the `requireAdmin`
 * middleware. The admin console authenticates in the browser via Supabase
 * Auth (public anon key); every `/api/admin/*` request presents the resulting
 * access token, which is validated server-side against the linked project and
 * authorized against the existing `public.admins` model (D-024/D-028).
 *
 * Endpoints:
 *   GET  /api/admin/me → { admin: { id, displayName, role } }
 *
 * Auth header: `Authorization: Bearer <Supabase access token>`. The service
 * role stays server-only; the response surface never includes tokens.
 */

import { Hono } from 'hono'
import { AdminError, adminError } from '../errors.js'
import { createAdminQuestionsApi } from '../questions/api/server.js'

const TOKEN_HEADER_RE = /^Bearer\s+(.+)$/i

export function bearerToken(c) {
  const header = c.req.header('authorization') ?? ''
  const match = TOKEN_HEADER_RE.exec(header)
  return match ? match[1] : null
}

export function statusByCode(code) {
  if (code === 'ADMIN_UNAUTHENTICATED' || code === 'ADMIN_INVALID_TOKEN') return 401
  if (code === 'ADMIN_FORBIDDEN') return 403
  return 500
}

/**
 * requireAdmin — runs in front of every `/api/admin/*` route.
 *
 *   401 ADMIN_UNAUTHENTICATED — no token
 *   401 ADMIN_INVALID_TOKEN   — token is not a valid/current Supabase Auth JWT
 *                               (includes opaque student session tokens)
 *   403 ADMIN_FORBIDDEN       — valid Supabase identity, but not an active
 *                               administrator (`public.admins`, is_active)
 *
 * On success the safe admin identity is stored on the Hono context so route
 * handlers stay thin. Tokens are never echoed back.
 */
export function requireAdmin(adminService) {
  return async (c, next) => {
    const token = bearerToken(c)
    if (!token) throw adminError.unauthenticated('missing bearer token')
    const admin = await adminService.resolveAdmin(token)
    c.set('admin', admin)
    await next()
  }
}

/**
 * Builds the admin Hono app: every route behind requireAdmin. When a
 * `questionService` is provided (Task 5.10), the Question Builder surface is
 * composed under `/api/admin/questions/*` so it inherits the same auth
 * middleware and error model. A `mediaService` (Task 5.12) adds the private
 * question-media upload/preview/delete routes to that same surface.
 */
export function createAdminApi({ adminService, questionService = null, mediaService = null }) {
  const app = new Hono()

  app.use('/api/admin/*', requireAdmin(adminService))

  app.get('/api/admin/me', (c) => {
    const admin = c.get('admin')
    return c.json({ admin })
  })

  if (questionService) {
    app.route('/api/admin/questions', createAdminQuestionsApi({ questionService, mediaService }))
  }

  app.notFound((c) =>
    c.json(
      { error: { code: 'ADMIN_UNAVAILABLE', category: 'AVAILABILITY', message: 'This admin feature is not available right now.' } },
      404
    )
  )

  app.onError((err, c) => {
    const known = err instanceof AdminError ? err : adminError.internal(err?.message)
    if (known.code === 'ADMIN_INTERNAL' || known.code === 'ADMIN_UNAVAILABLE') {
      console?.error?.(err)
    }
    return c.json({ error: known.toPublic() }, statusByCode(known.code))
  })

  return app
}

export default {
  createAdminApi,
  requireAdmin,
  bearerToken,
}