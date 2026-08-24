/**
 * Leaderboard — repository factory (Task 5.7).
 *
 * `mode: 'memory'`   → deterministic, store-backed repositories (tests + demo)
 * `mode: 'supabase'` → service-role PostgREST adapters (server-only)
 *
 * The identity/authorization boundary stays with StudentService (D-005);
 * this layer only reads/writes the materialised best-score rows.
 */

import { createLeaderboardMemoryStore, createLeaderboardMemoryRepositories } from './memory.js'
import { createSupabaseLeaderboardRepositories } from './supabase.js'

export async function createLeaderboardRepositories({ mode }) {
  if (mode === 'memory') {
    return createLeaderboardMemoryRepositories(createLeaderboardMemoryStore())
  }
  if (mode === 'supabase') {
    const { getSupabaseServerClient } = await import('../../game-session/repositories/supabase-client.js')
    const client = await getSupabaseServerClient()
    return createSupabaseLeaderboardRepositories({ client })
  }
  throw new Error(`Unknown leaderboard repository mode: "${mode}"`)
}

export { createLeaderboardMemoryStore, createLeaderboardMemoryRepositories, seedLeaderboardStore } from './memory.js'
export { createSupabaseLeaderboardRepositories, rowToLeaderboardEntry } from './supabase.js'

export default {
  createLeaderboardRepositories,
}