import { Link } from 'react-router'
import './admin.css'

export default function AdminLeaderboardsPage() {
  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <div>
          <h3>Live Leaderboards & Ranks</h3>
          <p className="adm-subtitle">Monitor live student rankings across Science, Technology, Engineering, and Mathematics.</p>
        </div>
        <Link className="aq-btn aq-btn--primary" to="/leaderboards" target="_blank">
          View Public Board ↗
        </Link>
      </div>

      <div className="adm-section-box">
        <h4>Realtime Channel Status</h4>
        <p className="adm-text-muted">
          Supabase Realtime is configured and listening for student score updates on channel <code>leaderboard-live</code>.
        </p>
      </div>
    </section>
  )
}
