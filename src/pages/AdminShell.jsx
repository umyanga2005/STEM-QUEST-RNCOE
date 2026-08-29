import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router'
import { useAdminAuth } from '../features/admin-auth/auth/admin-auth-context.js'
import './admin.css'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/questions', label: 'Question Builder', icon: '📚', end: true }, // FIX: P2-005 — was matching /admin/questions/review too
  { to: '/admin/questions/review', label: 'Review Queue', icon: '🔍' },
  { to: '/admin/students', label: 'Students', icon: '👥' },
  { to: '/admin/progress', label: 'Progress', icon: '📈' },
  { to: '/admin/leaderboards', label: 'Leaderboards', icon: '🏆' },
  { to: '/admin/achievements', label: 'Badges & Certs', icon: '🎖️' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function AdminShell() {
  const location = useLocation()
  const { status, admin, signOut } = useAdminAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (status === 'loading') {
    return (
      <div className="adm-loading-screen">
        <div className="adm-loading-spinner" />
        <p>Verifying administrator session…</p>
      </div>
    )
  }

  if (status === 'unavailable' || status === 'unauthenticated') {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  const displayName = admin?.displayName || 'Administrator'
  const roleName = admin?.role === 'super_admin' ? 'Super Administrator' : (admin?.role || 'Admin')

  return (
    <div className="adm-shell">
      {/* Mobile Top Header */}
      <header className="adm-mobile-header">
        <div className="adm-mobile-header__brand">STEM QUEST</div>
        <button
          type="button"
          className="adm-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileMenuOpen ? (
        <div className="adm-backdrop" onClick={() => setMobileMenuOpen(false)} />
      ) : null}

      {/* Sidebar */}
      <aside className={`adm-sidebar${mobileMenuOpen ? ' adm-sidebar--open' : ''}`}>
        <div className="adm-sidebar__top">
          <div className="adm-sidebar__brand">STEM QUEST</div>
          <p className="adm-sidebar__sub">Administrator Console</p>
        </div>

        <nav className="adm-nav" aria-label="Administrator sections">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `adm-nav__item${isActive ? ' adm-nav__item--active' : ''}`}
            >
              <span className="adm-nav__icon">{icon}</span>
              <span className="adm-nav__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar__bottom">
          <div className="adm-user-profile">
            <span className="adm-user-profile__avatar">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <div className="adm-user-profile__info">
              <span className="adm-user-profile__name">{displayName}</span>
              <span className="adm-user-profile__role">{roleName}</span>
            </div>
          </div>
          <button type="button" className="adm-signout" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="adm-main">
        <div className="adm-main__top">
          <h2>Administrator Console</h2>
          <div className="adm-who">
            Signed in as <strong>{displayName}</strong>
            <span className="adm-role">{roleName}</span>
          </div>
        </div>
        <div className="adm-main__content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}