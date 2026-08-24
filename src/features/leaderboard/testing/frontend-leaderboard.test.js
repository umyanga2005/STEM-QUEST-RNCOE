/**
 * Leaderboard — frontend tests (Task 5.7).
 *
 * Framework-free node:test coverage of the browser-side leaderboard modules:
 * the fetch client contract, static renders of the real LeaderboardPage and
 * its reusable board/table/badge components through Vite SSR + ReactDOMServer,
 * and the public (no-session) render path. Static renders assert the a11y and
 * content contract: 4 stream tabs, Top-10 table semantics, the server-derived
 * "you" highlight, live status labels, and loading/empty/error states.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { leaderboardApiClient, LeaderboardApiError } from '../client/client.js'

// ---------------------------------------------------------------------------
// Browser client — fetch contract
// ---------------------------------------------------------------------------

test('client fetches all boards and a single board with an optional Bearer token', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const payload = url === '/api/student/leaderboards' ? { leaderboards: [] } : { stream: { id: 1 }, entries: [] }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await leaderboardApiClient.getAllLeaderboards('tok-1')
    await leaderboardApiClient.getStreamLeaderboard(null, 3)
    assert.equal(calls[0].url, '/api/student/leaderboards')
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok-1')
    assert.equal(calls[1].url, '/api/student/leaderboards/3')
    assert.equal(calls[1].init.headers.authorization, undefined, 'no token → no auth header')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client surfaces non-OK responses as LeaderboardApiError with code', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: { code: 'LEADERBOARD_STREAM_UNAVAILABLE', category: 'AVAILABILITY', message: 'nope' } }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    )
  try {
    await assert.rejects(leaderboardApiClient.getAllLeaderboards('tok'), (err) => {
      assert.ok(err instanceof LeaderboardApiError)
      assert.equal(err.status, 404)
      assert.equal(err.code, 'LEADERBOARD_STREAM_UNAVAILABLE')
      return true
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

// ---------------------------------------------------------------------------
// Static renders (SSR)
// ---------------------------------------------------------------------------

const BOARDS = [
  {
    stream: { id: 1, slug: 'science', name: 'Science', themeColor: null },
    entries: [
      { rank: 1, displayName: 'SS Smoke Student', score: 300, self: false },
      { rank: 2, displayName: 'B2 Smoke Student B', score: 240, self: true },
    ],
  },
  { stream: { id: 2, slug: 'technology', name: 'Technology', themeColor: null }, entries: [] },
  { stream: { id: 3, slug: 'engineering', name: 'Engineering', themeColor: null }, entries: [] },
  { stream: { id: 4, slug: 'mathematics', name: 'Mathematics', themeColor: null }, entries: [] },
]

function renderPage(queryClient, LeaderboardPageComponent) {
  const element = React.createElement(
    MemoryRouter,
    null,
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(LeaderboardPageComponent))
  )
  return renderToStaticMarkup(element)
}

async function loadPage() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = await vite.ssrLoadModule('/src/pages/LeaderboardPage.jsx')
  return { vite, mod }
}

test('page renders four public stream tabs and the Top-10 board without a session', async () => {
  globalThis.sessionStorage = { getItem: () => null }
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['leaderboard', 'all', 'none'], { leaderboards: BOARDS })
    const html = renderPage(client, mod.default)

    assert.match(html, /STEM QUEST/)
    assert.equal((html.match(/class="lb-tab(?= |")/g) ?? []).length, 4, 'exactly four stream tabs')
    assert.ok(html.includes('aria-label="Science leaderboard"'), 'tab has an accessible label')
    assert.ok(html.includes('aria-label="Science leaderboard — Top 10"'), 'table names the stream board')
    assert.ok(html.includes('SS Smoke Student'), 'public display name renders')
    assert.ok(html.includes('B2 Smoke Student B'))
    assert.ok(html.includes('<th scope="col">Rank</th>'), 'table headers are explicit')
    assert.ok(html.includes('aria-label="2. B2 Smoke Student B, 240 points — you"'), 'self row announces itself')
    assert.equal((html.match(/class="lb-row(?= |")/g) ?? []).length, 2, 'two ranked rows on the science board')
    assert.ok(!html.includes('studentId'), 'no private fields in the rendered HTML')
    assert.ok(!html.includes('loginCode') && !html.includes('school'))
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page shows the empty state for a stream with no entries', async () => {
  globalThis.sessionStorage = { getItem: () => null }
  const { vite, mod } = await loadPage()
  try {
    const emptyBoards = BOARDS.map((b) => ({ ...b, entries: [] }))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['leaderboard', 'all', 'none'], { leaderboards: emptyBoards })
    const html = renderPage(client, mod.default)
    assert.match(html, /No scores yet on the Science board/)
    assert.match(html, /Complete a mission to appear here!/)
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page renders the loading skeleton before data arrives', async () => {
  globalThis.sessionStorage = { getItem: () => null }
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const html = renderPage(client, mod.default)
    assert.ok(html.includes('lb-skeleton'), 'skeleton renders while loading')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('LeaderboardStatus surfaces error and empty states with a retry action', async () => {
  const { vite, mod } = await loadPage()
  try {
    const errorHtml = renderToStaticMarkup(
      React.createElement(mod.LeaderboardStatus, { isLoading: false, isError: true, isEmpty: false, onRetry: () => {} })
    )
    assert.match(errorHtml, /We couldn’t load the leaderboards right now/)
    assert.match(errorHtml, /Try again/)
    assert.ok(errorHtml.includes('role="alert"'), 'error is announced')

    const emptyHtml = renderToStaticMarkup(
      React.createElement(mod.LeaderboardStatus, { isLoading: false, isError: false, isEmpty: true, onRetry: () => {} })
    )
    assert.match(emptyHtml, /No leaderboards are available right now/)
    assert.ok(emptyHtml.includes('role="alert"'))

    const okHtml = renderToStaticMarkup(
      React.createElement(mod.LeaderboardStatus, { isLoading: false, isError: false, isEmpty: false, onRetry: () => {} })
    )
    assert.equal(okHtml.trim(), '', 'no status block when data is present')
  } finally {
    await vite.close()
  }
})

test('LiveBadge labels live, reconnecting and unavailable states', async () => {
  const { vite, mod } = await loadPage()
  try {
    const live = renderToStaticMarkup(React.createElement(mod.LiveBadge, { live: { status: 'live' } }))
    assert.match(live, /Live/)
    assert.ok(!live.includes('Reconnecting'))

    const reconnecting = renderToStaticMarkup(React.createElement(mod.LiveBadge, { live: { status: 'reconnecting' } }))
    assert.match(reconnecting, /Reconnecting/)

    const off = renderToStaticMarkup(React.createElement(mod.LiveBadge, { live: { status: 'unavailable' } }))
    assert.match(off, /Live updates off/)
  } finally {
    await vite.close()
  }
})

test('board is keyboard-reachable (real buttons) and respects reduced motion', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.LeaderboardBoard, {
        leaderboards: BOARDS,
        selectedStreamId: 2,
        onSelectStream: () => {},
        reduceMotion: true,
      })
    )
    assert.match(html, /<button type="button" role="tab"/, 'tabs are real buttons')
    assert.ok(!html.includes('transition:'), 'no inline transitions when motion is reduced')
    assert.match(html, /transform:none/, 'reduced-motion renders at rest')
    assert.ok(html.includes('aria-selected="true"'), 'the active tab announces selection')
  } finally {
    await vite.close()
  }
})

export default { tests: true }