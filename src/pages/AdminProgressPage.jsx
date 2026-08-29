import { useAdminProgressOverview } from '../features/admin-progress/queries/queries.js'
import './admin.css'

export default function AdminProgressPage() {
  const { data, isLoading, isError, error, refetch } = useAdminProgressOverview()
  const streams = data?.streams ?? []
  const distribution = data?.distribution ?? []
  const totals = data?.totals ?? { missions: 0, completed: 0, activeStudents: 0 }

  return (
    <section className="adm-panel aq-page adm-progress-layout">
      <div className="aq-page__top">
        <div>
          <h3>Student Progress Overview</h3>
          <p className="adm-subtitle">
            {isLoading
              ? 'Loading live mission data…'
              : isError
              ? 'Could not load progress data.'
              : `${totals.missions} mission${totals.missions !== 1 ? 's' : ''} played by ${totals.activeStudents} student${totals.activeStudents !== 1 ? 's' : ''} · ${totals.completed} completed.`}
          </p>
        </div>
        {!isLoading && !isError ? (
          <button type="button" className="aq-btn aq-btn--ghost" onClick={() => refetch()}>
            ↺ Refresh
          </button>
        ) : null}
      </div>

      {isError ? (
        <div className="aq-error" role="alert">
          <div>
            ⚠️ {error?.message?.toLowerCase().includes('jwt')
              ? 'Your admin security token has expired (JWT expired). Please sign out and sign back in to renew your session.'
              : `We couldn't load progress data. ${error?.message ?? 'Unknown error'}`}
          </div>
          <button type="button" className="aq-btn aq-btn--ghost" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      {/* Stream Overview Cards */}
      <div className="adm-grid-4">
        {(isLoading ? Array.from({ length: 4 }) : streams).map((s, i) => (
          <div key={s?.id ?? i} className="adm-stat-card">
            {s ? (
              <>
                <span className="adm-stat-card__label" style={{ color: s.color }}>
                  {s.name} Stream
                </span>
                <span className="adm-stat-card__val">
                  {s.missions} Mission{s.missions !== 1 ? 's' : ''}
                </span>
                <div className="adm-progress-bar-bg">
                  <div className="adm-progress-bar-fill" style={{ width: `${s.passRate}%`, background: s.color }} />
                </div>
                <span className="adm-stat-card__sub">
                  {s.passRate}% Pass Rate · {s.activeStudents} Active Student{s.activeStudents !== 1 ? 's' : ''} · Avg {s.avgScore}/300
                </span>
              </>
            ) : (
              <span className="adm-skeleton" style={{ display: 'block', height: 64, borderRadius: 10 }} />
            )}
          </div>
        ))}
      </div>

      {/* Score Distribution */}
      <div className="adm-section-box">
        <h4>Score Distribution</h4>
        <p className="adm-text-muted">Completed missions grouped by final score, out of 300.</p>
        {isLoading ? (
          <span className="adm-skeleton" style={{ display: 'block', height: 160, borderRadius: 10 }} />
        ) : distribution.every((b) => b.count === 0) ? (
          <p className="aq-empty">No completed missions yet.</p>
        ) : (
          <div className="adm-bar-chart">
            {distribution.map((b) => (
              <div key={b.key} className="adm-bar-chart__col">
                <span className="adm-bar-chart__count">{b.count}</span>
                <div className="adm-bar-chart__track">
                  <div className="adm-bar-chart__fill" style={{ height: `${b.pct}%` }} />
                </div>
                <span className="adm-bar-chart__label">{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stream Performance Table */}
      <div className="adm-section-box">
        <h4>Stream Performance</h4>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Missions Played</th>
                <th>Completed</th>
                <th>Pass Rate</th>
                <th>Avg. Score</th>
                <th>Active Students</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading &&
                !isError &&
                streams.map((s) => (
                  <tr key={s.id}>
                    <td className="adm-td--bold" style={{ color: s.color }}>
                      {s.name}
                    </td>
                    <td>{s.missions}</td>
                    <td>{s.completed}</td>
                    <td>
                      <span className="aq-status aq-status--published">{s.passRate}%</span>
                    </td>
                    <td>{s.avgScore} / 300</td>
                    <td>{s.activeStudents}</td>
                  </tr>
                ))}
              {!isLoading && !isError && streams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="aq-empty">
                    No stream data yet.
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
