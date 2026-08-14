/**
 * Activity Engine — ordering renderer (Task 4.6).
 *
 * Pure React renderer for the ordering plugin descriptor. Supports three
 * interaction paths that all reduce to the same controller operations
 * (`ordering-controller.js`, unit-tested in Node):
 *
 *   1. TAP / CLICK — select an item, then tap a target slot to move it there.
 *   2. DESKTOP POINTER DRAG — drag an item onto a target slot.
 *   3. ACCESSIBLE KEYBOARD — Up / Down buttons (and ArrowUp / ArrowDown)
 *      move the focused item one position at a time.
 *
 * Anchored positions are locked: their controls are disabled/announced as
 * locked and the controller guards every move. Correct answers never reach
 * this component — it consumes only the client-safe render descriptor (display
 * order, anchors, shuffle config) and hands the submitted `order` back to the
 * caller, which is scored server-side.
 */

import { useMemo, useRef, useState } from 'react'
import {
  createOrderState,
  moveItem,
  reset,
  isComplete,
  buildResponse,
} from './ordering-controller.js'
import './ordering.css'

export function OrderingActivity({
  descriptor,
  hints = [],
  disabled = false,
  reducedMotion = false,
  submitted = false,
  onSubmit,
}) {
  const anchors = useMemo(
    () => (Array.isArray(descriptor.anchors) ? descriptor.anchors : []),
    [descriptor]
  )
  const [state, setState] = useState(() =>
    createOrderState(descriptor.items.map((item) => item.id), anchors)
  )
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [dragSource, setDragSource] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [announce, setAnnounce] = useState('')

  const startedAt = useRef(Date.now())

  const itemById = useMemo(() => {
    const map = {}
    for (const item of descriptor.items) map[item.id] = item
    return map
  }, [descriptor])

  const lockedPositions = useMemo(() => new Set(anchors.map((a) => a.position)), [anchors])

  const ready = isComplete(state)
  const total = state.order.length

  function announceMove(fromIndex, toIndex) {
    const item = itemById[state.order[fromIndex]]
    setAnnounce(
      `${item ? item.ariaLabel : state.order[fromIndex]} moved to position ${toIndex + 1} of ${total}.`
    )
  }

  function handleSelect(index) {
    if (disabled || submitted) return
    if (lockedPositions.has(index)) {
      const item = itemById[state.order[index]]
      setAnnounce(
        `${item ? item.ariaLabel : state.order[index]} is locked in position ${index + 1} and cannot move.`
      )
      return
    }
    if (selectedIndex === null) {
      setSelectedIndex(index)
      const item = itemById[state.order[index]]
      setAnnounce(`${item ? item.ariaLabel : state.order[index]} selected. Use the Up or Down control, or tap a target slot.`)
      return
    }
    if (selectedIndex === index) {
      setSelectedIndex(null)
      setAnnounce('Selection cleared.')
      return
    }
    // Tap/click path: move the selected item to the tapped slot.
    const next = moveItem(state, selectedIndex, index)
    setState(next)
    announceMove(selectedIndex, index)
    setSelectedIndex(null)
  }

  function handleMoveBy(index, delta) {
    if (disabled || submitted) return
    const target = index + delta
    if (target < 0 || target >= total) return
    const next = moveItem(state, index, target)
    if (next === state) {
      setAnnounce(
        lockedPositions.has(index) || lockedPositions.has(target)
          ? 'That position is locked.'
          : 'The item is already in that position.'
      )
      return
    }
    setState(next)
    announceMove(index, target)
  }

  function handleDrop(targetIndex) {
    if (disabled || submitted || dragSource === null) return
    const from = dragSource
    setDragSource(null)
    setDragOver(null)
    if (from === targetIndex) return
    const next = moveItem(state, from, targetIndex)
    if (next === state) {
      setAnnounce('That position is locked.')
      return
    }
    setState(next)
    announceMove(from, targetIndex)
  }

  function handleKeyDown(event, index) {
    if (disabled || submitted) return
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      handleMoveBy(index, -1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      handleMoveBy(index, 1)
    }
  }

  function handleReset() {
    if (disabled || submitted) return
    setState(reset(state))
    setSelectedIndex(null)
    setAnnounce('Order reset to the starting arrangement.')
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
    <div className="ordering-activity" data-activity="ordering">
      <div aria-live="polite" className="ordering-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="ordering-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="ordering-instructions">{descriptor.instructions}</p> : null}

      <ol className="ordering-sequence">
        {state.order.map((itemId, index) => {
          const item = itemById[itemId] ?? { id: itemId, label: itemId, ariaLabel: itemId }
          const locked = lockedPositions.has(index)
          const isSelected = selectedIndex === index
          const draggable = !locked && !reducedMotion && !disabled && !submitted
          const slotLabel = locked
            ? `Position ${index + 1} of ${total}: ${item.ariaLabel}. Locked.`
            : `Position ${index + 1} of ${total}: ${item.ariaLabel}.`
          return (
<li
                key={index}
                className={`ordering-slot${locked ? ' is-anchored' : ''}${isSelected ? ' is-selected' : ''}${dragOver === index ? ' is-drag-over' : ''}`}
                data-position={index}
                onDragOver={(event) => {
                  if (!locked && !disabled && !submitted) {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDragOver(index)
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  handleDrop(index)
                }}
              >
              <span className="ordering-slot-index" aria-hidden="true">
                {index + 1}
              </span>

              <div className="ordering-slot-controls" aria-hidden="true">
                <button
                  type="button"
                  className="ordering-move ordering-move-up"
                  aria-label={`Move ${item.ariaLabel} up one position`}
                  aria-disabled={disabled || submitted || locked || index === 0}
                  disabled={disabled || submitted || locked || index === 0}
                  onClick={() => handleMoveBy(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="ordering-move ordering-move-down"
                  aria-label={`Move ${item.ariaLabel} down one position`}
                  aria-disabled={disabled || submitted || locked || index === total - 1}
                  disabled={disabled || submitted || locked || index === total - 1}
                  onClick={() => handleMoveBy(index, 1)}
                >
                  ↓
                </button>
              </div>

              <div
                className="ordering-item"
                draggable={draggable}
                role="button"
                tabIndex={disabled || submitted ? -1 : 0}
                aria-label={slotLabel}
                aria-pressed={isSelected}
                aria-disabled={disabled || submitted}
                aria-posinset={index + 1}
                aria-setsize={total}
                onClick={() => handleSelect(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  setDragSource(index)
                  setDragOver(index)
                  const text = itemById[itemId]?.ariaLabel ?? itemId
                  event.dataTransfer.setData('text/plain', text)
                }}
                onDragEnd={() => {
                  setDragSource(null)
                  setDragOver(null)
                }}
              >
                {item.image ? <img src={item.image.ref} alt={item.image.alt} /> : null}
                <span className="ordering-item-label">{item.label || item.id}</span>
                {locked ? (
                  <span className="ordering-lock" aria-hidden="true">
                    🔒
                  </span>
                ) : null}
              </div>

              <div className="ordering-slot-target" aria-hidden="true">
                {dragOver === index ? 'Drop here' : ''}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="ordering-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="ordering-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        <button type="button" className="ordering-reset-button" disabled={disabled || submitted} onClick={handleReset}>
          Clear
        </button>
        <button
          type="button"
          className="ordering-submit-button"
          disabled={!ready || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : 'Submit order'}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="ordering-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="ordering-hint">
              <span className="ordering-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="ordering-submitted" role="status">
          <strong>Order submitted — waiting for server scoring.</strong> Correctness and partial
          credit are evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default OrderingActivity