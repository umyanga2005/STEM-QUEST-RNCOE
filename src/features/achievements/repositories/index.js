/**
 * Achievements — repository factory (Task 5.8).
 *
 * `mode: 'memory'`   → deterministic, store-backed repositories (tests + demo)
 * `mode: 'supabase'` → service-role PostgREST adapters (server-only)
 *
 * The identity/authorization boundary stays with StudentService (D-005);
 * this layer only reads the badge catalogue and writes the backend-authorised
 * `student_badges` / `certificates` rows (D-011/D-031/D-027).
 */

import { createAchievementsMemoryStore, createAchievementsMemoryRepositories } from './memory.js'
import { createSupabaseAchievementsRepositories } from './supabase.js'

export async function createAchievementsRepositories({ mode }) {
  if (mode === 'memory') {
    return createAchievementsMemoryRepositories(createAchievementsMemoryStore())
  }
  if (mode === 'supabase') {
    const { getSupabaseServerClient } = await import('../../game-session/repositories/supabase-client.js')
    const client = await getSupabaseServerClient()
    return createSupabaseAchievementsRepositories({ client })
  }
  throw new Error(`Unknown achievements repository mode: "${mode}"`)
}

export {
  createAchievementsMemoryStore,
  createAchievementsMemoryRepositories,
  STREAM_COMPLETION_BADGES,
  STREAM_SLUG_TO_BADGE_SLUG,
} from './memory.js'
export { createSupabaseAchievementsRepositories, rowToBadge, rowToStudentBadge, rowToCertificate } from './supabase.js'

export default {
  createAchievementsRepositories,
}