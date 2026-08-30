/**
 * Game Session — TanStack Query hooks (Task 5.3).
 *
 * Server-owned session data lives here (D-016), keyed by the session token.
 * The three server calls are mutations (they change server state); the current
 * round is a query enabled only once a session id exists, so a resume path can
 * re-fetch the safe descriptor without a new round being submitted. All
 * authority stays in GameSessionService — the hooks only ferry safe payloads.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { gameStudentClient } from './student-client.js'

export function useStartSession(token) {
  return useMutation({
    mutationKey: ['game', 'start', token ?? 'none'],
    mutationFn: ({ streamId, levelId }) => gameStudentClient.startSession({ token, streamId, levelId }),
  })
}

export function useSubmitRound(token) {
  return useMutation({
    mutationKey: ['game', 'submit', token ?? 'none'],
    mutationFn: ({ sessionId, roundId, response, interactionMetrics }) =>
      gameStudentClient.submitRound({ token, sessionId, roundId, response, interactionMetrics }),
  })
}

export function useFinishSession(token) {
  return useMutation({
    mutationKey: ['game', 'finish', token ?? 'none'],
    mutationFn: ({ sessionId }) => gameStudentClient.finishSession({ token, sessionId }),
  })
}

export function useAbandonSession(token) {
  return useMutation({
    mutationKey: ['game', 'abandon', token ?? 'none'],
    mutationFn: ({ sessionId }) => gameStudentClient.abandonSession({ token, sessionId }),
  })
}

export function useCurrentRound(token, sessionId) {
  return useQuery({
    queryKey: ['game', 'current', token ?? 'none', sessionId ?? 'none'],
    queryFn: () => gameStudentClient.getCurrentRound({ token, sessionId }),
    enabled: Boolean(token) && sessionId != null,
    retry: 1,
    staleTime: 10 * 1000,
  })
}

export default {
  useStartSession,
  useSubmitRound,
  useFinishSession,
  useAbandonSession,
  useCurrentRound,
}