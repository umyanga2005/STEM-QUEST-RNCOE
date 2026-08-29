/**
 * Game Session — repository contracts (Task 4.4).
 *
 * Domain-shape definitions and interface documentation only — no runtime
 * logic. Every repository talks in these domain objects; in-memory and
 * Supabase implementations both map to/from them. Keeps the service
 * persistence-agnostic (D-052) and the column shapes visible in one place
 * (mirrors `06-database-architecture.md` §4 and the 0001 migration).
 */

/**
 * @typedef {object} Question - server-side question (correctAnswer present).
 * @property {number} id
 * @property {number} streamId
 * @property {number} levelId
 * @property {number} activityTypeId
 * @property {string} activityType - activity_types.slug, e.g. 'drag-drop'
 * @property {string} prompt
 * @property {?string} instructions
 * @property {?string} explanation
 * @property {object} payload
 * @property {object} correctAnswer - SERVER-ONLY. never leaves the service.
 * @property {?object[]} hints
 * @property {number} basePoints
 * @property {?number} timerOverrideSeconds
 * @property {number} difficulty
 * @property {number} gradeMin
 * @property {number} gradeMax
 */

/**
 * @typedef {object} GameSession
 * @property {number} id
 * @property {string} sessionCode
 * @property {number} studentId
 * @property {number} streamId
 * @property {number} levelId
 * @property {string} seed
 * @property {number[]} selectedQuestionIds - exactly 3
 * @property {'active'|'completed'|'abandoned'|'error'} status
 * @property {number} startedAt - epoch ms
 * @property {?number} completedAt - epoch ms
 * @property {number} totalScore
 * @property {?number} totalTimeMs
 * @property {?string} result
 * @property {?object} metadata
 */

/**
 * @typedef {object} SessionRound
 * @property {number} id
 * @property {number} sessionId
 * @property {number} roundNumber - 1..3
 * @property {number} questionId
 * @property {number} activityTypeId
 * @property {string} activityType - slug snapshot
 * @property {number} basePoints
 * @property {'pending'|'answered'|'skipped'|'timed_out'|'abandoned'} status
 * @property {number} attempts
 * @property {number} hintsUsed
 * @property {number} overtimeSeconds
 * @property {number} pointsEarned
 * @property {?number} timeTakenMs
 * @property {?object} answerData
 * @property {?object} validationResult
 * @property {number} startedAt - epoch ms
 * @property {?number} answeredAt - epoch ms
 */

/**
 * @typedef {object} Student
 * @property {number} id
 * @property {string} initials
 * @property {string} fullName
 * @property {number} grade
 * @property {'active'|'disabled'} status
 */

/**
 * @typedef {object} Level
 * @property {number} id
 * @property {number} streamId
 * @property {number} number - 1..5
 * @property {string} name
 * @property {number} defaultTimeSeconds
 * @property {number} overtimePenaltyPerSecond
 * @property {boolean} isActive
 */

/**
 * @typedef {object} SpecialAccessGrant
 * @property {number} id
 * @property {number} studentId
 * @property {?number} streamId
 * @property {?number} levelId
 * @property {boolean} isActive
 * @property {?number} expiresAt - epoch ms
 */

/**
 * @typedef {object} ScoringConfig
 * @property {number} hintDeduction
 * @property {number} attemptDeduction
 * @property {number} questionsPerSession
 */

export const SESSION_STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  ERROR: 'error',
})

export const ROUND_STATUS = Object.freeze({
  PENDING: 'pending',
  ANSWERED: 'answered',
  SKIPPED: 'skipped',
  TIMED_OUT: 'timed_out',
  ABANDONED: 'abandoned',
})

/**
 * @typedef {object} QuestionRepository
 * @property {(args: { streamId: number, levelId: number }) => Promise<Question[]>} getEligibleQuestions
 *           - published questions for a (stream, level). Repo retrieves
 *             candidates; the Game Engine runs D-022 selection (D-022 §8).
 * @property {(id: number) => Promise<Question|null>} getById
 *           - full server-side question (includes correctAnswer) for validation.
 */

/**
 * @typedef {object} GameSessionRepository
 * @property {(studentId: number, opts?: { lastSessions?: number }) => Promise<number[]>} getRecentQuestionIds
 *           - question ids seen in the last N sessions (repeat avoidance).
 * @property {(id: number) => Promise<GameSession|null>} findById
 * @property {(studentId: number, streamId: number, levelId: number) => Promise<GameSession|null>} findActiveByStudentStream
 * @property {(session: object) => Promise<GameSession>} createSession
 *           - session = { sessionCode, studentId, streamId, levelId, seed,
 *             selectedQuestionIds, startedAt, metadata }
 * @property {(id: number, totalScore: number) => Promise<GameSession>} setTotalScore
 * @property {(id: number, patch: object) => Promise<GameSession>} update
 *           - status/completed_at/total_score/total_time_ms/result writes.
 * @property {(id: number) => Promise<void>} deleteSession
 *           - compensation only (orphan cleanup after a failed start; cascades
 *             any inserted rounds).
 * @property {(row: object) => Promise<object>} insertScore
 *           - row = { sessionId, studentId, streamId, levelId, score,
 *             totalTimeMs, roundBreakdown }
 */

/**
 * @typedef {object} SessionRoundRepository
 * @property {(sessionId: number, items: object[]) => Promise<SessionRound[]>} createRoundsForSession
 *           - items = [{ roundNumber, questionId, activityTypeId,
 *             activityType, basePoints, startedAt }]
 * @property {(sessionId: number) => Promise<SessionRound[]>} findBySessionId
 * @property {(roundId: number) => Promise<SessionRound|null>} findById
 * @property {(roundId: number, patch: object) => Promise<SessionRound>} markAnswered
 *           - patch = { status, attempts, hintsUsed, overtimeSeconds,
 *             pointsEarned, timeTakenMs, answerData, validationResult, answeredAt }
 * @property {(row: object) => Promise<object>} appendAnswer
 *           - student_answers audit row = { sessionId, roundId, questionId,
 *             attemptNumber, answer, validation, wasCorrect, pointsEarned,
 *             timeTakenMs }
 */

/**
 * @typedef {object} SpecialAccessRepository
 * @property {(studentId: number) => Promise<SpecialAccessGrant[]>} getActiveGrants
 */

/**
 * @typedef {object} StudentRepository
 * @property {(id: number) => Promise<Student|null>} findById
 */

/**
 * @typedef {object} LevelRepository
 * @property {(args: { streamId: number, levelId: number }) => Promise<Level|null>} findLevel
 * @property {(streamId: number) => Promise<Level[]>} listForStream
 *           - active levels of a stream, ascending by number (used by the
 *             progression unlock to resolve the previous level, D-076).
 */

/**
 * @typedef {object} ProgressionRepository
 * @property {(args: { studentId: number, levelId: number }) => Promise<object|null>} getLevelProgress
 *           - one student_level_progress row (domain shape) or null.
 * @property {(args: { studentId: number, streamId: number }) => Promise<object[]>} listLevelProgress
 *           - all level rows for a (student, stream).
 * @property {(row: object) => Promise<object>} upsertLevelProgress
 *           - upsert on UNIQUE(student_id, level_id).
 * @property {(row: object) => Promise<object>} upsertStreamProgress
 *           - upsert on UNIQUE(student_id, stream_id).
 */

/**
 * @typedef {object} SettingsRepository
 * @property {() => Promise<ScoringConfig>} getScoringConfig
 *           - reads game_settings keys scoring.hint_deduction /
 *             scoring.attempt_deduction / session.questions_per_session.
 */