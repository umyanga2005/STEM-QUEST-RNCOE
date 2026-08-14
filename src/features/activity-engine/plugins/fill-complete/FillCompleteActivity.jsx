/**
 * Activity Engine — fill-complete renderer (Task 4.8).
 *
 * Pure React renderer for the fill-complete plugin descriptor. The student
 * reads the educational template and types a value into each `___` blank.
 * All state transitions reduce to the same controller operations
 * (`fill-complete-controller.js`, unit-tested in Node):
 *
 *   - type/update a blank value
 *   - reset all blanks back to empty
 *   - completion-gate the submit button
 *
 * Correct answers never reach this component — it consumes only the
 * client-safe render descriptor and hands the submitted `{ answers }`
 * payload back to the caller, which is scored server-side. No radio buttons,
 * no options: this is a blank-completion challenge, not an MCQ.
 */

import { useRef, useState } from 'react'
import {
  createFillState,
  setBlankValue,
  resetFill,
  isBlankAnswered,
  isComplete,
  answeredCount,
  buildResponse,
} from './fill-complete-controller.js'
import './fill-complete.css'

function BlankField({
  blank,
  index,
  value,
  answered,
  disabled,
  onValue,
}) {
  const inputId = `fill-blank-${blank.id}`
  const labelText = blank.label || `Blank ${index + 1}`
  const inputMode = blank.type === 'number' ? 'decimal' : 'text'
  return (
    <label className={`fill-blank${answered ? ' is-answered' : ''}`} htmlFor={inputId}>
      <span className="fill-blank-label">{labelText}</span>
      <span className="fill-blank-field">
        {blank.prefix ? (
          <span className="fill-blank-affix" aria-hidden="true">
            {blank.prefix}
          </span>
        ) : null}
        <input
          id={inputId}
          className="fill-blank-input"
          type="text"
          inputMode={inputMode}
          autoCapitalize={blank.type === 'text' ? 'sentences' : 'none'}
          autoCorrect={blank.type === 'text' ? undefined : 'off'}
          spellCheck={blank.type === 'text'}
          maxLength={blank.maxLength || 24}
          value={value}
          disabled={disabled}
          aria-label={`${labelText} — ${blank.type} answer`}
          onChange={(event) => onValue(blank.id, event.target.value)}
        />
        {blank.suffix ? (
          <span className="fill-blank-affix" aria-hidden="true">
            {blank.suffix}
          </span>
        ) : null}
      </span>
      <span className="fill-blank-hint-mark" aria-hidden="true">
        {answered ? 'answered' : ''}
      </span>
    </label>
  )
}

export function FillCompleteActivity({
  descriptor,
  hints = [],
  disabled = false,
  submitted = false,
  onSubmit,
}) {
  const [state, setState] = useState(() => createFillState(descriptor.blanks))
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')
  const [previousAnswered, setPreviousAnswered] = useState(() => new Set())

  const startedAt = useRef(Date.now())

  const total = state.entries.length
  const answered = answeredCount(state)
  const ready = isComplete(state)

  function announceChange(blankId, value) {
    const wasAnswered = previousAnswered.has(blankId)
    const nowAnswered = value.trim().length > 0
    if (nowAnswered === wasAnswered) {
      setPreviousAnswered((prev) => new Set(prev))
      return
    }
    const label = descriptor.blanks.find((b) => b.id === blankId)?.label || `Blank ${blankId}`
    setAnnounce(nowAnswered ? `${label} answered.` : `${label} cleared.`)
    setPreviousAnswered((prev) => {
      const next = new Set(prev)
      if (nowAnswered) next.add(blankId)
      else next.delete(blankId)
      return next
    })
  }

  function handleValue(blankId, value) {
    if (disabled || submitted) return
    const next = setBlankValue(state, blankId, value)
    setState(next)
    announceChange(blankId, value)
  }

  function handleReset() {
    if (disabled || submitted) return
    setState(resetFill(state))
    setPreviousAnswered(new Set())
    setAnnounce('All blanks cleared.')
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
  const segments = typeof descriptor.template === 'string'
    ? descriptor.template.split('___')
    : ['']

  return (
    <div className="fill-activity" data-activity="fill-complete">
      <div aria-live="polite" className="fill-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="fill-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="fill-instructions">{descriptor.instructions}</p> : null}

      <div className="fill-progress" aria-live="polite">
        <span className="fill-progress-pips" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`fill-pip${i < answered ? ' is-filled' : ''}`}
            />
          ))}
        </span>
        {answered} / {total} completed
      </div>

      <div className="fill-content" aria-label="Activity text with blanks">
        {segments.map((segment, i) => (
          <span key={i} className="fill-segment-wrap">
            <span className="fill-segment-text">{segment}</span>
            {i < descriptor.blanks.length ? (
              <BlankField
                blank={descriptor.blanks[i]}
                index={i}
                value={state.entries[i]?.value ?? ''}
                answered={isBlankAnswered(state, descriptor.blanks[i].id)}
                disabled={disabled || submitted}
                onValue={handleValue}
              />
            ) : null}
          </span>
        ))}
      </div>

      <div className="fill-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="fill-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        <button type="button" className="fill-reset-button" disabled={disabled || submitted} onClick={handleReset}>
          Clear
        </button>
        <button
          type="button"
          className="fill-submit-button"
          disabled={!ready || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : `Submit (${answered}/${total})`}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="fill-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="fill-hint">
              <span className="fill-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="fill-submitted" role="status">
          <strong>Fill &amp; complete submitted — waiting for server scoring.</strong> Correctness and
          partial credit are evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default FillCompleteActivity