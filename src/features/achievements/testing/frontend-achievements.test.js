/**
 * Achievements — frontend tests (Task 5.8).
 *
 * Framework-free node:test coverage of the browser-side achievements modules:
 * the fetch client contract (Bearer auth + PDF blob download + public verify)
 * and static renders of the real StudentAchievementsPage and its reusable
 * badge/certificate/verify components through Vite SSR + ReactDOMServer.
 * Static renders assert the a11y + content contract: 4 badge cards with
 * earned/locked state, certificate rows with download actions, and the
 * verification result states.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { achievementsApiClient, AchievementsApiError } from '../client/client.js'

// ---------------------------------------------------------------------------
// Browser client — fetch contract
// ---------------------------------------------------------------------------

test('client sends a Bearer token on the authenticated routes only', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ badges: [], certificates: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await achievementsApiClient.getAchievements('tok-1')
    await achievementsApiClient.getCertificates('tok-1')
    await achievementsApiClient.verifyCertificate('SQ-ABC123-DEF456')
    assert.equal(calls[0].url, '/api/student/achievements')
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok-1')
    assert.equal(calls[1].url, '/api/student/certificates')
    assert.equal(calls[1].url.includes('tok'), false, 'token never leaks into the URL')
    assert.equal(calls[2].url, '/api/certificates/verify/SQ-ABC123-DEF456')
    assert.equal(calls[2].init.headers.authorization, undefined, 'verification is public')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('downloadCertificatePdf fetches a blob with the token and derives the filename', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(new Blob(['%PDF-1.4']), {
      status: 200,
      headers: { 'content-type': 'application/pdf', 'content-disposition': 'inline; filename="certificate-SQ-X.pdf"' },
    })
  }
  try {
    const { blob, filename } = await achievementsApiClient.downloadCertificatePdf({ token: 'tok-1', certificateId: 7 })
    assert.equal(calls[0].url, '/api/student/certificates/7/pdf')
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok-1')
    assert.equal(filename, 'certificate-SQ-X.pdf')
    assert.equal(blob.size, 8)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client surfaces non-OK responses as AchievementsApiError with code', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { code: 'ACHIEVEMENTS_REVOKED', category: 'AVAILABILITY', message: 'nope' } }), { status: 410 })
  try {
    await assert.rejects(achievementsApiClient.getCertificates('tok'), (err) => {
      assert.ok(err instanceof AchievementsApiError)
      assert.equal(err.status, 410)
      assert.equal(err.code, 'ACHIEVEMENTS_REVOKED')
      return true
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

// ---------------------------------------------------------------------------
// Static renders (SSR)
// ---------------------------------------------------------------------------

const BADGES = [
  { id: 1, slug: 'science-completion', name: 'Science Completion', description: 'Completed all 5 Science levels.', icon: 'science', awarded: true, awardedAt: 1000 },
  { id: 2, slug: 'technology-completion', name: 'Technology Completion', description: 'Completed all 5 Technology levels.', icon: 'technology', awarded: false, awardedAt: null },
  { id: 3, slug: 'engineering-completion', name: 'Engineering Completion', description: 'Completed all 5 Engineering levels.', icon: 'engineering', awarded: false, awardedAt: null },
  { id: 4, slug: 'mathematics-completion', name: 'Mathematics Completion', description: 'Completed all 5 Mathematics levels.', icon: 'mathematics', awarded: false, awardedAt: null },
]

const CERTIFICATES = [
  { id: 1, code: 'SQ-ABC123-DEF456', title: 'Science Completion Certificate', stream: { id: 1, slug: 'science', name: 'Science', themeColor: null }, earnedAt: 1000, pdfUrl: '/api/student/certificates/1/pdf' },
]

const SESSION = { getItem: () => 'tok-1' }

async function loadPage() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = await vite.ssrLoadModule('/src/pages/StudentAchievementsPage.jsx')
  return { vite, mod }
}

function renderPage(queryClient, Component) {
  const element = React.createElement(
    MemoryRouter,
    null,
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(Component))
  )
  return renderToStaticMarkup(element)
}

test('page renders four badges with earned/locked state and the certificate list', async () => {
  globalThis.sessionStorage = SESSION
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['student', 'me', 'tok-1'], { student: { id: 1, name: 'Smoke Student' } })
    client.setQueryData(['achievements', 'badges', 'tok-1'], { badges: BADGES })
    client.setQueryData(['achievements', 'certificates', 'tok-1'], { certificates: CERTIFICATES, revokedCount: 0 })
    const html = renderPage(client, mod.default)

    assert.match(html, /STEM QUEST/)
    assert.equal((html.match(/class="ac-badge(?= |")/g) ?? []).length, 4, 'exactly four badge cards')
    assert.match(html, /Science Completion/)
    assert.match(html, /Technology Completion/)
    assert.ok(html.includes('>Earned<'), 'earned badge labelled')
    assert.ok(html.includes('>Locked<'), 'locked badge labelled')
    assert.ok(html.includes('SQ-ABC123-DEF456'), 'certificate code renders')
    assert.ok(html.includes('Download PDF'), 'download action present')
    assert.ok(html.includes('Verify a certificate'), 'verification widget present')
    assert.ok(!html.includes('studentId') && !html.includes('loginCode'), 'no private fields in the HTML')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page shows an empty state when no certificates exist', async () => {
  globalThis.sessionStorage = SESSION
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['student', 'me', 'tok-1'], { student: { id: 1, name: 'Smoke Student' } })
    client.setQueryData(['achievements', 'badges', 'tok-1'], { badges: BADGES })
    client.setQueryData(['achievements', 'certificates', 'tok-1'], { certificates: [], revokedCount: 0 })
    const html = renderPage(client, mod.default)
    assert.match(html, /No certificates yet/)
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('BadgeCard, CertificateRow and VerifyResult render their states', async () => {
  const { vite, mod } = await loadPage()
  try {
    const earned = renderToStaticMarkup(React.createElement(mod.BadgeCard, { badge: BADGES[0] }))
    assert.match(earned, /Science Completion/)
    assert.ok(earned.includes('Earned'))
    const locked = renderToStaticMarkup(React.createElement(mod.BadgeCard, { badge: BADGES[1] }))
    assert.ok(locked.includes('Locked'))

    const cert = renderToStaticMarkup(React.createElement(mod.CertificateRow, { certificate: CERTIFICATES[0], downloading: false, onDownload: () => {} }))
    assert.ok(cert.includes('Download PDF'))

    const ok = renderToStaticMarkup(React.createElement(mod.VerifyResult, { code: 'SQ-X', verify: { isLoading: false, isError: false, data: { valid: true, certificate: { studentName: 'SS Smoke Student', stream: { name: 'Science' }, earnedAt: 1000 } } }, onChange: () => {} }))
    assert.match(ok, /Valid certificate/)
    assert.match(ok, /SS Smoke Student/)

    const revoked = renderToStaticMarkup(React.createElement(mod.VerifyResult, { code: 'SQ-X', verify: { isLoading: false, isError: false, data: { valid: false } }, onChange: () => {} }))
    assert.match(revoked, /revoked/i)

    const error = renderToStaticMarkup(React.createElement(mod.VerifyResult, { code: 'SQ-X', verify: { isLoading: false, isError: true }, onChange: () => {} }))
    assert.match(error, /No certificate found/)
  } finally {
    await vite.close()
  }
})

export default { tests: true }