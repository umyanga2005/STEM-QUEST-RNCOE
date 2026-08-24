/**
 * Admin Question Builder — Number / Logic visual authoring form (Task 5.11B).
 *
 * Visual editor over the existing number-logic schema. Authors write the
 * problem, pick the answer format and input mode, and author the correct
 * answer (exact / tolerance / range / fraction / percent / sequence /
 * accepted-set) constrained to the types that answerFormat can represent.
 * Multi-part questions author per-part specs — D-075 parts-only scoring is
 * preserved (never invented). The correct-answer document is derived from the
 * authored specs.
 */

import { Section, Chip, LabeledInput, NumberField, SelectField, Toggle, AddButton, RemoveButton } from './primitives.jsx'
import { makeNumberLogicPart, buildNumberLogicAnswer } from './model.js'
import { COMPATIBLE_TYPES } from '../../activity-engine/plugins/number-logic/plugin.js'

const LIMITS = { parts: { min: 2, max: 4 } }
const FORMATS = [
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'fraction', label: 'Fraction' },
  { value: 'percent', label: 'Percent' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'expression', label: 'Expression' },
]
const INPUT_MODES = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'text', label: 'Text' },
]
const TYPE_LABELS = {
  exact: 'Exact',
  tolerance: 'Value ± tolerance',
  range: 'Range (min–max)',
  fraction: 'Fraction',
  percent: 'Percent',
  sequence: 'Sequence',
  'accepted-set': 'Accepted set',
}

function typeOptions(answerFormat) {
  const types = COMPATIBLE_TYPES[answerFormat] ?? new Set(['exact'])
  return [...types].map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t }))
}

function defaultType(answerFormat) {
  const types = [...(COMPATIBLE_TYPES[answerFormat] ?? new Set(['exact']))]
  return types[0] ?? 'exact'
}

function specFromAnswer(correctAnswer) {
  const spec = { type: correctAnswer?.type ?? 'exact', ...(correctAnswer ?? {}) }
  if (spec.type === 'sequence' && !Array.isArray(spec.values)) spec.values = []
  if (spec.type === 'accepted-set' && !Array.isArray(spec.accepted)) spec.accepted = []
  return spec
}

function partSpecFromAnswer(correctAnswer, parts) {
  const map = {}
  for (const part of parts ?? []) {
    const entry = (correctAnswer?.parts ?? []).find((p) => p.partId === part.id)
    map[part.id] = specFromAnswer(entry ?? { type: defaultType(part.answerFormat) })
  }
  return map
}

export default function NumberLogicVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const parts = Array.isArray(payload.parts) ? payload.parts : []
  const multiPart = parts.length > 0
  const answerFormat = payload.answerFormat ?? 'integer'
  const spec = specFromAnswer(correctAnswer)
  const partSpecs = partSpecFromAnswer(correctAnswer, parts)

  const emitAnswer = (nextPayload, type, fields, nextPartSpecs) => {
    const partsMap = {}
    for (const part of nextPayload.parts ?? []) {
      partsMap[part.id] = nextPartSpecs?.[part.id] ?? partSpecs[part.id] ?? { type: defaultType(part.answerFormat) }
    }
    onChange({
      payload: nextPayload,
      correctAnswer: buildNumberLogicAnswer(nextPayload, { type, fields, parts: partsMap }),
    })
  }

  const patchProblem = (patchFn) => {
    emitAnswer({ ...payload, ...patchFn() }, spec.type, spec, partSpecs)
  }

  const toggleParts = (on) => {
    if (on) {
      const next = [makeNumberLogicPart([]), makeNumberLogicPart(['part_1'])]
      emitAnswer({ ...payload, parts: next }, spec.type, spec, {})
    } else {
      emitAnswer({ ...payload, parts: undefined }, spec.type, spec, partSpecs)
    }
  }

  const patchPart = (index, patchFn) => {
    const next = parts.map((p, i) => (i === index ? { ...p, ...patchFn(p) } : p))
    emitAnswer({ ...payload, parts: next }, spec.type, spec, partSpecs)
  }

  const addPart = () => {
    if (parts.length >= LIMITS.parts.max) return
    const next = [...parts, makeNumberLogicPart(parts.map((p) => p.id))]
    emitAnswer({ ...payload, parts: next }, spec.type, spec, partSpecs)
  }

  const removePart = (index) => {
    emitAnswer({ ...payload, parts: parts.filter((_, i) => i !== index) }, spec.type, spec, partSpecs)
  }

  const setFormat = (format) => {
    const type = defaultType(format)
    const base = { type }
    emitAnswer({ ...payload, answerFormat: format }, type, base, partSpecs)
  }

  const patchPartSpec = (partId, patchFn) => {
    const next = { ...partSpecs[partId], ...patchFn(partSpecs[partId] ?? {}) }
    emitAnswer(payload, spec.type, spec, { ...partSpecs, [partId]: next })
  }

  const patchFields = (patchFn) => {
    const next = patchFn(spec)
    emitAnswer(payload, spec.type, next, partSpecs)
  }

  const setAnswerType = (type) => {
    const next = { type }
    emitAnswer(payload, type, next, partSpecs)
  }

  return (
    <div className="aq-ve aq-ve--number">
      <Section title="Problem" description="The challenge the student solves. Answer format drives which answer types are available.">
        <label className="aq-field">
          <span className="aq-field__label">Problem</span>
          <textarea rows={3} value={payload.problem ?? ''} onChange={(e) => patchProblem(() => ({ problem: e.target.value }))} placeholder="Solve for the missing value." disabled={disabled} />
        </label>
        <div className="aq-row">
          <SelectField label="Answer format" value={answerFormat} onChange={setFormat} options={FORMATS} disabled={disabled} />
          <SelectField label="Input mode" value={payload.inputMode ?? 'numeric'} onChange={(v) => patchProblem(() => ({ inputMode: v }))} options={INPUT_MODES} disabled={disabled} />
          <Toggle label="Show work" checked={payload.showWork !== false} onChange={(v) => patchProblem(() => ({ showWork: v }))} disabled={disabled} />
        </div>
      </Section>

      {multiPart ? (
        <Section title="Parts" description={`Multi-step question — each part carries its own answer spec (per-part partial credit, D-075).`}>
          {parts.map((part, i) => (
            <div className="aq-subsection" key={part.id}>
              <div className="aq-row">
                <Chip>Part {i + 1}</Chip>
                <SelectField label="Answer format" value={part.answerFormat} onChange={(v) => patchPart(i, () => ({ answerFormat: v }))} options={FORMATS} disabled={disabled} />
                <RemoveButton onClick={() => removePart(i)} label={`Remove part ${i + 1}`} disabled={disabled || parts.length <= LIMITS.parts.min} />
              </div>
              <div className="aq-row">
                <LabeledInput label="Part label" value={part.label ?? ''} onChange={(e) => patchPart(i, () => ({ label: e.target.value }))} placeholder="e.g. Step 1" disabled={disabled} />
                <LabeledInput label="Id" value={part.id} onChange={(e) => patchPart(i, () => ({ id: e.target.value }))} placeholder="part_1" disabled={disabled} />
              </div>
              <AnswerSpecEditor
                format={part.answerFormat}
                spec={partSpecs[part.id] ?? { type: defaultType(part.answerFormat) }}
                onTypeChange={(t) => patchPartSpec(part.id, () => ({ type: t }))}
                onPatch={(patchFn) => patchPartSpec(part.id, patchFn)}
                disabled={disabled}
              />
            </div>
          ))}
          <AddButton onClick={addPart} disabled={disabled || parts.length >= LIMITS.parts.max}>
            + Add part
          </AddButton>
        </Section>
      ) : (
        <Section title="Correct-answer spec" description={`Answer type for the ${answerFormat} format.`}>
          <AnswerSpecEditor
            format={answerFormat}
            spec={spec}
            onTypeChange={setAnswerType}
            onPatch={patchFields}
            disabled={disabled}
          />
        </Section>
      )}

      <div className="aq-row">
        <Toggle label="Multi-part question" checked={multiPart} onChange={toggleParts} disabled={disabled} />
      </div>
      <p className="aq-ve__note">The correct-answer document is built automatically from the answer specs above — the server (and advisory rules) validate every part’s fields.</p>
    </div>
  )
}

function AnswerSpecEditor({ format, spec, onTypeChange, onPatch, disabled }) {
  const type = spec.type ?? defaultType(format)
  return (
    <div className="aq-subsection__accepted">
      <div className="aq-row">
        <SelectField label="Answer type" value={type} onChange={onTypeChange} options={typeOptions(format)} disabled={disabled} />
      </div>
      {type === 'exact' || type === 'percent' ? (
        <div className="aq-row">
          <NumberField label={type === 'percent' ? 'Percent' : 'Value'} value={spec.value ?? 0} onChange={(v) => onPatch((s) => ({ ...s, value: v }))} disabled={disabled} />
        </div>
      ) : null}
      {type === 'tolerance' ? (
        <div className="aq-row">
          <NumberField label="Value" value={spec.value ?? 0} onChange={(v) => onPatch((s) => ({ ...s, value: v }))} disabled={disabled} />
          <NumberField label="Tolerance" value={spec.tolerance ?? 0} min={0} onChange={(v) => onPatch((s) => ({ ...s, tolerance: v }))} disabled={disabled} />
        </div>
      ) : null}
      {type === 'range' ? (
        <div className="aq-row">
          <NumberField label="Min" value={spec.min ?? 0} onChange={(v) => onPatch((s) => ({ ...s, min: v }))} disabled={disabled} />
          <NumberField label="Max" value={spec.max ?? 1} onChange={(v) => onPatch((s) => ({ ...s, max: v }))} disabled={disabled} />
        </div>
      ) : null}
      {type === 'fraction' ? (
        <div className="aq-row">
          <NumberField label="Numerator" value={spec.numerator ?? 1} onChange={(v) => onPatch((s) => ({ ...s, numerator: v }))} disabled={disabled} />
          <NumberField label="Denominator" value={spec.denominator ?? 1} min={1} onChange={(v) => onPatch((s) => ({ ...s, denominator: v }))} disabled={disabled} />
        </div>
      ) : null}
      {type === 'sequence' ? (
        <SequenceValuesEditor values={spec.values ?? []} onPatch={(values) => onPatch((s) => ({ ...s, values }))} disabled={disabled} />
      ) : null}
      {type === 'accepted-set' ? (
        <AcceptedSetEditor accepted={spec.accepted ?? []} onPatch={(accepted) => onPatch((s) => ({ ...s, accepted }))} disabled={disabled} />
      ) : null}
    </div>
  )
}

function SequenceValuesEditor({ values, onPatch, disabled }) {
  return (
    <div className="aq-subsection__accepted">
      <span className="aq-field__label">Sequence values (element-wise)</span>
      {values.map((value, i) => (
        <div className="aq-row" key={`seq-${i}`}>
          <NumberField label={`Value ${i + 1}`} value={value} onChange={(v) => onPatch(values.map((entry, j) => (j === i ? v : entry)))} disabled={disabled} />
          <RemoveButton onClick={() => onPatch(values.filter((_, j) => j !== i))} label={`Remove value ${i + 1}`} disabled={disabled || values.length <= 2} />
        </div>
      ))}
      <AddButton onClick={() => onPatch([...values, 0])} disabled={disabled || values.length >= 12}>
        + Add sequence value
      </AddButton>
    </div>
  )
}

function AcceptedSetEditor({ accepted, onPatch, disabled }) {
  return (
    <div className="aq-subsection__accepted">
      <span className="aq-field__label">Accepted forms (whitespace-normalized, no eval)</span>
      {accepted.map((form, i) => (
        <div className="aq-row" key={`accepted-${i}`}>
          <LabeledInput label={`Form ${i + 1}`} value={form} onChange={(e) => onPatch(accepted.map((entry, j) => (j === i ? e.target.value : entry)))} placeholder="x^2" disabled={disabled} />
          <RemoveButton onClick={() => onPatch(accepted.filter((_, j) => j !== i))} label={`Remove form ${i + 1}`} disabled={disabled} />
        </div>
      ))}
      <AddButton onClick={() => onPatch([...accepted, ''])} disabled={disabled || accepted.length >= 8}>
        + Add accepted form
      </AddButton>
    </div>
  )
}