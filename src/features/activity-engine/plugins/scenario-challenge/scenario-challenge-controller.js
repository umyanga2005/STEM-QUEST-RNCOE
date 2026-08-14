/**
 * Activity Engine — scenario-challenge interaction controller (Task 4.12).
 *
 * Pure, framework-free state logic for the scenario renderer. Scenario
 * Challenge is a BRANCHED DECISION TREE (NOT an MCQ):
 *
 *   1. READ  — the scenario (mission) is presented.
 *   2. DECIDE — the current decision offers 2..4 options (decision branches).
 *   3. CONSEQUENCE — the chosen option's `outcomeText` is shown.
 *   4. NEXT  — the option's `nextDecision` (or null = the scenario ends).
 *
 * The public tree (decisions → options → nextDecision/outcomeText) lives in
 * the payload and is what the student navigates. The controller owns ONLY the
 * navigation state: current decision, the path taken, and completion. It
 * NEVER contains optimalPath, acceptableOptions, correctness flags, a score,
 * or a correctness fraction — those are server-only answer facts.
 *
 * The submitted response is `{ path: [{ decisionId, optionId }] }` — the
 * ordered list of (decision, option) steps the student actually chose,
 * ending at the terminal choice. This mirrors the correct-answer's
 * `optimalPath` step shape. Positions/order matter: the path is a sequence,
 * and the server re-validates the exact public-tree transitions so a forged
 * path (an impossible jump) is rejected.
 */

/** Finds a decision by id. @returns {object|undefined} */
export function findDecision(decisions, decisionId) {
  return (Array.isArray(decisions) ? decisions : []).find((d) => d.id === decisionId)
}

/** Finds an option by id within a decision. @returns {object|undefined} */
export function findOption(decision, optionId) {
  if (!decision || !Array.isArray(decision.options)) return undefined
  return decision.options.find((o) => o.id === optionId)
}

/**
 * Creates a fresh navigation state.
 *
 * @param {object} opts
 * @param {Array<{ id, text, options }>} opts.decisions - public tree (payload)
 * @param {string} [opts.entryDecision] - the decision the student starts at
 * @returns {object} immutable navigation state
 */
export function createScenarioState({ decisions = [], entryDecision = null } = {}) {
  return {
    decisions,
    entryDecision,
    currentDecisionId: entryDecision,
    path: [], // steps { decisionId, optionId } in navigation order
    completed: false,
  }
}

/** The decision the student is currently facing (null once completed). */
export function currentDecision(state) {
  if (state.completed) return null
  return findDecision(state.decisions, state.currentDecisionId)
}

/** The options of the current decision (2..4 decision branches). */
export function currentOptions(state) {
  const decision = currentDecision(state)
  return decision ? [...decision.options] : []
}

/** True once the student has reached a terminal outcome. */
export function isComplete(state) {
  return state.completed === true
}

/** The steps taken so far, in navigation order. */
export function pathTaken(state) {
  return state.path.map((step) => ({ decisionId: step.decisionId, optionId: step.optionId }))
}

/** Number of decisions faced so far. */
export function stepCount(state) {
  return state.path.length
}

/**
 * Chooses an option of the current decision and transitions along the tree.
 *
 * - An unknown option id (or one that does not belong to the current
 *   decision) is a no-op — the student can never select an option from
 *   another decision.
 * - Choosing a non-terminal option advances `currentDecisionId` to that
 *   option's `nextDecision`.
 * - Choosing a terminal option (`nextDecision === null`) completes the
 *   scenario.
 * - Already-completed states are inert.
 */
export function selectOption(state, optionId) {
  if (state.completed) return state
  const decision = currentDecision(state)
  const option = findOption(decision, optionId)
  if (!option) return state

  const next = {
    ...state,
    path: [...state.path, { decisionId: state.currentDecisionId, optionId }],
  }
  if (option.nextDecision === null) {
    return { ...next, completed: true, currentDecisionId: null }
  }
  return { ...next, currentDecisionId: option.nextDecision }
}

/**
 * The consequence of the most recent choice: the chosen option's text plus
 * its `outcomeText` (public, student-facing content). null before any choice.
 */
export function lastOutcome(state) {
  const step = state.path[state.path.length - 1]
  if (!step) return null
  const decision = findDecision(state.decisions, step.decisionId)
  const option = findOption(decision, step.optionId)
  if (!option) return null
  return Object.freeze({
    decisionId: step.decisionId,
    optionId: step.optionId,
    optionText: typeof option.text === 'string' ? option.text : '',
    outcomeText: typeof option.outcomeText === 'string' ? option.outcomeText : '',
    ended: option.nextDecision === null,
  })
}

/** Returns the student to the entry decision with an empty path. */
export function reset(state) {
  return createScenarioState({ decisions: state.decisions, entryDecision: state.entryDecision })
}

/**
 * Serializes the schema-compatible response: `{ path: [{ decisionId,
 * optionId }] }`. The renderer gates submission on `isComplete`, so this is
 * called on a completed scenario. The server re-validates every transition
 * against the public tree.
 */
export function buildResponse(state) {
  return { path: pathTaken(state) }
}

export default {
  findDecision,
  findOption,
  createScenarioState,
  currentDecision,
  currentOptions,
  isComplete,
  pathTaken,
  stepCount,
  selectOption,
  lastOutcome,
  reset,
  buildResponse,
}