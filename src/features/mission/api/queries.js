/**
 * Mission — TanStack Query hooks (Task 5.2).
 *
 * Server-owned stream + level catalogue data lives here (D-016), keyed by
 * the session token so each student's progression summary stays isolated.
 * The UI never treats this as an entitlement gate — GameSessionService
 * remains the authority (D-033).
 */

import { useQuery } from '@tanstack/react-query'
import { studentApiClient } from '../../student/api/client.js'

/**
 * Active streams with their selection summaries for the current student.
 * `enabled` keeps it silent when there is no token.
 */
export function useMissionStreams(token) {
  return useQuery({
    queryKey: ['mission', 'streams', token ?? 'none'],
    queryFn: () => studentApiClient.getMissionStreams(token),
    enabled: Boolean(token),
    retry: 1,
    staleTime: 60 * 1000,
  })
}

/**
 * One stream plus its resolved level cards. Enabled only once a stream is
 * chosen, so selecting a stream triggers a scoped fetch — never all levels.
 */
export function useMissionLevels(token, streamId) {
  return useQuery({
    queryKey: ['mission', 'levels', token ?? 'none', streamId ?? 'none'],
    queryFn: () => studentApiClient.getMissionLevels(token, streamId),
    enabled: Boolean(token) && streamId != null,
    retry: 1,
    staleTime: 60 * 1000,
  })
}

export default { useMissionStreams, useMissionLevels }