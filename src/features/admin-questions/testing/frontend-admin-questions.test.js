/**
 * Admin Question Builder — frontend tests (Task 5.10).
 *
 * Browser-side coverage: the fetch client contract (Bearer token from
 * adminSessionStorage, QuestionApiError mapping with field errors), the
 * client-safe draft validator (payload-only via the CLIENT engine — no
 * correct-answer schema ever registered), the per-type templates, and static
 * SSR renders of the list/editor/preview components. The renders assert the
 * a11y + content contract: previews never render correctAnswer/meta, the
 * editor keeps the correct-answer block collapsed and admin-only, and the
 * list exposes only student-visible fields.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { questionApiClient, QuestionApiError } from '../client/client.js'
import { validateClientDraft, getClientEngine } from '../validation/validate-draft.js'
import { buildQuestionTemplate, QUESTION_ACTIVITY_LABELS } from '../templates/templates.js'
import { makeDragDropDraft, seedQuestionCatalogue } from '../../admin/questions/testing/fixtures.js'

const TOKEN = 'admin-access-token'

function stubSession(token) {
  const store = new Map()
  if (token != null) store.set('stemquest.admin.token', token)
  globalThis.sessionStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  }
}

// ---------------------------------------------------------------------------
// Browser client — fetch contract
// ---------------------------------------------------------------------------

test('client sends the admin access token as a Bearer header on every call', async () => {
  stubSession(TOKEN)
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const payload = url.includes('/catalogue')
      ? { streams: [], activityTypes: [] }
      : url.includes('/1')
        ? { question: { id: 1 } }
        : { questions: [] }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await questionApiClient.list(TOKEN, { status: 'draft', q: 'cell' })
    await questionApiClient.getById(TOKEN, 1)
    await questionApiClient.catalogue(TOKEN)
    await questionApiClient.create(TOKEN, { prompt: 'x' })
    await questionApiClient.update(TOKEN, 1, { prompt: 'y' })
    await questionApiClient.remove(TOKEN, 1)

    assert.equal(calls[0].url, '/api/admin/questions/?status=draft&q=cell')
    assert.equal(calls[0].init.headers.authorization, `Bearer ${TOKEN}`)
    assert.equal(calls[1].url, '/api/admin/questions/1')
    assert.equal(calls[2].url, '/api/admin/questions/catalogue')
    assert.equal(calls[3].init.method, 'POST')
    assert.equal(calls[4].init.method, 'PUT')
    assert.equal(calls[5].init.method, 'DELETE')
    assert.equal(calls[3].init.headers['content-type'], 'application/json')
  } finally {
    globalThis.fetch = origFetch
    delete globalThis.sessionStorage
  }
})

test('client surfaces server validation errors with field paths', async () => {
  stubSession(TOKEN)
  const origFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 'QUESTION_VALIDATION_FAILED',
          category: 'AUTHORING',
          message: 'nope',
          fields: [{ path: '/prompt', code: 'ENVELOPE', message: 'must be string' }],
        },
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    )
  try {
    await assert.rejects(questionApiClient.create(TOKEN, {}), (err) => {
      assert.ok(err instanceof QuestionApiError)
      assert.equal(err.status, 400)
      assert.equal(err.code, 'QUESTION_VALIDATION_FAILED')
      assert.equal(err.fields[0].path, '/prompt')
      return true
    })
  } finally {
    globalThis.fetch = origFetch
    delete globalThis.sessionStorage
  }
})

test('media client uploads as multipart and previews/removes with the Bearer token', async () => {
  stubSession(TOKEN)
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const payload = url.includes('/url')
      ? { url: 'signed://question-media/…' }
      : url.startsWith('/api/admin/questions/media?') && init.method === 'DELETE'
        ? { removed: true }
        : { media: { ref: 'question-media/owner/uploads/uuid.jpg' } }
    return new Response(JSON.stringify(payload), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  try {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'x.jpg', { type: 'image/jpeg' })
    const uploaded = await questionApiClient.uploadMedia(TOKEN, file)
    assert.equal(uploaded.media.ref, 'question-media/owner/uploads/uuid.jpg')
    assert.equal(calls[0].url, '/api/admin/questions/media')
    assert.equal(calls[0].init.method, 'POST')
    assert.equal(calls[0].init.headers.authorization, `Bearer ${TOKEN}`)
    assert.ok(calls[0].init.body instanceof FormData)
    assert.ok(calls[0].init.body.has('file'))
    assert.equal(calls[0].init.headers['content-type'], undefined, 'multipart boundary is set by fetch, never hard-coded')

    const { url } = await questionApiClient.mediaUrl(TOKEN, 'question-media/owner/uploads/uuid.jpg')
    assert.equal(url, 'signed://question-media/…')
    assert.equal(calls[1].url, '/api/admin/questions/media/url?ref=question-media%2Fowner%2Fuploads%2Fuuid.jpg')
    assert.equal(calls[1].init.headers.authorization, `Bearer ${TOKEN}`)

    const { removed } = await questionApiClient.removeMedia(TOKEN, 'question-media/owner/uploads/uuid.jpg')
    assert.equal(removed, true)
    assert.equal(calls[2].init.method, 'DELETE')
  } finally {
    globalThis.fetch = origFetch
    delete globalThis.sessionStorage
  }
})

test('media client surfaces server media errors with field codes', async () => {
  stubSession(TOKEN)
  const origFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 'QUESTION_MEDIA_VALIDATION_FAILED',
          category: 'VALIDATION',
          message: 'The uploaded image is not valid.',
          fields: [{ path: '/file', code: 'TOO_LARGE', message: 'The image is larger than 1 MB.' }],
        },
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    )
  try {
    await assert.rejects(
      questionApiClient.uploadMedia(TOKEN, new File([new Uint8Array(2)], 'x.png', { type: 'image/png' })),
      (err) => {
        assert.ok(err instanceof QuestionApiError)
        assert.equal(err.status, 400)
        assert.equal(err.code, 'QUESTION_MEDIA_VALIDATION_FAILED')
        assert.equal(err.fields[0].code, 'TOO_LARGE')
        return true
      }
    )
  } finally {
    globalThis.fetch = origFetch
    delete globalThis.sessionStorage
  }
})

test('client lifecycle methods hit the review routes with the Bearer token', async () => {
  stubSession(TOKEN)
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const payload = url.endsWith('/review')
      ? { questions: [] }
      : url.includes('/audit')
        ? { actions: [] }
        : { question: { id: 5 } }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    await questionApiClient.submit(TOKEN, 5)
    await questionApiClient.approve(TOKEN, 5, 'looks good')
    await questionApiClient.reject(TOKEN, 5, 'fix the prompt')
    await questionApiClient.publish(TOKEN, 5)
    await questionApiClient.archive(TOKEN, 5)
    await questionApiClient.createVersion(TOKEN, 5)
    await questionApiClient.reviewQueue(TOKEN, { stream: 'science' })
    await questionApiClient.audit(TOKEN, 5)

    assert.equal(calls[0].url, '/api/admin/questions/5/submit')
    assert.equal(calls[0].init.method, 'POST')
    assert.equal(calls[1].url, '/api/admin/questions/5/approve')
    assert.deepEqual(JSON.parse(calls[1].init.body), { note: 'looks good' })
    assert.equal(calls[2].url, '/api/admin/questions/5/reject')
    assert.deepEqual(JSON.parse(calls[2].init.body), { note: 'fix the prompt' })
    assert.equal(calls[3].url, '/api/admin/questions/5/publish')
    assert.equal(calls[4].url, '/api/admin/questions/5/archive')
    assert.equal(calls[5].url, '/api/admin/questions/5/versions')
    assert.equal(calls[6].url, '/api/admin/questions/review?stream=science')
    assert.equal(calls[7].url, '/api/admin/questions/5/audit')
    for (const call of calls) {
      assert.equal(call.init.headers.authorization, `Bearer ${TOKEN}`, call.url)
    }
  } finally {
    globalThis.fetch = origFetch
    delete globalThis.sessionStorage
  }
})

// ---------------------------------------------------------------------------
// Templates — per-type starter payloads
// ---------------------------------------------------------------------------

test('templates cover every DB activity type and stay payload-only', () => {
  for (const slug of Object.keys(QUESTION_ACTIVITY_LABELS)) {
    const tpl = buildQuestionTemplate(slug)
    assert.equal(tpl.activityType, slug)
    assert.ok(tpl.payload && typeof tpl.payload === 'object', `${slug} has a payload`)
    assert.equal('correctAnswer' in tpl, true, 'templates still author correctAnswer separately')
    assert.ok(!JSON.stringify(tpl.payload).includes('correctAnswer'), 'payload template is client-safe')
  }
})

test('every freshly built template passes client payload validation', () => {
  for (const slug of Object.keys(QUESTION_ACTIVITY_LABELS)) {
    const tpl = buildQuestionTemplate(slug)
    const result = validateClientDraft({
      ...tpl,
      prompt: 'A sufficiently long prompt for the template.',
      explanation: 'A sufficiently long explanation for the template.',
    })
    assert.equal(result.valid, true, `${slug}: ${JSON.stringify(result.errors)}`)
  }
})

// ---------------------------------------------------------------------------
// Client-safe validator — never touches correct-answer schemas
// ---------------------------------------------------------------------------

test('validator flags the same envelope rules the server enforces', () => {
  const result = validateClientDraft({
    ...makeDragDropDraft(),
    prompt: 'short',
    explanation: 'short',
    gradeMin: 0,
  })
  assert.equal(result.valid, false)
  const paths = result.errors.map((e) => e.path)
  assert.ok(paths.includes('/prompt'))
  assert.ok(paths.includes('/explanation'))
  assert.ok(paths.includes('/gradeMin'))
})

test('validator reports payload schema violations via the client engine', () => {
  const draft = makeDragDropDraft()
  draft.payload.items = 'nope'
  const result = validateClientDraft(draft)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.path.startsWith('/payload')), JSON.stringify(result.errors))
})

test('client engine exposes no correct-answer schema and no server-only methods', () => {
  const engine = getClientEngine()
  assert.equal(engine.getCorrectAnswerSchema, undefined)
  assert.equal(engine.validateAnswer, undefined)
  assert.equal(engine.schemaRegistry.correctAnswerSchemas, null)
})

test('validateClientDraft passes a full valid drag-drop draft', () => {
  const result = validateClientDraft(makeDragDropDraft())
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

// ---------------------------------------------------------------------------
// Static renders (SSR)
// ---------------------------------------------------------------------------

async function loadComponent(path) {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = await vite.ssrLoadModule(path)
  return { vite, mod }
}

const PREVIEW_ROW = {
  id: 7,
  stream: 'science',
  level: 1,
  activityType: 'drag-drop',
  prompt: 'Match each part of a cell to its role.',
  gradeMin: 6,
  gradeMax: 8,
  difficulty: 2,
  status: 'draft',
  tags: [],
  version: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function withQuery(ui, data) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['admin', 'questions', 'list', '{"limit":50,"offset":0}'], data)
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(MemoryRouter, { initialEntries: ['/admin/questions'] }, ui)
    )
  )
}

test('QuestionList renders prompt/type/grade/difficulty/status but never correctAnswer or meta', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionList.jsx')
  try {
    const html = withQuery(React.createElement(mod.default), { questions: [PREVIEW_ROW] })
    assert.ok(html.includes('Match each part of a cell to its role.'))
    assert.ok(html.includes('drag drop'))
    assert.ok(html.includes('6–8'))
    assert.ok(html.includes('Draft'))
    assert.ok(!html.includes('correctAnswer'), 'list must never render correctAnswer')
    assert.ok(!html.includes('meta'), 'list must never render meta')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('QuestionList shows the empty state when there are no questions', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionList.jsx')
  try {
    const html = withQuery(React.createElement(mod.default), { questions: [] })
    assert.ok(html.includes('No questions yet'))
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('QuestionPreview renders only student-visible payload fields', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionPreview.jsx')
  try {
    const element = React.createElement(mod.default, { draft: makeDragDropDraft() })
    const html = renderToStaticMarkup(element)
    assert.ok(html.includes('Match each part of a cell to its role.'))
    assert.ok(html.includes('Nucleus'))
    assert.ok(html.includes('Controls the cell'))
    assert.ok(!html.includes('correctAnswer'), 'preview must never render the answer')
    assert.ok(!html.includes('mappings'), 'preview must never render answer mappings')
  } finally {
    await vite.close()
  }
})

test('QuestionPreview image interaction shows the ref placeholder during SSR (no fetch, no secrets)', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionPreview.jsx')
  try {
    const draft = buildQuestionTemplate('image-interaction')
    draft.prompt = 'A sufficiently long prompt for the template.'
    draft.payload.image = { ref: 'question-media/pending/pending/pending.png', alt: 'An example diagram' }
    const html = renderToStaticMarkup(React.createElement(mod.default, { draft }))
    assert.ok(html.includes('question-media/pending/pending/pending.png'), 'ref placeholder renders')
    assert.ok(html.includes('An example diagram'), 'alt renders as the label')
    assert.ok(!html.includes('signed'), 'no signed URL is ever rendered server-side')
  } finally {
    await vite.close()
  }
})

test('MediaReferenceEditor renders upload/replace/remove controls via SSR without sessionStorage', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/primitives.jsx')
  try {
    const media = { ref: 'question-media/pending/pending/pending.png', alt: '' }
    const withMedia = renderToStaticMarkup(
      React.createElement(mod.MediaReferenceEditor, { media, onChange: () => {} })
    )
    assert.ok(withMedia.includes('Storage path'))
    assert.ok(withMedia.includes('Alt text'))
    assert.ok(withMedia.includes('Replace image'))
    assert.ok(withMedia.includes('Remove image'))
    assert.ok(withMedia.includes('question-media/pending/pending/pending.png'))

    const empty = renderToStaticMarkup(
      React.createElement(mod.MediaReferenceEditor, { media: null, onChange: () => {} })
    )
    assert.ok(empty.includes('Upload image'))
    assert.ok(!empty.includes('Remove image'))
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('QuestionEditor renders the correct-answer block collapsed and admin-only', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionEditor.jsx')
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['admin', 'questions', 'catalogue'], seedQuestionCatalogue())
    const element = React.createElement(mod.default, { questionId: null })
    const html = renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(MemoryRouter, { initialEntries: ['/admin/questions/new'] }, element)
      )
    )
    assert.ok(html.includes('Correct answer'))
    assert.ok(html.includes('Never sent to students'))
    assert.ok(html.includes('Student-facing preview'))
    assert.ok(html.includes('Create question'))
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('AdminQuestionsPage wires a New question link to the editor route', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/pages/AdminQuestionsPage.jsx')
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['admin', 'questions', 'list', '{"limit":50,"offset":0}'], { questions: [] })
    const html = renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/admin/questions'] },
          React.createElement(Routes, null, React.createElement(Route, { path: '/admin/questions', element: React.createElement(mod.default) }))
        )
      )
    )
    assert.ok(html.includes('Question Builder'))
    assert.ok(html.includes('href="/admin/questions/new"'), 'new-question link points at the editor')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

// ---------------------------------------------------------------------------
// Review + release lifecycle UI (Task 5.13)
// ---------------------------------------------------------------------------

const REVIEW_ROW = {
  id: 7,
  prompt: 'Match each part of a cell to its role.',
  activityType: 'drag-drop',
  gradeMin: 6,
  gradeMax: 8,
  difficulty: 2,
  status: 'draft',
  version: 1,
  explanation: 'Cell parts control what the cell does.',
  correctAnswer: { left: ['Nucleus', 'Mitochondria'], right: ['Controls the cell', 'Makes energy'] },
  meta: {
    objective: 'Identify the role of cell parts.',
    feedback: { correct: 'Correct!', incorrect: 'Not quite.' },
    review: { state: 'pending', submittedByAdminId: 'admin-1', submittedAt: '2026-01-01T00:00:00.000Z', version: 1 },
  },
}

function withReviewDetail(data, element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['admin', 'questions', 'detail', '7'], { question: data })
  client.setQueryData(['admin', 'questions', 'audit', '7'], {
    actions: [
      { id: 1, action: 'QUESTION_CREATED', adminId: 'admin-1', targetType: 'question', targetId: 7, details: null, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 2, action: 'QUESTION_SUBMITTED', adminId: 'admin-1', targetType: 'question', targetId: 7, details: null, createdAt: '2026-01-02T00:00:00.000Z' },
    ],
  })
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(MemoryRouter, { initialEntries: ['/admin/questions/7/review'] }, element)
    )
  )
}

test('ReviewQueue renders pending drafts with prompt/type/grade/difficulty/version but never correctAnswer or meta', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/ReviewQueue.jsx')
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['admin', 'questions', 'review', '{}'], { questions: [REVIEW_ROW] })
    const html = renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(MemoryRouter, { initialEntries: ['/admin/questions/review'] }, React.createElement(mod.default))
      )
    )
    assert.ok(html.includes('Match each part of a cell to its role.'))
    assert.ok(html.includes('drag drop'))
    assert.ok(html.includes('6–8'))
    assert.ok(html.includes('v1'))
    assert.ok(html.includes('href="/admin/questions/7/review"'), 'row links into the review detail')
    assert.ok(!html.includes('correctAnswer'), 'queue must never render the answer')
    assert.ok(!html.includes('Nucleus'), 'queue must never render answer payloads')
    assert.ok(!html.includes('submittedByAdminId'), 'queue must not leak review meta')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('ReviewQueue shows the empty state when nothing awaits review', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/ReviewQueue.jsx')
  try {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['admin', 'questions', 'review', '{}'], { questions: [] })
    const html = renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(MemoryRouter, { initialEntries: ['/admin/questions/review'] }, React.createElement(mod.default))
      )
    )
    assert.ok(html.includes('Nothing is awaiting review'))
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('ReviewDetail renders the admin-only answer, review envelope and audit trail for a pending question', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/ReviewDetail.jsx')
  try {
    const html = withReviewDetail(REVIEW_ROW, React.createElement(mod.default, { questionId: 7 }))
    assert.ok(html.includes('Match each part of a cell to its role.'))
    assert.ok(html.includes('Correct answer (admin-only)'))
    assert.ok(html.includes('Nucleus'), 'reviewer sees the correct answer')
    assert.ok(html.includes('Pending'), 'pending state badge renders')
    assert.ok(html.includes('Submitted by admin-1'))
    assert.ok(html.includes('Identify the role of cell parts.'), 'objective renders')
    assert.ok(html.includes('correct, incorrect'), 'feedback template keys render')
    assert.ok(html.includes('Approve'))
    assert.ok(html.includes('Reject'))
    assert.ok(html.includes('QUESTION_SUBMITTED'), 'audit trail renders')
    assert.ok(html.includes('href="/admin/questions/7/edit"'), 'open-in-editor link renders')
    assert.ok(!html.includes('question-media/'), 'no media refs rendered server-side')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

test('ReviewDetail shows archive and no approve/reject for a published question', async () => {
  stubSession(TOKEN)
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/ReviewDetail.jsx')
  try {
    const html = withReviewDetail({ ...REVIEW_ROW, status: 'published', meta: { ...REVIEW_ROW.meta, review: { state: 'approved', reviewerAdminId: 'admin-2', reviewedAt: '2026-01-03T00:00:00.000Z', version: 1 } } }, React.createElement(mod.default, { questionId: 7 }))
    assert.ok(html.includes('Archive'), 'published questions offer archive')
    assert.ok(!html.includes('>Approve<'), 'no approve on a published question')
    assert.ok(!html.includes('>Reject<'), 'no reject on a published question')
  } finally {
    await vite.close()
    delete globalThis.sessionStorage
  }
})

export default { tests: true }