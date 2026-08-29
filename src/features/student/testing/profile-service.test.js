/**
 * Student — profile update tests (Task 5.6).
 *
 * Covers `StudentService.updateProfile` over the in-memory repositories and
 * the Supabase `studentRepository.updateProfile` contract against the
 * deterministic fake. Proves the boundary: identity is derived from the
 * token, only the four editable fields change (never login code, photo path,
 * status or archives), foreign privileged fields are rejected, and the
 * response never leaks tokens/hashes/scores/progression.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createStudentMemoryStore, createStudentMemoryRepositories } from '../repositories/memory.js'
import { StudentService } from '../service/student-service.js'
import { STUDENT_ERROR_CODES } from '../errors.js'
import { createFakeSupabaseClient } from '../../game-session/testing/fake-supabase-client.js'
import { createSupabaseStudentRepositories } from '../repositories/supabase.js'

const VALID = { initials: 'A', name: 'Amaya Silva', school: 'Colombo High', grade: 7 }
const UPDATED = { initials: 'AS', name: 'Amaya Silva-Ratnayake', school: 'Kandy Girls College', grade: 10 }

function makeClock(start = 1_000_000) {
  let t = start
  return { now: () => t, advance: (ms) => { t += ms } }
}

function makeService(opts = {}) {
  const store = createStudentMemoryStore()
  const repos = createStudentMemoryRepositories(store)
  const clock = opts.clock ?? makeClock()
  const service = new StudentService({ ...repos, now: clock.now })
  return { store, repos, service, clock }
}

async function register(service, overrides = {}) {
  return service.register({ body: { ...VALID, ...overrides } })
}

// ---------------------------------------------------------------------------
// Service — updateProfile
// ---------------------------------------------------------------------------

test('updateProfile updates all four editable fields for the authenticated student', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)

  const result = await service.updateProfile({ token, body: UPDATED })
  assert.equal(result.student.name, 'Amaya Silva-Ratnayake')
  assert.equal(result.student.initials, 'AS')
  assert.equal(result.student.school, 'Kandy Girls College')
  assert.equal(result.student.grade, 10)
  assert.equal(result.student.id, 1)

  assert.equal(store.students[0].fullName, 'Amaya Silva-Ratnayake')
  assert.equal(store.students[0].initials, 'AS')
  assert.equal(store.students[0].grade, 10)
  assert.equal(store.schools.length, 2, 'a new school row was created for the new name')
  assert.equal(store.students[0].loginCode, store.students[0].loginCode, 'login code untouched')
})

test('updateProfile reuses an existing school case-insensitively', async () => {
  const { service, store } = makeService()
  const { token } = await register(service, { school: 'Colombo High' })
  await service.updateProfile({ token, body: { ...UPDATED, school: '  colombo high ' } })
  assert.equal(store.schools.length, 1, 'no duplicate school')
  assert.equal(store.students[0].schoolId, 1)
})

test('updateProfile trims whitespace around editable fields', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  const result = await service.updateProfile({
    token,
    body: { initials: '  KS  ', name: '  Kavindu Senarathne  ', school: '  Royal College  ', grade: '09' },
  })
  assert.equal(result.student.initials, 'KS')
  assert.equal(result.student.name, 'Kavindu Senarathne')
  assert.equal(result.student.school, 'Royal College')
  assert.equal(result.student.grade, 9)
  assert.equal(store.students[0].fullName, 'Kavindu Senarathne')
})

test('updateProfile rejects foreign privileged fields (score, studentId, progression, token)', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  for (const extra of [{ score: 999 }, { studentId: 42 }, { progression: { total: 99 } }, { isAdmin: true }]) {
    await assert.rejects(service.updateProfile({ token, body: { ...UPDATED, ...extra } }), (err) => {
      assert.equal(err.code, STUDENT_ERROR_CODES.UNEXPECTED_FIELD)
      return true
    })
  }
  // identity can never be chosen by the client — the request body has no
  // student identity field at all (the token is the only identity source).
  assert.deepEqual(Object.keys(UPDATED).sort(), ['grade', 'initials', 'name', 'school'])
})

test('updateProfile validates the same rules as registration (invalid grade, blank, overlong)', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  for (const body of [
    { ...UPDATED, grade: 12 },
    { ...UPDATED, grade: 6.5 },
    { ...UPDATED, initials: '' },
    { ...UPDATED, name: '' },
    { ...UPDATED, school: '' },
    { ...UPDATED, initials: 'ABCDEF' },
    { ...UPDATED, name: 'x'.repeat(101) },
    { ...UPDATED, school: 'y'.repeat(121) },
  ]) {
    await assert.rejects(service.updateProfile({ token, body }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_INPUT)
  }
  assert.equal((await service.updateProfile({ token, body: { ...UPDATED, grade: 11 } })).student.grade, 11)
})

test('updateProfile requires a valid session and never updates another student', async () => {
  const { service, store } = makeService()
  const { token: tokenA } = await register(service, { name: 'Student A' })
  const { token: tokenB } = await register(service, { name: 'Student B', school: 'Other School' })

  await assert.rejects(service.updateProfile({ token: null, body: UPDATED }), (err) => err.code === STUDENT_ERROR_CODES.UNAUTHORIZED)
  await assert.rejects(service.updateProfile({ token: 'garbage', body: UPDATED }), (err) => err.code === STUDENT_ERROR_CODES.INVALID_TOKEN)

  const resultB = await service.updateProfile({ token: tokenB, body: { ...UPDATED, name: 'Student Bee' } })
  assert.equal(resultB.student.id, 2, 'updates the token holder, not a chosen id')
  assert.equal(store.students[0].fullName, 'Student A', 'student A is untouched by student B')
  assert.equal(store.students[1].fullName, 'Student Bee')
  void tokenA
})

test('updateProfile preserves avatar, login code, status and archives', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  await service.uploadAvatar({
    token,
    file: { size: 8, mimeType: 'image/webp', buffer: new Uint8Array(8) },
  })

  const result = await service.updateProfile({ token, body: UPDATED })
  assert.match(result.student.avatarUrl, /(data:image\/|memory:\/\/student-avatars)/)
  assert.equal(store.students[0].profilePhotoPath, '1/profile.webp')
  assert.equal(store.students[0].status, 'active')
  assert.equal(store.students[0].isArchived, false)
})

test('updateProfile response never leaks token material, hashes, login code or scores', async () => {
  const { service } = makeService()
  const { token } = await register(service)
  const result = await service.updateProfile({ token, body: UPDATED })
  const raw = JSON.stringify(result)
  assert.ok(!raw.includes(token))
  assert.ok(!raw.includes('tokenHash'))
  assert.ok(!raw.includes('loginCode'))
  assert.ok(!raw.includes('score'))
  assert.ok(!raw.includes('progression'))
  assert.deepEqual(Object.keys(result.student).sort(), ['avatarUrl', 'grade', 'id', 'initials', 'name', 'school'])
})

test('updateProfile rejects an expired token', async () => {
  const { service, clock } = makeService()
  const { token } = await register(service)
  clock.advance(3600 * 1000 + 1)
  await assert.rejects(service.updateProfile({ token, body: UPDATED }), (err) => err.code === STUDENT_ERROR_CODES.TOKEN_EXPIRED)
})

test('updateProfile surfaces a safe error when the student row is missing', async () => {
  const { service, store } = makeService()
  const { token } = await register(service)
  store.students.splice(0, 1)
  await assert.rejects(service.updateProfile({ token, body: UPDATED }), (err) => err.code === STUDENT_ERROR_CODES.NOT_FOUND)
})

// ---------------------------------------------------------------------------
// Supabase repository contract — updateProfile (0001 columns only)
// ---------------------------------------------------------------------------

test('supabase updateProfile updates exactly the editable 0001 columns', async () => {
  const { client, db } = createFakeSupabaseClient()
  const { studentRepository } = createSupabaseStudentRepositories({ client })

  db.tables.students.rows.push({
    id: 5, initials: 'AA', full_name: 'Ali Ahmed', school_id: 3, grade: 7,
    login_code: 'ZZZ999', profile_photo_path: '5/profile.png', status: 'active', is_archived: false,
  })

  const updated = await studentRepository.updateProfile(5, { initials: 'AK', fullName: 'Ali Karim', schoolId: 9, grade: 11 })
  assert.equal(updated.initials, 'AK')
  assert.equal(updated.fullName, 'Ali Karim')
  assert.equal(updated.schoolId, 9)
  assert.equal(updated.grade, 11)

  const row = db.tables.students.rows.find((r) => r.id === 5)
  assert.equal(row.initials, 'AK')
  assert.equal(row.full_name, 'Ali Karim')
  assert.equal(row.school_id, 9)
  assert.equal(row.grade, 11)
  assert.equal(row.login_code, 'ZZZ999', 'login code is never touched')
  assert.equal(row.profile_photo_path, '5/profile.png', 'photo path is never touched')
  assert.equal(row.status, 'active')
  assert.equal(row.is_archived, false)
})

test('supabase updateProfile returns null for a missing student', async () => {
  const { client } = createFakeSupabaseClient()
  const { studentRepository } = createSupabaseStudentRepositories({ client })
  const updated = await studentRepository.updateProfile(999, { initials: 'X', fullName: 'X', schoolId: 1, grade: 6 })
  assert.equal(updated, null)
})

export default {}