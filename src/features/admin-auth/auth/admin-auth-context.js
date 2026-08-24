/**
 * Admin auth — React context (Task 5.9).
 *
 * `useAdminAuth()` reads the admin auth snapshot + actions provided by
 * `AdminAuthProvider`. The provider defaults to the process-wide singleton
 * controller; tests inject a fake controller with a predetermined snapshot so
 * static renders are deterministic and never touch Supabase.
 *
 * The exposed value mirrors the controller snapshot (`{ status, admin, error }`)
 * plus the `signIn` / `signOut` / `resetError` actions. `admin` is always the
 * server-derived identity — never a client claim.
 */

import { createContext, useContext } from 'react'

export const AdminAuthContext = createContext(null)

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside <AdminAuthProvider>.')
  }
  return ctx
}

export default { AdminAuthContext, useAdminAuth }