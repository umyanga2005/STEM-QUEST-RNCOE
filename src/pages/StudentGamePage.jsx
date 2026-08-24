import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Navigate, useBlocker, useLocation, useNavigate } from 'react-router'
import tokenStorage from '../features/student/session/token-storage.js'
import choiceStorage from '../features/game-session/session/choice-storage.js'
import { useRoundStore } from '../features/game-session/round/round-store.js'
import { ROUND_PHASE, hasActiveSession } from '../features/game-session/round/round-lifecycle.js'
import {
  useStartSession,
  useSubmitRound,
  useFinishSession,
} from '../features/game-session/api/queries.js'
import { useStudentMe } from '../features/student/api/queries.js'
import { useMissionStreams, useMissionLevels } from '../features/mission/api/queries.js'
import { RoundActivity } from '../features/game-session/activity/activity-renderer.jsx'
import { useCountdown } from '../features/game-session/timer/use-countdown.js'
import { isExpiredSession } from '../features/mission/session-guard.js'
import StreamIcon, { STREAM_ASSETS, GAME_ASSETS } from './stream-icons.jsx'
import './student-game.css'

function formatDuration(totalMs) {
  if (!Number.isFinite(totalMs) || totalMs < 0) return '—'
  const totalSec = Math.round(totalMs / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function StudentGamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [token, setToken] = useState(() => tokenStorage.read())

  const round = useRoundStore()
  const startRequested = useRoundStore((s) => s.startRequested)
  const sessionStarted = useRoundStore((s) => s.sessionStarted)
  const submitRequested = useRoundStore((s) => s.submitRequested)
  const roundSubmitted = useRoundStore((s) => s.roundSubmitted)
  const next = useRoundStore((s) => s.next)
  const finishRequested = useRoundStore((s) => s.finishRequested)
  const finished = useRoundStore((s) => s.finished)
  const failed = useRoundStore((s) => s.failed)
  const reset = useRoundStore((s) => s.reset)

  const me = useStudentMe(token)

  const stateChoice = location.state?.streamId != null ? location.state : null
  const [choice] = useState(() => stateChoice ?? choiceStorage.read())

  useEffect(() => {
    if (choice) choiceStorage.write(choice)
  }, [choice])

  const streamsQuery = useMissionStreams(token)
  const levelsQuery = useMissionLevels(token, choice?.streamId)
  const startSession = useStartSession(token)
  const submitRound = useSubmitRound(token)
  const finishSession = useFinishSession(token)

  const stream = useMemo(
    () => streamsQuery.data?.streams.find((s) => Number(s.id) === Number(choice?.streamId)) ?? null,
    [streamsQuery.data, choice]
  )
  const level = useMemo(
    () => levelsQuery.data?.levels.find((l) => Number(l.id) === Number(choice?.levelId)) ?? null,
    [levelsQuery.data, choice]
  )

  const expired =
    isExpiredSession({ isError: me.isError, error: me.error }, token) ||
    isExpiredSession({ isError: startSession.isError, error: startSession.error }, token) ||
    isExpiredSession({ isError: submitRound.isError, error: submitRound.error }, token) ||
    isExpiredSession({ isError: finishSession.isError, error: finishSession.error }, token)

  useEffect(() => {
    if (expired) {
      tokenStorage.clear()
      choiceStorage.clear()
      setToken(null)
    }
  }, [expired])

  const runStart = useCallback(() => {
    if (!choice) return
    startRequested()
    startSession.mutate(
      { streamId: choice.streamId, levelId: choice.levelId },
      {
        onSuccess: (data) => {
          sessionStarted(data)
          if (!data.currentRound) {
            finishSession.mutate(
              { sessionId: data.session.id },
              { onSuccess: (f) => finished(f), onError: (err) => failed(err) }
            )
          }
        },
        onError: (err) => failed(err),
      }
    )
  }, [choice, startRequested, sessionStarted, startSession, finishSession, finished, failed])

  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (round.phase !== ROUND_PHASE.IDLE || !choice || autoStartedRef.current) return
    autoStartedRef.current = true
    runStart()
  }, [round.phase, choice, runStart])

  const handleSubmit = useCallback(
    ({ response, interactionMetrics }) => {
      const s = useRoundStore.getState()
      if (s.phase !== ROUND_PHASE.PLAYING || !s.currentRound) return
      submitRequested()
      submitRound.mutate(
        { sessionId: s.sessionId, roundId: s.currentRound.roundId, response, interactionMetrics },
        { onSuccess: (data) => roundSubmitted(data), onError: (err) => failed(err) }
      )
    },
    [submitRequested, submitRound, roundSubmitted, failed]
  )

  const handleNext = useCallback(() => {
    const s = useRoundStore.getState()
    if (s.progress?.completed && !s.nextRound) {
      finishRequested()
      finishSession.mutate(
        { sessionId: s.sessionId },
        { onSuccess: (f) => finished(f), onError: (err) => failed(err) }
      )
    } else {
      next()
    }
  }, [finishRequested, finishSession, finished, failed, next])

  const handlePlayAgain = useCallback(() => {
    reset()
  }, [reset])

  const handleBackToMission = useCallback(() => {
    choiceStorage.clear()
    reset()
    navigate('/student/mission')
  }, [navigate, reset])

  const timer = useCountdown({
    allowedSeconds: round.currentRound?.timer?.allowedSeconds ?? 0,
    running: round.phase === ROUND_PHASE.PLAYING && Boolean(round.currentRound),
    resetKey: round.currentRound?.roundId ?? null,
  })

  const blocker = useBlocker(() => hasActiveSession(round))

  if (!token) {
    return <Navigate to="/student/register" replace />
  }
  if (!choice) {
    return <Navigate to="/student/mission" replace />
  }

  const streamAsset = STREAM_ASSETS[stream?.slug] || {}

  return (
    <main className="game-page">
      <div className="game-glow" aria-hidden="true" />
      {GAME_ASSETS.gameHudLoop ? (
        <video
          src={GAME_ASSETS.gameHudLoop}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            opacity: 0.15,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      ) : null}

      <div className="game-shell">
        <header className="game-header">
          <div className="game-header__top">
            <span className="game-brand">STEM QUEST</span>
            {me.data?.student ? <span className="game-greeting">⚡ {me.data.student.name}</span> : null}
          </div>
          <div className="game-header__mission">
            <span className="game-stream-icon" aria-hidden="true">
              {streamAsset.bg ? (
                <img src={streamAsset.bg} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              ) : stream ? (
                <StreamIcon slug={stream.slug} />
              ) : null}
            </span>
            <div className="game-header__titles">
              <span className="game-stream-name">{stream?.name ?? 'Mission'}</span>
              {level ? (
                <span className="game-level-name">
                  Level {level.number} · {level.name}
                </span>
              ) : null}
            </div>
          </div>
          {round.phase !== ROUND_PHASE.IDLE ? (
            <div className="game-hud">
              <div className="game-hud__progress" aria-live="polite">
                {round.currentRound ? (
                  <span>
                    🎯 Question {round.currentRound.progress.current} of {round.currentRound.progress.total}
                  </span>
                ) : round.progress ? (
                  <span>
                    {round.progress.current} of {round.progress.total} answered
                  </span>
                ) : null}
              </div>
              <div className="game-hud__score">
                🏆 Score <strong>{round.score?.sessionRunningTotal ?? 0}</strong>
              </div>
              <div className={`game-hud__timer game-hud__timer--${timer.tone}`} role="timer" aria-live="polite">
                ⏱️ {round.phase === ROUND_PHASE.PLAYING
                  ? `${timer.remaining}s`
                  : round.currentRound
                    ? `${round.currentRound.timer.allowedSeconds}s`
                    : ''}
              </div>
            </div>
          ) : null}
        </header>

        {round.phase === ROUND_PHASE.IDLE ? (
          <section className="game-stage">
            {round.error ? (
              <div className="game-error" role="alert">
                <p>We couldn’t start your mission right now.</p>
                <p className="game-error__detail">{round.error.message}</p>
                <div className="game-actions">
                  <button type="button" className="game-button game-button--primary" onClick={runStart}>
                    Try again
                  </button>
                  <button type="button" className="game-button game-button--ghost" onClick={handleBackToMission}>
                    Back to mission
                  </button>
                </div>
              </div>
            ) : (
              <p className="game-status" role="status">
                Preparing your mission…
              </p>
            )}
          </section>
        ) : null}

        {round.phase === ROUND_PHASE.STARTING || round.phase === ROUND_PHASE.FINISHING ? (
          <section className="game-stage">
            <p className="game-status" role="status">
              {round.phase === ROUND_PHASE.FINISHING ? 'Wrapping up your mission…' : 'Starting your mission…'}
            </p>
          </section>
        ) : null}

        {round.phase === ROUND_PHASE.PLAYING && round.currentRound ? (
          <motion.section
            className="game-stage"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <RoundActivity
              round={round.currentRound}
              disabled={false}
              reducedMotion={reduceMotion}
              onSubmit={handleSubmit}
            />
          </motion.section>
        ) : null}

        {round.phase === ROUND_PHASE.SUBMITTING && round.currentRound ? (
          <section className="game-stage">
            <div className="game-submitting" role="status">
              <p>Scoring your answer…</p>
            </div>
            <RoundActivity
              round={round.currentRound}
              disabled
              reducedMotion={reduceMotion}
              submitted
              onSubmit={() => {}}
            />
          </section>
        ) : null}

        {round.phase === ROUND_PHASE.ROUND_RESULT ? (
          <RoundResultPanel round={round} onNext={handleNext} />
        ) : null}

        {round.phase === ROUND_PHASE.SESSION_COMPLETE && round.finished ? (
          <SessionCompletePanel
            finished={round.finished}
            reduceMotion={reduceMotion}
            onPlayAgain={handlePlayAgain}
            onBackToMission={handleBackToMission}
          />
        ) : null}

        {round.phase === ROUND_PHASE.SESSION_COMPLETE && round.error ? (
          <div className="game-error" role="alert">
            <p>{round.error.message}</p>
            <button type="button" className="game-button game-button--primary" onClick={handleBackToMission}>
              Back to mission
            </button>
          </div>
        ) : null}
      </div>

      {blocker.state === 'blocked' ? (
        <div className="game-guard" role="alertdialog" aria-modal="true" aria-labelledby="guard-title">
          <div className="game-guard__card">
            <h2 id="guard-title">Leave your mission?</h2>
            <p>You have an active mission in progress. Leaving now discards this session.</p>
            <div className="game-actions">
              <button type="button" className="game-button game-button--primary" onClick={() => blocker.reset()}>
                Stay
              </button>
              <button type="button" className="game-button game-button--ghost" onClick={() => blocker.proceed()}>
                Leave mission
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function RoundResultPanel({ round, onNext }) {
  const isComplete = round.progress?.completed
  const fraction = round.roundResult?.correctnessFraction ?? 0
  const label = round.roundResult?.correct ? 'Correct' : fraction > 0 ? 'Partly correct' : 'Not quite'
  const badge = label === 'Correct' ? 'pass' : label === 'Partly correct' ? 'partial' : 'fail'
  return (
    <motion.section
      className="game-stage game-result"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className={`game-result__badge game-result__badge--${badge}`}>{label}</div>
      <div className="game-result__scores">
        <p>
          Points earned: <strong>{round.roundResult?.pointsEarned ?? 0}</strong>
        </p>
        <p>
          Running total: <strong>{round.score?.sessionRunningTotal ?? 0}</strong> / 300
        </p>
      </div>
      {round.feedback ? (
        <div className="game-result__feedback">
          <h3>{round.feedback.title}</h3>
          {round.feedback.message ? <p>{round.feedback.message}</p> : null}
          {round.feedback.explanation ? <p className="game-result__explain">{round.feedback.explanation}</p> : null}
          {round.feedback.guidance ? <p className="game-result__guidance">{round.feedback.guidance}</p> : null}
        </div>
      ) : null}
      <div className="game-actions">
        <button type="button" className="game-button game-button--primary" onClick={onNext}>
          {isComplete ? 'See results' : 'Next question'}
        </button>
      </div>
    </motion.section>
  )
}

function SessionCompletePanel({ finished, reduceMotion, onPlayAgain, onBackToMission }) {
  const passed = finished.result === 'passed'
  const bgImage = passed ? GAME_ASSETS.victoryBg : GAME_ASSETS.gameOverBg

  return (
    <motion.section
      className="game-stage game-complete"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 22, 41, 0.85), rgba(15, 22, 41, 0.95)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={`game-complete__seal game-complete__seal--${passed ? 'pass' : 'attempt'}`} aria-hidden="true">
        {passed ? '🏆' : '💪'}
      </div>
      <h2 className="game-complete__title">{passed ? 'MISSION VICTORY!' : 'GREAT EFFORT!'}</h2>
      <p className="game-complete__score">
        Final Score: <strong>{finished.sessionScore}</strong> / 300
      </p>
      <dl className="game-complete__meta">
        <div>
          <dt>Session code</dt>
          <dd>{finished.sessionCode}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(finished.totalTimeMs)}</dd>
        </div>
      </dl>
      <ul className="game-breakdown">
        {finished.roundBreakdown.map((r) => (
          <li key={r.roundNumber}>
            <span>
              Round {r.roundNumber} — {r.pointsEarned} pts
            </span>
            <span className="game-breakdown__meta">
              {r.attempts} attempt{r.attempts === 1 ? '' : 's'} · {r.hintsUsed} hint{r.hintsUsed === 1 ? '' : 's'}
              {r.overtimeSeconds > 0 ? ` · ${r.overtimeSeconds}s overtime` : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="game-actions">
        <button type="button" className="game-button game-button--primary" onClick={onPlayAgain}>
          Play again
        </button>
        <button type="button" className="game-button game-button--ghost" onClick={onBackToMission}>
          Back to mission
        </button>
      </div>
    </motion.section>
  )
}

export { RoundResultPanel, SessionCompletePanel }