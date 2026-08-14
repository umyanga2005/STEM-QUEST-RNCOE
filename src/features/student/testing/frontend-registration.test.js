/**
 * Student — frontend flow tests (Task 5.1).
 *
 * Framework-free node:test coverage of the browser modules: shared validation,
 * field descriptors, the registration controller (fake api + storage), token
 * storage, the fetch API client (stubbed fetch), and one static render of the
 * real registration page through Vite SSR (no new testing framework — Vite +
 * ReactDOMServer only). The page test asserts the a11y contract: labelled
 * fields, aria-describedby hints, aria-live status, and a working submit
 * path wiring the controller.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'

import { validateRegistrationInput, parseGrade, GRADE_OPTIONS } from '../validation.js'
import {
  REGISTRATION_FIELDS,
  PROFILE_PHOTO,
  NEXT_STEP_PATH,
  SUBMIT_LABEL,
} from '../registration/registration-fields.js'
import { createRegistrationController, studentSafeError } from '../registration/controller.js'
import { createTokenStorage } from '../session/token-storage.js'
import { studentApiClient, StudentApiError } from '../api/client.js'

// ---------------------------------------------------------------------------
// Shared validation (same module the server enforces — client checks agree)
// ---------------------------------------------------------------------------

test('client validation accepts a complete valid registration', () => {
  const check = validateRegistrationInput({ initials: 'A', name: 'Amaya Silva', school: 'Colombo High', grade: 7 })
  assert.equal(check.ok, true)
  assert.deepEqual(check.value, { initials: 'A', name: 'Amaya Silva', school: 'Colombo High', grade: 7 })
})

test('client validation reports per-field errors for blank input', () => {
  const check = validateRegistrationInput({})
  assert.equal(check.ok, false)
  assert.ok(check.errors.initials)
  assert.ok(check.errors.name)
  assert.ok(check.errors.school)
  assert.ok(check.errors.grade)
})

test('client validation flags foreign (privileged) keys', () => {
  const check = validateRegistrationInput({ ...VALID_BODY(), isAdmin: true })
  assert.equal(check.ok, false)
  assert.equal(check.unexpected, 'isAdmin')
})

test('parseGrade accepts 6..11, rejects 5/12/decimals/text', () => {
  assert.equal(parseGrade(6), 6)
  assert.equal(parseGrade('11'), 11)
  assert.equal(parseGrade('07'), 7)
  assert.equal(parseGrade(6.5), null)
  assert.equal(parseGrade(5), null)
  assert.equal(parseGrade(12), null)
  assert.equal(parseGrade('abc'), null)
  assert.equal(parseGrade(''), null)
  assert.equal(parseGrade(null), null)
})

test('GRADE_OPTIONS are exactly 6..11', () => {
  assert.deepEqual([...GRADE_OPTIONS], [6, 7, 8, 9, 10, 11])
})

// ---------------------------------------------------------------------------
// Field descriptors — the page renders exactly these
// ---------------------------------------------------------------------------

test('registration field descriptors cover the four allowed inputs with labels', () => {
  assert.deepEqual(
    REGISTRATION_FIELDS.map((f) => f.name),
    ['initials', 'name', 'school', 'grade']
  )
  for (const field of REGISTRATION_FIELDS) {
    assert.equal(typeof field.label, 'string')
    assert.equal(field.required, true)
  }
  const grade = REGISTRATION_FIELDS.find((f) => f.name === 'grade')
  assert.ok(!grade.maxLength, 'grade is a select, not a length-limited input')
})

test('profile photo descriptor is optional, size-gated and MIME-scoped', () => {
  assert.equal(PROFILE_PHOTO.required, false)
  assert.equal(PROFILE_PHOTO.maxBytes, 204800)
  assert.match(PROFILE_PHOTO.accept, /image\/jpeg,image\/png,image\/webp/)
})

test('NEXT_STEP_PATH points at the game area (Task 5.2 placeholder)', () => {
  assert.equal(NEXT_STEP_PATH, '/student/game')
  assert.equal(typeof SUBMIT_LABEL, 'string')
})

// ---------------------------------------------------------------------------
// Registration controller — flow logic without a DOM
// ---------------------------------------------------------------------------

function VALID_BODY() {
  return { initials: 'A', name: 'Amaya Silva', school: 'Colombo High', grade: 7 }
}

function fakeStorage() {
  const map = new Map()
  return {
    store: map,
    read: () => map.get('token') ?? null,
    write: (t) => map.set('token', t),
    clear: () => map.delete('token'),
    setItem: (k, v) => map.set(k, v),
    getItem: (k) => map.get(k) ?? null,
    removeItem: (k) => map.delete(k),
  }
}

function fakeApi({ register = async (p) => ({ token: 'tok', loginCode: 'ABC234', expiresAt: 1, student: { name: p.name } }), uploadAvatar = async ({ token, file }) => ({ student: { avatarUrl: `signed://${token}/${file.name}` } }) } = {}) {
  return {
    registerStudent: register,
    uploadAvatar,
  }
}

test('controller submit succeeds, stores the token, and emits phases in order', async () => {
  const events = []
  const storage = fakeStorage()
  const controller = createRegistrationController({ api: fakeApi(), storage })
  const result = await controller.submit(VALID_BODY(), (e) => events.push(e.phase))
  assert.equal(result.ok, true)
  assert.equal(storage.store.get('token'), 'tok')
  assert.deepEqual(events, ['submitting', 'avatar-upload'])
})

test('controller submit surfaces per-field errors without calling the api', async () => {
  let called = false
  const api = fakeApi({ register: async () => { called = true } })
  const controller = createRegistrationController({ api, storage: fakeStorage() })
  const result = await controller.submit({}, () => {})
  assert.equal(result.ok, false)
  assert.ok(result.fieldErrors.name)
  assert.equal(called, false)
})

test('controller submit rejects and reports an API error (never raw internals)', async () => {
  const api = fakeApi({
    register: async () => {
      throw new StudentApiError(400, { code: 'STUDENT_INVALID_INPUT', category: 'VALIDATION', message: 'Please check the details you entered and try again.' })
    },
  })
  const events = []
  const controller = createRegistrationController({ api, storage: fakeStorage() })
  const result = await controller.submit(VALID_BODY(), (e) => events.push(e))
  assert.equal(result.ok, false)
  assert.equal(result.message, 'Please check the details you entered and try again.')
  assert.equal(events[events.length - 1].phase, 'error')
  assert.equal(events[events.length - 1].message, 'Please check the details you entered and try again.')
})

test('controller submit reports a friendly message for network failures', async () => {
  const api = fakeApi({ register: async () => { throw new TypeError('fetch failed') } })
  const controller = createRegistrationController({ api, storage: fakeStorage() })
  const result = await controller.submit(VALID_BODY(), () => {})
  assert.equal(result.ok, false)
  assert.match(result.message, /server/i)
  assert.equal(studentSafeError(new TypeError('fetch failed')), 'Could not reach the server. Check your connection and try again.')
})

test('controller avatar upload is optional and never blocks success', async () => {
  const controller = createRegistrationController({ api: fakeApi(), storage: fakeStorage() })
  const skipped = await controller.uploadAvatar(null, null, () => {})
  assert.equal(skipped.ok, true)
  assert.equal(skipped.avatarUrl, null)

  const good = await controller.uploadAvatar('tok', { name: 'a.jpg' }, () => {})
  assert.equal(good.ok, true)
  assert.match(good.avatarUrl, /^signed:\/\/tok\//)
})

test('controller avatar failure degrades to success with a warning', async () => {
  const api = fakeApi({
    uploadAvatar: async () => {
      throw new Error('bucket down')
    },
  })
  const events = []
  const controller = createRegistrationController({ api, storage: fakeStorage() })
  const result = await controller.uploadAvatar('tok', { name: 'a.jpg' }, (e) => events.push(e.phase))
  assert.equal(result.ok, false)
  assert.equal(result.avatarUrl, null)
  assert.deepEqual(events, ['avatar-upload', 'success'])
})

test('controller nextStep routes to the Task 5.2 placeholder path', () => {
  const controller = createRegistrationController({ api: fakeApi(), storage: fakeStorage() })
  assert.equal(controller.nextStep(), '/student/game')
})

// ---------------------------------------------------------------------------
// Token storage — minimal, session-scoped, failure-tolerant
// ---------------------------------------------------------------------------

test('token storage reads, writes and clears through the injected storage', () => {
  const map = new Map()
  const storage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  }
  const ts = createTokenStorage({ storage })
  assert.equal(ts.read(), null)
  ts.write('tok-123')
  assert.equal(ts.read(), 'tok-123')
  assert.equal(map.get('stemquest.student.token'), 'tok-123')
  ts.clear()
  assert.equal(ts.read(), null)
})

test('token storage tolerates unavailable storage (private mode)', () => {
  const throwing = {
    getItem: () => { throw new Error('denied') },
    setItem: () => { throw new Error('denied') },
    removeItem: () => { throw new Error('denied') },
  }
  const ts = createTokenStorage({ storage: throwing })
  assert.equal(ts.read(), null)
  ts.write('tok')
  ts.clear()
  const none = createTokenStorage({ storage: null })
  assert.equal(none.read(), null)
  none.write('x')
})

// ---------------------------------------------------------------------------
// API client — browser fetch contract (no Supabase in the browser)
// ---------------------------------------------------------------------------

test('client sends strict JSON with the Bearer header and surfaces errors', async () => {
  const calls = []
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ token: 't1', student: { name: 'Amaya' } }), { status: 201, headers: { 'content-type': 'application/json' } })
  }
  try {
    const result = await studentApiClient.registerStudent(VALID_BODY())
    assert.equal(result.token, 't1')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/api/student/register')
    assert.equal(calls[0].init.method, 'POST')
    assert.equal(calls[0].init.headers['content-type'], 'application/json')
    assert.equal(JSON.parse(calls[0].init.body).grade, 7)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client attaches the token and parses error payloads as StudentApiError', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    assert.equal(init.headers.authorization, 'Bearer tok-1')
    return new Response(JSON.stringify({ error: { code: 'STUDENT_TOKEN_EXPIRED', category: 'SECURITY', message: 'Your session could not be verified. Please start again.' } }), { status: 401, headers: { 'content-type': 'application/json' } })
  }
  try {
    await assert.rejects(studentApiClient.getMe('tok-1'), (err) => {
      assert.ok(err instanceof StudentApiError)
      assert.equal(err.status, 401)
      assert.equal(err.code, 'STUDENT_TOKEN_EXPIRED')
      assert.equal(err.category, 'SECURITY')
      assert.equal(err.message, 'Your session could not be verified. Please start again.')
      return true
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client uploads avatars as multipart form data', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/student/me/avatar')
    assert.equal(init.method, 'PUT')
    assert.equal(init.headers.authorization, 'Bearer tok-1')
    assert.ok(init.body instanceof FormData)
    assert.ok(init.body.has('photo'))
    return new Response(JSON.stringify({ student: { avatarUrl: 'signed://x' } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const result = await studentApiClient.uploadAvatar({ token: 'tok-1', file: new Blob([new Uint8Array(4)], { type: 'image/jpeg' }) })
    assert.equal(result.student.avatarUrl, 'signed://x')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('client maps non-JSON failures safely', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('boom', { status: 500 })
  try {
    await assert.rejects(studentApiClient.getMe('tok'), (err) => {
      assert.ok(err instanceof StudentApiError)
      assert.equal(err.status, 500)
      assert.equal(err.message, 'Request failed (500)')
      return true
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

// ---------------------------------------------------------------------------
// One static render of the real registration page (a11y contract)
// ---------------------------------------------------------------------------

test('registration page static-renders with labelled fields and aria status', async () => {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    const mod = await vite.ssrLoadModule('/src/pages/StudentRegisterPage.jsx')
    const Component = mod.default
    const { default: React } = await vite.ssrLoadModule('react')
    const { renderToStaticMarkup } = await vite.ssrLoadModule('react-dom/server')
    const { MemoryRouter } = await vite.ssrLoadModule('react-router')
    const { QueryClient, QueryClientProvider } = await vite.ssrLoadModule('@tanstack/react-query')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const element = React.createElement(
      MemoryRouter,
      null,
      React.createElement(QueryClientProvider, { client }, React.createElement(Component))
    )
    const html = renderToStaticMarkup(element)

    assert.match(html, /STEM QUEST/, 'page title renders')
    assert.match(html, /Student Registration/)
    for (const field of REGISTRATION_FIELDS) {
      const id = `sr-field-${field.name}`
      assert.ok(html.includes(`for="${id}"`), `${field.name} label is connected`)
      assert.ok(html.includes(`id="${id}"`), `${field.name} control has an id`)
    }
    assert.match(html, /aria-live="polite"/, 'status region announces updates')
    assert.ok(html.includes(SUBMIT_LABEL), 'primary submit action present')
    assert.match(html, /Profile photo \(optional\)/, 'photo is optional, never required')
    assert.ok(!html.includes('isAdmin'), 'no privileged field ever renders')
  } finally {
    await vite.close()
  }
})