import './admin.css'

export default function AdminProgressPage() {
  const streams = [
    { name: 'Science', unlocked: 5, total: 5, color: '#38bdf8', activeStudents: 142, avgCompletion: 88 },
    { name: 'Technology', unlocked: 5, total: 5, color: '#a855f7', activeStudents: 128, avgCompletion: 76 },
    { name: 'Engineering', unlocked: 5, total: 5, color: '#f59e0b', activeStudents: 95, avgCompletion: 64 },
    { name: 'Mathematics', unlocked: 5, total: 5, color: '#34d399', activeStudents: 160, avgCompletion: 92 },
  ]

  const levelBreakdown = [
    { level: 'Level 1 · Beginner', qCount: 20, passRate: '94%', scienceRate: 98, techRate: 92, engRate: 89, mathRate: 96 },
    { level: 'Level 2 · Easy', qCount: 40, passRate: '86%', scienceRate: 90, techRate: 84, engRate: 81, mathRate: 89 },
    { level: 'Level 3 · Intermediate', qCount: 60, passRate: '75%', scienceRate: 82, techRate: 71, engRate: 68, mathRate: 79 },
    { level: 'Level 4 · Advanced', qCount: 80, passRate: '62%', scienceRate: 71, techRate: 58, engRate: 54, mathRate: 65 },
    { level: 'Level 5 · Hard', qCount: 100, passRate: '48%', scienceRate: 55, techRate: 42, engRate: 39, mathRate: 56 },
  ]

  return (
    <section className="adm-panel aq-page adm-progress-layout">
      <div className="aq-page__top">
        <div>
          <h3>Student Progress Overview</h3>
          <p className="adm-subtitle">Track student completion rates, level progression, and stream analytics across all 4 STEM streams.</p>
        </div>
      </div>

      {/* Stream Overview Cards */}
      <div className="adm-grid-4">
        {streams.map((s) => (
          <div key={s.name} className="adm-stat-card">
            <span className="adm-stat-card__label" style={{ color: s.color }}>{s.name} Stream</span>
            <span className="adm-stat-card__val">{s.unlocked} / {s.total} Levels</span>
            <div className="adm-progress-bar-bg">
              <div className="adm-progress-bar-fill" style={{ width: `${s.avgCompletion}%`, background: s.color }} />
            </div>
            <span className="adm-stat-card__sub">{s.avgCompletion}% Avg. Completion · {s.activeStudents} Active Students</span>
          </div>
        ))}
      </div>

      {/* Level Completion Matrix */}
      <div className="adm-section-box">
        <h4>Level Completion Matrix</h4>
        <div className="adm-matrix">
          {['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'].map((lvl, idx) => (
            <div key={lvl} className="adm-matrix__col">
              <span className="adm-matrix__title">{lvl}</span>
              <span className="adm-matrix__badge">ACTIVE</span>
              <span className="adm-matrix__meta">{(idx + 1) * 20} Questions / Stream</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Level Analytics Table */}
      <div className="adm-section-box">
        <h4>Stream Level Analytics & Pass Rates</h4>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Level tier</th>
                <th>Questions / Stream</th>
                <th>Overall Pass Rate</th>
                <th>Science</th>
                <th>Technology</th>
                <th>Engineering</th>
                <th>Mathematics</th>
              </tr>
            </thead>
            <tbody>
              {levelBreakdown.map((row) => (
                <tr key={row.level}>
                  <td className="adm-td--bold">{row.level}</td>
                  <td>{row.qCount} Questions</td>
                  <td><span className="aq-status aq-status--published">{row.passRate}</span></td>
                  <td>{row.scienceRate}%</td>
                  <td>{row.techRate}%</td>
                  <td>{row.engRate}%</td>
                  <td>{row.mathRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
