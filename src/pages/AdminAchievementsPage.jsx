import { useState } from 'react'
import {
  useAdminAchievementsOverview,
  verifyCertificateCode,
} from '../features/admin-achievements/queries/queries.js'
import './admin.css'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleDateString()
}

export default function AdminAchievementsPage() {
  const { data, isLoading, isError, error, refetch } = useAdminAchievementsOverview()
  const certificates = data?.certificates ?? []
  const badgeAwards = data?.badgeAwards ?? []

  const [certCode, setCertCode] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!certCode.trim()) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const result = await verifyCertificateCode(certCode)
      setVerifyResult(result)
    } catch (err) {
      setVerifyResult(null)
      setVerifyError(err?.message ?? 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <div>
          <h3>Badges &amp; Certificates Management</h3>
          <p className="adm-subtitle">Verify student certificates, review earned badges, and validate credentials.</p>
        </div>
      </div>

      {isError ? (
        <div className="aq-error" role="alert">
          <div>
            ⚠️ {error?.message?.toLowerCase().includes('jwt')
              ? 'Your admin security token has expired (JWT expired). Please sign out and sign back in to renew your session.'
              : `We couldn't load achievements data. ${error?.message ?? 'Unknown error'}`}
          </div>
          <button type="button" className="aq-btn aq-btn--ghost" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : null}

      {/* Certificate Verification Tool */}
      <div className="adm-section-box">
        <h4>Certificate Verification Tool</h4>
        <form className="adm-inline-form" onSubmit={handleVerify}>
          <input
            type="text"
            className="adm-input"
            placeholder="Enter certificate verification code (e.g. CERT-8X92)"
            value={certCode}
            onChange={(e) => setCertCode(e.target.value)}
          />
          <button type="submit" className="aq-btn aq-btn--primary" disabled={verifying}>
            {verifying ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        {verifyError ? (
          <p className="aq-note aq-note--error">{verifyError}</p>
        ) : null}

        {verifyResult && !verifyResult.found ? (
          <div className="adm-verify-card">
            <span className="aq-status aq-status--rejected">✗ NOT FOUND</span>
            <p>No certificate matches code <strong>{verifyResult.code}</strong>.</p>
          </div>
        ) : null}

        {verifyResult?.found ? (
          <div className="adm-verify-card">
            <span className={`aq-status ${verifyResult.valid ? 'aq-status--published' : 'aq-status--rejected'}`}>
              {verifyResult.valid ? '✓ VALID CERTIFICATE' : '✗ REVOKED'}
            </span>
            <p><strong>Code:</strong> {verifyResult.code}</p>
            <p><strong>Student:</strong> {verifyResult.studentName}</p>
            <p><strong>Stream:</strong> {verifyResult.stream}</p>
            <p><strong>Issued Date:</strong> {verifyResult.issuedAt}</p>
          </div>
        ) : null}
      </div>

      {/* Recently Issued Certificates */}
      <div className="adm-section-box">
        <h4>Recently Issued Certificates</h4>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Student</th>
                <th>Title</th>
                <th>Earned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[100, 150, 130, 90, 80].map((w, j) => (
                      <td key={j}>
                        <span className="adm-skeleton" style={{ display: 'inline-block', width: w, height: 14, borderRadius: 6 }} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                !isError &&
                certificates.map((c) => (
                  <tr key={c.id}>
                    <td className="adm-td--bold">{c.certificate_code}</td>
                    <td>{c.studentName}</td>
                    <td>{c.title}</td>
                    <td>{formatDate(c.earned_at)}</td>
                    <td>
                      <span className={`aq-status ${c.revoked ? 'aq-status--rejected' : 'aq-status--published'}`}>
                        {c.revoked ? 'Revoked' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              {!isLoading && !isError && certificates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="aq-empty">
                    No certificates issued yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recently Awarded Badges */}
      <div className="adm-section-box">
        <h4>Recently Awarded Badges</h4>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Badge</th>
                <th>Student</th>
                <th>Awarded</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[140, 150, 90].map((w, j) => (
                      <td key={j}>
                        <span className="adm-skeleton" style={{ display: 'inline-block', width: w, height: 14, borderRadius: 6 }} />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading &&
                !isError &&
                badgeAwards.map((b) => (
                  <tr key={b.id}>
                    <td className="adm-td--bold">
                      {b.badgeIcon} {b.badgeName}
                    </td>
                    <td>{b.studentName}</td>
                    <td>{formatDate(b.awarded_at)}</td>
                  </tr>
                ))}
              {!isLoading && !isError && badgeAwards.length === 0 ? (
                <tr>
                  <td colSpan={3} className="aq-empty">
                    No badges awarded yet.
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
