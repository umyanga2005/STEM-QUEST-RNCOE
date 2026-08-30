/**
 * Game Session — Supabase repository implementations (Task 4.4).
 *
 * Thin PostgREST adapters over `client` (a `@supabase/supabase-js`
 * service-role client, or an injectable fake in tests). Column names follow
 * the 0001 migration exactly — no new tables, no schema changes.
 * Rows ↔ domain mapping is centralized in exported pure mappers so the
 * repository logic is unit-testable without a live database.
 */

import { SupabaseProgressionRepository } from '../../progression/repositories/supabase.js'

const ROUNDS_SELECT = '*, activity_types(slug)'

function toMs(ts) {
  if (ts === null || ts === undefined) return null
  const v = ts instanceof Date ? ts.valueOf() : new Date(ts).valueOf()
  return Number.isFinite(v) ? v : null
}

function toIso(ms) {
  return ms === null || ms === undefined ? null : new Date(ms).toISOString()
}

/** game_settings value → number (jsonb may be a number or a JSON string). */
function toNumber(value, fallback) {
  if (value === null || value === undefined) return fallback
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Guards malformed route/body ids BEFORE they reach PostgREST: `NaN` (from a
 * non-numeric `streamId`/`levelId`/`sessionId`) would otherwise serialize as
 * a literal `NaN` and raise a bigint syntax error instead of a clean 404/409.
 * Returns null so the service maps it to the same not-found/locked outcome
 * the in-memory stores produce (D-052).
 */
function finiteId(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------
// Question row mappings
// ---------------------------------------------------------------------------

export function questionToRow(q) {
  return {
    id: q.id,
    streamId: q.streamId,
    levelId: q.levelId,
    activityTypeId: q.activityTypeId,
    activityType: q.activityType,
    prompt: q.prompt,
    instructions: q.instructions ?? null,
    explanation: q.explanation ?? null,
    payload: q.payload,
    correctAnswer: q.correctAnswer,
    hints: q.hints ?? null,
    basePoints: q.basePoints,
    timerOverrideSeconds: q.timerOverrideSeconds ?? null,
    status: q.status ?? 'published',
    difficulty: q.difficulty,
    gradeMin: q.gradeMin,
    gradeMax: q.gradeMax,
  }
}

export function rowToQuestion(row) {
  return {
    id: row.id,
    streamId: row.stream_id,
    levelId: row.level_id,
    activityTypeId: row.activity_type_id,
    activityType: row.activity_types?.slug ?? row.activity_type_slug ?? null,
    prompt: row.prompt,
    instructions: row.instructions ?? null,
    explanation: row.explanation ?? null,
    payload: row.payload,
    correctAnswer: row.correct_answer,
    hints: row.hints ?? null,
    basePoints: row.base_points,
    timerOverrideSeconds: row.timer_override_seconds ?? null,
    status: row.status,
    difficulty: row.difficulty,
    gradeMin: row.grade_min,
    gradeMax: row.grade_max,
  }
}

// ---------------------------------------------------------------------------
// Game session row mappings
// ---------------------------------------------------------------------------

export function rowToGameSession(row) {
  return {
    id: row.id,
    sessionCode: row.session_code,
    studentId: row.student_id,
    streamId: row.stream_id,
    levelId: row.level_id,
    seed: row.seed,
    selectedQuestionIds: row.selected_question_ids ?? [],
    status: row.status,
    startedAt: toMs(row.started_at),
    completedAt: toMs(row.completed_at),
    totalScore: row.total_score ?? 0,
    totalTimeMs: row.total_time_ms ?? null,
    result: row.result ?? null,
    metadata: row.metadata ?? null,
  }
}

const SESSION_COLUMN_MAP = Object.freeze({
  status: 'status',
  completedAt: 'completed_at',
  totalScore: 'total_score',
  totalTimeMs: 'total_time_ms',
  result: 'result',
})

function sessionPatchToColumns(patch) {
  const out = {}
  for (const [domainKey, column] of Object.entries(SESSION_COLUMN_MAP)) {
    if (patch[domainKey] !== undefined) {
      // total_time_ms is a plain bigint of milliseconds; only completed_at is a
      // real timestamp that needs ISO serialization (D-052).
      out[column] = domainKey === 'completedAt' ? toIso(patch[domainKey]) : patch[domainKey]
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Session round row mappings
// ---------------------------------------------------------------------------

export function rowToSessionRound(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    roundNumber: row.round_number,
    questionId: row.question_id,
    activityTypeId: row.activity_type_id,
    activityType: row.activity_types?.slug ?? null,
    basePoints: row.base_points,
    status: row.status,
    attempts: row.attempts,
    hintsUsed: row.hints_used,
    overtimeSeconds: row.overtime_seconds,
    pointsEarned: row.points_earned,
    timeTakenMs: row.time_taken_ms ?? null,
    answerData: row.answer_data ?? null,
    validationResult: row.validation_result ?? null,
    startedAt: toMs(row.started_at),
    answeredAt: toMs(row.answered_at),
  }
}

const ROUND_COLUMN_MAP = Object.freeze({
  status: 'status',
  attempts: 'attempts',
  hintsUsed: 'hints_used',
  overtimeSeconds: 'overtime_seconds',
  pointsEarned: 'points_earned',
  timeTakenMs: 'time_taken_ms',
  answerData: 'answer_data',
  validationResult: 'validation_result',
  answeredAt: 'answered_at',
})

function roundPatchToColumns(patch) {
  const out = {}
  for (const [domainKey, column] of Object.entries(ROUND_COLUMN_MAP)) {
    if (patch[domainKey] !== undefined) {
      out[column] = domainKey === 'answeredAt' ? toIso(patch[domainKey]) : patch[domainKey]
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export class SupabaseQuestionRepository {
  constructor({ client }) {
    this.client = client
  }

  Q = () => this.client.from('questions')

  /**
   * Strict single-stage pool: (stream, level, published) only — no
   * cross-stream or cross-level fallback (Task 2 fix; the old 3-stage
   * fallback could hand a student another stream's questions).
   *
   * Returns whatever it finds, including fewer than 3 rows — this method's
   * only job is the (stream, level, published, minDifficulty) filter.
   * Enforcing the minimum pool size is `selectRoundQuestions`' job
   * (game-engine/core/selection.js already throws the typed
   * GAME_INSUFFICIENT_POOL error the frontend handles); duplicating that
   * check here would just throw an untyped error earlier for the same case.
   */
  async getEligibleQuestions({ streamId, levelId, minDifficulty = null }) {
    let query = this.Q()
      .select('*, activity_types(slug)')
      .eq('status', 'published')
      .eq('stream_id', streamId)
      .eq('level_id', levelId)
    if (minDifficulty !== null) query = query.gte('difficulty', minDifficulty)
    const { data, error } = await query
    if (error) throw this.#err(error, 'getEligibleQuestions')
    return (data ?? []).map(rowToQuestion)
  }

  async getById(id) {
    if (finiteId(id) === null) return null
    const { data, error } = await this.Q().select('*, activity_types(slug)').eq('id', id).maybeSingle()
    if (error) throw this.#err(error, 'getById')
    return data ? rowToQuestion(data) : null
  }

  #err(error, op) {
    const e = new Error(`Supabase question query failed (${op}): ${error.message}`)
    e.details = error.details
    return e
  }
}

export class SupabaseGameSessionRepository {
  constructor({ client }) {
    this.client = client
  }

  S = () => this.client.from('game_sessions')

  async getRecentQuestionIds(studentId, { lastSessions = 5 } = {}) {
    const { data: sessions, error: sessionError } = await this.S()
      .select('id')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
      .limit(lastSessions)
    if (sessionError) throw new Error(`recent sessions failed: ${sessionError.message}`)
    const ids = (sessions ?? []).map((s) => s.id)
    if (ids.length === 0) return []
    const { data: rounds, error } = await this.client
      .from('session_rounds')
      .select('question_id')
      .in('session_id', ids)
    if (error) throw new Error(`recent rounds failed: ${error.message}`)
    return [...new Set((rounds ?? []).map((r) => r.question_id))]
  }

  async findById(id) {
    if (finiteId(id) === null) return null
    const { data, error } = await this.S().select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`findById failed: ${error.message}`)
    return data ? rowToGameSession(data) : null
  }

  async findActiveByStudentStream(studentId, streamId, levelId) {
    const { data, error } = await this.S()
      .select('*')
      .eq('student_id', studentId)
      .eq('stream_id', streamId)
      .eq('level_id', levelId) // FIX: P1-006 — was missing; caused wrong-level resume
      .eq('status', 'active')
      .maybeSingle()
    if (error) throw new Error(`findActiveByStudentStream failed: ${error.message}`)
    return data ? rowToGameSession(data) : null
  }

  async createSession({ sessionCode, studentId, streamId, levelId, seed, selectedQuestionIds, startedAt, metadata = null }) {
    const { data, error } = await this.S()
      .insert({
        session_code: sessionCode,
        student_id: studentId,
        stream_id: streamId,
        level_id: levelId,
        seed,
        selected_question_ids: selectedQuestionIds,
        started_at: toIso(startedAt),
        metadata,
      })
      .select('*')
      .single()
    if (error) throw new Error(`createSession failed: ${error.message}`)
    return rowToGameSession(data)
  }

  async setTotalScore(id, totalScore) {
    return this.update(id, { totalScore })
  }

  async update(id, patch) {
    const columns = sessionPatchToColumns(patch)
    const { data, error } = await this.S().update(columns).eq('id', id).select('*').maybeSingle()
    if (error) throw new Error(`update session failed: ${error.message}`)
    return data ? rowToGameSession(data) : null
  }

  async deleteSession(id) {
    const { error } = await this.S().delete().eq('id', id)
    if (error) throw new Error(`deleteSession failed: ${error.message}`)
  }

  async insertScore({ sessionId, studentId, streamId, levelId, score, totalTimeMs, roundBreakdown }) {
    const { data, error } = await this.client
      .from('scores')
      .insert({
        session_id: sessionId,
        student_id: studentId,
        stream_id: streamId,
        level_id: levelId,
        score,
        total_time_ms: totalTimeMs,
        round_breakdown: roundBreakdown,
      })
      .select('*')
      .single()
    if (error) throw new Error(`insertScore failed: ${error.message}`)
    return data
  }
}

export class SupabaseSessionRoundRepository {
  constructor({ client }) {
    this.client = client
  }

  R = () => this.client.from('session_rounds')

  async createRoundsForSession(sessionId, items) {
    const rows = items.map((item) => ({
      session_id: sessionId,
      round_number: item.roundNumber,
      question_id: item.questionId,
      activity_type_id: item.activityTypeId,
      base_points: item.basePoints,
      started_at: toIso(item.startedAt),
    }))
    const { data, error } = await this.R().insert(rows).select(ROUNDS_SELECT).order('round_number', { ascending: true })
    if (error) throw new Error(`createRoundsForSession failed: ${error.message}`)
    return (data ?? []).map(rowToSessionRound)
  }

  async findBySessionId(sessionId) {
    const { data, error } = await this.R()
      .select(ROUNDS_SELECT)
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })
    if (error) throw new Error(`findBySessionId failed: ${error.message}`)
    return (data ?? []).map(rowToSessionRound)
  }

  async findById(roundId) {
    if (finiteId(roundId) === null) return null
    const { data, error } = await this.R().select(ROUNDS_SELECT).eq('id', roundId).maybeSingle()
    if (error) throw new Error(`findById failed: ${error.message}`)
    return data ? rowToSessionRound(data) : null
  }

  async markAnswered(roundId, patch) {
    const columns = roundPatchToColumns(patch)
    const { data, error } = await this.R().update(columns).eq('id', roundId).select(ROUNDS_SELECT).maybeSingle()
    if (error) throw new Error(`markAnswered failed: ${error.message}`)
    return data ? rowToSessionRound(data) : null
  }

  async appendAnswer({ sessionId, roundId, questionId, attemptNumber, answer, validation, wasCorrect, pointsEarned, timeTakenMs }) {
    const { data, error } = await this.client
      .from('student_answers')
      .insert({
        session_id: sessionId,
        round_id: roundId,
        question_id: questionId,
        attempt_number: attemptNumber,
        answer,
        validation,
        was_correct: wasCorrect,
        points_earned: pointsEarned,
        time_taken_ms: timeTakenMs,
      })
      .select('*')
      .single()
    if (error) throw new Error(`appendAnswer failed: ${error.message}`)
    return data
  }
}

export class SupabaseSpecialAccessRepository {
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
    if (error) throw new Error(`getActiveGrants failed: ${error.message}`)
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

export class SupabaseStudentRepository {
  constructor({ client }) {
    this.client = client
  }

  async findById(id) {
    const { data, error } = await this.client
      .from('students')
      .select('id, initials, full_name, grade, status')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`student findById failed: ${error.message}`)
    return data
      ? { id: data.id, initials: data.initials, fullName: data.full_name, grade: data.grade, status: data.status }
      : null
  }
}

export class SupabaseLevelRepository {
  constructor({ client }) {
    this.client = client
  }

  async findLevel({ streamId, levelId }) {
    if (finiteId(streamId) === null || finiteId(levelId) === null) return null
    const { data, error } = await this.client
      .from('levels')
      .select('id, stream_id, number, name, default_time_seconds, overtime_penalty_per_second, is_active')
      .eq('id', levelId)
      .eq('stream_id', streamId)
      .maybeSingle()
    if (error) throw new Error(`findLevel failed: ${error.message}`)
    return data
      ? {
          id: data.id,
          streamId: data.stream_id,
          number: data.number,
          name: data.name,
          defaultTimeSeconds: data.default_time_seconds,
          overtimePenaltyPerSecond: data.overtime_penalty_per_second,
          isActive: data.is_active === true,
        }
      : null
  }

  async listForStream(streamId) {
    if (finiteId(streamId) === null) return []
    const { data, error } = await this.client
      .from('levels')
      .select('id, stream_id, number, name, default_time_seconds, overtime_penalty_per_second, is_active')
      .eq('stream_id', streamId)
      .eq('is_active', true)
      .order('number', { ascending: true })
    if (error) throw new Error(`listForStream failed: ${error.message}`)
    return (data ?? []).map((row) => ({
      id: row.id,
      streamId: row.stream_id,
      number: row.number,
      name: row.name,
      defaultTimeSeconds: row.default_time_seconds,
      overtimePenaltyPerSecond: row.overtime_penalty_per_second,
      isActive: row.is_active === true,
    }))
  }
}

export class SupabaseSettingsRepository {
  constructor({ client }) {
    this.client = client
  }

  async getScoringConfig() {
    const keys = [
      'scoring.hint_deduction',
      'scoring.attempt_deduction',
      'session.questions_per_session',
      'scoring.pass_threshold', // FIX: P2-007
    ]
    const { data, error } = await this.client
      .from('game_settings')
      .select('key, value')
      .in('key', keys)
    if (error) throw new Error(`getScoringConfig failed: ${error.message}`)
    const byKey = new Map((data ?? []).map((s) => [s.key, s.value]))
    return {
      hintDeduction: toNumber(byKey.get('scoring.hint_deduction'), 5),
      attemptDeduction: toNumber(byKey.get('scoring.attempt_deduction'), 10),
      questionsPerSession: toNumber(byKey.get('session.questions_per_session'), 3),
      passThreshold: toNumber(byKey.get('scoring.pass_threshold'), 150), // FIX: P2-007
    }
  }
}

/** Builds all Supabase repositories over one client. */
export function createSupabaseRepositories({ client }) {
  return {
    questionRepository: new SupabaseQuestionRepository({ client }),
    gameSessionRepository: new SupabaseGameSessionRepository({ client }),
    roundRepository: new SupabaseSessionRoundRepository({ client }),
    specialAccessRepository: new SupabaseSpecialAccessRepository({ client }),
    studentRepository: new SupabaseStudentRepository({ client }),
    levelRepository: new SupabaseLevelRepository({ client }),
    settingsRepository: new SupabaseSettingsRepository({ client }),
    progressionRepository: new SupabaseProgressionRepository({ client }),
  }
}

export default {
  rowToQuestion,
  rowToGameSession,
  rowToSessionRound,
  createSupabaseRepositories,
}