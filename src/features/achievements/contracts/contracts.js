/**
 * Achievements — repository contracts (Task 5.8).
 *
 * Domain-shape definitions and interface documentation only — no runtime
 * logic. In-memory and Supabase implementations both map to/from these
 * objects. Mirrors the 0001 migration `badges`, `student_badges` and
 * `certificates` tables exactly (no new tables, no schema changes).
 *
 * Security model (D-011/D-031/D-027): the backend is the ONLY writer of
 * `student_badges` and `certificates` (service role, via the Achievements
 * Service). Students can never write protected data — they only read their
 * own achievements through the authenticated routes, and the PDF is
 * generated on demand with a short TTL and never permanently stored. The
 * `certificate_code` is the public verification id; a revoked flag is the
 * source of truth for validity (D-031).
 */

/**
 * @typedef {object} Badge
 * @property {number} id
 * @property {string} slug - unique catalogue slug (e.g. `science-completion`)
 * @property {string} name
 * @property {?string} description
 * @property {?string} icon
 * @property {object} criteria - e.g. `{ type: 'stream_completion', stream: 'science' }`
 * @property {boolean} isActive
 */

/**
 * @typedef {object} StudentBadge
 * @property {number} id
 * @property {number} studentId
 * @property {number} badgeId
 * @property {number} awardedAt - epoch ms
 * @property {?object} metadata - server-authored provenance (e.g. stream completed)
 */

/**
 * @typedef {object} Certificate
 * @property {number} id
 * @property {string} certificateCode - unique public verification id
 * @property {number} studentId
 * @property {number} streamId
 * @property {string} title - certificate display title
 * @property {number} earnedAt - epoch ms
 * @property {?string} documentPath - legacy; unused (PDFs are on demand)
 * @property {?number} generatedAt - epoch ms of last on-demand PDF
 * @property {boolean} revoked - revocation is the source of truth (D-031)
 * @property {?number} revokedAt - epoch ms
 */

/**
 * @typedef {object} BadgeRepository
 * @property {() => Promise<Badge[]>} listActive
 *           - all active badges in the catalogue (4 stream-completion badges).
 * @property {(slug: string) => Promise<Badge|null>} findBySlug
 */

/**
 * @typedef {object} StudentBadgeRepository
 * @property {(studentId: number, badgeId: number) => Promise<StudentBadge|null>} findByStudentAndBadge
 * @property {(studentId: number) => Promise<StudentBadge[]>} listByStudent
 * @property {(row: { studentId: number, badgeId: number, awardedAt: number, metadata: ?object }) => Promise<StudentBadge>} award
 *           - inserts a badge; UNIQUE(student_id, badge_id) makes it idempotent.
 */

/**
 * @typedef {object} CertificateRepository
 * @property {(studentId: number, streamId: number) => Promise<Certificate|null>} findByStudentAndStream
 * @property {(studentId: number) => Promise<Certificate[]>} listByStudent
 * @property {(certificateCode: string) => Promise<Certificate|null>} findByCode
 * @property {(id: number) => Promise<Certificate|null>} findById
 * @property {(row: { studentId: number, streamId: number, title: string, certificateCode: string, earnedAt: number }) => Promise<Certificate>} issue
 *           - inserts a certificate; UNIQUE(student_id, stream_id) makes it
 *             idempotent (re-issue returns the existing row).
 */

export default {
  contracts: true,
}