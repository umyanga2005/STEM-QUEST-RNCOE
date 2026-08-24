/**
 * Admin Question Builder — repository factory (Task 5.10).
 *
 * Picks the memory or Supabase implementation. Production wiring always uses
 * the Supabase repositories over the service-role client (D-027/D-028); tests
 * and demo use the in-memory store.
 */

export { createQuestionMemoryStore, createQuestionMemoryRepositories, seedQuestionStore } from './memory.js'
export { createSupabaseQuestionRepositories } from './supabase.js'
export { rowToQuestionDto } from './row-mapper.js'

/** Builds repositories for an implementation key. */
export function createQuestionRepositories({ impl = 'memory', client = null, store = null } = {}) {
  if (impl === 'memory') {
    return createQuestionMemoryRepositories(store)
  }
  if (impl === 'supabase') {
    return createSupabaseQuestionRepositories({ client })
  }
  throw new Error(`createQuestionRepositories: unknown impl "${impl}"`)
}

export default { createQuestionRepositories }