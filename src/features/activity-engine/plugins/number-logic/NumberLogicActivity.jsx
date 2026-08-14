/**
 * Activity Engine — number-logic renderer (Task 4.13).
 *
 * Pure React renderer for the number-logic plugin descriptor. Number / Logic
 * Challenge is CONSTRUCTED ENTRY — the student works out the answer and types
 * it (native inputs), never picking from visible choices. The answer surface
 * follows the payload's answerFormat:
 *
 *   - integer / decimal:  one number input
 *   - percent:            one number input with a "%" suffix
 *   - fraction:           two number inputs joined by "/" ("a/b" form)
 *   - expression:         one text input (scored against authored accepted
 *                         forms; NO eval on any machine)
 *   - sequence:           a dynamic list of number inputs ("Add value" —
 *                         the expected count is stated in the problem text)
 *   - parts[]:            multi-step — each part gets its own labeled input
 *                         surface (per-part credit is decided server-side)
 *   - showWork:           a non-scored scratchpad the student may use to
 *                         reason on-screen (never submitted)
 *
 * Correct answers never reach this component — it consumes only the
 * client-safe render descriptor (problem, answerFormat, inputMode, showWork,
 * part labels) and hands the submitted `{ value }` / `{ values }` /
 * `{ parts }` payload back to the caller, which is scored server-side.
 */

import { useState } from 'react'
import {
  createNumberLogicState,
  setValue as recordValue,
  setFraction as recordFraction,
  setSequenceElement,
  addSequenceElement,
  removeSequenceElement,
  setPartValue,
  setPartFraction,
  setPartSequenceElement,
  addPartSequenceElement,
  removePartSequenceElement,
  isComplete,
  clear as clearNumberLogic,
  buildResponse,
} from './number-logic-controller.js'
import './number-logic.css'

const SEQUENCE_HINT = 'Enter the values separated into separate boxes, one per position.'

function NumericInput({
  id,
  label,
  value,
  inputMode,
  suffix = null,
  disabled,
  submitted,
  describedBy = null,
  onChange,
}) {
  return (
    <div className="nl-field">
      <label className="nl-field-label" htmlFor={id}>
        {label}
      </label>
      <span className="nl-field-control">
        <input
          id={id}
          className="nl-input"
          type="number"
          inputMode={inputMode === 'text' ? 'text' : 'decimal'}
          step="any"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled || submitted}
          onChange={onChange}
          aria-describedby={describedBy ?? undefined}
        />
        {suffix ? <span className="nl-field-suffix" aria-hidden="true">{suffix}</span> : null}
      </span>
    </div>
  )
}

function TextInput({ id, label, value, disabled, submitted, describedBy = null, onChange }) {
  return (
    <div className="nl-field">
      <label className="nl-field-label" htmlFor={id}>
        {label}
      </label>
      <span className="nl-field-control">
        <input
          id={id}
          className="nl-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled || submitted}
          onChange={onChange}
          aria-describedby={describedBy ?? undefined}
        />
      </span>
    </div>
  )
}

/** The input surface for one answer slot (single value, fraction, or text). */
function SingleSurface({
  prefixId,
  format,
  inputMode,
  raw,
  num,
  den,
  disabled,
  submitted,
  onRaw,
  onFraction,
}) {
  if (format === 'fraction') {
    return (
      <div className="nl-single-row">
        <NumericInput
          id={`${prefixId}-num`}
          label="Numerator"
          value={num}
          inputMode={inputMode}
          disabled={disabled}
          submitted={submitted}
          onChange={(e) => onFraction(e.target.value, den)}
        />
        <span className="nl-fraction-slash" aria-hidden="true">/</span>
        <NumericInput
          id={`${prefixId}-den`}
          label="Denominator"
          value={den}
          inputMode={inputMode}
          disabled={disabled}
          submitted={submitted}
          onChange={(e) => onFraction(num, e.target.value)}
        />
      </div>
    )
  }
  if (format === 'expression') {
    return (
      <TextInput
        id={`${prefixId}-value`}
        label="Your answer"
        value={raw}
        disabled={disabled}
        submitted={submitted}
        describedBy="nl-expr-note"
        onChange={(e) => onRaw(e.target.value)}
      />
    )
  }
  return (
    <NumericInput
      id={`${prefixId}-value`}
      label="Your answer"
      value={raw}
      inputMode={inputMode}
      suffix={format === 'percent' ? '%' : null}
      disabled={disabled}
      submitted={submitted}
      onChange={(e) => onRaw(e.target.value)}
    />
  )
}

/** The dynamic list surface for a sequence (single-part or a part). */
function SequenceSurface({
  prefixId,
  values,
  disabled,
  submitted,
  onSet,
  onAdd,
  onRemove,
}) {
  return (
    <div className="nl-sequence" role="group" aria-label="Sequence values">
      <p className="nl-sequence-note" id="nl-sequence-note">
        {SEQUENCE_HINT}
      </p>
      {values.map((value, index) => (
        <div className="nl-sequence-row" key={`${prefixId}-seq-${index}`}>
          <NumericInput
            id={`${prefixId}-seq-${index}`}
            label={`Value ${index + 1}`}
            value={value}
            inputMode="decimal"
            disabled={disabled}
            submitted={submitted}
            describedBy="nl-sequence-note"
            onChange={(e) => onSet(index, e.target.value)}
          />
          <button
            type="button"
            className="nl-remove-button"
            disabled={disabled || submitted || values.length <= 2}
            onClick={() => onRemove(index)}
            aria-label={`Remove value ${index + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="nl-add-button"
        disabled={disabled || submitted || values.length >= 12}
        onClick={onAdd}
      >
        Add value
      </button>
    </div>
  )
}

export function NumberLogicActivity({
  descriptor,
  hints = [],
  disabled = false,
  submitted = false,
  onSubmit,
}) {
  const [state, setState] = useState(() =>
    createNumberLogicState({
      answerFormat: descriptor.answerFormat,
      parts: descriptor.parts ?? [],
    })
  )
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')
  const [work, setWork] = useState('')
  const startedAt = useState(() => Date.now())[0]

  const multi = Boolean(descriptor.parts && descriptor.parts.length > 0)
  const ready = isComplete(state)
  const inputMode = descriptor.inputMode ?? 'numeric'

  function announceText(text) {
    setAnnounce(text)
  }

  function partOf(partId) {
    return state.multi ? state.parts.find((part) => part.id === partId) : null
  }

  function handleRaw(value) {
    const next = recordValue(state, value)
    setState(next)
    if (value.trim() === '') announceText('Answer cleared.')
  }

  function handleFraction(num, den) {
    setState(recordFraction(state, num, den))
  }

  function handleClear() {
    if (disabled || submitted) return
    setState(clearNumberLogic(state))
    if (multi) announceText('All parts cleared.')
    else announceText('Answer cleared.')
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

  const visibleHints = hints.slice(0, hintsRevealed)
  const progressText = multi
    ? `${state.parts.filter((part) =>
        part.answerFormat === 'sequence'
          ? part.values.length >= 2 && part.values.every((v) => v.trim() !== '')
          : part.answerFormat === 'fraction'
            ? part.num.trim() !== '' && part.den.trim() !== ''
            : part.raw.trim() !== ''
      ).length} / ${state.parts.length} parts filled`
    : descriptor.answerFormat === 'sequence'
      ? `${state.values.filter((v) => v.trim() !== '').length} value(s) entered`
      : descriptor.answerFormat === 'fraction'
        ? `${state.num.trim() !== '' && state.den.trim() !== '' ? '1' : '0'} / 1 part filled`
        : `${state.raw.trim() !== '' ? '1' : '0'} / 1 value entered`

  return (
    <div className="nl-activity" data-activity="number-logic">
      <div aria-live="polite" className="nl-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="nl-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="nl-instructions">{descriptor.instructions}</p> : null}

      <div className="nl-progress" aria-live="polite">
        {progressText}
      </div>

      <div className="nl-challenge" role="region" aria-label="Challenge">
        <p className="nl-problem">{descriptor.problem}</p>
      </div>

      {multi ? (
        <ol className="nl-parts" aria-label="Answer each step">
          {descriptor.parts.map((part) => {
            const current = partOf(part.id)
            if (!current) return null
            return (
              <li key={part.id} className="nl-part">
                <div className="nl-part-heading">
                  <span className="nl-part-step">Step {descriptor.parts.indexOf(part) + 1}</span>
                  <span className="nl-part-label">{part.label}</span>
                </div>
                {part.answerFormat === 'sequence' ? (
                  <SequenceSurface
                    prefixId={`part-${part.id}`}
                    values={current.values}
                    disabled={disabled}
                    submitted={submitted}
                    onSet={(index, value) => setState(setPartSequenceElement(state, part.id, index, value))}
                    onAdd={() => setState(addPartSequenceElement(state, part.id))}
                    onRemove={(index) => setState(removePartSequenceElement(state, part.id, index))}
                  />
                ) : (
                  <SingleSurface
                    prefixId={`part-${part.id}`}
                    format={part.answerFormat}
                    inputMode={inputMode}
                    raw={current.raw}
                    num={current.num}
                    den={current.den}
                    disabled={disabled}
                    submitted={submitted}
                    onRaw={(value) => setState(setPartValue(state, part.id, value))}
                    onFraction={(num, den) => setState(setPartFraction(state, part.id, num, den))}
                  />
                )}
              </li>
            )
          })}
        </ol>
      ) : descriptor.answerFormat === 'sequence' ? (
        <SequenceSurface
          prefixId="answer"
          values={state.values}
          disabled={disabled}
          submitted={submitted}
          onSet={(index, value) => setState(setSequenceElement(state, index, value))}
          onAdd={() => setState(addSequenceElement(state))}
          onRemove={(index) => setState(removeSequenceElement(state, index))}
        />
      ) : (
        <SingleSurface
          prefixId="answer"
          format={descriptor.answerFormat}
          inputMode={inputMode}
          raw={state.raw}
          num={state.num}
          den={state.den}
          disabled={disabled}
          submitted={submitted}
          onRaw={handleRaw}
          onFraction={handleFraction}
        />
      )}

      {descriptor.showWork ? (
        <div className="nl-work">
          <label className="nl-work-label" htmlFor="nl-work-area">
            Show your work
          </label>
          <textarea
            id="nl-work-area"
            className="nl-work-area"
            rows={3}
            placeholder="Jot your reasoning here (not submitted)."
            value={work}
            disabled={disabled || submitted}
            onChange={(e) => setWork(e.target.value)}
          />
          <span className="nl-work-note">This scratch area is not part of your answer.</span>
        </div>
      ) : null}

      <div className="nl-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="nl-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        <button type="button" className="nl-reset-button" disabled={disabled || submitted} onClick={handleClear}>
          Clear
        </button>
        <button
          type="button"
          className="nl-submit-button"
          disabled={!ready || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : 'Submit'}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="nl-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="nl-hint">
              <span className="nl-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="nl-submitted" role="status">
          <strong>Answer submitted — waiting for server scoring.</strong> Correctness and partial
          credit are evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default NumberLogicActivity