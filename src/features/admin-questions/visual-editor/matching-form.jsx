/**
 * Admin Question Builder — Matching visual authoring form (Task 5.11A).
 *
 * Visual editor over the existing matching schema. Left/right cards and
 * optional distractors are authored as card lists; each left card’s target is
 * chosen from the right cards (shared targets allowed; distractors never
 * match). The correct-answer `pairs` document is derived from those choices,
 * so authors never hand-write pair JSON.
 */

import { Section, Row, LabeledInput, IdInput, MediaReferenceEditor, Toggle, SelectField, AddButton, RemoveButton } from './primitives.jsx'
import { makeLeftCard, makeRightCard, makeDistractor, buildMatchingAnswer } from './model.js'

const LIMITS = { left: { min: 2, max: 8 }, right: { min: 2, max: 8 }, distractors: { max: 3 } }

export default function MatchingVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const leftItems = Array.isArray(payload.leftItems) ? payload.leftItems : []
  const rightItems = Array.isArray(payload.rightItems) ? payload.rightItems : []
  const distractors = Array.isArray(payload.distractors) ? payload.distractors : []
  const pairs = Array.isArray(correctAnswer?.pairs) ? correctAnswer.pairs : []
  const rightByLeft = new Map(pairs.map((p) => [p.leftId, p.rightId]))

  const emit = (nextPayload) => {
    onChange({ payload: nextPayload, correctAnswer: buildMatchingAnswer(nextPayload.leftItems, nextPayload.rightItems, pairs) })
  }

  const patchList = (key, index, patchFn) => {
    const list = payload[key] ?? []
    const next = list.map((card, i) => (i === index ? { ...card, ...patchFn(card) } : card))
    emit({ ...payload, [key]: next })
  }

  const addLeft = () => {
    if (leftItems.length >= LIMITS.left.max) return
    emit({ ...payload, leftItems: [...leftItems, makeLeftCard(leftItems.map((c) => c.id))] })
  }

  const addRight = () => {
    if (rightItems.length >= LIMITS.right.max) return
    emit({ ...payload, rightItems: [...rightItems, makeRightCard(rightItems.map((c) => c.id))] })
  }

  const addDistractor = () => {
    if (distractors.length >= LIMITS.distractors.max) return
    emit({ ...payload, distractors: [...distractors, makeDistractor(distractors.map((c) => c.id))] })
  }

  const removeLeft = (index) => {
    emit({ ...payload, leftItems: leftItems.filter((_, i) => i !== index) })
  }

  const removeRight = (index) => {
    emit({ ...payload, rightItems: rightItems.filter((_, i) => i !== index) })
  }

  const removeDistractor = (index) => {
    emit({ ...payload, distractors: distractors.filter((_, i) => i !== index) })
  }

  const assignRight = (leftId, rightId) => {
    const updated = pairs.filter((p) => p.leftId !== leftId).concat({ leftId, rightId })
    onChange({ payload, correctAnswer: { pairs: updated } })
  }

  const rightOptions = rightItems.map((card) => ({ value: card.id, label: card.text || card.id }))

  return (
    <div className="aq-ve aq-ve--matching">
      <Section title="Left cards" description={`Paired from here (${leftItems.length}/${LIMITS.left.max}).`}>
        {leftItems.map((card, i) => (
          <Row key={card.id}>
            <LabeledInput label="Text" value={card.text ?? ''} onChange={(e) => patchList('leftItems', i, () => ({ text: e.target.value }))} placeholder="Left card text" disabled={disabled} />
            <IdInput value={card.id} onChange={(v) => patchList('leftItems', i, () => ({ id: v }))} disabled={disabled} />
            <SelectField
              label="Pairs with"
              value={rightByLeft.get(card.id) ?? ''}
              onChange={(rightId) => assignRight(card.id, rightId)}
              options={[{ value: '', label: '— choose right card —' }].concat(rightOptions)}
              disabled={disabled}
            />
            <MediaReferenceEditor media={card.image} onChange={(image) => patchList('leftItems', i, () => ({ image }))} disabled={disabled} />
            <RemoveButton onClick={() => removeLeft(i)} label={`Remove ${card.text || card.id}`} disabled={disabled || leftItems.length <= LIMITS.left.min} />
          </Row>
        ))}
        <AddButton onClick={addLeft} disabled={disabled || leftItems.length >= LIMITS.left.max}>
          + Add left card
        </AddButton>
      </Section>

      <Section title="Right cards" description={`Match targets (${rightItems.length}/${LIMITS.right.max}). More than one left card may pair with the same right card.`}>
        {rightItems.map((card, i) => (
          <Row key={card.id}>
            <LabeledInput label="Text" value={card.text ?? ''} onChange={(e) => patchList('rightItems', i, () => ({ text: e.target.value }))} placeholder="Right card text" disabled={disabled} />
            <IdInput value={card.id} onChange={(v) => patchList('rightItems', i, () => ({ id: v }))} disabled={disabled} />
            <MediaReferenceEditor media={card.image} onChange={(image) => patchList('rightItems', i, () => ({ image }))} disabled={disabled} />
            <RemoveButton onClick={() => removeRight(i)} label={`Remove ${card.text || card.id}`} disabled={disabled || rightItems.length <= LIMITS.right.min} />
          </Row>
        ))}
        <AddButton onClick={addRight} disabled={disabled || rightItems.length >= LIMITS.right.max}>
          + Add right card
        </AddButton>
      </Section>

      <Section title="Distractors" description={`Optional decoy cards (${distractors.length}/${LIMITS.distractors.max}). They never match a left card.`}>
        {distractors.map((card, i) => (
          <Row key={card.id}>
            <LabeledInput label="Text" value={card.text ?? ''} onChange={(e) => patchList('distractors', i, () => ({ text: e.target.value }))} placeholder="Distractor text" disabled={disabled} />
            <IdInput value={card.id} onChange={(v) => patchList('distractors', i, () => ({ id: v }))} disabled={disabled} />
            <MediaReferenceEditor media={card.image} onChange={(image) => patchList('distractors', i, () => ({ image }))} disabled={disabled} />
            <RemoveButton onClick={() => removeDistractor(i)} label={`Remove ${card.text || card.id}`} disabled={disabled} />
          </Row>
        ))}
        <AddButton onClick={addDistractor} disabled={disabled || distractors.length >= LIMITS.distractors.max}>
          + Add distractor
        </AddButton>
      </Section>

      <Section title="Behaviour">
        <Toggle label="Shuffle cards" checked={payload.shuffle !== false} onChange={(v) => emit({ ...payload, shuffle: v })} disabled={disabled} />
      </Section>

      <p className="aq-ve__note">The correct-answer pairs are built automatically from each left card’s “Pairs with” choice.</p>
    </div>
  )
}