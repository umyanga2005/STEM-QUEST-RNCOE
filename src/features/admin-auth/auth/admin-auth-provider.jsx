/**
 * Admin auth — provider (Task 5.9).
 *
 * Wraps the admin console (login + shell) with the auth snapshot. On mount it
 * asks the controller to restore any stored session (validated against the
 * server); afterwards every state change re-renders consumers. The default
 * controller is the process-wide singleton; tests inject a fake one with a
 * pre-set snapshot for deterministic static renders.
 */

import { useEffect, useMemo, useState } from 'react'
import { AdminAuthContext } from './admin-auth-context.js'
import { getAdminAuthController } from './admin-auth-singleton.js'

export function AdminAuthProvider({ controller = getAdminAuthController(), children }) {
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot())

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => setSnapshot(controller.getSnapshot()))
    controller.restore?.()
    return unsubscribe
  }, [controller])

  const value = useMemo(
    () => ({
      ...snapshot,
      signIn: controller.signIn,
      signOut: controller.signOut,
      resetError: controller.resetError,
    }),
    [snapshot, controller]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export default AdminAuthProvider