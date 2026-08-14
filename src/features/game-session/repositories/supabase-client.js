/**
 * Game Session — Supabase server client (Task 4.4).
 *
 * Server-only factory for the SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY pair.
 * The service role bypasses RLS by design (D-027): all trusted gameplay
 * writes flow through it and NEVER through the browser. The keys must come
 * from server environment variables — never from `VITE_*` and never be
 * referenced by client code.
 */

/**
 * @param {object} [env] - env lookup (injectable for tests)
 * @returns {{ supabaseUrl: string, serviceRoleKey: string }}
 * @throws {Error} when either variable is missing
 */
export function loadServerConfig(env = globalThis.process?.env ?? {}) {
  const supabaseUrl = env.SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase server config missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
        'must be set server-side (never VITE_*).'
    )
  }
  return { supabaseUrl, serviceRoleKey }
}

/**
 * Lazy factory: creates exactly one service-role client per process.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseServerClient(env) {
  if (!getSupabaseServerClient._client) {
    const { supabaseUrl, serviceRoleKey } = loadServerConfig(env)
    const { createClient } = requireSupabase()
    getSupabaseServerClient._client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 0 } },
    })
  }
  return getSupabaseServerClient._client
}

function requireSupabase() {
  // Static import would pull @supabase/supabase-js into any module that
  // imports this file; keep the dependency on the server-only path dynamic so
  // it can never enter the client bundle.
  return import('@supabase/supabase-js')
}

getSupabaseServerClient._client = null

export default {
  loadServerConfig,
  getSupabaseServerClient,
}