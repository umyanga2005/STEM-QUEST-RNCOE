/**
 * Student — repository contracts (Task 5.1).
 *
 * Domain-shape definitions and interface documentation only — no runtime
 * logic. In-memory and Supabase implementations both map to/from these
 * objects. Mirrors the 0001 migration columns for `schools`, `students` and
 * `student_sessions` exactly (no new tables, no schema changes).
 */

/**
 * @typedef {object} Student
 * @property {number} id
 * @property {string} initials - 1..5 chars (DB CHECK)
 * @property {string} fullName - NOT NULL
 * @property {number} schoolId - FK schools.id (ON DELETE RESTRICT)
 * @property {number} grade - 6..11 (DB CHECK)
 * @property {string} loginCode - UNIQUE kiosk code, generated server-side
 * @property {?string} profilePhotoPath - storage path only, never binary
 * @property {'active'|'disabled'} status
 * @property {boolean} isArchived
 */

/**
 * @typedef {object} School
 * @property {number} id
 * @property {string} name
 * @property {?string} city
 * @property {boolean} isActive
 */

/**
 * @typedef {object} StudentSession
 * @property {number} id
 * @property {number} studentId
 * @property {string} tokenHash - SHA-256 of the opaque token, NEVER plaintext
 * @property {?string} ipAddress
 * @property {?string} userAgent
 * @property {number} expiresAt - epoch ms
 * @property {?number} revokedAt - epoch ms
 */

/**
 * @typedef {object} SchoolRepository
 * @property {(name: string) => Promise<School|null>} findByName
 *           - case-insensitive active-school lookup by trimmed name.
 * @property {(id: number) => Promise<School|null>} findById
 * @property {(row: { name: string }) => Promise<School>} create
 */

/**
 * @typedef {object} StudentRepository
 * @property {(id: number) => Promise<Student|null>} findById
 * @property {(loginCode: string) => Promise<Student|null>} findByLoginCode
 * @property {(row: object) => Promise<Student>} create
 *           - row = { initials, fullName, schoolId, grade, loginCode }
 *             (server-controlled columns only; never client fields).
 * @property {(id: number, profilePhotoPath: string|null) => Promise<Student|null>} setProfilePhotoPath
 */

/**
 * @typedef {object} StudentSessionRepository
 * @property {(row: object) => Promise<StudentSession>} create
 *           - row = { studentId, tokenHash, expiresAt, ipAddress, userAgent }
 * @property {(tokenHash: string) => Promise<StudentSession|null>} findByTokenHash
 */

/**
 * @typedef {object} StudentAvatarRepository
 * @property {(args: { studentId: number, buffer: Uint8Array, mimeType: string }) => Promise<string>} upload
 *           - stores `{studentId}/profile.{ext}` in the private
 *             `student-avatars` bucket via the trusted backend; returns the
 *             storage path. Never accepts a user-supplied filename.
 * @property {(path: string) => Promise<string|null>} signedUrl
 *           - short-lived signed read URL for a stored avatar (or null).
 */

export default {
  contracts: true,
}