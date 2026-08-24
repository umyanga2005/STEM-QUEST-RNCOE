/**
 * Admin — repository contract tests (Task 5.9).
 *
 * Memory + Supabase admin repositories both resolve the ACTIVE administrator
 * identity from a raw `public.admins` row keyed by the Supabase Auth user id,
 * and return `null` for unknown or inactive ids. This is the server-side
 * equivalent of the `public.is_admin()` predicate (D-024/D-028).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createAdminMemoryRepositories, seedAdminStore, createAdminMemoryStore } from '../repositories/memory.js'
import { createSupabaseAdminRepositories, SupabaseAdminRepository } from '../repositories/supabase.js'
import { createFakeSupabaseClient, seedFakeAdmin } from '../../game-session/testing/fake-supabase-client.js'

const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111'

test('memory repository resolves an active admin by auth user id', async () => {
  const store = createAdminMemoryStore()
  seedAdminStore(store, [{ id: ADMIN_USER_ID, display_name: 'Console Admin', role: 'superadmin', is_active: true }])
  const { adminRepository } = createAdminMemoryRepositories(store)

  const admin = await adminRepository.findActiveByAuthUserId(ADMIN_USER_ID)
  assert.deepEqual(admin, { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'superadmin' })

  assert.equal(await adminRepository.findActiveByAuthUserId('unknown-user'), null)
})

test('memory repository treats an inactive admin as not an administrator', async () => {
  const store = createAdminMemoryStore()
  seedAdminStore(store, [{ id: ADMIN_USER_ID, display_name: 'Retired', role: 'admin', is_active: false }])
  const { adminRepository } = createAdminMemoryRepositories(store)
  assert.equal(await adminRepository.findActiveByAuthUserId(ADMIN_USER_ID), null)
})

test('supabase repository reads an active admin row with exactly the 0001 columns', async () => {
  const { client, db } = createFakeSupabaseClient()
  seedFakeAdmin(db, { authUserId: ADMIN_USER_ID, displayName: 'Console Admin', role: 'content_editor' })
  const { adminRepository } = createSupabaseAdminRepositories({ client })

  const admin = await adminRepository.findActiveByAuthUserId(ADMIN_USER_ID)
  assert.deepEqual(admin, { id: ADMIN_USER_ID, displayName: 'Console Admin', role: 'content_editor' })
  assert.equal(await adminRepository.findActiveByAuthUserId('unknown-user'), null)
})

test('supabase repository treats an inactive admin as not an administrator', async () => {
  const { client, db } = createFakeSupabaseClient()
  seedFakeAdmin(db, { authUserId: ADMIN_USER_ID, displayName: 'Retired', role: 'viewer', isActive: false })
  const { adminRepository } = createSupabaseAdminRepositories({ client })
  assert.equal(await adminRepository.findActiveByAuthUserId(ADMIN_USER_ID), null)
})

test('supabase repository rejects a missing auth user id without querying', async () => {
  const { client } = createFakeSupabaseClient()
  const repo = new SupabaseAdminRepository({ client })
  assert.equal(await repo.findActiveByAuthUserId(null), null)
  assert.equal(await repo.findActiveByAuthUserId(''), null)
})

export default { tests: true }