/**
 * Admin: Progress overview queries
 *
 * Reads `streams` (public anon-readable catalogue) and `game_sessions`
 * (admin-gated by `is_admin()` RLS) to build per-stream mission counts and a
 * score-distribution histogram for AdminProgressPage. Table/column names
 * follow the 0001 migration.
 */

import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase-client.js'

export const SCORE_BUCKETS = [
  { key: '0-50', label: '0–50', min: 0, max: 50 },
  { key: '51-100', label: '51–100', min: 51, max: 100 },
  { key: '101-150', label: '101–150', min: 101, max: 150 },
  { key: '151-200', label: '151–200', min: 151, max: 200 },
  { key: '201-250', label: '201–250', min: 201, max: 250 },
  { key: '251-300', label: '251–300', min: 251, max: 300 },
]

export function useAdminProgressOverview() {
  return useQuery({
    queryKey: ['admin', 'progress'],

    queryFn: async () => {
      const [{ data: streams, error: streamsError }, { data: sessions, error: sessionsError }] = await Promise.all([
        getSupabaseClient()
          .from('streams')
          .select('id, slug, name, theme_color')
          .order('display_order', { ascending: true }),
        getAdminSupabaseClient()
          .from('game_sessions')
          .select('id, student_id, stream_id, status, total_score, result'),
      ])
      if (streamsError) throw streamsError
      if (sessionsError) throw sessionsError

      const streamRows = streams ?? []
      const sessionRows = sessions ?? []

      const byStream = streamRows.map((stream) => {
        const streamSessions = sessionRows.filter((s) => s.stream_id === stream.id)
        const completed = streamSessions.filter((s) => s.status === 'completed')
        const passed = completed.filter((s) => s.result === 'passed')
        const avgScore = completed.length
          ? Math.round(completed.reduce((sum, s) => sum + (s.total_score ?? 0), 0) / completed.length)
          : 0
        return {
          id: stream.id,
          slug: stream.slug,
          name: stream.name,
          color: stream.theme_color || '#2dd4bf',
          missions: streamSessions.length,
          completed: completed.length,
          passRate: completed.length ? Math.round((passed.length / completed.length) * 100) : 0,
          avgScore,
          activeStudents: new Set(streamSessions.map((s) => s.student_id)).size,
        }
      })

      const completedSessions = sessionRows.filter((s) => s.status === 'completed')
      const distribution = SCORE_BUCKETS.map((bucket) => ({
        ...bucket,
        count: completedSessions.filter(
          (s) => (s.total_score ?? 0) >= bucket.min && (s.total_score ?? 0) <= bucket.max
        ).length,
      }))
      const maxBucketCount = Math.max(1, ...distribution.map((b) => b.count))

      return {
        streams: byStream,
        distribution: distribution.map((b) => ({ ...b, pct: Math.round((b.count / maxBucketCount) * 100) })),
        totals: {
          missions: sessionRows.length,
          completed: completedSessions.length,
          activeStudents: new Set(sessionRows.map((s) => s.student_id)).size,
        },
      }
    },

    staleTime: 30_000,
    refetchInterval: 20_000, // polling instead of Realtime — no extra socket/connection budget
  })
}
