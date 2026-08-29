/**
 * Browser Supabase clients — admin console data reads.
 *
 * Two flavours, both lazy (never touch the network at import time) and both
 * built with the PUBLIC anon key only — the service-role key stays
 * server-only and is never referenced by client code (D-027):
 *
 *   getSupabaseClient()      — plain anon client, for tables with an
 *                               `anon`-role RLS policy (streams, levels,
 *                               activity_types, badges, leaderboard_entries).
 *   getAdminSupabaseClient() — attaches the signed-in admin's Supabase Auth
 *                               access token (from admin-session storage) as
 *                               the Authorization header, so PostgREST sees
 *                               an `authenticated` role and RLS's
 *                               `is_admin()` check passes for admin-only
 *                               tables (students, game_sessions,
 *                               certificates, student_badges, scores).
 *
 * Neither client persists its own Supabase Auth session — the admin token
 * already lives in adminSessionStorage (tab-scoped sessionStorage), so this
 * module just forwards it per request.
 */

import { createClient } from '@supabase/supabase-js'
import adminSessionStorage from '../features/admin-auth/auth/admin-session.js'

function config() {
  const url = import.meta.env?.VITE_SUPABASE_URL
  const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url: String(url).replace(/\/+$/, ''), anonKey }
}

let cachedPublicClient = null

/** Anon-key client for publicly-readable catalogue/leaderboard tables. */
export function getSupabaseClient() {
  if (cachedPublicClient) return cachedPublicClient
  const cfg = config()
  if (!cfg) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  cachedPublicClient = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 0 } },
  })
  return cachedPublicClient
}

/**
 * Admin-scoped client for tables gated by `is_admin()` RLS. Constructed
 * fresh per call (cheap — no network I/O) so it always carries the current
 * admin token rather than one captured at import time.
 */
export function getAdminSupabaseClient() {
  const cfg = config()
  if (!cfg) throw new Error('Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  const token = adminSessionStorage.read()
  if (!token) throw new Error('Not signed in as an administrator')
  return createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
    realtime: { params: { eventsPerSecond: 0 } },
  })
}

export default { getSupabaseClient, getAdminSupabaseClient }
