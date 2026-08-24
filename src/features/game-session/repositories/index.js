/**
 * Game Session — repository factory (Task 4.4).
 *
 * `mode: 'memory'`  → deterministic, store-backed repositories (tests + demo)
 * `mode: 'supabase'`→ service-role PostgREST adapters (production, server-only)
 */

import { createMemoryStore, createMemoryRepositories } from './memory.js'
import { createSupabaseRepositories } from './supabase.js'

export async function createRepositories({ mode }) {
  if (mode === 'memory') {
    return createMemoryRepositories(createMemoryStore())
  }
  if (mode === 'supabase') {
    const { getSupabaseServerClient } = await import('./supabase-client.js')
    const client = await getSupabaseServerClient()
    return createSupabaseRepositories({ client })
  }
  throw new Error(`Unknown repository mode: "${mode}"`)
}

export {
  createMemoryStore,
  createMemoryRepositories,
} from './memory.js'
export {
  createSupabaseRepositories,
  rowToQuestion,
  rowToGameSession,
  rowToSessionRound,
} from './supabase.js'