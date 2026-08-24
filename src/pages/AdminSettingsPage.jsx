import './admin.css'

export default function AdminSettingsPage() {
  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <div>
          <h3>System Settings & Configuration</h3>
          <p className="adm-subtitle">Inspect deployment environment, backend connectivity, and kiosk parameters.</p>
        </div>
      </div>

      <div className="adm-grid-2">
        <div className="adm-section-box">
          <h4>Environment Config</h4>
          <dl className="adm-dl">
            <dt>API URL</dt>
            <dd><code>http://localhost:4100/api</code></dd>
            <dt>Supabase URL</dt>
            <dd><code>https://fmauqixvdpdgrghuapfs.supabase.co</code></dd>
            <dt>Auth Mode</dt>
            <dd><span className="aq-status aq-status--published">Supabase Auth (Active)</span></dd>
            <dt>Selection Engine</dt>
            <dd>3-of-100 Server Selection</dd>
          </dl>
        </div>

        <div className="adm-section-box">
          <h4>Kiosk Parameters</h4>
          <dl className="adm-dl">
            <dt>Questions / Mission</dt>
            <dd>3 Questions</dd>
            <dt>Max Level per Stream</dt>
            <dd>Level 5</dd>
            <dt>Session TTL</dt>
            <dd>In-Memory Kiosk Session</dd>
          </dl>
        </div>
      </div>
    </section>
  )
}
