/**
 * Activity Engine — image-interaction renderer (Task 4.9).
 *
 * Pure React renderer for the image-interaction plugin descriptor. The image
 * is the interaction surface: hotspots are real buttons overlaid at their
 * normalized percentage positions, so the activity stays correct across every
 * display size (the overlay inherits the image's aspect ratio). All state
 * transitions reduce to the controller operations in
 * `image-interaction-controller.js` (unit-tested in Node):
 *
 *   - tap:   pressing a hotspot toggles its selection; the pointer's
 *            normalized percentage position is recorded for the server to
 *            re-map independently.
 *   - label: select a label, then press a hotspot to place it; placed labels
 *            can be moved or returned to the tray.
 *
 * Correct answers never reach this component — it consumes only the
 * client-safe render descriptor (image metadata + public hotspot geometry +
 * labels) and hands the submitted `{ taps }` / `{ placements }` payload back
 * to the caller, which is scored server-side.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createImageInteractionState,
  toPercentCoordinates,
  isHotspotSelected,
  toggleTap,
  selectedCount,
  getPendingLabel,
  selectLabel,
  getPlacement,
  placeLabel,
  removePlacement,
  placedCount,
  clearInteraction,
  isComplete,
  buildResponse,
} from './image-interaction-controller.js'
import './image-interaction.css'

/** Percent geometry for a hotspot button so it exactly matches the hit region. */
function hotspotStyle(hotspot, imageWidth, imageHeight) {
  const w = imageWidth || 1
  const h = imageHeight || 1
  if (hotspot.shape === 'rect') {
    return { left: `${hotspot.x}%`, top: `${hotspot.y}%`, width: `${hotspot.width}%`, height: `${hotspot.height}%` }
  }
  const diameter = 2 * (hotspot.radius || 1)
  return {
    left: `${hotspot.x}%`,
    top: `${hotspot.y}%`,
    width: `${diameter}%`,
    height: `${(diameter * w) / h}%`,
  }
}

function hotspotAriaLabel(hotspot, index, mode, occupant) {
  const base = hotspot.ariaLabel || hotspot.label || `Region ${index + 1}`
  if (mode === 'label') {
    return occupant ? `${base} — holds ${occupant}` : `Target ${base}`
  }
  return base
}

export function ImageInteractionActivity({
  descriptor,
  hints = [],
  disabled = false,
  submitted = false,
  onSubmit,
}) {
  const isLabelMode = descriptor.mode === 'label'
  const labelDefs = isLabelMode ? (descriptor.labels ?? []) : []

  const [state, setState] = useState(() =>
    createImageInteractionState({
      mode: descriptor.mode,
      hotspotDefs: descriptor.hotspots,
      labelDefs,
    })
  )
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [announce, setAnnounce] = useState('')
  const [imageError, setImageError] = useState(false)
  const surfaceRef = useRef(null)
  const startedAt = useRef(Date.now())

  const ready = isComplete(state)

  const imageSrc = useMemo(() => {
    const ref = descriptor.image?.ref ?? descriptor.image?.storageSrc ?? ''
    if (!ref) return ''
    return /^https?:\/\//.test(ref) ? ref : `/${ref}`
  }, [descriptor.image?.ref, descriptor.image?.storageSrc])

  function announceText(text) {
    setAnnounce(text)
  }

  function handleHotspotPress(hotspotId, event) {
    if (disabled || submitted) return
    if (isLabelMode) {
      const pending = getPendingLabel(state)
      if (pending === null) return
      const occupant = state.placements.find((p) => p.hotspotId === hotspotId)
      let next = state
      if (occupant && occupant.labelId !== pending) {
        next = removePlacement(next, occupant.labelId)
      }
      next = placeLabel(next, pending, hotspotId)
      setState(next)
      announceText(`${getLabelText(pending)} placed on target ${hotspotId}.`)
      return
    }
    const rect = surfaceRef.current?.getBoundingClientRect?.()
    const point = toPercentCoordinates(event.clientX, event.clientY, rect)
    const wasSelected = isHotspotSelected(state, hotspotId)
    const next = toggleTap(state, hotspotId, point.x, point.y)
    setState(next)
    announceText(`${getHotspotText(hotspotId)} ${wasSelected ? 'deselected' : 'selected'}.`)
  }

  function handleLabelSelect(labelId) {
    if (disabled || submitted) return
    const next = selectLabel(state, labelId)
    const pending = getPendingLabel(next)
    setState(next)
    announceText(pending ? `${getLabelText(pending)} selected — press a target to place it.` : 'No label selected.')
  }

  function handleRemove(labelId) {
    if (disabled || submitted) return
    const next = removePlacement(state, labelId)
    setState(next)
    announceText(`${getLabelText(labelId)} returned to the tray.`)
  }

  function handleClear() {
    if (disabled || submitted) return
    setState(clearInteraction(state))
    announceText('Interaction cleared.')
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

  function getHotspotText(hotspotId) {
    return descriptor.hotspots.find((h) => h.id === hotspotId)?.label || hotspotId
  }

  function getLabelText(labelId) {
    return labelDefs.find((l) => l.id === labelId)?.text || labelId
  }

  useEffect(() => {
    if (descriptor.mode !== 'label') return
    const handleKey = (event) => {
      if (disabled || submitted) return
      if (event.key !== 'Escape') return
      if (getPendingLabel(state)) {
        setState({ ...state, pendingLabelId: null })
        announceText('Label selection cleared.')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state, disabled, submitted]) // eslint-disable-line react-hooks/exhaustive-deps

  const progressText = isLabelMode
    ? `${placedCount(state)} / ${labelDefs.length} placed`
    : `${selectedCount(state)} selected`

  const visibleHints = hints.slice(0, hintsRevealed)

  return (
    <div className="image-activity" data-activity="image-interaction">
      <div aria-live="polite" className="image-sr-live">
        {announce}
      </div>

      {descriptor.prompt ? <h2 className="image-prompt">{descriptor.prompt}</h2> : null}
      {descriptor.instructions ? <p className="image-instructions">{descriptor.instructions}</p> : null}

      <div className="image-progress" aria-live="polite">
        {progressText}
      </div>

      <div className="image-surface-wrap">
        <div
          ref={surfaceRef}
          className="image-surface"
          role="img"
          aria-label={descriptor.image?.alt || 'Interactive diagram'}
          style={{ aspectRatio: `${descriptor.imageWidth} / ${descriptor.imageHeight}` }}
        >
          {imageSrc && !imageError ? (
            <img
              className="image-surface-img"
              src={imageSrc}
              alt={descriptor.image?.alt || ''}
              draggable={false}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="image-surface-fallback">
              {descriptor.image?.alt || 'Interactive diagram'}
            </div>
          )}

          {descriptor.hotspots.map((hotspot, index) => {
            const occupant = isLabelMode
              ? state.placements.find((p) => p.hotspotId === hotspot.id)
              : null
            const selected = !isLabelMode && isHotspotSelected(state, hotspot.id)
            const classes = ['image-hotspot']
            if (selected) classes.push('is-selected')
            if (isLabelMode && occupant) classes.push('has-label')
            return (
              <button
                key={hotspot.id}
                type="button"
                className={classes.join(' ')}
                style={hotspotStyle(hotspot, descriptor.imageWidth, descriptor.imageHeight)}
                aria-label={hotspotAriaLabel(hotspot, index, descriptor.mode, occupant?.labelId)}
                aria-pressed={selected || (isLabelMode && Boolean(occupant))}
                disabled={disabled || submitted}
                onClick={(event) => handleHotspotPress(hotspot.id, event)}
                onDragOver={(event) => {
                  if (isLabelMode) event.preventDefault()
                }}
                onDrop={(event) => {
                  if (!isLabelMode || disabled || submitted) return
                  event.preventDefault()
                  const labelId = event.dataTransfer.getData('text/plain')
                  if (!labelDefs.some((l) => l.id === labelId)) return
                  let next = state
                  const occupantLabel = state.placements.find((p) => p.hotspotId === hotspot.id)
                  if (occupantLabel && occupantLabel.labelId !== labelId) {
                    next = removePlacement(next, occupantLabel.labelId)
                  }
                  next = placeLabel(next, labelId, hotspot.id)
                  setState(next)
                  announceText(`${getLabelText(labelId)} placed on target ${hotspot.id}.`)
                }}
              >
                <span className="image-hotspot-mark" aria-hidden="true">
                  {isLabelMode && occupant ? getLabelText(occupant.labelId) : selected ? '•' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {isLabelMode ? (
        <div className="image-tray" role="group" aria-label="Labels to place">
          {labelDefs.map((label) => {
            const placedOn = getPlacement(state, label.id)
            const pending = getPendingLabel(state) === label.id
            const classes = ['image-label-chip']
            if (pending) classes.push('is-pending')
            if (placedOn) classes.push('is-placed')
            return (
              <span key={label.id} className="image-label-chip-wrap">
                <button
                  type="button"
                  className={classes.join(' ')}
                  draggable
                  disabled={disabled || submitted}
                  aria-pressed={pending}
                  onClick={() => handleLabelSelect(label.id)}
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', label.id)}
                >
                  {label.text}
                </button>
                {placedOn ? (
                  <button
                    type="button"
                    className="image-label-remove"
                    disabled={disabled || submitted}
                    aria-label={`Return "${label.text}" to the tray`}
                    onClick={() => handleRemove(label.id)}
                  >
                    ✕
                  </button>
                ) : null}
              </span>
            )
          })}
        </div>
      ) : null}

      <div className="image-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="image-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Reveal hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        <button type="button" className="image-reset-button" disabled={disabled || submitted} onClick={handleClear}>
          Clear
        </button>
        <button
          type="button"
          className="image-submit-button"
          disabled={!ready || disabled || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted' : `Submit (${progressText})`}
        </button>
      </div>

      {hintsRevealed > 0 ? (
        <ul className="image-hints">
          {visibleHints.map((hint) => (
            <li key={hint.id} className="image-hint">
              <span className="image-hint-level">Hint {hint.level}</span>
              {hint.text}
            </li>
          ))}
        </ul>
      ) : null}

      {submitted ? (
        <div className="image-submitted" role="status">
          <strong>Image interaction submitted — waiting for server scoring.</strong> Correctness and
          partial credit are evaluated server-side; this preview shows the captured response only.
        </div>
      ) : null}
    </div>
  )
}

export default ImageInteractionActivity
