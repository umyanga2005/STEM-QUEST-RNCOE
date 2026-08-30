import { useMemo, useRef, useState } from 'react'
import './find-word.css'

/**
 * Find the Word — word-search grid activity.
 *
 * `descriptor` (client-safe, from the find-word plugin's `render()`):
 *   prompt        string
 *   instructions  string
 *   grid          string[][] — rows of single letters
 *   words         { id, label }[]
 *   allowRetry    boolean
 *
 * Correct-answer placements are NEVER sent to the client — the student
 * selects a start + end cell and the server validates the coordinates.
 * `onSubmit` receives `{ response: { selections }, interactionMetrics }`.
 */
export function FindWordActivity({
  descriptor,
  hints = [],
  disabled = false,
  reducedMotion = false,
  submitted = false,
  onSubmit,
}) {
  const [foundWords, setFoundWords] = useState({}) // wordId -> { startRow, startCol, endRow, endCol }
  const [anchor, setAnchor] = useState(null) // { row, col } — first tap
  const [wrongCells, setWrongCells] = useState([])
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [announce, setAnnounce] = useState('')
  const startedAt = useRef(Date.now())

  const allFound = Object.keys(foundWords).length === descriptor.words.length

  function getCellsBetween(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1)
    const dc = Math.sign(c2 - c1)
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1)) + 1
    return Array.from({ length: len }, (_, i) => ({ row: r1 + i * dr, col: c1 + i * dc }))
  }

  function isInFoundPath(row, col) {
    return Object.values(foundWords).some(({ startRow, startCol, endRow, endCol }) =>
      getCellsBetween(startRow, startCol, endRow, endCol).some((c) => c.row === row && c.col === col)
    )
  }

  function handleCellClick(row, col) {
    if (disabled || submitted) return

    if (!anchor) {
      setAnchor({ row, col })
      setAnnounce(
        `Selected letter ${descriptor.grid[row][col]} at row ${row + 1}, column ${col + 1}. Now tap the last letter of your word.`
      )
      return
    }

    const { row: r1, col: c1 } = anchor
    setAnchor(null)

    const dr = Math.abs(row - r1)
    const dc = Math.abs(col - c1)
    const isAligned = dr === 0 || dc === 0 || dr === dc
    if (!isAligned || (row === r1 && col === c1)) {
      setAnnounce('Selection must be in a straight line — horizontal, vertical, or diagonal. Try again.')
      return
    }

    const sel = { startRow: r1, startCol: c1, endRow: row, endCol: col }
    const cells = getCellsBetween(r1, c1, row, col)
    const word = cells.map((c) => descriptor.grid[c.row][c.col]).join('').toUpperCase()

    const match = descriptor.words.find((w) => {
      const label = w.label.toUpperCase().replace(/\s/g, '')
      return label === word || label === word.split('').reverse().join('')
    })

    if (match && !foundWords[match.id]) {
      setFoundWords((prev) => ({ ...prev, [match.id]: sel }))
      setAnnounce(`Found: ${match.label}!`)
    } else {
      if (!reducedMotion) {
        setWrongCells(cells)
        setTimeout(() => setWrongCells([]), 400)
      }
      setAnnounce('Not a matching word. Try a different selection.')
    }
  }

  function revealNextHint() {
    if (hintsRevealed >= hints.length) return
    const next = hints[hintsRevealed]
    setHintsRevealed((n) => n + 1)
    setAnnounce(`Hint: ${next.text}`)
  }

  function resetBoard() {
    if (disabled || submitted) return
    setFoundWords({})
    setAnchor(null)
    setWrongCells([])
    setAnnounce('Board reset.')
  }

  function handleSubmit() {
    if (!allFound || disabled || submitted) return
    const selections = Object.entries(foundWords).map(([wordId, sel]) => ({ wordId, ...sel }))
    onSubmit({
      response: { selections },
      interactionMetrics: {
        attemptsUsed: 1,
        hintsUsed: hintsRevealed,
        timeTakenSec: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
      },
    })
  }

  const gridStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${descriptor.grid[0]?.length ?? 0}, 36px)` }),
    [descriptor.grid]
  )

  return (
    <div className="find-word-activity">
      <p className="find-word-sr-live" role="status" aria-live="polite">
        {announce}
      </p>

      {descriptor.prompt ? <p className="find-word-prompt">{descriptor.prompt}</p> : null}
      {descriptor.instructions ? (
        <p className="find-word-instructions">{descriptor.instructions}</p>
      ) : (
        <p className="find-word-instructions">
          Find the hidden words in the grid. Tap the first letter, then the last letter of each word.
        </p>
      )}

      <ul className="find-word-word-list">
        {descriptor.words.map((w) => (
          <li key={w.id} className={`find-word-chip${foundWords[w.id] ? ' found' : ''}`}>
            {foundWords[w.id] ? '✓ ' : ''}
            {w.label}
          </li>
        ))}
      </ul>

      <div className="find-word-grid-wrap">
        <div className="find-word-grid" style={gridStyle}>
          {descriptor.grid.map((rowArr, rIdx) =>
            rowArr.map((letter, cIdx) => {
              const isAnchor = anchor?.row === rIdx && anchor?.col === cIdx
              const isFound = isInFoundPath(rIdx, cIdx)
              const isWrong = wrongCells.some((c) => c.row === rIdx && c.col === cIdx)
              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  type="button"
                  className={[
                    'find-word-cell',
                    isAnchor ? 'selected' : '',
                    isFound ? 'found-highlight' : '',
                    isWrong ? 'wrong' : '',
                    disabled || submitted ? 'disabled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  disabled={disabled || submitted}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  aria-label={`Row ${rIdx + 1}, column ${cIdx + 1}: ${letter}`}
                >
                  {letter}
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="find-word-controls">
        {hints.length > 0 ? (
          <button
            type="button"
            className="find-word-hint-button"
            disabled={disabled || submitted || hintsRevealed >= hints.length}
            onClick={revealNextHint}
          >
            Hint{hintsRevealed > 0 ? ` (${hintsRevealed}/${hints.length})` : ''}
          </button>
        ) : null}
        {descriptor.allowRetry !== false ? (
          <button
            type="button"
            className="find-word-reset"
            disabled={disabled || submitted}
            onClick={resetBoard}
          >
            Reset
          </button>
        ) : null}
        <button type="button" className="find-word-submit" disabled={!allFound || disabled || submitted} onClick={handleSubmit}>
          {submitted ? 'Submitted' : `Submit (${Object.keys(foundWords).length}/${descriptor.words.length} found)`}
        </button>
      </div>

      {submitted ? (
        <p className="find-word-instructions" role="status">
          Response captured — the server will score your selections.
        </p>
      ) : null}
    </div>
  )
}

export default FindWordActivity
