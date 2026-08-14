/**
 * Game Engine — entry (Task 4.3).
 *
 * Server-side session engine: seeded 3-of-100 selection + session lifecycle.
 * Selection and session logic are deliberately pure (no I/O, no Activity
 * Engine dependency); repository adapters are a later task. The Central
 * Scoring Service (D-023/D-041) plugs in through `finishSession`'s
 * `totalPoints`.
 */

export {
  selectRoundQuestions,
  QUESTIONS_PER_SESSION,
} from './core/selection.js'
export {
  createGameSession,
  guardSessionForStudent,
  getCurrentRound,
  submitRound,
  finishSession,
  SESSION_STATUS,
  ROUND_STATUS,
  MAX_SESSION_POINTS,
} from './core/session.js'
export {
  generateSessionSeed,
  createSeededRng,
  shuffle,
  pickOne,
} from './core/prng.js'
export {
  GameEngineError,
  GAME_ERROR_CODES,
  gameCategoryOf,
  gameError,
} from './core/errors.js'
