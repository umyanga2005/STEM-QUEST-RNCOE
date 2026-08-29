/**
 * Student — StudentService (Task 5.1).
 *
 * Server-only orchestration for registration + the lightweight student
 * session (D-005/D-027/D-040). Owns the security boundary:
 *
 *   - Students are normal application records; NEVER Supabase Auth users.
 *   - All writes go through the trusted backend (service role); the browser
 *     never touches Supabase.
 *   - Registration accepts ONLY { initials, name, school, grade }; any other
 *     (privileged) field is rejected, never silently trusted.
 *   - Session tokens are CSPRNG-generated, returned ONCE, and only their
 *     SHA-256 hash is persisted (`student_sessions.token_hash`). Raw tokens
 *     and hashes are never logged.
 *   - /me returns only safe identity fields — no token, no hash, no scores,
 *     no progression, no admin data, no storage internals.
 */

import { validateRegistrationInput } from '../validation.js'
import { generateSessionToken, hashSessionToken, generateLoginCode } from '../security/tokens.js'
import { validateAvatarFile, buildAvatarPath } from '../security/avatar.js'
import { studentError } from '../errors.js'

const DEFAULT_SESSION_TTL_SECONDS = 3600
const LOGIN_CODE_ATTEMPTS = 10

export class StudentService {
  constructor({ schoolRepository, studentRepository, sessionRepository, avatarRepository, settingsRepository = null, now = () => Date.now() }) {
    this.repos = { schoolRepository, studentRepository, sessionRepository, avatarRepository, settingsRepository }
    this.now = now
  }

  /**
   * Registers a student and immediately issues a lightweight session.
   * `body` is the RAW request body — validated as-is so foreign (privileged)
   * fields are rejected before anything is extracted (strict gate). Server-set
   * metadata travels separately so it can never be spoofed via the body.
   * @param {{ body: object, ipAddress?: string, userAgent?: string }} input
   * @returns {Promise<{ token: string, expiresAt: number, loginCode: string, student: object }>}
   */
  async register({ body, ipAddress = null, userAgent = null }) {
    const check = validateRegistrationInput(body)
    if (!check.ok) {
      throw check.unexpected !== undefined
        ? studentError.unexpectedField(check.unexpected)
        : studentError.invalidInput('one or more registration fields are invalid.')
    }
    const { initials, name, school, grade } = check.value

    const schoolRecord = await this.#resolveSchool(school)
    const loginCode = await this.#freshLoginCode()
    const student = await this.repos.studentRepository.create({
      initials,
      fullName: name,
      schoolId: schoolRecord.id,
      grade,
      loginCode,
    })

    const ttlSeconds = await this.#sessionTtlSeconds()
    const now = this.now()
    const token = generateSessionToken()
    await this.repos.sessionRepository.create({
      studentId: student.id,
      tokenHash: hashSessionToken(token),
      expiresAt: now + ttlSeconds * 1000,
      ipAddress,
      userAgent,
    })

    const publicStudent = await this.#toPublicStudent(student, schoolRecord.name, null)
    return {
      token,
      expiresAt: now + ttlSeconds * 1000,
      loginCode,
      student: publicStudent,
    }
  }

  /**
   * Log in an existing student via their Kiosk login code.
   * @param {{ loginCode: string, ipAddress?: string, userAgent?: string }} input
   * @returns {Promise<{ token: string, expiresAt: number, loginCode: string, student: object }>}
   */
  async loginByKioskCode({ loginCode, ipAddress = null, userAgent = null }) {
    if (!loginCode || typeof loginCode !== 'string') {
      throw studentError.invalidInput('A valid kiosk code is required.')
    }
    const cleanCode = loginCode.trim().toUpperCase()
    const withPrefix = cleanCode.startsWith('SQ-') ? cleanCode : `SQ-${cleanCode}`
    const bareCode = cleanCode.replace(/^SQ-/, '')

    let student = await this.repos.studentRepository.findByLoginCode(withPrefix)
    if (!student) {
      student = await this.repos.studentRepository.findByLoginCode(bareCode)
    }
    if (!student || student.status !== 'active') {
      throw studentError.invalidInput('Invalid or expired Kiosk Code.')
    }

    const school = await this.repos.schoolRepository.findById(student.schoolId)
    const ttlSeconds = await this.#sessionTtlSeconds()
    const now = this.now()
    const token = generateSessionToken()
    await this.repos.sessionRepository.create({
      studentId: student.id,
      tokenHash: hashSessionToken(token),
      expiresAt: now + ttlSeconds * 1000,
      ipAddress,
      userAgent,
    })

    const avatarUrl = await this.#avatarUrl(student.profilePhotoPath)
    const publicStudent = await this.#toPublicStudent(student, school?.name ?? 'Unknown school', avatarUrl)
    return {
      token,
      expiresAt: now + ttlSeconds * 1000,
      loginCode: student.loginCode,
      student: publicStudent,
    }
  }

  /**
   * Verifies a session token and returns the safe public student profile.
   * @param {{ token: string }} auth
   * @returns {Promise<{ student: object }>}
   */
  async getMe({ token }) {
    const student = await this.#resolveStudentFromToken(token)
    const school = await this.repos.schoolRepository.findById(student.schoolId)
    const avatarUrl = await this.#avatarUrl(student.profilePhotoPath)
    return { student: await this.#toPublicStudent(student, school?.name ?? 'Unknown school', avatarUrl) }
  }

  /**
   * Uploads an optional profile photo for the authenticated student.
   * @param {{ token: string, file: { size: number, mimeType: string, buffer: Uint8Array } }} args
   * @returns {Promise<{ student: object }>}
   */
  async uploadAvatar({ token, file }) {
    const student = await this.#resolveStudentFromToken(token)
    if (!file || !file.buffer) throw studentError.avatarInvalid('no image data')
    const checked = validateAvatarFile({ size: file.size ?? file.buffer.length, mimeType: file.mimeType })
    if (!checked.ok) {
      throw checked.code === 'TOO_LARGE' ? studentError.avatarTooLarge() : studentError.avatarInvalid(checked.reason)
    }
    const path = buildAvatarPath(student.id, checked.extension)
    let storedPath
    try {
      storedPath = await this.repos.avatarRepository.upload({
        studentId: student.id,
        buffer: file.buffer,
        mimeType: checked.mimeType,
      })
    } catch (err) {
      console?.error?.(err)
      throw studentError.avatarStorageFailed()
    }
    if (storedPath !== path) {
      throw studentError.avatarStorageFailed()
    }
    const updated = await this.repos.studentRepository.setProfilePhotoPath(student.id, path)
    const school = await this.repos.schoolRepository.findById(updated.schoolId)
    const avatarUrl = await this.#avatarUrl(updated.profilePhotoPath)
    return { student: await this.#toPublicStudent(updated, school?.name ?? 'Unknown school', avatarUrl) }
  }

  /**
   * Updates the student's editable profile fields (initials, name, school,
   * grade). `body` is the RAW request body — validated by the same strict
   * registration gate, so foreign (privileged) fields are rejected before
   * anything is extracted. Identity is always derived from the session token;
   * the client can never choose which student is updated.
   * @param {{ token: string, body: object }} args
   * @returns {Promise<{ student: object }>}
   */
  async updateProfile({ token, body }) {
    const student = await this.#resolveStudentFromToken(token)
    const check = validateRegistrationInput(body)
    if (!check.ok) {
      throw check.unexpected !== undefined
        ? studentError.unexpectedField(check.unexpected)
        : studentError.invalidInput('one or more profile fields are invalid.')
    }
    const { initials, name, school, grade } = check.value

    const schoolRecord = await this.#resolveSchool(school)
    const updated = await this.repos.studentRepository.updateProfile(student.id, {
      initials,
      fullName: name,
      schoolId: schoolRecord.id,
      grade,
    })
    if (!updated) throw studentError.notFound()

    const avatarUrl = await this.#avatarUrl(updated.profilePhotoPath)
    return { student: await this.#toPublicStudent(updated, schoolRecord.name, avatarUrl) }
  }

  // -------------------------------------------------------------------------

  async #resolveSchool(name) {
    const existing = await this.repos.schoolRepository.findByName(name)
    if (existing) return existing
    return this.repos.schoolRepository.create({ name })
  }

  async #freshLoginCode() {
    for (let i = 0; i < LOGIN_CODE_ATTEMPTS; i += 1) {
      const code = generateLoginCode()
      const existing = await this.repos.studentRepository.findByLoginCode(code)
      if (!existing) return code
    }
    throw studentError.internal('could not allocate a unique login code')
  }

  async #sessionTtlSeconds() {
    if (!this.repos.settingsRepository?.getSessionTtlSeconds) return DEFAULT_SESSION_TTL_SECONDS
    try {
      return await this.repos.settingsRepository.getSessionTtlSeconds()
    } catch {
      return DEFAULT_SESSION_TTL_SECONDS
    }
  }

  async #resolveStudentFromToken(token) {
    if (!token || typeof token !== 'string' || token.length === 0) {
      throw studentError.unauthorized()
    }
    const session = await this.repos.sessionRepository.findByTokenHash(hashSessionToken(token))
    if (!session) throw studentError.invalidToken()
    if (session.revokedAt) throw studentError.tokenRevoked()
    if (session.expiresAt !== null && session.expiresAt < this.now()) throw studentError.tokenExpired()
    const student = await this.repos.studentRepository.findById(session.studentId)
    if (!student) throw studentError.notFound()
    if (student.status !== 'active') throw studentError.disabled()
    return student
  }

  async #avatarUrl(profilePhotoPath) {
    if (!profilePhotoPath || !this.repos.avatarRepository?.signedUrl) return null
    try {
      return await this.repos.avatarRepository.signedUrl(profilePhotoPath)
    } catch {
      return null
    }
  }

  async #toPublicStudent(student, schoolName, avatarUrl) {
    return {
      id: student.id,
      initials: student.initials,
      name: student.fullName,
      school: schoolName,
      grade: student.grade,
      avatarUrl: avatarUrl ?? null,
    }
  }
}

export default {
  StudentService,
  DEFAULT_SESSION_TTL_SECONDS,
}