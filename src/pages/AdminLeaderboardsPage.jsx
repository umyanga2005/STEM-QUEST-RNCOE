import { Link } from 'react-router'
import { useAdminLeaderboardOverview } from '../features/admin-leaderboards/queries/queries.js'
import './admin.css'

function formatAchievedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleDateString()
}

export default function AdminLeaderboardsPage() {
  const { data, isLoading, isError, error, refetch } = useAdminLeaderboardOverview()
  const topOverall = data?.topOverall ?? []
  const byStream = data?.byStream ?? []

  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <div>
          <h3>Live Leaderboards &amp; Ranks</h3>
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

      {isError ? (
        <div className="aq-error" role="alert">
          <div>
            ⚠️ {error?.message?.toLowerCase().includes('jwt')
              ? 'Your admin security token has expired (JWT expired). Please sign out and sign back in to renew your session.'
              : `We couldn't load leaderboard data. ${error?.message ?? 'Unknown error'}`}
          </div>
          <button type="button" className="aq-btn aq-btn--ghost" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      {/* Stream Summary Cards */}
      <div className="adm-grid-4">
        {(isLoading ? Array.from({ length: 4 }) : byStream).map((s, i) => (
          <div key={s?.id ?? i} className="adm-stat-card">
            {s ? (
              <>
                <span className="adm-stat-card__label" style={{ color: s.color }}>
                  {s.name}
                </span>
                <span className="adm-stat-card__val">{s.topScore}</span>
                <span className="adm-stat-card__sub">
                  Top Score · {s.entries} Ranked Student{s.entries !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <span className="adm-skeleton" style={{ display: 'block', height: 64, borderRadius: 10 }} />
            )}
          </div>
        ))}
      </div>

      {/* Top 10 Table */}
      <div className="adm-section-box">
        <h4>Top 10 — All Streams</h4>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Stream</th>
                <th>Score</th>
                <th>Achieved</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[30, 160, 110, 70, 90].map((w, j) => (
                      <td key={j}>
                        <span className="adm-skeleton" style={{ display: 'inline-block', width: w, height: 14, borderRadius: 6 }} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                !isError &&
                topOverall.map((entry, i) => (
                  <tr key={entry.id}>
                    <td className="adm-td--bold">#{i + 1}</td>
                    <td>{entry.display_name}</td>
                    <td>{entry.streamName}</td>
                    <td>
                      <span className="aq-status aq-status--published">{entry.score}</span>
                    </td>
                    <td>{formatAchievedAt(entry.achieved_at)}</td>
                  </tr>
                ))}
              {!isLoading && !isError && topOverall.length === 0 ? (
                <tr>
                  <td colSpan={5} className="aq-empty">
                    No leaderboard entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
