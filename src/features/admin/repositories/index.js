/**
 * Admin — repository factory (Task 5.9).
 *
 * `mode: 'memory'`   → deterministic, store-backed repositories (tests + demo)
 * `mode: 'supabase'` → service-role PostgREST adapters (server-only)
 *
 * The authorization boundary stays with AdminService (validates the Supabase
 * Auth JWT, then resolves the active admin identity from the existing
 * `public.admins` table — D-024/D-028). No new tables.
 */

import { createAdminMemoryStore, createAdminMemoryRepositories } from './memory.js'
import { createSupabaseAdminRepositories } from './supabase.js'

export async function createAdminRepositories({ mode }) {
  if (mode === 'memory') {
    return createAdminMemoryRepositories(createAdminMemoryStore())
  }
  if (mode === 'supabase') {
    const { getSupabaseServerClient } = await import('../../game-session/repositories/supabase-client.js')
    const client = await getSupabaseServerClient()
    return createSupabaseAdminRepositories({ client })
  }
  throw new Error(`Unknown admin repository mode: "${mode}"`)
}

export { createAdminMemoryStore, createAdminMemoryRepositories, seedAdminStore, rowToAdminIdentity } from './memory.js'
export { createSupabaseAdminRepositories, rowToAdminIdentity as rowToSupabaseAdminIdentity } from './supabase.js'

export default {
  createAdminRepositories,
}