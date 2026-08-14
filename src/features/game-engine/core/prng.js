/**
 * Game Engine — seeded PRNG (Task 4.3, D-022).
 *
 * Deterministic, dependency-free utilities for reproducible session question
 * selection: a ≥ 64-bit session seed (hex string) and a mulberry32 PRNG
 * derived from it. Same seed + same pool + same constraints always produce
 * the same selection (design doc `05-activity-engine-design.md` §8).
 */

/**
 * Generates a 64-bit session seed (16 hex chars) via crypto.getRandomValues.
 * Falls back to Math.random only in runtimes without crypto (non-browser,
 * non-Node edge cases); the server path always has crypto.
 * @returns {string}
 */
export function generateSessionSeed() {
  const bytes = new Uint8Array(8)
  const cryptoObj = globalThis.crypto
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Deterministic 32-bit hash of any seed string/number. Folds the key down to
 * the uint32 state mulberry32 consumes.
 * @param {string|number} seed
 * @returns {number} uint32
 */
export function hashSeedToUint32(seed) {
  const str = String(seed)
  let h = 0x9e3779b9
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x85ebca6b)
  }
  return (h ^ (h >>> 13)) >>> 0
}

/**
 * mulberry32 — small, fast, deterministic 32-bit PRNG.
 * @param {number} seed - uint32 initial state
 * @returns {() => number} float in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Builds a seeded rng from any seed value.
 * @param {string|number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  return mulberry32(hashSeedToUint32(seed))
}

/**
 * In-place Fisher–Yates shuffle using the supplied rng.
 * @template T
 * @param {T[]} arr
 * @param {() => number} [rng] - defaults to Math.random
 * @returns {T[]} the same array reference
 */
export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Picks one element via the rng.
 * @template T
 * @param {T[]} arr
 * @param {() => number} rng
 * @returns {T|undefined}
 */
export function pickOne(arr, rng) {
  if (arr.length === 0) return undefined
  return arr[Math.floor(rng() * arr.length)]
}

export default {
  generateSessionSeed,
  hashSeedToUint32,
  mulberry32,
  createSeededRng,
  shuffle,
  pickOne,
}
