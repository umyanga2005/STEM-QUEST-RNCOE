/**
 * Content Bank — authoring helpers (Task 5.14, Batch 1).
 *
 * Compact builders for the 10 activity types. Each builder returns a plain
 * envelope-shaped record (payload + correctAnswer + common fields) that the
 * content validator then checks against the real authoring validator and the
 * blueprint. Content modules use a per-stream source spread, e.g.
 * `const S = src('mathematics')` then `numberLogic({ ..., ...S })`.
 */

/** Common-field enrichment: stream, feedback default, authoring provenance. */
export function src(stream, batch = 'stem-quest-task-5.14-batch-1') {
  return {
    stream,
    meta: {
      authoring: { authorType: 'import', authorSource: `${batch}-${stream}` },
    },
  }
}

/** Injects feedback default + objective into a common field set. */
function enrich(common) {
  const meta = { ...(common.meta ?? {}) }
  meta.feedback = common.feedback ?? {
    correct: 'Correct — the explanation above shows why.',
    incorrect: 'Not quite. Read the explanation below and try again.',
  }
  if (common.objective) meta.objective = common.objective
  const { objective: _objective, feedback: _feedback, ...rest } = common
  return { ...rest, meta }
}

/** Wraps common + payload + correctAnswer into a record. */
export function q({ payload, correctAnswer, ...common }) {
  return { ...enrich(common), payload, correctAnswer }
}

/** Drag & Drop. */
export function dragDrop({ items, zones, mappings, mode = 'multi-target', ...common }) {
  return q({
    ...common,
    activityType: 'drag-drop',
    payload: { schemaVersion: '1.0', mode, randomizeItems: true, allowRetry: true, items, zones },
    correctAnswer: { mappings },
  })
}

/** Matching (left/right pairs; optional right-side distractors). */
export function matching({ leftItems, rightItems, pairs, distractors = [], ...common }) {
  const payload = { schemaVersion: '1.0', leftItems, rightItems, shuffle: true }
  if (distractors.length > 0) payload.distractors = distractors
  return q({ ...common, activityType: 'matching', payload, correctAnswer: { pairs } })
}

/** Ordering. */
export function ordering({ items, order, anchors = [], ...common }) {
  const payload = { schemaVersion: '1.0', items, shuffle: true }
  if (anchors.length > 0) payload.anchors = anchors
  return q({ ...common, activityType: 'ordering', payload, correctAnswer: { order } })
}

/** Sorting. */
export function sorting({ items, categories, assignments, ...common }) {
  return q({
    ...common,
    activityType: 'sorting',
    payload: { schemaVersion: '1.0', items, categories, shuffle: true },
    correctAnswer: { assignments },
  })
}

/** Fill / Complete. */
export function fillComplete({ template, blanks, answers = [], numeric = [], expression = [], keypad = 'default', ...common }) {
  const payload = { schemaVersion: '1.0', template, blanks }
  if (keypad !== 'default') payload.keypad = keypad
  const correctAnswer = {}
  if (answers.length > 0) correctAnswer.answers = answers
  if (numeric.length > 0) correctAnswer.numeric = numeric
  if (expression.length > 0) correctAnswer.expression = expression
  return q({ ...common, activityType: 'fill-complete', payload, correctAnswer })
}

/** Image Interaction. */
export function imageInteraction({ image, imageWidth, imageHeight, mode, hotspots, labels = [], requiredHotspots = [], placements = [], ...common }) {
  const payload = { schemaVersion: '1.0', image, imageWidth, imageHeight, mode, hotspots }
  if (labels.length > 0) payload.labels = labels
  const correctAnswer = { mode }
  if (mode === 'tap') correctAnswer.requiredHotspots = requiredHotspots
  if (mode === 'label') correctAnswer.placements = placements
  return q({ ...common, activityType: 'image-interaction', payload, correctAnswer })
}

/** Pattern. */
export function pattern({ sequence, interaction, missingAt = null, constructCount = 1, candidates, answer, ...common }) {
  const payload = { schemaVersion: '1.0', sequence, interaction, candidates }
  if (interaction === 'fill-missing') payload.missingAt = missingAt
  if (interaction === 'construct-next') payload.constructCount = constructCount
  return q({ ...common, activityType: 'pattern', payload, correctAnswer: answer })
}

/** Memory. */
export function memory({ cards, groups, revealSeconds, recallPrompt, deckType, maxAttempts = null, ...common }) {
  const payload = { schemaVersion: '1.0', cards, revealSeconds, recallPrompt, deckType, shuffle: true }
  if (maxAttempts != null) payload.maxAttempts = maxAttempts
  return q({ ...common, activityType: 'memory', payload, correctAnswer: { groups } })
}

/** Scenario Challenge. */
export function scenario({ scenarioText, entryDecision, decisions, optimalPath, acceptableOptions = {}, ...common }) {
  const correctAnswer = { optimalPath }
  if (Object.keys(acceptableOptions).length > 0) correctAnswer.acceptableOptions = acceptableOptions
  return q({
    ...common,
    activityType: 'scenario-challenge',
    payload: { schemaVersion: '1.0', scenarioText, entryDecision, decisions },
    correctAnswer,
  })
}

/** Number / Logic Challenge. */
export function numberLogic({ problem, answerFormat, answer, inputMode = 'numeric', ...common }) {
  const payload = { schemaVersion: '1.0', problem, answerFormat, inputMode }
  return q({ ...common, activityType: 'number-logic', payload, correctAnswer: answer })
}

export { scenario as scenarioChallenge }

export default {
  src, q, dragDrop, matching, ordering, sorting, fillComplete,
  imageInteraction, pattern, memory, scenario, scenarioChallenge, numberLogic,
}