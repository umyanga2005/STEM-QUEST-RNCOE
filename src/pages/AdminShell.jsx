import { Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { useAdminAuth } from '../features/admin-auth/auth/admin-auth-context.js'
import './admin.css'

/**
 * Task 5.9 — Admin shell (protected layout).
 *
 * The guarded boundary for every `/admin/*` route:
 *   loading        → minimal loading screen
 *   unavailable    → redirect to `/admin/login` (which shows the config notice)
 *   unauthenticated → redirect to `/admin/login`, remembering the intended
 *                     path so a successful sign-in returns where the admin
 *                     was heading (no redirect loops).
 *   authenticated  → the console layout: brand, nav placeholders for the
 *                    upcoming sections, the server-derived identity + role,
 *                    sign-out, and the routed content via <Outlet />.
 *
 * Identity/role always come from the server's `/api/admin/me` — never from a
 * client-side claim.
 */

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/questions', label: 'Questions' },
  { to: '/admin/questions/review', label: 'Review' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/progress', label: 'Progress' },
  { to: '/admin/leaderboards', label: 'Leaderboards' },
  { to: '/admin/achievements', label: 'Badges & Certificates' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminShell() {
  const location = useLocation()
  const { status, admin, signOut } = useAdminAuth()

  if (status === 'loading') {
    return <div className="adm-loading">Loading…</div>
  }

  if (status === 'unavailable' || status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__brand">STEM QUEST</div>
        <p className="adm-sidebar__sub">Admin Console</p>
        <nav className="adm-nav" aria-label="Administrator sections">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'adm-nav--active' : undefined)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="adm-signout" onClick={() => signOut()}>
          Sign out
        </button>
      </aside>
      <main className="adm-main">
        <div className="adm-main__top">
          <h2>Administrator Console</h2>
          <p className="adm-who">
            Signed in as <strong>{admin.displayName}</strong>
            <span className="adm-role">{admin.role}</span>
          </p>
        </div>
        <Outlet />
      </main>
    </div>
  )
}