/**
 * Admin — in-memory repositories (Task 5.9).
 *
 * Plain-object store + repository implementation used by unit/integration
 * tests and the demo stack. Matches the contract in `contracts.js`: an active
 * admin identity is resolved by auth user id; inactive or unknown ids return
 * `null`. No Supabase dependency — tests never touch the live project.
 */

export function createAdminMemoryStore() {
  return { admins: [] }
}

/** Seeds the admin store with raw rows (tests + demo). */
export function seedAdminStore(store, admins = []) {
  store.admins.push(...admins)
  return store
}

/** Maps a raw admin row to the identity contract shape. */
export function rowToAdminIdentity(row) {
  if (!row) return null
  return {
    id: String(row.id),
    displayName: row.display_name ?? row.displayName ?? '',
    role: row.role ?? 'viewer',
  }
}

export class MemoryAdminRepository {
  constructor(store) {
    this.store = store
  }

  async findActiveByAuthUserId(authUserId) {
    const row = this.store.admins.find(
      (a) => String(a.id) === String(authUserId) && a.is_active !== false
    )
    return row ? rowToAdminIdentity(row) : null
  }
}

/** Builds the in-memory admin repository over one store. */
export function createAdminMemoryRepositories(store = createAdminMemoryStore()) {
  return {
    store,
    adminRepository: new MemoryAdminRepository(store),
  }
}

export default {
  createAdminMemoryStore,
  createAdminMemoryRepositories,
  seedAdminStore,
  rowToAdminIdentity,
}