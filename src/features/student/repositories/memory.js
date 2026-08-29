/**
 * Student — in-memory repositories (Task 5.1).
 *
 * Plain-object stores + repository implementations used by unit/integration
 * tests and the local demo API. They match the repository contracts in
 * `contracts.js`. No Supabase dependency — tests never touch the live
 * project.
 */

/**
 * @typedef {object} StudentMemoryStore
 * @property {object[]} schools
 * @property {object[]} students
 * @property {object[]} sessions
 * @property {Record<string, { buffer: Uint8Array, mimeType: string }>} avatars
 */

export function createStudentMemoryStore() {
  return {
    schools: [],
    students: [],
    sessions: [],
    avatars: {},
    settings: [],
  }
}

class MemorySchoolRepository {
  constructor(store) {
    this.store = store
  }

  async findByName(name) {
    const wanted = name.trim().toLowerCase()
    return (
      this.store.schools.find(
        (s) => s.isActive !== false && s.name.trim().toLowerCase() === wanted
      ) ?? null
    )
  }

  async findById(id) {
    return this.store.schools.find((s) => s.id === id) ?? null
  }

  async create({ name }) {
    const school = {
      id: this.store.schools.length + 1,
      name: name.trim(),
      city: null,
      isActive: true,
    }
    this.store.schools.push(school)
    return school
  }
}

class MemoryStudentRepository {
  constructor(store) {
    this.store = store
  }

  async findById(id) {
    return this.store.students.find((s) => s.id === id) ?? null
  }

  async findByLoginCode(loginCode) {
    const wanted = loginCode.trim().toUpperCase()
    return (
      this.store.students.find(
        (s) => s.loginCode && s.loginCode.trim().toUpperCase() === wanted
      ) ?? null
    )
  }

  async create(row) {
    const student = {
      id: this.store.students.length + 1,
      initials: row.initials,
      fullName: row.fullName,
      schoolId: row.schoolId,
      grade: row.grade,
      loginCode: row.loginCode,
      profilePhotoPath: null,
      status: 'active',
      isArchived: false,
    }
    this.store.students.push(student)
    return student
  }

  async setProfilePhotoPath(id, profilePhotoPath) {
    const student = this.store.students.find((s) => s.id === id)
    if (student) student.profilePhotoPath = profilePhotoPath
    return student ?? null
  }

  async updateProfile(id, patch) {
    const student = this.store.students.find((s) => s.id === id)
    if (!student) return null
    if (patch.initials !== undefined) student.initials = patch.initials
    if (patch.fullName !== undefined) student.fullName = patch.fullName
    if (patch.schoolId !== undefined) student.schoolId = patch.schoolId
    if (patch.grade !== undefined) student.grade = patch.grade
    return student
  }
}

class MemoryStudentSessionRepository {
  constructor(store) {
    this.store = store
  }

  async create(row) {
    const session = {
      id: this.store.sessions.length + 1,
      studentId: row.studentId,
      tokenHash: row.tokenHash,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      createdAt: row.createdAt ?? Date.now(),
      expiresAt: row.expiresAt,
      revokedAt: null,
    }
    this.store.sessions.push(session)
    return session
  }

  async findByTokenHash(tokenHash) {
    return this.store.sessions.find((s) => s.tokenHash === tokenHash) ?? null
  }
}

class MemoryStudentAvatarRepository {
  constructor(store) {
    this.store = store
  }

  async upload({ studentId, buffer, mimeType }) {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
    const path = `${studentId}/profile.${ext}`
    this.store.avatars[path] = { buffer, mimeType }
    return path
  }

  async signedUrl(path) {
    const item = this.store.avatars[path]
    if (!item) return null
    let base64 = ''
    if (typeof Buffer !== 'undefined' && Buffer.from) {
      base64 = Buffer.from(item.buffer).toString('base64')
    } else {
      let binary = ''
      const bytes = new Uint8Array(item.buffer)
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      base64 = btoa(binary)
    }
    return `data:${item.mimeType || 'image/jpeg'};base64,${base64}`
  }
}

/** Reads the session TTL from game_settings (`auth.session_ttl_seconds`). */
class MemoryStudentSettingsRepository {
  constructor(store) {
    this.store = store
  }

  async getSessionTtlSeconds() {
    const row = this.store.settings?.find((s) => s.key === 'auth.session_ttl_seconds')
    if (!row) return 3600
    const n = typeof row.value === 'number' ? row.value : Number(row.value)
    return Number.isFinite(n) && n > 0 ? n : 3600
  }
}

/** Builds all in-memory student repositories over one store. */
export function createStudentMemoryRepositories(store = createStudentMemoryStore()) {
  return {
    store,
    schoolRepository: new MemorySchoolRepository(store),
    studentRepository: new MemoryStudentRepository(store),
    sessionRepository: new MemoryStudentSessionRepository(store),
    avatarRepository: new MemoryStudentAvatarRepository(store),
    settingsRepository: new MemoryStudentSettingsRepository(store),
  }
}

export default {
  createStudentMemoryStore,
  createStudentMemoryRepositories,
}