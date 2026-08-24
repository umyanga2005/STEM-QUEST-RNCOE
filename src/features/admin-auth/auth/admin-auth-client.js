/**
 * Admin auth — browser Supabase Auth client (Task 5.9).
 *
 * The admin console signs in through Supabase Auth using ONLY public Vite env
 * values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — never the
 * service-role key (D-027), which stays server-only and is NEVER referenced by
 * client code. Mirrors the leaderboard Realtime pattern: when the public env
 * values are absent (local dev), the factory throws and the UI shows the
 * "admin auth not configured" notice instead of a broken sign-in form.
 *
 * Sessions are NOT persisted by the client (`persistSession: false`); the
 * access token is held in memory and mirrored to `sessionStorage` by the
 * admin-session helper so the console keeps kiosk-friendly, tab-scoped
 * sessions. The server never sees the password — only the access token it
 * validates via `auth.getUser`.
 */

import { createClient } from '@supabase/supabase-js'

export function adminAuthConfig() {
  const url = import.meta.env?.VITE_SUPABASE_URL
  const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url: String(url).replace(/\/+$/, ''), anonKey }
}

/**
 * Lazily constructs the browser Supabase auth client (anon key only).
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 * @throws {Error} when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset
 */
export function createAdminAuthClient() {
  const config = adminAuthConfig()
  if (!config) {
    throw new Error('Admin auth is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  }
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 0 } },
  })
}

export default {
  adminAuthConfig,
  createAdminAuthClient,
}