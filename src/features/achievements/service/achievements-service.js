/**
 * Achievements — AchievementsService (Task 5.8).
 *
 * Facade + completion hook. `awardForCompletion` is the single backend write
 * path called by GameSessionService.finishSession after progression is
 * recorded (architecture §11): when the stream is now fully completed, the
 * stream-completion badge is awarded AND the stream certificate is issued —
 * both idempotent. The hook is best-effort: a failure is logged and never
 * rolls the completed session back or 500s the finish.
 *
 * The remaining methods delegate to BadgeService / CertificateService for the
 * student-facing read projections, on-demand PDF and public verification.
 */

import { achievementsError } from '../errors.js'
import { BadgeService } from './badge-service.js'
import { CertificateService } from './certificate-service.js'

function validId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

export class AchievementsService {
  /**
   * @param {object} deps
   * @param {import('../../progression/repositories/contracts.js').ProgressionRepository} deps.progressionRepository
   *           - must expose `getStreamProgress` for the trusted `stream_completed` read.
   * @param {import('../contracts/contracts.js').BadgeRepository} deps.badgeRepository
   * @param {import('../contracts/contracts.js').StudentBadgeRepository} deps.studentBadgeRepository
   * @param {import('../contracts/contracts.js').CertificateRepository} deps.certificateRepository
   * @param {import('../../student/repositories/contracts.js').StudentRepository} deps.studentRepository
   * @param {import('../../mission/repositories/contracts.js').StreamRepository} deps.streamRepository
   */
  constructor(deps) {
    this.progressionRepository = deps.progressionRepository
    this.badgeService = deps.badgeService ?? new BadgeService(deps)
    this.certificateService = deps.certificateService ?? new CertificateService(deps)
  }

  /**
   * Post-completion hook (architecture §11). Best-effort and idempotent:
   * awards the stream badge + issues the stream certificate once the stream
   * is genuinely completed (trusted `student_progress.stream_completed`).
   * @param {{ studentId: number, streamId: number, completedAt: number }} input
   * @returns {Promise<{ badgeAwarded: boolean, certificateIssued: boolean, reason?: string }>}
   */
  async awardForCompletion({ studentId, streamId, completedAt }) {
    const sid = Number(studentId)
    const stid = Number(streamId)
    if (!validId(sid)) throw achievementsError.invalidInput('student id')
    if (!validId(stid)) throw achievementsError.invalidInput('stream id')

    const progress = await this.progressionRepository.getStreamProgress({ studentId: sid, streamId: stid })
    if (!progress || progress.streamCompleted !== true) {
      return { badgeAwarded: false, certificateIssued: false, reason: 'stream-not-completed' }
    }

    const [badge, certificate] = await Promise.all([
      this.badgeService.awardStreamCompletionBadge({ studentId: sid, streamId: stid, completedAt }),
      this.certificateService.issueStreamCertificate({ studentId: sid, streamId: stid, earnedAt: completedAt }),
    ])
    return {
      badgeAwarded: badge.awarded === true,
      certificateIssued: certificate.issued === true,
      badge,
      certificate: certificate.certificate,
    }
  }

  /** Student-facing badge catalogue + awarded state. */
  getStudentAchievements(args) {
    return this.badgeService.getStudentAchievements(args)
  }

  /** Student-facing certificate list (revoked excluded). */
  getStudentCertificates(args) {
    return this.certificateService.getStudentCertificates(args)
  }

  /** On-demand PDF for one of the student's own certificates. */
  getCertificatePdf(args) {
    return this.certificateService.getCertificatePdf(args)
  }

  /** Public verification by `certificate_code` (safe surface only). */
  verifyCertificate(args) {
    return this.certificateService.verifyCertificate(args)
  }

  /** Direct certificate issue (idempotent) — used by the completion hook. */
  issueStreamCertificate(args) {
    return this.certificateService.issueStreamCertificate(args)
  }

  /** Direct badge award (idempotent) — used by the completion hook. */
  awardStreamCompletionBadge(args) {
    return this.badgeService.awardStreamCompletionBadge(args)
  }
}

export default {
  AchievementsService,
}