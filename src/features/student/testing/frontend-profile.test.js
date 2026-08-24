/**
 * Student — profile frontend tests (Task 5.6).
 *
 * Framework-free node:test coverage of the browser-side profile modules: the
 * fetch client methods, plus static renders of the real profile page, its
 * edit form and its stream cards through Vite SSR + ReactDOMServer (the
 * existing repo pattern). Static renders assert the a11y and content
 * contract: gated without a token, identity, progress bars with aria
 * progressbar roles, level pips, statistics, labelled editable fields, and
 * no privileged data in the markup.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { studentApiClient } from '../api/client.js'
import { AVATAR_ALLOWED_MIME, AVATAR_MAX_BYTES } from '../security/avatar.js'
import { GRADE_OPTIONS } from '../validation.js'

// ---------------------------------------------------------------------------
// API client — browser fetch contract for the profile endpoints
// ---------------------------------------------------------------------------

test('client sends a strict PUT /me with the Bearer token and four fields', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ student: { name: 'Updated Name' } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const result = await studentApiClient.updateProfile({
      token: 'tok-1',
      initials: 'AS',
      name: 'Amaya Silva',
      school: 'Kandy Girls College',
      grade: 10,
    })
    assert.equal(result.student.name, 'Updated Name')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/api/student/me')
    assert.equal(calls[0].init.method, 'PUT')
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok-1')
    const sent = JSON.parse(calls[0].init.body)
    assert.deepEqual(Object.keys(sent).sort(), ['grade', 'initials', 'name', 'school'])
    assert.equal(sent.grade, 10)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client fetches /me/progress with the Bearer token', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ streams: [], overall: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await studentApiClient.getProgress('tok-9')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/api/student/me/progress')
    assert.equal(calls[0].init.method, 'GET')
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok-9')
  } finally {
    globalThis.fetch = origFetch
  }
})

// ---------------------------------------------------------------------------
// Static renders of the real profile page (a11y/content contract)
// ---------------------------------------------------------------------------

const PROGRESS = {
  streams: [
    {
      id: 1, slug: 'science', name: 'Science', description: 'Energy and matter.', themeColor: null,
      currentLevel: 2, completedLevels: 1, totalLevels: 5, completionPercent: 20, completed: false, inProgress: true,
      bestScore: 210, totalAttempts: 2,
      nextLevel: { id: 2, number: 2, name: 'Easy', access: 'available' },
      levels: [
        { id: 1, number: 1, name: 'Beginner', status: 'completed', access: 'available', replayable: true },
        { id: 2, number: 2, name: 'Easy', status: 'not-started', access: 'available', replayable: false },
        { id: 3, number: 3, name: 'Intermediate', status: 'not-started', access: 'locked', replayable: false },
        { id: 4, number: 4, name: 'Advanced', status: 'not-started', access: 'locked', replayable: false },
        { id: 5, number: 5, name: 'Hard', status: 'not-started', access: 'locked', replayable: false },
      ],
    },
    { id: 2, slug: 'technology', name: 'Technology', description: 'Digital tools.', themeColor: null,
      currentLevel: 1, completedLevels: 0, totalLevels: 5, completionPercent: 0, completed: false, inProgress: false,
      bestScore: null, totalAttempts: 0,
      nextLevel: { id: 6, number: 1, name: 'Beginner', access: 'available' },
      levels: [1, 2, 3, 4, 5].map((n) => ({ id: 5 + n, number: n, name: 'L' + n, status: 'not-started', access: n === 1 ? 'available' : 'locked', replayable: false })) },
    { id: 3, slug: 'engineering', name: 'Engineering', description: 'Design and build.', themeColor: null,
      currentLevel: 1, completedLevels: 0, totalLevels: 5, completionPercent: 0, completed: false, inProgress: false,
      bestScore: null, totalAttempts: 0,
      nextLevel: { id: 11, number: 1, name: 'Beginner', access: 'available' },
      levels: [1, 2, 3, 4, 5].map((n) => ({ id: 10 + n, number: n, name: 'L' + n, status: 'not-started', access: n === 1 ? 'available' : 'locked', replayable: false })) },
    { id: 4, slug: 'mathematics', name: 'Mathematics', description: 'Numbers and patterns.', themeColor: null,
      currentLevel: 1, completedLevels: 0, totalLevels: 5, completionPercent: 0, completed: false, inProgress: false,
      bestScore: null, totalAttempts: 0,
      nextLevel: { id: 16, number: 1, name: 'Beginner', access: 'available' },
      levels: [1, 2, 3, 4, 5].map((n) => ({ id: 15 + n, number: n, name: 'L' + n, status: 'not-started', access: n === 1 ? 'available' : 'locked', replayable: false })) },
  ],
  overall: { totalLevels: 20, completedLevels: 1, completedStreams: 0, totalAttempts: 2, bestScore: 210 },
}

async function loadPage() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = await vite.ssrLoadModule('/src/pages/StudentProfilePage.jsx')
  return { vite, mod }
}

function renderPage(mod, client) {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(QueryClientProvider, { client }, React.createElement(mod.default))
    )
  )
}

test('page gates access when there is no session token', async () => {
  globalThis.sessionStorage = { getItem: () => null }
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const html = renderPage(mod, client)
    assert.ok(!html.includes('Your profile'), 'profile must not render without a token')
    assert.ok(!html.includes('pf-stream'), 'no stream cards without a token')
    assert.ok(!html.includes('STEM QUEST'), 'profile screen is fully gated')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page renders identity, progress, stream cards and statistics for a valid session', async () => {
  globalThis.sessionStorage = { getItem: () => 'tok-1' }
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['student', 'me', 'tok-1'], { student: { id: 1, initials: 'AS', name: 'Amaya Silva', school: 'Kandy Girls College', grade: 10, avatarUrl: null } })
    client.setQueryData(['student', 'progress', 'tok-1'], PROGRESS)
    const html = renderPage(mod, client)

    assert.match(html, /Your profile/)
    assert.match(html, /Hi Amaya Silva/)
    assert.match(html, /Kandy Girls College · Grade 10 · AS/)
    assert.match(html, /Edit profile/)
    assert.match(html, /Continue mission/)
    assert.match(html, /Back to mission/)
    assert.match(html, /Your progress/)
    assert.match(html, /1 of 20 levels completed/)
    assert.match(html, /Science/)
    assert.match(html, /Technology/)
    assert.match(html, /Engineering/)
    assert.match(html, /Mathematics/)
    assert.match(html, /1 of 5 levels completed/)
    assert.match(html, /Next: Level 2 · Easy/)
    assert.match(html, /Play Level 2/)
    assert.equal((html.match(/role="progressbar"/g) ?? []).length, 5, 'overall bar + 4 stream bars are progressbars')
    assert.match(html, /aria-valuenow="1"/, 'overall bar reports the completed count')
    assert.match(html, /Statistics/)
    assert.match(html, /Total attempts/)
    assert.match(html, /210 \/ 300/, 'safe best score is the student’s own')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page markup contains no privileged or answer data', async () => {
  globalThis.sessionStorage = { getItem: () => 'tok-1' }
  const { vite, mod } = await loadPage()
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['student', 'me', 'tok-1'], { student: { id: 1, initials: 'AS', name: 'Amaya Silva', school: 'S', grade: 7, avatarUrl: null } })
    client.setQueryData(['student', 'progress', 'tok-1'], PROGRESS)
    const html = renderPage(mod, client)
    assert.ok(!html.includes('loginCode'), 'login code never renders on the profile page')
    assert.ok(!html.includes('studentId'), 'raw identity field never renders')
    assert.ok(!html.includes('correctAnswer') && !html.includes('mappings'), 'no answer data in the browser markup')
    assert.ok(!html.includes('special_access'), 'no special-access internals')
    assert.ok(!html.includes('SUPABASE_SERVICE_ROLE'), 'no server credentials')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

// ---------------------------------------------------------------------------
// Edit form + stream cards (a11y/content contract)
// ---------------------------------------------------------------------------

test('edit form renders the four labelled editable fields and safe actions', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.ProfileEditForm, {
        form: { initials: 'AS', name: 'Amaya Silva', school: 'Kandy Girls College', grade: '10' },
        fieldErrors: { initials: 'Initials must be 5 characters or fewer.' },
        saving: false,
        onChange: () => {},
        onSubmit: () => {},
        onCancel: () => {},
      })
    )
    assert.ok(html.includes('for="pf-field-initials"'))
    assert.ok(html.includes('id="pf-field-initials"'))
    assert.ok(html.includes('for="pf-field-name"'))
    assert.ok(html.includes('for="pf-field-school"'))
    assert.ok(html.includes('for="pf-field-grade"'))
    assert.match(html, /aria-invalid="true"/, 'invalid fields announce the invalid state')
    assert.match(html, /role="alert"/, 'field errors are announced')
    assert.match(html, /Save changes/)
    assert.match(html, /Cancel/)
    assert.ok(html.includes('value="AS"'))
    assert.equal((html.match(/<option/g) ?? []).length, GRADE_OPTIONS.length + 1, 'grade select lists 6..11')
  } finally {
    await vite.close()
  }
})

test('a stream with a next level offers Play next level; a completed stream offers View stream', async () => {
  const { vite, mod } = await loadPage()
  try {
    const playable = renderToStaticMarkup(
      React.createElement(mod.StreamCard, {
        stream: PROGRESS.streams[0],
        onPlayLevel: () => {},
      })
    )
    assert.match(playable, /Play Level 2/)
    assert.match(playable, /Next: Level 2 · Easy/)
    assert.match(playable, /In progress/)
    assert.equal((playable.match(/class="pf-pip pf-pip--/g) ?? []).length, 5, 'five level pips render')
    assert.match(playable, /pf-pip--completed/, 'completed pip styled distinctly')

    const done = renderToStaticMarkup(
      React.createElement(mod.StreamCard, {
        stream: {
          ...PROGRESS.streams[0],
          completed: true, completedLevels: 5, completionPercent: 100, currentLevel: 5, inProgress: false,
          nextLevel: null,
          levels: [1, 2, 3, 4, 5].map((n) => ({ id: n, number: n, name: 'L' + n, status: 'completed', access: 'available', replayable: true })),
        },
        onPlayLevel: () => {},
      })
    )
    assert.match(done, /View stream/)
    assert.match(done, /well done/, 'completed stream is celebrated')
    assert.match(done, /Completed/)
    assert.ok(!done.includes('Play Level'), 'no play action on a completed stream')
  } finally {
    await vite.close()
  }
})

test('photo controls are optional, MIME-scoped and size-limited', () => {
  assert.ok(AVATAR_ALLOWED_MIME.includes('image/jpeg'))
  assert.ok(AVATAR_ALLOWED_MIME.includes('image/png'))
  assert.ok(AVATAR_ALLOWED_MIME.includes('image/webp'))
  assert.ok(!AVATAR_ALLOWED_MIME.includes('image/svg+xml'))
  assert.equal(AVATAR_MAX_BYTES, 204800)
})