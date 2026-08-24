import { useAdminAuth } from '../features/admin-auth/auth/admin-auth-context.js'
import './admin.css'

/**
 * Task 5.9 — Admin dashboard (index route under the protected shell).
 *
 * Foundation placeholder for the admin overview. The identity shown is the
 * server-derived admin from `GET /api/admin/me`; no admin data endpoints
 * exist yet (Question Builder and the data dashboards ship in later tasks).
 */

export default function AdminDashboardPage() {
  const { admin } = useAdminAuth()

  return (
    <section className="adm-panel adm-placeholder">
      <h3>Welcome, {admin.displayName}</h3>
      <p>Your administrator session is active. The dashboard overview ships with the next admin tasks.</p>
      <p>Use the navigation to preview each section.</p>
    </section>
  )
}