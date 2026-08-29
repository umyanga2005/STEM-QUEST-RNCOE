/**
 * Leaderboard — browser Realtime (Task 5.7).
 *
 * The single approved browser→Supabase contact (D-080). The public
 * `leaderboard_entries` table is the ONLY Realtime-broadcast table (D-029),
 * so the browser may open one channel against the project's Realtime gateway
 * using ONLY public Vite env values (`VITE_SUPABASE_URL`,
 * `VITE_SUPABASE_ANON_KEY`) — never the service-role key.
 *
 * Design:
 *  - A refcounted controller opens exactly ONE `RealtimeClient` + channel
 *    however many components subscribe (student page + future exhibition
 *    board), and disconnects when the last subscriber leaves.
 *  - On any postgres_changes event the leaderboard cache is invalidated;
 *    scores are never read from the socket — the authoritative rows come from
 *    the Hono API on refetch.
 *  - When the public env values are absent (local dev), the controller
 *    degrades to an explicit `UNAVAILABLE` status and the UI shows
 *    "Live updates off" instead of a broken socket.
 */

import { RealtimeClient } from '@supabase/realtime-js'

export const LEADERBOARD_REALTIME_CHANNEL = 'leaderboard_entries'
export const LEADERBOARD_REALTIME_TABLE = 'leaderboard_entries'

export const REALTIME_STATUS = Object.freeze({
  UNAVAILABLE: 'UNAVAILABLE',
  CONNECTING: 'CONNECTING',
})

/** Builds the endpoint + params for the public Realtime gateway. */
export function realtimeConfig() {
  const url = import.meta.env?.VITE_SUPABASE_URL
  const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return {
    endpoint: `${String(url).replace(/\/+$/, '')}/realtime/v1`,
    params: { apikey: anonKey },
  }
}

/** Lazily constructs the RealtimeClient (public anon key only, D-080). */
function defaultCreateClient() {
  const config = realtimeConfig()
  if (!config) throw new Error('Realtime is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  return new RealtimeClient(config.endpoint, { params: config.params })
}

/**
 * Creates a refcounted realtime controller. `createClient` is injectable so
 * tests can drive a fake socket; the production path uses `defaultCreateClient`.
 */
// Grace period before actually tearing down the shared socket once the last
// subscriber leaves. React 18/19 StrictMode double-invokes mount effects in
// dev (mount → cleanup → mount, synchronously); without this delay the
// cleanup from the first (discarded) mount closes the socket while it's
// still mid-handshake, producing "WebSocket is closed before the connection
// is established" even though a real subscriber remounts a moment later.
const TEARDOWN_GRACE_MS = 250

export function createLeaderboardRealtimeController({ createClient }) {
  let client = null
  let channel = null
  let subscribers = 0
  let unavailable = false
  let teardownTimer = null
  const listeners = new Set()

  function emit(payload) {
    for (const listener of listeners) listener.onEvent?.(payload)
  }

  function notifyStatus(status) {
    for (const listener of listeners) listener.onStatus?.(status)
  }

  function ensureSubscribed() {
    if (teardownTimer) {
      clearTimeout(teardownTimer)
      teardownTimer = null
    }
    if (channel || unavailable) return
    let created
    try {
      created = createClient()
    } catch {
      unavailable = true
      notifyStatus(REALTIME_STATUS.UNAVAILABLE)
      return
    }
    client = created
    channel = client.channel(LEADERBOARD_REALTIME_CHANNEL)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: LEADERBOARD_REALTIME_TABLE },
      (payload) => emit(payload)
    )
    channel.subscribe((status, err) => {
      if (err) notifyStatus(REALTIME_STATUS.UNAVAILABLE)
      else notifyStatus(status)
    })
  }

  /**
   * Registers an event/status listener and opens the shared socket on the
   * first subscriber. Returns an unsubscribe that closes the socket when the
   * last subscriber leaves (duplicate-subscription guard for the exhibition
   * board + student page mounting together).
   */
  function subscribe({ onEvent = null, onStatus = null } = {}) {
    const listener = { onEvent, onStatus }
    listeners.add(listener)
    subscribers += 1
    ensureSubscribed()
    return () => {
      listeners.delete(listener)
      subscribers -= 1
      if (subscribers <= 0 && channel && !teardownTimer) {
        teardownTimer = setTimeout(() => {
          teardownTimer = null
          if (subscribers > 0 || !channel) return
          try {
            channel.unsubscribe?.()
          } catch {
            /* socket already closed */
          }
          channel = null
          try {
            client?.disconnect?.()
          } catch {
            /* ignore */
          }
          client = null
        }, TEARDOWN_GRACE_MS)
      }
    }
  }

  return { subscribe }
}

let shared = null

/**
 * Process-wide singleton controller used by the React hooks. The Realtime
 * client itself is created lazily on first subscribe, so importing this
 * module never touches the network (SSR-safe).
 */
export function getLeaderboardRealtime() {
  if (!shared) shared = createLeaderboardRealtimeController({ createClient: defaultCreateClient })
  return shared
}

export default { getLeaderboardRealtime, createLeaderboardRealtimeController }