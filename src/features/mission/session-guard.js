/**
 * Mission — session guard (Task 5.2).
 *
 * PURE helper to detect an expired/invalid session from a TanStack Query
 * result. The server decides expiry (StudentService.getMe, D-005); the UI
 * only reacts to a 401 by redirecting to registration. No local expiry
 * logic — a stale local check would be a second, competing authority.
 */

/**
 * @param {{ isError?: boolean, error?: { status?: number } }} query
 * @param {string|null|undefined} token
 * @returns {boolean} true when the query failed with HTTP 401 for an active token.
 */
export function isExpiredSession(query, token) {
  if (!token) return false
  return Boolean(query?.isError && query?.error?.status === 401)
}

export default { isExpiredSession }