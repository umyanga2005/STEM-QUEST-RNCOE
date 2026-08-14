/**
 * Student — repository factory (Task 5.1).
 *
 * `mode: 'memory'`  → deterministic, store-backed repositories (tests + demo)
 * `mode: 'supabase'`→ service-role PostgREST + Storage adapters (server-only)
 */

import { createStudentMemoryStore, createStudentMemoryRepositories } from './memory.js'
import { createSupabaseStudentRepositories } from './supabase.js'

export async function createStudentRepositories({ mode }) {
  if (mode === 'memory') {
    return createStudentMemoryRepositories(createStudentMemoryStore())
  }
  if (mode === 'supabase') {
    const { getSupabaseServerClient } = await import('../../game-session/repositories/supabase-client.js')
    const client = getSupabaseServerClient()
    return createSupabaseStudentRepositories({ client })
  }
  throw new Error(`Unknown student repository mode: "${mode}"`)
}

export { createStudentMemoryStore, createStudentMemoryRepositories } from './memory.js'
export { createSupabaseStudentRepositories, rowToStudent } from './supabase.js'

export default {
  createStudentRepositories,
}