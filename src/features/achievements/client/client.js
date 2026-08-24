/**
 * Achievements — browser API client (Task 5.8).
 *
 * Pure fetching against the Hono API. All authority stays server-side:
 * badges/certificates are backend-authored, so this client can only READ the
 * student's achievements and download their own on-demand certificate PDF.
 * The public verification request is the only route without a token. No
 * Supabase calls here (D-027).
 */

const STUDENT_BASE = '/api/student'
const VERIFY_BASE = '/api/certificates/verify'

export class AchievementsApiError extends Error {
  constructor(status, payload) {
    super(payload?.message ?? `Request failed (${status})`)
    this.name = 'AchievementsApiError'
    this.status = status
    this.code = payload?.code ?? null
    this.category = payload?.category ?? null
  }
}

async function request(base, path, { token } = {}) {
  const headers = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  const resp = await fetch(`${base}${path}`, { headers })
  const parsed = await resp.json().catch(() => null)
  if (!resp.ok) {
    throw new AchievementsApiError(resp.status, parsed?.error)
  }
  return parsed
}

export const achievementsApiClient = Object.freeze({
  /** `{ badges: [{ id, slug, name, description, icon, awarded, awardedAt }] }` */
  getAchievements(token) {
    return request(STUDENT_BASE, '/achievements', { token })
  },
  /** `{ certificates: [...], revokedCount }` */
  getCertificates(token) {
    return request(STUDENT_BASE, '/certificates', { token })
  },
  /**
   * Downloads the caller's certificate PDF as a blob (the token travels in an
   * Authorization header, so a plain <a href> cannot be used).
   * @returns {Promise<{ blob: Blob, filename: string }>}
   */
  async downloadCertificatePdf({ token, certificateId }) {
    const headers = {}
    if (token) headers['authorization'] = `Bearer ${token}`
    const resp = await fetch(`${STUDENT_BASE}/certificates/${encodeURIComponent(certificateId)}/pdf`, { headers })
    if (!resp.ok) {
      const parsed = await resp.json().catch(() => null)
      throw new AchievementsApiError(resp.status, parsed?.error)
    }
    const disposition = resp.headers.get('content-disposition') ?? ''
    const match = /filename="([^"]+)"/.exec(disposition)
    const filename = match ? match[1] : `certificate-${certificateId}.pdf`
    return { blob: await resp.blob(), filename }
  },
  /** Public verification by code. */
  verifyCertificate(certificateCode) {
    return request(VERIFY_BASE, `/${encodeURIComponent(certificateCode)}`)
  },
})

export default achievementsApiClient