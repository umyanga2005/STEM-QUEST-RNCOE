import { Link } from 'react-router'
import ReviewQueue from '../features/admin-questions/components/ReviewQueue.jsx'

/**
 * Task 5.13 — Admin Question Review queue.
 *
 * Drafts submitted for review, behind the protected admin shell. Reviewers
 * open the detail screen to approve/reject with a note; approved drafts are
 * then published from the same surface.
 */

export default function AdminReviewQueuePage() {
  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <h3>Review queue</h3>
        <Link className="aq-btn" to="/admin/questions">
          Question Builder
        </Link>
      </div>
      <ReviewQueue />
    </section>
  )
}