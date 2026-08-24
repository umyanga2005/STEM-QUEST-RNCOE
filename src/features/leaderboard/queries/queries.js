/**
 * Leaderboard — TanStack Query hooks + live subscription (Task 5.7).
 *
 * Leaderboard data is a public read surface (D-016): the queries run with or
 * without a session token and are keyed by token only so the self-highlight
 * stays correct. `useLiveLeaderboard` opens the ONE approved browser→Supabase
 * Realtime channel (D-080) and invalidates the leaderboard cache on any
 * leaderboard_entries change, so a new best score on any of the four boards
 * appears without a page reload.
 */

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { leaderboardApiClient } from '../client/client.js'
import { getLeaderboardRealtime } from '../realtime/realtime.js'

/**
 * All four stream boards. Public — enabled with or without a token; the token
 * only enables the server-side self-highlight.
 */
export function useLeaderboards(token) {
  return useQuery({
    queryKey: ['leaderboard', 'all', token ?? 'none'],
    queryFn: () => leaderboardApiClient.getAllLeaderboards(token),
    enabled: true,
    retry: 1,
    staleTime: 30 * 1000,
  })
}

/**
 * One stream board. Public — enabled whenever a stream id is chosen.
 */
export function useStreamLeaderboard(token, streamId) {
  return useQuery({
    queryKey: ['leaderboard', 'stream', streamId ?? 'none', token ?? 'none'],
    queryFn: () => leaderboardApiClient.getStreamLeaderboard(token, streamId),
    enabled: streamId != null,
    retry: 1,
    staleTime: 30 * 1000,
  })
}

export function liveStatusOf(status) {
  if (status === 'SUBSCRIBED') return 'live'
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') return 'reconnecting'
  if (status === 'UNAVAILABLE') return 'unavailable'
  return 'connecting'
}

/**
 * Subscribes to the public leaderboard_entries Realtime channel. Each
 * postgres_changes event invalidates the leaderboard cache so all open
 * boards refresh. Safe to mount from several components — the realtime
 * controller refcounts, so only ONE socket/channel is ever opened.
 * @param {{ enabled?: boolean }} [opts]
 * @returns {{ isLive: boolean, isReconnecting: boolean, status: string }}
 */
export function useLiveLeaderboard({ enabled = true } = {}) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    if (!enabled) return undefined
    let disposed = false
    const controller = getLeaderboardRealtime()
    const unsubscribe = controller.subscribe({
      onEvent: () => {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      },
      onStatus: (next) => {
        if (!disposed) setStatus(liveStatusOf(next))
      },
    })
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [enabled, queryClient])

  return {
    isLive: status === 'live',
    isReconnecting: status === 'reconnecting',
    status,
  }
}

export default { useLeaderboards, useStreamLeaderboard, useLiveLeaderboard }