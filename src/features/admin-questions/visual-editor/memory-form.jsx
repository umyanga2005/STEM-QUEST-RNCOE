/**
 * Admin Question Builder — Memory visual authoring form (Task 5.11B).
 *
 * Visual editor over the existing memory schema. Authors build the deck
 * (cards + reveal/recall settings) and define the answer groups visually: each
 * card is assigned to a group via its selector. The correct-answer document
 * `{ groups: [{ groupId, cardIds }] }` is derived from those assignments.
 * Deck-type group sizes (pairs = 2, sets = 3–4) are the existing plugin/schema
 * semantics — the advisory `memory.*` rules flag inconsistent decks.
 */

import { Section, Chip, LabeledInput, NumberField, SelectField, Toggle, MediaReferenceEditor, AddButton, RemoveButton } from './primitives.jsx'
import { makeMemoryCard, makeMemoryGroup, buildMemoryGroups } from './model.js'
import { groupSizeRange } from '../../activity-engine/plugins/memory/memory-controller.js'

const LIMITS = { cards: { min: 4, max: 12 }, groups: { min: 2, max: 6 } }
const DECK_TYPES = [
  { value: 'pairs', label: 'Pairs (groups of 2)' },
  { value: 'sets', label: 'Sets (groups of 3–4)' },
]

export default function MemoryVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const cards = Array.isArray(payload.cards) ? payload.cards : []
  const groups = Array.isArray(correctAnswer?.groups) ? correctAnswer.groups : []
  const assignmentByCard = new Map(groups.flatMap((g) => (g.cardIds ?? []).map((id) => [id, g.groupId])))
  const firstGroup = groups[0]?.groupId ?? ''
  const [minSize, maxSize] = groupSizeRange(payload.deckType ?? 'pairs')

  const emit = (nextPayload, nextGroups = groups) => {
    onChange({ payload: nextPayload, correctAnswer: buildMemoryGroups(nextPayload.cards, nextGroups, groupAssignments(nextPayload.cards, nextGroups)) })
  }

  const groupAssignments = (currentCards, currentGroups) => {
    const map = {}
    for (const group of currentGroups) {
      for (const id of group.cardIds ?? []) map[id] = group.groupId
    }
    // keep existing assignments for cards not explicitly placed; fall back to first group
    for (const card of currentCards) {
      if (map[card.id] === undefined) map[card.id] = firstGroup
    }
    return map
  }

  const patchCard = (index, patchFn) => {
    const cards2 = cards.map((c, i) => (i === index ? { ...c, ...patchFn(c) } : c))
    emit({ ...payload, cards: cards2 })
  }

  const addCard = () => {
    if (cards.length >= LIMITS.cards.max) return
    emit({ ...payload, cards: [...cards, makeMemoryCard(cards.map((c) => c.id))] })
  }

  const removeCard = (index) => {
    emit({ ...payload, cards: cards.filter((_, i) => i !== index) })
  }

  const addGroup = () => {
    if (groups.length >= LIMITS.groups.max) return
    const next = [...groups, makeMemoryGroup(groups.map((g) => g.groupId))]
    emit(payload, next)
  }

  const removeGroup = (index) => {
    if (groups.length <= LIMITS.groups.min) return
    emit(payload, groups.filter((_, i) => i !== index))
  }

  const assignCardId = (cardId, groupId) => {
    const safeGroup = groupId === '' ? firstGroup : groupId
    const nextGroups = groups.map((g) => ({
      groupId: g.groupId,
      cardIds: [...(g.cardIds ?? []).filter((id) => id !== cardId), ...(g.groupId === safeGroup ? [cardId] : [])],
    }))
    emit(payload, nextGroups)
  }

  const cardIds = cards.map((c) => c.id)

  return (
    <div className="aq-ve aq-ve--memory">
      <Section title="Deck" description="The memorization surface. Deck-type group sizes are enforced by the memory plugin semantics.">
        <div className="aq-row">
          <SelectField label="Deck type" value={payload.deckType ?? 'pairs'} onChange={(v) => emit({ ...payload, deckType: v })} options={DECK_TYPES} disabled={disabled} />
          <NumberField label="Reveal seconds" value={payload.revealSeconds ?? 10} min={5} max={30} onChange={(v) => emit({ ...payload, revealSeconds: v })} disabled={disabled} />
          <NumberField label="Max attempts" value={payload.maxAttempts ?? ''} min={1} max={5} onChange={(v) => emit({ ...payload, maxAttempts: v })} disabled={disabled} />
        </div>
        <div className="aq-row">
          <label className="aq-field aq-field--inline">
            <span className="aq-field__label">Recall prompt</span>
            <input value={payload.recallPrompt ?? ''} onChange={(e) => emit({ ...payload, recallPrompt: e.target.value })} placeholder="Match each card with its pair." disabled={disabled} />
          </label>
          <Toggle label="Shuffle deck" checked={payload.shuffle !== false} onChange={(v) => emit({ ...payload, shuffle: v })} disabled={disabled} />
        </div>
      </Section>

      <Section title="Cards" description={`Deck cards (${cards.length}/${LIMITS.cards.max}), each with text or an image.`}>
        {cards.map((card, i) => (
          <div className="aq-row" key={card.id}>
            <Chip>{card.id}</Chip>
            <LabeledInput label="Text" value={card.text ?? ''} onChange={(e) => patchCard(i, () => ({ text: e.target.value }))} placeholder="Card content" disabled={disabled} />
            <LabeledInput label="Id" value={card.id} onChange={(e) => patchCard(i, () => ({ id: e.target.value }))} placeholder="card_1" disabled={disabled} />
            <MediaReferenceEditor media={card.image} onChange={(image) => patchCard(i, () => ({ image }))} disabled={disabled} />
            <LabeledInput label="Aria" value={card.ariaLabel ?? ''} onChange={(e) => patchCard(i, () => ({ ariaLabel: e.target.value }))} placeholder="Optional" disabled={disabled} />
            <SelectField
              label="Group"
              value={assignmentByCard.get(card.id) ?? firstGroup}
              onChange={(groupId) => assignCardId(card.id, groupId)}
              options={groups.map((g) => ({ value: g.groupId, label: `${g.groupId} (${(g.cardIds ?? []).length} card${(g.cardIds ?? []).length === 1 ? '' : 's'})` }))}
              disabled={disabled}
            />
            <RemoveButton onClick={() => removeCard(i)} label={`Remove ${card.text || card.id}`} disabled={disabled || cards.length <= LIMITS.cards.min} />
          </div>
        ))}
        <AddButton onClick={addCard} disabled={disabled || cards.length >= LIMITS.cards.max}>
          + Add card
        </AddButton>
        {(payload.deckType ?? 'pairs') === 'pairs' && cards.length % 2 !== 0 ? (
          <p className="aq-ve__warn">A pairs deck must hold an even number of cards (got {cards.length}).</p>
        ) : null}
      </Section>

      <Section title="Groups" description={`Answer groups of ${minSize === maxSize ? minSize : `${minSize}–${maxSize}`} cards each (${groups.length}/${LIMITS.groups.max}). Every card must be in exactly one group.`}>
        <div className="aq-chips">
          {groups.map((group, i) => (
            <Chip key={group.groupId}>
              {group.groupId}
              <button type="button" className="aq-chip__remove" aria-label={`Remove ${group.groupId}`} onClick={() => removeGroup(i)} disabled={disabled || groups.length <= LIMITS.groups.min}>
                ×
              </button>
            </Chip>
          ))}
        </div>
        <AddButton onClick={addGroup} disabled={disabled || groups.length >= LIMITS.groups.max}>
          + Add group
        </AddButton>
        {groups.length < LIMITS.groups.min ? (
          <p className="aq-ve__warn">Add at least {LIMITS.groups.min} groups, then assign every card to one.</p>
        ) : null}
      </Section>

      {cardIds.length > 0 && cardIds.length !== new Set(cardIds).size ? (
        <p className="aq-ve__warn">Duplicate card ids were detected — fix them before saving.</p>
      ) : null}
      <p className="aq-ve__note">
        The correct-answer groups are built automatically from each card’s “Group” selector. Cards must fill {minSize === maxSize ? minSize : `${minSize}–${maxSize}`} per group.
      </p>
    </div>
  )
}