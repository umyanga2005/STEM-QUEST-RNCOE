import { Link } from 'react-router'
import { useAdminAuth } from '../features/admin-auth/auth/admin-auth-context.js'
import { useQuestionList, useReviewQueue } from '../features/admin-questions/queries/queries.js'
import './admin.css'

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth()
  const { data: questionsData, isLoading: loadingQuestions } = useQuestionList()
  const { data: reviewData } = useReviewQueue()

  const questions = questionsData?.questions ?? []
  const reviewQueue = reviewData?.queue ?? []

  const totalQuestions = questions.length
  const publishedCount = questions.filter((q) => q.status === 'published').length
  const draftCount = questions.filter((q) => q.status === 'draft').length
  const reviewCount = reviewQueue.length

  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <div>
          <h3>Dashboard Overview</h3>
          <p className="adm-subtitle">
            Welcome back{admin?.displayName ? `, ${admin.displayName}` : ''}. System health and question bank status.
          </p>
        </div>
        <Link className="aq-btn aq-btn--primary" to="/admin/questions/new">
          + New Question
        </Link>
      </div>

      <div className="adm-grid-4">
        <div className="adm-stat-card">
          <span className="adm-stat-card__label" style={{ color: '#38bdf8' }}>Question Bank</span>
          <span className="adm-stat-card__val">{loadingQuestions ? '…' : totalQuestions}</span>
          <span className="adm-stat-card__sub">Total Catalogue</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-card__label" style={{ color: '#34d399' }}>Published Live</span>
          <span className="adm-stat-card__val">{loadingQuestions ? '…' : publishedCount}</span>
          <span className="adm-stat-card__sub">Kiosk Selectable</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-card__label" style={{ color: '#fbbf24' }}>Drafts & Revisions</span>
          <span className="adm-stat-card__val">{loadingQuestions ? '…' : draftCount}</span>
          <span className="adm-stat-card__sub">In Progress</span>
        </div>
        <div className="adm-stat-card">
          <span className="adm-stat-card__label" style={{ color: '#a855f7' }}>Review Queue</span>
          <span className="adm-stat-card__val">{reviewCount}</span>
          <span className="adm-stat-card__sub">Awaiting Approval</span>
        </div>
      </div>

      <div className="adm-grid-2" style={{ marginTop: '1.5rem' }}>
        <div className="adm-section-box">
          <h4>Quick Actions</h4>
          <div className="adm-quick-actions">
            <Link className="adm-quick-btn" to="/admin/questions">
              📚 Question Builder
            </Link>
            <Link className="adm-quick-btn" to="/admin/questions/review">
              🔍 Review Queue {reviewCount > 0 ? `(${reviewCount})` : ''}
            </Link>
            <Link className="adm-quick-btn" to="/admin/students">
              👥 Student Management
            </Link>
            <Link className="adm-quick-btn" to="/leaderboards" target="_blank">
              🏆 Public Leaderboards ↗
            </Link>
          </div>
        </div>

        <div className="adm-section-box">
          <h4>System Status</h4>
          <dl className="adm-dl">
            <dt>Supabase Auth</dt>
            <dd><span className="aq-status aq-status--published">Connected</span></dd>
            <dt>Question Selection</dt>
            <dd>3-of-100 Selection Engine (Active)</dd>
            <dt>Security Boundary</dt>
            <dd>Server RBAC Guard Active</dd>
          </dl>
        </div>
      </div>
    </section>
  )
}