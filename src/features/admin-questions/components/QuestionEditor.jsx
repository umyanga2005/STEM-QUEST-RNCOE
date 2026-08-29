import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useQuestionCatalogue, useQuestionDetail, useCreateQuestion, useUpdateQuestion, useSubmitForReview, useCreateQuestionVersion } from '../queries/queries.js'
import { buildQuestionTemplate, QUESTION_ACTIVITY_LABELS } from '../templates/templates.js'
import { validateClientDraft } from '../validation/validate-draft.js'
import VisualFormFor from '../visual-editor/index.jsx'
import { hasVisualForm, checkAnswerIntegrity } from '../visual-editor/registry.js'
import { Field, Section, ValidationSummary, AddButton, RemoveButton, MediaReferenceEditor } from '../visual-editor/primitives.jsx'
import QuestionPreview from './QuestionPreview.jsx'

/**
 * Admin Question Builder — editor (Task 5.10 + Task 5.11A/B visual forms).
 *
 * Authoring surface for a single question. All ten production activity types
 * use visual authoring forms that generate the exact existing payload and
 * correctAnswer structures; the raw JSON editors remain only as the fallback
 * for unknown/future activity types.
 *
 * correctAnswer remains server-only: it crosses the network only via
 * `GET /:id` into this editor's draft state, is never rendered, and the
 * preview reduces the draft to its student-visible fields before calling
 * `engine.render` (SECURITY_CORRECT_ANSWER_EXPOSED still guards the renderer).
 *
 * Published/archived questions are read-only (D-044): the form controls are
 * disabled and no save is offered.
 */

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
const DIFFICULTIES = [1, 2, 3, 4, 5]
const FEEDBACK_KEYS = ['correct', 'partial', 'incorrect', 'timeout']
const MAX_HINTS = 3

const DEFAULT_STREAMS = [
  { slug: 'science', name: 'Science' },
  { slug: 'technology', name: 'Technology' },
  { slug: 'engineering', name: 'Engineering' },
  { slug: 'mathematics', name: 'Mathematics' },
]

const DEFAULT_ACTIVITY_TYPES = Object.keys(QUESTION_ACTIVITY_LABELS).map((slug) => ({
  slug,
  name: QUESTION_ACTIVITY_LABELS[slug],
}))

export default function QuestionEditor({ questionId = null }) {
  const { id } = useParams()
  const editingId = questionId ?? id ?? null
  const navigate = useNavigate()

  const catalogueQuery = useQuestionCatalogue()
  const detailQuery = useQuestionDetail(editingId, { enabled: editingId != null })
  const createMutation = useCreateQuestion()
  const updateMutation = useUpdateQuestion(editingId)
  const submitMutation = useSubmitForReview()
  const versionMutation = useCreateQuestionVersion() // FIX: P3-006
  const [versionError, setVersionError] = useState(null) // FIX: P3-006
  const queryClient = useQueryClient()

  // Lazy-initialise from the query cache so SSR renders are deterministic
  // (effects never run under renderToStaticMarkup). The effect below keeps a
  // browser editor in sync when the detail query resolves asynchronously.
  const [draft, setDraft] = useState(() => {
    if (editingId != null) {
      const cached = queryClient.getQueryData(['admin', 'questions', 'detail', String(editingId)])
      return cached?.question ? { ...cached.question } : null
    }
    return buildQuestionTemplate('drag-drop')
  })
  const [errors, setErrors] = useState([])
  const [saved, setSaved] = useState(false)
  const [validated, setValidated] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (editingId == null) return
    if (detailQuery.data?.question) {
      setDraft({ ...detailQuery.data.question })
    }
  }, [editingId, detailQuery.data])

  const streams = useMemo(
    () => (catalogueQuery.data?.streams?.length ? catalogueQuery.data.streams : DEFAULT_STREAMS),
    [catalogueQuery.data]
  )
  const activityTypes = useMemo(
    () => (catalogueQuery.data?.activityTypes?.length ? catalogueQuery.data.activityTypes : DEFAULT_ACTIVITY_TYPES),
    [catalogueQuery.data]
  )

  const integrityErrors = useMemo(
    () =>
      draft
        ? checkAnswerIntegrity(draft.activityType, draft.payload, draft.correctAnswer).map((e) => ({
            path: `/payload${e.path ?? ''}`,
            message: e.message,
          }))
        : [],
    [draft]
  )

  const validation = useMemo(
    () => (draft ? validateClientDraft(draft) : { valid: true, errors: [] }),
    [draft]
  )

  const readOnly = draft?.status === 'published' || draft?.status === 'archived'

  // FIX: P3-006 — lets an admin reach the version-clone flow directly from a
  // published question's own editor, not only from the list row's button.
  const handleCreateVersion = async () => {
    setVersionError(null)
    try {
      const { question } = await versionMutation.mutateAsync(editingId)
      navigate(`/admin/questions/${question.id}/edit`)
    } catch (err) {
      setVersionError(err.message ?? 'The question could not be versioned.')
    }
  }

  // Task 5.13 — a draft can move into review when it is not already pending or
  // approved. Editing a pending/approved draft clears its review state first.
  const reviewState = draft?.meta?.review?.state
  const canSubmit =
    editingId != null &&
    !readOnly &&
    draft?.status === 'draft' &&
    reviewState !== 'pending' &&
    reviewState !== 'approved'

  if (editingId != null && detailQuery.isLoading) {
    return <p className="aq-note">Loading question…</p>
  }

  if (editingId != null && detailQuery.isError) {
    return (
      <div className="aq-error" role="alert">
        <p>{detailQuery.error?.message ?? 'We couldn’t load this question.'}</p>
      </div>
    )
  }

  if (!draft) return null

  const patch = (next) => {
    setDraft((d) => ({ ...d, ...next }))
    setSaved(false)
    setErrors([])
    setValidated(false)
  }

  const handleActivityType = (activityType) => {
    const template = buildQuestionTemplate(activityType)
    setDraft((d) => ({ ...template, stream: d.stream, level: d.level, meta: d.meta }))
    setSaved(false)
    setErrors([])
    setValidated(false)
  }

  const handleActivityChange = ({ payload, correctAnswer }) => {
    patch({ payload, correctAnswer })
  }

  const handleSave = async () => {
    const result = validateClientDraft(draft)
    if (!result.valid) {
      setErrors(result.errors)
      return
    }
    try {
      if (editingId != null) {
        await updateMutation.mutateAsync(draft)
      } else {
        await createMutation.mutateAsync(draft)
      }
      setSaved(true)
      if (editingId == null) navigate('/admin/questions')
    } catch (err) {
      setErrors(err.fields?.map((f) => ({ path: f.path, message: f.message })) ?? [{ path: '/', message: err.message }])
    }
  }

  const allValidationErrors = [...validation.errors, ...integrityErrors]
  const visual = hasVisualForm(draft.activityType)

  const patchHint = (index, patchFn) => {
    const hints = [...(draft.hints ?? [])]
    hints[index] = { ...(hints[index] ?? {}), ...patchFn(hints[index] ?? {}) }
    patch({ hints })
  }

  const addHint = () => {
    patch({ hints: [...(draft.hints ?? []), { level: (draft.hints?.length ?? 0) + 1, text: '' }] })
  }

  const removeHint = (index) => {
    patch({ hints: (draft.hints ?? []).filter((_, i) => i !== index) })
  }

  const patchMeta = (patchFn) => {
    patch({ meta: { ...(draft.meta ?? {}), ...patchFn(draft.meta ?? {}) } })
  }

  const feedback = draft.meta?.feedback ?? {}

  return (
    <form
      className="aq-editor"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <div className="aq-editor__main">
        {readOnly ? (
          <p className="aq-note aq-note--error">
            Published and archived questions are read-only (D-044). Duplicate this question or edit a draft.
            {draft?.status === 'published' ? (
              <button
                type="button"
                className="aq-btn aq-btn--submit"
                style={{ marginLeft: '0.75rem' }}
                disabled={versionMutation.isPending}
                onClick={handleCreateVersion}
              >
                Create editable version
              </button>
            ) : null}
          </p>
        ) : null}
        {versionError ? <p className="aq-note aq-note--error">{versionError}</p> : null}

        <Section title="Basic information">
          <Field label="Activity type">
            <select value={draft.activityType} onChange={(e) => handleActivityType(e.target.value)} disabled={readOnly || editingId != null}>
              {activityTypes.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {QUESTION_ACTIVITY_LABELS[t.slug] ?? t.slug}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prompt" invalid={validation.errors.some((e) => e.path === '/prompt')}>
            <textarea rows={3} value={draft.prompt ?? ''} onChange={(e) => patch({ prompt: e.target.value })} aria-invalid={validation.errors.some((e) => e.path === '/prompt')} disabled={readOnly} />
          </Field>

          <Field label="Instructions (optional)">
            <textarea rows={2} value={draft.instructions ?? ''} onChange={(e) => patch({ instructions: e.target.value })} disabled={readOnly} />
          </Field>

          <Field label="Explanation (correct-answer feedback, admin-only)" invalid={validation.errors.some((e) => e.path === '/explanation')}>
            <textarea rows={2} value={draft.explanation ?? ''} onChange={(e) => patch({ explanation: e.target.value })} aria-invalid={validation.errors.some((e) => e.path === '/explanation')} disabled={readOnly} />
          </Field>

          <div className="aq-editor__grid">
            <Field label="Stream">
              <select value={draft.stream} onChange={(e) => patch({ stream: e.target.value })} disabled={readOnly}>
                {streams.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Level">
              <select value={draft.level} onChange={(e) => patch({ level: Number(e.target.value) })} disabled={readOnly}>
                {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Level {n}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Grade (min)">
              <select value={draft.gradeMin} onChange={(e) => patch({ gradeMin: Number(e.target.value) })} disabled={readOnly}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Grade (max)">
              <select value={draft.gradeMax} onChange={(e) => patch({ gradeMax: Number(e.target.value) })} disabled={readOnly}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Difficulty">
              <select value={draft.difficulty} onChange={(e) => patch({ difficulty: Number(e.target.value) })} disabled={readOnly}>
                {DIFFICULTIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="aq-editor__grid">
            <Field label="Topic">
              <input value={draft.topic ?? ''} onChange={(e) => patch({ topic: e.target.value })} disabled={readOnly} />
            </Field>
            <Field label="Subtopic">
              <input value={draft.subtopic ?? ''} onChange={(e) => patch({ subtopic: e.target.value })} disabled={readOnly} />
            </Field>
          </div>

          <div className="aq-editor__hints">
            <span className="aq-field__label">Hints (optional, max {MAX_HINTS})</span>
            {(draft.hints ?? []).map((hint, i) => (
              <div className="aq-row" key={`hint-${i}`}>
                <Field label="Level">
                  <select value={hint.level ?? 1} onChange={(e) => patchHint(i, () => ({ level: Number(e.target.value) }))} disabled={readOnly}>
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Hint text">
                  <input value={hint.text ?? ''} onChange={(e) => patchHint(i, () => ({ text: e.target.value }))} disabled={readOnly} />
                </Field>
                <RemoveButton onClick={() => removeHint(i)} label={`Remove hint ${i + 1}`} disabled={readOnly} />
              </div>
            ))}
            <AddButton onClick={addHint} disabled={readOnly || (draft.hints?.length ?? 0) >= MAX_HINTS}>
              + Add hint
            </AddButton>
          </div>
        </Section>

        <Section title="Activity editor" description={visual ? 'Edit the question content visually. The correct answer updates automatically.' : 'Unknown activity type — edit the payload structure as validated JSON.'}>
          {visual ? (
            <VisualFormFor activityType={draft.activityType} payload={draft.payload} correctAnswer={draft.correctAnswer} onChange={handleActivityChange} disabled={readOnly} />
          ) : (
            <Field label="Payload (JSON)">
              <textarea
                rows={12}
                spellCheck={false}
                value={JSON.stringify(draft.payload ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    patch({ payload: JSON.parse(e.target.value) })
                  } catch {
                    // keep last valid draft; the next save re-validates server-side
                  }
                }}
                disabled={readOnly}
              />
            </Field>
          )}
        </Section>

        <Section title="Correct answer" description={visual ? 'Generated automatically from the Activity editor above. Never sent to students.' : 'Validated server-side against the correct-answer schema. Never sent to students.'}>
          {visual ? (
            <p className="aq-ve__note">The correct answer is derived from the visual form above. No manual JSON required.</p>
          ) : (
            <textarea
              rows={8}
              spellCheck={false}
              value={JSON.stringify(draft.correctAnswer ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  patch({ correctAnswer: JSON.parse(e.target.value) })
                } catch {
                  // keep last valid draft
                }
              }}
              disabled={readOnly}
            />
          )}
        </Section>

        <Section title="Authoring metadata" description="Optional authoring notes (stored in questions.meta, never exposed to students).">
          <Field label="Objective / outcome">
            <textarea rows={2} value={draft.meta?.objective ?? ''} onChange={(e) => patchMeta(() => ({ objective: e.target.value }))} disabled={readOnly} />
          </Field>

          <div className="aq-editor__hints">
            <span className="aq-field__label">Feedback templates (optional)</span>
            {FEEDBACK_KEYS.map((key) => (
              <Field key={key} label={key}>
                <input value={feedback[key] ?? ''} onChange={(e) => patchMeta((m) => ({ feedback: { ...(m.feedback ?? {}), [key]: e.target.value } }))} disabled={readOnly} />
              </Field>
            ))}
          </div>

          <div className="aq-editor__hints">
            <span className="aq-field__label">Presentational media (optional)</span>
            {(draft.meta?.media ?? []).map((media, i) => (
              <div className="aq-row" key={`meta-media-${i}`}>
                <MediaReferenceEditor media={media} onChange={(next) => patchMeta((m) => ({ media: (m.media ?? []).map((entry, j) => (j === i ? next : entry)) }))} disabled={readOnly} />
                <RemoveButton onClick={() => patchMeta((m) => ({ media: (m.media ?? []).filter((_, j) => j !== i) }))} label={`Remove media ${i + 1}`} disabled={readOnly} />
              </div>
            ))}
            <AddButton
              onClick={() => patchMeta((m) => ({ media: [...(m.media ?? []), { ref: 'question-media/pending/pending/pending.png', alt: '' }] }))}
              disabled={readOnly || (draft.meta?.media?.length ?? 0) >= 6}
            >
              + Add media
            </AddButton>
          </div>
        </Section>

        {allValidationErrors.length > 0 ? (
          <ValidationSummary errors={allValidationErrors} />
        ) : validated ? (
          <p className="aq-note aq-note--ok">All client checks passed. The server validates authoritatively on save.</p>
        ) : null}

        {errors.length > 0 ? (
          <ul className="aq-errors aq-errors--server" aria-live="polite">
            {errors.map((err, i) => (
              <li key={i}>
                <code>{err.path}</code> — {err.message}
              </li>
            ))}
          </ul>
        ) : null}

        {saved ? <p className="aq-note aq-note--ok">Saved.</p> : null}

        <div className="aq-editor__actions">
          <button type="button" className="aq-btn" onClick={() => setValidated(true)}>
            Validate
          </button>
          {!readOnly ? (
            <button type="submit" className="aq-btn aq-btn--primary" disabled={!validation.valid}>
              {editingId != null ? 'Save changes' : 'Create question'}
            </button>
          ) : null}
          {canSubmit ? (
            <button
              type="button"
              className="aq-btn aq-btn--submit"
              disabled={submitMutation.isPending || !validation.valid}
              onClick={async () => {
                setSubmitError(null)
                try {
                  await submitMutation.mutateAsync(editingId)
                  navigate('/admin/questions/review')
                } catch (err) {
                  setSubmitError(err.message ?? 'The question could not be submitted for review.')
                }
              }}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit for review'}
            </button>
          ) : null}
          <button type="button" className="aq-btn" onClick={() => navigate('/admin/questions')}>
            Cancel
          </button>
        </div>
        {submitError ? <p className="aq-note aq-note--error">{submitError}</p> : null}
      </div>

      <aside className="aq-editor__side">
        <h4>Preview</h4>
        <QuestionPreview draft={draft} />
        <p className="aq-editor__hint">Student-facing preview. No answer data is rendered here.</p>
      </aside>
    </form>
  )
}