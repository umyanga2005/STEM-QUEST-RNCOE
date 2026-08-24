/**
 * Achievements — CertificateService tests (Task 5.8).
 *
 * Covers issue idempotency, certificate-code uniqueness with retry, the
 * on-demand PDF (ownership + revocation + safe bytes), the student list
 * projection, and public verification that exposes only safe data (D-031).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CertificateService } from '../service/certificate-service.js'
import { AchievementsError } from '../errors.js'
import { createAchievementsHarness } from './helpers.js'

function buildService(harness = createAchievementsHarness(), { codes } = {}) {
  let queue = [...(codes ?? ['SQ-AAAAAA-BBBBBB'])]
  const service = new CertificateService({
    certificateRepository: harness.achievementsRepos.certificateRepository,
    studentRepository: harness.studentRepos.studentRepository,
    streamRepository: harness.missionRepos.streamRepository,
    makeCertificateCode: () => queue.shift(),
  })
  return { harness, service, nextCode: () => queue[0] }
}

const AT = Date.UTC(2026, 7, 16, 10)

test('issueStreamCertificate issues once and is idempotent on repeat', async () => {
  const { harness, service } = buildService()
  const first = await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT })
  assert.equal(first.issued, true)
  assert.equal(first.certificate.code, 'SQ-AAAAAA-BBBBBB')
  assert.equal(first.certificate.title, 'Science Completion Certificate')
  assert.equal(first.certificate.stream.name, 'Science')

  const repeat = await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT + 1000 })
  assert.equal(repeat.issued, false, 're-issue is a no-op')
  assert.equal(repeat.certificate.code, 'SQ-AAAAAA-BBBBBB', 'same certificate returned')

  assert.equal(harness.achievementsStore.certificates.length, 1, 'exactly one certificates row')
})

test('a certificate_code collision retries with a fresh code', async () => {
  const { harness, service } = buildService(createAchievementsHarness(), {
    codes: ['SQ-COLLIDE-000000', 'SQ-AAAAAA-BBBBBB'],
  })
  // Pre-insert a row that already uses the first code for ANOTHER student+stream.
  await harness.achievementsRepos.certificateRepository.issue({
    studentId: 2,
    streamId: 1,
    title: 'Existing',
    certificateCode: 'SQ-COLLIDE-000000',
    earnedAt: AT,
  })
  const result = await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT })
  assert.equal(result.issued, true)
  assert.equal(result.certificate.code, 'SQ-AAAAAA-BBBBBB', 'second code used after collision')
})

test('issueStreamCertificate is a no-op for unknown streams', async () => {
  const { service } = buildService()
  const result = await service.issueStreamCertificate({ studentId: 1, streamId: 999, earnedAt: AT })
  assert.deepEqual(result, { issued: false, reason: 'no-stream' })
})

test('getStudentCertificates returns own certificates and excludes revoked', async () => {
  const { harness, service } = buildService()
  await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT })
  await service.issueStreamCertificate({ studentId: 1, streamId: 2, earnedAt: AT + 1000 })

  harness.achievementsStore.certificates.find((c) => c.streamId === 2).revoked = true
  harness.achievementsStore.certificates.find((c) => c.streamId === 2).revokedAt = AT + 5000

  const { certificates, revokedCount } = await service.getStudentCertificates({ studentId: 1 })
  assert.equal(certificates.length, 1, 'revoked certificate excluded from the list')
  assert.equal(certificates[0].stream.slug, 'science')
  assert.equal(certificates[0].pdfUrl, '/api/student/certificates/1/pdf')
  assert.equal(revokedCount, 1)
  assert.ok(!certificates[0].studentId && !certificates[0].loginCode, 'no private fields leak')
})

test('getCertificatePdf renders the owner PDF and 404s for a foreign certificate', async () => {
  const { harness, service } = buildService()
  await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT })
  const certificateId = harness.achievementsStore.certificates[0].id

  const { pdf, filename } = await service.getCertificatePdf({ certificateId, studentId: 1 })
  assert.ok(Buffer.isBuffer(pdf) && pdf.toString('latin1').startsWith('%PDF-1.4'), 'PDF bytes returned')
  assert.equal(filename, 'certificate-SQ-AAAAAA-BBBBBB.pdf')

  await assert.rejects(
    service.getCertificatePdf({ certificateId, studentId: 2 }),
    (err) => err instanceof AchievementsError && err.code === 'ACHIEVEMENTS_NOT_FOUND',
    'another student cannot download someone else’s certificate'
  )
  await assert.rejects(
    service.getCertificatePdf({ certificateId: 99999, studentId: 1 }),
    (err) => err instanceof AchievementsError && err.code === 'ACHIEVEMENTS_NOT_FOUND'
  )
})

test('getCertificatePdf refuses a revoked certificate (410)', async () => {
  const { harness, service } = buildService()
  await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT })
  harness.achievementsStore.certificates[0].revoked = true
  await assert.rejects(
    service.getCertificatePdf({ certificateId: 1, studentId: 1 }),
    (err) => err instanceof AchievementsError && err.code === 'ACHIEVEMENTS_REVOKED'
  )
})

test('verifyCertificate exposes only safe data for a valid certificate', async () => {
  const { service } = buildService()
  await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT })
  const result = await service.verifyCertificate({ certificateCode: 'SQ-AAAAAA-BBBBBB' })
  assert.equal(result.valid, true)
  const payload = JSON.stringify(result)
  assert.ok(payload.includes('SQ-AAAAAA-BBBBBB'))
  assert.ok(payload.includes('SS Smoke Student'), 'recipient name is on the certificate surface')
  assert.ok(!/studentId|student_id|loginCode|token|hash|score|correctAnswer/.test(payload), 'no private data in verification')
})

test('verifyCertificate flags a revoked certificate as invalid', async () => {
  const { harness, service } = buildService()
  await service.issueStreamCertificate({ studentId: 1, streamId: 1, earnedAt: AT })
  harness.achievementsStore.certificates[0].revoked = true
  const result = await service.verifyCertificate({ certificateCode: 'SQ-AAAAAA-BBBBBB' })
  assert.equal(result.valid, false)
  assert.equal(result.certificate.revoked, true)
})

test('verifyCertificate rejects unknown codes and empty input', async () => {
  const { service } = buildService()
  await assert.rejects(
    service.verifyCertificate({ certificateCode: 'SQ-NOT-FOUND' }),
    (err) => err instanceof AchievementsError && err.code === 'ACHIEVEMENTS_NOT_FOUND'
  )
  await assert.rejects(
    service.verifyCertificate({ certificateCode: '   ' }),
    (err) => err instanceof AchievementsError && err.code === 'ACHIEVEMENTS_INVALID_INPUT'
  )
})

export default { tests: true }