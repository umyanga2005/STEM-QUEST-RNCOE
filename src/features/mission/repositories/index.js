/**
 * Mission — repository factory (Task 5.2).
 *
 * `mode: 'memory'`   → deterministic, store-backed repositories (tests + demo)
 * `mode: 'supabase'` → service-role PostgREST adapters (server-only)
 *
 * Mission repositories are read-only catalogue + progression sources. The
 * identity/authorization boundary stays with StudentService (D-005/D-027).
 */

import { createMissionMemoryStore, createMissionMemoryRepositories } from './memory.js'
import { createSupabaseMissionRepositories } from './supabase.js'

export async function createMissionRepositories({ mode }) {
  if (mode === 'memory') {
    return createMissionMemoryRepositories(createMissionMemoryStore())
  }
  if (mode === 'supabase') {
    const { getSupabaseServerClient } = await import('../../game-session/repositories/supabase-client.js')
    const client = await getSupabaseServerClient()
    return createSupabaseMissionRepositories({ client })
  }
  throw new Error(`Unknown mission repository mode: "${mode}"`)
}

export { createMissionMemoryStore, createMissionMemoryRepositories, seedMissionStore } from './memory.js'
export { createSupabaseMissionRepositories, rowToStream, rowToLevel } from './supabase.js'

export default {
  createMissionRepositories,
}
