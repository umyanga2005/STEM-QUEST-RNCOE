/**
 * Admin Question Builder — service (Task 5.10, review/release lifecycle 5.13).
 *
 * The authoring boundary between the API and the `questions` table. Never
 * trusts the client: stream/level/activityType slugs are resolved server-side
 * against the catalogue, `activitySchemaVersion` comes from the engine (never
 * the client), `version` is always managed by the service, and `formatVersion`
 * is an internal constant. Every write runs the full validator; an invalid
 * draft is rejected with field-level errors and NOT persisted.
 *
 * Lifecycle (D-044 + Task 5.13):
 *   - create       → always `status: 'draft'`, `version: 1`. A client may not
 *                    author a `published` question through this surface.
 *   - update       → draft rows only (published AND archived are read-only).
 *                    `version` is preserved; editing ALWAYS clears the review
 *                    state (content changed → any approval no longer applies).
 *                    Server-managed meta (sourceQuestionId/sourceVersion) is
 *                    preserved across edits.
 *   - submit       → draft → review (meta.review.state = 'pending') + audit.
 *                    Hard gates: explanation + feedback templates + taxonomy
 *                    (D-081). The draft must still pass every validation layer.
 *   - approve      → pending → approved, records reviewer + reviewedAt.
 *   - reject       → pending → rejected; a non-empty note is mandatory.
 *   - publish      → approved draft → published. The approval must match the
 *                    current version (stale-approval guard). A draft cloned
 *                    from a published row archives its source on publish.
 *   - archive      → published → archived (read-only thereafter).
 *   - versions     → published v1 → new draft v2 (clone-on-edit) linked via
 *                    meta.sourceQuestionId/sourceVersion; v1 is archived when
 *                    v2 is published. v1 is never overwritten.
 *
 * Audit: every lifecycle transition writes one `admin_actions` row (Task
 * 5.13) through the AdminActionRepository; version/note context travels in
 * `details`. Student distribution is untouched — student repositories filter
 * `status = 'published'` and a reviewed/approved draft is still a draft.
 *
 * `correctAnswer` is server-only: it is returned only for authenticated
 * admins through this API and never reaches any student surface (D-028).
 */

import { questionError } from '../errors.js'
import { rowToQuestionDto, questionDtoToRow } from '../repositories/row-mapper.js'
import { collectMediaRefs } from '../security/media.js'

const FORMAT_VERSION = 1
const ALLOWED_DTO_KEYS = new Set([
  'formatVersion', 'stream', 'level', 'activityType', 'activitySchemaVersion',
  'prompt', 'instructions', 'explanation',
  'payload', 'correctAnswer', 'hints',
  'topic', 'subtopic', 'tags',
  'gradeMin', 'gradeMax', 'difficulty',
  'basePoints', 'timerOverrideSeconds',
  'status', 'isFlagged', 'version', 'meta',
])

export class QuestionService {
  /**
   * @param {object} deps
   * @param {object} deps.questionRepository - QuestionRepository contract
   * @param {object} deps.catalogueRepository - CatalogueRepository contract
   * @param {object} deps.validator - from createQuestionValidator()
   * @param {object} [deps.adminActionRepository] - AdminActionRepository contract
   * @param {object} [deps.mediaRepository] - QuestionMediaRepository contract
   */
  constructor({ questionRepository, catalogueRepository, validator, adminActionRepository = null, mediaRepository = null }) {
    this.questionRepository = questionRepository
    this.catalogueRepository = catalogueRepository
    this.validator = validator
    this.adminActionRepository = adminActionRepository
    this.mediaRepository = mediaRepository
  }

  /** Rejects unknown/forged fields before anything else. */
  assertKnownFields(input) {
    const unknown = Object.keys(input ?? {}).filter((k) => !ALLOWED_DTO_KEYS.has(k))
    if (unknown.length > 0) {
      throw questionError.unexpectedField(unknown.join(', '))
    }
  }

  /** Resolves catalogue slugs to ids; throws CATALOG_UNKNOWN on a miss. */
  async resolveCatalogue({ stream, level, activityType }) {
    const streamRow = await this.catalogueRepository.findStreamBySlug(stream)
    if (!streamRow) throw questionError.catalogUnknown(`stream "${stream}"`)
    const levelRow = await this.catalogueRepository.findLevelByNumber(streamRow.id, level)
    if (!levelRow) throw questionError.catalogUnknown(`level ${level} of stream "${stream}"`)
    const typeRow = await this.catalogueRepository.findActivityTypeBySlug(activityType)
    if (!typeRow) throw questionError.catalogUnknown(`activityType "${activityType}"`)
    return { streamId: streamRow.id, levelId: levelRow.id, activityTypeId: typeRow.id }
  }

  /**
   * Normalizes a raw input object into a full authoring envelope for the
   * validator: defaults + server-derived fields, catalogue resolution.
   * `activitySchemaVersion` is ALWAYS the engine's version for the type.
   */
  async normalizeDraft(input) {
    this.assertKnownFields(input)
    const { streamId, levelId, activityTypeId } = await this.resolveCatalogue(input)

    const activitySchemaVersion = this.validator.engine.getSchemaVersion(input.activityType)
    const draft = {
      ...input,
      formatVersion: FORMAT_VERSION,
      activitySchemaVersion,
      gradeMin: input.gradeMin,
      gradeMax: input.gradeMax,
      difficulty: input.difficulty,
      basePoints: input.basePoints ?? 100,
      timerOverrideSeconds: input.timerOverrideSeconds,
      hints: input.hints,
      tags: input.tags ?? [],
      isFlagged: input.isFlagged ?? false,
      version: input.version ?? 1,
      meta: input.meta,
    }
    return { draft, ids: { streamId, levelId, activityTypeId } }
  }

  /** Runs the validator; returns the draft or throws VALIDATION with fields. */
  validateDraft(draft) {
    const result = this.validator.validate(draft)
    if (!result.valid) throw questionError.validation(result.errors)
    return draft
  }

  /**
   * Rebuilds a clean authoring envelope from a stored row (drops row-only
   * fields and null placeholders the envelope schema rejects) — used to
   * re-validate content across the review lifecycle.
   */
  #draftFromRow(row) {
    const dto = rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) })
    const draft = {
      formatVersion: FORMAT_VERSION,
      stream: dto.stream,
      level: dto.level,
      activityType: dto.activityType,
      activitySchemaVersion: dto.activitySchemaVersion,
      prompt: dto.prompt,
      payload: dto.payload,
      correctAnswer: dto.correctAnswer,
      gradeMin: dto.gradeMin,
      gradeMax: dto.gradeMax,
      difficulty: dto.difficulty,
      basePoints: dto.basePoints ?? 100,
      topic: dto.topic ?? '',
      subtopic: dto.subtopic ?? '',
      explanation: dto.explanation ?? '',
      status: dto.status,
      isFlagged: dto.isFlagged,
      version: dto.version,
      tags: dto.tags ?? [],
    }
    if (dto.instructions != null) draft.instructions = dto.instructions
    if (dto.hints != null) draft.hints = dto.hints
    if (dto.timerOverrideSeconds != null) draft.timerOverrideSeconds = dto.timerOverrideSeconds
    if (dto.meta != null) draft.meta = dto.meta
    return draft
  }

  /**
   * Server-managed meta: strips any client-forged `review` and stamps the
   * author identity for a fresh row. Used by create + version clones.
   */
  #withAuthoring(meta, admin) {
    const base = meta && typeof meta === 'object' && !Array.isArray(meta) ? { ...meta } : {}
    delete base.review
    if (admin) base.authoring = { ...(base.authoring ?? {}), createdByAdminId: admin.id }
    return Object.keys(base).length > 0 ? base : undefined
  }

  /**
   * Edit-time meta merge: client authoring edits win, but server-managed
   * chain/lifecycle fields survive and any review state is cleared (an edit
   * invalidates prior approval/rejection).
   */
  #mergeMetaForUpdate(existingMeta, clientMeta) {
    const existing = existingMeta && typeof existingMeta === 'object' && !Array.isArray(existingMeta) ? { ...existingMeta } : {}
    const client = clientMeta && typeof clientMeta === 'object' && !Array.isArray(clientMeta) ? { ...clientMeta } : {}
    const merged = { ...existing, ...client }
    delete merged.review
    return Object.keys(merged).length > 0 ? merged : undefined
  }

  /** Records one admin_actions audit row (append-only lifecycle trail). */
  async #recordAction({ admin, action, questionId, details = null }) {
    if (!admin || !this.adminActionRepository) return null
    return this.adminActionRepository.insert({
      admin_id: admin.id,
      action,
      target_type: 'question',
      target_id: String(questionId),
      details,
      created_at: new Date().toISOString(),
    })
  }

  /**
   * Submission/release gates (D-081 + Task 5.13): a question cannot move into
   * (or out of) review without authoring completeness. Returns field errors.
   */
  #reviewGates(draft) {
    const errors = []
    if (typeof draft.explanation !== 'string' || draft.explanation.trim().length === 0) {
      errors.push({ path: '/explanation', message: 'A question under review needs an explanation for students.' })
    }
    const feedback = draft.meta?.feedback
    if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback) || Object.keys(feedback).length === 0) {
      errors.push({ path: '/meta/feedback', message: 'At least one feedback template is required before review.' })
    }
    if (typeof draft.topic !== 'string' || draft.topic.trim().length === 0) {
      errors.push({ path: '/topic', message: 'A question under review needs a topic (taxonomy).' })
    }
    if (typeof draft.subtopic !== 'string' || draft.subtopic.trim().length === 0) {
      errors.push({ path: '/subtopic', message: 'A question under review needs a subtopic (taxonomy).' })
    }
    return errors
  }

  /** Verifies every referenced media object still exists before release. */
  async #assertMediaIntegrity(row) {
    if (!this.mediaRepository) return
    const refs = [
      ...collectMediaRefs(row.payload ?? null),
      ...collectMediaRefs(row.meta?.media ?? null),
    ]
    const missing = []
    for (const ref of new Set(refs)) {
      const url = await this.mediaRepository.signedUrl(ref)
      if (!url) missing.push(ref)
    }
    if (missing.length > 0) {
      throw questionError.validation([
        { path: '/media', code: 'MEDIA_MISSING', message: `Media referenced by the question no longer exists: ${missing.join(', ')}` },
      ])
    }
  }

  /** Re-validates a stored row end-to-end (gates + schemas + media integrity). */
  async #assertReleaseReady(row) {
    const draft = this.#draftFromRow(row)
    const gates = this.#reviewGates(draft)
    if (gates.length > 0) throw questionError.validation(gates)
    this.validateDraft(draft)
    await this.#assertMediaIntegrity(row)
    return draft
  }

  /** Lists questions as authoring DTOs (previews: no correctAnswer). */
  async list({ stream = null, level = null, activityType = null, status = null, query = null } = {}) {
    const filters = await this.#listFilters({ stream, level, activityType, status, query })
    const rows = await this.questionRepository.list(filters)
    const questions = rows.map((row) => {
      const dto = rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) })
      delete dto.correctAnswer
      delete dto.meta
      return dto
    })
    return { questions }
  }

  /** Resolves the list query into repository filters (catalogue validated). */
  async #listFilters({ stream = null, level = null, activityType = null, status = null, query = null } = {}) {
    const filters = {}
    if (stream != null) {
      const s = await this.catalogueRepository.findStreamBySlug(stream)
      if (!s) throw questionError.catalogUnknown(`stream "${stream}"`)
      filters.streamId = s.id
    }
    if (level != null) filters.levelId = Number(level)
    if (activityType != null) {
      const t = await this.catalogueRepository.findActivityTypeBySlug(activityType)
      if (!t) throw questionError.catalogUnknown(`activityType "${activityType}"`)
      filters.activityTypeId = t.id
    }
    if (status != null) filters.status = status
    if (query) filters.query = String(query)
    return filters
  }

  /** Fetches one question with the full server-only surface (correctAnswer). */
  async getById(id) {
    const row = await this.questionRepository.findById(id)
    if (!row) throw questionError.notFound(`id ${id}`)
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /** Creates a question draft. Always status 'draft', version 1. */
  async create(input, { admin = null } = {}) {
    this.assertKnownFields(input)
    const { draft, ids } = await this.normalizeDraft(input)
    draft.status = 'draft'
    draft.version = 1
    draft.isFlagged = false
    draft.meta = this.#withAuthoring(draft.meta, admin)
    this.validateDraft(draft)

    const now = new Date().toISOString()
    const row = await this.questionRepository.insert(
      questionDtoToRow(draft, { ...ids, createdAt: now, updatedAt: now })
    )
    await this.#recordAction({ admin, action: 'QUESTION_CREATED', questionId: row.id, details: { version: row.version } })
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /**
   * Updates a draft (version preserved). Editing clears any review state —
   * an approval/rejection never survives a content change. Published and
   * archived rows are read-only (409).
   */
  async update(id, input, { admin = null } = {}) {
    this.assertKnownFields(input)
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'draft') {
      throw questionError.statusBlocked(`question ${id} is ${existing.status}`)
    }

    const { draft, ids } = await this.normalizeDraft(input)
    draft.status = 'draft'
    draft.version = existing.version
    draft.meta = this.#mergeMetaForUpdate(existing.meta, draft.meta)
    this.validateDraft(draft)

    const now = new Date().toISOString()
    const row = await this.questionRepository.update(
      id,
      questionDtoToRow(draft, { ...ids, createdAt: existing.created_at, updatedAt: now })
    )
    if (!row) throw questionError.notFound(`id ${id}`)
    await this.#recordAction({ admin, action: 'QUESTION_EDITED', questionId: id, details: { version: row.version } })
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /** Removes a draft (tests + cleanup). Published/archived rows are protected. */
  async remove(id) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'draft') {
      throw questionError.statusBlocked(`question ${id} is ${existing.status}`)
    }
    return { removed: await this.questionRepository.delete(id) }
  }

  /** Catalogue options for the editor dropdowns. */
  async catalogue() {
    const [streams, activityTypes] = await Promise.all([
      this.catalogueRepository.listStreams(),
      this.catalogueRepository.listActivityTypes(),
    ])
    return { streams, activityTypes }
  }

  /**
   * Task 5.13 — review queue: drafts currently pending review, newest first.
   * Previews only (no correctAnswer / full meta).
   */
  async reviewQueue({ stream = null, level = null, activityType = null } = {}) {
    const filters = await this.#listFilters({ stream, level, activityType, status: 'draft' })
    const rows = await this.questionRepository.list({ ...filters, limit: 500 })
    const questions = rows
      .filter((row) => row.meta?.review?.state === 'pending')
      .map((row) => {
        const review = row.meta?.review
        return {
          id: row.id,
          prompt: row.prompt,
          stream: row.streams?.slug ?? null,
          level: row.levels?.number ?? null,
          activityType: row.activity_types?.slug ?? null,
          version: row.version,
          status: row.status,
          difficulty: row.difficulty,
          gradeMin: row.grade_min,
          gradeMax: row.grade_max,
          review: {
            state: review.state,
            submittedAt: review.submittedAt ?? null,
            submittedByAdminId: review.submittedByAdminId ?? null,
          },
        }
      })
    return { questions }
  }

  /** Task 5.13 — audit trail for one question (newest first). */
  async audit(id) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    const rows = await this.adminActionRepository.listByTarget('question', String(id))
    return {
      actions: rows.map((a) => ({
        id: a.id,
        action: a.action,
        adminId: a.admin_id,
        targetType: a.target_type,
        targetId: a.target_id,
        details: a.details ?? null,
        createdAt: a.created_at,
      })),
    }
  }

  /**
   * Task 5.13 — submit for review. A draft with all gates satisfied becomes
   * 'pending'. Content edits are blocked afterwards by review-state guards;
   * an edit resets the review state instead.
   */
  async submitForReview(id, { admin = null } = {}) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'draft') {
      throw questionError.invalidState(`question ${id} is ${existing.status}, only drafts can be submitted`)
    }
    const state = existing.meta?.review?.state
    if (state === 'pending') {
      throw questionError.invalidState(`question ${id} is already under review`)
    }
    if (state === 'approved') {
      throw questionError.invalidState(`question ${id} is already approved; edit it first to re-submit`)
    }
    await this.#assertReleaseReady(existing)

    const now = new Date().toISOString()
    const meta = { ...(existing.meta ?? {}), review: { state: 'pending', submittedAt: now, submittedByAdminId: admin?.id ?? null, version: existing.version } }
    const row = await this.questionRepository.update(id, { meta, updated_at: now })
    await this.#recordAction({ admin, action: 'QUESTION_SUBMITTED', questionId: id, details: { version: row.version } })
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /** Task 5.13 — approve a pending review (records reviewer + timestamp). */
  async approve(id, { admin = null, note = null } = {}) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'draft') {
      throw questionError.invalidState(`question ${id} is ${existing.status}, only drafts can be approved`)
    }
    const review = existing.meta?.review
    if (!review || review.state !== 'pending') {
      throw questionError.invalidState(`question ${id} has no pending review to approve`)
    }
    await this.#assertReleaseReady(existing)

    const now = new Date().toISOString()
    const meta = {
      ...(existing.meta ?? {}),
      review: { ...review, state: 'approved', reviewerAdminId: admin?.id ?? null, reviewedAt: now, note: note ?? review.note ?? null },
    }
    const row = await this.questionRepository.update(id, { meta, updated_at: now })
    await this.#recordAction({ admin, action: 'QUESTION_APPROVED', questionId: id, details: { version: row.version } })
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /** Task 5.13 — reject a pending review. A non-empty note is mandatory. */
  async reject(id, { admin = null, note = null } = {}) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'draft') {
      throw questionError.invalidState(`question ${id} is ${existing.status}, only drafts can be rejected`)
    }
    const review = existing.meta?.review
    if (!review || review.state !== 'pending') {
      throw questionError.invalidState(`question ${id} has no pending review to reject`)
    }
    if (typeof note !== 'string' || note.trim().length === 0) {
      throw questionError.reviewNoteRequired()
    }

    const now = new Date().toISOString()
    const meta = {
      ...(existing.meta ?? {}),
      review: { ...review, state: 'rejected', reviewerAdminId: admin?.id ?? null, reviewedAt: now, note: note.trim() },
    }
    const row = await this.questionRepository.update(id, { meta, updated_at: now })
    await this.#recordAction({ admin, action: 'QUESTION_REJECTED', questionId: id, details: { version: row.version, note: note.trim() } })
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /**
   * Task 5.13 — publish an approved draft. Guards: the question is a draft,
   * the review is approved, and the approval matches the current version
   * (stale-approval guard). Publishing a clone archives its source row.
   */
  async publish(id, { admin = null } = {}) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'draft') {
      throw questionError.invalidState(`question ${id} is ${existing.status}, only drafts can be published`)
    }
    const review = existing.meta?.review
    if (!review || review.state !== 'approved') {
      throw questionError.invalidState(`question ${id} has no approved review to publish`)
    }
    if (review.version !== existing.version) {
      throw questionError.approvalStale(`review version ${review.version} != current version ${existing.version}`)
    }
    await this.#assertReleaseReady(existing)

    const now = new Date().toISOString()
    const row = await this.questionRepository.update(id, { status: 'published', updated_at: now })
    await this.#recordAction({ admin, action: 'QUESTION_PUBLISHED', questionId: id, details: { version: row.version } })

    if (row.meta?.sourceQuestionId != null) {
      const source = await this.questionRepository.findById(row.meta.sourceQuestionId)
      if (source && source.status === 'published') {
        await this.questionRepository.update(source.id, { status: 'archived', updated_at: now })
        await this.#recordAction({
          admin, action: 'QUESTION_ARCHIVED', questionId: source.id,
          details: { version: source.version, supersededByVersion: row.version, reason: 'superseded by a new version' },
        })
      }
    }
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /** Task 5.13 — archive a published question (read-only thereafter). */
  async archive(id, { admin = null } = {}) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'published') {
      throw questionError.invalidState(`question ${id} is ${existing.status}, only published questions can be archived`)
    }
    const now = new Date().toISOString()
    const row = await this.questionRepository.update(id, { status: 'archived', updated_at: now })
    await this.#recordAction({ admin, action: 'QUESTION_ARCHIVED', questionId: id, details: { version: row.version } })
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /**
   * Task 5.13 — clone-on-edit: a published v1 becomes a new draft v2 linked
   * through meta.sourceQuestionId/sourceVersion. v1 is left untouched; it is
   * archived when v2 is published (never overwritten).
   */
  async createVersion(id, { admin = null } = {}) {
    const existing = await this.questionRepository.findById(id)
    if (!existing) throw questionError.notFound(`id ${id}`)
    if (existing.status !== 'published') {
      throw questionError.invalidState(`question ${id} is ${existing.status}, versioned editing starts from a published question`)
    }

    const draft = this.#draftFromRow(existing)
    draft.status = 'draft'
    draft.version = existing.version + 1
    draft.meta = this.#withAuthoring(existing.meta, admin)
    draft.meta = {
      ...(draft.meta ?? {}),
      sourceQuestionId: existing.id,
      sourceVersion: existing.version,
    }
    delete draft.meta.review
    this.validateDraft(draft)

    const now = new Date().toISOString()
    const row = await this.questionRepository.insert(
      questionDtoToRow(draft, {
        streamId: existing.stream_id,
        levelId: existing.level_id,
        activityTypeId: existing.activity_type_id,
        createdAt: now,
        updatedAt: now,
      })
    )
    await this.#recordAction({
      admin, action: 'QUESTION_VERSION_CREATED', questionId: row.id,
      details: { sourceId: existing.id, sourceVersion: existing.version, version: row.version },
    })
    return { question: rowToQuestionDto(row, { activitySchemaVersion: this.schemaVersionFor(row) }) }
  }

  /** Resolves the schemaVersion const for a row's activity type. */
  schemaVersionFor(row) {
    const slug = row.activity_types?.slug ?? row.activity_type_id
    return this.validator.engine.getSchemaVersion(slug) ?? '1.0'
  }
}

export default { QuestionService }