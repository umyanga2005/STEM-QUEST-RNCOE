import { Link } from 'react-router'
import { useState } from 'react'
import { useQuestionList, useDeleteQuestion, useCreateQuestionVersion } from '../queries/queries.js'
import AdminActivityPreviewModal from '../../../pages/AdminActivityPreviewModal.jsx'

/**
 * Admin Question Builder — list (Task 5.10, versioned editing 5.13).
 *
 * Preview table of the question catalogue. Only student-visible fields are
 * rendered (payload preview, prompt, grade, difficulty, status); correctAnswer
 * and meta are server-only and never leave the `GET /:id` editor surface.
 * Draft rows can be deleted from here; published rows are protected and can
 * only be edited through a new version (clone-on-edit, Task 5.13).
 */

const STATUS_LABELS = { draft: 'Draft', archived: 'Archived', published: 'Published' }

function StatusPill({ status }) {
  return <span className={`aq-status aq-status--${status}`}>{STATUS_LABELS[status] ?? status}</span>
}

function ActivityType({ activityType }) {
  const label = activityType.replace(/-/g, ' ')
  return <span className="aq-type">{label}</span>
}

export default function QuestionList({ onDeleted, onRetry }) {
  const { data, isLoading, isError, refetch } = useQuestionList()
  const deleteMutation = useDeleteQuestion()
  const versionMutation = useCreateQuestionVersion()
  const [versionError, setVersionError] = useState(null)
  const [previewQuestion, setPreviewQuestion] = useState(null)
  const questions = data?.questions ?? []

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id)
    onDeleted?.()
    refetch()
  }

  const handleCreateVersion = async (id) => {
    setVersionError(null)
    try {
      const { question } = await versionMutation.mutateAsync(id)
      window.location.assign(`/admin/questions/${question.id}/edit`)
    } catch (err) {
      setVersionError(err.message ?? 'The question could not be versioned.')
    }
  }

  if (isLoading) {
    return <p className="aq-note">Loading questions…</p>
  }

  if (isError) {
    return (
      <div className="aq-error" role="alert">
        <p>We couldn’t load the question catalogue.</p>
        <button type="button" className="aq-btn" onClick={onRetry ?? (() => refetch())}>
          Try again
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="aq-empty">
        <p>No questions yet. Create the first one to start building the catalogue.</p>
      </div>
    )
  }

  return (
    <div className="aq-list">
      <div className="aq-list__row aq-list__head" aria-hidden="true">
        <span>Prompt</span>
        <span>Type</span>
        <span>Grade</span>
        <span>Difficulty</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="aq-list__row">
          <Link className="aq-list__prompt" to={`/admin/questions/${q.id}/edit`}>
            {q.prompt || '(untitled)'}
          </Link>
          <span>
            <ActivityType activityType={q.activityType} />
          </span>
          <span className="aq-list__grade">
            {q.gradeMin}–{q.gradeMax}
          </span>
          <span className="aq-list__diff">★ {q.difficulty}</span>
          <span>
            <StatusPill status={q.status} />
          </span>
          <span className="aq-list__actions">
            <button
              type="button"
              className="aq-btn aq-btn--bare"
              onClick={() => setPreviewQuestion(q)}
              title="Preview Activity"
            >
              👁 Preview
            </button>
            <Link className="aq-btn" to={`/admin/questions/${q.id}/edit`}>
              Edit
            </Link>
            {q.status === 'published' ? (
              <button
                type="button"
                className="aq-btn aq-btn--submit"
                disabled={versionMutation.isPending}
                onClick={() => handleCreateVersion(q.id)}
              >
                New version
              </button>
            ) : null}
            {q.status === 'draft' ? (
              <button
                type="button"
                className="aq-btn aq-btn--danger"
                disabled={deleteMutation.isPending}
                onClick={() => handleDelete(q.id)}
              >
                Delete
              </button>
            ) : null}
          </span>
        </div>
      ))}
      {deleteMutation.isError ? <p className="aq-note aq-note--error">{deleteMutation.error?.message}</p> : null}
      {versionError ? <p className="aq-note aq-note--error">{versionError}</p> : null}

      {previewQuestion ? (
        <AdminActivityPreviewModal
          question={previewQuestion}
          onClose={() => setPreviewQuestion(null)}
        />
      ) : null}
    </div>
  )
}