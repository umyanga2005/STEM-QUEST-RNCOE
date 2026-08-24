/**
 * Admin Question Builder — Ordering visual authoring form (Task 5.11A).
 *
 * Visual editor over the existing ordering schema. The list order IS the
 * correct answer (position = rank): authors add/edit/reorder items and the
 * `correctAnswer.order` document is the authored list order. Anchors lock an
 * item to its current position and are derived from the list, so they can
 * never disagree with the correct answer.
 */

import { Section, Row, LabeledInput, IdInput, MediaReferenceEditor, Toggle, AddButton, RemoveButton, ReorderControls } from './primitives.jsx'
import { makeOrderItem, buildOrder, buildAnchors, moveInList } from './model.js'

const LIMITS = { items: { min: 3, max: 8 }, anchors: { max: 3 } }

export default function OrderingVisualForm({ payload, correctAnswer: _correctAnswer, onChange, disabled = false }) {
  const items = Array.isArray(payload.items) ? payload.items : []
  const anchors = Array.isArray(payload.anchors) ? payload.anchors : []
  const anchoredIds = new Set(anchors.map((a) => a.itemId))

  const emit = (nextItems, nextAnchors = anchors) => {
    const anchored = new Set(nextAnchors.map((a) => a.itemId))
    onChange({
      payload: { ...payload, items: nextItems, anchors: buildAnchors(nextItems, anchored) },
      correctAnswer: { order: buildOrder(nextItems) },
    })
  }

  const patchItem = (index, patchFn) => {
    emit(items.map((item, i) => (i === index ? { ...item, ...patchFn(item) } : item)))
  }

  const addItem = () => {
    if (items.length >= LIMITS.items.max) return
    emit([...items, makeOrderItem(items.map((item) => item.id))])
  }

  const removeItem = (index) => {
    const removed = items[index]
    const next = items.filter((_, i) => i !== index)
    emit(next, anchors.filter((a) => a.itemId !== removed.id))
  }

  const move = (index, delta) => {
    emit(moveInList(items, index, delta))
  }

  const toggleAnchor = (itemId, checked) => {
    if (checked && anchoredIds.size >= LIMITS.anchors.max) return
    const nextSet = new Set(anchoredIds)
    if (checked) nextSet.add(itemId)
    else nextSet.delete(itemId)
    emit(items, buildAnchors(items, nextSet))
  }

  const shuffleOn = payload.shuffle !== false
  const allAnchored = items.length > 0 && anchoredIds.size >= items.length

  return (
    <div className="aq-ve aq-ve--ordering">
      <Section title="Sequence" description={`The order below is the correct answer — position 1 is first (${items.length}/${LIMITS.items.max}). Reorder with the arrows.`}>
        {items.map((item, i) => (
          <Row key={item.id}>
            <span className="aq-rank">{i + 1}</span>
            <ReorderControls
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
              canUp={i > 0}
              canDown={i < items.length - 1}
              disabled={disabled}
            />
            <LabeledInput label="Label" value={item.label ?? ''} onChange={(e) => patchItem(i, () => ({ label: e.target.value }))} placeholder="Step label" disabled={disabled} />
            <IdInput value={item.id} onChange={(v) => patchItem(i, () => ({ id: v }))} disabled={disabled} />
            <Toggle
              label="Lock here"
              checked={anchoredIds.has(item.id)}
              onChange={(checked) => toggleAnchor(item.id, checked)}
              disabled={disabled}
            />
            <MediaReferenceEditor media={item.image} onChange={(image) => patchItem(i, () => ({ image }))} disabled={disabled} />
            <RemoveButton onClick={() => removeItem(i)} label={`Remove ${item.label || item.id}`} disabled={disabled || items.length <= LIMITS.items.min} />
          </Row>
        ))}
        <AddButton onClick={addItem} disabled={disabled || items.length >= LIMITS.items.max}>
          + Add step
        </AddButton>
      </Section>

      <Section title="Behaviour">
        <Toggle label="Shuffle free positions" checked={shuffleOn} onChange={(v) => onChange({ payload: { ...payload, shuffle: v }, correctAnswer: { order: buildOrder(items) } })} disabled={disabled} />
        {shuffleOn && allAnchored ? (
          <p className="aq-ve__warn">Shuffle is on but every position is locked — nothing can be shuffled.</p>
        ) : null}
      </Section>

      <p className="aq-ve__note">Anchors lock an item to its current position (max {LIMITS.anchors.max}). The correct-answer order follows the list automatically.</p>
    </div>
  )
}