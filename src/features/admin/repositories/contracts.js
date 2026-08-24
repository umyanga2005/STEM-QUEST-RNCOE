/**
 * Admin — repository contracts (Task 5.9).
 *
 * The admin authorization boundary reads exactly one thing from the existing
 * 0001 schema: an ACTIVE administrator record keyed by the validated Supabase
 * Auth user id (D-024/D-028). `public.is_admin()` remains the RLS authority
 * for admin-context SQL; this repository provides the same predicate over the
 * server client (where `auth.uid()` would read the request JWT, not the
 * service-role session).
 *
 * A repository must implement:
 *
 *   findActiveByAuthUserId(authUserId) → AdminIdentity | null
 *     Returns `{ id, displayName, role }` only when a `public.admins` row
 *     exists with `id = authUserId` AND `is_active = true`; `null` otherwise.
 *
 * Identity shapes are plain data — never tokens, hashes or secrets.
 */

/**
 * @typedef {{
 *   id: string,        // Supabase Auth user uuid
 *   displayName: string,
 *   role: string,      // superadmin | admin | content_editor | viewer
 * }} AdminIdentity
 */

export default { __contract: true }