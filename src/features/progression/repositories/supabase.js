/**
 * Progression — Supabase repository implementations (Task 5.5).
 *
 * Thin PostgREST adapters over `client` (a `@supabase/supabase-js`
 * service-role client, or an injectable fake in tests). Column names follow
 * the 0001 migration exactly — no new tables, no schema changes. Rows are
 * mapped to the domain shapes in `contracts.js`. Writes are UPSERTs on the
 * table unique keys so completion recording is idempotent.
 */

function toMs(ts) {
  if (ts === null || ts === undefined) return null
  const v = ts instanceof Date ? ts.valueOf() : new Date(ts).valueOf()
  return Number.isFinite(v) ? v : null
}

function toIso(ms) {
  return ms === null || ms === undefined ? null : new Date(ms).toISOString()
}

/** Guards malformed ids before they reach PostgREST (bigint NaN guard). */
function finiteId(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function rowToLevelProgress(row) {
  return {
    studentId: row.student_id,
    streamId: row.stream_id,
    levelId: row.level_id,
    bestScore: row.best_score ?? 0,
    attempts: row.attempts ?? 0,
    isCompleted: row.is_completed === true,
    completedAt: toMs(row.completed_at),
    lastPlayedAt: toMs(row.last_played_at),
  }
}

export function rowToStreamProgress(row) {
  return {
    studentId: row.student_id,
    streamId: row.stream_id,
    currentLevel: row.current_level,
    completedLevels: row.completed_levels,
    streamCompleted: row.stream_completed === true,
    updatedAt: toMs(row.updated_at),
  }
}

export class SupabaseProgressionRepository {
  constructor({ client }) {
    this.client = client
  }

  LP = () => this.client.from('student_level_progress')
  SP = () => this.client.from('student_progress')

  async getLevelProgress({ studentId, levelId }) {
    if (finiteId(studentId) === null || finiteId(levelId) === null) return null
    const { data, error } = await this.LP()
      .select('student_id, stream_id, level_id, best_score, attempts, is_completed, completed_at, last_played_at')
      .eq('student_id', studentId)
      .eq('level_id', levelId)
      .maybeSingle()
    if (error) throw new Error(`getLevelProgress failed: ${error.message}`)
    return data ? rowToLevelProgress(data) : null
  }

  async listLevelProgress({ studentId, streamId }) {
    if (finiteId(studentId) === null || finiteId(streamId) === null) return []
    const { data, error } = await this.LP()
      .select('student_id, stream_id, level_id, best_score, attempts, is_completed, completed_at, last_played_at')
      .eq('student_id', studentId)
      .eq('stream_id', streamId)
    if (error) throw new Error(`listLevelProgress failed: ${error.message}`)
    return (data ?? []).map(rowToLevelProgress)
  }

  async getStreamProgress({ studentId, streamId }) {
    if (finiteId(studentId) === null || finiteId(streamId) === null) return null
    const { data, error } = await this.SP()
      .select('student_id, stream_id, current_level, completed_levels, stream_completed, updated_at')
      .eq('student_id', studentId)
      .eq('stream_id', streamId)
      .maybeSingle()
    if (error) throw new Error(`getStreamProgress failed: ${error.message}`)
    return data ? rowToStreamProgress(data) : null
  }

  async upsertLevelProgress(row) {
    const { data, error } = await this.LP()
      .upsert(
        {
          student_id: row.studentId,
          stream_id: row.streamId,
          level_id: row.levelId,
          best_score: row.bestScore,
          attempts: row.attempts,
          is_completed: row.isCompleted,
          completed_at: toIso(row.completedAt),
          last_played_at: toIso(row.lastPlayedAt),
        },
        { onConflict: 'student_id,level_id' }
      )
      .select()
      .maybeSingle()
    if (error) throw new Error(`upsertLevelProgress failed: ${error.message}`)
    return data ? rowToLevelProgress(data) : null
  }

  async upsertStreamProgress(row) {
    const { data, error } = await this.SP()
      .upsert(
        {
          student_id: row.studentId,
          stream_id: row.streamId,
          current_level: row.currentLevel,
          completed_levels: row.completedLevels,
          stream_completed: row.streamCompleted,
          updated_at: toIso(row.updatedAt),
        },
        { onConflict: 'student_id,stream_id' }
      )
      .select()
      .maybeSingle()
    if (error) throw new Error(`upsertStreamProgress failed: ${error.message}`)
    return data ? rowToStreamProgress(data) : null
  }
}

export function createProgressionRepositories({ client }) {
  return {
    progressionRepository: new SupabaseProgressionRepository({ client }),
  }
}

export default {
  rowToLevelProgress,
  rowToStreamProgress,
  SupabaseProgressionRepository,
  createProgressionRepositories,
}