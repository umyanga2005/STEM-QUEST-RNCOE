/**
 * Leaderboard — Supabase repository implementations (Task 5.7).
 *
 * Thin PostgREST adapters over `client` (a `@supabase/supabase-js`
 * service-role client, or an injectable fake in tests). Column names follow
 * the 0001 migration exactly — no new tables, no schema changes. The service
 * role bypasses RLS by design (D-027); the browser never talks to Supabase
 * except the single approved Realtime channel (D-080).
 *
 * Reads/writes are plain and lean: one covered read for the Top 10
 * (`leaderboard_top10_idx`), one point read for the existing best, and a
 * single upsert keyed on (student_id, stream_id) — no joins, no subqueries,
 * so the Free Tier sees one small query per interaction.
 */

function toMs(ts) {
  if (ts === null || ts === undefined) return null
  const v = ts instanceof Date ? ts.valueOf() : new Date(ts).valueOf()
  return Number.isFinite(v) ? v : null
}

function toIso(ms) {
  return ms === null || ms === undefined ? null : new Date(ms).toISOString()
}

export function rowToLeaderboardEntry(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    streamId: row.stream_id,
    score: row.score,
    completionTimeMs: toMs(row.completion_time_ms),
    achievedAt: toMs(row.achieved_at),
    displayName: row.display_name,
    updatedAt: toMs(row.updated_at),
  }
}

export class SupabaseLeaderboardRepository {
  constructor({ client }) {
    this.client = client
  }

  async listTopForStream(streamId, { limit } = {}) {
    const { data, error } = await this.client
      .from('leaderboard_entries')
      .select('id, student_id, stream_id, score, completion_time_ms, achieved_at, display_name, updated_at')
      .eq('stream_id', streamId)
      .order('score', { ascending: false })
      .order('completion_time_ms', { ascending: true })
      .order('achieved_at', { ascending: true })
      .limit(limit ?? 10)
    if (error) throw new Error(`leaderboard listTopForStream failed: ${error.message}`)
    return (data ?? []).map(rowToLeaderboardEntry)
  }

  async findByStudentAndStream(studentId, streamId) {
    const { data, error } = await this.client
      .from('leaderboard_entries')
      .select('id, student_id, stream_id, score, completion_time_ms, achieved_at, display_name, updated_at')
      .eq('student_id', studentId)
      .eq('stream_id', streamId)
      .maybeSingle()
    if (error) throw new Error(`leaderboard findByStudentAndStream failed: ${error.message}`)
    return data ? rowToLeaderboardEntry(data) : null
  }

  async upsert(row) {
    const { data, error } = await this.client
      .from('leaderboard_entries')
      .upsert(
        {
          student_id: Number(row.studentId),
          stream_id: Number(row.streamId),
          score: Number(row.score),
          completion_time_ms: toMs(row.completionTimeMs),
          achieved_at: toIso(row.achievedAt),
          display_name: String(row.displayName),
        },
        { onConflict: 'student_id,stream_id' }
      )
      .select('id, student_id, stream_id, score, completion_time_ms, achieved_at, display_name, updated_at')
      .single()
    if (error) throw new Error(`leaderboard upsert failed: ${error.message}`)
    return rowToLeaderboardEntry(data)
  }
}

/** Builds the Supabase leaderboard repository over one service-role client. */
export function createSupabaseLeaderboardRepositories({ client }) {
  return {
    leaderboardRepository: new SupabaseLeaderboardRepository({ client }),
  }
}

export default {
  rowToLeaderboardEntry,
  createSupabaseLeaderboardRepositories,
}