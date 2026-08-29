/**
 * Student — Supabase repository implementations (Task 5.1).
 *
 * Thin PostgREST/Storage adapters over `client` (a `@supabase/supabase-js`
 * service-role client, or an injectable fake in tests). Column names follow
 * the 0001 migration exactly — no new tables, no schema changes. The service
 * role bypasses RLS by design (D-027); the browser never talks to Supabase.
 */

const AVATAR_BUCKET = 'student-avatars'
const AVATAR_URL_TTL_SECONDS = 3600

function toIso(ms) {
  return ms === null || ms === undefined ? null : new Date(ms).toISOString()
}

function toMs(ts) {
  if (ts === null || ts === undefined) return null
  const v = ts instanceof Date ? ts.valueOf() : new Date(ts).valueOf()
  return Number.isFinite(v) ? v : null
}

export function rowToStudent(row) {
  return {
    id: row.id,
    initials: row.initials,
    fullName: row.full_name,
    schoolId: row.school_id,
    grade: row.grade,
    loginCode: row.login_code,
    profilePhotoPath: row.profile_photo_path ?? null,
    status: row.status,
    isArchived: row.is_archived === true,
  }
}

export class SupabaseSchoolRepository {
  constructor({ client }) {
    this.client = client
  }

  async findByName(name) {
    const { data, error } = await this.client
      .from('schools')
      .select('id, name, city, is_active')
      .ilike('name', name.trim())
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`school findByName failed: ${error.message}`)
    return data
      ? { id: data.id, name: data.name, city: data.city ?? null, isActive: data.is_active === true }
      : null
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('schools')
      .select('id, name, city, is_active')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`school findById failed: ${error.message}`)
    return data
      ? { id: data.id, name: data.name, city: data.city ?? null, isActive: data.is_active === true }
      : null
  }

  async create({ name }) {
    const { data, error } = await this.client
      .from('schools')
      .insert({ name: name.trim() })
      .select('id, name, city, is_active')
      .single()
    if (error) throw new Error(`school create failed: ${error.message}`)
    return { id: data.id, name: data.name, city: data.city ?? null, isActive: data.is_active === true }
  }
}

export class SupabaseStudentRepository {
  constructor({ client }) {
    this.client = client
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`student findById failed: ${error.message}`)
    return data ? rowToStudent(data) : null
  }

  async findByLoginCode(loginCode) {
    const clean = loginCode.trim()
    const { data, error } = await this.client
      .from('students')
      .select('*')
      .ilike('login_code', clean)
      .maybeSingle()
    if (error) throw new Error(`student findByLoginCode failed: ${error.message}`)
    return data ? rowToStudent(data) : null
  }

  async create(row) {
    const { data, error } = await this.client
      .from('students')
      .insert({
        initials: row.initials,
        full_name: row.fullName,
        school_id: row.schoolId,
        grade: row.grade,
        login_code: row.loginCode,
      })
      .select('*')
      .single()
    if (error) throw new Error(`student create failed: ${error.message}`)
    return rowToStudent(data)
  }

  async setProfilePhotoPath(id, profilePhotoPath) {
    const { data, error } = await this.client
      .from('students')
      .update({ profile_photo_path: profilePhotoPath })
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`student setProfilePhotoPath failed: ${error.message}`)
    return data ? rowToStudent(data) : null
  }

  async updateProfile(id, patch) {
    const { data, error } = await this.client
      .from('students')
      .update({
        initials: patch.initials,
        full_name: patch.fullName,
        school_id: patch.schoolId,
        grade: patch.grade,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw new Error(`student updateProfile failed: ${error.message}`)
    return data ? rowToStudent(data) : null
  }
}

export class SupabaseStudentSessionRepository {
  constructor({ client }) {
    this.client = client
  }

  async create(row) {
    const { data, error } = await this.client
      .from('student_sessions')
      .insert({
        student_id: row.studentId,
        token_hash: row.tokenHash,
        ip_address: row.ipAddress ?? null,
        user_agent: row.userAgent ?? null,
        expires_at: toIso(row.expiresAt),
      })
      .select('*')
      .single()
    if (error) throw new Error(`session create failed: ${error.message}`)
    return this.#toDomain(data)
  }

  async findByTokenHash(tokenHash) {
    const { data, error } = await this.client
      .from('student_sessions')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle()
    if (error) throw new Error(`session findByTokenHash failed: ${error.message}`)
    return data ? this.#toDomain(data) : null
  }

  #toDomain(row) {
    return {
      id: row.id,
      studentId: row.student_id,
      tokenHash: row.token_hash,
      ipAddress: row.ip_address ?? null,
      userAgent: row.user_agent ?? null,
      expiresAt: toMs(row.expires_at),
      revokedAt: toMs(row.revoked_at),
    }
  }
}

export class SupabaseStudentAvatarRepository {
  constructor({ client }) {
    this.client = client
  }

  async upload({ studentId, buffer, mimeType }) {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
    const path = `${studentId}/profile.${ext}`
    const { error } = await this.client.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: true })
    if (error) throw new Error(`avatar upload failed: ${error.message}`)
    return path
  }

  async signedUrl(path) {
    const { data, error } = await this.client.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, AVATAR_URL_TTL_SECONDS)
    if (error) return null
    return data?.signedUrl ?? null
  }
}

/** Reads the session TTL from game_settings (`auth.session_ttl_seconds`). */
export class SupabaseStudentSettingsRepository {
  constructor({ client }) {
    this.client = client
  }

  async getSessionTtlSeconds() {
    const { data, error } = await this.client
      .from('game_settings')
      .select('value')
      .eq('key', 'auth.session_ttl_seconds')
      .maybeSingle()
    if (error) throw new Error(`settings getSessionTtlSeconds failed: ${error.message}`)
    const raw = data?.value
    const n = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 3600
  }
}

/** Builds all Supabase student repositories over one service-role client. */
export function createSupabaseStudentRepositories({ client }) {
  return {
    schoolRepository: new SupabaseSchoolRepository({ client }),
    studentRepository: new SupabaseStudentRepository({ client }),
    sessionRepository: new SupabaseStudentSessionRepository({ client }),
    avatarRepository: new SupabaseStudentAvatarRepository({ client }),
    settingsRepository: new SupabaseStudentSettingsRepository({ client }),
  }
}

export default {
  rowToStudent,
  createSupabaseStudentRepositories,
}