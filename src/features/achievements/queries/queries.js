/**
 * Achievements — TanStack Query hooks (Task 5.8).
 *
 * Server-owned achievements data lives here (D-016), keyed by token so each
 * student's badges/certificates stay isolated. Downloads are imperative (a
 * fetch + blob), not a cached query; verification is a public read keyed by
 * the code itself.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { achievementsApiClient } from '../client/client.js'

/** Badge catalogue + awarded state for the session student. */
export function useAchievements(token) {
  return useQuery({
    queryKey: ['achievements', 'badges', token ?? 'none'],
    queryFn: () => achievementsApiClient.getAchievements(token),
    enabled: Boolean(token),
    retry: 1,
    staleTime: 60 * 1000,
  })
}

/** The session student's certificates (revoked excluded). */
export function useCertificates(token) {
  return useQuery({
    queryKey: ['achievements', 'certificates', token ?? 'none'],
    queryFn: () => achievementsApiClient.getCertificates(token),
    enabled: Boolean(token),
    retry: 1,
    staleTime: 60 * 1000,
  })
}

/** Imperative on-demand PDF download. */
export function useDownloadCertificatePdf(token) {
  return useMutation({
    mutationKey: ['achievements', 'pdf', token ?? 'none'],
    mutationFn: ({ certificateId }) => achievementsApiClient.downloadCertificatePdf({ token, certificateId }),
  })
}

/** Public verification of a certificate code (safe surface). */
export function useVerifyCertificate(certificateCode) {
  return useQuery({
    queryKey: ['achievements', 'verify', certificateCode ?? ''],
    queryFn: () => achievementsApiClient.verifyCertificate(certificateCode),
    enabled: Boolean(certificateCode),
    retry: 0,
    staleTime: 5 * 60 * 1000,
  })
}

export default { useAchievements, useCertificates, useDownloadCertificatePdf, useVerifyCertificate }