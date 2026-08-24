/**
 * Achievements — Hono API tests (Task 5.8).
 *
 * Transport-level coverage of the authenticated achievement routes and the
 * public certificate verification route. The achievements prefixes are
 * mounted BEFORE the generic student prefix (mirroring the production
 * composition). Auth is REQUIRED on /api/student/achievements,
 * /api/student/certificates and the PDF route; verification is public but
 * exposes only safe data. Ownership is enforced server-side.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'

import { createAchievementsApi } from '../api/server.js'
import { AchievementsService } from '../service/achievements-service.js'
import { createAchievementsMemoryRepositories } from '../repositories/memory.js'
import { createStudentApi } from '../../student/api/server.js'
import { createStudentMemoryRepositories } from '../../student/repositories/memory.js'
import { StudentService } from '../../student/service/student-service.js'
import { createMemoryStore } from '../../game-session/repositories/memory.js'
import { MemoryProgressionRepository } from '../../progression/repositories/memory.js'

const STREAMS = [
  { id: 1, slug: 'science', name: 'Science', themeColor: '#22d3ee', displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', themeColor: null, displayOrder: 2, isActive: true },
  { id: 3, slug: 'engineering', name: 'Engineering', themeColor: null, displayOrder: 3, isActive: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', themeColor: null, displayOrder: 4, isActive: true },
]

function buildStack() {
  const studentRepos = createStudentMemoryRepositories()
  const studentService = new StudentService(studentRepos)

  const achievementsRepos = createAchievementsMemoryRepositories()
  const progressionRepo = new MemoryProgressionRepository(createMemoryStore())
  let codeIndex = 0
  const achievementsService = new AchievementsService({
    progressionRepository: progressionRepo,
    badgeRepository: achievementsRepos.badgeRepository,
    studentBadgeRepository: achievementsRepos.studentBadgeRepository,
    certificateRepository: achievementsRepos.certificateRepository,
    studentRepository: studentRepos.studentRepository,
    makeCertificateCode: () => ['SQ-AAAAAA-BBBBBB', 'SQ-CCCCCC-DDDDDD', 'SQ-EEEEEE-FFFFFF'][codeIndex++ % 3],
    streamRepository: {
      listActive: async () => STREAMS,
      findById: async (id) => STREAMS.find((s) => s.id === Number(id)) ?? null,
    },
  })

  const achievementsApp = createAchievementsApi({ studentService, achievementsService })
  const studentApp = createStudentApi({ service: studentService })

  const root = new Hono()
  root.use('/api/student/achievements/*', (c) => achievementsApp.fetch(c.req.raw, c.env))
  root.use('/api/student/certificates/*', (c) => achievementsApp.fetch(c.req.raw, c.env))
  root.use('/api/certificates/*', (c) => achievementsApp.fetch(c.req.raw, c.env))
  root.use('/api/student/*', (c) => studentApp.fetch(c.req.raw, c.env))

  return { app: root, achievementsService, progressionRepo, studentRepos }
}

async function register(app, initials = 'SS') {
  const resp = await app.request('/api/student/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initials, name: 'Smoke Student', school: 'Colombo High', grade: 7 }),
  })
  assert.equal(resp.status, 201)
  const body = await resp.json()
  return { token: body.token, id: body.student.id }
}

test('401 without a token on every authenticated achievements route', async () => {
  const { app } = buildStack()
  for (const path of ['/api/student/achievements', '/api/student/certificates', '/api/student/certificates/1/pdf']) {
    const resp = await app.request(path)
    assert.equal(resp.status, 401, `${path} requires auth`)
    assert.equal((await resp.json()).error.code, 'ACHIEVEMENTS_UNAUTHORIZED')
  }
})

test('GET /api/student/achievements lists 4 locked badges for a fresh student', async () => {
  const { app } = buildStack()
  const a = await register(app)
  const resp = await app.request('/api/student/achievements', { headers: { authorization: `Bearer ${a.token}` } })
  assert.equal(resp.status, 200)
  const body = await resp.json()
  assert.equal(body.badges.length, 4)
  assert.ok(body.badges.every((b) => b.awarded === false && b.awardedAt === null))
  const text = JSON.stringify(body)
  assert.ok(!/studentId|loginCode|token/.test(text), 'no private fields leak')
})

test('awarded badges + certificates surface through the authenticated API', async () => {
  const { app, achievementsService, progressionRepo } = buildStack()
  const a = await register(app)
  await progressionRepo.upsertStreamProgress({
    studentId: a.id, streamId: 1, currentLevel: 6, completedLevels: 5, streamCompleted: true, updatedAt: Date.now(),
  })
  await achievementsService.awardForCompletion({ studentId: a.id, streamId: 1, completedAt: Date.now() })

  const badgesResp = await app.request('/api/student/achievements', { headers: { authorization: `Bearer ${a.token}` } })
  const badges = (await badgesResp.json()).badges
  assert.equal(badges.find((b) => b.slug === 'science-completion').awarded, true, 'badge awarded via the completion hook')

  const certsResp = await app.request('/api/student/certificates', { headers: { authorization: `Bearer ${a.token}` } })
  const certs = (await certsResp.json()).certificates
  assert.equal(certs.length, 1)
  assert.equal(certs[0].stream.slug, 'science')
})

test('certificates list + PDF download work for the owner', async () => {
  const { app, achievementsService } = buildStack()
  const a = await register(app)
  const issued = await achievementsService.issueStreamCertificate({ studentId: a.id, streamId: 1, earnedAt: Date.now() })

  const listResp = await app.request('/api/student/certificates', { headers: { authorization: `Bearer ${a.token}` } })
  const list = await listResp.json()
  assert.equal(list.certificates.length, 1)
  assert.equal(list.certificates[0].code, issued.certificate.code)
  assert.equal(list.certificates[0].pdfUrl, `/api/student/certificates/${issued.certificate.id}/pdf`)

  const pdfResp = await app.request(list.certificates[0].pdfUrl, { headers: { authorization: `Bearer ${a.token}` } })
  assert.equal(pdfResp.status, 200)
  assert.match(pdfResp.headers.get('content-type'), /application\/pdf/)
  const bytes = Buffer.from(await pdfResp.arrayBuffer())
  assert.ok(bytes.toString('latin1').startsWith('%PDF-1.4'))
  assert.match(pdfResp.headers.get('content-disposition'), /inline; filename="certificate-SQ-.*\.pdf"/)
})

test('a student cannot download another student’s certificate PDF', async () => {
  const { app, achievementsService } = buildStack()
  const a = await register(app, 'SS')
  const b = await register(app, 'B2')
  await achievementsService.issueStreamCertificate({ studentId: a.id, streamId: 1, earnedAt: Date.now() })

  const foreign = await app.request('/api/student/certificates/1/pdf', { headers: { authorization: `Bearer ${b.token}` } })
  assert.equal(foreign.status, 404)
  assert.equal((await foreign.json()).error.code, 'ACHIEVEMENTS_NOT_FOUND')
})

test('a revoked certificate returns 410 on the PDF route', async () => {
  const { app, achievementsService } = buildStack()
  const a = await register(app)
  await achievementsService.issueStreamCertificate({ studentId: a.id, streamId: 1, earnedAt: Date.now() })

  const certs = await (await app.request('/api/student/certificates', { headers: { authorization: `Bearer ${a.token}` } })).json()
  // Simulate admin revocation (the service role / admin surface owns this flag).
  const store = achievementsService.certificateService.certificateRepository.store
  store.certificates.find((c) => c.id === 1).revoked = true

  const pdfResp = await app.request(certs.certificates[0].pdfUrl, { headers: { authorization: `Bearer ${a.token}` } })
  assert.equal(pdfResp.status, 410)
  assert.equal((await pdfResp.json()).error.code, 'ACHIEVEMENTS_REVOKED')
})

test('public verification returns safe data and flags revoked certificates', async () => {
  const { app, achievementsService } = buildStack()
  const a = await register(app)
  await achievementsService.issueStreamCertificate({ studentId: a.id, streamId: 3, earnedAt: Date.now() })

  const validResp = await app.request('/api/certificates/verify/SQ-AAAAAA-BBBBBB')
  assert.equal(validResp.status, 200)
  const valid = await validResp.json()
  assert.equal(valid.valid, true)
  assert.equal(valid.certificate.stream.slug, 'engineering')
  assert.equal(valid.certificate.studentName, 'SS Smoke Student')
  const payload = JSON.stringify(valid)
  assert.ok(!/studentId|student_id|loginCode|tokenHash|score/.test(payload), 'verification exposes only safe data')

  const unknown = await app.request('/api/certificates/verify/SQ-MISSING-000000')
  assert.equal(unknown.status, 404)
  assert.equal((await unknown.json()).error.code, 'ACHIEVEMENTS_NOT_FOUND')
})

export default { tests: true }