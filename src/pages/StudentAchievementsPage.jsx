import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link, Navigate } from 'react-router'
import tokenStorage from '../features/student/session/token-storage.js'
import { isExpiredSession } from '../features/mission/session-guard.js'
import { useStudentMe } from '../features/student/api/queries.js'
import {
  useAchievements,
  useCertificates,
  useDownloadCertificatePdf,
  useVerifyCertificate,
} from '../features/achievements/queries/queries.js'
import StreamIcon from './stream-icons.jsx'
import './student-achievements.css'

const CODE_RE = /^[A-Z2-9-]{5,20}$/i

export default function StudentAchievementsPage() {
  const reduceMotion = useReducedMotion()
  const [token, setToken] = useState(() => tokenStorage.read())

  const me = useStudentMe(token)
  const achievements = useAchievements(token)
  const certificates = useCertificates(token)
  const download = useDownloadCertificatePdf(token)

  const [verificationCode, setVerificationCode] = useState('')
  const [submittedCode, setSubmittedCode] = useState('')
  const verify = useVerifyCertificate(submittedCode)

  const expired = isExpiredSession(me, token) || isExpiredSession(achievements, token) || isExpiredSession(certificates, token)

  useEffect(() => {
    if (expired) {
      tokenStorage.clear()
      setToken(null)
    }
  }, [expired])

  if (!token) {
    return <Navigate to="/student/register" replace />
  }

  const loading = me.isLoading || achievements.isLoading || certificates.isLoading
  const failed = me.isError || achievements.isError || certificates.isError

  const verifyInput = submittedCode ? (
    <VerifyResult code={submittedCode} verify={verify} onChange={() => setSubmittedCode('')} />
  ) : (
    <form
      className="ac-verify__form"
      onSubmit={(e) => {
        e.preventDefault()
        setSubmittedCode(verificationCode.trim().toUpperCase())
      }}
    >
      <label className="ac-verify__label" htmlFor="ac-verify-code">
        Certificate code
      </label>
      <div className="ac-verify__row">
        <input
          id="ac-verify-code"
          className="ac-verify__input"
          placeholder="SQ-XXXXXX-XXXXXX"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="ac-button ac-button--primary" disabled={!CODE_RE.test(verificationCode.trim())}>
          Verify
        </button>
      </div>
    </form>
  )

  return (
    <main className="ac-page">
      <div className="ac-glow" aria-hidden="true" />
      <div className="ac-shell">
        <header className="ac-header">
          <div className="ac-header__top">
            <span className="ac-brand">STEM QUEST</span>
            {me.data?.student ? <span className="ac-greeting">Hi {me.data.student.name}</span> : null}
          </div>
          <Link className="ac-back" to="/student/mission">
            ← Back to mission
          </Link>
        </header>

        {loading ? (
          <p className="ac-status" role="status">
            Loading your achievements…
          </p>
        ) : failed ? (
          <div className="ac-error" role="alert">
            <p>We couldn’t load your achievements right now.</p>
            <button
              type="button"
              className="ac-button ac-button--ghost"
              onClick={() => {
                achievements.refetch()
                certificates.refetch()
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <motion.div
            className="ac-stack"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <section className="ac-card" aria-labelledby="ac-badges-title">
              <div className="ac-card__head">
                <h2 className="ac-title" id="ac-badges-title">Badges</h2>
                <p className="ac-subtitle">Earned by completing a whole STEM stream.</p>
              </div>
              <div className="ac-badges">
                {(achievements.data?.badges ?? []).map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </section>

            <section className="ac-card" aria-labelledby="ac-certificates-title">
              <div className="ac-card__head">
                <h2 className="ac-title" id="ac-certificates-title">Certificates</h2>
                <p className="ac-subtitle">One certificate per completed stream — download any time.</p>
              </div>
              {(certificates.data?.certificates ?? []).length === 0 ? (
                <p className="ac-empty">No certificates yet. Complete a full stream to earn one.</p>
              ) : (
                <ul className="ac-certs">
                  {(certificates.data?.certificates ?? []).map((certificate) => (
                    <CertificateRow
                      key={certificate.id}
                      certificate={certificate}
                      downloading={download.isPending && download.variables?.certificateId === certificate.id}
                      onDownload={() =>
                        download.mutate({ certificateId: certificate.id }, {
                          onSuccess: ({ blob, filename }) => {
                            const url = URL.createObjectURL(blob)
                            const anchor = document.createElement('a')
                            anchor.href = url
                            anchor.download = filename
                            anchor.click()
                            URL.revokeObjectURL(url)
                          },
                        })
                      }
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="ac-card" aria-labelledby="ac-verify-title">
              <div className="ac-card__head">
                <h2 className="ac-title" id="ac-verify-title">Verify a certificate</h2>
                <p className="ac-subtitle">Check any STEM QUEST certificate code without signing in.</p>
              </div>
              {verifyInput}
            </section>
          </motion.div>
        )}
      </div>
    </main>
  )
}

function BadgeCard({ badge }) {
  return (
    <article className={`ac-badge${badge.awarded ? ' ac-badge--earned' : ''}`}>
      <span className="ac-badge__icon" aria-hidden="true">
        {badge.awarded ? <StreamIcon slug={badge.slug.replace('-completion', '')} /> : '·'}
      </span>
      <div className="ac-badge__body">
        <h3 className="ac-badge__name">{badge.name}</h3>
        <p className="ac-badge__desc">{badge.description}</p>
      </div>
      <span className={`ac-badge__state${badge.awarded ? ' ac-badge__state--earned' : ''}`}>
        {badge.awarded ? 'Earned' : 'Locked'}
      </span>
    </article>
  )
}

function CertificateRow({ certificate, downloading, onDownload }) {
  return (
    <li className="ac-cert">
      <span className="ac-cert__icon" aria-hidden="true">
        <StreamIcon slug={certificate.stream.slug} />
      </span>
      <div className="ac-cert__body">
        <h3 className="ac-cert__name">{certificate.title}</h3>
        <p className="ac-cert__meta">
          {certificate.stream.name} · Code {certificate.code}
        </p>
      </div>
      <button
        type="button"
        className="ac-button ac-button--primary ac-button--small"
        onClick={onDownload}
        disabled={downloading}
      >
        {downloading ? 'Preparing…' : 'Download PDF'}
      </button>
    </li>
  )
}

function VerifyResult({ code, verify, onChange }) {
  const status = verify.isLoading ? 'checking' : verify.isError ? 'error' : verify.data ? 'ok' : 'error'
  return (
    <div className={`ac-verify__result ac-verify__result--${status}`} role="status">
      {verify.isLoading ? (
        <p>Checking code {code}…</p>
      ) : verify.isError ? (
        <div>
          <p className="ac-verify__heading">No certificate found</p>
          <p>We couldn’t find a certificate with code {code}.</p>
          <button type="button" className="ac-button ac-button--ghost ac-button--small" onClick={onChange}>
            Try another code
          </button>
        </div>
      ) : verify.data.valid ? (
        <div>
          <p className="ac-verify__heading">Valid certificate</p>
          <p>
            {verify.data.certificate.studentName} · {verify.data.certificate.stream.name} ·{' '}
            {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(verify.data.certificate.earnedAt))}
          </p>
          <button type="button" className="ac-button ac-button--ghost ac-button--small" onClick={onChange}>
            Check another
          </button>
        </div>
      ) : (
        <div>
          <p className="ac-verify__heading">Certificate revoked</p>
          <p>This certificate has been revoked and is no longer valid.</p>
          <button type="button" className="ac-button ac-button--ghost ac-button--small" onClick={onChange}>
            Try another code
          </button>
        </div>
      )}
    </div>
  )
}

export { BadgeCard, CertificateRow, VerifyResult }