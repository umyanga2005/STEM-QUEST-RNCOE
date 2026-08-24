/**
 * Achievements — Supabase repository implementations (Task 5.8).
 *
 * Thin PostgREST adapters over `client` (a `@supabase/supabase-js`
 * service-role client, or an injectable fake in tests). Column names follow
 * the 0001 migration exactly — no new tables, no schema changes. The service
 * role bypasses RLS by design (D-027); the browser never talks to Supabase.
 *
 * Writes are read-then-insert so a duplicate award/issue is a no-op that
 * returns the existing row (idempotent under the 0001 unique constraints),
 * with a re-read fallback when a concurrent writer wins the race.
 */

function toMs(ts) {
  if (ts === null || ts === undefined) return null
  const v = ts instanceof Date ? ts.valueOf() : new Date(ts).valueOf()
  return Number.isFinite(v) ? v : null
}

function toIso(ms) {
  return ms === null || ms === undefined ? null : new Date(ms).toISOString()
}

function finiteId(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function rowToBadge(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    icon: row.icon ?? null,
    criteria: row.criteria ?? {},
    isActive: row.is_active === true,
  }
}

export function rowToStudentBadge(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    badgeId: row.badge_id,
    awardedAt: toMs(row.awarded_at),
    metadata: row.metadata ?? null,
  }
}

export function rowToCertificate(row) {
  return {
    id: row.id,
    certificateCode: row.certificate_code,
    studentId: row.student_id,
    streamId: row.stream_id,
    title: row.title,
    earnedAt: toMs(row.earned_at),
    documentPath: row.document_path ?? null,
    generatedAt: toMs(row.generated_at),
    revoked: row.revoked === true,
    revokedAt: toMs(row.revoked_at),
  }
}

export class SupabaseBadgeRepository {
  constructor({ client }) {
    this.client = client
  }

  async listActive() {
    const { data, error } = await this.client
      .from('badges')
      .select('id, slug, name, description, icon, criteria, is_active')
      .eq('is_active', true)
      .order('id', { ascending: true })
    if (error) throw new Error(`badges listActive failed: ${error.message}`)
    return (data ?? []).map(rowToBadge)
  }

  async findBySlug(slug) {
    const { data, error } = await this.client
      .from('badges')
      .select('id, slug, name, description, icon, criteria, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(`badges findBySlug failed: ${error.message}`)
    return data ? rowToBadge(data) : null
  }
}

export class SupabaseStudentBadgeRepository {
  constructor({ client }) {
    this.client = client
  }

  async findByStudentAndBadge(studentId, badgeId) {
    if (finiteId(studentId) === null || finiteId(badgeId) === null) return null
    const { data, error } = await this.client
      .from('student_badges')
      .select('id, student_id, badge_id, awarded_at, metadata')
      .eq('student_id', studentId)
      .eq('badge_id', badgeId)
      .maybeSingle()
    if (error) throw new Error(`student_badges findByStudentAndBadge failed: ${error.message}`)
    return data ? rowToStudentBadge(data) : null
  }

  async listByStudent(studentId) {
    if (finiteId(studentId) === null) return []
    const { data, error } = await this.client
      .from('student_badges')
      .select('id, student_id, badge_id, awarded_at, metadata')
      .eq('student_id', studentId)
      .order('awarded_at', { ascending: true })
    if (error) throw new Error(`student_badges listByStudent failed: ${error.message}`)
    return (data ?? []).map(rowToStudentBadge)
  }

  async award({ studentId, badgeId, awardedAt, metadata = null }) {
    const existing = await this.findByStudentAndBadge(studentId, badgeId)
    if (existing) return existing
    const { data, error } = await this.client
      .from('student_badges')
      .insert({
        student_id: Number(studentId),
        badge_id: Number(badgeId),
        awarded_at: toIso(awardedAt),
        metadata: metadata ?? null,
      })
      .select('id, student_id, badge_id, awarded_at, metadata')
      .maybeSingle()
    if (error) {
      // Race: a concurrent award won UNIQUE(student_id, badge_id) — no-op.
      const raced = await this.findByStudentAndBadge(studentId, badgeId)
      if (raced) return raced
      throw new Error(`student_badges award failed: ${error.message}`)
    }
    return data ? rowToStudentBadge(data) : null
  }
}

export class SupabaseCertificateRepository {
  constructor({ client }) {
    this.client = client
  }

  async findByStudentAndStream(studentId, streamId) {
    if (finiteId(studentId) === null || finiteId(streamId) === null) return null
    const { data, error } = await this.client
      .from('certificates')
      .select('id, certificate_code, student_id, stream_id, title, earned_at, document_path, generated_at, revoked, revoked_at')
      .eq('student_id', studentId)
      .eq('stream_id', streamId)
      .maybeSingle()
    if (error) throw new Error(`certificates findByStudentAndStream failed: ${error.message}`)
    return data ? rowToCertificate(data) : null
  }

  async listByStudent(studentId) {
    if (finiteId(studentId) === null) return []
    const { data, error } = await this.client
      .from('certificates')
      .select('id, certificate_code, student_id, stream_id, title, earned_at, document_path, generated_at, revoked, revoked_at')
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false })
    if (error) throw new Error(`certificates listByStudent failed: ${error.message}`)
    return (data ?? []).map(rowToCertificate)
  }

  async findByCode(certificateCode) {
    const { data, error } = await this.client
      .from('certificates')
      .select('id, certificate_code, student_id, stream_id, title, earned_at, document_path, generated_at, revoked, revoked_at')
      .eq('certificate_code', certificateCode)
      .maybeSingle()
    if (error) throw new Error(`certificates findByCode failed: ${error.message}`)
    return data ? rowToCertificate(data) : null
  }

  async findById(id) {
    if (finiteId(id) === null) return null
    const { data, error } = await this.client
      .from('certificates')
      .select('id, certificate_code, student_id, stream_id, title, earned_at, document_path, generated_at, revoked, revoked_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`certificates findById failed: ${error.message}`)
    return data ? rowToCertificate(data) : null
  }

  async issue({ studentId, streamId, title, certificateCode, earnedAt }) {
    const existing = await this.findByStudentAndStream(studentId, streamId)
    if (existing) return existing
    const { data, error } = await this.client
      .from('certificates')
      .insert({
        certificate_code: certificateCode,
        student_id: Number(studentId),
        stream_id: Number(streamId),
        title,
        earned_at: toIso(earnedAt),
      })
      .select('id, certificate_code, student_id, stream_id, title, earned_at, document_path, generated_at, revoked, revoked_at')
      .maybeSingle()
    if (error) {
      // Race: a concurrent issue won UNIQUE(student_id, stream_id) — no-op.
      const raced = await this.findByStudentAndStream(studentId, streamId)
      if (raced) return raced
      throw new Error(`certificates issue failed: ${error.message}`)
    }
    return data ? rowToCertificate(data) : null
  }
}

/** Builds the Supabase achievements repositories over one service-role client. */
export function createSupabaseAchievementsRepositories({ client }) {
  return {
    badgeRepository: new SupabaseBadgeRepository({ client }),
    studentBadgeRepository: new SupabaseStudentBadgeRepository({ client }),
    certificateRepository: new SupabaseCertificateRepository({ client }),
  }
}

export default {
  rowToBadge,
  rowToStudentBadge,
  rowToCertificate,
  createSupabaseAchievementsRepositories,
}