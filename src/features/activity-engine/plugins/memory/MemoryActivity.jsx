/**
 * Activity Engine — memory renderer (Task 4.11).
 *
 * Pure React renderer for the memory plugin descriptor. Memory is a genuine
 * two-phase RECALL interaction:
 *
 *   1. MEMORIZE phase — the full deck is displayed for the schema's
 *      `revealSeconds` countdown. The UI announces the memory phase. The
 *      student observes the cards (the public memorization material).
 *   2. RECALL phase   — the deck is re-shuffled and presented WITHOUT any
 *      grouping; the student reconstructs the authored groups (pairs or sets)
 *      from memory by selecting cards and confirming each group. Placed
 *      groups stack below; every card must be placed before submission.
 *
 * The correct grouping never reaches this component — it consumes only the
 * client-safe render descriptor (deck + recall prompt + deckType +
 * revealSeconds + maxAttempts) and hands the submitted
 * `{ groups: [{ cardIds }] }` payload to the caller, which is scored
 * server-side. All interaction rules reduce to the controller operations in
 * `memory-controller.js` (unit-tested in Node).
 */

import { useEffect, useState } from 'react'
import {
  createMemoryState,
  startRecall,
  reviewAgain,
  canReviewAgain,
  toggleCard,
  canPlaceGroup,
  placeGroup,
  removeGroup,
  clearSelection,
  clear as clearMemory,
  isComplete,
  buildResponse,
  isMemorizing,
  isRecalling,
  remainingCardIds,
  minGroupSize,
  maxGroupSize,
} from './memory-controller.js'
import './memory.css'

function imageSource(ref) {
  if (!ref) return ''
  return /^https?:\/\//.test(ref) ? ref : `/${ref}`
}

function cardLabel(card) {
  if (card.text) return card.text
  if (card.imageRef) return card.ariaLabel || 'Image card'
  return card.id
}

/** One card in the deck grid / recall pool. */
function MemoryCard({ card, selected = false, placed = false, disabled = false, onToggle }) {
  const label = card.ariaLabel || cardLabel(card)
  const classes = ['memory-card']
  if (selected) classes.push('is-selected')
  if (placed) classes.push('is-placed')
  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-pressed={selected}
      disabled={disabled || placed}
      onClick={onToggle}
    >
      {card.imageRef ? (
        <img className="memory-card-img" src={imageSource(card.imageRef)} alt="" draggable={false} />
      ) : null}
      {card.text ? <span className="memory-card-text">{card.text}</span> : null}
      <span className="memory-card-name">{label}</span>
    </button>
  )
}

export function MemoryActivity({
  descriptor,
  hints = [],
  disabled = false,
  submitted = false,
  onSubmit,
}) {
  const [state, setState] = useState(() =>
    createMemoryState({
      cards: Array.isArray(descriptor.cards) ? descriptor.cards : [],
      deckType: descriptor.deckType,
      maxAttempts: descriptor.maxAttempts,
    })
  )
  const [secondsLeft, setSecondsLeft] = useState(() =>
    typeof descriptor.revealSeconds === 'number' ? descriptor.revealSeconds : 10
  )
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')
  const startedAt = useState(() => Date.now())[0]

  const memorizing = isMemorizing(state)
  const recalling = isRecalling(state)
  const cards = state.cards
  const pool = recalling ? remainingCardIds(state) : cards.map((card) => card.id)
  const selected = state.selected
  const ready = isComplete(state)
  const groupMin = minGroupSize(state)
  const groupMax = maxGroupSize(state)
  const placedCount = state.groups.reduce((sum, group) => sum + group.length, 0)

  // Memorize countdown: auto-transition to recall when it reaches zero.
  useEffect(() => {
    if (!memorizing) return undefined
    if (secondsLeft <= 0) {
      setState((prev) => startRecall(prev))
      setAnnounce('The memory phase is over. Now recall the groups from memory.')
      return undefined
    }
    const id = setInterval(() => setSecondsLeft((value) => value - 1), 1000)
    return () => clearInterval(id)
  }, [memorizing, secondsLeft])

  function announceText(text) {
    setAnnounce(text)
  }

  function handleReady() {
    if (disabled || submitted || !memorizing) return
    setState((prev) => startRecall(prev))
    setAnnounce('The memory phase is over. Now recall the groups from memory.')
  }

  function handleStudyAgain() {
    if (disabled || submitted || !canReviewAgain(state)) return
    setState((prev) => reviewAgain(prev))
    setSecondsLeft(descriptor.revealSeconds ?? 10)
    setAnnounce('You are back in the memory phase. Study the deck again.')
  }

  function handleToggle(cardId) {
    if (disabled || submitted || !recalling) return
    const wasSelected = state.selected.includes(cardId)
    const next = toggleCard(state, cardId)
    setState(next)
    if (next !== state) {
      announceText(`${cardLabel(cards.find((c) => c.id === cardId) ?? {})} ${wasSelected ? 'removed from' : 'added to'} the group.`)
    }
  }

  function handlePlaceGroup() {
    if (disabled || submitted || !canPlaceGroup(state)) return
    setState((prev) => placeGroup(prev))
    announceText('Group placed.')
  }

  function handleRemoveGroup(index) {
    if (disabled || submitted) return
    setState((prev) => removeGroup(prev, index))
    announceText('Group removed. Its cards are back in the pool.')
  }

  function handleClearSelection() {
    if (disabled || submitted) return
    const next = clearSelection(state)
    if (next !== state) {
      setState(next)
      announceText('Selection cleared.')
    }
  }

  function handleClear() {
    if (disabled || submitted) return
    setState((prev) => clearMemory(prev))
    announceText('All groups cleared.')
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
      timeTakenSec: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    }
    onSubmit({ response, interactionMetrics })
  }

  const groupSizeText =
    groupMin === groupMax
      ? `each group holds ${groupMin} cards`
      : `each group holds ${groupMin}–${groupMax} cards`
  const progressText = recalling ? `${placedCount} of ${cards.length} cards placed` : ''
  const visibleHints = hints.slice(0, hintsRevealed)

  return (
    <div className="memory-activity" data-activity="memory">
      <div aria-live="polite" className="memory-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="memory-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="memory-instructions">{descriptor.instructions}</p> : null}

      <div className="memory-phase-badge" role="status">
        {memorizing ? (
          <span className="memory-badge memory-badge-memorize">Memory Phase — study the deck</span>
        ) : (
          <span className="memory-badge memory-badge-recall">Recall Phase — rebuild the groups</span>
        )}
      </div>

      {descriptor.recallPrompt ? (
        <p className="memory-recall-prompt">
          <strong>Your goal:</strong> {descriptor.recallPrompt}
        </p>
      ) : null}

      {memorizing ? (
        <section className="memory-memorize" aria-label="Memory phase">
          <div className="memory-countdown" role="timer" aria-live="polite" aria-atomic="true">
            <span className="memory-countdown-value">{secondsLeft}</span>
            <span className="memory-countdown-label">seconds to study{secondsLeft === 0 ? ' (done)' : ''}</span>
          </div>
          <p className="memory-memorize-note">
            Observe the deck below. Remember which cards belong together ({groupSizeText}).
            The cards will hide when the countdown ends.
          </p>
          <div className="memory-deck" role="group" aria-label="Deck to memorize">
            {cards.map((card) => (
              <MemoryCard key={card.id} card={card} disabled={disabled || submitted} />
            ))}
          </div>
          <div className="memory-controls">
            <button
              type="button"
              className="memory-ready-button"
              disabled={disabled || submitted}
              onClick={handleReady}
            >
              I&apos;m ready — start recall
            </button>
          </div>
        </section>
      ) : null}

      {recalling ? (
        <section className="memory-recall" aria-label="Recall phase">
          <div className="memory-progress" aria-live="polite">
            {progressText}
          </div>
          <p className="memory-recall-note">
            Rebuild the groups from memory. Select cards, then place each group.
            {groupMax > groupMin ? ` Groups hold ${groupMin}–${groupMax} cards.` : ` Each group holds exactly ${groupMin} cards.`}
          </p>

          <div className="memory-pool" role="group" aria-label="Cards to group">
            {pool.map((cardId) => {
              const card = cards.find((c) => c.id === cardId)
              if (!card) return null
              const isSelected = selected.includes(cardId)
              return (
                <MemoryCard
                  key={cardId}
                  card={card}
                  selected={isSelected}
                  disabled={disabled || submitted}
                  onToggle={() => handleToggle(cardId)}
                />
              )
            })}
          </div>

          <div className="memory-selection" aria-live="polite">
            {selected.length > 0 ? (
              <p className="memory-selection-label">
                Selected ({selected.length}/{groupMax}):{' '}
                {selected.map((id) => cardLabel(cards.find((c) => c.id === id) ?? {})).join(', ')}
              </p>
            ) : (
              <p className="memory-selection-label">No cards selected yet.</p>
            )}
            <div className="memory-controls">
              <button
                type="button"
                className="memory-place-button"
                disabled={disabled || submitted || !canPlaceGroup(state)}
                onClick={handlePlaceGroup}
              >
                Place group
              </button>
              <button
                type="button"
                className="memory-clear-selection-button"
                disabled={disabled || submitted || selected.length === 0}
                onClick={handleClearSelection}
              >
                Clear selection
              </button>
            </div>
          </div>

          {state.groups.length > 0 ? (
            <div className="memory-groups" role="group" aria-label="Placed groups">
              <p className="memory-groups-title">
                Your groups ({state.groups.length})
              </p>
              {state.groups.map((group, index) => (
                <div key={index} className="memory-group">
                  <span className="memory-group-cards">
                    {group.map((id) => cardLabel(cards.find((c) => c.id === id) ?? {})).join(' · ')}
                  </span>
                  <button
                    type="button"
                    className="memory-group-remove"
                    disabled={disabled || submitted}
                    onClick={() => handleRemoveGroup(index)}
                    aria-label={`Remove group ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="memory-controls">
            {canReviewAgain(state) ? (
              <button
                type="button"
                className="memory-study-button"
                disabled={disabled || submitted}
                onClick={handleStudyAgain}
              >
                Study again
              </button>
            ) : null}
            {hints.length > 0 ? (
              <button
                type="button"
                className="memory-hint-button"
                disabled={disabled || submitted || hintsRevealed >= hints.length}
                onClick={revealNextHint}
              >
                Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
              </button>
            ) : null}
            <button type="button" className="memory-reset-button" disabled={disabled || submitted} onClick={handleClear}>
              Clear
            </button>
            <button
              type="button"
              className="memory-submit-button"
              disabled={!ready || disabled || submitted}
              onClick={handleSubmit}
            >
              {submitted ? 'Submitted' : `Submit (${progressText})`}
            </button>
          </div>
        </section>
      ) : null}

      {hintsRevealed > 0 ? (
        <ul className="memory-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="memory-hint">
              <span className="memory-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="memory-submitted" role="status">
          <strong>Memory submitted — waiting for server scoring.</strong> Correctness and
          partial credit are evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default MemoryActivity