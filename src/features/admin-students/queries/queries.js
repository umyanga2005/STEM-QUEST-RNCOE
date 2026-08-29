/**
 * Admin: Student list queries
 *
 * Reads go through the admin-scoped Supabase client (../../../lib/supabase-client.js)
 * so RLS's `is_admin()` check passes — `students` and `game_sessions` are
 * gated to the `authenticated` + admin role, not the public anon key.
 * Table/column names follow the 0001 migration (`students`, `full_name`,
 * `login_code`, `game_sessions.student_id`).
 *
 * `student_sessions` (login timestamps) is intentionally NOT readable via a
 * table policy — it holds hashed tokens and is backend-only by design
 * (D-040). Last-login instead goes through the `get_student_last_logins()`
 * RPC (supabase/migrations/0005_student_last_login.sql), a SECURITY DEFINER
 * function that exposes only { student_id, last_login_at } and is gated by
 * the same is_admin() check as everything else here. Best-effort: a failure
 * (e.g. the migration hasn't been applied yet) degrades to "Never" for every
 * student rather than breaking the whole page.
 */

import { useQuery } from '@tanstack/react-query'
import { getAdminSupabaseClient } from '../../../lib/supabase-client.js'

/**
 * Fetch all registered students for the admin panel.
 * Normalises DB column names to camelCase for the UI.
 */
export function useAdminStudentList() {
    return useQuery({
        queryKey: ['admin', 'students'],

        queryFn: async () => {
            const client = getAdminSupabaseClient()

            // 1) Fetch student profiles
            const { data: students, error: studentsError } = await client
                .from('students')
                .select('id, full_name, grade, login_code, created_at, status')
                .order('created_at', { ascending: false })

            if (studentsError) throw studentsError

            const rows = students ?? []
            if (rows.length === 0) return { students: [] }

            // 2) Count game sessions per student
            const studentIds = rows.map((s) => s.id)
            const { data: sessions } = await client
                .from('game_sessions')
                .select('student_id')
                .in('student_id', studentIds)

            const missionCounts = {}
                ; (sessions ?? []).forEach((s) => {
                    missionCounts[s.student_id] = (missionCounts[s.student_id] ?? 0) + 1
                })

            // 3) Most-recent login timestamp per student (best-effort — see
            //    module comment; a failure here must not break the table).
            const lastLoginMap = {}
            try {
                const { data: lastLogins, error: lastLoginError } = await client.rpc('get_student_last_logins')
                if (lastLoginError) throw lastLoginError
                    ; (lastLogins ?? []).forEach((row) => {
                        lastLoginMap[row.student_id] = row.last_login_at
                    })
            } catch {
                // Best-effort: falls back to "Never" for everyone (e.g. the
                // 0005 migration hasn't been applied to this project yet).
            }

            // 4) Normalise shape for the UI
            return {
                students: rows.map((s) => ({
                    id: s.id,
                    name: s.full_name ?? '—',
                    grade: s.grade ?? '—',
                    kioskCode: s.login_code ?? '—',
                    registered: s.created_at ? s.created_at.slice(0, 10) : '—',
                    missions: missionCounts[s.id] ?? 0,
                    status: s.status ?? 'active',
                    lastLogin: lastLoginMap[s.id]
                        ? new Date(lastLoginMap[s.id]).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                        })
                        : 'Never',
                })),
            }
        },

        staleTime: 30_000, // 30 s cache — fine for an admin table
        refetchInterval: 20_000, // polling instead of Realtime — no extra socket/connection budget
    })
}
