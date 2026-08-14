import { useState } from 'react'
import './App.css'
import { DragDropActivity } from './features/activity-engine/plugins/drag-drop/index.js'
import { MatchingActivity } from './features/activity-engine/plugins/matching/index.js'
import { SortingActivity } from './features/activity-engine/plugins/sorting/index.js'
import { FillCompleteActivity } from './features/activity-engine/plugins/fill-complete/index.js'
import { ImageInteractionActivity } from './features/activity-engine/plugins/image-interaction/index.js'
import { PatternActivity } from './features/activity-engine/plugins/pattern/index.js'
import { MemoryActivity } from './features/activity-engine/plugins/memory/index.js'
import { ScenarioChallengeActivity } from './features/activity-engine/plugins/scenario-challenge/index.js'
import { NumberLogicActivity } from './features/activity-engine/plugins/number-logic/index.js'
import { gameApiClient } from './features/game-session/api/client.js'
import { DEMO_STUDENT_ID, DEMO_STREAM_ID, DEMO_LEVEL_ID } from './features/game-session/demo/seed-data.js'

/**
 * Task 4.4 demo — full server-authoritative session flow. This component is
 * presentation only: it renders a safe descriptor and POSTs captured
 * responses; correctness, scoring, and progression are decided by the
 * GameSessionService behind the API. No correct-answer data ever arrives here.
 */
export default function App() {
  const [phase, setPhase] = useState('lobby') // lobby | playing | done
  const [session, setSession] = useState(null)
  const [currentRound, setCurrentRound] = useState(null)
  const [rounds, setRounds] = useState([])
  const [finished, setFinished] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    setError(null)
    setRounds([])
    setFinished(null)
    try {
      const res = await gameApiClient.startSession({
        studentId: DEMO_STUDENT_ID,
        streamId: DEMO_STREAM_ID,
        levelId: DEMO_LEVEL_ID,
      })
      setSession(res.session)
      setCurrentRound(res.currentRound)
      setPhase('playing')
    } catch (err) {
      setError(err.message)
      setPhase('lobby')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit({ response, interactionMetrics }) {
    setBusy(true)
    setError(null)
    try {
      const res = await gameApiClient.submitRound({
        sessionId: session.id,
        roundId: currentRound.roundId,
        studentId: DEMO_STUDENT_ID,
        response,
        interactionMetrics,
      })
      setRounds((prev) => [
        ...prev,
        {
          roundNumber: currentRound.roundNumber,
          correct: res.roundResult.correct,
          pointsEarned: res.roundResult.pointsEarned,
          feedback: res.feedback,
          sessionRunningTotal: res.score.sessionRunningTotal,
        },
      ])
      if (res.nextRound) {
        setCurrentRound(res.nextRound)
      } else if (res.progress.completed) {
        const fin = await gameApiClient.finishSession({
          sessionId: session.id,
          studentId: DEMO_STUDENT_ID,
        })
        setFinished(fin)
        setCurrentRound(null)
        setPhase('done')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app-demo">
      <header className="demo-header">
        <h1>STEM QUEST</h1>
        <p className="tagline">The Educational Treasure Hunt</p>
        <p className="demo-sub">
          Task 4.4 — full game session service: question selection → Drag &amp; Drop → server
          validation → <strong>central scoring</strong> → final 0–300.
        </p>
      </header>

      {phase === 'lobby' ? (
        <section className="demo-panel">
          <h2>Start a session</h2>
          <p className="demo-sub">
            Starts a server-authoritative session: 3 questions are selected from the pool (seeded
            D-022), persisted, and the first round descriptor is returned. No answers ever reach the
            client except through the API.
          </p>
          <button className="demo-start" onClick={start} disabled={busy}>
            {busy ? 'Starting…' : 'Start session'}
          </button>
          {error ? <p className="demo-error">{error}</p> : null}
        </section>
      ) : null}

      {phase === 'playing' && session ? (
        <section className="demo-panel demo-session-info">
          <h2>Session #{session.sessionCode}</h2>
          <dl className="demo-dl">
            <div>
              <dt>Round</dt>
              <dd>
                {currentRound
                  ? `${currentRound.roundNumber} / ${currentRound.totalRounds}`
                  : 'done'}
              </dd>
            </div>
            <div>
              <dt>Running total</dt>
              <dd>
                {rounds.length
                  ? rounds[rounds.length - 1].sessionRunningTotal
                  : 0}{' '}
                / 300
              </dd>
            </div>
          </dl>
          {rounds.map((r, i) => (
            <p key={i} className={`demo-round-result ${r.correct ? 'ok' : 'warn'}`}>
              Round {r.roundNumber}: {r.pointsEarned} pts · {r.feedback.title}
            </p>
          ))}
          {error ? <p className="demo-error">{error}</p> : null}
        </section>
      ) : null}

      {phase === 'playing' && currentRound ? (
        <section className="demo-panel demo-activity">
          {currentRound.activity.kind === 'matching' ? (
            <MatchingActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : currentRound.activity.kind === 'sorting' ? (
            <SortingActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : currentRound.activity.kind === 'fill-complete' ? (
            <FillCompleteActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : currentRound.activity.kind === 'image-interaction' ? (
            <ImageInteractionActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : currentRound.activity.kind === 'pattern' ? (
            <PatternActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : currentRound.activity.kind === 'memory' ? (
            <MemoryActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : currentRound.activity.kind === 'scenario-challenge' ? (
            <ScenarioChallengeActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : currentRound.activity.kind === 'number-logic' ? (
            <NumberLogicActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          ) : (
            <DragDropActivity
              descriptor={currentRound.activity}
              hints={currentRound.hints}
              disabled={busy}
              onSubmit={handleSubmit}
              key={currentRound.roundId}
            />
          )}
          <p className="demo-sub">
            Timer is UX-only: {currentRound.timer.allowedSeconds}s allowed,{' '}
            {currentRound.timer.overtimePenaltyPerSecond}pt/s overtime (server-authoritative
            timestamps decide the score). Correctness &amp; score are computed server-side.
          </p>
        </section>
      ) : null}

      {phase === 'done' && finished ? (
        <section className="demo-panel demo-finished">
          <h2>Session complete</h2>
          <p className="demo-final-score">
            Final score: <strong>{finished.sessionScore}</strong> / 300 ({finished.roundBreakdown.length} rounds)
          </p>
          <ul className="demo-breakdown">
            {finished.roundBreakdown.map((r) => (
              <li key={r.roundNumber}>
                Round {r.roundNumber}: {r.pointsEarned} pts ({r.attempts} attempt
                {r.attempts === 1 ? '' : 's'}, {r.hintsUsed} hint
                {r.hintsUsed === 1 ? '' : 's'}, {r.overtimeSeconds}s overtime)
              </li>
            ))}
          </ul>
          <button className="demo-start" onClick={start}>
            Play again
          </button>
        </section>
      ) : null}
    </main>
  )
}