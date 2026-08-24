/**
 * Admin — Hono API contract tests (Task 5.9).
 *
 * `GET /api/admin/me` over a stub AdminService (direct app) and through the
 * full production stack over the deterministic fake PostgREST client. The
 * authorization matrix is the security core: no token → 401, bogus token →
 * 401, valid Supabase identity but no active admin row → 403, active admin →
 * 200 with only the safe identity surface. Student-style opaque tokens are
 * NOT JWTs, so they land in the 401 branch — they can never grant admin.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createAdminApi } from '../api/server.js'
import { AdminService } from '../service/admin-service.js'
import { ADMIN_ERROR_CODES, adminError } from '../errors.js'
import { createFakeSupabaseClient, addFakeAuthUser, seedFakeAdmin } from '../../game-session/testing/fake-supabase-client.js'
import { createProductionApi } from '../../game-session/api/production-server.js'

const ADMIN_TOKEN = 'jwt-admin-1'
const PLAIN_TOKEN = 'jwt-plain-1'
const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111'
const PLAIN_USER_ID = '22222222-2222-4222-8222-222222222222'

const auth = (token) => ({ authorization: `Bearer ${token}` })

function stubAdminService({ token, result, error }) {
  return {
    resolveAdmin: async (t) => {
      if (t === token) {
        if (error) throw error
        return result
      }
      throw adminError.invalidToken('token rejected by Supabase Auth')
    },
  }
}

test('GET /api/admin/me returns the safe identity for an active admin', async () => {
  const app = createAdminApi({
    adminService: stubAdminService({ token: ADMIN_TOKEN, result: { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' } }),
  })
  const resp = await app.request('/api/admin/me', { headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.deepEqual(body.admin, { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' })
  assert.ok(!JSON.stringify(body).includes('token'), 'no token/secret in the response')
})

test('GET /api/admin/me without a token is 401 ADMIN_UNAUTHENTICATED', async () => {
  const app = createAdminApi({
    adminService: stubAdminService({ token: ADMIN_TOKEN, result: { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'admin' } }),
  })
  const resp = await app.request('/api/admin/me')
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, ADMIN_ERROR_CODES.UNAUTHENTICATED)
  assert.equal(body.error.category, 'AUTHENTICATION')
})

test('GET /api/admin/me with a bogus token is 401 ADMIN_INVALID_TOKEN', async () => {
  const app = createAdminApi({
    adminService: stubAdminService({ token: ADMIN_TOKEN, result: { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'admin' } }),
  })
  const resp = await app.request('/api/admin/me', { headers: auth('student-opaque-token') })
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, ADMIN_ERROR_CODES.INVALID_TOKEN)
})

test('non-admin 403 error maps to ADMIN_FORBIDDEN', async () => {
  const app = createAdminApi({
    adminService: stubAdminService({ token: ADMIN_TOKEN, result: null, error: adminError.forbidden('not an admin') }),
  })
  const resp = await app.request('/api/admin/me', { headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 403)
  const body = await resp.json()
  assert.equal(body.error.code, ADMIN_ERROR_CODES.FORBIDDEN)
  assert.equal(body.error.category, 'AUTHORIZATION')
})

// ---------------------------------------------------------------------------
// Through the real production composition (deterministic fake Supabase)
// ---------------------------------------------------------------------------

function buildFake() {
  const { client, db } = createFakeSupabaseClient()
  addFakeAuthUser(db, { token: ADMIN_TOKEN, userId: ADMIN_USER_ID })
  addFakeAuthUser(db, { token: PLAIN_TOKEN, userId: PLAIN_USER_ID })
  seedFakeAdmin(db, { authUserId: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' })
  return { client, db }
}

test('production stack: admin token with active admins row → 200 safe identity', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/me', { headers: auth(ADMIN_TOKEN) })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.deepEqual(body.admin, { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' })
  const payload = JSON.stringify(body)
  assert.ok(!/token|secret|service-role|service_role/.test(payload), 'no secrets leak from /api/admin/me')
})

test('production stack: valid Supabase identity without an admins row → 403', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/me', { headers: auth(PLAIN_TOKEN) })
  assert.equal(resp.status, 403)
  const body = await resp.json()
  assert.equal(body.error.code, ADMIN_ERROR_CODES.FORBIDDEN)
})

test('production stack: an inactive admins row is not an administrator → 403', async () => {
  const { client, db } = buildFake()
  seedFakeAdmin(db, { authUserId: PLAIN_USER_ID, displayName: 'Retired', role: 'admin', isActive: false })
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/me', { headers: auth(PLAIN_TOKEN) })
  assert.equal(resp.status, 403)
})

test('production stack: an opaque student session token never grants admin → 401', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/me', { headers: auth('student-opaque-token') })
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, ADMIN_ERROR_CODES.INVALID_TOKEN)
})

test('production stack: no token → 401 ADMIN_UNAUTHENTICATED', async () => {
  const { client } = buildFake()
  const { app } = await createProductionApi({ client })
  const resp = await app.request('/api/admin/me')
  assert.equal(resp.status, 401)
  const body = await resp.json()
  assert.equal(body.error.code, ADMIN_ERROR_CODES.UNAUTHENTICATED)
})

test('AdminService.resolveAdmin with no client is ADMIN_UNAVAILABLE', async () => {
  const service = new AdminService({ adminRepository: { findActiveByAuthUserId: async () => null }, supabaseClient: null })
  await assert.rejects(() => service.resolveAdmin(ADMIN_TOKEN), (err) => err.code === ADMIN_ERROR_CODES.UNAVAILABLE)
})

export default { tests: true }