/**
 * Student — token/secret primitives (Task 5.1).
 *
 * CSPRNG-backed opaque session tokens and short kiosk login codes, plus
 * SHA-256 hashing for storage (D-040: only `student_sessions.token_hash` is
 * persisted; plaintext tokens are returned once and never stored or logged).
 *
 * Uses Node's `crypto` only — no Math.random(), no predictable ids, no
 * timestamp-only tokens, no student id as token.
 */

import { createHash, randomBytes } from 'node:crypto'

/** Token entropy: 32 bytes = 256 bits (≥ 128-bit requirement, D-040). */
const TOKEN_BYTES = 32

/** Unambiguous alphabet (no 0/O/1/I) so kiosk codes can be read aloud. */
const LOGIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LOGIN_CODE_LENGTH = 6

/**
 * Generates a cryptographically secure opaque session token (base64url).
 * @returns {string}
 */
export function generateSessionToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/**
 * SHA-256 hex digest of a session token — the ONLY form stored in the DB.
 * @param {string} token
 * @returns {string}
 */
export function hashSessionToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/**
 * Generates a short kiosk login_code (unique per student) used by the future
 * login flow (D-005/D-040). CSPRNG-backed.
 * @returns {string}
 */
export function generateLoginCode() {
  const bytes = randomBytes(LOGIN_CODE_LENGTH)
  return Array.from(bytes, (b) => LOGIN_CODE_ALPHABET[b % LOGIN_CODE_ALPHABET.length]).join('')
}

export default {
  generateSessionToken,
  hashSessionToken,
  generateLoginCode,
}