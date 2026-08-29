/**
 * Mission — frontend tests (Task 5.2).
 *
 * Framework-free node:test coverage of the browser-side mission modules:
 * the pure selection-state reducer, the expired-session guard, the fetch
 * client methods, plus static renders of the real selection page and its
 * steps through Vite SSR + ReactDOMServer (no new testing framework, no DOM
 * driver — the existing repo pattern). Static renders assert the a11y and
 * content contract: 4 streams with descriptions, 5 levels, locked levels
 * disabled, status labels, and a guarded redirect when there is no token.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  SELECTION_STEP,
  createInitialSelectionState,
  selectStream,
  selectLevel,
  backToStreams,
  backToLevels,
  canBegin,
} from '../selection/selection-state.js'
import { isExpiredSession } from '../session-guard.js'
import { studentApiClient } from '../../student/api/client.js'

// ---------------------------------------------------------------------------
// Selection state — pure reducer flow
// ---------------------------------------------------------------------------

test('selection flow: streams → levels → ready, with back navigation', () => {
  let s = createInitialSelectionState()
  assert.equal(s.step, SELECTION_STEP.STREAMS)
  assert.equal(canBegin(s), false)

  s = selectStream(s, { id: 2, name: 'Technology' })
  assert.equal(s.step, SELECTION_STEP.LEVELS)
  assert.equal(s.selectedStreamId, 2)
  assert.equal(s.selectedLevelId, null)
  assert.equal(canBegin(s), false)

  s = selectLevel(s, { id: 7, number: 2, name: 'Easy', selectable: true })
  assert.equal(s.step, SELECTION_STEP.READY)
  assert.equal(s.selectedLevelId, 7)
  assert.equal(canBegin(s), true)

  s = backToLevels(s)
  assert.equal(s.step, SELECTION_STEP.LEVELS)
  assert.equal(s.selectedLevelId, null)
  assert.equal(s.selectedStreamId, 2)

  s = backToStreams(s)
  assert.equal(s.step, SELECTION_STEP.STREAMS)
  assert.equal(s.selectedStreamId, null)
})

test('selectLevel refuses locked levels and unknown streams', () => {
  const s = selectStream(createInitialSelectionState(), { id: 1 })
  const same = selectLevel(s, { id: 2, number: 2, selectable: false })
  assert.equal(same, s, 'state object is unchanged when the level is locked')

  const noStream = selectStream(createInitialSelectionState(), null)
  assert.equal(noStream.step, SELECTION_STEP.STREAMS)

  const noLevel = selectLevel(createInitialSelectionState(), null)
  assert.equal(noLevel.step, SELECTION_STEP.STREAMS)
})

test('choosing a new stream clears the previous level choice', () => {
  let s = selectStream(createInitialSelectionState(), { id: 1 })
  s = selectLevel(s, { id: 3, number: 3, selectable: true })
  s = backToLevels(s)
  s = selectStream(s, { id: 2 })
  assert.equal(s.selectedStreamId, 2)
  assert.equal(s.selectedLevelId, null)
  assert.equal(s.step, SELECTION_STEP.LEVELS)
})

// ---------------------------------------------------------------------------
// Session guard — pure expired-session detection (server decides, UI reacts)
// ---------------------------------------------------------------------------

test('isExpiredSession reacts only to a 401 from an active token', () => {
  assert.equal(isExpiredSession({ isError: true, error: { status: 401 } }, 'tok'), true)
  assert.equal(isExpiredSession({ isError: true, error: { status: 500 } }, 'tok'), false)
  assert.equal(isExpiredSession({ isError: false }, 'tok'), false)
  assert.equal(isExpiredSession({ isError: true, error: { status: 401 } }, null), false, 'no token, no redirect')
  assert.equal(isExpiredSession({}, ''), false)
})

// ---------------------------------------------------------------------------
// API client — browser fetch contract for the mission endpoints
// ---------------------------------------------------------------------------

test('client fetches streams and levels with the Bearer token', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const payload = url.includes('/levels')
      ? { stream: { id: 1, slug: 'science' }, levels: [] }
      : { streams: [] }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await studentApiClient.getMissionStreams('tok-1')
    await studentApiClient.getMissionLevels('tok-1', 3)
    assert.equal(calls[0].url, '/api/student/mission/streams')
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok-1')
    assert.equal(calls[1].url, '/api/student/mission/streams/3/levels')
    assert.equal(calls[1].init.headers.authorization, 'Bearer tok-1')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client surfaces mission 401s as expirable errors', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: { code: 'STUDENT_TOKEN_EXPIRED', category: 'SECURITY', message: 'Your session could not be verified. Please start again.' } }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
  try {
    await assert.rejects(studentApiClient.getMissionStreams('dead'), (err) => {
      assert.equal(err.status, 401)
      return true
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

// ---------------------------------------------------------------------------
// Static renders of the real page + steps (a11y/content contract)
// ---------------------------------------------------------------------------

const STREAM_SUMMARIES = [
  { id: 1, slug: 'science', name: 'Science', description: 'Energy and matter.', themeColor: null, levelCount: 5, unlockedCount: 1, completedCount: 0 },
  { id: 2, slug: 'technology', name: 'Technology', description: 'Tools of the digital world.', themeColor: null, levelCount: 5, unlockedCount: 3, completedCount: 1 },
  { id: 3, slug: 'engineering', name: 'Engineering', description: 'Design and build.', themeColor: null, levelCount: 5, unlockedCount: 1, completedCount: 0 },
  { id: 4, slug: 'mathematics', name: 'Mathematics', description: 'Numbers and patterns.', themeColor: null, levelCount: 5, unlockedCount: 1, completedCount: 0 },
]

async function loadPage() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = await vite.ssrLoadModule('/src/pages/StudentMissionPage.jsx')
  return { vite, mod }
}

test('page gates access when there is no session token', async () => {
  globalThis.sessionStorage = { getItem: () => null }
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const element = React.createElement(
      MemoryRouter,
      null,
      React.createElement(QueryClientProvider, { client }, React.createElement(mod.default))
    )
    const html = renderToStaticMarkup(element)
    assert.ok(!html.includes('Choose your stream'), 'picker must not render without a token')
    assert.ok(!html.includes('sm-stream'), 'no stream cards without a token')
    assert.ok(!html.includes('STEM QUEST'), 'mission screen is fully gated')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page renders the stream picker for a valid session with all four streams', async () => {
  globalThis.sessionStorage = { getItem: () => 'tok-1' }
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['student', 'me', 'tok-1'], { student: { name: 'Amaya' } })
    client.setQueryData(['mission', 'streams', 'tok-1'], { streams: STREAM_SUMMARIES })
    const element = React.createElement(
      MemoryRouter,
      null,
      React.createElement(QueryClientProvider, { client }, React.createElement(mod.default))
    )
    const html = renderToStaticMarkup(element)

    assert.match(html, /Select Your World/)
    assert.match(html, /2 · Choose stream/, 'progress strip marks the selection step')
    for (const stream of STREAM_SUMMARIES) {
      assert.ok(html.includes(stream.name), `${stream.name} card renders`)
      assert.ok(html.includes(stream.description), `${stream.name} description renders`)
      assert.ok(html.includes(`aria-label="${stream.name} — ${stream.unlockedCount} of ${stream.levelCount} levels open"`))
    }
    assert.equal((html.match(/class="sm-stream"/g) ?? []).length, 4, 'exactly four stream cards')
    assert.match(html, /1 \/ 5 Levels Unlocked/, 'unlock counts are visible')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

function fakeLevelSelection(step) {
  const stream = STREAM_SUMMARIES[0]
  const levels = [1, 2, 3, 4, 5].map((n) => ({
    id: n,
    number: n,
    name: ['Beginner', 'Easy', 'Intermediate', 'Advanced', 'Hard'][n - 1],
    access: n === 1 ? 'available' : 'locked',
    status: n === 1 ? 'not-started' : 'not-started',
    selectable: n === 1,
    replayable: false,
  }))
  return {
    state: { step, selectedStreamId: 1, selectedLevelId: step === 'ready' ? 1 : null },
    selectedStream: stream,
    selectedLevelId: step === 'ready' ? 1 : null,
    levelsQuery: { data: { stream, levels }, isLoading: false, isError: false, refetch: () => {} },
    chooseLevel: () => {},
    goBackToStreams: () => {},
    goBackToLevels: () => {},
  }
}

test('level step renders five levels, locked levels disabled, statuses labelled', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.LevelStep, { reduceMotion: false, selection: fakeLevelSelection('levels'), onBegin: () => {} })
    )
    assert.match(html, /Science/)
    assert.match(html, /Beginner/)
    assert.match(html, /Hard/)
    assert.equal((html.match(/class="sm-level"/g) ?? []).length, 5, 'exactly five level rows')
    assert.ok(html.includes('aria-disabled="true"'), 'locked levels announce disabled')
    assert.ok(html.includes('disabled=""'), 'locked levels are actually disabled')
    assert.match(html, /Locked/)
    assert.match(html, /Available/)
    assert.match(html, /All Worlds/, 'back to stream picker is available')
  } finally {
    await vite.close()
  }
})

test('ready step shows the chosen stream and level with a begin action', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.ReadyPanel, { reduceMotion: false, selection: fakeLevelSelection('ready'), onBegin: () => {} })
    )
    assert.match(html, /Ready to begin/)
    assert.match(html, /Science/)
    assert.match(html, /Level 1 · Beginner/)
    assert.match(html, /Begin the mission/)
    assert.match(html, /Change level/)
    assert.match(html, /Change stream/)
    assert.match(html, /3 · Begin the mission/, 'progress strip reaches the begin step')
  } finally {
    await vite.close()
  }
})

test('stream picker is keyboard-reachable (real buttons) with reduced-motion support', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.StreamPicker, {
        reduceMotion: true,
        selection: { streams: STREAM_SUMMARIES, chooseStream: () => {} },
      })
    )
    assert.match(html, /<button type="button" class="sm-stream"/, 'streams are buttons, not divs')
    assert.ok(!html.includes('transition:'), 'no inline transitions when motion is reduced')
    assert.match(html, /transform:none/, 'reduced-motion renders at rest, not animated')
  } finally {
    await vite.close()
  }
})