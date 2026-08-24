/**
 * Admin Question Builder — Pattern visual authoring form (Task 5.11B).
 *
 * Visual editor over the existing pattern schema. Authors edit the visible
 * sequence elements, choose the interaction mode (construct-next /
 * fill-missing / complete-sequence), maintain the public candidate bank, and
 * author the correct-answer rule (candidate / numeric / text). The correct
 * answer supports MULTIPLE valid solutions via acceptableIds (any acceptable
 * candidate earns full credit). Element ids are shared with the sequence and
 * candidates — no overlap is enforced by the advisory pattern rules.
 */

import { Section, Chip, LabeledInput, NumberField, SelectField, Toggle, MediaReferenceEditor, AddButton, RemoveButton, ReorderControls } from './primitives.jsx'
import { makePatternElement, PATTERN_SHAPES, withPatternKind, buildPatternAnswer } from './model.js'

const LIMITS = { sequence: { min: 3, max: 8 }, candidates: { min: 2, max: 8 } }
const INTERACTIONS = [
  { value: 'construct-next', label: 'Construct next' },
  { value: 'fill-missing', label: 'Fill missing' },
  { value: 'complete-sequence', label: 'Complete sequence' },
]
const ANSWER_TYPES = [
  { value: 'candidate', label: 'Candidate(s)' },
  { value: 'numeric', label: 'Numeric value' },
  { value: 'text', label: 'Text value' },
]
const SHAPE_OPTIONS = PATTERN_SHAPES.map((s) => ({ value: s, label: s }))
const KINDS = [
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'shape', label: 'Shape' },
  { value: 'image', label: 'Image' },
]

function elementKind(element) {
  if (element.number !== undefined) return 'number'
  if (element.text !== undefined) return 'text'
  if (element.shape !== undefined) return 'shape'
  if (element.image !== undefined) return 'image'
  return 'number'
}

function answerFrom(correctAnswer) {
  const type = correctAnswer?.type ?? 'candidate'
  if (type === 'numeric') {
    return correctAnswer?.min !== undefined && correctAnswer?.max !== undefined
      ? { type: 'numeric', mode: 'range', min: correctAnswer.min, max: correctAnswer.max }
      : { type: 'numeric', mode: 'value', value: correctAnswer?.value ?? 0, tolerance: correctAnswer?.tolerance ?? 0 }
  }
  if (type === 'text') {
    return { type: 'text', accepted: [...(correctAnswer?.accepted ?? [])] }
  }
  return { type: 'candidate', acceptableIds: [...(correctAnswer?.acceptableIds ?? [])] }
}

export default function PatternVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const sequence = Array.isArray(payload.sequence) ? payload.sequence : []
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : []
  const interaction = payload.interaction ?? 'complete-sequence'
  const rawAnswer = answerFrom(correctAnswer)
  // A fresh/empty answer defaults to "all candidates acceptable" so the toggle
  // matches the emitted document.
  const answer =
    rawAnswer.type === 'candidate' && rawAnswer.acceptableIds.length === 0
      ? { ...rawAnswer, acceptableIds: candidates.map((c) => c.id) }
      : rawAnswer

  const emit = (nextPayload, spec) => {
    onChange({ payload: nextPayload, correctAnswer: buildPatternAnswer(nextPayload.interaction, nextPayload.candidates, spec) })
  }

  const emitSequence = (nextSequence, spec = answer) => emit({ ...payload, sequence: nextSequence }, spec)

  const patchElement = (list, index, patchFn) =>
    list.map((element, i) => (i === index ? { ...element, ...patchFn(element) } : element))

  const addSequence = () => {
    if (sequence.length >= LIMITS.sequence.max) return
    emitSequence([...sequence, makePatternElement('seq', sequence.map((e) => e.id))])
  }

  const removeSequence = (index) => {
    emitSequence(sequence.filter((_, i) => i !== index))
  }

  const moveSequence = (index, delta) => {
    const next = [...sequence]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    emitSequence(next)
  }

  const patchCandidates = (next, spec = answer) => emit({ ...payload, candidates: next }, spec)

  const addCandidate = () => {
    if (candidates.length >= LIMITS.candidates.max) return
    patchCandidates([...candidates, makePatternElement('cand', candidates.map((c) => c.id))])
  }

  const removeCandidate = (index) => {
    patchCandidates(candidates.filter((_, i) => i !== index))
  }

  const setAnswerType = (type) => {
    const base = { type }
    const next = type === 'numeric' ? { ...base, mode: 'value', value: 0, tolerance: 0 }
      : type === 'text' ? { ...base, accepted: [] }
      : { ...base, acceptableIds: candidates.map((c) => c.id) }
    emit(payload, next)
  }

  const patchAnswer = (patchFn) => emit(payload, patchFn(answer))

  const toggleAcceptable = (candidateId) => {
    const current = answer.acceptableIds ?? []
    const next = current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]
    patchAnswer((a) => ({ ...a, acceptableIds: next }))
  }

  const missingAt = payload.missingAt ?? 0
  const constructCount = payload.constructCount ?? 1
  const candidateIds = candidates.map((c) => c.id)

  return (
    <div className="aq-ve aq-ve--pattern">
      <Section title="Interaction" description="How the student completes the sequence.">
        <div className="aq-row">
          <SelectField label="Mode" value={interaction} onChange={(v) => {
            const next = { ...payload, interaction: v }
            if (v === 'fill-missing') next.missingAt = Math.min(payload.missingAt ?? 0, Math.max(0, sequence.length - 1))
            if (v === 'construct-next') next.constructCount = payload.constructCount ?? 1
            emit(next, answer)
          }} options={INTERACTIONS} disabled={disabled} />
          {interaction === 'construct-next' ? (
            <SelectField
              label="Elements to construct"
              value={constructCount}
              onChange={(v) => emit({ ...payload, interaction, constructCount: Number(v) }, answer)}
              options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
              disabled={disabled}
            />
          ) : null}
          {interaction === 'fill-missing' ? (
            <SelectField
              label="Hidden element"
              value={missingAt}
              onChange={(v) => emit({ ...payload, interaction, missingAt: Number(v) }, answer)}
              options={sequence.map((_, i) => ({ value: i, label: `Position ${i + 1}` }))}
              disabled={disabled}
            />
          ) : null}
        </div>
        {interaction === 'construct-next' && answer.type !== 'candidate' && constructCount > 1 ? (
          <p className="aq-ve__warn">A single numeric/text answer cannot serve a constructCount of {constructCount} — switch to candidate answers.</p>
        ) : null}
      </Section>

      <Section title="Sequence" description={`Visible pattern elements (${sequence.length}/${LIMITS.sequence.max}).`}>
        {sequence.map((element, i) => (
          <div className="aq-row aq-row--element" key={element.id}>
            <Chip>{i + 1}</Chip>
            <ReorderControls onUp={() => moveSequence(i, -1)} onDown={() => moveSequence(i, 1)} canUp={i > 0} canDown={i < sequence.length - 1} disabled={disabled} />
            <ElementEditor
              element={element}
              onPatch={(patchFn) => emitSequence(patchElement(sequence, i, patchFn))}
              disabled={disabled}
            />
            <RemoveButton onClick={() => removeSequence(i)} label={`Remove element ${i + 1}`} disabled={disabled || sequence.length <= LIMITS.sequence.min} />
          </div>
        ))}
        <AddButton onClick={addSequence} disabled={disabled || sequence.length >= LIMITS.sequence.max}>
          + Add sequence element
        </AddButton>
      </Section>

      <Section title="Candidates" description={`Construction bank (${candidates.length}/${LIMITS.candidates.max}) — the student chooses from these.`}>
        {candidates.map((candidate, i) => (
          <div className="aq-row aq-row--element" key={candidate.id}>
            <Chip>{candidate.id}</Chip>
            <ElementEditor
              element={candidate}
              onPatch={(patchFn) => patchCandidates(patchElement(candidates, i, patchFn))}
              disabled={disabled}
            />
            {answer.type === 'candidate' ? (
              <Toggle label="Acceptable" checked={(answer.acceptableIds ?? []).includes(candidate.id)} onChange={() => toggleAcceptable(candidate.id)} disabled={disabled} />
            ) : null}
            <RemoveButton onClick={() => removeCandidate(i)} label={`Remove ${candidate.id}`} disabled={disabled || candidates.length <= LIMITS.candidates.min} />
          </div>
        ))}
        <AddButton onClick={addCandidate} disabled={disabled || candidates.length >= LIMITS.candidates.max}>
          + Add candidate
        </AddButton>
      </Section>

      <Section title="Correct-answer rule" description="What earns credit. Multiple valid solutions are supported (any acceptable candidate).">
        <div className="aq-row">
          <SelectField label="Answer type" value={answer.type} onChange={setAnswerType} options={ANSWER_TYPES} disabled={disabled} />
        </div>
        {answer.type === 'candidate' ? (
          <div className="aq-row">
            <Toggle label="All candidates acceptable" checked={(answer.acceptableIds ?? []).length >= candidates.length} onChange={(all) => patchAnswer((a) => ({ ...a, acceptableIds: all ? candidates.map((c) => c.id) : [] }))} disabled={disabled} />
            <p className="aq-ve__note">
              {(answer.acceptableIds ?? []).length} acceptable candidate(s) via the toggles above.
            </p>
          </div>
        ) : answer.type === 'numeric' ? (
          <div className="aq-subsection__accepted">
            <div className="aq-row">
              <Toggle label="Range (min–max) instead of value ± tolerance" checked={answer.mode === 'range'} onChange={(range) => patchAnswer((a) => ({ ...a, mode: range ? 'range' : 'value', min: range ? 0 : undefined, max: range ? 10 : undefined }))} disabled={disabled} />
            </div>
            {answer.mode === 'range' ? (
              <div className="aq-row">
                <NumberField label="Min" value={answer.min ?? 0} onChange={(v) => patchAnswer((a) => ({ ...a, min: v, max: a.max }))} disabled={disabled} />
                <NumberField label="Max" value={answer.max ?? 10} onChange={(v) => patchAnswer((a) => ({ ...a, max: v, min: a.min }))} disabled={disabled} />
              </div>
            ) : (
              <div className="aq-row">
                <NumberField label="Value" value={answer.value ?? 0} onChange={(v) => patchAnswer((a) => ({ ...a, value: v, tolerance: a.tolerance }))} disabled={disabled} />
                <NumberField label="Tolerance" value={answer.tolerance ?? 0} min={0} onChange={(v) => patchAnswer((a) => ({ ...a, tolerance: v, value: a.value }))} disabled={disabled} />
              </div>
            )}
          </div>
        ) : (
          <div className="aq-subsection__accepted">
            <span className="aq-field__label">Accepted strings</span>
            {(answer.accepted ?? []).map((value, i) => (
              <div className="aq-row" key={`accepted-${i}`}>
                <LabeledInput label={`Accept ${i + 1}`} value={value} onChange={(e) => patchAnswer((a) => ({ ...a, accepted: (a.accepted ?? []).map((v, j) => (j === i ? e.target.value : v)) }))} placeholder="accepted value" disabled={disabled} />
                <RemoveButton onClick={() => patchAnswer((a) => ({ ...a, accepted: (a.accepted ?? []).filter((_, j) => j !== i) }))} label={`Remove accept ${i + 1}`} disabled={disabled} />
              </div>
            ))}
            <AddButton onClick={() => patchAnswer((a) => ({ ...a, accepted: [...(a.accepted ?? []), ''] }))} disabled={disabled || (answer.accepted?.length ?? 0) >= 8}>
              + Add accepted value
            </AddButton>
          </div>
        )}
      </Section>

      {sequence.length > 0 && sequence.length !== new Set(sequence.map((e) => e.id)).size ? (
        <p className="aq-ve__warn">Duplicate sequence element ids were detected — fix them before saving.</p>
      ) : null}
      {candidateIds.length > 0 && candidateIds.length !== new Set(candidateIds).size ? (
        <p className="aq-ve__warn">Duplicate candidate ids were detected — fix them before saving.</p>
      ) : null}
      <p className="aq-ve__note">The correct-answer rule is built from the toggles and fields above. Acceptable candidates allow multiple valid solutions.</p>
    </div>
  )
}

function ElementEditor({ element, onPatch, disabled }) {
  const kind = elementKind(element)
  return (
    <>
      <SelectField label="Kind" value={kind} onChange={(v) => onPatch(() => withPatternKind(element, v))} options={KINDS} disabled={disabled} />
      {kind === 'number' ? (
        <NumberField label="Value" value={element.number ?? 0} onChange={(v) => onPatch(() => ({ number: v }))} disabled={disabled} />
      ) : null}
      {kind === 'text' ? (
        <LabeledInput label="Text" value={element.text ?? ''} onChange={(e) => onPatch(() => ({ text: e.target.value }))} placeholder="Element text" disabled={disabled} />
      ) : null}
      {kind === 'shape' ? (
        <SelectField label="Shape" value={element.shape ?? 'circle'} onChange={(v) => onPatch(() => ({ shape: v }))} options={SHAPE_OPTIONS} disabled={disabled} />
      ) : null}
      {kind === 'image' ? (
        <MediaReferenceEditor media={element.image} onChange={(image) => onPatch(() => ({ image }))} disabled={disabled} />
      ) : null}
      <LabeledInput label="Id" value={element.id} onChange={(e) => onPatch(() => ({ id: e.target.value }))} placeholder="seq_1" disabled={disabled} />
      <LabeledInput label="Aria" value={element.ariaLabel ?? ''} onChange={(e) => onPatch(() => ({ ariaLabel: e.target.value }))} placeholder="Optional" disabled={disabled} />
    </>
  )
}