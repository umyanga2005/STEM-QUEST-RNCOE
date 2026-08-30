/**
 * Admin Question Builder — Find the Word visual authoring form (Task 9).
 *
 * The admin edits the letter grid as plain text (one row per line, one
 * letter per cell) and the word list. The correct-answer document
 * (`correctAnswer.placements`) is NEVER hand-entered — it is derived by
 * searching the grid for each word in all 8 directions
 * (`buildFindWordAnswer`), the same "derived, never hand-written" pattern
 * fill-complete/drag-drop use for their correct-answer documents. A word
 * that cannot be found in the grid is flagged so the admin can fix the grid
 * or the word before saving.
 */

import { Section, LabeledInput, NumberField, Toggle, AddButton, RemoveButton } from './primitives.jsx'
import { nextId } from './model.js'
import { buildFindWordAnswer, findWordPlacementInGrid } from '../../activity-engine/plugins/find-word/find-word-controller.js'

const LIMITS = { rows: { min: 4, max: 20 }, words: { min: 2, max: 12 } }

function gridToText(grid) {
  return (grid ?? []).map((row) => row.join('')).join('\n')
}

/** Parses the pasted grid text into rows of single uppercase letters. Blank
 * lines are dropped; each remaining line becomes one row. */
function textToGrid(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/[^a-zA-Z]/g, '').toUpperCase().split(''))
}

function resizeGrid(grid, rows, cols) {
  const next = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      row.push(grid[r]?.[c] ?? 'A')
    }
    next.push(row)
  }
  return next
}

export default function FindWordVisualForm({ payload, onChange, disabled = false }) {
  const grid = Array.isArray(payload.grid) && payload.grid.length > 0 ? payload.grid : resizeGrid([], 12, 12)
  const words = Array.isArray(payload.words) ? payload.words : []
  const rows = grid.length
  const cols = grid[0]?.length ?? 0

  const emit = (nextPayload) => {
    onChange({ payload: nextPayload, correctAnswer: buildFindWordAnswer(nextPayload) })
  }

  const setGridText = (text) => {
    const parsed = textToGrid(text)
    if (parsed.length === 0) return
    emit({ ...payload, grid: parsed })
  }

  const setSize = (nextRows, nextCols) => {
    emit({ ...payload, grid: resizeGrid(grid, nextRows, nextCols) })
  }

  const patchWord = (index, label) => {
    emit({ ...payload, words: words.map((w, i) => (i === index ? { ...w, label } : w)) })
  }

  const addWord = () => {
    if (words.length >= LIMITS.words.max) return
    emit({ ...payload, words: [...words, { id: nextId('word', words.map((w) => w.id)), label: '' }] })
  }

  const removeWord = (index) => {
    emit({ ...payload, words: words.filter((_, i) => i !== index) })
  }

  const wordIds = words.map((w) => w.id)

  return (
    <div className="aq-ve aq-ve--find-word">
      <Section title="Grid size">
        <div className="aq-row">
          <NumberField
            label="Rows"
            value={rows}
            min={LIMITS.rows.min}
            max={LIMITS.rows.max}
            onChange={(v) => setSize(v, cols)}
            disabled={disabled}
          />
          <NumberField
            label="Columns"
            value={cols}
            min={LIMITS.rows.min}
            max={LIMITS.rows.max}
            onChange={(v) => setSize(rows, v)}
            disabled={disabled}
          />
        </div>
      </Section>

      <Section title="Letter grid" description="One row per line, one letter per cell. Non-letters are stripped automatically.">
        <textarea
          rows={Math.max(6, rows)}
          className="aq-ve__grid-editor"
          value={gridToText(grid)}
          onChange={(e) => setGridText(e.target.value)}
          spellCheck={false}
          disabled={disabled}
        />
      </Section>

      <Section title="Words" description={`Hidden words (${words.length}/${LIMITS.words.max}). Each must appear in the grid horizontally, vertically or diagonally.`}>
        {words.map((word, i) => {
          const found = word.label ? findWordPlacementInGrid(grid, word.label) : null
          return (
            <div className="aq-row" key={word.id}>
              <LabeledInput
                label={`Word ${i + 1}`}
                value={word.label}
                onChange={(e) => patchWord(i, e.target.value.toUpperCase())}
                placeholder="ATOM"
                disabled={disabled}
              />
              {word.label && !found ? <span className="aq-ve__warn">not found in grid</span> : null}
              <RemoveButton onClick={() => removeWord(i)} label={`Remove word ${i + 1}`} disabled={disabled || words.length <= LIMITS.words.min} />
            </div>
          )
        })}
        <AddButton onClick={addWord} disabled={disabled || words.length >= LIMITS.words.max}>
          + Add word
        </AddButton>
      </Section>

      <Toggle
        label="Allow the student to reset their selections and retry"
        checked={payload.allowRetry !== false}
        onChange={(v) => emit({ ...payload, allowRetry: v })}
        disabled={disabled}
      />

      {wordIds.length > 0 && wordIds.length !== new Set(wordIds).size ? (
        <p className="aq-ve__warn">Duplicate word ids were detected — fix them before saving.</p>
      ) : null}
      <p className="aq-ve__note">
        The correct-answer document is derived automatically by searching the grid for each word. Fix any word
        flagged "not found in grid" before saving.
      </p>
    </div>
  )
}
