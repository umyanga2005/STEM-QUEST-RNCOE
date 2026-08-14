/**
 * Activity Engine — matching renderer (Task 4.5).
 *
 * Pure React renderer for the matching plugin descriptor. Tap/click, pointer,
 * touch, and full keyboard support; matched cards lock by association and can
 * be re-opened to reassign or cleared individually; progressive hints, retry,
 * and mobile-first responsive layout. All interaction logic lives in
 * `matching-controller.js` (unit-tested in Node), so this component only maps
 * events to those operations. Consumes ONLY the client-safe render descriptor
 * — correct answers never reach this component, and the merged target pool
 * does not reveal which targets are distractors.
 */

import { useMemo, useRef, useState } from 'react'
import {
  createMatchState,
  toggleSelect,
  chooseTarget,
  clearMatch,
  resetMatches,
  allMatched,
  buildResponse,
} from './matching-controller.js'
import './matching.css'

export function MatchingActivity({
  descriptor,
  hints = [],
  disabled = false,
  reducedMotion = false,
  submitted = false,
  onSubmit,
}) {
  const leftIds = useMemo(() => descriptor.leftItems.map((card) => card.id), [descriptor])
  const [state, setState] = useState(() => createMatchState(leftIds))
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')

  const startedAt = useRef(Date.now())

  const leftById = useMemo(() => {
    const map = {}
    for (const card of descriptor.leftItems) map[card.id] = card
    return map
  }, [descriptor])
  const targetById = useMemo(() => {
    const map = {}
    for (const card of descriptor.targets) map[card.id] = card
    return map
  }, [descriptor])

  const ready = allMatched(state)
  const allowRetry = descriptor.allowRetry !== false
  const matchedCount = state.leftIds.filter((id) => state.connections[id] !== null).length

  function handleLeftClick(leftId) {
    if (disabled || submitted) return
    if (reducedMotion) {
      selectCard(leftId)
      return
    }
    selectCard(leftId)
  }

  function selectCard(leftId) {
    const next = toggleSelect(state, leftId)
    setState(next)
    const card = leftById[leftId]
    if (next.selectedLeft === leftId) {
      setAnnounce(`${card ? card.ariaLabel : leftId} selected. Choose a target on the right.`)
    } else {
      setAnnounce('Selection cleared.')
    }
  }

  function handleTargetClick(rightId) {
    if (disabled || submitted) return
    const next = chooseTarget(state, rightId)
    setState(next)
    const card = targetById[rightId]
    if (state.selectedLeft !== null) {
      const left = leftById[state.selectedLeft]
      setAnnounce(
        `${left ? left.ariaLabel : state.selectedLeft} matched to ${card ? card.ariaLabel : rightId}.`
      )
    }
  }

  function handleClearMatch(leftId) {
    if (disabled || submitted) return
    const next = clearMatch(state, leftId)
    setState(next)
    const left = leftById[leftId]
    setAnnounce(`${left ? left.ariaLabel : leftId} match removed.`)
  }

  function handleReset() {
    if (disabled || submitted) return
    setState(resetMatches(state))
    setAnnounce('All matches cleared.')
  }

  function revealNextHint() {
    if (hintsRevealed >= hints.length) return
    const next = hints[hintsRevealed]
    setHintsRevealed((n) => n + 1)
    setAnnounce(`Hint: ${next.text}`)
  }

  function handleSubmit() {
    if (!ready || disabled || submitted) return
    const nextAttempt = attempts + 1
    setAttempts(nextAttempt)
    const response = buildResponse(state)
    const interactionMetrics = {
      attemptsUsed: nextAttempt,
      hintsUsed: hintsRevealed,
      timeTakenSec: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
    }
    onSubmit({ response, interactionMetrics })
  }

  const visibleHints = hints.slice(0, hintsRevealed)

  return (
    <div className="matching-activity" data-activity="matching">
      <div aria-live="polite" className="matching-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="matching-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="matching-instructions">{descriptor.instructions}</p> : null}

      <div className="matching-board">
        <section className="matching-column matching-left" aria-label="Cards to match">
          {descriptor.leftItems.map((card) => {
            const matchedTargetId = state.connections[card.id]
            const isSelected = state.selectedLeft === card.id
            return (
              <div
                key={card.id}
                className={`matching-card left${isSelected ? ' is-selected' : ''}${matchedTargetId !== null ? ' is-matched' : ''}`}
              >
                <button
                  type="button"
                  className="matching-left-button"
                  aria-label={matchedTargetId !== null ? `${card.ariaLabel} matched — select to change` : card.ariaLabel}
                  aria-pressed={isSelected}
                  disabled={disabled || submitted}
                  onClick={() => handleLeftClick(card.id)}
                >
                  {card.image ? <img src={card.image.ref} alt={card.image.alt} /> : null}
                  <span className="matching-card-text">{card.text}</span>
                </button>
                {matchedTargetId !== null ? (
                  <span className="matching-link-line" aria-hidden="true" />
                ) : null}
              </div>
            )
          })}
        </section>

        <section className="matching-column matching-right" aria-label="Targets">
          {descriptor.targets.map((card) => {
            return (
              <button
                type="button"
                key={card.id}
                className="matching-card right"
                aria-label={card.ariaLabel}
                disabled={disabled || submitted}
                onClick={() => handleTargetClick(card.id)}
              >
                {card.image ? <img src={card.image.ref} alt={card.image.alt} /> : null}
                <span className="matching-card-text">{card.text}</span>
              </button>
            )
          })}
        </section>
      </div>

      <div className="matching-connections" aria-label="Current matches">
        {state.leftIds.map((leftId) => {
          const rightId = state.connections[leftId]
          if (rightId === null) return null
          const left = leftById[leftId]
          const target = targetById[rightId]
          return (
            <div key={leftId} className="matching-connection">
              <span className="matching-connection-left">{left ? left.text : leftId}</span>
              <span className="matching-connection-arrow" aria-hidden="true">
                →
              </span>
              <span className="matching-connection-right">{target ? target.text : rightId}</span>
              <button
                type="button"
                className="matching-connection-clear"
                aria-label={`Clear match between ${left ? left.text : leftId} and ${target ? target.text : rightId}`}
                disabled={disabled || submitted}
                onClick={() => handleClearMatch(leftId)}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      <div className="matching-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="matching-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        {allowRetry ? (
          <button type="button" className="matching-reset-button" disabled={disabled || submitted} onClick={handleReset}>
            Clear
          </button>
        ) : null}
        <button
          type="button"
          className="matching-submit-button"
          disabled={!ready || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : `Submit (${matchedCount}/${state.leftIds.length})`}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="matching-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="matching-hint">
              <span className="matching-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="matching-submitted" role="status">
          <strong>Matched — waiting for server scoring.</strong> Correctness and partial credit are
          evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default MatchingActivity