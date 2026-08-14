/**
 * Activity Engine — scenario-challenge renderer (Task 4.12).
 *
 * Pure React renderer for the scenario plugin descriptor. Scenario Challenge
 * is a BRANCHED DECISION TREE (not an MCQ):
 *
 *   1. READ   — the mission (scenarioText) is presented.
 *   2. DECIDE — the current decision shows 2..4 decision branches as cards.
 *   3. CONSEQUENCE — the chosen branch's outcomeText is revealed.
 *   4. NEXT   — a non-terminal branch continues to the next decision; a
 *      terminal branch ends the scenario and unlocks submission.
 *
 * The renderer consumes only the client-safe descriptor: the PUBLIC tree
 * (decisions → options with nextDecision/outcomeText). The hidden answer
 * (optimalPath + acceptableOptions) never reaches this component — the server
 * decides whether the path taken is optimal. The component hands the
 * submitted `{ path: [{ decisionId, optionId }] }` payload to the caller,
 * which is scored server-side. All navigation rules reduce to the controller
 * operations in `scenario-challenge-controller.js` (unit-tested in Node).
 */

import { useState } from 'react'
import {
  createScenarioState,
  selectOption,
  isComplete,
  currentDecision,
  currentOptions,
  stepCount,
  lastOutcome,
  reset as resetScenario,
  buildResponse,
} from './scenario-challenge-controller.js'
import './scenario-challenge.css'

function scenarioProgress(descriptor, state) {
  const total = Array.isArray(descriptor.decisions) ? descriptor.decisions.length : 0
  return {
    made: stepCount(state),
    total,
    current: Math.min(stepCount(state) + 1, total),
  }
}

export function ScenarioChallengeActivity({
  descriptor,
  hints = [],
  disabled = false,
  submitted = false,
  onSubmit,
}) {
  const [state, setState] = useState(() =>
    createScenarioState({
      decisions: Array.isArray(descriptor.decisions) ? descriptor.decisions : [],
      entryDecision: descriptor.entryDecision,
    })
  )
  const [view, setView] = useState('decision') // decision | outcome | done
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')
  const startedAt = useState(() => Date.now())[0]

  const completed = isComplete(state)
  const decision = currentDecision(state)
  const options = currentOptions(state)
  const outcome = lastOutcome(state)
  const progress = scenarioProgress(descriptor, state)

  function handleChoose(optionId) {
    if (disabled || submitted || view !== 'decision') return
    const next = selectOption(state, optionId)
    if (next === state) return
    setState(next)
    const result = lastOutcome(next)
    if (isComplete(next)) {
      setView('done')
      setAnnounce(
        `Scenario complete. You chose: ${result.optionText}. ${result.outcomeText}`
      )
    } else {
      setView('outcome')
      setAnnounce(
        `You chose: ${result.optionText}. ${result.outcomeText}`
      )
    }
  }

  function handleContinue() {
    if (disabled || submitted || view !== 'outcome') return
    setView('decision')
    const next = currentDecision(state)
    setAnnounce(next ? `Next decision: ${next.text}` : '')
  }

  function handleRestart() {
    if (disabled || submitted) return
    setState((prev) => resetScenario(prev))
    setView('decision')
    setAnnounce('Scenario restarted. You are back at the first decision.')
  }

  function revealNextHint() {
    if (hintsRevealed >= hints.length) return
    const next = hints[hintsRevealed]
    setHintsRevealed((n) => n + 1)
    setAnnounce(`Hint: ${next.text}`)
  }

  function handleSubmit() {
    if (!completed || disabled || submitted) return
    const nextAttempt = attempts + 1
    setAttempts(nextAttempt)
    const response = buildResponse(state)
    const interactionMetrics = {
      attemptsUsed: nextAttempt,
      hintsUsed: hintsRevealed,
      timeTakenSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    }
    onSubmit({ response, interactionMetrics })
  }

  const visibleHints = hints.slice(0, hintsRevealed)
  const playDisabled = disabled || submitted
  const progressText = completed
    ? `Scenario complete — ${progress.made} decision${progress.made === 1 ? '' : 's'} made`
    : `Decision ${progress.current} of ${progress.total}`

  return (
    <div className="scenario-activity" data-activity="scenario-challenge">
      <div aria-live="polite" className="scenario-sr-live">
        {announce}
      </div>

      <header className="scenario-mission">
        {descriptor.prompt ? <h2 className="scenario-prompt">{descriptor.prompt}</h2> : null}
        <div className="scenario-progress" aria-live="polite">
          <span className="scenario-progress-value">{progressText}</span>
        </div>
        {descriptor.scenarioText ? (
          <p className="scenario-text">{descriptor.scenarioText}</p>
        ) : null}
        {descriptor.instructions ? (
          <p className="scenario-instructions">{descriptor.instructions}</p>
        ) : null}
      </header>

      {descriptor.media && descriptor.media.length > 0 ? (
        <figure className="scenario-media" role="group" aria-label="Scenario illustration">
          {descriptor.media.map((item, index) =>
            item.ref ? (
              <img
                key={item.ref}
                className="scenario-media-img"
                src={`/${item.ref}`}
                alt={item.alt}
                draggable={false}
              />
            ) : (
              <span key={`media-${index}`} className="scenario-media-empty" />
            )
          )}
        </figure>
      ) : null}

      {view === 'decision' && decision ? (
        <section className="scenario-decision" aria-label="Current decision">
          <h3 className="scenario-decision-title">
            Decision {progress.current} of {progress.total}
          </h3>
          <p className="scenario-decision-text">{decision.text}</p>
          <div className="scenario-options" role="group" aria-label="Decision options">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="scenario-option"
                disabled={playDisabled}
                onClick={() => handleChoose(option.id)}
              >
                <span className="scenario-option-text">{option.text}</span>
                <span className="scenario-option-action" aria-hidden="true">
                  Choose this path
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {view === 'outcome' && outcome ? (
        <section className="scenario-consequence" aria-label="Consequence" role="status">
          <h3 className="scenario-consequence-title">Consequence</h3>
          <p className="scenario-consequence-option">You chose: {outcome.optionText}</p>
          <p className="scenario-consequence-text">{outcome.outcomeText}</p>
          <div className="scenario-controls">
            <button
              type="button"
              className="scenario-continue-button"
              disabled={playDisabled}
              onClick={handleContinue}
            >
              Continue
            </button>
            <button
              type="button"
              className="scenario-restart-button"
              disabled={playDisabled}
              onClick={handleRestart}
            >
              Restart
            </button>
          </div>
        </section>
      ) : null}

      {view === 'done' && outcome ? (
        <section className="scenario-outcome" aria-label="Scenario outcome" role="status">
          <h3 className="scenario-outcome-title">Scenario complete</h3>
          <p className="scenario-outcome-option">Final choice: {outcome.optionText}</p>
          <p className="scenario-outcome-text">{outcome.outcomeText}</p>
          <p className="scenario-outcome-summary">
            You made {progress.made} decision{progress.made === 1 ? '' : 's'} through this scenario.
          </p>
          <div className="scenario-controls">
            <button
              type="button"
              className="scenario-submit-button"
              disabled={!completed || playDisabled}
              onClick={handleSubmit}
            >
              {submitted ? 'Submitted' : 'Submit scenario'}
            </button>
            <button
              type="button"
              className="scenario-restart-button"
              disabled={playDisabled}
              onClick={handleRestart}
            >
              Start over
            </button>
          </div>
        </section>
      ) : null}

      <div className="scenario-tools">
        {hints.length > 0 ? (
          <button
            type="button"
            className="scenario-hint-button"
            disabled={playDisabled || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
      </div>

      {visibleHints.length > 0 ? (
        <ul className="scenario-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="scenario-hint">
              <span className="scenario-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="scenario-submitted" role="status">
          <strong>Scenario submitted — waiting for server scoring.</strong> Correctness and
          partial credit are evaluated server-side; this preview shows the captured path only.
        </div>
      ) : null}
    </div>
  )
}

export default ScenarioChallengeActivity