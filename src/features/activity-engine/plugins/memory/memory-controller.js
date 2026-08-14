/**
 * Activity Engine — memory interaction controller (Task 4.11).
 *
 * Pure, framework-free state logic for the memory renderer. The memory
 * activity is a genuine RECALL task (not MCQ, not matching-disguised):
 *
 *   1. MEMORIZE phase — the student observes the deck (all cards) for the
 *      schema's `revealSeconds`. The UI announces the memory phase.
 *   2. RECALL phase   — the deck is re-presented (re-shuffled) WITHOUT any
 *      grouping; the student reconstructs the authored groups (pairs or sets)
 *      from memory by selecting cards and confirming each group. The correct
 *      grouping lives ONLY in the server-only correct-answer document.
 *
 * Deck semantics come straight from the Task 3.2 payload schema:
 *
 *   - payload.cards[]        — 4..12 cards { id, text?|image?, ariaLabel? }
 *   - payload.revealSeconds  — memorization countdown (5..30)
 *   - payload.deckType       — "pairs" (groups of 2) | "sets" (groups of 3–4)
 *   - payload.shuffle        — display order is shuffled when true
 *   - payload.maxAttempts    — optional re-reveal (study-again) limit
 *
 * Positions/order do NOT matter: groups are unordered sets of card ids and the
 * order of the groups themselves is irrelevant. The controller's response
 * serialization emits `{ groups: [{ cardIds }] }` — exactly the shape the
 * server validator compares against the correct-answer groups.
 *
 * The controller owns ONLY interaction state: phase, reveal count, the
 * in-progress selection, the placed groups, completion, and serialization.
 * No correct answer, no expected grouping, no correctness flags, no score ever
 * live here. Every operation is deterministic on its input state.
 */

/** Fisher–Yates shuffle (a permutation of the input list). Used to randomize
 * deck display order; the recall phase re-shuffles so positions never become a
 * crutch. Pure — never mutates the input. */
export function shuffleList(list) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Valid group-size range for a deck type (schema deckType description:
 * "pairs = groups of 2; sets = groups of 3–4"). */
export function groupSizeRange(deckType) {
  return deckType === 'sets' ? [3, 4] : [2, 2]
}

/**
 * Creates a fresh interaction state.
 *
 * @param {object} opts
 * @param {Array<{ id: string }>} opts.cards - public deck (display order)
 * @param {'pairs'|'sets'} [opts.deckType]
 * @param {number|null} [opts.maxAttempts] - optional re-reveal limit (1..5)
 * @returns {object} immutable interaction state
 */
export function createMemoryState({ cards = [], deckType = 'pairs', maxAttempts = null } = {}) {
  return {
    phase: 'memorize',
    cards,
    deckType,
    maxAttempts: maxAttempts ?? null,
    revealsUsed: 1, // the initial reveal counts as one
    selected: [], // card ids in the in-progress group
    groups: [], // placed groups, each an array of card ids
  }
}

/** True while the student is observing the deck. */
export function isMemorizing(state) {
  return state.phase === 'memorize'
}

/** True while the student is reconstructing the groups. */
export function isRecalling(state) {
  return state.phase === 'recall'
}

/** Minimum group size for the deck type (2 for pairs, 3 for sets). */
export function minGroupSize(state) {
  return groupSizeRange(state.deckType)[0]
}

/** Maximum group size for the deck type (2 for pairs, 4 for sets). */
export function maxGroupSize(state) {
  return groupSizeRange(state.deckType)[1]
}

/**
 * Transitions memorize → recall and re-shuffles the deck so the recall
 * presentation differs from the observation order (positions are never a
 * memorization crutch).
 */
export function startRecall(state) {
  if (state.phase !== 'memorize') return state
  return { ...state, phase: 'recall', cards: shuffleList(state.cards) }
}

/** A further re-reveal is allowed while reveals remain under maxAttempts
 * (null = unlimited re-reveals). */
export function canReviewAgain(state) {
  if (state.maxAttempts === null) return true
  return state.revealsUsed < state.maxAttempts
}

/**
 * Returns the student to the memorize phase for another look (consumes one
 * reveal). Resets the recall surface — placed groups and the in-progress
 * selection are discarded so the recall restarts clean.
 */
export function reviewAgain(state) {
  if (!canReviewAgain(state)) return state
  return {
    ...state,
    phase: 'memorize',
    revealsUsed: state.revealsUsed + 1,
    selected: [],
    groups: [],
  }
}

/** The card ids currently placed in confirmed groups. */
export function placedCardIds(state) {
  return state.groups.flat()
}

/** Card ids not yet placed in any group. */
export function remainingCardIds(state) {
  const placed = new Set(placedCardIds(state))
  return state.cards.map((card) => card.id).filter((id) => !placed.has(id))
}

/**
 * Toggles a card into/out of the in-progress group (recall only).
 *
 * Rules (deterministic, unit-testable):
 *   - unknown ids are no-ops;
 *   - already-placed cards cannot be re-selected;
 *   - the selection is capped at the deck's maximum group size;
 *   - selecting an already-selected id removes it (toggle).
 */
export function toggleCard(state, cardId) {
  if (state.phase !== 'recall') return state
  if (!state.cards.some((card) => card.id === cardId)) return state
  if (state.groups.some((group) => group.includes(cardId))) return state
  if (state.selected.includes(cardId)) {
    return { ...state, selected: state.selected.filter((id) => id !== cardId) }
  }
  if (state.selected.length >= maxGroupSize(state)) return state
  return { ...state, selected: [...state.selected, cardId] }
}

/** The in-progress selection (current group under construction). */
export function selectedIds(state) {
  return [...state.selected]
}

/** A group may be placed once its size is within the deck's valid range. */
export function canPlaceGroup(state) {
  if (state.phase !== 'recall') return false
  const [min, max] = groupSizeRange(state.deckType)
  return state.selected.length >= min && state.selected.length <= max
}

/** Confirms the in-progress selection as a placed group (no-op when the
 * selection size is outside the deck's valid range). */
export function placeGroup(state) {
  if (!canPlaceGroup(state)) return state
  return { ...state, groups: [...state.groups, [...state.selected]], selected: [] }
}

/** Removes a placed group; its cards return to the unplaced pool. */
export function removeGroup(state, index) {
  if (state.phase !== 'recall') return state
  if (index < 0 || index >= state.groups.length) return state
  return { ...state, groups: state.groups.filter((_, i) => i !== index) }
}

/** Clears the in-progress selection (keeps placed groups). */
export function clearSelection(state) {
  if (state.selected.length === 0) return state
  return { ...state, selected: [] }
}

/** Clears both the selection and all placed groups (recall surface). */
export function clear(state) {
  if (state.selected.length === 0 && state.groups.length === 0) return state
  return { ...state, selected: [], groups: [] }
}

/** Resets to a fresh initial state (back to the memorize phase, one reveal). */
export function reset(state) {
  return { ...state, phase: 'memorize', revealsUsed: 1, selected: [], groups: [] }
}

/**
 * Completion gate (submit gate). The student may submit only in the recall
 * phase when every card is placed and every group is a valid size for the
 * deck type. The gate is deliberately correctness-agnostic — it never knows
 * whether a group matches the authored answer, only that the interaction is
 * complete enough to submit.
 */
export function isComplete(state) {
  if (state.phase !== 'recall') return false
  const placed = new Set(placedCardIds(state))
  if (placed.size !== state.cards.length) return false
  const [min, max] = groupSizeRange(state.deckType)
  return state.groups.every((group) => group.length >= min && group.length <= max)
}

/**
 * Serializes the schema-compatible response: `{ groups: [{ cardIds }] }`.
 * The renderer gates submission on `isComplete`, so this is called on a
 * complete recall. Group order and in-group card order are arbitrary (the
 * server compares unordered sets).
 */
export function buildResponse(state) {
  return { groups: state.groups.map((cardIds) => ({ cardIds: [...cardIds] })) }
}

export default {
  shuffleList,
  groupSizeRange,
  createMemoryState,
  isMemorizing,
  isRecalling,
  minGroupSize,
  maxGroupSize,
  startRecall,
  canReviewAgain,
  reviewAgain,
  placedCardIds,
  remainingCardIds,
  toggleCard,
  selectedIds,
  canPlaceGroup,
  placeGroup,
  removeGroup,
  clearSelection,
  clear,
  reset,
  isComplete,
  buildResponse,
}
