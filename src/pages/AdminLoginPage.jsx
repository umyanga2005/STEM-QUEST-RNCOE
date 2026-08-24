import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAdminAuth } from '../features/admin-auth/auth/admin-auth-context.js'
import { AdminAuthError } from '../features/admin-auth/auth/admin-auth-controller.js'
import './admin.css'

/**
 * Task 5.9 — Administrator sign-in.
 *
 * Public route. Signs the admin in through Supabase Auth (anon key) and then
 * validates authorization via `GET /api/admin/me`; a successful sign-in
 * redirects to the requested admin route (or `/admin`). When the public
 * Supabase env values are unset, the page shows a "not configured" notice
 * instead of a dead form. Already-authenticated visitors are bounced straight
 * to the dashboard — no redirect loops: the guarded `/admin/*` routes send
 * unauthenticated visitors HERE, and this page only leaves for `/admin` with
 * a validated session.
 */

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const { status, error, signIn, resetError } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const from = useMemo(() => location.state?.from?.pathname ?? '/admin', [location.state])

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    resetError()
    try {
      await signIn({ email, password })
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(err instanceof AdminAuthError ? err.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const unavailable = status === 'unavailable'
  const showForm = status === 'loading' || status === 'unauthenticated'
  const notice = unavailable
    ? 'Administrator sign-in is not configured for this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and restart.'
    : error?.message ?? formError

  return (
    <main className="adm-page">
      <div className="adm-glow" aria-hidden="true" />
      <motion.section
        className="adm-card"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        aria-labelledby="adm-login-title"
      >
        <header className="adm-header">
          <h1 id="adm-login-title">STEM QUEST</h1>
          <p className="adm-tagline">Administrator Console</p>
        </header>

        {showForm ? (
          <form className="adm-form" onSubmit={onSubmit} noValidate>
            <div className="adm-field">
              <label htmlFor="adm-email">Email</label>
              <input
                id="adm-email"
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
            <div className="adm-field">
              <label htmlFor="adm-password">Password</label>
              <input
                id="adm-password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="adm-status" aria-live="polite" role="status">
              {notice ? <p className="adm-error">{notice}</p> : null}
              {submitting ? <p className="adm-notice">Signing in…</p> : null}
            </div>

            <button type="submit" className="adm-submit" disabled={submitting || status === 'loading'}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="adm-footnote">Authorized administrators only.</p>
          </form>
        ) : null}

        {unavailable ? <p className="adm-notice">{notice}</p> : null}
        <span className="adm-badge" role="status">
          Supabase Auth
        </span>
      </motion.section>
    </main>
  )
}