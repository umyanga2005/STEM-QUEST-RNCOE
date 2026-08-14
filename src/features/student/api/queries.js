/**
 * Student — TanStack Query hooks (Task 5.1).
 *
 * Server-owned student data lives here (D-016), not in a global Zustand
 * store. Only the authenticated `/me` query exists so far — there is no
 * server data for an unregistered visitor.
 */

import { useQuery } from '@tanstack/react-query'
import { studentApiClient } from './client.js'

/**
 * Fetches the safe public student profile for the current session token.
 * `enabled` keeps it silent when there is no token.
 */
export function useStudentMe(token) {
  return useQuery({
    queryKey: ['student', 'me', token ?? 'none'],
    queryFn: () => studentApiClient.getMe(token),
    enabled: Boolean(token),
    retry: 1,
    staleTime: 60 * 1000,
  })
}

export default { useStudentMe }