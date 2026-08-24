import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useMissionSelection } from '../features/mission/selection/use-mission-selection.js'
import { SELECTION_STEP } from '../features/mission/selection/selection-state.js'
import { isExpiredSession } from '../features/mission/session-guard.js'
import tokenStorage from '../features/student/session/token-storage.js'
import { useStudentMe } from '../features/student/api/queries.js'
import StreamIcon from './stream-icons.jsx'
import './student-mission.css'

const STATUS_LABEL = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'New',
}

function ProgressStrip({ active }) {
  const steps = ['Register', 'Choose your stream', 'Begin the mission']
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
      <div className="sm-card">
        <header className="sm-header">
          <h1>STEM QUEST</h1>
          {me.data?.student ? (
            <p className="sm-greeting">Hi {me.data.student.name}</p>
          ) : null}
          <Link className="sm-button sm-button--link" to="/student/profile">
            View your profile
          </Link>
          <Link className="sm-button sm-button--link" to="/student/achievements">
            View your achievements
          </Link>
          <Link className="sm-button sm-button--link" to="/leaderboards">
            View live leaderboards
          </Link>
        </header>

        {selection.streamsQuery.isLoading ? (
          <p className="sm-status" role="status">
            Loading your mission…
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
      <h2 className="sm-title">Choose your stream</h2>
      <p className="sm-subtitle">Pick the STEM stream you want to explore.</p>

      <div className="sm-streams">
        {selection.streams.map((stream) => (
          <button
            key={stream.id}
            type="button"
            className="sm-stream"
            onClick={() => selection.chooseStream(stream)}
            aria-label={`${stream.name} — ${stream.unlockedCount} of ${stream.levelCount} levels open`}
          >
            <span className="sm-stream__icon" aria-hidden="true">
              <StreamIcon slug={stream.slug} />
            </span>
            <span className="sm-stream__name">{stream.name}</span>
            {stream.description ? (
              <span className="sm-stream__desc">{stream.description}</span>
            ) : null}
            <span className="sm-stream__meta">
              {stream.unlockedCount} of {stream.levelCount} levels open
            </span>
          </button>
        ))}
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
          ← All streams
        </button>
      </div>
      <h2 className="sm-title">{selectedStream.name}</h2>
      <p className="sm-subtitle">Choose a level to begin. You can always go back.</p>

      {levelsQuery.isLoading ? (
        <p className="sm-status" role="status">
          Loading levels…
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
        <div className="sm-levels">
          {levelsQuery.data.levels.map((level) => (
            <button
              key={level.id}
              type="button"
              className="sm-level"
              disabled={!level.selectable}
              onClick={() => selection.chooseLevel(level)}
              aria-disabled={!level.selectable}
            >
              <span className="sm-level__badge">{level.number}</span>
              <span className="sm-level__body">
                <span className="sm-level__name">{level.name}</span>
                {level.selectable ? (
                  <span className={`sm-level__status sm-level__status--${level.status}`}>
                    {STATUS_LABEL[level.status]}
                  </span>
                ) : (
                  <span className="sm-level__status sm-level__status--locked">
                    Locked
                  </span>
                )}
              </span>
              <span className="sm-level__arrow" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function ReadyPanel({ reduceMotion, selection, onBegin }) {
  const { selectedStream, levelsQuery } = selection
  const level =
    levelsQuery.data?.levels.find((l) => Number(l.id) === Number(selection.selectedLevelId)) ?? null
  return (
    <motion.div
      className="sm-step"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <ProgressStrip active={3} />
      <h2 className="sm-title">Ready to begin?</h2>
      <div className="sm-ready">
        <div className="sm-ready__icon" aria-hidden="true">
          <StreamIcon slug={selectedStream.slug} />
        </div>
        <p className="sm-ready__stream">{selectedStream.name}</p>
        <p className="sm-ready__level">
          Level {level ? level.number : ''} · {level ? level.name : ''}
        </p>
      </div>
      <div className="sm-ready__actions">
        <button type="button" className="sm-button sm-button--primary" onClick={onBegin}>
          Begin the mission
        </button>
        <button type="button" className="sm-button sm-button--ghost" onClick={selection.goBackToLevels}>
          Change level
        </button>
        <button type="button" className="sm-button sm-button--link" onClick={selection.goBackToStreams}>
          Change stream
        </button>
      </div>
    </motion.div>
  )
}