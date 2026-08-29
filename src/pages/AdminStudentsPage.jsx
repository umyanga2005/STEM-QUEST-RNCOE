import { useState } from 'react'
import { Link } from 'react-router'
import { useAdminStudentList } from '../features/admin-students/queries/queries.js'
import './admin.css'

/* ─── Copy-to-clipboard helper ─────────────────────────────────────────── */
function useCopyCode() {
  const [copiedCode, setCopiedCode] = useState(null)
  const copy = (code) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }
  return { copiedCode, copy }
}

/* ─── Loading skeleton ──────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      {[180, 120, 140, 110, 130, 110, 80].map((w, i) => (
        <td key={i}>
          <span
            className="adm-skeleton"
            style={{ display: 'inline-block', width: w, height: 14, borderRadius: 6 }}
          />
        </td>
      ))}
    </tr>
  )
}

/* ─── Empty state ───────────────────────────────────────────────────────── */
function EmptyState({ hasSearch }) {
  if (hasSearch) {
    return (
      <tr>
        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--adm-muted, #8b9dc3)' }}>
          No students match that search.
        </td>
      </tr>
    )
  }
  return (
    <tr>
      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: 'var(--adm-muted, #8b9dc3)', marginBottom: '0.75rem' }}>
          No students registered yet.
        </p>
        <Link className="aq-btn aq-btn--primary" to="/student/register" target="_blank" rel="noopener">
          Open Student Registration ↗
        </Link>
      </td>
    </tr>
  )
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function AdminStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const { copiedCode, copy } = useCopyCode()

  const { data, isLoading, isError, error, refetch } = useAdminStudentList()
  const allStudents = data?.students ?? []

  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.kioskCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.lastLogin.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <section className="adm-panel aq-page">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="aq-page__top">
        <div>
          <h3>Student Accounts &amp; Kiosk Codes</h3>
          <p className="adm-subtitle">
            {isLoading
              ? 'Loading student records…'
              : isError
              ? 'Could not load students.'
              : `${allStudents.length} registered student${allStudents.length !== 1 ? 's' : ''} · overview of kiosk login access codes.`}
          </p>
        </div>
        <Link className="aq-btn aq-btn--primary" to="/student/register" target="_blank" rel="noopener">
          + Register Student ↗
        </Link>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="adm-toolbar">
        <input
          type="search"
          className="adm-search"
          placeholder="Search by name or Kiosk Code (e.g. SQ-8A2F)…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoading || isError}
        />
        {!isLoading && !isError && (
          <button
            type="button"
            className="aq-btn aq-btn--ghost"
            onClick={() => refetch()}
            style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
          >
            ↺ Refresh
          </button>
        )}
      </div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {isError && (
        <div
          role="alert"
          style={{
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 10,
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ color: '#f87171', fontWeight: 700 }}>⚠ Could not load students</span>
          <span style={{ color: 'var(--adm-muted, #8b9dc3)', fontSize: '0.875rem' }}>
            {error?.message ?? 'Unknown error'}
          </span>
          <button
            type="button"
            className="aq-btn aq-btn--ghost"
            onClick={() => refetch()}
            style={{ marginLeft: 'auto' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Kiosk Code</th>
              <th>Grade / Level</th>
              <th>Registered</th>
              <th>Last Login</th>
              <th>Missions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading skeletons */}
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

            {/* Real rows */}
            {!isLoading &&
              !isError &&
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="adm-td--bold">{student.name}</td>

                  {/* Kiosk code + copy button */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <code
                        style={{
                          background: 'rgba(45,212,191,0.15)',
                          color: '#2dd4bf',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 6,
                          fontWeight: 700,
                        }}
                      >
                        {student.kioskCode}
                      </code>
                      <button
                        type="button"
                        className="aq-btn aq-btn--bare"
                        onClick={() => copy(student.kioskCode)}
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                        aria-label={`Copy kiosk code ${student.kioskCode}`}
                      >
                        {copiedCode === student.kioskCode ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                  </td>

                  <td>{student.grade}</td>
                  <td>{student.registered}</td>
                  <td style={{ color: student.lastLogin === 'Never' ? 'var(--adm-muted, #8b9dc3)' : 'inherit' }}>
                    {student.lastLogin}
                  </td>
                  <td>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {student.missions} Mission{student.missions !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <span className="aq-status aq-status--published">{student.status}</span>
                  </td>
                </tr>
              ))}

            {/* Empty states */}
            {!isLoading && !isError && (
              filteredStudents.length === 0
                ? <EmptyState hasSearch={searchTerm.length > 0} />
                : null
            )}
          </tbody>
        </table>
      </div>

      {/* ── Summary footer ────────────────────────────────────────── */}
      {!isLoading && !isError && allStudents.length > 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--adm-muted, #8b9dc3)', marginTop: '0.75rem' }}>
          Showing {filteredStudents.length} of {allStudents.length} students
          {searchTerm ? ` matching "${searchTerm}"` : ''}.
        </p>
      )}
    </section>
  )
}
