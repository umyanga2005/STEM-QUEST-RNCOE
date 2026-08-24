/**
 * Admin — Supabase repository implementations (Task 5.9).
 *
 * Thin PostgREST adapter over `client` (a `@supabase/supabase-js` service-role
 * client, or an injectable fake in tests). Column names follow the 0001
 * migration exactly — no new tables, no schema changes (the `admins` table
 * exists since 0001, D-024).
 *
 * This read mirrors the `public.is_admin()` predicate (id present in `admins`
 * AND `is_active`): the service role cannot call the function meaningfully
 * because `auth.uid()` reads the request JWT, so the equivalent predicate runs
 * here instead. The browser never talks to Supabase directly for admin data.
 */

export function rowToAdminIdentity(row) {
  return {
    id: row.id,
    displayName: row.display_name ?? '',
    role: row.role ?? 'viewer',
  }
}

export class SupabaseAdminRepository {
  constructor({ client }) {
    this.client = client
  }

  async findActiveByAuthUserId(authUserId) {
    if (!authUserId) return null
    const { data, error } = await this.client
      .from('admins')
      .select('id, display_name, role')
      .eq('id', authUserId)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new Error(`admins findActiveByAuthUserId failed: ${error.message}`)
    return data ? rowToAdminIdentity(data) : null
  }
}

/** Builds the Supabase admin repository over one service-role client. */
export function createSupabaseAdminRepositories({ client }) {
  return {
    adminRepository: new SupabaseAdminRepository({ client }),
  }
}

export default {
  rowToAdminIdentity,
  createSupabaseAdminRepositories,
}