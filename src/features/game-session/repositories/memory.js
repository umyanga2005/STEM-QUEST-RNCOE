/**
 * Game Session — in-memory repositories (Task 4.4).
 *
 * Plain-object stores + repository implementations used by unit/integration
 * tests and the local demo API. They match the repository contracts in
 * `contracts.js` and hold convenience indexes so every contract method is a
 * small filter/insert. No Supabase dependency — tests never touch the live
 * project.
 */

import { MemoryProgressionRepository } from '../../progression/repositories/memory.js'

/**
 * @typedef {object} MemoryStore
 * @property {object[]} students
 * @property {object[]} streams
 * @property {object[]} levels
 * @property {object[]} activityTypes
 * @property {object[]} questions      - full server-side questions
 * @property {object[]} gameSessions
 * @property {object[]} rounds
 * @property {object[]} answers
 * @property {object[]} specialAccess
 * @property {object[]} settings
 * @property {object[]} scores
 * @property {object[]} studentProgress      - student_progress (stream rows)
 * @property {object[]} studentLevelProgress - student_level_progress rows
 */

export function createMemoryStore() {
  return {
    students: [],
    streams: [],
    levels: [],
    activityTypes: [],
    questions: [],
    gameSessions: [],
    rounds: [],
    answers: [],
    specialAccess: [],
    settings: [],
    scores: [],
    studentProgress: [],
    studentLevelProgress: [],
  }
}

class MemoryQuestionRepository {
  constructor(store) {
    this.store = store
  }

  async getEligibleQuestions({ streamId, levelId, minDifficulty = null }) {
    const published = this.store.questions.filter(
      (q) =>
        (q.status ?? 'published') === 'published' &&
        (minDifficulty === null || (q.difficulty ?? 1) >= minDifficulty)
    )
    const exact = published.filter(
      (q) => String(q.streamId) === String(streamId) && String(q.levelId) === String(levelId)
    )
    if (exact.length >= 3) return exact

    const streamMatches = published.filter((q) => String(q.streamId) === String(streamId))
    if (streamMatches.length >= 3) return streamMatches

    return published
  }

  async getById(id) {
    return this.store.questions.find((q) => q.id === id) ?? null
  }
}

class MemoryGameSessionRepository {
  constructor(store) {
    this.store = store
  }

  async getRecentQuestionIds(studentId, { lastSessions = 5 } = {}) {
    const sessions = this.store.gameSessions
      .filter((s) => s.studentId === studentId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, lastSessions)
    const sessionIds = new Set(sessions.map((s) => s.id))
    return [...new Set(this.store.rounds.filter((r) => sessionIds.has(r.sessionId)).map((r) => r.questionId))]
  }

  async findById(id) {
    return this.store.gameSessions.find((s) => s.id === id) ?? null
  }

  async findActiveByStudentStream(studentId, streamId, levelId) {
    return (
      this.store.gameSessions.find(
        (s) =>
          s.studentId === studentId &&
          s.streamId === streamId &&
          s.levelId === levelId && // FIX: P1-006 — was missing; caused wrong-level resume
          s.status === 'active'
      ) ?? null
    )
  }

  async createSession({
    sessionCode,
    studentId,
    streamId,
    levelId,
    seed,
    selectedQuestionIds,
    startedAt,
    metadata = null,
  }) {
    const session = {
      id: this.store.gameSessions.length + 1,
      sessionCode,
      studentId,
      streamId,
      levelId,
      seed,
      selectedQuestionIds: [...selectedQuestionIds],
      status: 'active',
      startedAt,
      completedAt: null,
      totalScore: 0,
      totalTimeMs: null,
      result: null,
      metadata,
    }
    this.store.gameSessions.push(session)
    return session
  }

  async setTotalScore(id, totalScore) {
    const session = this.store.gameSessions.find((s) => s.id === id)
    if (session) session.totalScore = totalScore
    return session
  }

  async update(id, patch) {
    const session = this.store.gameSessions.find((s) => s.id === id)
    if (session) Object.assign(session, patch)
    return session
  }

  async deleteSession(id) {
    const before = this.store.gameSessions.length
    this.store.gameSessions = this.store.gameSessions.filter((s) => s.id !== id)
    this.store.rounds = this.store.rounds.filter((r) => r.sessionId !== id)
    this.store.answers = this.store.answers.filter((a) => a.sessionId !== id)
    return before !== this.store.gameSessions.length
  }

  async insertScore({ sessionId, studentId, streamId, levelId, score, totalTimeMs, roundBreakdown }) {
    const row = {
      id: this.store.scores.length + 1,
      sessionId,
      studentId,
      streamId,
      levelId,
      score,
      totalTimeMs,
      roundBreakdown,
    }
    this.store.scores.push(row)
    return row
  }
}

class MemorySessionRoundRepository {
  constructor(store) {
    this.store = store
  }

  async createRoundsForSession(sessionId, items) {
    return items.map((item, i) => {
      const round = {
        id: this.store.rounds.length + 1 + i,
        sessionId,
        roundNumber: item.roundNumber,
        questionId: item.questionId,
        activityTypeId: item.activityTypeId,
        activityType: item.activityType,
        basePoints: item.basePoints,
        status: 'pending',
        attempts: 0,
        hintsUsed: 0,
        overtimeSeconds: 0,
        pointsEarned: 0,
        timeTakenMs: null,
        answerData: null,
        validationResult: null,
        startedAt: item.startedAt,
        answeredAt: null,
      }
      this.store.rounds.push(round)
      return round
    })
  }

  async findBySessionId(sessionId) {
    return this.store.rounds
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.roundNumber - b.roundNumber)
  }

  async findById(roundId) {
    return this.store.rounds.find((r) => r.id === roundId) ?? null
  }

  async markAnswered(roundId, patch) {
    const round = this.store.rounds.find((r) => r.id === roundId)
    if (round) Object.assign(round, patch)
    return round
  }

  async appendAnswer({ sessionId, roundId, questionId, attemptNumber, answer, validation, wasCorrect, pointsEarned, timeTakenMs }) {
    const row = {
      id: this.store.answers.length + 1,
      sessionId,
      roundId,
      questionId,
      attemptNumber,
      answer,
      validation,
      wasCorrect,
      pointsEarned,
      timeTakenMs,
      submittedAt: null,
    }
    this.store.answers.push(row)
    return row
  }
}

class MemorySpecialAccessRepository {
  constructor(store) {
    this.store = store
  }

  async getActiveGrants(studentId) {
    const now = Date.now()
    return this.store.specialAccess.filter(
      (g) =>
        g.studentId === studentId &&
        g.isActive === true &&
        (g.expiresAt === null || g.expiresAt === undefined || g.expiresAt > now)
    )
  }
}

class MemoryStudentRepository {
  constructor(store) {
    this.store = store
  }

  async findById(id) {
    return this.store.students.find((s) => s.id === id) ?? null
  }
}

class MemoryLevelRepository {
  constructor(store) {
    this.store = store
  }

  async findLevel({ streamId, levelId }) {
    const level = this.store.levels.find(
      (l) => l.id === levelId && l.streamId === streamId
    )
    return level && level.isActive !== false ? level : null
  }

  async listForStream(streamId) {
    return this.store.levels
      .filter((l) => l.streamId === streamId && l.isActive !== false)
      .sort((a, b) => a.number - b.number)
  }
}

class MemorySettingsRepository {
  constructor(store) {
    this.store = store
  }

  async getScoringConfig() {
    const byKey = new Map(this.store.settings.map((s) => [s.key, s.value]))
    const num = (key, fallback) => {
      const raw = byKey.get(key)
      if (raw === undefined || raw === null) return fallback
      const n = typeof raw === 'number' ? raw : Number(raw)
      return Number.isFinite(n) ? n : fallback
    }
    return {
      hintDeduction: num('scoring.hint_deduction', 5),
      attemptDeduction: num('scoring.attempt_deduction', 10),
      questionsPerSession: num('session.questions_per_session', 3),
      passThreshold: num('scoring.pass_threshold', 150), // FIX: P2-007
    }
  }
}

/** Builds all in-memory repositories over one store. */
export function createMemoryRepositories(store = createMemoryStore()) {
  return {
    store,
    questionRepository: new MemoryQuestionRepository(store),
    gameSessionRepository: new MemoryGameSessionRepository(store),
    roundRepository: new MemorySessionRoundRepository(store),
    specialAccessRepository: new MemorySpecialAccessRepository(store),
    studentRepository: new MemoryStudentRepository(store),
    levelRepository: new MemoryLevelRepository(store),
    settingsRepository: new MemorySettingsRepository(store),
    progressionRepository: new MemoryProgressionRepository(store),
  }
}

export default {
  createMemoryStore,
  createMemoryRepositories,
}