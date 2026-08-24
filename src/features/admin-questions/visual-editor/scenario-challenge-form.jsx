/**
 * Admin Question Builder — Scenario Challenge visual authoring form (Task 5.11B).
 *
 * Decision-tree authoring UI over the existing scenario schema. Scenario
 * Challenge is NOT an MCQ: the author writes the mission, builds decision
 * nodes with branching options (each leading to a next decision or ending the
 * scenario), and designates the optimal option per decision plus any acceptable
 * alternatives. The correct-answer optimalPath is the route actually followed
 * through the authored choices (entry decision → chosen options → their
 * nextDecision links → terminal), so it is traversable by construction.
 */

import { Section, Chip, LabeledInput, SelectField, Toggle, MediaReferenceEditor, AddButton, RemoveButton } from './primitives.jsx'
import { makeDecision, makeScenarioOption, buildScenarioAnswer } from './model.js'

const LIMITS = { decisions: { min: 1, max: 8 }, options: { min: 2, max: 4 } }

function answerFrom(payload, correctAnswer) {
  const decisions = Array.isArray(payload?.decisions) ? payload.decisions : []
  const optimal = {}
  for (const step of correctAnswer?.optimalPath ?? []) optimal[step.decisionId] = step.optionId
  for (const decision of decisions) {
    if (optimal[decision.id] === undefined) optimal[decision.id] = decision.options[0]?.id
  }
  const acceptable = {}
  for (const [decisionId, ids] of Object.entries(correctAnswer?.acceptableOptions ?? {})) {
    acceptable[decisionId] = [...ids]
  }
  return { optimal, acceptable }
}

export default function ScenarioChallengeVisualForm({ payload, correctAnswer, onChange, disabled = false }) {
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : []
  const { optimal, acceptable } = answerFrom(payload, correctAnswer)
  const decisionIds = decisions.map((d) => d.id)

  const emit = (nextPayload) => {
    const opts = answerFrom(nextPayload, correctAnswer)
    onChange({ payload: nextPayload, correctAnswer: buildScenarioAnswer(nextPayload, opts) })
  }

  const patchDecision = (index, patchFn) => {
    const next = decisions.map((d, i) => (i === index ? { ...d, ...patchFn(d) } : d))
    emit({ ...payload, decisions: next })
  }

  const addDecision = () => {
    if (decisions.length >= LIMITS.decisions.max) return
    const allOptionIds = decisions.flatMap((d) => d.options.map((o) => o.id))
    const next = [...decisions, makeDecision(decisionIds, allOptionIds)]
    emit({ ...payload, decisions: next })
  }

  const removeDecision = (index) => {
    const removed = decisions[index]
    const next = decisions.filter((_, i) => i !== index)
    // repoint options that referenced the removed decision to null
    const decisions2 = next.map((d) => ({
      ...d,
      options: d.options.map((o) => (o.nextDecision === removed.id ? { ...o, nextDecision: null } : o)),
    }))
    emit({ ...payload, decisions: decisions2, entryDecision: payload.entryDecision === removed.id ? next[0]?.id ?? '' : payload.entryDecision })
  }

  const patchOption = (decisionIndex, optionIndex, patchFn) => {
    patchDecision(decisionIndex, (d) => ({
      ...d,
      options: d.options.map((o, i) => (i === optionIndex ? { ...o, ...patchFn(o) } : o)),
    }))
  }

  const addOption = (decisionIndex) => {
    patchDecision(decisionIndex, (d) => {
      if (d.options.length >= LIMITS.options.max) return d
      const option = makeScenarioOption(d.options.map((o) => o.id))
      return { ...d, options: [...d.options, option] }
    })
  }

  const removeOption = (decisionIndex, optionIndex) => {
    patchDecision(decisionIndex, (d) => ({
      ...d,
      options: d.options.filter((_, i) => i !== optionIndex),
    }))
  }

  const setOptimal = (decisionId, optionId) => {
    const nextOptimal = { ...optimal, [decisionId]: optionId }
    onChange({ payload, correctAnswer: buildScenarioAnswer(payload, { optimal: nextOptimal, acceptable }) })
  }

  const toggleAcceptable = (decisionId, optionId) => {
    const current = acceptable[decisionId] ?? []
    const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
    const nextAcceptable = { ...acceptable, [decisionId]: next }
    onChange({ payload, correctAnswer: buildScenarioAnswer(payload, { optimal, acceptable: nextAcceptable }) })
  }

  const setEntry = (decisionId) => {
    emit({ ...payload, entryDecision: decisionId })
  }

  return (
    <div className="aq-ve aq-ve--scenario">
      <Section title="Mission" description="The scenario the student reads before making decisions.">
        <label className="aq-field">
          <span className="aq-field__label">Scenario text</span>
          <textarea rows={3} value={payload.scenarioText ?? ''} onChange={(e) => emit({ ...payload, scenarioText: e.target.value })} placeholder="The field is drying out and water is scarce." disabled={disabled} />
        </label>
        <div className="aq-editor__hints">
          <span className="aq-field__label">Presentational media (optional)</span>
          {(payload.media ?? []).map((media, i) => (
            <div className="aq-row" key={`scenario-media-${i}`}>
              <MediaReferenceEditor media={media} onChange={(next) => emit({ ...payload, media: (payload.media ?? []).map((m, j) => (j === i ? next : m)) })} disabled={disabled} />
              <RemoveButton onClick={() => emit({ ...payload, media: (payload.media ?? []).filter((_, j) => j !== i) })} label={`Remove media ${i + 1}`} disabled={disabled} />
            </div>
          ))}
          <AddButton onClick={() => emit({ ...payload, media: [...(payload.media ?? []), { ref: 'question-media/pending/pending/pending.png', alt: '' }] })} disabled={disabled || (payload.media?.length ?? 0) >= 3}>
            + Add media
          </AddButton>
        </div>
      </Section>

      <Section title="Decision tree" description={`Decision nodes (${decisions.length}/${LIMITS.decisions.max}). Each node has 2–4 options; an option leads to a next node or ends the scenario (terminal).`}>
        <div className="aq-row">
          <SelectField
            label="Entry decision"
            value={payload.entryDecision ?? ''}
            onChange={setEntry}
            options={decisionIds.map((id) => ({ value: id, label: id }))}
            disabled={disabled}
          />
        </div>
        {decisions.map((decision, di) => (
          <div className="aq-subsection" key={decision.id}>
            <div className="aq-row">
              <Chip>{decision.id}</Chip>
              <span className="aq-chip">{payload.entryDecision === decision.id ? 'entry' : ''}</span>
              <SelectField
                label="Optimal option"
                value={optimal[decision.id] ?? ''}
                onChange={(optionId) => setOptimal(decision.id, optionId)}
                options={decision.options.map((o) => ({ value: o.id, label: o.text || o.id }))}
                disabled={disabled}
              />
              <RemoveButton onClick={() => removeDecision(di)} label={`Remove ${decision.id}`} disabled={disabled || decisions.length <= LIMITS.decisions.min} />
            </div>
            <div className="aq-row">
              <label className="aq-field aq-field--inline">
                <span className="aq-field__label">Decision text</span>
                <input value={decision.text ?? ''} onChange={(e) => patchDecision(di, () => ({ text: e.target.value }))} placeholder="How should the farmer water the crop?" disabled={disabled} />
              </label>
              <LabeledInput label="Id" value={decision.id} onChange={(e) => patchDecision(di, () => ({ id: e.target.value }))} placeholder="decision_1" disabled={disabled} />
            </div>
            <div className="aq-subsection__accepted">
              <span className="aq-field__label">Options</span>
              {decision.options.map((option, oi) => (
                <div className="aq-row" key={option.id}>
                  <LabeledInput label="Option text" value={option.text ?? ''} onChange={(e) => patchOption(di, oi, () => ({ text: e.target.value }))} placeholder="Option text" disabled={disabled} />
                  <LabeledInput label="Consequence" value={option.outcomeText ?? ''} onChange={(e) => patchOption(di, oi, () => ({ outcomeText: e.target.value }))} placeholder="Shown after choosing" disabled={disabled} />
                  <SelectField
                    label="Next decision"
                    value={option.nextDecision ?? ''}
                    onChange={(v) => patchOption(di, oi, () => ({ nextDecision: v === '' ? null : v }))}
                    options={[{ value: '', label: '— end scenario —' }].concat(decisionIds.filter((id) => id !== decision.id).map((id) => ({ value: id, label: id })))}
                    disabled={disabled}
                  />
                  <Toggle label="Acceptable" checked={(acceptable[decision.id] ?? []).includes(option.id)} onChange={() => toggleAcceptable(decision.id, option.id)} disabled={disabled} />
                  <RemoveButton onClick={() => removeOption(di, oi)} label={`Remove option ${oi + 1}`} disabled={disabled || decision.options.length <= LIMITS.options.min} />
                </div>
              ))}
              <AddButton onClick={() => addOption(di)} disabled={disabled || decision.options.length >= LIMITS.options.max}>
                + Add option
              </AddButton>
            </div>
          </div>
        ))}
        <AddButton onClick={addDecision} disabled={disabled || decisions.length >= LIMITS.decisions.max}>
          + Add decision
        </AddButton>
      </Section>

      {decisionIds.length > 0 && decisionIds.length !== new Set(decisionIds).size ? (
        <p className="aq-ve__warn">Duplicate decision ids were detected — fix them before saving.</p>
      ) : null}
      <p className="aq-ve__note">
        The optimal path follows the chosen “Optimal option” through its next-decision links to a terminal option. “Acceptable” options are valid alternatives at their node.
      </p>
    </div>
  )
}