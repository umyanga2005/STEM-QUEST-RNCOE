/**
 * Admin Question Builder — Image Interaction visual authoring form (Task 5.11B).
 *
 * Visual editor over the existing image-interaction schema. Authors pick the
 * interaction mode (tap / label), reference the image surface, and place
 * hotspots (normalized % coordinates, circle/rect hit region). The
 * correct-answer document — `requiredHotspots` (tap) or `placements`
 * (label) — is derived from the authored hotspot "required" toggles and label
 * placements. Media stays a reference placeholder (no upload in this task).
 */

import { Section, Row, Chip, LabeledInput, NumberField, SelectField, Toggle, MediaReferenceEditor, AddButton, RemoveButton } from './primitives.jsx'
import { makeHotspot, makeImageLabel, buildImageAnswer } from './model.js'

const LIMITS = { hotspots: { min: 1, max: 8 }, labels: { min: 1, max: 8 } }
const MODES = [
  { value: 'tap', label: 'Tap' },
  { value: 'label', label: 'Label' },
]
const SHAPES = [
  { value: 'circle', label: 'Circle' },
  { value: 'rect', label: 'Rectangle' },
]

export default function ImageInteractionVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const hotspots = Array.isArray(payload.hotspots) ? payload.hotspots : []
  const labels = Array.isArray(payload.labels) ? payload.labels : []
  const labelMode = payload.mode === 'label'
  const requiredSet = Array.isArray(correctAnswer?.requiredHotspots)
    ? new Set(correctAnswer.requiredHotspots)
    : new Set(hotspots.map((h) => h.id))
  const placementByLabel = new Map((correctAnswer?.placements ?? []).map((p) => [p.labelId, p.hotspotId]))
  const firstHotspot = hotspots[0]?.id ?? ''

  const emit = (nextPayload, opts = {}) => {
    onChange({ payload: nextPayload, correctAnswer: buildImageAnswer(nextPayload, opts) })
  }

  const emitCurrent = (nextPayload) => {
    const required = hotspots.map((h) => h.id).filter((id) => requiredSet.has(id))
    const placements = labels.map((label) => ({
      labelId: label.id,
      hotspotId: placementByLabel.has(label.id) && hotspots.some((h) => h.id === placementByLabel.get(label.id))
        ? placementByLabel.get(label.id)
        : firstHotspot,
    }))
    emit(nextPayload, { requiredHotspots: required, placements })
  }

  const patchHotspot = (index, patchFn) => {
    const hotspots2 = hotspots.map((h, i) => (i === index ? { ...h, ...patchFn(h) } : h))
    emitCurrent({ ...payload, hotspots: hotspots2 })
  }

  const addHotspot = () => {
    if (hotspots.length >= LIMITS.hotspots.max) return
    emitCurrent({ ...payload, hotspots: [...hotspots, makeHotspot(hotspots.map((h) => h.id))] })
  }

  const removeHotspot = (index) => {
    emitCurrent({ ...payload, hotspots: hotspots.filter((_, i) => i !== index) })
  }

  const patchLabel = (index, patchFn) => {
    const labels2 = labels.map((l, i) => (i === index ? { ...l, ...patchFn(l) } : l))
    emitCurrent({ ...payload, labels: labels2 })
  }

  const addLabel = () => {
    if (labels.length >= LIMITS.labels.max) return
    emitCurrent({ ...payload, labels: [...labels, makeImageLabel(labels.map((l) => l.id))] })
  }

  const removeLabel = (index) => {
    emitCurrent({ ...payload, labels: labels.filter((_, i) => i !== index) })
  }

  const setMode = (mode) => {
    const next = { ...payload, mode }
    if (mode === 'label' && labels.length === 0) {
      next.labels = [makeImageLabel([])]
    }
    emitCurrent(next)
  }

  const hotspotIds = hotspots.map((h) => h.id)

  return (
    <div className="aq-ve aq-ve--image">
      <Section title="Image" description="Media reference only — no upload in this task. Normalized % coordinates survive resizing.">
        <MediaReferenceEditor media={payload.image} onChange={(image) => emitCurrent({ ...payload, image })} disabled={disabled} />
        <div className="aq-row">
          <NumberField label="Image width (px)" value={payload.imageWidth ?? 800} min={1} max={8192} onChange={(v) => emitCurrent({ ...payload, imageWidth: v })} disabled={disabled} />
          <NumberField label="Image height (px)" value={payload.imageHeight ?? 600} min={1} max={8192} onChange={(v) => emitCurrent({ ...payload, imageHeight: v })} disabled={disabled} />
          <SelectField label="Mode" value={payload.mode ?? 'tap'} onChange={setMode} options={MODES} disabled={disabled} />
        </div>
      </Section>

      <Section title="Hotspots" description={`Clickable regions (${hotspots.length}/${LIMITS.hotspots.max}).`}>
        {hotspots.map((hotspot, i) => (
          <div className="aq-subsection" key={hotspot.id}>
            <div className="aq-row">
              <Chip>{hotspot.id}</Chip>
              <SelectField label="Shape" value={hotspot.shape ?? 'circle'} onChange={(v) => patchHotspot(i, () => ({ shape: v }))} options={SHAPES} disabled={disabled} />
              {!labelMode ? (
                <Toggle label="Required" checked={requiredSet.has(hotspot.id)} onChange={(on) => {
                  const next = new Set(requiredSet)
                  if (on) next.add(hotspot.id)
                  else next.delete(hotspot.id)
                  emit(payload, { requiredHotspots: hotspots.filter((h) => next.has(h.id)).map((h) => h.id), placements: [...(correctAnswer?.placements ?? [])] })
                }} disabled={disabled} />
              ) : null}
              <RemoveButton onClick={() => removeHotspot(i)} label={`Remove ${hotspot.id}`} disabled={disabled || hotspots.length <= LIMITS.hotspots.min} />
            </div>
            <div className="aq-row">
              <LabeledInput label="Label" value={hotspot.label ?? ''} onChange={(e) => patchHotspot(i, () => ({ label: e.target.value }))} placeholder="Optional label" disabled={disabled} />
              <LabeledInput label="Id" value={hotspot.id} onChange={(e) => patchHotspot(i, () => ({ id: e.target.value }))} placeholder="hotspot_1" disabled={disabled} />
              <NumberField label="X %" value={hotspot.x ?? 50} min={0} max={100} onChange={(v) => patchHotspot(i, () => ({ x: v }))} disabled={disabled} />
              <NumberField label="Y %" value={hotspot.y ?? 50} min={0} max={100} onChange={(v) => patchHotspot(i, () => ({ y: v }))} disabled={disabled} />
            </div>
            <div className="aq-row">
              {hotspot.shape === 'rect' ? (
                <>
                  <NumberField label="Width %" value={hotspot.width ?? 10} min={1} max={100} onChange={(v) => patchHotspot(i, () => ({ width: v }))} disabled={disabled} />
                  <NumberField label="Height %" value={hotspot.height ?? 10} min={1} max={100} onChange={(v) => patchHotspot(i, () => ({ height: v }))} disabled={disabled} />
                </>
              ) : (
                <NumberField label="Radius %" value={hotspot.radius ?? 5} min={1} max={50} onChange={(v) => patchHotspot(i, () => ({ radius: v }))} disabled={disabled} />
              )}
              <LabeledInput label="Aria label" value={hotspot.ariaLabel ?? ''} onChange={(e) => patchHotspot(i, () => ({ ariaLabel: e.target.value }))} placeholder="Optional" disabled={disabled} />
            </div>
          </div>
        ))}
        <AddButton onClick={addHotspot} disabled={disabled || hotspots.length >= LIMITS.hotspots.max}>
          + Add hotspot
        </AddButton>
      </Section>

      {labelMode ? (
        <Section title="Labels" description={`Draggable labels placed onto hotspots (${labels.length}/${LIMITS.labels.max}).`}>
          {labels.map((label, i) => (
            <Row key={label.id}>
              <LabeledInput label="Label text" value={label.text ?? ''} onChange={(e) => patchLabel(i, () => ({ text: e.target.value }))} placeholder="Label text" disabled={disabled} />
              <LabeledInput label="Id" value={label.id} onChange={(e) => patchLabel(i, () => ({ id: e.target.value }))} placeholder="label_1" disabled={disabled} />
              <SelectField
                label="Placed on"
                value={placementByLabel.has(label.id) && hotspots.some((h) => h.id === placementByLabel.get(label.id)) ? placementByLabel.get(label.id) : firstHotspot}
                onChange={(hotspotId) => {
                  const next = new Map(placementByLabel)
                  next.set(label.id, hotspotId)
                  emit(payload, { requiredHotspots: [...(correctAnswer?.requiredHotspots ?? [])], placements: labels.map((l) => ({ labelId: l.id, hotspotId: next.get(l.id) ?? firstHotspot })) })
                }}
                options={hotspots.map((h) => ({ value: h.id, label: h.label || h.id }))}
                disabled={disabled}
              />
              <RemoveButton onClick={() => removeLabel(i)} label={`Remove ${label.text || label.id}`} disabled={disabled || labels.length <= LIMITS.labels.min} />
            </Row>
          ))}
          <AddButton onClick={addLabel} disabled={disabled || labels.length >= LIMITS.labels.max}>
            + Add label
          </AddButton>
        </Section>
      ) : null}

      {hotspotIds.length > 0 && hotspotIds.length !== new Set(hotspotIds).size ? (
        <p className="aq-ve__warn">Duplicate hotspot ids were detected — fix them before saving.</p>
      ) : null}
      <p className="aq-ve__note">
        {labelMode
          ? 'The correct-answer placements are built automatically from each label’s “Placed on” assignment.'
          : 'The correct-answer required hotspots are the ones flagged “Required” above.'}
      </p>
    </div>
  )
}