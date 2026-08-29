/**
 * Admin: Badges & certificates queries
 *
 * `certificates`, `student_badges` and `students` are gated by `is_admin()`
 * RLS, so reads go through the admin-scoped Supabase client; `badges` (the
 * catalogue) carries an `anon`-role policy. Table/column names follow the
 * 0001 migration.
 */

import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, getAdminSupabaseClient } from '../../../lib/supabase-client.js'

export function useAdminAchievementsOverview() {
  return useQuery({
    queryKey: ['admin', 'achievements'],

    queryFn: async () => {
      const adminClient = getAdminSupabaseClient()
      const [
        { data: certificates, error: certError },
        { data: studentBadges, error: badgesError },
        { data: badgeCatalog, error: catalogError },
        { data: students, error: studentsError },
      ] = await Promise.all([
        adminClient
          .from('certificates')
          .select('id, certificate_code, student_id, stream_id, title, earned_at, revoked')
          .order('earned_at', { ascending: false })
          .limit(50),
        adminClient
          .from('student_badges')
          .select('id, student_id, badge_id, awarded_at')
          .order('awarded_at', { ascending: false })
          .limit(50),
        getSupabaseClient().from('badges').select('id, slug, name, description, icon'),
        adminClient.from('students').select('id, full_name'),
      ])
      if (certError) throw certError
      if (badgesError) throw badgesError
      if (catalogError) throw catalogError
      if (studentsError) throw studentsError

      const studentNameById = new Map((students ?? []).map((s) => [s.id, s.full_name]))
      const badgeById = new Map((badgeCatalog ?? []).map((b) => [b.id, b]))

      const certificateRows = (certificates ?? []).map((c) => ({
        ...c,
        studentName: studentNameById.get(c.student_id) ?? `Student #${c.student_id}`,
      }))
      const badgeAwardRows = (studentBadges ?? []).map((sb) => ({
        ...sb,
        studentName: studentNameById.get(sb.student_id) ?? `Student #${sb.student_id}`,
        badgeName: badgeById.get(sb.badge_id)?.name ?? 'Unknown badge',
        badgeIcon: badgeById.get(sb.badge_id)?.icon ?? '🏅',
      }))

      return {
        certificates: certificateRows,
        badgeAwards: badgeAwardRows,
        badgeCatalog: badgeCatalog ?? [],
        totals: { certificates: certificateRows.length, badgeAwards: badgeAwardRows.length },
      }
    },

    staleTime: 30_000,
  })
}

/**
 * One-off lookup for the certificate verification tool — queries live
 * (not the capped 50-row overview list) so older certificates still verify.
 */
export async function verifyCertificateCode(rawCode) {
  const code = rawCode.trim().toUpperCase()
  if (!code) return null

  const adminClient = getAdminSupabaseClient()
  const { data: cert, error } = await adminClient
    .from('certificates')
    .select('certificate_code, student_id, stream_id, title, earned_at, revoked')
    .eq('certificate_code', code)
    .maybeSingle()
  if (error) throw error
  if (!cert) return { code, found: false }

  const [{ data: student }, { data: stream }] = await Promise.all([
    adminClient.from('students').select('full_name').eq('id', cert.student_id).maybeSingle(),
    getSupabaseClient().from('streams').select('name').eq('id', cert.stream_id).maybeSingle(),
  ])

  return {
    code: cert.certificate_code,
    found: true,
    valid: !cert.revoked,
    studentName: student?.full_name ?? `Student #${cert.student_id}`,
    stream: stream?.name ?? cert.title,
    issuedAt: cert.earned_at ? new Date(cert.earned_at).toLocaleDateString() : '—',
  }
}
