import { useParams } from 'react-router'
import ReviewDetail from '../features/admin-questions/components/ReviewDetail.jsx'

/**
 * Task 5.13 — single-question review surface (approve / reject / publish /
 * archive + audit trail).
 */

export default function AdminReviewDetailPage() {
  const { id } = useParams()
  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <h3>Question review</h3>
      </div>
      <ReviewDetail questionId={id} />
    </section>
  )
}