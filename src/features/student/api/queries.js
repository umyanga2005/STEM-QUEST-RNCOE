/**
 * Student — TanStack Query hooks (Task 5.1, extended Task 5.6).
 *
 * Server-owned student data lives here (D-016), not in a global Zustand
 * store. `/me` is the identity; `/me/progress` is the server-derived
 * progress overview for the Profile dashboard; updates mutate only the four
 * editable profile fields and invalidate `/me`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/**
 * Fetches the safe student progress overview (streams + overall). Enabled
 * only when a session token exists; one request, keyed by token so each
 * student's overview stays isolated.
 */
export function useStudentProgress(token) {
  return useQuery({
    queryKey: ['student', 'progress', token ?? 'none'],
    queryFn: () => studentApiClient.getProgress(token),
    enabled: Boolean(token),
    retry: 1,
    staleTime: 60 * 1000,
  })
}

/**
 * Updates the four editable profile fields (initials, name, school, grade).
 * On success invalidates `/me` so the header/identity always reflects the
 * latest server state.
 */
export function useUpdateProfile(token) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['student', 'update', token ?? 'none'],
    mutationFn: ({ initials, name, school, grade }) =>
      studentApiClient.updateProfile({ token, initials, name, school, grade }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'me', token ?? 'none'] })
    },
  })
}

/**
 * Uploads an optional profile photo for the authenticated student. On success
 * invalidates `/me` so the avatar URL refreshes.
 */
export function useUploadAvatar(token) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['student', 'avatar', token ?? 'none'],
    mutationFn: ({ file }) => studentApiClient.uploadAvatar({ token, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'me', token ?? 'none'] })
    },
  })
}

export default { useStudentMe, useStudentProgress, useUpdateProfile, useUploadAvatar }