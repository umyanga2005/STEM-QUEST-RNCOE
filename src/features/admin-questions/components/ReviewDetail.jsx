import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuestionDetail, useQuestionAudit, useApproveQuestion, useRejectQuestion, usePublishQuestion, useArchiveQuestion } from '../queries/queries.js'

/**
 * Admin Question Builder — review detail (Task 5.13).
 *
 * The reviewer's full surface for one question: the admin-only correct
 * answer, the review envelope, the audit trail, and the lifecycle actions.
 * Every action is explicit and server-authoritative — approving, rejecting
 * (note required), publishing (approved only) or archiving (published only).
 */

const REVIEW_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }

function ReviewState({ review }) {
  if (!review?.state) {
    return <span className="aq-status aq-status--draft">Not in review</span>
  }
  return (
    <span className={`aq-status aq-status--${review.state}`}>
      {REVIEW_LABELS[review.state] ?? review.state}
    </span>
  )
}

export default function ReviewDetail({ questionId }) {
  const id = questionId
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState(null)

  const detailQuery = useQuestionDetail(id, { enabled: id != null })
  const auditQuery = useQuestionAudit(id, { enabled: id != null })
  const approveMutation = useApproveQuestion()
  const rejectMutation = useRejectQuestion()
  const publishMutation = usePublishQuestion()
  const archiveMutation = useArchiveQuestion()

  const question = detailQuery.data?.question
  const actions = useMemo(() => auditQuery.data?.actions ?? [], [auditQuery.data])

  const review = question?.meta?.review
  const isPending = question?.status === 'draft' && review?.state === 'pending'
  const isApproved = question?.status === 'draft' && review?.state === 'approved'
  const isPublished = question?.status === 'published'
  const busy = approveMutation.isPending || rejectMutation.isPending || publishMutation.isPending || archiveMutation.isPending

  const runAction = async (fn, payload) => {
    setNoteError(null)
    try {
      await fn.mutateAsync(payload)
    } catch (err) {
      setNoteError(err.message ?? 'The action could not be completed.')
    }
  }

  if (detailQuery.isLoading) {
    return <p className="aq-note">Loading review…</p>
  }

  if (detailQuery.isError || !question) {
    return (
      <div className="aq-error" role="alert">
        <p>{detailQuery.error?.message ?? 'We couldn’t load this question for review.'}</p>
        <Link className="aq-btn" to="/admin/questions/review">
          Back to review queue
        </Link>
      </div>
    )
  }

  return (
    <div className="aq-review">
      <div className="aq-review__top">
        <h4>{question.prompt}</h4>
        <span className="aq-type">{question.activityType.replace(/-/g, ' ')}</span>
        <span className="aq-list__grade">
          Grade {question.gradeMin}–{question.gradeMax} · ★ {question.difficulty} · v{question.version}
        </span>
        <span>
          <ReviewState review={review} />
        </span>
        {review?.submittedByAdminId ? (
          <p className="aq-review__meta">
            Submitted by {review.submittedByAdminId} on {review.submittedAt ? new Date(review.submittedAt).toLocaleString() : 'unknown time'}.
          </p>
        ) : null}
      </div>

      <dl className="aq-review__facts">
        <dt>Explanation</dt>
        <dd>{question.explanation || '—'}</dd>
        <dt>Correct answer (admin-only)</dt>
        <dd>
          <pre className="aq-review__answer">{JSON.stringify(question.correctAnswer, null, 2)}</pre>
        </dd>
        <dt>Objective</dt>
        <dd>{question.meta?.objective || '—'}</dd>
        <dt>Feedback templates</dt>
        <dd>{Object.keys(question.meta?.feedback ?? {}).join(', ') || '—'}</dd>
      </dl>

      {isPending || isApproved || isPublished ? (
        <div className="aq-review__actions">
          {isPending ? (
            <>
              <label className="aq-field__label">
                Review note
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={noteError ? 'A note is required to reject.' : 'Optional note recorded with the review.'}
                />
              </label>
              <div className="aq-review__buttons">
                <button type="button" className="aq-btn aq-btn--primary" disabled={busy} onClick={() => runAction(approveMutation, { id, note: note.trim() || null })}>
                  Approve
                </button>
                <button type="button" className="aq-btn aq-btn--danger" disabled={busy} onClick={() => runAction(rejectMutation, { id, note })}>
                  Reject
                </button>
              </div>
            </>
          ) : null}

          {isApproved ? (
            <button type="button" className="aq-btn aq-btn--primary" disabled={busy} onClick={() => runAction(publishMutation, id)}>
              Publish
            </button>
          ) : null}

          {isPublished ? (
            <button type="button" className="aq-btn aq-btn--danger" disabled={busy} onClick={() => runAction(archiveMutation, id)}>
              Archive
            </button>
          ) : null}

          {noteError ? <p className="aq-note aq-note--error">{noteError}</p> : null}
        </div>
      ) : (
        <p className="aq-note">
          This question is not currently under review. <Link to={`/admin/questions/${id}/edit`}>Edit it</Link> to adjust the draft.
        </p>
      )}

      <h5>Audit trail</h5>
      {actions.length === 0 ? (
        <p className="aq-note">No lifecycle events recorded yet.</p>
      ) : (
        <ul className="aq-review__audit">
          {actions.map((a) => (
            <li key={a.id}>
              <strong>{a.action}</strong>
              <span>by {a.adminId}</span>
              <span>{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="aq-editor__actions">
        <Link className="aq-btn" to="/admin/questions/review">
          Back to review queue
        </Link>
        <Link className="aq-btn" to={`/admin/questions/${id}/edit`}>
          Open in editor
        </Link>
      </div>
    </div>
  )
}