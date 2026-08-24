import { useState } from 'react'
import './admin.css'

export default function AdminAchievementsPage() {
  const [certCode, setCertCode] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)

  const handleVerify = (e) => {
    e.preventDefault()
    if (!certCode.trim()) return
    setVerifyResult({
      code: certCode.trim().toUpperCase(),
      valid: true,
      studentName: 'UMAYANGA KARUNARATHNA',
      stream: 'Science Master',
      issuedAt: new Date().toLocaleDateString(),
    })
  }

  return (
    <section className="adm-panel aq-page">
      <div className="aq-page__top">
        <div>
          <h3>Badges & Certificates Management</h3>
          <p className="adm-subtitle">Verify student certificates, review earned badges, and validate credentials.</p>
        </div>
      </div>

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
          <button type="submit" className="aq-btn aq-btn--primary">
            Verify Code
          </button>
        </form>

        {verifyResult ? (
          <div className="adm-verify-card">
            <span className="aq-status aq-status--published">✓ VALID CERTIFICATE</span>
            <p><strong>Code:</strong> {verifyResult.code}</p>
            <p><strong>Student:</strong> {verifyResult.studentName}</p>
            <p><strong>Stream:</strong> {verifyResult.stream}</p>
            <p><strong>Issued Date:</strong> {verifyResult.issuedAt}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
