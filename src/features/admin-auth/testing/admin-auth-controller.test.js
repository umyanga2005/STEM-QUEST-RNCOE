/**
 * Admin auth — controller state-machine tests (Task 5.9).
 *
 * Deterministic, no-DOM, no-network coverage of the admin session controller:
 * restore (stored token validated against the server), sign-in (Supabase Auth
 * + server authorization), sign-out, unavailable configuration, and the
 * security rules — a valid Supabase identity that is NOT an admin is rejected
 * (403 → forbidden), a network/server failure never writes a token, and
 * failures never leave an `authenticated` state behind.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  createAdminAuthController,
  ADMIN_AUTH_STATUS,
  AdminAuthUnavailableError,
  AdminAuthInvalidCredentialsError,
  AdminAuthForbiddenError,
  AdminAuthNetworkError,
} from '../auth/admin-auth-controller.js'
import { AdminApiError } from '../api/client.js'

function memoryStorage(initial = null) {
  let value = initial
  return {
    read: () => value,
    write: (token) => {
      value = token
    },
    clear: () => {
      value = null
    },
    get value() {
      return value
    },
  }
}

function fakeMe({ byToken }) {
  return {
    getMe: async (token) => {
      const outcome = byToken[token]
      if (!outcome) throw new AdminApiError(401, { code: 'ADMIN_INVALID_TOKEN' })
      if (outcome.status) throw new AdminApiError(outcome.status, { code: outcome.code })
      return { admin: outcome.admin }
    },
  }
}

function fakeAuthClient({ signInResult = { data: { session: { access_token: 'access-1' } }, error: null }, signOutCalls = [] }) {
  return {
    auth: {
      signInWithPassword: async () => signInResult,
      signOut: async () => {
        signOutCalls.push(1)
      },
    },
  }
}

test('initial snapshot is loading', () => {
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: {} }),
    storage: memoryStorage(),
  })
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.LOADING)
  assert.equal(c.getSnapshot().admin, null)
})

test('restore with no stored token becomes unauthenticated', async () => {
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: {} }),
    storage: memoryStorage(),
  })
  await c.restore()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
})

test('restore with a stored token validated by the server becomes authenticated', async () => {
  const admin = { id: 'u1', displayName: 'Console Admin', role: 'superadmin' }
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: { 'access-1': { admin } } }),
    storage: memoryStorage('access-1'),
  })
  await c.restore()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.AUTHENTICATED)
  assert.deepEqual(c.getSnapshot().admin, admin)
})

test('restore with a rejected token clears the stored token and becomes unauthenticated', async () => {
  const storage = memoryStorage('access-expired')
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: { 'access-expired': { status: 401, code: 'ADMIN_INVALID_TOKEN' } } }),
    storage,
  })
  await c.restore()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
  assert.equal(storage.value, null, 'expired token is cleared')
})

test('restore with a 403 (account no longer admin) clears the token and becomes unauthenticated', async () => {
  const storage = memoryStorage('access-1')
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: { 'access-1': { status: 403, code: 'ADMIN_FORBIDDEN' } } }),
    storage,
  })
  await c.restore()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
  assert.equal(storage.value, null)
})

test('restore on a network failure keeps the token and surfaces an error (no auth loop)', async () => {
  const storage = memoryStorage('access-1')
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: {
      getMe: async () => {
        throw new AdminApiError(500, { code: 'ADMIN_INTERNAL' })
      },
    },
    storage,
  })
  await c.restore()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
  assert.equal(storage.value, 'access-1', 'token kept so a later refresh can restore')
  assert.equal(c.getSnapshot().error.code, 'ADMIN_NETWORK')
})

test('restore when admin auth is not configured becomes unavailable', async () => {
  const c = createAdminAuthController({
    authClientFactory: () => {
      throw new Error('not configured')
    },
    adminApiClient: fakeMe({ byToken: {} }),
    storage: memoryStorage(),
  })
  await c.restore()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAVAILABLE)
})

test('signIn signs into Supabase, authorizes against the server and stores the token', async () => {
  const admin = { id: 'u1', displayName: 'Console Admin', role: 'admin' }
  const storage = memoryStorage()
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: { 'access-1': { admin } } }),
    storage,
  })
  const result = await c.signIn({ email: 'admin@stem-quest.dev', password: 's3cret' })
  assert.deepEqual(result, admin)
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.AUTHENTICATED)
  assert.equal(storage.value, 'access-1')
  assert.equal(c.getSnapshot().error, null)
})

test('signIn with wrong credentials throws a safe error and stays unauthenticated', async () => {
  const storage = memoryStorage()
  const c = createAdminAuthController({
    authClientFactory: () =>
      fakeAuthClient({ signInResult: { data: { session: null }, error: { message: 'Invalid login credentials' } } }),
    adminApiClient: fakeMe({ byToken: {} }),
    storage,
  })
  await assert.rejects(() => c.signIn({ email: 'x@y.z', password: 'bad' }), AdminAuthInvalidCredentialsError)
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
  assert.equal(storage.value, null)
})

test('signIn with a valid Supabase identity that is NOT an admin is rejected (403) and signs out', async () => {
  const signOutCalls = []
  const storage = memoryStorage()
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({ signOutCalls }),
    adminApiClient: fakeMe({ byToken: { 'access-1': { status: 403, code: 'ADMIN_FORBIDDEN' } } }),
    storage,
  })
  await assert.rejects(() => c.signIn({ email: 'plain@x.yz', password: 'pw' }), AdminAuthForbiddenError)
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
  assert.equal(storage.value, null, 'no token stored for a non-admin')
  assert.equal(signOutCalls.length, 1, 'the just-created Supabase session is cleaned up')
})

test('signIn when admin auth is not configured throws unavailable and flips to unavailable', async () => {
  const c = createAdminAuthController({
    authClientFactory: () => {
      throw new Error('not configured')
    },
    adminApiClient: fakeMe({ byToken: {} }),
    storage: memoryStorage(),
  })
  await assert.rejects(() => c.signIn({ email: 'a@b.c', password: 'x' }), AdminAuthUnavailableError)
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAVAILABLE)
})

test('signIn network failure on the server authorizer throws a safe error and stores nothing', async () => {
  const signOutCalls = []
  const storage = memoryStorage()
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({ signOutCalls }),
    adminApiClient: {
      getMe: async () => {
        throw new AdminApiError(500, { code: 'ADMIN_INTERNAL' })
      },
    },
    storage,
  })
  await assert.rejects(() => c.signIn({ email: 'a@b.c', password: 'x' }), AdminAuthNetworkError)
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
  assert.equal(storage.value, null)
  assert.equal(signOutCalls.length, 1)
})

test('signOut clears the stored token and becomes unauthenticated', async () => {
  const storage = memoryStorage('access-1')
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: { 'access-1': { admin: { id: 'u1', displayName: 'Console Admin', role: 'admin' } } } }),
    storage,
  })
  await c.restore()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.AUTHENTICATED)
  await c.signOut()
  assert.equal(c.getSnapshot().status, ADMIN_AUTH_STATUS.UNAUTHENTICATED)
  assert.equal(storage.value, null)
  assert.equal(c.getSnapshot().admin, null)
})

test('subscribe listeners are notified on state changes and can unsubscribe', async () => {
  const c = createAdminAuthController({
    authClientFactory: () => fakeAuthClient({}),
    adminApiClient: fakeMe({ byToken: { 'access-1': { admin: { id: 'u1', displayName: 'Console Admin', role: 'admin' } } } }),
    storage: memoryStorage('access-1'),
  })
  let count = 0
  const unsubscribe = c.subscribe(() => {
    count += 1
  })
  await c.restore()
  assert.ok(count >= 1, 'listener notified on restore')
  unsubscribe()
  const before = count
  await c.signOut()
  assert.equal(count, before, 'unsubscribed listener not notified')
})

export default { tests: true }