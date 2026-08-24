/**
 * Admin Question Builder — Drag & Drop visual authoring form (Task 5.11A).
 *
 * Visual editor over the existing drag-drop schema. Authors maintain item and
 * zone cards and assign each item to a zone visually; the correct-answer
 * `mappings` document is derived from those assignments (never hand-written).
 * `payload` and `correctAnswer` are the single source of truth — editing an
 * existing question preserves ids, and new entities get fresh unique ids.
 */

import { Section, Row, Chip, LabeledInput, IdInput, MediaReferenceEditor, Toggle, SelectField, AddButton, RemoveButton } from './primitives.jsx'
import { makeDragItem, makeZone, buildDragDropAnswer } from './model.js'

const LIMITS = { items: { min: 2, max: 8 }, zones: { min: 1, max: 5 } }

export default function DragDropVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const items = Array.isArray(payload.items) ? payload.items : []
  const zones = Array.isArray(payload.zones) ? payload.zones : []
  const mappings = Array.isArray(correctAnswer?.mappings) ? correctAnswer.mappings : []
  const zoneByItem = new Map(mappings.map((m) => [m.itemId, m.zoneId]))

  const emit = (nextPayload) => {
    onChange({ payload: nextPayload, correctAnswer: buildDragDropAnswer(nextPayload.items, nextPayload.zones, mappings) })
  }

  const patchItem = (index, patchFn) => {
    const items2 = items.map((item, i) => (i === index ? { ...item, ...patchFn(item) } : item))
    emit({ ...payload, items: items2 })
  }

  const patchZone = (index, patchFn) => {
    const zones2 = zones.map((zone, i) => (i === index ? { ...zone, ...patchFn(zone) } : zone))
    emit({ ...payload, zones: zones2 })
  }

  const addItem = () => {
    if (items.length >= LIMITS.items.max) return
    emit({ ...payload, items: [...items, makeDragItem(items.map((item) => item.id))] })
  }

  const removeItem = (index) => {
    emit({ ...payload, items: items.filter((_, i) => i !== index) })
  }

  const addZone = () => {
    if (zones.length >= LIMITS.zones.max) return
    emit({ ...payload, zones: [...zones, makeZone(zones.map((zone) => zone.id))] })
  }

  const removeZone = (index) => {
    emit({ ...payload, zones: zones.filter((_, i) => i !== index) })
  }

  const assignZone = (itemId, zoneId) => {
    const updated = mappings.filter((m) => m.itemId !== itemId).concat({ itemId, zoneId })
    onChange({ payload, correctAnswer: { mappings: updated } })
  }

  const modeIsSingle = payload.mode === 'single-target'
  const itemIds = items.map((item) => item.id)

  return (
    <div className="aq-ve aq-ve--dragdrop">
      <Section title="Items" description={`Draggable cards (${items.length}/${LIMITS.items.max}). Each card must have a label or an image.`}>
        {items.map((item, i) => (
          <Row key={item.id}>
            <LabeledInput label="Label" value={item.label ?? ''} onChange={(e) => patchItem(i, () => ({ label: e.target.value }))} placeholder="Item label" disabled={disabled} />
            <IdInput value={item.id} onChange={(v) => patchItem(i, () => ({ id: v }))} disabled={disabled} />
            <SelectField
              label="Goes to"
              value={zoneByItem.get(item.id) ?? ''}
              onChange={(zoneId) => assignZone(item.id, zoneId)}
              options={[{ value: '', label: '— choose zone —' }].concat(zones.map((zone) => ({ value: zone.id, label: zone.label || zone.id })))}
              disabled={disabled}
            />
            <MediaReferenceEditor media={item.image} onChange={(image) => patchItem(i, () => ({ image }))} disabled={disabled} />
            <RemoveButton onClick={() => removeItem(i)} label={`Remove ${item.label || item.id}`} disabled={disabled || items.length <= LIMITS.items.min} />
          </Row>
        ))}
        <AddButton onClick={addItem} disabled={disabled || items.length >= LIMITS.items.max}>
          + Add item
        </AddButton>
      </Section>

      <Section title="Zones" description={`Drop targets (${zones.length}/${LIMITS.zones.max}).`}>
        <div className="aq-chips">
          {zones.map((zone) => (
            <Chip key={zone.id}>
              {zone.label || zone.id}
              {modeIsSingle ? null : (
                <button type="button" className="aq-chip__remove" aria-label={`Remove ${zone.label || zone.id}`} onClick={() => removeZone(zones.indexOf(zone))} disabled={disabled || zones.length <= LIMITS.zones.min}>
                  ×
                </button>
              )}
            </Chip>
          ))}
        </div>
        {zones.map((zone, i) => (
          <Row key={`edit-${zone.id}`}>
            <LabeledInput label="Zone label" value={zone.label ?? ''} onChange={(e) => patchZone(i, () => ({ label: e.target.value }))} placeholder="Zone label" disabled={disabled} />
            <IdInput value={zone.id} onChange={(v) => patchZone(i, () => ({ id: v }))} disabled={disabled} />
            <MediaReferenceEditor media={zone.image} onChange={(image) => patchZone(i, () => ({ image }))} disabled={disabled} />
          </Row>
        ))}
        <AddButton onClick={addZone} disabled={disabled || zones.length >= LIMITS.zones.max || modeIsSingle}>
          + Add zone
        </AddButton>
        {modeIsSingle ? <p className="aq-field__hint">Single-target mode allows exactly one zone.</p> : null}
      </Section>

      <Section title="Behaviour">
        <div className="aq-toggles">
          <Toggle label="Multi-target mode" checked={payload.mode !== 'single-target'} onChange={(multi) => emit({ ...payload, mode: multi ? 'multi-target' : 'single-target', zones: multi ? zones : zones.slice(0, 1) })} disabled={disabled} />
          <Toggle label="Randomize item order" checked={payload.randomizeItems !== false} onChange={(v) => emit({ ...payload, randomizeItems: v })} disabled={disabled} />
          <Toggle label="Allow retry" checked={payload.allowRetry !== false} onChange={(v) => emit({ ...payload, allowRetry: v })} disabled={disabled} />
        </div>
      </Section>

      {itemIds.length > 0 && itemIds.length !== new Set(itemIds).size ? (
        <p className="aq-ve__warn">Duplicate item ids were detected — fix them before saving.</p>
      ) : null}
      <p className="aq-ve__note">The correct-answer mappings are built automatically from each item’s “Goes to” assignment.</p>
    </div>
  )
}