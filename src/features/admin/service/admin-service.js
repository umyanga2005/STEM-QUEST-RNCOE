/**
 * Admin — authorization service (Task 5.9).
 *
 * The server-side admin identity boundary. Every `/api/admin/*` request
 * presents a Supabase Auth access token; this service:
 *
 *   1. Validates the token against the linked project (service-role client
 *      `auth.getUser(token)` — a real JWT signature/expiry check by Supabase).
 *   2. Resolves the ACTIVE administrator row from the existing
 *      `public.admins` table (D-024/D-028) — semantically identical to the
 *      `public.is_admin()` predicate, but callable from the server client
 *      where `auth.uid()` would read the service-role request context.
 *
 * Authority model: an authenticated Supabase identity that is NOT an active
 * admin is FORBIDDEN (403). An opaque student session token is not a JWT and
 * never validates (401) — so a student token can never grant admin access.
 *
 * Safe output surface: `{ id, displayName, role }`. Never tokens, hashes,
 * emails, passwords or service-role keys.
 */

import { adminError } from '../errors.js'

export class AdminService {
  constructor({ adminRepository, supabaseClient }) {
    this.adminRepository = adminRepository
    this.supabaseClient = supabaseClient ?? null
  }

  /**
   * Validates the bearer token and returns the safe admin identity.
   * @param {string|null} token - raw Supabase Auth access token
   * @returns {Promise<{ id: string, displayName: string, role: string }>}
   * @throws {AdminError} 401 missing/invalid/expired token, 403 non-admin
   */
  async resolveAdmin(token) {
    if (!token) throw adminError.unauthenticated('missing bearer token')
    if (!this.supabaseClient?.auth?.getUser) {
      throw adminError.unavailable('no Supabase Auth client bound')
    }

    const { data, error } = await this.supabaseClient.auth.getUser(token)
    if (error || !data?.user?.id) {
      // Supabase rejects anything that is not a valid, unexpired JWT for this
      // project — including opaque student session tokens.
      throw adminError.invalidToken('token rejected by Supabase Auth')
    }

    const admin = await this.adminRepository.findActiveByAuthUserId(data.user.id)
    if (!admin) {
      throw adminError.forbidden('identity is not an active administrator')
    }
    return admin
  }

  /** Safe `/me` payload: `{ admin: { id, displayName, role } }`. */
  async getMe(token) {
    return { admin: await this.resolveAdmin(token) }
  }
}

export default { AdminService }