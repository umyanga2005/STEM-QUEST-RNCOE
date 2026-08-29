/**
 * Admin Question Builder — TanStack Query hooks (Task 5.10).
 *
 * Every query/mutation carries the admin access token (read from
 * `adminSessionStorage`) and re-validates against `/api/admin/me` on the
 * server for each call. Mutations invalidate the list + detail cache so the
 * table and editor stay coherent. Token is captured once per mount, matching
 * the admin-auth snapshot pattern.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { questionApiClient, tokenFor } from '../client/client.js'

const KEYS = { list: ['admin', 'questions'], catalogue: ['admin', 'questions', 'catalogue'] }

const questionKey = (filters) => ['admin', 'questions', 'list', JSON.stringify(filters ?? {})]

export function useQuestionList(filters = {}, { enabled = true } = {}) {
  const token = tokenFor()
  return useQuery({
    queryKey: questionKey(filters),
    queryFn: () => questionApiClient.list(token, filters),
    enabled: enabled && Boolean(token),
    retry: 1,
    staleTime: 30 * 1000,
    refetchInterval: 20 * 1000,
  })
}

export function useQuestionDetail(id, { enabled = true } = {}) {
  const token = tokenFor()
  return useQuery({
    queryKey: ['admin', 'questions', 'detail', String(id)],
    queryFn: () => questionApiClient.getById(token, id),
    enabled: enabled && Boolean(token) && id != null,
    retry: 1,
    staleTime: 10 * 1000,
  })
}

export function useQuestionCatalogue() {
  const token = tokenFor()
  return useQuery({
    queryKey: KEYS.catalogue,
    queryFn: () => questionApiClient.catalogue(token),
    enabled: Boolean(token),
    staleTime: Infinity,
  })
}

export function useCreateQuestion() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: (draft) => questionApiClient.create(token, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] }),
  })
}

export function useUpdateQuestion(id) {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: (draft) => questionApiClient.update(token, id, draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] }),
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: (id) => questionApiClient.remove(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] }),
  })
}

// -- review + release lifecycle (Task 5.13) ------------------------------------

const reviewKey = (filters) => ['admin', 'questions', 'review', JSON.stringify(filters ?? {})]

export function useReviewQueue(filters = {}, { enabled = true } = {}) {
  const token = tokenFor()
  return useQuery({
    queryKey: reviewKey(filters),
    queryFn: () => questionApiClient.reviewQueue(token, filters),
    enabled: enabled && Boolean(token),
    retry: 1,
    staleTime: 15 * 1000,
  })
}

export function useQuestionAudit(id, { enabled = true } = {}) {
  const token = tokenFor()
  return useQuery({
    queryKey: ['admin', 'questions', 'audit', String(id)],
    queryFn: () => questionApiClient.audit(token, id),
    enabled: enabled && Boolean(token) && id != null,
    retry: 1,
    staleTime: 30 * 1000,
  })
}

/** Invalidates every question surface so a transition is reflected everywhere. */
function invalidateAll(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] })
}

export function useSubmitForReview() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: (id) => questionApiClient.submit(token, id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useApproveQuestion() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: ({ id, note }) => questionApiClient.approve(token, id, note),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useRejectQuestion() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: ({ id, note }) => questionApiClient.reject(token, id, note),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function usePublishQuestion() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: (id) => questionApiClient.publish(token, id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useArchiveQuestion() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: (id) => questionApiClient.archive(token, id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useCreateQuestionVersion() {
  const queryClient = useQueryClient()
  const token = tokenFor()
  return useMutation({
    mutationFn: (id) => questionApiClient.createVersion(token, id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export default {
  useQuestionList,
  useQuestionDetail,
  useQuestionCatalogue,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useReviewQueue,
  useQuestionAudit,
  useSubmitForReview,
  useApproveQuestion,
  useRejectQuestion,
  usePublishQuestion,
  useArchiveQuestion,
  useCreateQuestionVersion,
}