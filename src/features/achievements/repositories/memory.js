/**
 * Achievements — in-memory repositories (Task 5.8).
 *
 * Plain-object stores + repository implementations used by unit/integration
 * tests and the local demo API. They match the repository contracts in
 * `contracts.js` and reproduce the idempotent unique-key behaviour of the
 * 0001 migration (`UNIQUE(student_id, badge_id)` and
 * `UNIQUE(student_id, stream_id)`). No Supabase dependency — tests never
 * touch the live project.
 */

/** The 4 stream-completion badges mirrored from the 0002 seed (Task 5.8). */
export const STREAM_COMPLETION_BADGES = [
  {
    id: 1,
    slug: 'science-completion',
    name: 'Science Completion',
    description: 'Completed all 5 Science levels.',
    icon: 'science',
    criteria: { type: 'stream_completion', stream: 'science' },
    isActive: true,
  },
  {
    id: 2,
    slug: 'technology-completion',
    name: 'Technology Completion',
    description: 'Completed all 5 Technology levels.',
    icon: 'technology',
    criteria: { type: 'stream_completion', stream: 'technology' },
    isActive: true,
  },
  {
    id: 3,
    slug: 'engineering-completion',
    name: 'Engineering Completion',
    description: 'Completed all 5 Engineering levels.',
    icon: 'engineering',
    criteria: { type: 'stream_completion', stream: 'engineering' },
    isActive: true,
  },
  {
    id: 4,
    slug: 'mathematics-completion',
    name: 'Mathematics Completion',
    description: 'Completed all 5 Mathematics levels.',
    icon: 'mathematics',
    criteria: { type: 'stream_completion', stream: 'mathematics' },
    isActive: true,
  },
]

/** The 4 stream slugs ↔ badge slug mapping used to award badges. */
export const STREAM_SLUG_TO_BADGE_SLUG = Object.freeze({
  science: 'science-completion',
  technology: 'technology-completion',
  engineering: 'engineering-completion',
  mathematics: 'mathematics-completion',
})

export function createAchievementsMemoryStore() {
  return {
    badges: STREAM_COMPLETION_BADGES.map((b) => ({ ...b })),
    studentBadges: [],
    certificates: [],
  }
}

class MemoryBadgeRepository {
  constructor(store) {
    this.store = store
  }

  async listActive() {
    return this.store.badges.filter((b) => b.isActive !== false)
  }

  async findBySlug(slug) {
    return this.store.badges.find((b) => b.slug === slug && b.isActive !== false) ?? null
  }
}

class MemoryStudentBadgeRepository {
  constructor(store) {
    this.store = store
  }

  async findByStudentAndBadge(studentId, badgeId) {
    const row = this.store.studentBadges.find(
      (r) => Number(r.studentId) === Number(studentId) && Number(r.badgeId) === Number(badgeId)
    )
    return row ? { ...row } : null
  }

  async listByStudent(studentId) {
    return this.store.studentBadges
      .filter((r) => Number(r.studentId) === Number(studentId))
      .map((r) => ({ ...r }))
  }

  async award({ studentId, badgeId, awardedAt, metadata = null }) {
    const existing = await this.findByStudentAndBadge(studentId, badgeId)
    if (existing) return existing
    const row = {
      id: this.store.studentBadges.length + 1,
      studentId: Number(studentId),
      badgeId: Number(badgeId),
      awardedAt: Number(awardedAt),
      metadata: metadata ?? null,
    }
    this.store.studentBadges.push(row)
    return { ...row }
  }
}

class MemoryCertificateRepository {
  constructor(store) {
    this.store = store
  }

  async findByStudentAndStream(studentId, streamId) {
    const row = this.store.certificates.find(
      (c) => Number(c.studentId) === Number(studentId) && Number(c.streamId) === Number(streamId)
    )
    return row ? { ...row } : null
  }

  async listByStudent(studentId) {
    return this.store.certificates
      .filter((c) => Number(c.studentId) === Number(studentId))
      .map((c) => ({ ...c }))
  }

  async findByCode(certificateCode) {
    const row = this.store.certificates.find((c) => c.certificateCode === certificateCode)
    return row ? { ...row } : null
  }

  async findById(id) {
    const row = this.store.certificates.find((c) => Number(c.id) === Number(id))
    return row ? { ...row } : null
  }

  async issue({ studentId, streamId, title, certificateCode, earnedAt }) {
    const existing = await this.findByStudentAndStream(studentId, streamId)
    if (existing) return existing
    // Mirror the 0001 UNIQUE(certificate_code) constraint so the service's
    // collision-retry path is exercised in tests without a live database.
    if (this.store.certificates.some((c) => c.certificateCode === certificateCode)) {
      throw new Error(`certificates issue failed: duplicate key value violates unique constraint "certificates_certificate_code_key"`)
    }
    const row = {
      id: this.store.certificates.length + 1,
      certificateCode,
      studentId: Number(studentId),
      streamId: Number(streamId),
      title,
      earnedAt: Number(earnedAt),
      documentPath: null,
      generatedAt: null,
      revoked: false,
      revokedAt: null,
    }
    this.store.certificates.push(row)
    return { ...row }
  }
}

/** Builds all in-memory achievements repositories over one store. */
export function createAchievementsMemoryRepositories(store = createAchievementsMemoryStore()) {
  return {
    store,
    badgeRepository: new MemoryBadgeRepository(store),
    studentBadgeRepository: new MemoryStudentBadgeRepository(store),
    certificateRepository: new MemoryCertificateRepository(store),
  }
}

export default {
  STREAM_COMPLETION_BADGES,
  STREAM_SLUG_TO_BADGE_SLUG,
  createAchievementsMemoryStore,
  createAchievementsMemoryRepositories,
}