/**
 * Admin auth — process-wide controller singleton (Task 5.9).
 *
 * The real app binds the default dependencies: the browser Supabase client
 * (anon key from Vite env), the `/api/admin/me` client and sessionStorage
 * token storage. SSR/test renders inject a fake controller via
 * `AdminAuthProvider` instead, so this module never touches the network when
 * imported (the Supabase client itself is only created on first sign-in).
 */

import { createAdminAuthController } from './admin-auth-controller.js'
import { createAdminAuthClient } from './admin-auth-client.js'
import { adminSessionStorage } from './admin-session.js'
import { adminApiClient } from '../api/client.js'

let shared = null

export function getAdminAuthController() {
  if (!shared) {
    shared = createAdminAuthController({
      authClientFactory: createAdminAuthClient,
      adminApiClient,
      storage: adminSessionStorage,
    })
  }
  return shared
}

export default { getAdminAuthController }