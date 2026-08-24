/**
 * Achievements — CertificateService (Task 5.8).
 *
 * Server-only certificate authority over the 0001 `certificates` table
 * (D-011/D-031). The record is the source of truth; the PDF is generated ON
 * DEMAND with a short TTL and never permanently stored — there is no
 * certificates Storage bucket. A certificate is issued once per completed
 * stream (UNIQUE(student_id, stream_id) makes re-issue a no-op), carries a
 * unique public `certificate_code` for verification, and can be revoked via
 * the `revoked` flag (admin action; the service role writes it directly).
 *
 * Public verification (`verifyCertificate`) exposes ONLY safe data: code,
 * title, stream name, the recipient name printed on the certificate, earned
 * date and revocation state. No student_id, login code, token, hash, score
 * or answer data ever leaves the server (D-027).
 */

import { achievementsError } from '../errors.js'
import { generateCertificatePdf } from '../pdf/pdf-generator.js'
import { makeCertificateCode } from '../certificate-code.js'

function validId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

function displayNameOf(student) {
  if (!student) return ''
  return student.fullName ? `${student.initials} ${student.fullName}` : `${student.initials ?? ''}`
}

const PDF_TITLE = 'Certificate of Achievement'
const ISSUER = 'STEM QUEST'

export class CertificateService {
  /**
   * @param {object} deps
   * @param {import('../contracts/contracts.js').CertificateRepository} deps.certificateRepository
   * @param {import('../../student/repositories/contracts.js').StudentRepository} deps.studentRepository
   *           - `findById` must resolve `{ id, initials, fullName, status }`.
   * @param {import('../../mission/repositories/contracts.js').StreamRepository} deps.streamRepository
   * @param {Function} [deps.makeCertificateCode] - injectable code generator (tests)
   */
  constructor({ certificateRepository, studentRepository, streamRepository, makeCertificateCode: codeGen }) {
    this.certificateRepository = certificateRepository
    this.studentRepository = studentRepository
    this.streamRepository = streamRepository
    this.makeCertificateCode = codeGen ?? makeCertificateCode
  }

  /**
   * Issues the completion certificate for (student, stream). No-op when the
   * stream is unknown or a certificate already exists (idempotent). A
   * `certificate_code` collision retries with a fresh code.
   * @param {{ studentId: number, streamId: number, earnedAt: number }} input
   * @returns {Promise<{ issued: boolean, certificate?: object, reason?: string }>}
   */
  async issueStreamCertificate({ studentId, streamId, earnedAt }) {
    const sid = Number(studentId)
    const stid = Number(streamId)
    const at = Number(earnedAt)
    if (!validId(sid)) throw achievementsError.invalidInput('student id')
    if (!validId(stid)) throw achievementsError.invalidInput('stream id')
    if (!Number.isFinite(at) || at <= 0) throw achievementsError.invalidInput('earnedAt')

    const stream = await this.streamRepository.findById(stid)
    if (!stream || stream.isActive === false) return { issued: false, reason: 'no-stream' }

    const existing = await this.certificateRepository.findByStudentAndStream(sid, stid)
    if (existing) {
      return { issued: false, certificate: this.toPublicCertificate(existing, stream) }
    }

    const certificate = await this.#issueWithUniqueCode({ sid, stid, stream, earnedAt: at })
    return { issued: true, certificate: this.toPublicCertificate(certificate, stream) }
  }

  async #issueWithUniqueCode({ sid, stid, stream, earnedAt }) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const certificateCode = this.makeCertificateCode()
      try {
        const stored = await this.certificateRepository.issue({
          studentId: sid,
          streamId: stid,
          title: `${stream.name} Completion Certificate`,
          certificateCode,
          earnedAt,
        })
        return stored
      } catch (err) {
        // A concurrent issue may have won the (student, stream) unique key —
        // treat that as a no-op. Otherwise retry once more with a fresh code.
        const raced = await this.certificateRepository.findByStudentAndStream(sid, stid)
        if (raced) return raced
        if (attempt === 4) throw err
      }
    }
    throw achievementsError.internal('certificate code allocation exhausted')
  }

  /**
   * The student's own certificates (revoked ones are not downloadable and are
   * excluded from the list). Read-only safe projection.
   * @param {{ studentId: number }} input
   * @returns {Promise<{ certificates: Array<object>, revokedCount: number }>}
   */
  async getStudentCertificates({ studentId }) {
    const sid = Number(studentId)
    if (!validId(sid)) throw achievementsError.invalidInput('student id')
    const rows = await this.certificateRepository.listByStudent(sid)
    const active = rows.filter((c) => !c.revoked)
    const streams = await Promise.all(active.map((c) => this.streamRepository.findById(c.streamId)))
    return {
      certificates: active.map((c, i) => ({
        ...this.toPublicCertificate(c, streams[i]),
        pdfUrl: `/api/student/certificates/${c.id}/pdf`,
      })),
      revokedCount: rows.length - active.length,
    }
  }

  /**
   * Generates the on-demand PDF for one of the caller's own certificates.
   * Ownership is enforced against the session's student id — a student can
   * only ever render their own certificate. Revoked certificates return 410.
   * @param {{ certificateId: number, studentId: number }} input
   * @returns {Promise<{ pdf: Buffer, filename: string, certificate: object }>}
   */
  async getCertificatePdf({ certificateId, studentId }) {
    const cid = Number(certificateId)
    const sid = Number(studentId)
    if (!validId(cid)) throw achievementsError.invalidInput('certificate id')
    if (!validId(sid)) throw achievementsError.invalidInput('student id')

    const certificate = await this.certificateRepository.findById(cid)
    if (!certificate || Number(certificate.studentId) !== sid) {
      throw achievementsError.notFound('certificate')
    }
    if (certificate.revoked) {
      throw achievementsError.revoked('certificate')
    }

    const [student, stream] = await Promise.all([
      this.studentRepository.findById(sid),
      this.streamRepository.findById(certificate.streamId),
    ])
    if (!stream) throw achievementsError.notFound('stream')

    let pdf
    try {
      pdf = generateCertificatePdf({
        studentName: displayNameOf(student),
        streamName: stream.name,
        title: PDF_TITLE,
        earnedAt: certificate.earnedAt,
        certificateCode: certificate.certificateCode,
        issuer: ISSUER,
      })
    } catch (err) {
      console?.error?.(`certificate PDF generation failed: ${err.message}`)
      throw achievementsError.pdfFailed()
    }
    return {
      pdf,
      filename: `certificate-${certificate.certificateCode}.pdf`,
      certificate: this.toPublicCertificate(certificate, stream),
    }
  }

  /**
   * Public certificate verification by code. Exposes ONLY safe data. Unknown
   * codes raise NOT_FOUND (404); revoked certificates are returned as
   * `{ valid: false, certificate: { ... } }` with their revocation state.
   * @param {{ certificateCode: string }} input
   * @returns {Promise<{ valid: boolean, certificate: object }>}
   */
  async verifyCertificate({ certificateCode }) {
    const code = String(certificateCode ?? '').trim()
    if (!code) throw achievementsError.invalidInput('certificate code')
    const certificate = await this.certificateRepository.findByCode(code)
    if (!certificate) throw achievementsError.notFound('certificate')

    const [student, stream] = await Promise.all([
      this.studentRepository.findById(certificate.studentId),
      this.streamRepository.findById(certificate.streamId),
    ])
    return {
      valid: certificate.revoked !== true,
      certificate: {
        code: certificate.certificateCode,
        title: certificate.title,
        stream: {
          name: stream?.name ?? null,
          slug: stream?.slug ?? null,
        },
        studentName: displayNameOf(student),
        earnedAt: certificate.earnedAt,
        revoked: certificate.revoked === true,
        revokedAt: certificate.revokedAt,
      },
    }
  }

  toPublicCertificate(certificate, stream) {
    return {
      id: certificate.id,
      code: certificate.certificateCode,
      title: certificate.title,
      stream: {
        id: stream?.id ?? certificate.streamId,
        name: stream?.name ?? null,
        slug: stream?.slug ?? null,
        themeColor: stream?.themeColor ?? null,
      },
      earnedAt: certificate.earnedAt,
      revoked: certificate.revoked === true,
      revokedAt: certificate.revokedAt,
    }
  }
}

export default {
  CertificateService,
}