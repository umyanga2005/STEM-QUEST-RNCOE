/**
 * Game Session — GameSessionService (Task 4.4).
 *
 * Server-only orchestration. Owns the security boundary between the client
 * and the authoritative layers:
 *
 *   Game Engine (selection + session lifecycle)   — src/features/game-engine
 *   Activity Engine (plugin resolution + validation) — src/features/activity-engine
 *   Central Scoring Service (final points)        — ./scoring
 *   Repositories (persistence)                    — ./repositories
 *
 * Responsibilities: startSession / getCurrentRound / submitRound /
 * finishSession. React only presents; correctness, scoring inputs, scores and
 * round progression are decided HERE (D-006/D-027). Never trusts a
 * client-provided score, correctnessFraction, overtime or session total.
 */

import {
  generateSessionSeed,
  selectRoundQuestions,
  createGameSession,
  guardSessionForStudent,
  submitRound as advanceRound,
  gameError,
  ROUND_STATUS as DOMAIN_ROUND_STATUS,
} from '../../game-engine/index.js'
import { createServerActivityEngine } from '../../activity-engine/server.js'
import { registerDragDrop } from '../../activity-engine/plugins/drag-drop/plugin.js'
import { registerMatching } from '../../activity-engine/plugins/matching/plugin.js'
import { registerOrdering } from '../../activity-engine/plugins/ordering/plugin.js'
import { registerSorting } from '../../activity-engine/plugins/sorting/plugin.js'
import { registerFillComplete } from '../../activity-engine/plugins/fill-complete/plugin.js'
import { registerImageInteraction } from '../../activity-engine/plugins/image-interaction/plugin.js'
import { registerPattern } from '../../activity-engine/plugins/pattern/plugin.js'
import { registerMemory } from '../../activity-engine/plugins/memory/plugin.js'
import { registerScenarioChallenge } from '../../activity-engine/plugins/scenario-challenge/plugin.js'
import { registerNumberLogic } from '../../activity-engine/plugins/number-logic/plugin.js'
import {
  scoreQuestion,
  computeOvertimeSeconds,
  resolveAllowedSeconds,
  sumSessionScore,
  buildRoundBreakdown,
} from '../scoring/central-scoring-service.js'
import { buildSafeRoundDescriptor, toPublicSession } from '../security/safe-descriptor.js'
import { ProgressionService } from '../../progression/service/progression-service.js'

const SESSION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const DEFAULT_LAST_SESSIONS = 5

function randomSessionCode() {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => SESSION_CODE_ALPHABET[b % SESSION_CODE_ALPHABET.length]).join('')
}

export function createDefaultServerActivityEngine() {
  const engine = createServerActivityEngine()
  registerDragDrop(engine)
  registerMatching(engine)
  registerOrdering(engine)
  registerSorting(engine)
  registerFillComplete(engine)
  registerImageInteraction(engine)
  registerPattern(engine)
  registerMemory(engine)
  registerScenarioChallenge(engine)
  registerNumberLogic(engine)
  return engine
}

function normalizeSessionForGuard(session) {
  return session && { ...session, id: String(session.id), studentId: String(session.studentId) }
}

/** Selection consumes plain `{ id, streamId, levelId, activityType }`. */
function toSelectionQuestion(q) {
  return {
    id: String(q.id),
    streamId: String(q.streamId),
    levelId: String(q.levelId),
    activityType: q.activityType,
  }
}

export class GameSessionService {
  /**
   * @param {object} deps
   * @param {import('../repositories/contracts.js').QuestionRepository} deps.questionRepository
   * @param {import('../repositories/contracts.js').GameSessionRepository} deps.gameSessionRepository
   * @param {import('../repositories/contracts.js').SessionRoundRepository} deps.roundRepository
   * @param {import('../repositories/contracts.js').SpecialAccessRepository} deps.specialAccessRepository
   * @param {import('../repositories/contracts.js').StudentRepository} deps.studentRepository
   * @param {import('../repositories/contracts.js').LevelRepository} deps.levelRepository
   * @param {import('../repositories/contracts.js').SettingsRepository} deps.settingsRepository
   * @param {import('../repositories/contracts.js').ProgressionRepository} deps.progressionRepository
   * @param {object} [deps.activityEngine] - server-mode engine (drag-drop registered)
   * @param {object} [deps.scoring] - central scoring function bundle
   * @param {() => number} [deps.now] - injectable clock (tests)
   * @param {() => string} [deps.makeSessionCode]
   * @param {object} [deps.progressionService] - overridable ProgressionService
   *           (defaults to one built over the repositories above).
* @param {object} [deps.leaderboardService] - optional LeaderboardService
 *           (Task 5.7); when present, finishSession records the best score.
 * @param {object} [deps.achievementsService] - optional AchievementsService
 *           (Task 5.8); when present, finishSession awards the stream badge
 *           + certificate on stream completion.
 */
  constructor(deps) {
    this.questionRepository = deps.questionRepository
    this.gameSessionRepository = deps.gameSessionRepository
    this.roundRepository = deps.roundRepository
    this.specialAccessRepository = deps.specialAccessRepository
    this.studentRepository = deps.studentRepository
    this.levelRepository = deps.levelRepository
    this.settingsRepository = deps.settingsRepository
    this.activityEngine = deps.activityEngine ?? createDefaultServerActivityEngine()
    this.now = deps.now ?? (() => Date.now())
    this.makeSessionCode = deps.makeSessionCode ?? randomSessionCode
    this.progressionService =
      deps.progressionService ??
      new ProgressionService({
        progressionRepository: deps.progressionRepository,
        levelRepository: deps.levelRepository,
        specialAccessRepository: deps.specialAccessRepository,
      })
    this.leaderboardService = deps.leaderboardService ?? null
    this.achievementsService = deps.achievementsService ?? null
  }

  // ------------------------------------------------------------------
  // startSession()
  // ------------------------------------------------------------------

  /**
   * Creates and persists a 3-question session for (student, stream, level),
   * returning the safe descriptor of the first round.
   * @param {object} input - { studentId, streamId, levelId, metadata }
   * @returns {Promise<{ session: object, currentRound: object|null }>}
   */
  async startSession({ studentId, streamId, levelId, metadata = null }) {
    const sid = Number(studentId)
    const stid = Number(streamId)
    const lid = Number(levelId)

    // 1. authenticate/authorize student context (application record, D-005).
    const student = await this.studentRepository.findById(sid)
    if (!student || student.status !== 'active') {
      throw gameError.invalidInput('student not found or not active')
    }

    // 2. validate stream + level (composite integrity, D-039).
    const level = await this.levelRepository.findLevel({ streamId: stid, levelId: lid })
    if (!level) throw gameError.levelLocked(stid, lid)

    // 3. unlock rule (D-076): level 1 open; higher levels need a completed
    //    previous level (same stream) or an active special-access grant.
    const grants = await this.specialAccessRepository.getActiveGrants(sid)
    await this.progressionService.assertLevelUnlocked({ studentId: sid, level, grants })

    // Resume an existing active session for the same (student, stream) rather
    // than violating the concurrent-active guard (partial index D-028).
    const active = await this.gameSessionRepository.findActiveByStudentStream(sid, stid)
    if (active) return this.sessionState(active)

    // 4. eligible pool; 5. recent-question history; 6. secure seed.
    const pool = await this.questionRepository.getEligibleQuestions({ streamId: stid, levelId: lid })
    const recent = (await this.gameSessionRepository.getRecentQuestionIds(sid, { lastSessions: DEFAULT_LAST_SESSIONS })).map(String)
    const seed = generateSessionSeed()

    // 7. configuration (questions per session — game_settings).
    const config = await this.settingsRepository.getScoringConfig()
    const count = config.questionsPerSession

    // 8. Game Engine D-022 selection (strict diversity + recent avoidance).
    const selection = selectRoundQuestions({
      streamId: String(stid),
      levelId: String(lid),
      studentId: String(sid),
      seed,
      questionPool: pool.map(toSelectionQuestion),
      recentQuestionIds: recent,
      count,
    })

    const selectedIds = selection.questionIds.map(Number)
    const selectedQuestions = []
    for (const id of selectedIds) {
      const q = await this.questionRepository.getById(id)
      if (!q) throw gameError.insufficientPool(stid, lid, pool.length)
      selectedQuestions.push(q)
    }

    // 9–11. persist session + 3 rounds as one logical operation.
    const sessionCode = this.makeSessionCode()
    const startedAt = this.now()
    const persisted = await this.gameSessionRepository.createSession({
      sessionCode,
      studentId: sid,
      streamId: stid,
      levelId: lid,
      seed,
      selectedQuestionIds: selectedIds,
      startedAt,
      metadata,
    })
    let rounds
    try {
      rounds = await this.roundRepository.createRoundsForSession(
        persisted.id,
        selectedQuestions.map((q, i) => ({
          roundNumber: i + 1,
          questionId: q.id,
          activityTypeId: q.activityTypeId,
          activityType: q.activityType,
          basePoints: q.basePoints,
          startedAt,
        }))
      )
    } catch (err) {
      // Compensate the partial insert so no orphan session survives.
      await this.gameSessionRepository.deleteSession(persisted.id).catch(() => {})
      throw err
    }

    // 12. return safe current-round descriptor.
    return this.sessionState(persisted, rounds)
  }

  // ------------------------------------------------------------------
  // getCurrentRound()
  // ------------------------------------------------------------------

  /** Returns the current (first pending) round descriptor, or null when done. */
  async getCurrentRound({ sessionId, studentId }) {
    const session = await this.loadAndGuardSession(sessionId, studentId)
    const rounds = await this.roundRepository.findBySessionId(session.id)
    return this.sessionState(session, rounds)
  }

  // ------------------------------------------------------------------
  // submitRound()
  // ------------------------------------------------------------------

  /**
   * Validates + scores one round server-side and returns a safe result
   * (plus the next round's safe descriptor).
   * @param {object} input - { sessionId, roundId, studentId, submission }
   * @returns {Promise<object>} { roundResult, feedback, progress, score, nextRound }
   */
  async submitRound({ sessionId, roundId, studentId, submission }) {
    const session = await this.loadAndGuardSession(sessionId, studentId)
    const rounds = await this.roundRepository.findBySessionId(session.id)
    if (rounds.length === 0) throw gameError.roundNotFound(roundId)

    // The Game Engine's current-round guard is authoritative (D-052).
    const domainSession = this.domainSession(session, rounds)
    advanceRound(domainSession, String(roundId))

    const target = rounds.find((r) => String(r.id) === String(roundId))
    const question = await this.questionRepository.getById(target.questionId)
    if (!question) throw gameError.internal(`question ${target.questionId} missing`)
    const level = await this.levelRepository.findLevel({
      streamId: session.streamId,
      levelId: session.levelId,
    })
    const config = await this.settingsRepository.getScoringConfig()
    if (!this.activityEngine.has(question.activityType)) {
      throw gameError.activityUnavailable(question.activityType, 'plugin not registered')
    }

    // Activity Engine server facade: submission shape + answer validation.
    // `interactionMetrics` defaults to {} so the plugin's scoringInputs never
    // sees undefined metrics; the engine guards attempts/hints/time itself.
    const submissionCtx = { ...submission, interactionMetrics: submission?.interactionMetrics ?? {} }
    const fullSubmission = { questionId: String(question.id), ...submissionCtx }
    const validation = this.activityEngine.validateAnswer(question.activityType, {
      submission: fullSubmission,
      payload: question.payload,
      correctAnswer: question.correctAnswer,
    })

    // Server-only normalized scoring inputs (fraction guarded in [0,1]).
    const scoringInputs = this.activityEngine.scoringInputs(
      question.activityType,
      { submission: fullSubmission, payload: question.payload, correctAnswer: question.correctAnswer },
      validation
    )

    // Time authority: server timestamps only (never the client's clock).
    const timeTakenMs = this.serverElapsedFor(session, target, rounds)
    const allowedSeconds = resolveAllowedSeconds({
      timerOverrideSeconds: question.timerOverrideSeconds,
      levelDefaultSeconds: level.defaultTimeSeconds,
    })
    const overtimeSeconds = computeOvertimeSeconds({ timeTakenMs, allowedSeconds })

    // Central Scoring Service: authoritative points (D-023).
    const points = scoreQuestion({
      basePoints: target.basePoints,
      correctnessFraction: scoringInputs.correctnessFraction,
      hintsUsed: scoringInputs.hintsUsed,
      attempts: scoringInputs.attemptsUsed,
      overtimeSeconds,
      overtimePenaltyPerSecond: level.overtimePenaltyPerSecond,
      hintDeduction: config.hintDeduction,
      attemptDeduction: config.attemptDeduction,
    })

    const answeredAt = this.now()
    await this.roundRepository.markAnswered(target.id, {
      status: 'answered',
      attempts: scoringInputs.attemptsUsed,
      hintsUsed: scoringInputs.hintsUsed,
      overtimeSeconds,
      pointsEarned: points,
      timeTakenMs,
      answerData: submission.response,
      validationResult: validation.detail,
      answeredAt,
    })
    await this.roundRepository.appendAnswer({
      sessionId: session.id,
      roundId: target.id,
      questionId: target.questionId,
      attemptNumber: scoringInputs.attemptsUsed,
      answer: submission.response,
      validation: validation.detail,
      wasCorrect: scoringInputs.correctnessFraction === 1,
      pointsEarned: points,
      timeTakenMs,
    })

    const feedback = this.activityEngine.feedback(
      question.activityType,
      { submission: fullSubmission, payload: question.payload, correctAnswer: question.correctAnswer },
      validation
    )

    // Progress + running session total (persisted).
    const updatedRounds = await this.roundRepository.findBySessionId(session.id)
    const answeredCount = updatedRounds.filter((r) => r.status === 'answered').length
    const runningTotal = updatedRounds.reduce((sum, r) => sum + (r.pointsEarned ?? 0), 0)
    await this.gameSessionRepository.setTotalScore(session.id, runningTotal)

    let nextRound = null
    if (answeredCount < updatedRounds.length) {
      const next = updatedRounds.find((r) => r.status === 'pending')
      const nextQuestion = await this.questionRepository.getById(next.questionId)
      nextRound = buildSafeRoundDescriptor({
        activityEngine: this.activityEngine,
        session,
        round: next,
        question: nextQuestion,
        level,
        answeredCount,
        totalRounds: updatedRounds.length,
      })
    }

    const completed = answeredCount === updatedRounds.length
    return {
      roundResult: {
        sessionId: session.id,
        roundId: target.id,
        questionId: target.questionId,
        correct: validation.correct,
        correctnessFraction: scoringInputs.correctnessFraction,
        pointsEarned: points,
        detail: validation.detail,
      },
      feedback,
      progress: { current: answeredCount, total: updatedRounds.length, completed },
      score: { roundScore: points, sessionRunningTotal: runningTotal },
      nextRound,
    }
  }

  // ------------------------------------------------------------------
  // finishSession()
  // ------------------------------------------------------------------

  /**
   * Finalizes a session where all 3 rounds are answered: sums the frozen
   * per-round points (0–300), persists completion and the scores ledger, then
   * records progression. Re-finishing an already-completed session is
   * idempotent — the stored completion payload is returned without rewriting.
   * @param {object} input - { sessionId, studentId }
   */
  async finishSession({ sessionId, studentId }) {
    const session = await this.gameSessionRepository.findById(Number(sessionId))
    guardSessionForStudent(normalizeSessionForGuard(session), String(studentId))

    if (session.status === 'completed') {
      // Idempotent re-finish: the session, ledger and progression rows already
      // exist. Return the stored result without any further writes.
      const rounds = await this.roundRepository.findBySessionId(session.id)
      return {
        sessionId: session.id,
        sessionCode: session.sessionCode,
        sessionScore: session.totalScore,
        totalTimeMs: session.totalTimeMs,
        status: 'completed',
        result: session.result,
        roundBreakdown: buildRoundBreakdown(rounds),
      }
    }
    if (session.status !== 'active') {
      throw gameError.sessionNotActive(`status is "${session.status}"`)
    }

    const rounds = await this.roundRepository.findBySessionId(session.id)
    if (rounds.some((r) => r.status === 'pending')) {
      throw gameError.invalidState('cannot finish session before all rounds are answered')
    }

    const totalScore = sumSessionScore(rounds.map((r) => r.pointsEarned))
    const lastAnsweredAt = rounds
      .map((r) => r.answeredAt)
      .filter((t) => t !== null && t !== undefined)
      .sort((a, b) => b - a)[0]
    const totalTimeMs = lastAnsweredAt ? Math.max(0, lastAnsweredAt - session.startedAt) : null
    const completedAt = this.now()
    const result = totalScore >= 150 ? 'passed' : 'attempted'

    await this.gameSessionRepository.update(session.id, {
      status: 'completed',
      completedAt,
      totalScore,
      totalTimeMs,
      result,
    })

    const roundBreakdown = buildRoundBreakdown(rounds)
    await this.gameSessionRepository.insertScore({
      sessionId: session.id,
      studentId: session.studentId,
      streamId: session.streamId,
      levelId: session.levelId,
      score: totalScore,
      totalTimeMs,
      roundBreakdown,
    })

    await this.progressionService.recordCompletion({
      studentId: session.studentId,
      streamId: session.streamId,
      levelId: session.levelId,
      score: totalScore,
      completedAt,
    })

    // Leaderboard (Task 5.7): best score per (student, stream) is derived,
    // strictly-better, and best-effort — a write failure must never roll the
    // completed session back or 500 the finish. Progression stays the
    // authoritative record; the next better attempt repairs the row.
    if (this.leaderboardService?.recordBestScore) {
      try {
        await this.leaderboardService.recordBestScore({
          studentId: session.studentId,
          streamId: session.streamId,
          score: totalScore,
          completionTimeMs: totalTimeMs,
          achievedAt: completedAt,
        })
      } catch (err) {
        console?.warn?.(`leaderboard best-score write skipped: ${err.message}`)
      }
    }

    // Achievements (Task 5.8): on stream completion the backend awards the
    // stream badge and issues the stream certificate. Best-effort and
    // idempotent — a failure must never roll the completed session back or
    // 500 the finish (architecture §11; D-011/D-031).
    if (this.achievementsService?.awardForCompletion) {
      try {
        await this.achievementsService.awardForCompletion({
          studentId: session.studentId,
          streamId: session.streamId,
          completedAt,
        })
      } catch (err) {
        console?.warn?.(`achievements award skipped: ${err.message}`)
      }
    }

    return {
      sessionId: session.id,
      sessionCode: session.sessionCode,
      sessionScore: totalScore,
      totalTimeMs,
      status: 'completed',
      result,
      roundBreakdown,
    }
  }

  // ------------------------------------------------------------------
  // internals
  // ------------------------------------------------------------------

  /** Loads + authorizes a session; active only (service authority). */
  async loadAndGuardSession(sessionId, studentId) {
    const session = await this.gameSessionRepository.findById(Number(sessionId))
    guardSessionForStudent(normalizeSessionForGuard(session), String(studentId))
    if (session.status !== 'active') {
      throw gameError.sessionNotActive(`status is "${session.status}"`)
    }
    return session
  }

  /** Rehydrates a domain session (Game Engine) from persisted rows. */
  domainSession(session, rounds) {
    const domain = createGameSession({
      id: String(session.id),
      studentId: String(session.studentId),
      streamId: String(session.streamId),
      levelId: String(session.levelId),
      seed: session.seed,
      questionIds: session.selectedQuestionIds.map(String),
    })
    domain.rounds = rounds.map((r) => ({
      id: String(r.id),
      questionId: String(r.questionId),
      status:
        r.status === 'pending'
          ? DOMAIN_ROUND_STATUS.PENDING
          : DOMAIN_ROUND_STATUS.SUBMITTED,
    }))
    return domain
  }

  /** Server timestamps only: round 1 starts at session start; round N at the
   * previous round's answered_at. */
  serverElapsedFor(session, round, rounds) {
    const boundary =
      round.roundNumber === 1
        ? session.startedAt
        : rounds.find((r) => r.roundNumber === round.roundNumber - 1)?.answeredAt ??
          session.startedAt
    return Math.max(0, this.now() - boundary)
  }

  /** Builds { session: publicSummary, currentRound: safeDescriptor|null }. */
  async sessionState(session, rounds = null) {
    const allRounds = rounds ?? (await this.roundRepository.findBySessionId(session.id))
    const answeredCount = allRounds.filter((r) => r.status !== 'pending').length
    const publicSession = toPublicSession({ ...session, roundsAnswered: answeredCount })
    if (answeredCount === allRounds.length) {
      return { session: publicSession, currentRound: null }
    }
    const current = allRounds.find((r) => r.status === 'pending')
    const level = await this.levelRepository.findLevel({
      streamId: session.streamId,
      levelId: session.levelId,
    })
    const question = await this.questionRepository.getById(current.questionId)
    if (!question) throw gameError.internal(`question ${current.questionId} missing`)
    const currentRound = buildSafeRoundDescriptor({
      activityEngine: this.activityEngine,
      session,
      round: current,
      question,
      level,
      answeredCount,
      totalRounds: allRounds.length,
    })
    return { session: publicSession, currentRound }
  }
}

export default GameSessionService