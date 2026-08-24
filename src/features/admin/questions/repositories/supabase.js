/**
 * Admin Question Builder — Supabase repository implementations (Task 5.10).
 *
 * Thin PostgREST adapters over `client` (a `@supabase/supabase-js` service-role
 * client, or an injectable fake in tests). Column names follow the 0001
 * migration + 0004 (`meta`) exactly. The service-role client bypasses RLS by
 * design (D-027/D-028) — the browser never talks to Supabase for question data,
 * and `correct_answer`/`meta` only travel through this authorized server layer.
 */

import { QUESTION_MEDIA_BUCKET, QUESTION_MEDIA_URL_TTL_SECONDS, collectMediaRefs } from '../security/media.js'

const QUESTION_SELECT = '*, streams(slug), levels(number), activity_types(slug)'

export class SupabaseQuestionRepository {
  constructor({ client }) {
    this.client = client
  }

  async list({ streamId = null, levelId = null, activityTypeId = null, status = null, query = null, limit = 200 } = {}) {
    let q = this.client.from('questions').select(QUESTION_SELECT)
    if (streamId != null) q = q.eq('stream_id', streamId)
    if (levelId != null) q = q.eq('level_id', levelId)
    if (activityTypeId != null) q = q.eq('activity_type_id', activityTypeId)
    if (status != null) q = q.eq('status', status)
    if (query) q = q.ilike('prompt', `%${query}%`)
    q = q.order('updated_at', { ascending: false }).limit(limit)
    const { data, error } = await q
    if (error) throw new Error(`questions list failed: ${error.message}`)
    return data ?? []
  }

  async findById(id) {
    if (!Number.isFinite(Number(id))) return null
    const { data, error } = await this.client
      .from('questions')
      .select(QUESTION_SELECT)
      .eq('id', Number(id))
      .maybeSingle()
    if (error) throw new Error(`questions findById failed: ${error.message}`)
    return data ?? null
  }

  async insert(row) {
    const { data, error } = await this.client
      .from('questions')
      .insert(row)
      .select(QUESTION_SELECT)
      .single()
    if (error) throw new Error(`questions insert failed: ${error.message}`)
    return data ?? null
  }

  async update(id, patch) {
    if (!Number.isFinite(Number(id))) return null
    const { data, error } = await this.client
      .from('questions')
      .update(patch)
      .eq('id', Number(id))
      .select(QUESTION_SELECT)
      .single()
    if (error) throw new Error(`questions update failed: ${error.message}`)
    return data ?? null
  }

  async delete(id) {
    if (!Number.isFinite(Number(id))) return null
    const { data, error } = await this.client.from('questions').delete().eq('id', Number(id)).select('id')
    if (error) throw new Error(`questions delete failed: ${error.message}`)
    return Array.isArray(data) && data.length > 0
  }

  async isMediaRefInUse(ref) {
    const { data, error } = await this.client.from('questions').select('payload')
    if (error) throw new Error(`questions media-ref scan failed: ${error.message}`)
    return (data ?? []).some((row) => collectMediaRefs(row.payload).includes(ref))
  }
}

export class SupabaseQuestionMediaRepository {
  constructor({ client }) {
    this.client = client
  }

  async upload({ path, buffer, mimeType }) {
    const { error } = await this.client.storage
      .from(QUESTION_MEDIA_BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: true })
    if (error) throw new Error(`question media upload failed: ${error.message}`)
    return path
  }

  async signedUrl(path) {
    const { data, error } = await this.client.storage
      .from(QUESTION_MEDIA_BUCKET)
      .createSignedUrl(path, QUESTION_MEDIA_URL_TTL_SECONDS)
    if (error) return null
    return data?.signedUrl ?? null
  }

  async remove(path) {
    const { data, error } = await this.client.storage.from(QUESTION_MEDIA_BUCKET).remove([path])
    if (error) throw new Error(`question media remove failed: ${error.message}`)
    return Array.isArray(data) && data.length > 0
  }
}

export class SupabaseQuestionCatalogueRepository {
  constructor({ client }) {
    this.client = client
  }

  async findStreamBySlug(slug) {
    const { data, error } = await this.client
      .from('streams')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(`streams findStreamBySlug failed: ${error.message}`)
    return data ?? null
  }

  async findLevelByNumber(streamId, number) {
    const { data, error } = await this.client
      .from('levels')
      .select('id, number')
      .eq('stream_id', streamId)
      .eq('number', number)
      .maybeSingle()
    if (error) throw new Error(`levels findLevelByNumber failed: ${error.message}`)
    return data ?? null
  }

  async findActivityTypeBySlug(slug) {
    const { data, error } = await this.client
      .from('activity_types')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(`activity_types findActivityTypeBySlug failed: ${error.message}`)
    return data ?? null
  }

  async listStreams() {
    const { data, error } = await this.client
      .from('streams')
      .select('id, slug, name')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    if (error) throw new Error(`streams listStreams failed: ${error.message}`)
    return (data ?? []).map((s) => ({ id: s.id, slug: s.slug, name: s.name }))
  }

  async listActivityTypes() {
    const { data, error } = await this.client
      .from('activity_types')
      .select('id, slug, name')
      .eq('is_active', true)
      .order('id', { ascending: true })
    if (error) throw new Error(`activity_types listActivityTypes failed: ${error.message}`)
    return (data ?? []).map((a) => ({ id: a.id, slug: a.slug, name: a.name }))
  }
}

/**
 * Task 5.13 — `admin_actions` audit trail. Written server-side through the
 * service role for every question lifecycle transition (0001 table, RLS
 * enabled). Rows are append-only; `details` holds version/note context.
 */
export class SupabaseAdminActionRepository {
  constructor({ client }) {
    this.client = client
  }

  async insert(action) {
    const { data, error } = await this.client
      .from('admin_actions')
      .insert(action)
      .select('id, admin_id, action, target_type, target_id, details, created_at')
      .single()
    if (error) throw new Error(`admin_actions insert failed: ${error.message}`)
    return data ?? null
  }

  async listByTarget(targetType, targetId) {
    const { data, error } = await this.client
      .from('admin_actions')
      .select('id, admin_id, action, target_type, target_id, details, created_at')
      .eq('target_type', targetType)
      .eq('target_id', String(targetId))
      .order('id', { ascending: false })
    if (error) throw new Error(`admin_actions listByTarget failed: ${error.message}`)
    return data ?? []
  }
}

/** Builds the Supabase question repositories over one service-role client. */
export function createSupabaseQuestionRepositories({ client }) {
  return {
    questionRepository: new SupabaseQuestionRepository({ client }),
    catalogueRepository: new SupabaseQuestionCatalogueRepository({ client }),
    mediaRepository: new SupabaseQuestionMediaRepository({ client }),
    adminActionRepository: new SupabaseAdminActionRepository({ client }),
  }
}

export default {
  createSupabaseQuestionRepositories,
}