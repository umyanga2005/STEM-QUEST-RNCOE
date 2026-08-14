/**
 * Activity Engine — sorting renderer (Task 4.7).
 *
 * Pure React renderer for the sorting plugin descriptor. Three interaction
 * paths all reduce to the same controller operations (`sorting-controller.js`,
 * unit-tested in Node):
 *
 *   1. TAP / CLICK — select an item chip, then tap a group to place it there.
 *   2. POINTER DRAG — drag an item chip onto a group (enhancement, never the
 *      only path).
 *   3. KEYBOARD — every chip and every group is a native button: Tab to focus,
 *      Space/Enter to select an item, then activate a group to place it.
 *
 * Unassigned items sit in a tray; each group lists the items assigned to it.
 * Selecting an assigned chip reopens it for reassignment; a per-chip remove
 * button returns it to the tray. The submit button gates until every item is
 * placed. Correct answers never reach this component — it consumes only the
 * client-safe render descriptor and hands the submitted `assignments` back to
 * the caller, which is scored server-side.
 */

import { useMemo, useRef, useState } from 'react'
import {
  createSortState,
  selectItem,
  assignItem,
  clearAssignment,
  resetSort,
  isAssigned,
  isComplete,
  buildResponse,
} from './sorting-controller.js'
import './sorting.css'

function SortChip({
  item,
  categoryLabel,
  selected,
  placed,
  disabled,
  draggable,
  onSelect,
  onClear,
  onDragStart,
  onDragEnd,
}) {
  const image = item.image
  return (
    <div className={`sorting-chip${selected ? ' is-selected' : ''}${placed ? ' is-placed' : ''}`}>
      <button
        type="button"
        className="sorting-chip-button"
        aria-label={categoryLabel ? `${item.ariaLabel}, placed in ${categoryLabel} — select to move` : item.ariaLabel}
        aria-pressed={selected}
        disabled={disabled}
        draggable={draggable}
        onClick={onSelect}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {image ? <img src={image.ref} alt={image.alt} /> : null}
        <span className="sorting-chip-label">{item.label}</span>
      </button>
      {placed ? (
        <button
          type="button"
          className="sorting-chip-clear"
          aria-label={`Remove ${item.ariaLabel} from ${categoryLabel}`}
          disabled={disabled}
          onClick={onClear}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export function SortingActivity({
  descriptor,
  hints = [],
  disabled = false,
  reducedMotion = false,
  submitted = false,
  onSubmit,
}) {
  const [state, setState] = useState(() =>
    createSortState(
      descriptor.items.map((item) => item.id),
      descriptor.categories.map((category) => category.id)
    )
  )
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
  const categoryById = useMemo(() => {
    const map = {}
    for (const category of descriptor.categories) map[category.id] = category
    return map
  }, [descriptor])

  const ready = isComplete(state)
  const total = state.itemIds.length
  const assignedCount = state.itemIds.filter((id) => isAssigned(state, id) !== null).length

  function labelFor(id) {
    const card = itemById[id] ?? categoryById[id]
    return card ? card.label : id
  }

  function handleSelect(itemId) {
    if (disabled || submitted) return
    const next = selectItem(state, itemId)
    setState(next)
    const item = itemById[itemId]
    if (next.selectedItem === itemId) {
      const placed = isAssigned(next, itemId)
      setAnnounce(
        placed
          ? `${item ? item.ariaLabel : itemId} selected — choose a group to move it.`
          : `${item ? item.ariaLabel : itemId} selected — choose a group to place it.`
      )
    } else {
      setAnnounce('Selection cleared.')
    }
  }

  function handlePlace(categoryId) {
    if (disabled || submitted) return
    const next = assignItem(state, categoryId)
    setState(next)
    const category = categoryById[categoryId]
    if (state.selectedItem !== null) {
      const item = itemById[state.selectedItem]
      setAnnounce(`${item ? item.ariaLabel : state.selectedItem} placed in ${category ? category.ariaLabel : categoryId}.`)
    } else {
      setAnnounce('Select an item first, then choose a group.')
    }
  }

  function handleDrop(categoryId) {
    if (disabled || submitted || dragSource === null) return
    const itemId = dragSource
    setDragSource(null)
    setDragOver(null)
    const next = assignItem(selectItem(state, itemId), categoryId)
    setState(next)
    const item = itemById[itemId]
    const category = categoryById[categoryId]
    setAnnounce(`${item ? item.ariaLabel : itemId} placed in ${category ? category.ariaLabel : categoryId}.`)
  }

  function handleClear(itemId) {
    if (disabled || submitted) return
    const next = clearAssignment(state, itemId)
    setState(next)
    const item = itemById[itemId]
    setAnnounce(`${item ? item.ariaLabel : itemId} returned to the unassigned tray.`)
  }

  function handleReset() {
    if (disabled || submitted) return
    setState(resetSort(state))
    setAnnounce('All items returned to the tray.')
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
  const unassigned = state.itemIds.filter((id) => isAssigned(state, id) === null)

  return (
    <div className="sorting-activity" data-activity="sorting">
      <div aria-live="polite" className="sorting-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="sorting-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="sorting-instructions">{descriptor.instructions}</p> : null}

      <section className="sorting-tray" aria-label="Unassigned items">
        <h3 className="sorting-section-title">Unassigned items</h3>
        {unassigned.length === 0 ? (
          <p className="sorting-empty-note">All items are placed. Review the groups, then submit.</p>
        ) : (
          <ul className="sorting-chip-list">
            {unassigned.map((itemId) => (
              <li key={itemId}>
                <SortChip
                  item={itemById[itemId]}
                  selected={state.selectedItem === itemId}
                  placed={false}
                  disabled={disabled || submitted}
                  draggable={!reducedMotion && !disabled && !submitted}
                  onSelect={() => handleSelect(itemId)}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', labelFor(itemId))
                    setDragSource(itemId)
                  }}
                  onDragEnd={() => {
                    setDragSource(null)
                    setDragOver(null)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sorting-groups">
        {descriptor.categories.map((category) => {
          const assigned = state.itemIds.filter((id) => isAssigned(state, id) === category.id)
          return (
            <section
              key={category.id}
              className={`sorting-group${dragOver === category.id ? ' is-drag-over' : ''}`}
              aria-label={`Group ${category.ariaLabel}: ${assigned.length} of ${total} items`}
              onDragOver={(event) => {
                if (!disabled && !submitted) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDragOver(category.id)
                }
              }}
              onDragLeave={() => setDragOver((current) => (current === category.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                handleDrop(category.id)
              }}
            >
              <header className="sorting-group-header">
                <button
                  type="button"
                  className="sorting-group-target"
                  aria-label={`Place the selected item into ${category.ariaLabel}`}
                  disabled={disabled || submitted}
                  onClick={() => handlePlace(category.id)}
                >
                  {category.image ? <img src={category.image.ref} alt={category.image.alt} /> : null}
                  <span className="sorting-group-label">{category.label}</span>
                  <span className="sorting-group-count" aria-hidden="true">
                    {assigned.length}/{total}
                  </span>
                </button>
              </header>
              {assigned.length > 0 ? (
                <ul className="sorting-chip-list">
                  {assigned.map((itemId) => (
                    <li key={itemId}>
                      <SortChip
                        item={itemById[itemId]}
                        categoryLabel={category.ariaLabel}
                        selected={state.selectedItem === itemId}
                        placed
                        disabled={disabled || submitted}
                        draggable={!reducedMotion && !disabled && !submitted}
                        onSelect={() => handleSelect(itemId)}
                        onClear={() => handleClear(itemId)}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', labelFor(itemId))
                          setDragSource(itemId)
                        }}
                        onDragEnd={() => {
                          setDragSource(null)
                          setDragOver(null)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sorting-group-empty">Tap or drag an item here.</p>
              )}
            </section>
          )
        })}
      </div>

      <div className="sorting-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="sorting-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        <button type="button" className="sorting-reset-button" disabled={disabled || submitted} onClick={handleReset}>
          Clear
        </button>
        <button
          type="button"
          className="sorting-submit-button"
          disabled={!ready || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : `Submit (${assignedCount}/${total})`}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="sorting-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="sorting-hint">
              <span className="sorting-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="sorting-submitted" role="status">
          <strong>Sorting submitted — waiting for server scoring.</strong> Correctness and partial
          credit are evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default SortingActivity
