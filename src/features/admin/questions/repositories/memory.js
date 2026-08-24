/**
 * Admin Question Builder — in-memory repositories (Task 5.10).
 *
 * Plain-object stores + repository implementations for unit/integration tests
 * and any demo wiring. Matches the contracts in `contracts.js`. Deterministic
 * and DB-free: `npm test` stays green without a live project while still
 * validating DTO mapping, filters, embedded catalogue projection, inserts,
 * updates, deletes, and the taxonomy round-trip.
 */

import { collectMediaRefs } from '../security/media.js'

const EMBED_LOOKUPS = {
  streams: (db, row) => db.streams.find((s) => s.id === row.stream_id) ?? null,
  levels: (db, row) => db.levels.find((l) => l.id === row.level_id) ?? null,
  activity_types: (db, row) => db.activityTypes.find((a) => a.id === row.activity_type_id) ?? null,
}

/** Projects one row with the embedded catalogue fields used by the DTO. */
function projectRow(row, db) {
  if (!row) return null
  const out = { ...row }
  for (const [resource, lookup] of Object.entries(EMBED_LOOKUPS)) {
    const found = lookup(db, row)
    out[resource] = found
      ? Object.fromEntries(Object.entries(found).filter(([k]) => k !== 'id'))
      : null
  }
  return out
}

export function createQuestionMemoryStore() {
  return { questions: [], nextId: 1, streams: [], levels: [], activityTypes: [], media: {}, adminActions: [] }
}

/** Seeds catalogue rows + optional question rows (tests + demo). */
export function seedQuestionStore(
  store,
  { streams = [], levels = [], activityTypes = [], questions = [] } = {}
) {
  store.streams.push(...streams)
  store.levels.push(...levels)
  store.activityTypes.push(...activityTypes)
  store.questions.push(...questions)
  if (questions.length) {
    store.nextId = Math.max(store.nextId, ...questions.map((q) => q.id ?? 0)) + 1
  }
  return store
}

function matchesFilters(row, f) {
  if (f.streamId != null && row.stream_id !== f.streamId) return false
  if (f.levelId != null && row.level_id !== f.levelId) return false
  if (f.activityTypeId != null && row.activity_type_id !== f.activityTypeId) return false
  if (f.status != null && row.status !== f.status) return false
  if (f.query) {
    const needle = String(f.query).toLowerCase()
    if (!String(row.prompt ?? '').toLowerCase().includes(needle)) return false
  }
  return true
}

export class MemoryQuestionRepository {
  constructor(store) {
    this.store = store
  }

  async list(filters = {}) {
    const rows = this.store.questions
      .filter((r) => matchesFilters(r, filters))
      .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
      .slice(0, filters.limit ?? 200)
    return rows.map((r) => projectRow(r, this.store))
  }

  async findById(id) {
    const row = this.store.questions.find((r) => Number(r.id) === Number(id))
    return row ? projectRow(row, this.store) : null
  }

  async insert(row) {
    const copy = { ...row, id: row.id ?? this.store.nextId++ }
    if (copy.id >= this.store.nextId) this.store.nextId = copy.id + 1
    this.store.questions.push(copy)
    return projectRow(copy, this.store)
  }

  async update(id, patch) {
    const row = this.store.questions.find((r) => Number(r.id) === Number(id))
    if (!row) return null
    Object.assign(row, patch, { id: row.id })
    return projectRow(row, this.store)
  }

  async delete(id) {
    const before = this.store.questions.length
    this.store.questions = this.store.questions.filter((r) => Number(r.id) !== Number(id))
    return this.store.questions.length < before
  }

  async isMediaRefInUse(ref) {
    return this.store.questions.some((row) => collectMediaRefs(row.payload).includes(ref))
  }
}

export class MemoryQuestionCatalogueRepository {
  constructor(store) {
    this.store = store
  }

  async findStreamBySlug(slug) {
    const row = this.store.streams.find((s) => s.slug === slug)
    return row ? { id: row.id, slug: row.slug } : null
  }

  async findLevelByNumber(streamId, number) {
    const row = this.store.levels.find((l) => l.stream_id === streamId && l.number === number)
    return row ? { id: row.id, number: row.number } : null
  }

  async findActivityTypeBySlug(slug) {
    const row = this.store.activityTypes.find((a) => a.slug === slug)
    return row ? { id: row.id, slug: row.slug } : null
  }

  async listStreams() {
    return this.store.streams.map((s) => ({ id: s.id, slug: s.slug, name: s.name }))
  }

  async listActivityTypes() {
    return this.store.activityTypes.map((a) => ({ id: a.id, slug: a.slug, name: a.name }))
  }
}

export class MemoryQuestionMediaRepository {
  constructor(store) {
    this.store = store
  }

  async upload({ path, buffer, mimeType }) {
    this.store.media[path] = { buffer, mimeType }
    return path
  }

  async signedUrl(path) {
    return this.store.media[path] ? `memory://question-media/${path}` : null
  }

  async remove(path) {
    if (!(path in this.store.media)) return false
    delete this.store.media[path]
    return true
  }
}

/**
 * Task 5.13 — in-memory `admin_actions` audit trail. Records one row per
 * question lifecycle transition; the service passes version/note context in
 * `details`.
 */
export class MemoryAdminActionRepository {
  constructor(store) {
    this.store = store
    this.nextId = 1
  }

  async insert(action) {
    const copy = {
      id: this.nextId++,
      admin_id: action.admin_id,
      action: action.action,
      target_type: action.target_type,
      target_id: action.target_id,
      details: action.details ?? null,
      created_at: action.created_at ?? new Date().toISOString(),
    }
    this.store.adminActions.push(copy)
    return copy
  }

  async listByTarget(targetType, targetId) {
    return this.store.adminActions
      .filter((a) => a.target_type === targetType && a.target_id === String(targetId))
      .sort((a, b) => b.id - a.id)
  }
}

/** Builds the in-memory question repositories over one store. */
export function createQuestionMemoryRepositories(store = createQuestionMemoryStore()) {
  return {
    store,
    questionRepository: new MemoryQuestionRepository(store),
    catalogueRepository: new MemoryQuestionCatalogueRepository(store),
    mediaRepository: new MemoryQuestionMediaRepository(store),
    adminActionRepository: new MemoryAdminActionRepository(store),
  }
}

export default {
  createQuestionMemoryStore,
  createQuestionMemoryRepositories,
  seedQuestionStore,
}