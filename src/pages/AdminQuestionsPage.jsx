import { Link } from 'react-router'
import QuestionList from '../features/admin-questions/components/QuestionList.jsx'

/**
 * Task 5.10 — Admin Question Builder (list entry point).
 *
 * Catalogue overview behind the protected admin shell. Draft rows can be
 * created/edited/deleted; published rows are read-only by design (authoring
 * integrity, D-043). All data flows through the admin API with the access
 * token; correctAnswer/meta never appear on this list.
 */

export default function AdminQuestionsPage() {
  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <h3>Question Builder</h3>
        <Link className="aq-btn aq-btn--primary" to="/admin/questions/new">
          + New question
        </Link>
      </div>
      <QuestionList />
    </section>
  )
}