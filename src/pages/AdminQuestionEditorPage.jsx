import QuestionEditor from '../features/admin-questions/components/QuestionEditor.jsx'

/**
 * Task 5.10 — Admin Question Builder editor route.
 *
 * One route handles both create (`/admin/questions/new`) and edit
 * (`/admin/questions/:id/edit`); the editor reads the id param itself.
 */

export default function AdminQuestionEditorPage() {
  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <h3>Question Editor</h3>
      </div>
      <QuestionEditor />
    </section>
  )
}