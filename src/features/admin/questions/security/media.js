/**
 * Admin Question Builder — question media guardrails (Task 5.12).
 *
 * Server-side MIME, extension, size and CONTENT checks BEFORE anything
 * reaches the private `question-media` bucket (which itself enforces
 * file_size_limit = 1 MB and jpeg/png/webp only — 0003 migration).
 *
 * Storage paths are always server-generated (`question-media/{owner}/{uploads}/
 * {uuid}.{ext}`) from the admin identity + a validated, content-sniffed
 * extension — never from a client filename, so path traversal is impossible
 * and every ref satisfies the media reference schema pattern
 * (`schemas/common/media.schema.json`).
 */

export const QUESTION_MEDIA_BUCKET = 'question-media'
export const QUESTION_MEDIA_MAX_BYTES = 1048576 // 1 MB — matches the bucket limit
export const QUESTION_MEDIA_ALLOWED_MIME = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
export const QUESTION_MEDIA_URL_TTL_SECONDS = 3600
export const QUESTION_MEDIA_FOLDER = 'uploads'

/** Mirrors the media.schema.json ref pattern exactly. */
export const MEDIA_REF_PATTERN = /^question-media\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9._-]+\.(jpe?g|png|webp)$/

/** True only for a well-formed, pattern-scoped storage ref. */
export function isSafeMediaRef(ref) {
  return typeof ref === 'string' && MEDIA_REF_PATTERN.test(ref)
}

const EXT_BY_MIME = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
})

/** Reads the first N bytes of an ArrayBuffer-like as a hex string. */
function headerHex(buffer, length) {
  const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer ?? [])
  let hex = ''
  for (let i = 0; i < Math.min(length, view.length); i += 1) {
    hex += view[i].toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Content sniffing — never trusts the declared MIME on its own. A text file
 * relabelled `image/png` or a mismatched declared type is rejected.
 *   JPEG: FF D8 FF …
 *   PNG:  89 50 4E 47 0D 0A 1A 0A
 *   WebP: RIFF … WEBP (52 49 46 46 … 57 45 42 50)
 * @param {Uint8Array} buffer
 * @returns {'jpg'|'png'|'webp'|null}
 */
export function sniffImageExtension(buffer) {
  const head = headerHex(buffer, 12)
  if (head.startsWith('ffd8ff')) return 'jpg'
  if (head.startsWith('89504e470d0a1a0a')) return 'png'
  if (head.startsWith('52494646') && head.length >= 24 && head.slice(16, 24) === '57454250') return 'webp'
  return null
}

/** Keeps only the characters the media ref segments allow (a-z, 0-9, -). */
export function sanitizeMediaSegment(value) {
  const cleaned = String(value ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  return cleaned.length > 0 ? cleaned : null
}

/**
 * @param {{ size: number, mimeType: string, buffer: Uint8Array }} file
 * @returns {{ ok: true, mimeType: string, extension: string } | { ok: false, reason: string, code: string }}
 */
export function validateQuestionMediaFile({ size, mimeType, buffer }) {
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, reason: 'The uploaded file is empty.', code: 'EMPTY' }
  }
  if (size > QUESTION_MEDIA_MAX_BYTES) {
    return { ok: false, reason: 'The image is larger than 1 MB.', code: 'TOO_LARGE' }
  }
  const extension = EXT_BY_MIME[mimeType]
  if (!extension) {
    return {
      ok: false,
      reason: 'Only JPEG, PNG or WebP images are accepted.',
      code: 'MIME',
    }
  }
  const sniffed = sniffImageExtension(buffer)
  if (!sniffed) {
    return {
      ok: false,
      reason: 'The file content is not a recognizable image.',
      code: 'CONTENT',
    }
  }
  if (sniffed !== extension) {
    return {
      ok: false,
      reason: 'The file type does not match its content.',
      code: 'MISMATCH',
    }
  }
  return { ok: true, mimeType, extension }
}

/**
 * Safe storage path: `question-media/{owner}/{uploads}/{uuid}.{ext}`. The
 * owner segment is a sanitized admin identity (never free-form input) and the
 * filename is a server-generated uuid + validated extension, so the result is
 * collision-free, traversal-free and always matches the media schema pattern.
 * @returns {string}
 */
export function buildQuestionMediaPath(owner, uuid, extension) {
  const safeOwner = sanitizeMediaSegment(owner)
  if (!safeOwner) throw new Error('Invalid admin identity for media path.')
  const safeUuid = String(uuid ?? '').replace(/[^a-z0-9-]/gi, '').toLowerCase()
  if (!safeUuid) throw new Error('Invalid media id for storage path.')
  return `question-media/${safeOwner}/${QUESTION_MEDIA_FOLDER}/${safeUuid}.${extension}`
}

/** Extracts every media ref from a payload (recursive, pattern-scoped). */
export function collectMediaRefs(value, out = []) {
  if (typeof value === 'string') {
    if (MEDIA_REF_PATTERN.test(value)) out.push(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMediaRefs(item, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) collectMediaRefs(child, out)
  }
  return out
}

export default {
  QUESTION_MEDIA_BUCKET,
  QUESTION_MEDIA_MAX_BYTES,
  QUESTION_MEDIA_ALLOWED_MIME,
  QUESTION_MEDIA_URL_TTL_SECONDS,
  MEDIA_REF_PATTERN,
  isSafeMediaRef,
  sniffImageExtension,
  sanitizeMediaSegment,
  validateQuestionMediaFile,
  buildQuestionMediaPath,
  collectMediaRefs,
}