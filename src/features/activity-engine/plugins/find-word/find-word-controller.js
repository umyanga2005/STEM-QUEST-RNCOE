/**
 * Activity Engine — find-word controller (Task 9).
 *
 * Pure grid/scoring logic for the word-search plugin, kept separate from the
 * plugin contract wiring so it is unit-testable without an engine instance.
 * Correct-answer placements (`correctAnswer.placements`) never leave this
 * module and the plugin's server-only methods — the client only ever
 * receives the grid + word list (`payload`), never coordinates.
 */

/** Inclusive straight-line cell path from (r1,c1) to (r2,c2). Null when the
 * two points are not aligned horizontally, vertically or diagonally. */
export function cellsBetween(r1, c1, r2, c2) {
  const dr = Math.sign(r2 - r1)
  const dc = Math.sign(c2 - c1)
  const rowSpan = Math.abs(r2 - r1)
  const colSpan = Math.abs(c2 - c1)
  if (rowSpan !== 0 && colSpan !== 0 && rowSpan !== colSpan) return null
  const len = Math.max(rowSpan, colSpan) + 1
  return Array.from({ length: len }, (_, i) => ({ row: r1 + i * dr, col: c1 + i * dc }))
}

/** Reads the letters along a cell path from the grid, upper-cased. Null on
 * an out-of-bounds cell. */
export function wordAlongPath(grid, cells) {
  let out = ''
  for (const { row, col } of cells) {
    const line = grid[row]
    if (line === undefined || line[col] === undefined) return null
    out += line[col]
  }
  return out.toUpperCase()
}

/** True when a placement's straight-line path spells `label` (forwards or
 * backwards) in the grid — the cross-document integrity check authoring
 * tooling and the runtime scorer both rely on. */
export function placementSpells(grid, placement, label) {
  const cells = cellsBetween(placement.startRow, placement.startCol, placement.endRow, placement.endCol)
  if (!cells) return false
  const found = wordAlongPath(grid, cells)
  if (found === null) return false
  const target = label.toUpperCase().replace(/\s/g, '')
  return found === target || found === target.split('').reverse().join('')
}

/**
 * Cross-document integrity checks: every placement must reference a known
 * word, every word must have exactly one placement, and the placement's
 * straight-line path in `payload.grid` must actually spell the word. Mirrors
 * the shape of `validateBlankAnswers` (fill-complete) / `validatePairs`
 * (matching) — an authoring-time bug, never a student mistake, so callers
 * (the plugin's `validateAnswer`, and authoring tooling) throw/report on it.
 */
export function validateFindWordAnswer(payload, correctAnswer) {
  const errors = []
  const words = Array.isArray(payload?.words) ? payload.words : []
  const grid = Array.isArray(payload?.grid) ? payload.grid : []
  const wordIds = new Set(words.map((w) => w.id))
  const placements = Array.isArray(correctAnswer?.placements) ? correctAnswer.placements : []
  const seen = new Set()

  for (const placement of placements) {
    const { wordId } = placement ?? {}
    if (!wordIds.has(wordId)) {
      errors.push({
        ruleId: 'find-word.placements-match-grid',
        message: `placement references unknown word "${wordId}"`,
        path: '/',
      })
      continue
    }
    if (seen.has(wordId)) {
      errors.push({
        ruleId: 'find-word.placements-match-grid',
        message: `word "${wordId}" has more than one placement`,
        path: '/',
      })
      continue
    }
    seen.add(wordId)
    const word = words.find((w) => w.id === wordId)
    if (!placementSpells(grid, placement, word.label)) {
      errors.push({
        ruleId: 'find-word.placements-match-grid',
        message: `placement for word "${wordId}" does not spell "${word.label}" in the grid`,
        path: '/',
      })
    }
  }
  for (const word of words) {
    if (!seen.has(word.id)) {
      errors.push({
        ruleId: 'find-word.placements-match-grid',
        message: `word "${word.id}" has no placement`,
        path: '/',
      })
    }
  }
  return errors
}

/**
 * Scores a submission's selections against the authored placements.
 * Denominator is always `payload.words.length` (honest denominator — a
 * truncated or duplicated submission can never inflate the fraction).
 * @returns {{ total: number, correctCount: number, results: Array }}
 */
export function scoreSelections(payload, correctAnswer, selections) {
  const grid = payload.grid
  const placementByWordId = new Map(correctAnswer.placements.map((p) => [p.wordId, p]))
  const claimedByWordId = new Map()
  for (const sel of selections) {
    if (!claimedByWordId.has(sel.wordId)) claimedByWordId.set(sel.wordId, sel)
  }

  const results = payload.words.map((word) => {
    const claim = claimedByWordId.get(word.id)
    const placement = placementByWordId.get(word.id)
    const cells = claim ? cellsBetween(claim.startRow, claim.startCol, claim.endRow, claim.endCol) : null
    const spelled = cells ? wordAlongPath(grid, cells) : null
    const target = word.label.toUpperCase().replace(/\s/g, '')
    const correct =
      Boolean(claim) &&
      Boolean(placement) &&
      spelled !== null &&
      (spelled === target || spelled === target.split('').reverse().join(''))
    return Object.freeze({ wordId: word.id, found: Boolean(claim), correct })
  })

  return {
    total: results.length,
    correctCount: results.filter((r) => r.correct).length,
    results: Object.freeze(results),
  }
}

const DIRECTIONS = [
  [0, 1], [0, -1], [1, 0], [-1, 0],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]

/**
 * Searches `grid` for `label` in all 8 directions and returns its straight-
 * line placement, or null when it does not appear. Authoring tooling uses
 * this to derive `correctAnswer.placements` from the grid + word list
 * instead of requiring an admin to hand-enter coordinates.
 */
export function findWordPlacementInGrid(grid, label) {
  const target = label.toUpperCase().replace(/\s/g, '')
  const rows = grid.length
  const cols = grid[0]?.length ?? 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        const endRow = r + dr * (target.length - 1)
        const endCol = c + dc * (target.length - 1)
        if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) continue
        const cells = cellsBetween(r, c, endRow, endCol)
        if (wordAlongPath(grid, cells) === target) {
          return { startRow: r, startCol: c, endRow, endCol }
        }
      }
    }
  }
  return null
}

/** Derives `correctAnswer.placements` for every payload word by searching
 * the grid. Words not found in the grid are omitted (surfaced as an
 * integrity error by `validateFindWordAnswer`, which authoring UIs should
 * check before saving). */
export function buildFindWordAnswer(payload) {
  const grid = Array.isArray(payload?.grid) ? payload.grid : []
  const words = Array.isArray(payload?.words) ? payload.words : []
  const placements = []
  for (const word of words) {
    const placement = findWordPlacementInGrid(grid, word.label)
    if (placement) placements.push({ wordId: word.id, ...placement })
  }
  return { placements }
}

export default {
  cellsBetween,
  wordAlongPath,
  placementSpells,
  validateFindWordAnswer,
  scoreSelections,
  findWordPlacementInGrid,
  buildFindWordAnswer,
}
