/**
 * Mission — Supabase repository implementations (Task 5.2).
 *
 * Thin PostgREST adapters over `client` (a `@supabase/supabase-js`
 * service-role client, or an injectable fake in tests). Column names follow
 * the 0001 migration exactly — no new tables, no schema changes. The service
 * role bypasses RLS by design (D-027); the browser never talks to Supabase.
 * These repositories only READ public catalogue + student progress data.
 */

function toMs(ts) {
  if (ts === null || ts === undefined) return null
  const v = ts instanceof Date ? ts.valueOf() : new Date(ts).valueOf()
  return Number.isFinite(v) ? v : null
}

function toIso(ms) {
  return ms === null || ms === undefined ? null : new Date(ms).toISOString()
}

export function rowToStream(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    themeColor: row.theme_color ?? null,
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active === true,
  }
}

export function rowToLevel(row) {
  return {
    id: row.id,
    streamId: row.stream_id,
    number: row.number,
    name: row.name,
    isActive: row.is_active === true,
  }
}

export class SupabaseMissionStreamRepository {
  constructor({ client }) {
    this.client = client
  }

  async listActive() {
    const { data, error } = await this.client
      .from('streams')
      .select('id, slug, name, description, theme_color, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    if (error) throw new Error(`stream listActive failed: ${error.message}`)
    return (data ?? []).map(rowToStream)
  }

  async findById(id) {
    if (!Number.isFinite(Number(id))) return null
    const { data, error } = await this.client
      .from('streams')
      .select('id, slug, name, description, theme_color, display_order, is_active')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`stream findById failed: ${error.message}`)
    return data ? rowToStream(data) : null
  }
}

export class SupabaseMissionLevelRepository {
  constructor({ client }) {
    this.client = client
  }

  async listForStream(streamId) {
    const { data, error } = await this.client
      .from('levels')
      .select('id, stream_id, number, name, is_active')
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .order('number', { ascending: true })
    if (error) throw new Error(`level listForStream failed: ${error.message}`)
    return (data ?? []).map(rowToLevel)
  }
}

export class SupabaseMissionProgressRepository {
  constructor({ client }) {
    this.client = client
  }

  async getStudentProgress(studentId) {
    const [streams, levels] = await Promise.all([
      this.client
        .from('student_progress')
        .select('student_id, stream_id, current_level, completed_levels, stream_completed')
        .eq('student_id', studentId),
      this.client
        .from('student_level_progress')
        .select('student_id, stream_id, level_id, best_score, attempts, is_completed, last_played_at')
        .eq('student_id', studentId),
    ])
    if (streams.error) throw new Error(`student_progress failed: ${streams.error.message}`)
    if (levels.error) throw new Error(`student_level_progress failed: ${levels.error.message}`)
    return {
      streamProgress: (streams.data ?? []).map((r) => ({
        studentId: r.student_id,
        streamId: r.stream_id,
        currentLevel: r.current_level,
        completedLevels: r.completed_levels,
        streamCompleted: r.stream_completed === true,
      })),
      levelProgress: (levels.data ?? []).map((r) => ({
        studentId: r.student_id,
        streamId: r.stream_id,
        levelId: r.level_id,
        bestScore: r.best_score ?? 0,
        attempts: r.attempts ?? 0,
        isCompleted: r.is_completed === true,
        lastPlayedAt: toMs(r.last_played_at),
      })),
    }
  }
}

export class SupabaseMissionSpecialAccessRepository {
  constructor({ client }) {
    this.client = client
  }

  async getActiveGrants(studentId) {
    const { data, error } = await this.client
      .from('special_access')
      .select('id, student_id, stream_id, level_id, is_active, expires_at')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${toIso(Date.now())}`)
    if (error) throw new Error(`special_access getActiveGrants failed: ${error.message}`)
    return (data ?? []).map((g) => ({
      id: g.id,
      studentId: g.student_id,
      streamId: g.stream_id ?? null,
      levelId: g.level_id ?? null,
      isActive: g.is_active === true,
      expiresAt: toMs(g.expires_at),
    }))
  }
}

/** Builds all Supabase mission repositories over one service-role client. */
export function createSupabaseMissionRepositories({ client }) {
  return {
    streamRepository: new SupabaseMissionStreamRepository({ client }),
    levelRepository: new SupabaseMissionLevelRepository({ client }),
    progressRepository: new SupabaseMissionProgressRepository({ client }),
    specialAccessRepository: new SupabaseMissionSpecialAccessRepository({ client }),
  }
}

export default {
  rowToStream,
  rowToLevel,
  createSupabaseMissionRepositories,
}