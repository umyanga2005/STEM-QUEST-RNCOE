/**
 * Student — registration flow controller (Task 5.1).
 *
 * A small, framework-free controller that the registration page drives. The
 * page stays presentation-only; this module owns the submit → token store →
 * avatar upload → success/error transitions so the flow is unit-testable
 * without a DOM (fake `api` + fake `storage`).
 *
 * Server data (the student profile) is deliberately NOT placed in a global
 * store — it stays in TanStack Query on the client (D-016).
 */

import { validateRegistrationInput } from '../validation.js'
import { NEXT_STEP_PATH } from './registration-fields.js'
import { StudentApiError } from '../api/client.js'

export function studentSafeError(err) {
  if (err instanceof StudentApiError) {
    return err.message || 'Registration could not be completed. Please try again.'
  }
  return 'Could not reach the server. Check your connection and try again.'
}

export function createRegistrationController({ api, storage }) {
  return {
    /**
     * Validates + registers. On success stores the session token (kept in
     * minimal browser storage, never the raw Supabase keys) and hands the
     * result to the caller for the optional avatar step.
     * @returns {Promise<{ ok: boolean, result?: object, fieldErrors?: object, message?: string }>}
     */
    async submit(fields, emit = () => {}) {
      const check = validateRegistrationInput(fields)
      if (!check.ok) {
        emit({ phase: 'field-error', fieldErrors: check.errors })
        return { ok: false, fieldErrors: check.errors }
      }
      emit({ phase: 'submitting' })
      try {
        const result = await api.registerStudent({
          initials: fields.initials,
          name: fields.name,
          school: fields.school,
          grade: fields.grade,
        })
        storage.write(result.token)
        emit({
          phase: 'avatar-upload',
          token: result.token,
          student: result.student,
          loginCode: result.loginCode,
          expiresAt: result.expiresAt,
        })
        return { ok: true, result }
      } catch (err) {
        const message = studentSafeError(err)
        emit({ phase: 'error', message })
        return { ok: false, message }
      }
    },

    /**
     * Optional post-registration avatar upload. Photo is NEVER required: a
     * failure must not block the student — it emits a success phase with a
     * non-blocking warning instead of a broken profile.
     * @returns {Promise<{ ok: boolean, avatarUrl?: string|null }>}
     */
    async uploadAvatar(token, file, emit = () => {}) {
      if (!token || !file) {
        emit({ phase: 'success', avatarWarning: false, avatarUrl: null })
        return { ok: true, avatarUrl: null }
      }
      emit({ phase: 'avatar-upload', token })
      try {
        const result = await api.uploadAvatar({ token, file })
        emit({ phase: 'success', avatarWarning: false, avatarUrl: result.student.avatarUrl })
        return { ok: true, avatarUrl: result.student.avatarUrl }
      } catch {
        emit({ phase: 'success', avatarWarning: true, avatarUrl: null })
        return { ok: false, avatarUrl: null }
      }
    },

    /** The next planned student stage (Task 5.2 not started — placeholder). */
    nextStep() {
      return NEXT_STEP_PATH
    },
  }
}

export default {
  createRegistrationController,
  studentSafeError,
}