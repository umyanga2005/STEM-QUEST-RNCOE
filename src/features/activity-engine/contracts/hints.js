/**
 * Activity Engine — hints contract (Task 4.1, report §10).
 *
 * `plugin.buildHints(question)` returns an array of progressive hints:
 * `[{ id, level, text }]` ordered by level (1 = most generic). The engine
 * normalizes and sorts them. Hints are authored content, never derived from
 * the correct answer.
 */

/**
 * Normalizes and validates a plugin's raw hints output.
 *
 * @param {Array} raw - array of `{ id?, level?, text }`
 * @returns {Array} frozen, level-ordered array of `{ id, level, text }`
 */
export function normalizeHints(raw) {
  if (!Array.isArray(raw)) return Object.freeze([])
  const hints = raw
    .filter((h) => h !== null && typeof h === 'object' && !Array.isArray(h))
    .filter((h) => typeof h.text === 'string' && h.text.trim() !== '')
    .map((h, index) =>
      Object.freeze({
        id: typeof h.id === 'string' && h.id.trim() !== '' ? h.id : `hint-${index + 1}`,
        level: Number.isInteger(h.level) && h.level >= 1 ? h.level : index + 1,
        text: h.text.trim(),
      })
    )
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))
  return Object.freeze(hints)
}