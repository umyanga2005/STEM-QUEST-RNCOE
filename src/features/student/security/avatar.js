/**
 * Student — avatar upload guardrails (Task 5.1).
 *
 * Server-side MIME, extension and size checks BEFORE anything reaches the
 * private `student-avatars` bucket (which itself enforces
 * file_size_limit = 200 KB and jpeg/png/webp only). Storage paths are built
 * from the numeric student id + a validated MIME-derived extension — never
 * from a user-controlled filename, so path traversal is impossible.
 */

export const AVATAR_MAX_BYTES = 204800 // 200 KB — matches the bucket limit
export const AVATAR_ALLOWED_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])

const EXT_BY_MIME = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
})

/**
 * @param {{ size: number, mimeType: string }} file
 * @returns {{ ok: true, mimeType: string, extension: string } | { ok: false, reason: string, code: string }}
 */
export function validateAvatarFile({ size, mimeType }) {
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: 'The uploaded file is empty.', code: 'EMPTY' }
  }
  if (size > AVATAR_MAX_BYTES) {
    return { ok: false, reason: 'The photo is larger than 200 KB.', code: 'TOO_LARGE' }
  }
  const extension = EXT_BY_MIME[mimeType]
  if (!extension) {
    return {
      ok: false,
      reason: 'Only JPEG, PNG or WebP photos are accepted.',
      code: 'MIME',
    }
  }
  return { ok: true, mimeType, extension }
}

/**
 * Safe storage path: `{numeric-student-id}/profile.{ext}`. The numeric id
 * (never a name) and a validated extension make the path collision-free and
 * traversal-free.
 * @returns {string}
 */
export function buildAvatarPath(studentId, extension) {
  const id = String(studentId).replace(/\D+/g, '')
  if (id.length === 0) throw new Error('Invalid numeric student id for avatar path.')
  return `${id}/profile.${extension}`
}

export default {
  AVATAR_MAX_BYTES,
  AVATAR_ALLOWED_MIME,
  validateAvatarFile,
  buildAvatarPath,
}