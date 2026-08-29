/**
 * Admin Question Builder — Hono API (Task 5.10, media in 5.12).
 *
 * Thin transport over the QuestionService, mounted inside the admin app so
 * every route sits behind the existing `requireAdmin` middleware (401/403
 * enforced there). The browser (client-safe engine only, no correct-answer
 * schemas) talks exclusively to this surface.
 *
 * Endpoints (all `/api/admin/questions`, composed by the admin app):
 *   GET    /                 → { questions }   list of previews (no correctAnswer)
 *   GET    /catalogue        → { streams, activityTypes }
 *   POST   /media            → 201 { media: { ref } } multipart field "file"
 *                             (question media upload; Task 5.12)
 *   GET    /media/url?ref=   → { url } short-lived signed URL for admin preview
 *   DELETE /media?ref=       → { removed } owned + unreferenced object only
 *   GET    /review           → { questions }  review queue (pending, Task 5.13)
 *   GET    /:id              → { question }    full incl. correctAnswer + meta
 *   GET    /:id/audit        → { actions }     admin_actions audit trail (5.13)
 *   POST   /                 → 201 { question } create (draft, version 1)
 *   PUT    /:id              → { question }    update (draft only)
 *   DELETE /:id              → { removed }     remove (draft only)
 *   POST   /:id/submit       → { question }    submit for review (5.13)
 *   POST   /:id/approve      → { question }    approve (note optional) (5.13)
 *   POST   /:id/reject       → { question }    reject (note required) (5.13)
 *   POST   /:id/publish      → { question }    publish approved draft (5.13)
 *   POST   /:id/archive      → { question }    archive published question (5.13)
 *   POST   /:id/versions     → 201 { question } clone published v1 → draft v2 (5.13)
 *
 * Auth header: `Authorization: Bearer <Supabase access token>`, the same
 * surface as `/api/admin/me`. Query filters for the list: stream, level,
 * activityType, status, query (prompt substring).
 */

import { Hono } from 'hono'
import { QuestionError, questionError } from '../errors.js'

function statusByCode(code) {
  if (code === 'QUESTION_VALIDATION_FAILED' || code === 'QUESTION_CATALOG_UNKNOWN' || code === 'QUESTION_UNEXPECTED_FIELD') return 400
  if (code === 'QUESTION_MEDIA_VALIDATION_FAILED') return 400
  if (code === 'QUESTION_REVIEW_NOTE_REQUIRED') return 400
  if (code === 'QUESTION_NOT_FOUND' || code === 'QUESTION_MEDIA_NOT_FOUND') return 404
  if (code === 'QUESTION_STATUS_BLOCKED' || code === 'QUESTION_MEDIA_IN_USE') return 409
  if (code === 'QUESTION_INVALID_STATE' || code === 'QUESTION_APPROVAL_STALE') return 409
  if (code === 'QUESTION_UNAUTHORIZED' || code === 'QUESTION_MEDIA_FORBIDDEN') return 403
  return 500
}

function parseQuery(c) {
  const q = c.req.query()
  // FIX: P1-003 — expose limit/offset so the admin UI can page past 200 rows
  const limit = Math.min(Math.max(parseInt(q.limit ?? '50', 10) || 50, 1), 200)
  const offset = Math.max(parseInt(q.offset ?? '0', 10) || 0, 0)
  return {
    stream: q.stream ?? null,
    level: q.level ?? null,
    activityType: q.activityType ?? null,
    status: q.status ?? null,
    query: q.q ?? null,
    limit,
    offset,
  }
}

/** Extracts a File-like multipart upload from field `file`. */
async function readMediaFile(c) {
  let body
  try {
    body = await c.req.parseBody()
  } catch {
    return null
  }
  const file = body && typeof body === 'object' ? body['file'] : undefined
  if (!file || typeof file === 'string') return null
  return file
}

/**
 * Builds the question-builder routes. Mounted by the admin app under
 * `/api/admin/questions` — do NOT mount it on its own outside admin auth.
 * @param {{ questionService: object, mediaService?: object }} deps
 * @returns {import('hono').Hono}
 */
export function createAdminQuestionsApi({ questionService, mediaService = null }) {
  const app = new Hono()

  app.get('/', async (c) => {
    const { questions, total, limit, offset } = await questionService.list(parseQuery(c))
    return c.json({ questions, total, limit, offset }) // FIX: P1-003
  })

  app.get('/catalogue', async (c) => {
    const { streams, activityTypes } = await questionService.catalogue()
    return c.json({ streams, activityTypes })
  })

  // -- review queue (Task 5.13) ----------------------------------------------
  // Registered BEFORE the `/:id` routes so `GET /review` is not shadowed by
  // `GET /:id`. Previews only — correctAnswer/meta never leave the detail
  // surface.
  app.get('/review', async (c) => {
    const q = c.req.query()
    const { questions } = await questionService.reviewQueue({
      stream: q.stream ?? null,
      level: q.level ?? null,
      activityType: q.activityType ?? null,
    })
    return c.json({ questions })
  })

  // -- question media (Task 5.12) ------------------------------------------
  // Registered BEFORE the `/:id` routes so DELETE /media is not shadowed by
  // DELETE /:id. Every handler reads the admin identity requireAdmin stored
  // on the Hono context. The browser only ever receives refs + signed URLs;
  // the service-role key never leaves the server.
  app.post('/media', async (c) => {
    if (!mediaService) throw questionError.internal('question media service is not available')
    const admin = c.get('admin')
    const file = await readMediaFile(c)
    const buffer = file ? new Uint8Array(await file.arrayBuffer()) : null
    const result = await mediaService.upload({
      admin,
      file: file
        ? { size: file.size, mimeType: file.type, buffer }
        : { size: 0, mimeType: '', buffer: new Uint8Array(0) },
    })
    return c.json(result, 201)
  })

  app.get('/media/url', async (c) => {
    if (!mediaService) throw questionError.internal('question media service is not available')
    const { url } = await mediaService.url({ ref: c.req.query('ref') })
    return c.json({ url })
  })

  app.delete('/media', async (c) => {
    if (!mediaService) throw questionError.internal('question media service is not available')
    const admin = c.get('admin')
    const { removed } = await mediaService.remove({ admin, ref: c.req.query('ref') })
    return c.json({ removed })
  })

  app.post('/', async (c) => {
    const input = await c.req.json().catch(() => null)
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw questionError.unexpectedField('request body must be a JSON object')
    }
    const { question } = await questionService.create(input, { admin: c.get('admin') })
    return c.json({ question }, 201)
  })

  app.get('/:id', async (c) => {
    const { question } = await questionService.getById(c.req.param('id'))
    return c.json({ question })
  })

  app.put('/:id', async (c) => {
    const input = await c.req.json().catch(() => null)
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw questionError.unexpectedField('request body must be a JSON object')
    }
    const { question } = await questionService.update(c.req.param('id'), input, { admin: c.get('admin') })
    return c.json({ question })
  })

  app.delete('/:id', async (c) => {
    const { removed } = await questionService.remove(c.req.param('id'))
    return c.json({ removed })
  })

  // -- review + release lifecycle (Task 5.13) ---------------------------------
  // Multi-segment routes so they never collide with `GET/PUT/DELETE /:id`.
  // Every transition is an explicit, server-authoritative action; the client
  // cannot move a question through the lifecycle by editing fields.
  const jsonBody = async (c) => {
    const body = await c.req.json().catch(() => null)
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  }

  app.get('/:id/audit', async (c) => {
    const { actions } = await questionService.audit(c.req.param('id'))
    return c.json({ actions })
  })

  app.post('/:id/submit', async (c) => {
    const { question } = await questionService.submitForReview(c.req.param('id'), { admin: c.get('admin') })
    return c.json({ question })
  })

  app.post('/:id/approve', async (c) => {
    const body = await jsonBody(c)
    const { question } = await questionService.approve(c.req.param('id'), {
      admin: c.get('admin'),
      note: typeof body.note === 'string' ? body.note : null,
    })
    return c.json({ question })
  })

  app.post('/:id/reject', async (c) => {
    const body = await jsonBody(c)
    const { question } = await questionService.reject(c.req.param('id'), {
      admin: c.get('admin'),
      note: typeof body.note === 'string' ? body.note : null,
    })
    return c.json({ question })
  })

  app.post('/:id/publish', async (c) => {
    const { question } = await questionService.publish(c.req.param('id'), { admin: c.get('admin') })
    return c.json({ question })
  })

  app.post('/:id/archive', async (c) => {
    const { question } = await questionService.archive(c.req.param('id'), { admin: c.get('admin') })
    return c.json({ question })
  })

  app.post('/:id/versions', async (c) => {
    const { question } = await questionService.createVersion(c.req.param('id'), { admin: c.get('admin') })
    return c.json({ question }, 201)
  })

  app.notFound((c) =>
    c.json({ error: questionError.notFound('unknown question route').toPublic() }, 404)
  )

  app.onError((err, c) => {
    const known = err instanceof QuestionError ? err : questionError.internal(err?.message)
    if (known.code === 'QUESTION_INTERNAL') console?.error?.(err)
    return c.json({ error: known.toPublic() }, statusByCode(known.code))
  })

  return app
}

export default { createAdminQuestionsApi }