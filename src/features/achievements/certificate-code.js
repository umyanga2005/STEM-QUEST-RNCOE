/**
 * Achievements — certificate code generator (Task 5.8).
 *
 * Public verification codes are random, unambiguous and collision-resistant:
 * `SQ-XXXXXX-XXXXXX` using the crypto RNG and an alphabet that drops look-alike
 * characters (no 0/O, 1/I/L). Uniqueness is ultimately enforced by the 0001
 * UNIQUE(certificate_code) constraint; the service retries on a collision.
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const GROUP_SIZE = 6
const GROUPS = 2

function randomString(length) {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

/** Generates a fresh certificate code like `SQ-3F8K2P-M7Q4X9`. */
export function makeCertificateCode() {
  const parts = []
  for (let i = 0; i < GROUPS; i += 1) parts.push(randomString(GROUP_SIZE))
  return `SQ-${parts.join('-')}`
}

export default {
  makeCertificateCode,
}