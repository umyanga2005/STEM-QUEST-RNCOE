/**
 * Admin Question Builder — visual authoring model (Task 5.11A).
 *
 * Pure, DOM-free helpers shared by the four visual authoring forms and their
 * tests. The forms keep `payload` + `correctAnswer` as the single source of
 * truth and regenerate the correct-answer document from the authored visual
 * relationships (item→zone, left→right, list order, item→category) so authors
 * never hand-write correct-answer JSON for these activity types.
 *
 * These builders are CLIENT-SAFE: they receive both documents as arguments and
 * never import a correct-answer schema. The server re-validates everything on
 * save (three layers, authoritative).
 */

const ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/

/** True when `id` is a valid entity identifier per common/ids.schema.json. */
export function isValidId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id)
}

/**
 * Generates the next available id for a prefix, e.g. `item_2` after
 * `item_1`. Reuses the first free numeric suffix so edits never collide
 * with existing ids and never overwrite them.
 */
export function nextId(prefix, existingIds) {
  const used = new Set(existingIds)
  let n = 1
  while (used.has(`${prefix}_${n}`)) n += 1
  return `${prefix}_${n}`
}

function makeCard(prefix, existingIds, label) {
  return { id: nextId(prefix, existingIds), label }
}

/** New drag-drop item (label-optional; schema requires label or image). */
export function makeDragItem(existingIds) {
  return makeCard('item', existingIds, '')
}

/** New drag-drop zone. */
export function makeZone(existingIds) {
  return makeCard('zone', existingIds, '')
}

/** New matching left card. */
export function makeLeftCard(existingIds) {
  return { id: nextId('left', existingIds), text: '' }
}

/** New matching right card. */
export function makeRightCard(existingIds) {
  return { id: nextId('right', existingIds), text: '' }
}

/** New matching distractor card. */
export function makeDistractor(existingIds) {
  return { id: nextId('distractor', existingIds), text: '' }
}

/** New ordering step item. */
export function makeOrderItem(existingIds) {
  return makeCard('step', existingIds, '')
}

/** New sorting category. */
export function makeCategory(existingIds) {
  return makeCard('category', existingIds, '')
}

/** New sorting item. */
export function makeSortItem(existingIds) {
  return makeCard('item', existingIds, '')
}

/**
 * Rebuilds drag-drop mappings so every item is mapped to a live zone.
 * Existing mappings are preserved when their zone still exists; unmapped or
 * dangling items fall back to the first zone (keeps the draft cross-doc
 * valid whenever possible). Items with no zone at all are omitted — the
 * advisory answer-integrity check will flag them for the author.
 */
export function buildMappings(items, zones, existingMappings = []) {
  const zoneIds = zones.map((zone) => zone.id)
  const firstZone = zoneIds[0] ?? null
  const current = new Map((existingMappings ?? []).map((m) => [m.itemId, m.zoneId]))
  const mappings = []
  for (const item of items) {
    const zoneId = current.has(item.id) && zoneIds.includes(current.get(item.id)) ? current.get(item.id) : firstZone
    if (zoneId != null) mappings.push({ itemId: item.id, zoneId })
  }
  return mappings
}

/** `{ mappings }` correct-answer document for drag-drop. */
export function buildDragDropAnswer(items, zones, existingMappings) {
  return { mappings: buildMappings(items, zones, existingMappings) }
}

/**
 * Rebuilds matching pairs so every left card is paired with a live right
 * card. Existing pairs are preserved while valid; new/unpaired left cards
 * fall back to the first right card. Shared targets and distractors are
 * respected (a distractor never receives a pair).
 */
export function buildPairs(leftItems, rightItems, existingPairs = []) {
  const rightIds = rightItems.map((card) => card.id)
  const firstRight = rightIds[0] ?? null
  const current = new Map((existingPairs ?? []).map((p) => [p.leftId, p.rightId]))
  const pairs = []
  for (const left of leftItems) {
    const rightId = current.has(left.id) && rightIds.includes(current.get(left.id)) ? current.get(left.id) : firstRight
    if (rightId != null) pairs.push({ leftId: left.id, rightId })
  }
  return pairs
}

/** `{ pairs }` correct-answer document for matching. */
export function buildMatchingAnswer(leftItems, rightItems, existingPairs) {
  return { pairs: buildPairs(leftItems, rightItems, existingPairs) }
}

/** The expected order is the authored list order — position is the rank. */
export function buildOrder(items) {
  return items.map((item) => item.id)
}

/**
 * Anchors are derived from the authored list: an anchored item locks its
 * current position. Reordering moves the lock with the item, so anchors are
 * always consistent with the (authoritative) correct-answer order and the
 * plugin's `ordering.order-permutation` rule can never fail on them.
 */
export function buildAnchors(items, anchoredIds) {
  const set = anchoredIds instanceof Set ? anchoredIds : new Set(anchoredIds ?? [])
  return items
    .map((item, position) => (set.has(item.id) ? { position, itemId: item.id } : null))
    .filter(Boolean)
}

/**
 * Rebuilds sorting assignments so every item is assigned to a live category.
 * Existing assignments are preserved while valid; unassigned items fall back
 * to the first category. Items with no category at all are omitted (flagged
 * by the advisory answer-integrity check).
 */
export function buildAssignments(items, categories, existingAssignments = []) {
  const categoryIds = categories.map((category) => category.id)
  const firstCategory = categoryIds[0] ?? null
  const current = new Map((existingAssignments ?? []).map((a) => [a.itemId, a.categoryId]))
  const assignments = []
  for (const item of items) {
    const categoryId = current.has(item.id) && categoryIds.includes(current.get(item.id)) ? current.get(item.id) : firstCategory
    if (categoryId != null) assignments.push({ itemId: item.id, categoryId })
  }
  return assignments
}

/** `{ assignments }` correct-answer document for sorting. */
export function buildSortingAnswer(items, categories, existingAssignments) {
  return { assignments: buildAssignments(items, categories, existingAssignments) }
}

/** Moves an element in an array by one position (clamped). */
export function moveInList(list, index, delta) {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

// ---------------------------------------------------------------------------
// Fill & Complete (Task 5.11B)
// ---------------------------------------------------------------------------

/** New fill-complete blank. */
export function makeBlank(existingIds) {
  return { id: nextId('blank', existingIds), type: 'text', label: '', maxLength: 24 }
}

/**
 * Builds the fill-complete correct-answer document from per-blank authored
 * specs. `specByBlankId` maps a blank id to:
 *   - text:       { accepted: string[] }
 *   - expression: { accepted: string[] }
 *   - number:     { mode: 'value', value, tolerance? } | { mode: 'range', min, max }
 * Only blanks with an authored spec are emitted (a blank without one is
 * flagged by the advisory `fill-complete.blanks-referenced` rule).
 */
export function buildBlankAnswers(blanks, specByBlankId = {}) {
  const answers = []
  const numeric = []
  const expression = []
  for (const blank of blanks) {
    const spec = specByBlankId[blank.id]
    if (!spec) continue
    if (blank.type === 'text') {
      const accepted = (spec.accepted ?? []).map((s) => String(s)).filter((s) => s !== '')
      if (accepted.length > 0) answers.push({ blankId: blank.id, type: 'text', accepted })
    } else if (blank.type === 'expression') {
      const accepted = (spec.accepted ?? []).map((s) => String(s)).filter((s) => s !== '')
      if (accepted.length > 0) expression.push({ blankId: blank.id, accepted })
    } else if (blank.type === 'number') {
      if (spec.mode === 'range' && spec.min !== undefined && spec.max !== undefined) {
        numeric.push({ blankId: blank.id, min: spec.min, max: spec.max })
      } else if (spec.value !== undefined && Number.isFinite(Number(spec.value))) {
        numeric.push({ blankId: blank.id, value: Number(spec.value), tolerance: Number(spec.tolerance) || 0 })
      }
    }
  }
  const out = {}
  if (answers.length > 0) out.answers = answers
  if (numeric.length > 0) out.numeric = numeric
  if (expression.length > 0) out.expression = expression
  return out
}

// ---------------------------------------------------------------------------
// Pattern (Task 5.11B)
// ---------------------------------------------------------------------------

/** New pattern element (sequence or candidate). Defaults to a numeric element. */
export function makePatternElement(prefix, existingIds) {
  return { id: nextId(prefix, existingIds), number: 0 }
}

export const PATTERN_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'pentagon']

/** Sets a pattern element's display kind (number/text/shape/image). */
export function withPatternKind(element, kind) {
  const next = { id: element.id, ariaLabel: element.ariaLabel }
  if (kind === 'number') next.number = typeof element.number === 'number' ? element.number : 0
  if (kind === 'text') next.text = typeof element.text === 'string' ? element.text : ''
  if (kind === 'shape') next.shape = PATTERN_SHAPES.includes(element.shape) ? element.shape : 'circle'
  if (kind === 'image') next.image = element.image ?? { ref: 'question-media/pending/pending/pending.png', alt: '' }
  return next
}

/**
 * Builds the pattern correct-answer document from an authored spec.
 *   - candidate: { acceptableIds } (author defaults to every candidate in the
 *                form; unchecking flags the advisory construct-count rule)
 *   - numeric:   { value, tolerance } or { min, max }
 *   - text:      { accepted }
 */
export function buildPatternAnswer(interaction, candidates, spec = {}) {
  const type = spec.type ?? 'candidate'
  const candidateIds = (candidates ?? []).map((c) => c.id)
  if (type === 'numeric') {
    if (spec.mode === 'range' && spec.min !== undefined && spec.max !== undefined) {
      return { type: 'numeric', min: Number(spec.min), max: Number(spec.max) }
    }
    return { type: 'numeric', value: Number(spec.value) || 0, tolerance: Number(spec.tolerance) || 0 }
  }
  if (type === 'text') {
    return { type: 'text', accepted: (spec.accepted ?? []).map((s) => String(s)).filter((s) => s !== '') }
  }
  return { type: 'candidate', acceptableIds: (spec.acceptableIds ?? []).filter((id) => candidateIds.includes(id)) }
}

// ---------------------------------------------------------------------------
// Memory (Task 5.11B)
// ---------------------------------------------------------------------------

/** New memory card. */
export function makeMemoryCard(existingIds) {
  return { id: nextId('card', existingIds), text: '' }
}

/** New memory group (empty until cards are assigned). */
export function makeMemoryGroup(existingGroupIds) {
  return { groupId: nextId('group', existingGroupIds), cardIds: [] }
}

/**
 * Rebuilds the memory correct-answer groups from per-card assignments.
 * `assignmentsByCardId` maps cardId → groupId. Existing group ids are
 * preserved; cards with no/unknown assignment fall back to the first group.
 */
export function buildMemoryGroups(cards, groups, assignmentsByCardId = {}) {
  const groupIds = (groups ?? []).map((g) => g.groupId)
  const firstGroup = groupIds[0] ?? null
  const current = {}
  for (const card of cards) {
    const gid = assignmentsByCardId[card.id]
    current[card.id] = gid != null && groupIds.includes(gid) ? gid : firstGroup
  }
  return {
    groups: (groups ?? []).map((g) => ({
      groupId: g.groupId,
      cardIds: cards.filter((c) => current[c.id] === g.groupId).map((c) => c.id),
    })),
  }
}

// ---------------------------------------------------------------------------
// Scenario Challenge (Task 5.11B)
// ---------------------------------------------------------------------------

/** New scenario decision node with two starter (empty) options. */
export function makeDecision(existingDecisionIds, optionIds) {
  const first = nextId('option', optionIds)
  const second = nextId('option', [...optionIds, first])
  return {
    id: nextId('decision', existingDecisionIds),
    text: '',
    options: [
      { id: first, text: '', nextDecision: null, outcomeText: '' },
      { id: second, text: '', nextDecision: null, outcomeText: '' },
    ],
  }
}

/** New scenario option for a decision. */
export function makeScenarioOption(existingOptionIds) {
  return { id: nextId('option', existingOptionIds), text: '', nextDecision: null, outcomeText: '' }
}

/**
 * Builds the scenario correct-answer document.
 * `optimal` maps decisionId → its optimal option id; the optimalPath is the
 * route actually followed from the entry decision through those choices
 * (each step follows the chosen option's `nextDecision`), ending at a
 * terminal option by construction. `acceptable` maps decisionId → additional
 * acceptable option ids. Unknown references are dropped (the advisory
 * `scenario.*` rules flag what is still inconsistent).
 */
export function buildScenarioAnswer(payload, { optimal = {}, acceptable = {} } = {}) {
  const decisions = Array.isArray(payload.decisions) ? payload.decisions : []
  const byId = new Map(decisions.map((d) => [d.id, d]))
  const optimalPath = []
  const seen = new Set()
  let current = byId.get(payload.entryDecision)
  while (current && !seen.has(current.id)) {
    const optionId = optimal[current.id]
    const option = current.options.find((o) => o.id === optionId)
    if (!option) break
    optimalPath.push({ decisionId: current.id, optionId: option.id })
    seen.add(current.id)
    if (option.nextDecision == null) break
    current = byId.get(option.nextDecision)
  }
  const answer = { optimalPath }
  const acceptableOptions = {}
  for (const [decisionId, ids] of Object.entries(acceptable)) {
    const decision = byId.get(decisionId)
    if (!decision) continue
    const known = new Set(decision.options.map((o) => o.id))
    const list = [...new Set(ids)].filter((id) => known.has(id))
    if (list.length > 0) acceptableOptions[decisionId] = list
  }
  if (Object.keys(acceptableOptions).length > 0) answer.acceptableOptions = acceptableOptions
  return answer
}

// ---------------------------------------------------------------------------
// Number / Logic (Task 5.11B)
// ---------------------------------------------------------------------------

/** New number-logic multi-step part. */
export function makeNumberLogicPart(existingIds) {
  return { id: nextId('part', existingIds), label: '', answerFormat: 'integer' }
}

/**
 * Builds one correct-answer spec from its authored fields. `type` drives which
 * fields are relevant; the server (and advisory cross-doc rule) re-validate.
 */
export function buildAnswerSpec(type, fields = {}) {
  const spec = { type }
  if (type === 'exact' || type === 'percent') spec.value = Number(fields.value) || 0
  if (type === 'tolerance') {
    spec.value = Number(fields.value) || 0
    spec.tolerance = Number(fields.tolerance) || 0
  }
  if (type === 'range') {
    spec.min = Number(fields.min) || 0
    spec.max = Number(fields.max) || 1
  }
  if (type === 'fraction') {
    spec.numerator = Number(fields.numerator) || 1
    spec.denominator = Number(fields.denominator) || 1
  }
  if (type === 'sequence') spec.values = (fields.values ?? []).map((v) => Number(v))
  if (type === 'accepted-set') spec.accepted = (fields.accepted ?? []).map((s) => String(s)).filter((s) => s !== '')
  return spec
}

/**
 * Builds the number-logic correct-answer document. A single-part payload gets
 * the top-level spec; a multi-part payload gets one `{ partId, ...spec }`
 * entry per payload part (D-075 parts-only scoring — never invented). The
 * correct-answer schema requires a top-level `type`, so multi-part documents
 * carry a neutral top-level spec alongside the per-part entries (mirroring
 * `schemas/examples/number-logic/partial-credit.json`).
 */
export function buildNumberLogicAnswer(payload, { type = 'exact', fields = {}, parts = {} } = {}) {
  const payloadParts = Array.isArray(payload.parts) ? payload.parts : []
  if (payloadParts.length > 0) {
    return {
      type: 'exact',
      value: 0,
      parts: payloadParts.map((part) => {
        const spec = parts[part.id] ?? {}
        return { partId: part.id, ...buildAnswerSpec(spec.type ?? 'exact', spec) }
      }),
    }
  }
  return buildAnswerSpec(type, fields)
}

export default {
  isValidId,
  nextId,
  makeDragItem,
  makeZone,
  makeLeftCard,
  makeRightCard,
  makeDistractor,
  makeOrderItem,
  makeCategory,
  makeSortItem,
  buildMappings,
  buildDragDropAnswer,
  buildPairs,
  buildMatchingAnswer,
  buildOrder,
  buildAnchors,
  buildAssignments,
  buildSortingAnswer,
  moveInList,
  makeBlank,
  buildBlankAnswers,
  makePatternElement,
  PATTERN_SHAPES,
  withPatternKind,
  buildPatternAnswer,
  makeMemoryCard,
  makeMemoryGroup,
  buildMemoryGroups,
  makeDecision,
  makeScenarioOption,
  buildScenarioAnswer,
  makeNumberLogicPart,
  buildAnswerSpec,
  buildNumberLogicAnswer,
}