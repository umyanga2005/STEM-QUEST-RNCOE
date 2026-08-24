import './admin.css'

/**
 * Task 5.9 — generic placeholder for admin sub-sections.
 *
 * Rendered inside the protected admin shell for the nav items whose data
 * surfaces ship in later tasks (Questions, Students, Progress, Leaderboards,
 * Badges & Certificates, Settings).
 */

export default function AdminPlaceholderPage({ title, description }) {
  return (
    <section className="adm-panel adm-placeholder">
      <h3>{title}</h3>
      <p>{description}</p>
    </section>
  )
}