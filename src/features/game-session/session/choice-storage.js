/**
 * Game Session — mission choice storage (Task 5.3).
 *
 * Session-scoped helper that keeps the chosen { streamId, levelId } so a
 * refresh of `/student/game` can deterministically resume. This is NOT an
 * invented persistence layer: it stores the exact same navigation choice the
 * mission page already passes through React Router state, scoped to the tab
 * (cleared when the tab closes, matching the Task 5.1 token storage). The
 * server remains the session authority — `startSession` resumes the student's
 * existing active session for the stream, so the stored choice only decides
 * which stream to re-request.
 *
 * Injection-friendly (storage argument) so tests can drive it without a DOM.
 */

const DEFAULT_KEY = 'stemquest.student.game'

export function createChoiceStorage({ storage = globalThis.sessionStorage, key = DEFAULT_KEY } = {}) {
  return Object.freeze({
    read() {
      try {
        const raw = storage?.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed &&
          Number.isFinite(Number(parsed.streamId)) &&
          Number.isFinite(Number(parsed.levelId))
          ? { streamId: Number(parsed.streamId), levelId: Number(parsed.levelId) }
          : null
      } catch {
        return null
      }
    },
    write(choice) {
      try {
        if (!choice || !Number.isFinite(Number(choice.streamId)) || !Number.isFinite(Number(choice.levelId))) return
        storage?.setItem(key, JSON.stringify({ streamId: Number(choice.streamId), levelId: Number(choice.levelId) }))
      } catch {
        // Storage unavailable (private mode) — resume falls back to router
        // state; the tab still plays fine.
      }
    },
    clear() {
      try {
        storage?.removeItem(key)
      } catch {
        // ignore
      }
    },
  })
}

export const choiceStorage = createChoiceStorage()

export default choiceStorage