import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Navigate, useNavigate } from 'react-router'
import { useMissionSelection } from '../features/mission/selection/use-mission-selection.js'
import { SELECTION_STEP } from '../features/mission/selection/selection-state.js'
import { isExpiredSession } from '../features/mission/session-guard.js'
import tokenStorage from '../features/student/session/token-storage.js'
import { useStudentMe } from '../features/student/api/queries.js'
import StreamIcon, { STREAM_ASSETS, GAME_ASSETS } from './stream-icons.jsx'
import './student-mission.css'

const STATUS_LABEL = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'Available',
}

function ProgressStrip({ active }) {
  const steps = ['Register', 'Choose stream', 'Launch mission']
  return (
    <div className="sm-progress" role="presentation">
      {steps.map((label, i) => (
        <span key={label} className="sm-progress__item">
          <span
            className={`sm-progress__dot${i + 1 === active ? ' sm-progress__dot--active' : ''}`}
            aria-hidden="true"
          />
          <span
            className={`sm-progress__label${i + 1 === active ? ' sm-progress__label--active' : ''}`}
          >
            {i + 1} · {label}
          </span>
        </span>
      ))}
    </div>
  )
}

export { ProgressStrip }

export default function StudentMissionPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [token, setToken] = useState(() => tokenStorage.read())
  const me = useStudentMe(token)
  const selection = useMissionSelection(token)

  useEffect(() => {
    if (isExpiredSession(selection.streamsQuery, token)) {
      tokenStorage.clear()
      setToken(null)
    }
  }, [selection.streamsQuery, token])

  if (!token) {
    return <Navigate to="/student/register" replace />
  }

  return (
    <main className="sm-page">
      <div className="sm-glow" aria-hidden="true" />
      <div className="sm-particles" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="sm-particle"
            style={{
              left: `${(i * 8.5) % 100}%`,
              animationDuration: `${6 + (i % 5) * 2}s`,
              animationDelay: `${(i % 3) * 1.5}s`,
            }}
          />
        ))}
      </div>

      <div className="sm-header-banner">
        <header className="sm-header">
          <div className="sm-header__brand">
            <h1>STEM QUEST</h1>
            {me.data?.student ? (
              <p className="sm-greeting">Welcome Explorer {me.data.student.name}! Choose your portal.</p>
            ) : null}
          </div>
        </header>
      </div>

      <div className="sm-card">
        {selection.streamsQuery.isLoading ? (
          <p className="sm-status" role="status">
            Initializing Gaming Portals…
          </p>
        ) : selection.streamsQuery.isError ? (
          <div className="sm-error" role="alert">
            <p>We couldn’t load your mission right now.</p>
            <button
              type="button"
              className="sm-button sm-button--ghost"
              onClick={() => selection.streamsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : (
          <StepView
            reduceMotion={reduceMotion}
            selection={selection}
            onBegin={() =>
              navigate('/student/game', {
                state: {
                  streamId: selection.selectedStreamId,
                  levelId: selection.selectedLevelId,
                },
              })
            }
          />
        )}
      </div>
    </main>
  )
}

function StepView({ reduceMotion, selection, onBegin }) {
  const { state } = selection
  if (state.step === SELECTION_STEP.LEVELS || state.step === SELECTION_STEP.READY) {
    if (!selection.selectedStream) {
      return <StreamPicker reduceMotion={reduceMotion} selection={selection} />
    }
    return (
      <LevelStep
        reduceMotion={reduceMotion}
        selection={selection}
        onBegin={onBegin}
      />
    )
  }
  return <StreamPicker reduceMotion={reduceMotion} selection={selection} />
}

export function StreamPicker({ reduceMotion, selection }) {
  return (
    <motion.div
      className="sm-step"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <ProgressStrip active={2} />
      <h2 className="sm-title">Select Your World</h2>
      <p className="sm-subtitle">Step into a STEM domain to unlock levels and earn star badges.</p>

      <div className="sm-streams">
        {selection.streams.map((stream) => {
          const assets = STREAM_ASSETS[stream.slug] || {}
          return (
            <button
              key={stream.id}
              type="button"
              className="sm-stream"
              data-stream={stream.slug}
              onClick={() => selection.chooseStream(stream)}
              aria-label={`${stream.name} — ${stream.unlockedCount} of ${stream.levelCount} levels open`}
            >
              <div className="sm-stream__band" />
              {assets.loop ? (
                <video
                  className="sm-stream__video-bg"
                  src={assets.loop}
                  poster={assets.bg}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.28,
                    pointerEvents: 'none',
                  }}
                />
              ) : null}

              <div className="sm-stream__body" style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="sm-stream__icon">
                    <div className="sm-stream__icon-glow" />
                    {assets.bg ? (
                      <img
                        src={assets.bg}
                        alt={stream.name}
                        className="sm-stream__icon-img"
                      />
                    ) : (
                      <StreamIcon slug={stream.slug} />
                    )}
                  </div>
                  <div>
                    <h3 className="sm-stream__name">{stream.name}</h3>
                    <span className="sm-stream__meta">
                      {stream.unlockedCount} / {stream.levelCount} Levels Unlocked
                    </span>
                  </div>
                </div>
                {stream.description ? (
                  <p className="sm-stream__desc">{stream.description}</p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

export function LevelStep({ reduceMotion, selection, onBegin }) {
  const { selectedStream, levelsQuery } = selection
  if (selection.state.step === SELECTION_STEP.READY) {
    return (
      <ReadyPanel
        reduceMotion={reduceMotion}
        selection={selection}
        onBegin={onBegin}
      />
    )
  }
  return (
    <motion.div
      className="sm-step"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <ProgressStrip active={2} />
      <div className="sm-step__head">
        <button
          type="button"
          className="sm-button sm-button--link"
          onClick={selection.goBackToStreams}
        >
          ← All Worlds
        </button>
      </div>
      <h2 className="sm-title">{selectedStream.name} World Map</h2>
      <p className="sm-subtitle">Follow the quest path to complete levels.</p>

      {levelsQuery.isLoading ? (
        <p className="sm-status" role="status">
          Loading level map…
        </p>
      ) : levelsQuery.isError ? (
        <div className="sm-error" role="alert">
          <p>We couldn’t load this stream’s levels.</p>
          <button
            type="button"
            className="sm-button sm-button--ghost"
            onClick={() => levelsQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="sm-levels-path">
          {levelsQuery.data.levels.map((level) => {
            const isCompleted = level.status === 'completed'
            const isLocked = !level.selectable
            const nodeStateClass = isCompleted
              ? 'sm-level-node--completed'
              : isLocked
              ? 'sm-level-node--locked'
              : 'sm-level-node--available'

            const nodeImg = isCompleted
              ? GAME_ASSETS.levelComplete
              : isLocked
              ? GAME_ASSETS.levelLocked
              : GAME_ASSETS.levelAvailable

            return (
              <button
                key={level.id}
                type="button"
                className={`sm-level-node ${nodeStateClass}`}
                disabled={!level.selectable}
                onClick={() => selection.chooseLevel(level)}
                aria-disabled={!level.selectable}
              >
                <img
                  src={nodeImg}
                  alt={level.name}
                  className={`sm-level-node__icon ${
                    isLocked
                      ? 'sm-level-node__icon--locked'
                      : isCompleted
                      ? 'sm-level-node__icon--completed'
                      : ''
                  }`}
                />
                <div className="sm-level-node__body">
                  <span className="sm-level-node__num">Level {level.number}</span>
                  <span className="sm-level-node__name">{level.name}</span>
                  <span
                    className={`sm-level-node__status sm-level-node__status--${
                      isLocked ? 'locked' : level.status
                    }`}
                  >
                    {isLocked ? 'Locked' : STATUS_LABEL[level.status] || 'Available'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

export function ReadyPanel({ reduceMotion, selection, onBegin }) {
  const { selectedStream, levelsQuery } = selection
  const level =
    levelsQuery.data?.levels.find((l) => Number(l.id) === Number(selection.selectedLevelId)) ?? null

  const [countdown, setCountdown] = useState(null)
  const streamAssets = STREAM_ASSETS[selectedStream?.slug] || {}

  const handleLaunch = () => {
    setCountdown(3)
  }

  useEffect(() => {
    if (countdown === null) return
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 700)
      return () => clearTimeout(timer)
    }
    if (countdown === 0) {
      onBegin()
    }
  }, [countdown, onBegin])

  return (
    <motion.div
      className="sm-step"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <ProgressStrip active={3} />
      <h2 className="sm-title">Ready for Launch?</h2>
      <div className="sm-ready">
        {streamAssets.bg ? (
          <div className="sm-ready__icon">
            <img src={streamAssets.bg} alt="" className="sm-ready__icon-img" />
          </div>
        ) : (
          <div className="sm-ready__icon" aria-hidden="true">
            <StreamIcon slug={selectedStream.slug} />
          </div>
        )}
        <p className="sm-ready__stream">{selectedStream.name}</p>
        <p className="sm-ready__level">
          Level {level ? level.number : ''} · {level ? level.name : ''}
        </p>

        {countdown !== null ? (
          <div className="sm-countdown">{countdown === 0 ? 'GO!' : countdown}</div>
        ) : null}
      </div>

      <div className="sm-ready__actions">
        {countdown === null ? (
          <button type="button" className="sm-button sm-button--primary" onClick={handleLaunch}>
            🚀 BEGIN MISSION
          </button>
        ) : null}
        <button type="button" className="sm-button sm-button--ghost" onClick={selection.goBackToLevels}>
          Change Level
        </button>
        <button type="button" className="sm-button sm-button--link" onClick={selection.goBackToStreams}>
          Change Stream
        </button>
      </div>
    </motion.div>
  )
}