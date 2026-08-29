/**
 * Admin auth — frontend tests (Task 5.9).
 *
 * Framework-free node:test coverage of the admin console UI through Vite SSR
 * + ReactDOMServer, with an injected fake auth controller (deterministic, no
 * network, no Supabase). Asserts the a11y + content contract:
 *   - login page: sign-in form when unauthenticated; the "not configured"
 *     notice (never a dead form) when admin auth env is absent;
 *   - the protected shell: renders the 7 nav placeholders, server-derived
 *     identity + role and sign-out ONLY when authenticated — and renders
 *     nothing (redirect to /admin/login) when it is not.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

function fakeController(snapshot) {
  const listeners = new Set()
  let state = snapshot
  return {
    getSnapshot: () => ({
      ...state,
      admin: state.admin ? { ...state.admin } : null,
      error: state.error ? { ...state.error } : null,
    }),
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    restore: async () => {},
    signIn: async () => {},
    signOut: async () => {},
    resetError: () => {},
  }
}

async function loadModules() {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = {
    login: await vite.ssrLoadModule('/src/pages/AdminLoginPage.jsx'),
    shell: await vite.ssrLoadModule('/src/pages/AdminShell.jsx'),
    dashboard: await vite.ssrLoadModule('/src/pages/AdminDashboardPage.jsx'),
    placeholder: await vite.ssrLoadModule('/src/pages/AdminPlaceholderPage.jsx'),
    provider: await vite.ssrLoadModule('/src/features/admin-auth/auth/admin-auth-provider.jsx'),
  }
  return { vite, mod }
}

function renderWith(Provider, controller, Component, { entry = '/' } = {}) {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [entry] },
      React.createElement(Provider, { controller }, React.createElement(Component))
    )
  )
}

const AUTHENTICATED = {
  status: 'authenticated',
  admin: { id: 'u1', displayName: 'Console Admin', role: 'superadmin' },
  error: null,
}

test('login page renders the sign-in form when unauthenticated', async () => {
  const { vite, mod } = await loadModules()
  try {
    const html = renderWith(mod.provider.default, fakeController({ status: 'unauthenticated', admin: null, error: null }), mod.login.default)
    assert.match(html, /STEM QUEST/)
    assert.match(html, /Administrator Console/)
    assert.ok(html.includes('id="adm-email"') && html.includes('type="email"'), 'email field present')
    assert.ok(html.includes('id="adm-password"') && html.includes('type="password"'), 'password field present')
    assert.match(html, />Sign in</)
    assert.match(html, /Authorized administrators only/)
    assert.ok(!html.includes('not configured'), 'no config notice when auth is configured')
  } finally {
    await vite.close()
  }
})

test('login page shows the config notice (never a dead form) when admin auth env is absent', async () => {
  const { vite, mod } = await loadModules()
  try {
    const html = renderWith(mod.provider.default, fakeController({ status: 'unavailable', admin: null, error: null }), mod.login.default)
    assert.match(html, /not configured/i)
    assert.ok(!html.includes('id="adm-email"'), 'no form when auth is unavailable')
    assert.ok(!html.includes('id="adm-password"'))
  } finally {
    await vite.close()
  }
})

test('login page surfaces a stored sign-in error message', async () => {
  const { vite, mod } = await loadModules()
  try {
    const html = renderWith(
      mod.provider.default,
      fakeController({ status: 'unauthenticated', admin: null, error: { code: 'ADMIN_AUTH_FORBIDDEN', message: 'This account is not an administrator.' } }),
      mod.login.default
    )
    assert.match(html, /This account is not an administrator/)
  } finally {
    await vite.close()
  }
})

test('protected shell renders nav placeholders + identity only when authenticated', async () => {
  const { vite, mod } = await loadModules()
  try {
    const html = renderWith(mod.provider.default, fakeController(AUTHENTICATED), mod.shell.default, { entry: '/admin' })
    assert.match(html, /STEM QUEST/)
    assert.match(html, /Administrator Console/)
    for (const label of ['Dashboard', 'Question Builder', 'Students', 'Progress', 'Leaderboards', 'Badges &amp; Certs', 'Settings']) {
      assert.ok(html.includes(label), `nav placeholder "${label}" renders`)
    }
    assert.match(html, /Console Admin/)
    assert.match(html, />superadmin</, 'server-derived role renders')
    assert.match(html, />Sign out</)
    assert.ok(html.includes('href="/admin/questions"'), 'nav links point at the admin routes')
  } finally {
    await vite.close()
  }
})

test('protected shell renders nothing (redirect to login) when unauthenticated', async () => {
  const { vite, mod } = await loadModules()
  try {
    const html = renderWith(mod.provider.default, fakeController({ status: 'unauthenticated', admin: null, error: null }), mod.shell.default, { entry: '/admin' })
    assert.equal(html.trim(), '', 'guard leaks no shell content to unauthenticated visitors')
  } finally {
    await vite.close()
  }
})

test('protected shell shows a loading screen while restoring a session', async () => {
  const { vite, mod } = await loadModules()
  try {
    const html = renderWith(mod.provider.default, fakeController({ status: 'loading', admin: null, error: null }), mod.shell.default, { entry: '/admin' })
    assert.match(html, /Verifying administrator session/)
    assert.ok(!html.includes('Sign out'))
  } finally {
    await vite.close()
  }
})

test('dashboard index page welcomes the server-derived admin', async () => {
  const { vite, mod } = await loadModules()
  const { QueryClient, QueryClientProvider } = await vite.ssrLoadModule('@tanstack/react-query')
  const queryClient = new QueryClient()
  try {
    const html = renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(mod.provider.default, { controller: fakeController(AUTHENTICATED) }, React.createElement(mod.dashboard.default))
      )
    )
    assert.match(html, /Console Admin/)
  } finally {
    await vite.close()
  }
})

test('admin placeholder pages render their section title and description', async () => {
  const { vite, mod } = await loadModules()
  try {
    const html = renderToStaticMarkup(
      React.createElement(mod.placeholder.default, { title: 'Question Builder', description: 'Build and manage questions.' })
    )
    assert.match(html, /Question Builder/)
    assert.match(html, /Build and manage questions/)
  } finally {
    await vite.close()
  }
})

export default { tests: true }