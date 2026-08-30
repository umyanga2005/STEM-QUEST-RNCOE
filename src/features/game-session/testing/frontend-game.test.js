/**
 * Game Session — frontend tests (Task 5.3).
 *
 * Framework-free node:test coverage of the browser-side game modules: the
 * fetch client contract (Bearer token, paths, expirable errors), the pure
 * choice-storage helper, the activity registry (exactly the ten types), real
 * static renders of EVERY activity renderer from server-built descriptors
 * (ten-type coverage through the real engine), plus static renders of the
 * real `/student/game` page (no-token / no-choice gating, playing shell with
 * HUD + timer, result panel, session complete panel). No DOM driver, no new
 * framework — the existing repo pattern (Vite SSR + ReactDOMServer).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { gameStudentClient } from '../api/student-client.js'
import { createChoiceStorage } from '../session/choice-storage.js'
import { useRoundStore } from '../round/round-store.js'
import { createInitialRoundState, ROUND_PHASE } from '../round/round-lifecycle.js'
import { createDefaultServerActivityEngine } from '../service/game-session-service.js'
import { buildSafeRoundDescriptor } from '../security/safe-descriptor.js'
import { createMemoryStore } from '../repositories/memory.js'
import { demoBaseData, seedStoreFromBaseData } from '../demo/seed-data.js'
import { demoMatchingQuestions } from '../demo/matching-demo-questions.js'
import { demoOrderingQuestions } from '../demo/ordering-demo-questions.js'
import { demoSortingQuestions } from '../demo/sorting-demo-questions.js'
import { demoFillCompleteQuestions } from '../demo/fill-complete-demo-questions.js'
import { demoPatternQuestions } from '../demo/pattern-demo-questions.js'
import { demoMemoryQuestions } from '../demo/memory-demo-questions.js'
import { demoScenarioQuestions } from '../demo/scenario-demo-questions.js'
import { demoNumberLogicQuestions } from '../demo/number-logic-demo-questions.js'

// ---------------------------------------------------------------------------
// API client — browser fetch contract for the student game endpoints
// ---------------------------------------------------------------------------

test('client talks to /api/student/game with the Bearer token and JSON bodies', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const payload = url.endsWith('/current')
      ? { session: { id: 7 }, currentRound: null }
      : { ok: true }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await gameStudentClient.startSession({ token: 'tok-1', streamId: 1, levelId: 1 })
    await gameStudentClient.getCurrentRound({ token: 'tok-1', sessionId: 7 })
    await gameStudentClient.submitRound({ token: 'tok-1', sessionId: 7, roundId: 1, response: { placements: [] }, interactionMetrics: {} })
    await gameStudentClient.finishSession({ token: 'tok-1', sessionId: 7 })

    assert.equal(calls[0].url, '/api/student/game/session')
    assert.equal(calls[0].init.method, 'POST')
    assert.equal(calls[0].init.headers.authorization, 'Bearer tok-1')
    assert.deepEqual(JSON.parse(calls[0].init.body), { streamId: 1, levelId: 1 })

    assert.equal(calls[1].url, '/api/student/game/session/7/current')
    assert.equal(calls[1].init.headers.authorization, 'Bearer tok-1')

    assert.equal(calls[2].url, '/api/student/game/session/7/rounds/1/submit')
    assert.equal(calls[2].init.method, 'POST')
    assert.deepEqual(JSON.parse(calls[2].init.body), { response: { placements: [] }, interactionMetrics: {} })

    assert.equal(calls[3].url, '/api/student/game/session/7/finish')
    assert.equal(calls[3].init.method, 'POST')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client surfaces game 401s as expirable errors (same shape as the student flow)', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ error: { code: 'STUDENT_TOKEN_EXPIRED', category: 'SECURITY', message: 'Your session could not be verified. Please start again.' } }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
  try {
    await assert.rejects(gameStudentClient.startSession({ token: 'dead', streamId: 1, levelId: 1 }), (err) => {
      assert.equal(err.status, 401)
      assert.equal(err.code, 'STUDENT_TOKEN_EXPIRED')
      return true
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

// ---------------------------------------------------------------------------
// Choice storage — session-scoped mission choice (refresh recovery)
// ---------------------------------------------------------------------------

test('choice storage round-trips a valid choice and rejects garbage', () => {
  const map = new Map()
  const storage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) }
  const store = createChoiceStorage({ storage })

  assert.equal(store.read(), null)
  store.write({ streamId: 1, levelId: 3 })
  assert.deepEqual(store.read(), { streamId: 1, levelId: 3 })

  store.write({ streamId: 'x', levelId: null })
  assert.deepEqual(store.read(), { streamId: 1, levelId: 3 }, 'invalid writes are ignored')

  map.set('stemquest.student.game', 'not-json')
  assert.equal(store.read(), null, 'corrupt payloads read as no choice')

  store.clear()
  assert.equal(store.read(), null)
})

// ---------------------------------------------------------------------------
// Activity registry — exactly the ten approved types, all renderable
// ---------------------------------------------------------------------------

async function loadGameModules() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const registry = await vite.ssrLoadModule('/src/features/game-session/activity/activity-registry.js')
  const renderer = await vite.ssrLoadModule('/src/features/game-session/activity/activity-renderer.jsx')
  return { vite, registry, renderer }
}

test('registry covers exactly the ten approved activity types', async () => {
  const { vite, registry } = await loadGameModules()
  try {
    assert.deepEqual(
      [...registry.ACTIVITY_TYPES].sort(),
      ['drag-drop', 'fill-complete', 'find-word', 'matching', 'memory', 'number-logic', 'ordering', 'pattern', 'scenario-challenge', 'sorting'].sort()
    )
    for (const type of registry.ACTIVITY_TYPES) {
      assert.equal(typeof registry.ACTIVITY_RENDERERS[type], 'function', `${type} has a renderer`)
      assert.equal(registry.activityComponentFor(type), registry.ACTIVITY_RENDERERS[type])
    }
    assert.equal(registry.activityComponentFor('mcq'), null, 'unknown types render as unavailable')
  } finally {
    await vite.close()
  }
})

function demoStoreWithAllTen() {
  const store = createMemoryStore()
  seedStoreFromBaseData(store, demoBaseData())
  store.questions.push(
    ...demoMatchingQuestions(),
    ...demoOrderingQuestions(),
    ...demoSortingQuestions(),
    ...demoFillCompleteQuestions(),
    ...demoPatternQuestions(),
    ...demoMemoryQuestions(),
    ...demoScenarioQuestions(),
    ...demoNumberLogicQuestions()
  )
  return store
}

test('every one of the ten activity types renders through the real engine descriptor', async () => {
  const { vite, registry, renderer } = await loadGameModules()
  const RoundActivity = renderer.RoundActivity
  const store = demoStoreWithAllTen()
  const engine = createDefaultServerActivityEngine()
  const level = store.levels.find((l) => l.streamId === 1 && l.number === 1)
  assert.ok(level, 'level 1 exists in the demo data')

  try {
    for (const type of registry.ACTIVITY_TYPES) {
      const question = store.questions.find((q) => q.activityType === type && q.streamId === 1 && q.levelId === 1)
      assert.ok(question, `${type} has a published demo question`)
      const descriptor = buildSafeRoundDescriptor({
        activityEngine: engine,
        session: { id: 1, streamId: 1, levelId: 1 },
        round: { id: 1, roundNumber: 1, activityType: type },
        question,
        level,
        answeredCount: 0,
        totalRounds: 3,
      })
      const html = renderToStaticMarkup(
        React.createElement(RoundActivity, { round: descriptor, reducedMotion: true, onSubmit: () => {} })
      )
      assert.ok(html.length > 0, `${type} renders non-empty markup`)
      assert.ok(!html.includes('correctAnswer'), `${type} descriptor leaks no correct answers`)
      assert.match(html, /data-activity="[a-z-]+"/, `${type} renders its activity surface`)
    }
  } finally {
    await vite.close()
  }
})

// ---------------------------------------------------------------------------
// Game page — static SSR renders of the real page + result panels
// ---------------------------------------------------------------------------

async function loadPage() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = await vite.ssrLoadModule('/src/pages/StudentGamePage.jsx')
  const roundStore = await vite.ssrLoadModule('/src/features/game-session/round/round-store.js')
  return { vite, mod, roundStore: roundStore.useRoundStore }
}

function renderPage(mod, { entries, queries }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (queries) {
    for (const [key, data] of queries) client.setQueryData(key, data)
  }
  const router = createMemoryRouter(
    [{ path: '/student/game', element: React.createElement(mod.default) }],
    { initialEntries: entries }
  )
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client }, React.createElement(RouterProvider, { router }))
  )
}

function resetRoundStore() {
  useRoundStore.setState(createInitialRoundState())
}

const STREAM = { id: 1, slug: 'science', name: 'Science', levelCount: 5, unlockedCount: 1, completedCount: 0 }
const LEVEL = { id: 1, number: 1, name: 'Beginner', access: 'available', status: 'not-started', selectable: true, replayable: false }

test('page gates fully when there is no session token', async () => {
  globalThis.sessionStorage = { getItem: () => null }
  const { vite, mod } = await loadPage()
  resetRoundStore()
  try {
    const html = renderPage(mod, { entries: ['/student/game'] })
    assert.ok(!html.includes('Preparing your mission'), 'no game status without a token')
    assert.ok(!html.includes('Question 1 of 3'), 'no HUD without a token')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page redirects to the mission screen when there is no stream/level choice', async () => {
  globalThis.sessionStorage = {
    getItem: (key) => (key === 'stemquest.student.token' ? 'tok-1' : null),
  }
  const { vite, mod } = await loadPage()
  resetRoundStore()
  try {
    const html = renderPage(mod, {
      entries: [{ pathname: '/student/game', state: {} }],
      queries: [
        [['student', 'me', 'tok-1'], { student: { name: 'Amaya' } }],
      ],
    })
    assert.ok(!html.includes('Preparing your mission'), 'no game status without a choice')
    assert.ok(!html.includes('Question 1 of 3'))
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page renders the mission shell with the chosen stream + level', async () => {
  globalThis.sessionStorage = {
    getItem: (key) => (key === 'stemquest.student.token' ? 'tok-1' : null),
  }
  const { vite, mod } = await loadPage()
  resetRoundStore()
  try {
    const html = renderPage(mod, {
      entries: [{ pathname: '/student/game', state: { streamId: 1, levelId: 1 } }],
      queries: [
        [['student', 'me', 'tok-1'], { student: { name: 'Amaya' } }],
        [['mission', 'streams', 'tok-1'], { streams: [STREAM] }],
        [['mission', 'levels', 'tok-1', 1], { stream: STREAM, levels: [LEVEL] }],
      ],
    })
    assert.match(html, /STEM QUEST/)
    assert.match(html, /Amaya/)
    assert.match(html, /Science/)
    assert.match(html, /Level 1 · Beginner/)
    assert.match(html, /Preparing your mission…/, 'idle shell waits for the server start')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('page renders the playing shell with HUD, timer and activity for a live round', async () => {
  globalThis.sessionStorage = {
    getItem: (key) => (key === 'stemquest.student.token' ? 'tok-1' : null),
  }
  const store = demoStoreWithAllTen()
  const engine = createDefaultServerActivityEngine()
  const level = store.levels.find((l) => l.streamId === 1 && l.number === 1)
  const question = store.questions.find((q) => q.activityType === 'drag-drop' && q.streamId === 1 && q.levelId === 1)
  const descriptor = buildSafeRoundDescriptor({
    activityEngine: engine,
    session: { id: 7, streamId: 1, levelId: 1 },
    round: { id: 1, roundNumber: 1, activityType: 'drag-drop' },
    question,
    level,
    answeredCount: 0,
    totalRounds: 3,
  })

  const { vite, mod, roundStore } = await loadPage()
  // Zustand v5 SSR snapshots read the store's INITIAL state (hydration-safe),
  // so seed the initial state in place to render the playing shell.
  Object.assign(roundStore.getInitialState(), {
    phase: ROUND_PHASE.PLAYING,
    sessionId: 7,
    sessionCode: 'ABC123',
    currentRound: descriptor,
    roundResult: null,
    feedback: null,
    progress: null,
    score: null,
    nextRound: null,
    finished: null,
    error: null,
  })

  try {
    const html = renderPage(mod, {
      entries: [{ pathname: '/student/game', state: { streamId: 1, levelId: 1 } }],
      queries: [
        [['student', 'me', 'tok-1'], { student: { name: 'Amaya' } }],
        [['mission', 'streams', 'tok-1'], { streams: [STREAM] }],
        [['mission', 'levels', 'tok-1', 1], { stream: STREAM, levels: [LEVEL] }],
      ],
    })
    assert.match(html, /Question 1 of 3/, 'HUD shows the current question progress')
    assert.match(html, /role="timer"/, 'timer is a live region')
    assert.match(html, /90s/, 'display-only timer shows the allowed seconds')
    assert.match(html, /data-activity="drag-drop"/, 'the round activity renders')
    assert.match(html, /Item tray/, 'drag-drop surface renders')
  } finally {
    await vite.close()
    roundStore.setState(createInitialRoundState())
    Object.assign(roundStore.getInitialState(), createInitialRoundState())
    delete globalThis.sessionStorage
  }
})

const RESULT_FIXTURE = {
  phase: ROUND_PHASE.ROUND_RESULT,
  sessionId: 7,
  sessionCode: 'ABC123',
  currentRound: null,
  roundResult: { sessionId: 7, roundId: 1, correct: true, correctnessFraction: 1, pointsEarned: 100, detail: {} },
  feedback: { title: 'All correct', message: 'Every item is in the right zone.', guidance: 'Nice work.' },
  progress: { current: 1, total: 3, completed: false },
  score: { roundScore: 100, sessionRunningTotal: 100 },
  nextRound: { roundId: 2 },
  finished: null,
  error: null,
}

test('round result panel shows correctness, points and the next action', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.RoundResultPanel, { round: RESULT_FIXTURE, onNext: () => {} })
    )
    assert.match(html, /Correct/)
    assert.match(html, /Points earned: <strong>100<\/strong>/)
    assert.match(html, /Running total: <strong>100<\/strong> \/ 300/)
    assert.match(html, /All correct/)
    assert.match(html, /Next question/, 'not the last round yet')
  } finally {
    await vite.close()
  }
})

test('last-round result panel offers "See results"', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.RoundResultPanel, {
        round: { ...RESULT_FIXTURE, progress: { current: 3, total: 3, completed: true } },
        onNext: () => {},
      })
    )
    assert.match(html, /See results/)
  } finally {
    await vite.close()
  }
})

const FINISH_FIXTURE = {
  sessionId: 7,
  sessionCode: 'ABC123',
  sessionScore: 220,
  totalTimeMs: 97000,
  status: 'completed',
  result: 'passed',
  roundBreakdown: [
    { roundNumber: 1, pointsEarned: 100, attempts: 1, hintsUsed: 0, overtimeSeconds: 0 },
    { roundNumber: 2, pointsEarned: 70, attempts: 1, hintsUsed: 1, overtimeSeconds: 2 },
    { roundNumber: 3, pointsEarned: 50, attempts: 2, hintsUsed: 0, overtimeSeconds: 0 },
  ],
}

test('session complete panel shows score, code, time and breakdown', async () => {
  const { vite, mod } = await loadPage()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.SessionCompletePanel, {
        finished: FINISH_FIXTURE,
        reduceMotion: true,
        onPlayAgain: () => {},
        onBackToMission: () => {},
      })
    )
    assert.match(html, /MISSION VICTORY!/)
    assert.match(html, /Final Score: <strong>220<\/strong> \/ 300/)
    assert.match(html, /ABC123/)
    assert.match(html, /1m 37s/, 'total time is human readable')
    assert.equal((html.match(/Round \d/g) ?? []).length, 3, 'all three rounds in the breakdown')
    assert.match(html, /Play again/)
    assert.match(html, /Back to mission/)
  } finally {
    await vite.close()
  }
})