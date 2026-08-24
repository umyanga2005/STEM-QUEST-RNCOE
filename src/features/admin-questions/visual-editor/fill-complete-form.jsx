/**
 * Admin Question Builder — Fill & Complete visual authoring form (Task 5.11B).
 *
 * Visual editor over the existing fill-complete schema. Authors write the
 * template with ___ placeholders and configure each numbered blank (type,
 * label, prefix/suffix, max length) and its accepted answers. The
 * correct-answer document (`answers`/`numeric`/`expression` groups) is derived
 * from the per-blank answer specs — never hand-written. Blanks without an
 * authored answer are surfaced by the advisory `fill-complete.blanks-referenced`
 * rule so every payload blank ends up with exactly one typed answer.
 */

import { Section, Chip, LabeledInput, NumberField, SelectField, Toggle, AddButton, RemoveButton } from './primitives.jsx'
import { makeBlank, buildBlankAnswers } from './model.js'

const LIMITS = { blanks: { min: 1, max: 4 }, accepted: { min: 1, max: 8 } }
const BLANK_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'expression', label: 'Expression' },
]
const KEYPADS = [
  { value: 'default', label: 'Default' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
]

/** Per-blank authored answer spec derived from the existing correctAnswer. */
function specFromAnswer(blanks, correctAnswer) {
  const spec = {}
  for (const entry of correctAnswer?.answers ?? []) spec[entry.blankId] = { accepted: [...(entry.accepted ?? [])] }
  for (const entry of correctAnswer?.expression ?? []) spec[entry.blankId] = { accepted: [...(entry.accepted ?? [])] }
  for (const entry of correctAnswer?.numeric ?? []) {
    spec[entry.blankId] =
      entry.min !== undefined && entry.max !== undefined
        ? { mode: 'range', min: entry.min, max: entry.max }
        : { mode: 'value', value: entry.value ?? 0, tolerance: entry.tolerance ?? 0 }
  }
  for (const blank of blanks) {
    if (spec[blank.id]) spec[blank.id].type = blank.type
    if (!spec[blank.id]) spec[blank.id] = { type: blank.type }
  }
  return spec
}

export default function FillCompleteVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const blanks = Array.isArray(payload.blanks) ? payload.blanks : []
  const specs = specFromAnswer(blanks, correctAnswer)

  const emit = (nextPayload, nextSpecs = specs) => {
    onChange({ payload: nextPayload, correctAnswer: buildBlankAnswers(nextPayload.blanks, nextSpecs) })
  }

  const patchBlank = (index, patchFn) => {
    const blanks2 = blanks.map((b, i) => (i === index ? { ...b, ...patchFn(b) } : b))
    emit({ ...payload, blanks: blanks2 })
  }

  const addBlank = () => {
    if (blanks.length >= LIMITS.blanks.max) return
    emit({ ...payload, blanks: [...blanks, makeBlank(blanks.map((b) => b.id))] })
  }

  const removeBlank = (index) => {
    emit({ ...payload, blanks: blanks.filter((_, i) => i !== index) })
  }

  const patchSpec = (blankId, patchFn) => {
    const next = { ...specs[blankId], ...patchFn(specs[blankId] ?? {}) }
    emit(payload, { ...specs, [blankId]: next })
  }

  const addAccepted = (blankId) => {
    patchSpec(blankId, (spec) => ({ accepted: [...(spec.accepted ?? []), ''] }))
  }

  const patchAccepted = (blankId, index, value) => {
    patchSpec(blankId, (spec) => ({ accepted: (spec.accepted ?? []).map((a, i) => (i === index ? value : a)) }))
  }

  const removeAccepted = (blankId, index) => {
    patchSpec(blankId, (spec) => ({ accepted: (spec.accepted ?? []).filter((_, i) => i !== index) }))
  }

  const blankIds = blanks.map((b) => b.id)
  const placeholderCount = (payload.template.match(/___/g) ?? []).length

  return (
    <div className="aq-ve aq-ve--fill">
      <Section title="Template" description="Text with ___ placeholders — exactly one per blank, in order.">
        <label className="aq-field">
          <span className="aq-field__label">Template</span>
          <textarea
            rows={4}
            value={payload.template ?? ''}
            onChange={(e) => emit({ ...payload, template: e.target.value })}
            placeholder="The capital of France is ___. Its currency is the ___."
            disabled={disabled}
          />
        </label>
        {placeholderCount !== blanks.length ? (
          <p className="aq-ve__warn">
            The template has {placeholderCount} placeholder(s) but {blanks.length} blank(s) — they must match.
          </p>
        ) : null}
        <div className="aq-toggles">
          <SelectField label="Keypad" value={payload.keypad ?? 'default'} onChange={(v) => emit({ ...payload, keypad: v })} options={KEYPADS} disabled={disabled} />
        </div>
      </Section>

      <Section title="Blanks" description={`Numbered answer blanks (${blanks.length}/${LIMITS.blanks.max}). Each blank stores its own accepted answers below.`}>
        {blanks.map((blank, i) => (
          <div className="aq-subsection" key={blank.id}>
            <div className="aq-row">
              <Chip>Blank {i + 1}</Chip>
              <SelectField label="Type" value={blank.type} onChange={(v) => patchBlank(i, () => ({ type: v }))} options={BLANK_TYPES} disabled={disabled} />
              <RemoveButton onClick={() => removeBlank(i)} label={`Remove blank ${i + 1}`} disabled={disabled || blanks.length <= LIMITS.blanks.min} />
            </div>
            <div className="aq-row">
              <LabeledInput label="Label" value={blank.label ?? ''} onChange={(e) => patchBlank(i, () => ({ label: e.target.value }))} placeholder="Optional label" disabled={disabled} />
              <LabeledInput label="Id" value={blank.id} onChange={(e) => patchBlank(i, () => ({ id: e.target.value }))} placeholder="blank_1" disabled={disabled} />
              <LabeledInput label="Prefix" value={blank.prefix ?? ''} onChange={(e) => patchBlank(i, () => ({ prefix: e.target.value }))} placeholder="Optional prefix" disabled={disabled} />
              <LabeledInput label="Suffix" value={blank.suffix ?? ''} onChange={(e) => patchBlank(i, () => ({ suffix: e.target.value }))} placeholder="Optional suffix" disabled={disabled} />
              <NumberField label="Max length" value={blank.maxLength ?? 24} min={1} max={120} onChange={(v) => patchBlank(i, () => ({ maxLength: v }))} disabled={disabled} />
            </div>
            {blank.type === 'number' ? (
              <NumberBlankEditor
                spec={specs[blank.id] ?? { type: 'number' }}
                onPatch={(patchFn) => patchSpec(blank.id, patchFn)}
                disabled={disabled}
              />
            ) : (
              <div className="aq-subsection__accepted">
                <span className="aq-field__label">Accepted answers ({blank.type})</span>
                {(specs[blank.id]?.accepted ?? []).map((value, ai) => (
                  <div className="aq-row" key={`${blank.id}-accepted-${ai}`}>
                    <LabeledInput
                      label={`Answer ${ai + 1}`}
                      value={value}
                      onChange={(e) => patchAccepted(blank.id, ai, e.target.value)}
                      placeholder={blank.type === 'expression' ? 'x^2' : 'accepted value'}
                      disabled={disabled}
                    />
                    <RemoveButton onClick={() => removeAccepted(blank.id, ai)} label={`Remove answer ${ai + 1}`} disabled={disabled || (specs[blank.id]?.accepted?.length ?? 0) <= 1} />
                  </div>
                ))}
                <AddButton onClick={() => addAccepted(blank.id)} disabled={disabled || (specs[blank.id]?.accepted?.length ?? 0) >= LIMITS.accepted.max}>
                  + Add accepted answer
                </AddButton>
              </div>
            )}
          </div>
        ))}
        <AddButton onClick={addBlank} disabled={disabled || blanks.length >= LIMITS.blanks.max}>
          + Add blank
        </AddButton>
      </Section>

      {blankIds.length > 0 && blankIds.length !== new Set(blankIds).size ? (
        <p className="aq-ve__warn">Duplicate blank ids were detected — fix them before saving.</p>
      ) : null}
      <p className="aq-ve__note">The correct-answer document is built automatically from the accepted answers above. Every blank needs exactly one answer entry.</p>
    </div>
  )
}

function NumberBlankEditor({ spec, onPatch, disabled }) {
  const mode = spec.mode ?? 'value'
  return (
    <div className="aq-subsection__accepted">
      <span className="aq-field__label">Numeric answer</span>
      <div className="aq-row">
        <Toggle label="Range (min–max) instead of value ± tolerance" checked={mode === 'range'} onChange={(range) => onPatch(() => ({ mode: range ? 'range' : 'value', min: range ? 0 : undefined, max: range ? 10 : undefined }))} disabled={disabled} />
      </div>
      {mode === 'range' ? (
        <div className="aq-row">
          <NumberField label="Min" value={spec.min ?? 0} onChange={(v) => onPatch(() => ({ min: v, max: spec.max }))} disabled={disabled} />
          <NumberField label="Max" value={spec.max ?? 10} onChange={(v) => onPatch(() => ({ max: v, min: spec.min }))} disabled={disabled} />
        </div>
      ) : (
        <div className="aq-row">
          <NumberField label="Value" value={spec.value ?? 0} onChange={(v) => onPatch(() => ({ value: v, tolerance: spec.tolerance }))} disabled={disabled} />
          <NumberField label="Tolerance" value={spec.tolerance ?? 0} min={0} onChange={(v) => onPatch(() => ({ tolerance: v, value: spec.value }))} disabled={disabled} />
        </div>
      )}
    </div>
  )
}