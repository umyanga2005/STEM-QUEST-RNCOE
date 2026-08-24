import { useLocation, Link } from 'react-router'

const NAV_ITEMS = [
  { path: '/student/mission', label: 'Mission', icon: '🎯' },
  { path: '/leaderboards', label: 'Leaderboard', icon: '🏆' },
  { path: '/student/profile', label: 'Profile', icon: '👤' },
  { path: '/student/achievements', label: 'Badges', icon: '🎖️' },
]

export function StudentNav() {
  const location = useLocation()
  const pathname = location.pathname

  // Hide nav on game page, registration page, or admin panel
  if (
    pathname.startsWith('/student/game') ||
    pathname === '/student/register' ||
    pathname.startsWith('/admin')
  ) {
    return null
  }

  return (
    <nav className="student-bottom-nav" aria-label="Student Navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`student-bottom-nav__item ${isActive ? 'student-bottom-nav__item--active' : ''}`}
          >
            <span className="student-bottom-nav__icon">{item.icon}</span>
            <span className="student-bottom-nav__label">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default StudentNav
