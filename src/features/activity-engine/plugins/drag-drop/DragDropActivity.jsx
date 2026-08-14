/**
 * Activity Engine — drag-drop renderer (Task 4.2).
 *
 * Pure React renderer for the drag-drop plugin descriptor. Pointer + touch
 * drag with a tap-to-select → tap-to-place fallback, full keyboard support,
 * progressive hints, retry, and mobile-first responsive layout. No external
 * drag library. Consumes ONLY the client-safe render descriptor — correct
 * answers never reach this component.
 */

import { useMemo, useRef, useState } from 'react'
import './drag-drop.css'

const DRAG_THRESHOLD_PX = 6
const TRAY_ZONE = '__tray__'

export function DragDropActivity({
  descriptor,
  hints = [],
  disabled = false,
  reducedMotion = false,
  submitted = false,
  onSubmit,
}) {
  const initialPlacements = useMemo(() => {
    const map = {}
    for (const item of descriptor.items) map[item.id] = null
    return map
  }, [descriptor])

  const [placements, setPlacements] = useState(initialPlacements)
  const [selectedItem, setSelectedItem] = useState(null)
  const [dragItem, setDragItem] = useState(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [dragOverZone, setDragOverZone] = useState(null)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')
  const [moved, setMoved] = useState(false)

  const dragStart = useRef({ x: 0, y: 0 })
  const startedAt = useRef(Date.now())

  const placedCount = descriptor.items.filter((item) => placements[item.id] !== null).length
  const allPlaced = placedCount === descriptor.items.length
  const allowRetry = descriptor.allowRetry !== false

  const zoneById = useMemo(() => {
    const map = {}
    for (const zone of descriptor.zones) map[zone.id] = zone
    return map
  }, [descriptor])

  function placeItem(itemId, zoneId) {
    setPlacements((prev) => ({ ...prev, [itemId]: zoneId }))
    const item = descriptor.items.find((i) => i.id === itemId)
    const label = item ? item.label : itemId
    setAnnounce(`${label} ${zoneId === null ? 'returned to tray' : `placed in ${zoneById[zoneId]?.ariaLabel ?? 'zone'}`}.`)
    setSelectedItem(null)
  }

  function toggleSelect(itemId) {
    if (selectedItem === itemId) {
      setSelectedItem(null)
      setAnnounce('Selection cleared.')
      return
    }
    const item = descriptor.items.find((i) => i.id === itemId)
    setSelectedItem(itemId)
    setAnnounce(`${item ? item.label : itemId} selected. Tap a zone or the tray to place it.`)
  }

  function handleItemPointerDown(event, item) {
    if (disabled || submitted) return
    if (reducedMotion) {
      toggleSelect(item.id)
      return
    }
    event.preventDefault()
    dragStart.current = { x: event.clientX, y: event.clientY }
    setMoved(false)
    setDragItem(item.id)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* pointer capture unsupported — drag still works within the element */
    }
  }

  function handleItemPointerMove(event, item) {
    if (dragItem !== item.id) return
    if (
      Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y) >
      DRAG_THRESHOLD_PX
    ) {
      setMoved(true)
    }
    if (moved) setDragPosition({ x: event.clientX, y: event.clientY })
    const target = document.elementFromPoint(event.clientX, event.clientY)
    const zoneEl = target && typeof target.closest === 'function' ? target.closest('[data-zone-id]') : null
    setDragOverZone(zoneEl ? zoneEl.dataset.zoneId : null)
  }

  function handleItemPointerUp(event, item) {
    if (dragItem !== item.id) return
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    } catch {
      /* noop */
    }
    if (moved) {
      const target = document.elementFromPoint(event.clientX, event.clientY)
      const zoneEl = target && typeof target.closest === 'function' ? target.closest('[data-zone-id]') : null
      const zoneId = zoneEl ? zoneEl.dataset.zoneId : null
      placeItem(item.id, zoneId === TRAY_ZONE ? null : zoneId)
    } else {
      toggleSelect(item.id)
    }
    setDragItem(null)
    setDragOverZone(null)
    setMoved(false)
  }

  function handleZoneClick(zoneId) {
    if (disabled || submitted) return
    if (selectedItem !== null) placeItem(selectedItem, zoneId)
  }

  function handleTrayClick() {
    if (disabled || submitted) return
    if (selectedItem !== null) placeItem(selectedItem, null)
  }

  function revealNextHint() {
    if (hintsRevealed >= hints.length) return
    const next = hints[hintsRevealed]
    setHintsRevealed((n) => n + 1)
    setAnnounce(`Hint: ${next.text}`)
  }

  function resetBoard() {
    setPlacements(initialPlacements)
    setSelectedItem(null)
    setDragItem(null)
    setDragOverZone(null)
    setMoved(false)
  }

  function handleSubmit() {
    if (!allPlaced || disabled || submitted) return
    const nextAttempt = attempts + 1
    setAttempts(nextAttempt)
    const response = {
      placements: descriptor.items.map((item) => ({
        itemId: item.id,
        zoneId: placements[item.id],
      })),
    }
    const interactionMetrics = {
      attemptsUsed: nextAttempt,
      hintsUsed: hintsRevealed,
      timeTakenSec: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
    }
    onSubmit({ response, interactionMetrics })
  }

  const visibleHints = hints.slice(0, hintsRevealed)
  const draggingItem = dragItem !== null ? descriptor.items.find((i) => i.id === dragItem) : null

  return (
    <div className="drag-drop-activity" data-activity="drag-drop">
      <div aria-live="polite" className="drag-drop-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="drag-drop-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="drag-drop-instructions">{descriptor.instructions}</p> : null}

      <div className="drag-drop-board">
        <section
          className="drag-drop-tray"
          data-zone-id={TRAY_ZONE}
          onClick={handleTrayClick}
          aria-label="Item tray"
        >
          <h3 className="drag-drop-section-label">Items</h3>
          <div className="drag-drop-items">
            {descriptor.items.map((item) => {
              const placedIn = placements[item.id]
              if (placedIn !== null) return null
              const isSelected = selectedItem === item.id
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`drag-drop-item${isSelected ? ' is-selected' : ''}${dragItem === item.id ? ' is-dragging' : ''}`}
                  aria-label={item.ariaLabel}
                  aria-pressed={isSelected}
                  disabled={disabled || submitted}
                  onPointerDown={(e) => handleItemPointerDown(e, item)}
                  onPointerMove={(e) => handleItemPointerMove(e, item)}
                  onPointerUp={(e) => handleItemPointerUp(e, item)}
                  onClick={() => !moved && toggleSelect(item.id)}
                >
                  {item.image ? <img src={item.image.ref} alt={item.image.alt} /> : null}
                  <span className="drag-drop-item-label">{item.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        <div className="drag-drop-zones">
          {descriptor.zones.map((zone) => {
            const zoneItems = descriptor.items.filter((item) => placements[item.id] === zone.id)
            return (
              <div
                key={zone.id}
                className={`drag-drop-zone${dragOverZone === zone.id ? ' is-drag-over' : ''}`}
                data-zone-id={zone.id}
              >
                <div className="drag-drop-zone-head">
                  <h3 className="drag-drop-zone-label">{zone.label}</h3>
                  <span className="drag-drop-zone-count">{zoneItems.length}</span>
                </div>
                <button
                  type="button"
                  className="drag-drop-zone-drop"
                  aria-label={`Place item in ${zone.ariaLabel}`}
                  disabled={disabled || submitted}
                  onClick={() => handleZoneClick(zone.id)}
                >
                  {zoneItems.length === 0 ? <span className="drag-drop-zone-empty">Drop here</span> : null}
                  {zoneItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="drag-drop-item drag-drop-item-in-zone"
                      aria-label={`${item.ariaLabel} — move it`}
                      disabled={disabled || submitted}
                      onClick={() => toggleSelect(item.id)}
                    >
                      {item.image ? <img src={item.image.ref} alt={item.image.alt} /> : null}
                      <span className="drag-drop-item-label">{item.label}</span>
                    </button>
                  ))}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {dragItem !== null && draggingItem && moved ? (
        <div className="drag-drop-ghost" style={{ left: dragPosition.x, top: dragPosition.y }} aria-hidden="true">
          <span className="drag-drop-item-label">{draggingItem.label}</span>
        </div>
      ) : null}

      <div className="drag-drop-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="drag-drop-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        {allowRetry ? (
          <button type="button" className="drag-drop-reset-button" disabled={disabled || submitted} onClick={resetBoard}>
            Clear
          </button>
        ) : null}
        <button
          type="button"
          className="drag-drop-submit-button"
          disabled={!allPlaced || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : `Submit (${placedCount}/${descriptor.items.length})`}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="drag-drop-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="drag-drop-hint">
              <span className="drag-drop-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="drag-drop-submitted" role="status">
          <strong>Placed — waiting for server scoring.</strong> Correctness and partial credit are
          evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default DragDropActivity
