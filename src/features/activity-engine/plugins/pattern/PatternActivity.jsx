/**
 * Activity Engine — pattern renderer (Task 4.10).
 *
 * Pure React renderer for the pattern plugin descriptor. The sequence is
 * drawn as a row of cells; one or more cells are the student's answer
 * surface:
 *
 *   - construct-next:    `constructCount` trailing empty cells (the NEXT
 *                        elements to construct).
 *   - fill-missing:      ONE hidden cell at `missingAt` (the hidden element).
 *   - complete-sequence: ONE trailing empty cell (the NEXT element).
 *
 * The student answers by choosing candidate(s) from the construction bank
 * (real buttons) and/or typing a value (native input, offered only when the
 * answer is a single element and every candidate can be expressed as text or
 * a number). Picking a candidate clears any typed value and vice-versa — the
 * two paths are mutually exclusive and reduce to the controller operations in
 * `pattern-controller.js` (unit-tested in Node).
 *
 * Correct answers never reach this component — it consumes only the
 * client-safe render descriptor (sequence + mode + public candidates + the
 * missingAt/constructCount slot markers) and hands the submitted
 * `{ selected: [...] }` / `{ value }` payload back to the caller, which is
 * scored server-side.
 */

import { useMemo, useState } from 'react'
import {
  createPatternState,
  selectCandidate,
  clear as clearPattern,
  setValue as recordValue,
  isComplete,
  buildResponse,
} from './pattern-controller.js'
import './pattern.css'

const SHAPE_GLYPHS = {
  circle: <circle cx="12" cy="12" r="8" />,
  square: <rect x="4" y="4" width="16" height="16" rx="2" />,
  triangle: <polygon points="12,4 22,20 2,20" />,
  diamond: <polygon points="12,3 21,12 12,21 3,12" />,
  star: <polygon points="12,2 14.6,8.6 21,9 16.2,13.8 17.6,20.4 12,16.8 6.4,20.4 7.8,13.8 3,9 9.4,8.6" />,
  hexagon: <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />,
  pentagon: <polygon points="12,2 21,9 17.5,20 6.5,20 3,9" />,
}

function ShapeGlyph({ shape }) {
  return (
    <svg className="pattern-shape" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {SHAPE_GLYPHS[shape] ?? null}
    </svg>
  )
}

function elementValueLabel(element) {
  if (element.number !== null) return String(element.number)
  if (element.text) return element.text
  if (element.shape) return element.shape
  return element.id
}

function imageSource(ref) {
  if (!ref) return ''
  return /^https?:\/\//.test(ref) ? ref : `/${ref}`
}

/** Displays one element's value: number, text, shape glyph, or image. */
function ElementValue({ element }) {
  if (element.number !== null) {
    return <span className="pattern-value-num">{element.number}</span>
  }
  if (element.text) {
    return <span className="pattern-value-text">{element.text}</span>
  }
  if (element.shape) {
    return <ShapeGlyph shape={element.shape} />
  }
  if (element.imageRef) {
    return (
      <span className="pattern-value-img-wrap">
        <img className="pattern-value-img" src={imageSource(element.imageRef)} alt="" draggable={false} />
      </span>
    )
  }
  return <span className="pattern-value-text">{element.id}</span>
}

/**
 * Builds the ordered list of cells to draw: known sequence elements plus the
 * answer cells (hidden slot for fill-missing, trailing slots otherwise).
 */
function buildCells(descriptor) {
  const interaction = descriptor.interaction
  const cells = []
  let slotIndex = 0
  const missingAt = interaction === 'fill-missing' ? descriptor.missingAt : -1

  descriptor.sequence.forEach((element, index) => {
    if (index === missingAt) {
      cells.push({ kind: 'answer', slotIndex: slotIndex++, key: `slot-${index}`, label: 'missing' })
    } else {
      cells.push({ kind: 'known', element, key: element.id })
    }
  })

  if (interaction !== 'fill-missing') {
    for (let i = 0; i < descriptor.units; i++) {
      cells.push({
        kind: 'answer',
        slotIndex: slotIndex++,
        key: `slot-next-${i}`,
        label: descriptor.units > 1 ? `next ${i + 1}` : 'next',
      })
    }
  }
  return cells
}

export function PatternActivity({
  descriptor,
  hints = [],
  disabled = false,
  submitted = false,
  onSubmit,
}) {
  const [state, setState] = useState(() =>
    createPatternState({
      interaction: descriptor.interaction,
      sequence: descriptor.sequence,
      candidates: descriptor.candidates,
      constructCount: descriptor.constructCount ?? descriptor.units ?? 1,
    })
  )
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')
  const startedAt = useState(() => Date.now())[0]

  const candidates = Array.isArray(descriptor.candidates) ? descriptor.candidates : []
  const ready = isComplete(state)

  const cells = useMemo(() => {
    const seq = Array.isArray(descriptor.sequence) ? descriptor.sequence : []
    const cands = Array.isArray(descriptor.candidates) ? descriptor.candidates : []
    return buildCells({ ...descriptor, sequence: seq, candidates: cands })
  }, [descriptor])

  /**
   * Native entry is offered for single-unit answers where every candidate is
   * expressible as text or a number. Typing switches to the typed path.
   */
  const entryTypable = useMemo(() => {
    const cands = Array.isArray(descriptor.candidates) ? descriptor.candidates : []
    return (
      descriptor.units === 1 &&
      cands.length > 0 &&
      cands.every((c) => c.number !== null || Boolean(c.text))
    )
  }, [descriptor.units, descriptor.candidates])
  const entryNumeric =
    entryTypable && candidates.every((c) => c.number !== null)

  const supplied =
    state.value !== null && state.value.trim() !== '' ? 1 : state.selected.length
  const progressText = `${supplied} / ${descriptor.units} supplied`

  function announceText(text) {
    setAnnounce(text)
  }

  function handleCandidatePress(candidateId) {
    if (disabled || submitted) return
    const wasSelected = state.selected.includes(candidateId)
    const next = selectCandidate(state, candidateId)
    setState(next)
    const label = elementValueLabel(candidates.find((c) => c.id === candidateId) ?? {})
    announceText(`${label} ${wasSelected ? 'deselected' : 'selected'}.`)
  }

  function handleTypeChange(event) {
    if (disabled || submitted) return
    const value = event.target.value
    const next = recordValue(state, value)
    setState(next)
    if (value.trim() === '') {
      announceText('Typed value cleared.')
    }
  }

  function handleClear() {
    if (disabled || submitted) return
    setState(clearPattern(state))
    announceText('Answer cleared.')
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

  function answerCellContent(cell) {
    const chosen = state.selected[cell.slotIndex]
    if (chosen) {
      const candidate = candidates.find((c) => c.id === chosen)
      if (candidate) return candidate
    }
    if (cell.slotIndex === 0 && state.value !== null && state.value.trim() !== '') {
      return { typed: state.value.trim() }
    }
    return null
  }

  function answerCellAria(cell, content) {
    if (!content) return `Empty ${cell.label} element`
    if (content.typed) return `Your answer element ${cell.slotIndex + 1}: ${content.typed}`
    return `Your answer element ${cell.slotIndex + 1}: ${elementValueLabel(content)}`
  }

  const visibleHints = hints.slice(0, hintsRevealed)

  return (
    <div className="pattern-activity" data-activity="pattern">
      <div aria-live="polite" className="pattern-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="pattern-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="pattern-instructions">{descriptor.instructions}</p> : null}

      <div className="pattern-progress" aria-live="polite">
        {progressText}
      </div>

      <div className="pattern-sequence" role="group" aria-label="Pattern sequence">
        {cells.map((cell) => {
          if (cell.kind === 'known') {
            return (
              <div
                key={cell.key}
                className="pattern-cell"
                aria-label={cell.element.ariaLabel || elementValueLabel(cell.element)}
                role="img"
              >
                <ElementValue element={cell.element} />
              </div>
            )
          }
          const content = answerCellContent(cell)
          const classes = ['pattern-cell', 'pattern-cell-answer']
          if (content) classes.push('is-filled')
          return (
            <div key={cell.key} className={classes.join(' ')} aria-label={answerCellAria(cell, content)} role="img">
              {content ? (
                content.typed ? (
                  <span className="pattern-value-text">{content.typed}</span>
                ) : (
                  <ElementValue element={content} />
                )
              ) : (
                <span className="pattern-cell-placeholder" aria-hidden="true">
                  ?
                </span>
              )}
            </div>
          )
        })}
      </div>

      {entryTypable ? (
        <div className="pattern-entry">
          <label className="pattern-entry-label" htmlFor="pattern-value-input">
            {entryNumeric ? 'Type a number, or pick from the bank below' : 'Type your answer, or pick from the bank below'}
          </label>
          <input
            id="pattern-value-input"
            className="pattern-entry-input"
            type={entryNumeric ? 'number' : 'text'}
            inputMode={entryNumeric ? 'decimal' : 'text'}
            autoComplete="off"
            spellCheck={false}
            value={state.value ?? ''}
            disabled={disabled || submitted}
            onChange={handleTypeChange}
            aria-describedby="pattern-entry-note"
          />
          <span id="pattern-entry-note" className="pattern-entry-note">
            Typing replaces your bank selection.
          </span>
        </div>
      ) : null}

      <div className="pattern-bank" role="group" aria-label="Elements to build your answer">
        {candidates.map((candidate) => {
          const selected = state.selected.includes(candidate.id)
          const classes = ['pattern-candidate']
          if (selected) classes.push('is-selected')
          return (
            <button
              key={candidate.id}
              type="button"
              className={classes.join(' ')}
              aria-pressed={selected}
              disabled={disabled || submitted}
              onClick={() => handleCandidatePress(candidate.id)}
            >
              <ElementValue element={candidate} />
              <span className="pattern-candidate-name">{candidate.ariaLabel || elementValueLabel(candidate)}</span>
            </button>
          )
        })}
      </div>

      <div className="pattern-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="pattern-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        <button type="button" className="pattern-reset-button" disabled={disabled || submitted} onClick={handleClear}>
          Clear
        </button>
        <button
          type="button"
          className="pattern-submit-button"
          disabled={!ready || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : `Submit (${progressText})`}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="pattern-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="pattern-hint">
              <span className="pattern-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="pattern-submitted" role="status">
          <strong>Pattern submitted — waiting for server scoring.</strong> Correctness and
          partial credit are evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default PatternActivity