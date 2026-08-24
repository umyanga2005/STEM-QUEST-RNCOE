/**
 * Progression — repository factory index (Task 5.5).
 *
 * Re-exports the concrete repository builders. The memory implementation runs
 * against the game-session store (which owns `studentProgress` /
 * `studentLevelProgress`), and the Supabase implementation against the
 * service-role client. Both satisfy the contracts in `contracts.js`.
 */

import { createProgressionRepository } from './memory.js'
import { createProgressionRepositories } from './supabase.js'

export { createProgressionRepository, MemoryProgressionRepository } from './memory.js'
export { createProgressionRepositories, SupabaseProgressionRepository } from './supabase.js'

export default {
  createProgressionRepository,
  createProgressionRepositories,
}