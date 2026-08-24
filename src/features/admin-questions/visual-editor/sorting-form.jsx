/**
 * Admin Question Builder — Sorting visual authoring form (Task 5.11A).
 *
 * Visual editor over the existing sorting schema. Categories and items are
 * authored as card lists; each item is assigned to a category visually and
 * the correct-answer `assignments` document is derived from those choices.
 */

import { Section, Row, Chip, LabeledInput, IdInput, MediaReferenceEditor, Toggle, SelectField, AddButton, RemoveButton } from './primitives.jsx'
import { makeCategory, makeSortItem, buildSortingAnswer } from './model.js'

const LIMITS = { categories: { min: 2, max: 5 }, items: { min: 3, max: 12 } }

export default function SortingVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const items = Array.isArray(payload.items) ? payload.items : []
  const categories = Array.isArray(payload.categories) ? payload.categories : []
  const assignments = Array.isArray(correctAnswer?.assignments) ? correctAnswer.assignments : []
  const categoryByItem = new Map(assignments.map((a) => [a.itemId, a.categoryId]))

  const emit = (nextPayload) => {
    onChange({ payload: nextPayload, correctAnswer: buildSortingAnswer(nextPayload.items, nextPayload.categories, assignments) })
  }

  const patchList = (key, index, patchFn) => {
    const list = payload[key] ?? []
    const next = list.map((card, i) => (i === index ? { ...card, ...patchFn(card) } : card))
    emit({ ...payload, [key]: next })
  }

  const addItem = () => {
    if (items.length >= LIMITS.items.max) return
    emit({ ...payload, items: [...items, makeSortItem(items.map((item) => item.id))] })
  }

  const addCategory = () => {
    if (categories.length >= LIMITS.categories.max) return
    emit({ ...payload, categories: [...categories, makeCategory(categories.map((c) => c.id))] })
  }

  const removeItem = (index) => {
    emit({ ...payload, items: items.filter((_, i) => i !== index) })
  }

  const removeCategory = (index) => {
    emit({ ...payload, categories: categories.filter((_, i) => i !== index) })
  }

  const assignCategory = (itemId, categoryId) => {
    const updated = assignments.filter((a) => a.itemId !== itemId).concat({ itemId, categoryId })
    onChange({ payload, correctAnswer: { assignments: updated } })
  }

  const countInCategory = (categoryId) => assignments.filter((a) => a.categoryId === categoryId).length
  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.label || category.id }))

  return (
    <div className="aq-ve aq-ve--sorting">
      <Section title="Categories" description={`Groups to sort into (${categories.length}/${LIMITS.categories.max}).`}>
        <div className="aq-chips">
          {categories.map((category) => (
            <Chip key={category.id}>
              {category.label || category.id} ({countInCategory(category.id)})
            </Chip>
          ))}
        </div>
        {categories.map((category, i) => (
          <Row key={`edit-${category.id}`}>
            <LabeledInput label="Category label" value={category.label ?? ''} onChange={(e) => patchList('categories', i, () => ({ label: e.target.value }))} placeholder="Category label" disabled={disabled} />
            <IdInput value={category.id} onChange={(v) => patchList('categories', i, () => ({ id: v }))} disabled={disabled} />
            <MediaReferenceEditor media={category.image} onChange={(image) => patchList('categories', i, () => ({ image }))} disabled={disabled} />
            <RemoveButton onClick={() => removeCategory(i)} label={`Remove ${category.label || category.id}`} disabled={disabled || categories.length <= LIMITS.categories.min} />
          </Row>
        ))}
        <AddButton onClick={addCategory} disabled={disabled || categories.length >= LIMITS.categories.max}>
          + Add category
        </AddButton>
      </Section>

      <Section title="Items" description={`Classify each item (${items.length}/${LIMITS.items.max}).`}>
        {items.map((item, i) => (
          <Row key={item.id}>
            <LabeledInput label="Label" value={item.label ?? ''} onChange={(e) => patchList('items', i, () => ({ label: e.target.value }))} placeholder="Item label" disabled={disabled} />
            <IdInput value={item.id} onChange={(v) => patchList('items', i, () => ({ id: v }))} disabled={disabled} />
            <SelectField
              label="Category"
              value={categoryByItem.get(item.id) ?? ''}
              onChange={(categoryId) => assignCategory(item.id, categoryId)}
              options={[{ value: '', label: '— choose category —' }].concat(categoryOptions)}
              disabled={disabled}
            />
            <MediaReferenceEditor media={item.image} onChange={(image) => patchList('items', i, () => ({ image }))} disabled={disabled} />
            <RemoveButton onClick={() => removeItem(i)} label={`Remove ${item.label || item.id}`} disabled={disabled || items.length <= LIMITS.items.min} />
          </Row>
        ))}
        <AddButton onClick={addItem} disabled={disabled || items.length >= LIMITS.items.max}>
          + Add item
        </AddButton>
      </Section>

      <Section title="Behaviour">
        <Toggle label="Shuffle item order" checked={payload.shuffle !== false} onChange={(v) => emit({ ...payload, shuffle: v })} disabled={disabled} />
      </Section>

      <p className="aq-ve__note">The correct-answer assignments are built automatically from each item’s “Category” choice.</p>
    </div>
  )
}