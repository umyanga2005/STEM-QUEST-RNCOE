/**
 * Admin: Leaderboard overview queries
 *
 * `leaderboard_entries` and `streams` both carry an `anon`-role RLS policy
 * (D-080 — the leaderboard is the one table designed for direct browser
 * reads), so this hook uses the plain anon-key client, no admin token
 * required. Table/column names follow the 0001 migration.
 */

import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '../../../lib/supabase-client.js'

export function useAdminLeaderboardOverview() {
  return useQuery({
    queryKey: ['admin', 'leaderboards'],

    queryFn: async () => {
      const client = getSupabaseClient()
      const [{ data: streams, error: streamsError }, { data: entries, error: entriesError }] = await Promise.all([
        client.from('streams').select('id, slug, name, theme_color').order('display_order', { ascending: true }),
        client
          .from('leaderboard_entries')
          .select('id, student_id, stream_id, score, completion_time_ms, achieved_at, display_name')
          .order('score', { ascending: false }),
      ])
      if (streamsError) throw streamsError
      if (entriesError) throw entriesError

      const streamRows = streams ?? []
      const entryRows = entries ?? []
      const streamById = new Map(streamRows.map((s) => [s.id, s]))

      const topOverall = [...entryRows]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((e) => ({ ...e, streamName: streamById.get(e.stream_id)?.name ?? 'Unknown' }))

      const byStream = streamRows.map((stream) => {
        const streamEntries = entryRows.filter((e) => e.stream_id === stream.id)
        return {
          id: stream.id,
          name: stream.name,
          color: stream.theme_color || '#2dd4bf',
          entries: streamEntries.length,
          topScore: streamEntries.reduce((max, e) => Math.max(max, e.score), 0),
        }
      })

      return { topOverall, byStream, totalEntries: entryRows.length }
    },

    staleTime: 15_000,
    refetchInterval: 15_000, // polling instead of Realtime — no extra socket/connection budget
  })
}
