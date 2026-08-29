/**
 * Student — StudentService tests (Task 5.1).
 *
 * Covers the authoritative registration + lightweight session + optional
 * avatar pipeline over in-memory repositories (no Supabase). Proves the
 * security boundary: privileged/foreign fields are rejected, tokens are
 * CSPRNG + hashed at rest, raw tokens/hashes never appear in responses or
 * storage, only safe identity fields leave /me, and avatars are MIME/size
 * gated and path-ownership safe.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

import {
  createStudentMemoryStore,
  createStudentMemoryRepositories,
} from '../repositories/memory.js'
import { StudentService } from '../service/student-service.js'
import { STUDENT_ERROR_CODES } from '../errors.js'
import { hashSessionToken } from '../security/tokens.js'
import { AVATAR_MAX_BYTES } from '../security/avatar.js'

const LOGIN_CODE_ALPHABET = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')

/** Movable clock so session expiry is controllable (time authority). */
function makeClock(start = 1_000_000) {
  let t = start
  return {
    now: () => t,
    advance: (ms) => {
      t += ms
    },
  }
}

function makeService(opts = {}) {
  const store = createStudentMemoryStore()
  const repos = createStudentMemoryRepositories(store)
  const clock = opts.clock ?? makeClock()
  const service = new StudentService({ ...repos, now: clock.now })
  return { store, repos, service, clock }
}

const VALID = { initials: 'A', name: 'Amaya Silva', school: 'Colombo High', grade: 7 }

async function register(service, bodyOverrides = {}, opts = {}) {
  const body = { ...VALID, ...bodyOverrides }
  const result = await service.register({
    body,
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
  })
  return result
}

function firstSession(store) {
  return store.sessions[store.sessions.length - 1]
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

test('registers a student, returns an opaque token once, and issues a session', async () => {
  const { store, service, clock } = makeService()
  const result = await register(service)

  assert.equal(typeof result.token, 'string')
  assert.ok(result.token.length >= 32, 'token must have ample entropy length')
  assert.equal(result.loginCode.length, 9)
  const bareCode = result.loginCode.replace(/^SQ-/, '')
  assert.ok([...bareCode].every((ch) => LOGIN_CODE_ALPHABET.has(ch)), 'login code alphabet')
  assert.equal(result.expiresAt, clock.now() + 3600 * 1000, 'default TTL 3600s')
  assert.equal(result.student.name, 'Amaya Silva')
  assert.equal(result.student.school, 'Colombo High')
  assert.equal(result.student.grade, 7)
  assert.equal(result.student.initials, 'A')
  assert.equal(result.student.id, 1)

  assert.equal(store.schools.length, 1)
  assert.equal(store.students.length, 1)
  assert.equal(store.sessions.length, 1)

  const session = firstSession(store)
  assert.equal(session.studentId, 1)
  assert.notEqual(session.tokenHash, result.token, 'hash stored, never plaintext')
  assert.equal(session.tokenHash, sha256(result.token))
  assert.equal(session.expiresAt, clock.now() + 3600 * 1000)
})

test('reads the session TTL from game_settings when present', async () => {
  const { store, service, clock } = makeService()
  store.settings.push({ key: 'auth.session_ttl_seconds', value: 120 })
  const result = await register(service)
  assert.equal(result.expiresAt, clock.now() + 120 * 1000)
})

test('falls back to 3600s TTL when settings repo is absent', async () => {
  const clock = makeClock()
  const service = new StudentService({
    schoolRepository: { findByName: async () => null, create: async (r) => ({ id: 99, name: r.name, city: null, isActive: true }) },
    studentRepository: {
      create: async (r) => ({ id: 1, ...r, profilePhotoPath: null, status: 'active', isArchived: false }),
      findByLoginCode: async () => null,
    },
    sessionRepository: { create: async (r) => r },
    avatarRepository: { upload: async () => '1/profile.jpg', signedUrl: async () => null },
    now: clock.now,
  })
  const result = await service.register({ body: VALID })
  assert.equal(result.expiresAt, clock.now() + 3600 * 1000)
})

test('supports Unicode names and schools (Sri Lankan names are not ASCII)', async () => {
  const { service } = makeService()
  const result = await register(service, {
    initials: 'KS',
    name: 'කාවිංද සේනාරත්න',
    school: 'මහනුවර විද්‍යා විද්‍යාලය',
    grade: 10,
  })
  assert.equal(result.student.name, 'කාවිංද සේනාරත්න')
  assert.equal(result.student.school, 'මහනුවර විද්‍යා විද්‍යාලය')
  assert.equal(result.student.grade, 10)
})

test('trims whitespace around names/schools before storing', async () => {
  const { service } = makeService()
  const result = await register(service, { name: '  Amaya Silva  ', school: '  Colombo High  ', initials: '  A  ' })
  assert.equal(result.student.name, 'Amaya Silva')
  assert.equal(result.student.school, 'Colombo High')
  assert.equal(result.student.initials, 'A')
})

test('rejects an unexpected (privileged) registration field — never silently trusts', async () => {
  const { service } = makeService()
  await assert.rejects(register(service, { isAdmin: true }), (err) => {
    assert.equal(err.code, STUDENT_ERROR_CODES.UNEXPECTED_FIELD)
    return true
  })
  await assert.rejects(register(service, { scores: { math: 100 } }), (err) => err.code === STUDENT_ERROR_CODES.UNEXPECTED_FIELD)
  await assert.rejects(register(service, { token: 'forged' }), (err) => err.code === STUDENT_ERROR_CODES.UNEXPECTED_FIELD)
  await assert.rejects(register(service, { progression: 99 }), (err) => err.code === STUDENT_ERROR_CODES.UNEXPECTED_FIELD)
})

test('rejects invalid grades: 5, 12, decimal, text, missing', async () => {
  const { service } = makeService()
  for (const grade of [5, 12, 6.5, 'abc', '', null, undefined]) {
    await assert.rejects(register(service, { grade }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  }
  assert.equal((await register(service, { grade: 6 })).student.grade, 6)
  assert.equal((await register(service, { grade: 11 })).student.grade, 11)
  assert.equal((await register(service, { grade: '07' })).student.grade, 7, 'integer numeric string accepted')
})

test('rejects missing/short/overlong initials and overlong names/schools', async () => {
  const { service } = makeService()
  await assert.rejects(register(service, { initials: '' }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  await assert.rejects(register(service, { initials: 'ABCDEF' }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  await assert.rejects(register(service, { name: '' }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  await assert.rejects(register(service, { school: '' }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  await assert.rejects(register(service, { name: 'x'.repeat(101) }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  await assert.rejects(register(service, { school: 'y'.repeat(121) }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  assert.equal((await register(service, { initials: 'ABCDE' })).student.initials, 'ABCDE')
})

test('resolves an existing school case-insensitively instead of duplicating', async () => {
  const { service, store } = makeService()
  const first = await register(service, { school: 'Colombo High' })
  const second = await register(service, { school: '  colombo high ' })
  assert.equal(store.schools.length, 1)
  assert.equal(first.student.school, second.student.school)
  assert.equal(store.students.length, 2, 'two students share one school')
})

test('allows multiple students with the same name in one school (no dedup by schema)', async () => {
  const { service, store } = makeService()
  await register(service, { name: 'Amaya Silva', school: 'Colombo High' })
  await register(service, { name: 'Amaya Silva', school: 'Colombo High' })
  assert.equal(store.students.length, 2)
  assert.equal(store.schools.length, 1)
})

test('login codes are unique within a store', async () => {
  const { service, store } = makeService()
  const seen = new Set()
  for (let i = 0; i < 20; i += 1) {
    const result = await register(service, { initials: `S${i}`, name: `Student ${i}`, school: 'Any School' })
    assert.ok(!seen.has(result.loginCode), 'login code must be unique')
    seen.add(result.loginCode)
  }
  assert.equal(store.sessions.length, 20)
})

test('registration records ip address and user agent on the session', async () => {
  const { store, service } = makeService()
  await register(service, {}, { ipAddress: '203.0.113.9', userAgent: 'pytest/1.0' })
  const session = firstSession(store)
  assert.equal(session.ipAddress, '203.0.113.9')
  assert.equal(session.userAgent, 'pytest/1.0')
})

// ---------------------------------------------------------------------------
// Session verification (/me)
// ---------------------------------------------------------------------------

test('/me returns only safe identity fields for a valid token', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  const me = await service.getMe({ token })
  assert.deepEqual(Object.keys(me.student).sort(), ['avatarUrl', 'grade', 'id', 'initials', 'name', 'school'])
  assert.equal(me.student.name, 'Amaya Silva')
  assert.equal(me.student.initials, 'A')
  assert.equal(me.student.grade, 7)
  assert.equal(me.student.school, 'Colombo High')
  assert.equal(me.student.avatarUrl, null)
})

test('/me response never contains token material, hashes, or privileged data', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  const raw = JSON.stringify(await service.getMe({ token }))
  assert.ok(!raw.includes(token), 'raw token must not leak')
  assert.ok(!raw.includes('tokenHash'), 'token hash must not leak')
  assert.ok(!raw.includes('loginCode'), 'login code must not leak from /me')
  assert.ok(!raw.includes('isAdmin') && !raw.includes('scores') && !raw.includes('progression'))
})

test('rejects a missing token', async () => {
  const { service } = makeService()
  await register(service)
  await assert.rejects(service.getMe({ token: null }), (err) => err.code === STUDENT_ERROR_CODES.UNAUTHORIZED)
  await assert.rejects(service.getMe({ token: '' }), (err) => err.code === STUDENT_ERROR_CODES.UNAUTHORIZED)
})

test('rejects an unknown/garbage token', async () => {
  const { service } = makeService()
  await register(service)
  await assert.rejects(service.getMe({ token: 'garbage-not-a-real-token' }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_TOKEN)
})

test('rejects an expired session token', async () => {
  const { service, clock } = makeService()
  const { token } = await register(service)
  clock.advance(3600 * 1000 + 1)
  await assert.rejects(service.getMe({ token }), (err) => err.code === STUDENT_ERROR_CODES.TOKEN_EXPIRED)
})

test('rejects a revoked session token', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  store.sessions[0].revokedAt = Date.now()
  await assert.rejects(service.getMe({ token }), (err) => err.code === STUDENT_ERROR_CODES.TOKEN_REVOKED)
})

test('rejects a token for a missing student', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  store.students.splice(0, 1)
  await assert.rejects(service.getMe({ token }), (err) => err.code === STUDENT_ERROR_CODES.NOT_FOUND)
})

test('rejects a disabled student', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  store.students[0].status = 'disabled'
  await assert.rejects(service.getMe({ token }), (err) => err.code === STUDENT_ERROR_CODES.DISABLED)
})

test('raw tokens and hashes are never logged through the service', async () => {
  const logs = []
  const originalError = console?.error
  const originalLog = console?.log
  try {
    console.error = (...args) => logs.push(args)
    console.log = (...args) => logs.push(args)
    const { service } = makeService()
    const { token } = await register(service)
    await service.getMe({ token })
    await assert.rejects(service.getMe({ token: 'bogus-token' }), () => true)
    const joined = logs.join(' ')
    assert.ok(!joined.includes(token), 'raw token must never reach logs')
    assert.ok(!joined.includes(sha256(token)), 'token hash must never reach logs')
  } finally {
    console.error = originalError
    console.log = originalLog
  }
})

// ---------------------------------------------------------------------------
// Avatar (optional profile photo)
// ---------------------------------------------------------------------------

function fakeFile({ mimeType, bytes = 10 }) {
  return { size: bytes, mimeType, buffer: new Uint8Array(bytes) }
}

test('uploads a valid JPEG/PNG/WebP avatar and returns a signed URL', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  for (const [mimeType, ext] of [
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ]) {
    const result = await service.uploadAvatar({ token, file: fakeFile({ mimeType }) })
    assert.ok(result.student.avatarUrl)
    assert.ok(store.avatars[`1/profile.${ext}`], `avatar stored at expected path 1/profile.${ext}`)
    assert.ok(store.students[0].profilePhotoPath === `1/profile.${ext}`)
  }
})

test('rejects non-image MIME types (SVG, executables, octet-stream)', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  for (const mimeType of ['image/svg+xml', 'application/x-executable', 'application/octet-stream', 'text/html']) {
    await assert.rejects(service.uploadAvatar({ token, file: fakeFile({ mimeType }) }), (err) => err.code === STUDENT_ERROR_CODES.AVATAR_INVALID)
  }
})

test('rejects avatars larger than 200 KB', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  await assert.rejects(
    service.uploadAvatar({ token, file: fakeFile({ mimeType: 'image/jpeg', bytes: AVATAR_MAX_BYTES + 1 }) }),
    (err) => err.code === STUDENT_ERROR_CODES.AVATAR_TOO_LARGE
  )
  assert.equal(AVATAR_MAX_BYTES, 204800, 'bucket limit parity (200 KB)')
})

test('accepts an avatar exactly at the 200 KB limit', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  const result = await service.uploadAvatar({ token, file: fakeFile({ mimeType: 'image/png', bytes: AVATAR_MAX_BYTES }) })
  assert.ok(result.student.avatarUrl)
})

test('rejects empty uploads and uploads with no file data', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  await assert.rejects(service.uploadAvatar({ token, file: fakeFile({ mimeType: 'image/jpeg', bytes: 0 }) }), (err) => err.code === STUDENT_ERROR_CODES.AVATAR_INVALID)
  await assert.rejects(service.uploadAvatar({ token, file: null }), (err) => err.code === STUDENT_ERROR_CODES.AVATAR_INVALID)
})

test('requires a valid session for avatar upload', async () => {
  const { service } = makeService()
  await register(service)
  await assert.rejects(service.uploadAvatar({ token: null, file: fakeFile({ mimeType: 'image/jpeg' }) }), (err) => err.code === STUDENT_ERROR_CODES.UNAUTHORIZED)
  await assert.rejects(service.uploadAvatar({ token: 'nope', file: fakeFile({ mimeType: 'image/jpeg' }) }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_TOKEN)
})

test('avatar paths are built from the numeric student id, never user input', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  await service.uploadAvatar({ token, file: fakeFile({ mimeType: 'image/jpeg' }) })
  const stored = Object.keys(store.avatars)
  assert.equal(stored.length, 1)
  assert.match(stored[0], /^1\/profile\.jpg$/, 'path derives from numeric id + MIME extension')
})

test('a storage failure surfaces as a safe internal error, never raw internals', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  service.repos.avatarRepository.upload = async () => {
    throw new Error('bucket down')
  }
  await assert.rejects(service.uploadAvatar({ token, file: fakeFile({ mimeType: 'image/jpeg' }) }), (err) => {
    assert.equal(err.code, STUDENT_ERROR_CODES.AVATAR_STORAGE_FAILED)
    assert.equal(err.toPublic().message, 'An unexpected problem occurred. Please try again.')
    return true
  })
})

test('rejects a mismatched stored path (defence in depth)', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  service.repos.avatarRepository.upload = async () => 'someone-else/profile.jpg'
  await assert.rejects(service.uploadAvatar({ token, file: fakeFile({ mimeType: 'image/jpeg' }) }), (err) => err.code === STUDENT_ERROR_CODES.AVATAR_STORAGE_FAILED)
})

test('avatarUrl stays null when no photo exists and /me reflects stored photo', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  assert.equal((await service.getMe({ token })).student.avatarUrl, null)
  await service.uploadAvatar({ token, file: fakeFile({ mimeType: 'image/webp' }) })
  const me = await service.getMe({ token })
  assert.match(me.student.avatarUrl, /^data:image\/webp;base64,/)
})

test('hashSessionToken is deterministic SHA-256', () => {
  assert.equal(hashSessionToken('abc'), sha256('abc'))
  assert.equal(hashSessionToken('abc'), hashSessionToken('abc'))
  assert.notEqual(hashSessionToken('abc'), hashSessionToken('abd'))
})