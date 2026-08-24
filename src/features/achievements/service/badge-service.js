/**
 * Achievements — BadgeService (Task 5.8).
 *
 * Server-only badge authority. Reads the data-driven badge catalogue (4
 * stream-completion badges from the 0002 seed) and awards rows into
 * `student_badges` exclusively when a stream is fully completed. Awarding is
 * idempotent: the 0001 UNIQUE(student_id, badge_id) constraint (mirrored by
 * the memory store) means a repeat completion never duplicates a badge.
 *
 * Students can only READ their achievements; awarding is backend-authored
 * only (D-011/D-027). The badge slug is derived server-side from the stream
 * slug — a caller can never choose which badge to grant.
 */

import { achievementsError } from '../errors.js'
import { STREAM_SLUG_TO_BADGE_SLUG } from '../repositories/memory.js'

function validId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

export class BadgeService {
  /**
   * @param {object} deps
   * @param {import('../contracts/contracts.js').BadgeRepository} deps.badgeRepository
   * @param {import('../contracts/contracts.js').StudentBadgeRepository} deps.studentBadgeRepository
   * @param {import('../../mission/repositories/contracts.js').StreamRepository} deps.streamRepository
   */
  constructor({ badgeRepository, studentBadgeRepository, streamRepository }) {
    this.badgeRepository = badgeRepository
    this.studentBadgeRepository = studentBadgeRepository
    this.streamRepository = streamRepository
  }

  /**
   * Public achievements projection for one student: the full active badge
   * catalogue with each badge's awarded state. Read-only, safe surface.
   * @param {{ studentId: number }} input
   * @returns {Promise<{ badges: Array<object> }>}
   */
  async getStudentAchievements({ studentId }) {
    const sid = Number(studentId)
    if (!validId(sid)) throw achievementsError.invalidInput('student id')
    const [badges, awarded] = await Promise.all([
      this.badgeRepository.listActive(),
      this.studentBadgeRepository.listByStudent(sid),
    ])
    const awardedByBadge = new Map(awarded.map((a) => [a.badgeId, a]))
    return {
      badges: badges.map((badge) => ({
        id: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        criteria: badge.criteria ?? {},
        awarded: awardedByBadge.has(badge.id),
        awardedAt: awardedByBadge.get(badge.id)?.awardedAt ?? null,
      })),
    }
  }

  /**
   * Awards the stream-completion badge for (student, stream). No-op when the
   * stream is unknown, has no badge in the catalogue, or the badge was
   * already awarded. Idempotent by design.
   * @param {{ studentId: number, streamId: number, completedAt: number }} input
   * @returns {Promise<{ awarded: boolean, badge?: object, reason?: string }>}
   */
  async awardStreamCompletionBadge({ studentId, streamId, completedAt }) {
    const sid = Number(studentId)
    const stid = Number(streamId)
    const at = Number(completedAt)
    if (!validId(sid)) throw achievementsError.invalidInput('student id')
    if (!validId(stid)) throw achievementsError.invalidInput('stream id')
    if (!Number.isFinite(at) || at <= 0) throw achievementsError.invalidInput('completedAt')

    const stream = await this.streamRepository.findById(stid)
    if (!stream || stream.isActive === false) return { awarded: false, reason: 'no-stream' }

    const badgeSlug = STREAM_SLUG_TO_BADGE_SLUG[stream.slug]
    if (!badgeSlug) return { awarded: false, reason: 'no-badge' }
    const badge = await this.badgeRepository.findBySlug(badgeSlug)
    if (!badge) return { awarded: false, reason: 'no-badge' }

    const existing = await this.studentBadgeRepository.findByStudentAndBadge(sid, badge.id)
    if (existing) {
      return { awarded: false, badge: this.toPublicBadge(badge, existing.awardedAt) }
    }

    const stored = await this.studentBadgeRepository.award({
      studentId: sid,
      badgeId: badge.id,
      awardedAt: at,
      metadata: { stream: stream.slug, streamId: stid },
    })
    return { awarded: true, badge: this.toPublicBadge(badge, stored.awardedAt) }
  }

  toPublicBadge(badge, awardedAt) {
    return {
      id: badge.id,
      slug: badge.slug,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      criteria: badge.criteria ?? {},
      awarded: true,
      awardedAt,
    }
  }
}

export default {
  BadgeService,
}