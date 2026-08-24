import { Link } from 'react-router'
import { useReviewQueue } from '../queries/queries.js'

/**
 * Admin Question Builder — review queue (Task 5.13).
 *
 * Drafts currently pending review, newest first. Previews only: prompt, type,
 * grade, difficulty, version and the review envelope (submittedAt /
 * submittedByAdminId). correctAnswer and meta never leave the detail surface;
 * a reviewer opens the detail screen to act.
 */

function ReviewRow({ question }) {
  return (
    <div className="aq-list__row">
      <Link className="aq-list__prompt" to={`/admin/questions/${question.id}/review`}>
        {question.prompt || '(untitled)'}
      </Link>
      <span className="aq-type">{question.activityType.replace(/-/g, ' ')}</span>
      <span className="aq-list__grade">
        {question.gradeMin}–{question.gradeMax}
      </span>
      <span className="aq-list__diff">★ {question.difficulty}</span>
      <span className="aq-list__version">v{question.version}</span>
      <span className="aq-list__actions">
        <Link className="aq-btn aq-btn--primary" to={`/admin/questions/${question.id}/review`}>
          Review
        </Link>
      </span>
    </div>
  )
}

export default function ReviewQueue() {
  const { data, isLoading, isError, refetch } = useReviewQueue()
  const questions = data?.questions ?? []

  if (isLoading) {
    return <p className="aq-note">Loading review queue…</p>
  }

  if (isError) {
    return (
      <div className="aq-error" role="alert">
        <p>We couldn’t load the review queue.</p>
        <button type="button" className="aq-btn" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="aq-empty">
        <p>Nothing is awaiting review. Submit a draft for review to start the workflow.</p>
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
        <span>Version</span>
        <span>Actions</span>
      </div>
      {questions.map((q) => (
        <ReviewRow key={q.id} question={q} />
      ))}
    </div>
  )
}