/**
 * Admin Question Builder — visual authoring forms tests (Task 5.11A + 5.11B).
 *
 * Two layers:
 *   1. MODEL — pure authoring functions (add/remove/reorder/assign/groups/
 *      path/spec) produce payload + correctAnswer documents that pass the FULL
 *      server-side three-layer validator (envelope + payload schema +
 *      correct-answer schema + plugin semantic + cross-document rules).
 *      Editing existing drafts preserves ids/mappings/placements/specs.
 *   2. RENDER — all ten visual forms render from templates, the editor swaps
 *      in the visual form (no raw JSON) for every production type (raw JSON
 *      remains only as the fallback for unknown types), published questions
 *      render read-only, and the preview never leaks answer data.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer as createViteServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { buildQuestionTemplate } from '../templates/templates.js'
import { createQuestionValidator } from '../../admin/questions/validation/question-validator.js'
import {
  nextId,
  makeDragItem,
  makeZone,
  makeLeftCard,
  makeRightCard,
  makeDistractor,
  makeOrderItem,
  makeCategory,
  makeSortItem,
  buildDragDropAnswer,
  buildMatchingAnswer,
  buildOrder,
  buildAnchors,
  buildSortingAnswer,
  moveInList,
  isValidId,
  makeBlank,
  buildBlankAnswers,
  makePatternElement,
  withPatternKind,
  buildPatternAnswer,
  makeMemoryGroup,
  buildMemoryGroups,
  makeDecision,
  buildScenarioAnswer,
  makeNumberLogicPart,
  buildNumberLogicAnswer,
} from '../visual-editor/model.js'
import { seedQuestionCatalogue } from '../../admin/questions/testing/fixtures.js'
import { validateAssignments } from '../../activity-engine/plugins/sorting/plugin.js'

const validator = createQuestionValidator()

function authorable(draft) {
  return {
    ...draft,
    prompt: 'A sufficiently detailed prompt for the question being authored.',
    explanation: 'A sufficiently detailed explanation shown after the answer is checked.',
  }
}

function assertValid(draft, label) {
  const result = validator.validate(draft)
  assert.equal(result.valid, true, `${label}: ${JSON.stringify(result.errors)}`)
}

function assertInvalid(draft, label) {
  const result = validator.validate(draft)
  assert.equal(result.valid, false, `${label}: expected validation to fail`)
}

function withText(cards) {
  return cards.map((card, i) => ({ ...card, text: card.text || `Card ${i + 1}` }))
}

function withLabel(cards) {
  return cards.map((card, i) => ({ ...card, label: card.label || `Item ${i + 1}` }))
}

// ---------------------------------------------------------------------------
// Model — id generation
// ---------------------------------------------------------------------------

test('nextId reuses the first free numeric suffix and never collides', () => {
  assert.equal(nextId('item', []), 'item_1')
  assert.equal(nextId('item', ['item_1', 'item_2', 'item_4']), 'item_3')
  assert.equal(nextId('item', ['item_1', 'item_9']), 'item_2')
  assert.equal(nextId('zone', ['item_1', 'zone_1', 'zone_2']), 'zone_3')
})

test('isValidId enforces the shared identifier pattern', () => {
  assert.equal(isValidId('item_1'), true)
  assert.equal(isValidId('zone-a'), false)
  assert.equal(isValidId('1item'), false)
  assert.equal(isValidId(''), false)
})

// ---------------------------------------------------------------------------
// Model — Drag & Drop
// ---------------------------------------------------------------------------

test('drag-drop: add item + add zone + assignment generates a fully valid draft', () => {
  const tpl = authorable(buildQuestionTemplate('drag-drop'))
  const items = withLabel([...tpl.payload.items, makeDragItem(tpl.payload.items.map((i) => i.id))])
  const zones = withLabel([...tpl.payload.zones, makeZone(tpl.payload.zones.map((z) => z.id))])
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, items, zones },
    correctAnswer: buildDragDropAnswer(items, zones, []),
  }
  assert.equal(items.length, 3)
  assert.equal(zones.length, 3)
  assert.equal(items[2].id, 'item_3')
  assert.equal(zones[2].id, 'zone_3')
  // every item is mapped to the first zone by default
  assert.equal(draft.correctAnswer.mappings.length, 3)
  assertValid(draft, 'drag-drop with new item+zone')
})

test('drag-drop: editing existing preserves ids and existing mappings', () => {
  const tpl = authorable(buildQuestionTemplate('drag-drop'))
  const mappings = [
    { itemId: 'item_1', zoneId: 'zone_2' },
    { itemId: 'item_2', zoneId: 'zone_1' },
  ]
  const answer = buildDragDropAnswer(tpl.payload.items, tpl.payload.zones, mappings)
  assert.deepEqual(answer.mappings, mappings, 'existing mappings preserved')
  // re-adding one item keeps the old mapping for that item
  const items = withLabel([...tpl.payload.items, makeDragItem(tpl.payload.items.map((i) => i.id))])
  const next = buildDragDropAnswer(items, tpl.payload.zones, answer.mappings)
  assert.deepEqual(
    next.mappings.filter((m) => m.itemId !== 'item_3'),
    mappings,
    'pre-existing mappings untouched'
  )
  assert.equal(next.mappings.find((m) => m.itemId === 'item_3').zoneId, 'zone_1', 'new item defaults to first zone')
})

test('drag-drop: removing a zone re-assigns its items to a live zone', () => {
  const tpl = authorable(buildQuestionTemplate('drag-drop'))
  const zones = tpl.payload.zones.slice(0, 1)
  const answer = buildDragDropAnswer(tpl.payload.items, zones, [
    { itemId: 'item_1', zoneId: 'zone_2' },
    { itemId: 'item_2', zoneId: 'zone_2' },
  ])
  assert.ok(answer.mappings.every((m) => m.zoneId === 'zone_1'), 'dangling mappings re-homed to zone_1')
})

test('drag-drop: an item with no label is surfaced as invalid (schema anyOf)', () => {
  const tpl = authorable(buildQuestionTemplate('drag-drop'))
  const items = [...tpl.payload.items, makeDragItem(tpl.payload.items.map((i) => i.id))]
  const draft = { ...tpl, payload: { ...tpl.payload, items } }
  assertInvalid(draft, 'drag-drop with an empty-label item')
})

// ---------------------------------------------------------------------------
// Model — Matching
// ---------------------------------------------------------------------------

test('matching: add left/right/distractor + pairs generates a fully valid draft', () => {
  const tpl = authorable(buildQuestionTemplate('matching'))
  const left = withText([...tpl.payload.leftItems, makeLeftCard(tpl.payload.leftItems.map((c) => c.id))])
  const right = withText([...tpl.payload.rightItems, makeRightCard(tpl.payload.rightItems.map((c) => c.id))])
  const distractors = withText([makeDistractor([])])
  const pairs = [
    { leftId: left[0].id, rightId: right[0].id },
    { leftId: left[1].id, rightId: right[1].id },
    { leftId: left[2].id, rightId: right[0].id },
  ]
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, leftItems: left, rightItems: right, distractors },
    correctAnswer: buildMatchingAnswer(left, right, pairs),
  }
  assertValid(draft, 'matching with new cards + shared target')
})

test('matching: shared targets are allowed (one right card may match many lefts)', () => {
  const tpl = authorable(buildQuestionTemplate('matching'))
  const right = tpl.payload.rightItems
  const left = tpl.payload.leftItems
  const draft = {
    ...tpl,
    correctAnswer: buildMatchingAnswer(left, right, [
      { leftId: left[0].id, rightId: right[0].id },
      { leftId: left[1].id, rightId: right[0].id },
    ]),
  }
  assertValid(draft, 'shared-target matching draft')
  assert.equal(draft.correctAnswer.pairs.length, 2)
})

test('matching: editing existing preserves pairs; a distractor never receives a pair', () => {
  const tpl = authorable(buildQuestionTemplate('matching'))
  const right = withText([...tpl.payload.rightItems, makeRightCard(tpl.payload.rightItems.map((c) => c.id))])
  const pairs = [
    { leftId: 'left_1', rightId: 'right_1' },
    { leftId: 'left_2', rightId: 'right_2' },
  ]
  const answer = buildMatchingAnswer(tpl.payload.leftItems, right, pairs)
  assert.deepEqual(answer.pairs, pairs, 'existing pairs preserved')
  // a pair pointing at a distractor is dropped for a live right card
  const distractorOnly = buildMatchingAnswer(tpl.payload.leftItems, right, [
    { leftId: 'left_1', rightId: 'distractor_1' },
    { leftId: 'left_2', rightId: 'right_1' },
  ])
  assert.ok(distractorOnly.pairs.every((p) => p.rightId !== 'distractor_1'))
  assert.ok(distractorOnly.pairs.every((p) => right.some((c) => c.id === p.rightId)))
})

// ---------------------------------------------------------------------------
// Model — Ordering
// ---------------------------------------------------------------------------

test('ordering: reorder + anchor generates a fully valid draft (position = rank)', () => {
  const tpl = authorable(buildQuestionTemplate('ordering'))
  const reordered = moveInList(tpl.payload.items, 0, 1) // step_2, step_1, step_3
  const anchors = buildAnchors(reordered, ['step_1'])
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, items: reordered, anchors },
    correctAnswer: { order: buildOrder(reordered) },
  }
  assert.deepEqual(draft.correctAnswer.order, ['step_2', 'step_1', 'step_3'])
  assert.deepEqual(anchors, [{ position: 1, itemId: 'step_1' }])
  assertValid(draft, 'ordering with reorder + anchor')
})

test('ordering: adding a step preserves the authored order and appends the new item', () => {
  const tpl = authorable(buildQuestionTemplate('ordering'))
  const items = withLabel([...tpl.payload.items, makeOrderItem(tpl.payload.items.map((i) => i.id))])
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, items },
    correctAnswer: { order: buildOrder(items) },
  }
  assert.deepEqual(draft.correctAnswer.order, ['step_1', 'step_2', 'step_3', 'step_4'])
  assertValid(draft, 'ordering with added step')
})

test('ordering: removing an item drops its anchor and keeps the rest valid', () => {
  const tpl = authorable(buildQuestionTemplate('ordering'))
  // four steps so removal still satisfies the 3-item minimum
  const items = withLabel([...tpl.payload.items, makeOrderItem(tpl.payload.items.map((i) => i.id))])
  const anchors = buildAnchors(items, ['step_1', 'step_4'])
  const nextItems = items.filter((i) => i.id !== 'step_1')
  const nextAnchors = anchors.filter((a) => a.itemId !== 'step_1')
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, items: nextItems, anchors: buildAnchors(nextItems, nextAnchors.map((a) => a.itemId)) },
    correctAnswer: { order: buildOrder(nextItems) },
  }
  assert.deepEqual(draft.payload.anchors, [{ position: 2, itemId: 'step_4' }])
  assertValid(draft, 'ordering after item removal')
})

test('ordering: fully-anchored + shuffle is surfaced as invalid', () => {
  const tpl = authorable(buildQuestionTemplate('ordering'))
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, shuffle: true, anchors: buildAnchors(tpl.payload.items, tpl.payload.items.map((i) => i.id)) },
    correctAnswer: { order: buildOrder(tpl.payload.items) },
  }
  assertInvalid(draft, 'ordering with every position anchored while shuffling')
})

// ---------------------------------------------------------------------------
// Model — Sorting
// ---------------------------------------------------------------------------

test('sorting: add category + item + assignment generates a fully valid draft', () => {
  const tpl = authorable(buildQuestionTemplate('sorting'))
  const categories = withLabel([...tpl.payload.categories, makeCategory(tpl.payload.categories.map((c) => c.id))])
  const items = withLabel([...tpl.payload.items, makeSortItem(tpl.payload.items.map((i) => i.id))])
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, categories, items },
    correctAnswer: buildSortingAnswer(items, categories, []),
  }
  assert.equal(draft.correctAnswer.assignments.length, items.length)
  assertValid(draft, 'sorting with new category + item')
})

test('sorting: editing existing preserves assignments and ids', () => {
  const tpl = authorable(buildQuestionTemplate('sorting'))
  const assignments = [
    { itemId: 'item_1', categoryId: 'category_2' },
    { itemId: 'item_2', categoryId: 'category_1' },
    { itemId: 'item_3', categoryId: 'category_1' },
  ]
  const answer = buildSortingAnswer(tpl.payload.items, tpl.payload.categories, assignments)
  assert.deepEqual(answer.assignments, assignments, 'existing assignments preserved')
  // a removed category re-assigns its items to a live category
  const categories = tpl.payload.categories.slice(0, 1)
  const next = buildSortingAnswer(tpl.payload.items, categories, assignments)
  assert.ok(next.assignments.every((a) => a.categoryId === 'category_1'))
})

test('sorting: an unassigned item is surfaced by the advisory integrity rule', () => {
  const tpl = authorable(buildQuestionTemplate('sorting'))
  // 3 items, but only 2 assigned → validateAssignments flags the missing one
  const errors = validateAssignments(tpl.payload, {
    assignments: [
      { itemId: 'item_1', categoryId: 'category_1' },
      { itemId: 'item_2', categoryId: 'category_2' },
    ],
  })
  assert.ok(errors.length > 0)
  assert.ok(errors.some((e) => (e.ruleId ?? '').includes('assignments-cover-items')), JSON.stringify(errors))
})

// ---------------------------------------------------------------------------
// Model — Fill & Complete (Task 5.11B)
// ---------------------------------------------------------------------------

test('fill-complete: adding a blank + text answer generates a fully valid draft', () => {
  const tpl = authorable(buildQuestionTemplate('fill-complete'))
  const blanks = [...tpl.payload.blanks, { ...makeBlank(tpl.payload.blanks.map((b) => b.id)), label: 'Answer 3' }]
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, blanks, template: `${tpl.payload.template} ___.` },
    correctAnswer: buildBlankAnswers(blanks, {
      blank_1: { accepted: ['France'] },
      blank_2: { accepted: ['Euro', 'euro'] },
      blank_3: { accepted: ['Paris'] },
    }),
  }
  assert.equal(blanks[2].id, 'blank_3')
  assert.equal(blanks[2].type, 'text')
  assertValid(draft, 'fill-complete with added blank')
})

test('fill-complete: numeric and expression blanks emit into their answer groups', () => {
  const tpl = authorable(buildQuestionTemplate('fill-complete'))
  const blanks = [
    { id: 'blank_1', type: 'text', maxLength: 24 },
    { id: 'blank_2', type: 'number', maxLength: 24 },
    { id: 'blank_3', type: 'expression', maxLength: 24 },
  ]
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, blanks, template: '___. ___. ___.' },
    correctAnswer: buildBlankAnswers(blanks, {
      blank_1: { accepted: ['water'] },
      blank_2: { mode: 'range', min: 4, max: 6 },
      blank_3: { accepted: ['x^2', 'x*x'] },
    }),
  }
  assert.equal(draft.correctAnswer.numeric[0].blankId, 'blank_2')
  assert.deepEqual(draft.correctAnswer.numeric[0].min, 4)
  assert.equal(draft.correctAnswer.expression[0].blankId, 'blank_3')
  assertValid(draft, 'fill-complete numeric+expression')
})

test('fill-complete: editing existing preserves authored accepted values', () => {
  const tpl = authorable(buildQuestionTemplate('fill-complete'))
  const draft = {
    ...tpl,
    correctAnswer: buildBlankAnswers(tpl.payload.blanks, {
      blank_1: { accepted: ['Paris'] },
      blank_2: { accepted: ['Euro'] },
    }),
  }
  assert.deepEqual(draft.correctAnswer.answers[0].accepted, ['Paris'])
  assertValid(draft, 'fill-complete editing existing')
})

// ---------------------------------------------------------------------------
// Model — Pattern (Task 5.11B)
// ---------------------------------------------------------------------------

test('pattern: candidate answer with construct-next is valid (acceptableIds >= constructCount)', () => {
  const tpl = authorable(buildQuestionTemplate('pattern'))
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, interaction: 'construct-next', constructCount: 2 },
    correctAnswer: buildPatternAnswer('construct-next', tpl.payload.candidates, { type: 'candidate', acceptableIds: ['cand_1', 'cand_2'] }),
  }
  assert.equal(draft.correctAnswer.type, 'candidate')
  assertValid(draft, 'pattern construct-next candidate')
})

test('pattern: withPatternKind switches an element between display kinds', () => {
  const element = makePatternElement('seq', [])
  assert.equal(element.id, 'seq_1')
  const text = withPatternKind(element, 'text')
  assert.equal(typeof text.text, 'string')
  assert.equal(text.number, undefined)
  const shape = withPatternKind(element, 'shape')
  assert.equal(shape.shape, 'circle')
})

test('pattern: numeric range and text answers build the correct document', () => {
  const tpl = authorable(buildQuestionTemplate('pattern'))
  const numeric = { ...tpl, correctAnswer: buildPatternAnswer('complete-sequence', tpl.payload.candidates, { type: 'numeric', mode: 'range', min: 8, max: 10 }) }
  assert.deepEqual(numeric.correctAnswer.min, 8)
  assertValid(numeric, 'pattern numeric range')
  const text = { ...tpl, correctAnswer: buildPatternAnswer('complete-sequence', tpl.payload.candidates, { type: 'text', accepted: ['red'] }) }
  assert.deepEqual(text.correctAnswer.accepted, ['red'])
  assertValid(text, 'pattern text')
})

// ---------------------------------------------------------------------------
// Model — Memory (Task 5.11B)
// ---------------------------------------------------------------------------

test('memory: group assignments produce a fully valid pairs draft', () => {
  const tpl = authorable(buildQuestionTemplate('memory'))
  const groups = [makeMemoryGroup([]), makeMemoryGroup(['group_1'])]
  assert.equal(groups[1].groupId, 'group_2')
  const correctAnswer = buildMemoryGroups(tpl.payload.cards, groups, {
    card_1: 'group_1', card_2: 'group_1', card_3: 'group_2', card_4: 'group_2',
  })
  const draft = { ...tpl, correctAnswer }
  assert.equal(correctAnswer.groups[0].cardIds.length, 2)
  assertValid(draft, 'memory pairs')
})

test('memory: assignments referencing a removed group re-home to the first group', () => {
  const tpl = authorable(buildQuestionTemplate('memory'))
  const groups = [makeMemoryGroup([]), makeMemoryGroup(['group_1'])]
  const correctAnswer = buildMemoryGroups(tpl.payload.cards, groups, {
    card_1: 'group_1',
    card_2: 'group_2',
    card_3: 'group_9',
    card_4: 'group_9',
  })
  const byGroup = Object.fromEntries(correctAnswer.groups.map((g) => [g.groupId, g.cardIds]))
  assert.deepEqual(byGroup['group_1'].sort(), ['card_1', 'card_3', 'card_4'].sort(), 'unknown-group cards fall back to the first group')
  assert.deepEqual(byGroup['group_2'], ['card_2'])
})

// ---------------------------------------------------------------------------
// Model — Scenario Challenge (Task 5.11B)
// ---------------------------------------------------------------------------

test('scenario: decision tree with optimal path generates a valid draft', () => {
  const tpl = authorable(buildQuestionTemplate('scenario-challenge'))
  const fresh = makeDecision(tpl.payload.decisions.map((d) => d.id), tpl.payload.decisions.flatMap((d) => d.options.map((o) => o.id)))
  const decisions = [...tpl.payload.decisions, { ...fresh, text: 'Check the soil first.', options: fresh.options.map((o) => ({ ...o, text: o.id === fresh.options[0].id ? 'Dig a probe hole' : 'Skip the check' })) }]
  // route option_1 to the new decision
  const tree = decisions.map((d) => (d.id === 'decision_1' ? { ...d, options: d.options.map((o) => (o.id === 'option_1' ? { ...o, nextDecision: 'decision_2' } : o)) } : d))
  const correctAnswer = buildScenarioAnswer({ ...tpl.payload, decisions: tree }, { optimal: { decision_1: 'option_1', decision_2: 'option_3' } })
  const draft = { ...tpl, payload: { ...tpl.payload, decisions: tree }, correctAnswer }
  assert.equal(correctAnswer.optimalPath.length, 2)
  assert.deepEqual(correctAnswer.optimalPath[0], { decisionId: 'decision_1', optionId: 'option_1' })
  assertValid(draft, 'scenario decision tree')
})

test('scenario: acceptable options and terminal-only path are valid', () => {
  const tpl = authorable(buildQuestionTemplate('scenario-challenge'))
  const draft = {
    ...tpl,
    correctAnswer: buildScenarioAnswer(tpl.payload, { optimal: { decision_1: 'option_1' }, acceptable: { decision_1: ['option_2'] } }),
  }
  assert.deepEqual(draft.correctAnswer.acceptableOptions.decision_1, ['option_2'])
  assertValid(draft, 'scenario with acceptable options')
})

// ---------------------------------------------------------------------------
// Model — Number / Logic (Task 5.11B)
// ---------------------------------------------------------------------------

test('number-logic: single-part exact spec generates a valid draft', () => {
  const tpl = authorable(buildQuestionTemplate('number-logic'))
  const draft = { ...tpl, correctAnswer: buildNumberLogicAnswer(tpl.payload, { type: 'exact', fields: { value: 12 } }) }
  assert.deepEqual(draft.correctAnswer.value, 12)
  assertValid(draft, 'number-logic single-part exact')
})

test('number-logic: multi-part specs generate per-part documents (parts match)', () => {
  const tpl = authorable(buildQuestionTemplate('number-logic'))
  const parts = [makeNumberLogicPart([]), makeNumberLogicPart(['part_1'])]
  const partsPayload = parts.map((p, i) => ({ ...p, label: `Step ${i + 1}` }))
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, parts: partsPayload },
    correctAnswer: buildNumberLogicAnswer({ ...tpl.payload, parts: partsPayload }, { parts: { part_1: { type: 'exact', value: 4 }, part_2: { type: 'range', min: 8, max: 12 } } }),
  }
  assert.equal(draft.correctAnswer.parts.length, 2)
  assertValid(draft, 'number-logic multi-part')
})

test('number-logic: answer type must be compatible with the answerFormat (advisory)', () => {
  const tpl = authorable(buildQuestionTemplate('number-logic'))
  const draft = {
    ...tpl,
    payload: { ...tpl.payload, answerFormat: 'fraction' },
    correctAnswer: buildNumberLogicAnswer({ ...tpl.payload, answerFormat: 'fraction' }, { type: 'fraction', fields: { numerator: 1, denominator: 2 } }),
  }
  assertValid(draft, 'number-logic fraction')
})

// ---------------------------------------------------------------------------
// Renders — each visual form from a template
// ---------------------------------------------------------------------------

async function loadComponent(path) {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  const mod = await vite.ssrLoadModule(path)
  return { vite, mod }
}

function renderForm(Form, payload, correctAnswer) {
  return renderToStaticMarkup(React.createElement(Form, { payload, correctAnswer, onChange: () => {}, disabled: false }))
}

test('drag-drop form renders sections and template items/zones', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/drag-drop-form.jsx')
  try {
    const tpl = buildQuestionTemplate('drag-drop')
    const html = renderForm(mod.default, tpl.payload, tpl.correctAnswer)
    assert.ok(html.includes('Items'))
    assert.ok(html.includes('Zones'))
    assert.ok(html.includes('Behaviour'))
    assert.ok(html.includes('Item 1'))
    assert.ok(html.includes('Zone 1'))
    assert.ok(html.includes('Goes to'), 'per-item zone assignment selector')
  } finally {
    await vite.close()
  }
})

test('matching form renders columns, distractors and pair selectors', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/matching-form.jsx')
  try {
    const tpl = buildQuestionTemplate('matching')
    const html = renderForm(mod.default, tpl.payload, tpl.correctAnswer)
    assert.ok(html.includes('Left cards'))
    assert.ok(html.includes('Right cards'))
    assert.ok(html.includes('Distractors'))
    assert.ok(html.includes('Pairs with'))
    assert.ok(html.includes('Item A'))
  } finally {
    await vite.close()
  }
})

test('ordering form renders an ordered list with rank, reorder and anchors', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/ordering-form.jsx')
  try {
    const tpl = buildQuestionTemplate('ordering')
    const html = renderForm(mod.default, tpl.payload, tpl.correctAnswer)
    assert.ok(html.includes('Sequence'))
    assert.ok(html.includes('Lock here'))
    assert.ok(html.includes('Step 1'))
    assert.ok(html.match(/aq-rank/g).length === 3, 'three ranked positions')
  } finally {
    await vite.close()
  }
})

test('sorting form renders categories, items and assignment selectors', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/sorting-form.jsx')
  try {
    const tpl = buildQuestionTemplate('sorting')
    const html = renderForm(mod.default, tpl.payload, tpl.correctAnswer)
    assert.ok(html.includes('Categories'))
    assert.ok(html.includes('Classify each item'))
    assert.ok(html.includes('Category 1'))
    assert.ok(html.includes('Item 1'))
  } finally {
    await vite.close()
  }
})

test('fill-complete form renders template, blanks and per-blank answer editors', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/fill-complete-form.jsx')
  try {
    const tpl = buildQuestionTemplate('fill-complete')
    const html = renderForm(mod.default, tpl.payload, tpl.correctAnswer)
    assert.ok(html.includes('Template'))
    assert.ok(html.includes('Blanks'))
    assert.ok(html.includes('blank_1'))
    assert.ok(html.includes('Accepted answers'))
    assert.ok(html.includes('Keypad'))
  } finally {
    await vite.close()
  }
})

test('pattern form renders interaction, sequence, candidates and answer rule', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/pattern-form.jsx')
  try {
    const tpl = buildQuestionTemplate('pattern')
    const html = renderForm(mod.default, tpl.payload, tpl.correctAnswer)
    assert.ok(html.includes('Interaction'))
    assert.ok(html.includes('Sequence'))
    assert.ok(html.includes('Candidates'))
    assert.ok(html.includes('Correct-answer rule'))
    assert.ok(html.includes('seq_1'))
    assert.ok(html.includes('cand_1'))
  } finally {
    await vite.close()
  }
})

test('memory form renders deck settings, cards and answer groups', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/memory-form.jsx')
  try {
    const tpl = buildQuestionTemplate('memory')
    const html = renderForm(mod.default, tpl.payload, { groups: [{ groupId: 'group_1', cardIds: ['card_1', 'card_2'] }, { groupId: 'group_2', cardIds: ['card_3', 'card_4'] }] })
    assert.ok(html.includes('Deck'))
    assert.ok(html.includes('Cards'))
    assert.ok(html.includes('Groups'))
    assert.ok(html.includes('card_1'))
    assert.ok(html.includes('group_1'))
  } finally {
    await vite.close()
  }
})

test('scenario-challenge form renders the mission and decision tree', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/scenario-challenge-form.jsx')
  try {
    const tpl = buildQuestionTemplate('scenario-challenge')
    const html = renderForm(mod.default, tpl.payload, { optimalPath: [{ decisionId: 'decision_1', optionId: 'option_1' }] })
    assert.ok(html.includes('Mission'))
    assert.ok(html.includes('Decision tree'))
    assert.ok(html.includes('decision_1'))
    assert.ok(html.includes('option_1'))
    assert.ok(html.includes('Optimal option'))
  } finally {
    await vite.close()
  }
})

test('number-logic form renders problem, format and answer-spec sections', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/number-logic-form.jsx')
  try {
    const tpl = buildQuestionTemplate('number-logic')
    const html = renderForm(mod.default, tpl.payload, { type: 'exact', value: 12 })
    assert.ok(html.includes('Problem'))
    assert.ok(html.includes('Answer format'))
    assert.ok(html.includes('Correct-answer spec'))
    assert.ok(html.includes('Input mode'))
    assert.ok(html.includes('Multi-part question'))
  } finally {
    await vite.close()
  }
})

test('disabled forms render controls disabled (published read-only path)', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/drag-drop-form.jsx')
  try {
    const tpl = buildQuestionTemplate('drag-drop')
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { payload: tpl.payload, correctAnswer: tpl.correctAnswer, onChange: () => {}, disabled: true })
    )
    assert.ok(/disabled/g.test(html), 'controls carry the disabled attribute')
  } finally {
    await vite.close()
  }
})

// ---------------------------------------------------------------------------
// Editor integration
// ---------------------------------------------------------------------------

function renderEditor(mod, { questionId = null, seeded = {} }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['admin', 'questions', 'catalogue'], seedQuestionCatalogue())
  for (const [key, value] of Object.entries(seeded)) {
    client.setQueryData(['admin', 'questions', 'detail', key], { question: value })
  }
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(MemoryRouter, { initialEntries: ['/admin/questions'] }, React.createElement(mod.default, { questionId }))
    )
  )
}

test('editor uses the visual form and no raw JSON for a production type', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionEditor.jsx')
  try {
    const html = renderEditor(mod, { questionId: null })
    assert.ok(html.includes('The correct answer is derived from the visual form'))
    assert.ok(!html.includes('Payload (JSON)'), 'no raw payload JSON for visual types')
    assert.ok(!html.includes('aq-editor__correct'), 'no collapsed raw correct-answer editor')
    assert.ok(html.includes('Student-facing preview'))
  } finally {
    await vite.close()
  }
})

test('registry exposes visual forms for all ten production activity types', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/registry.js')
  try {
    const { hasVisualForm } = mod
    const slugs = ['drag-drop', 'matching', 'ordering', 'sorting', 'fill-complete', 'find-word', 'pattern', 'memory', 'scenario-challenge', 'number-logic']
    for (const slug of slugs) {
      assert.equal(hasVisualForm(slug), true, `${slug} has a visual form`)
    }
    assert.equal(hasVisualForm('not-a-real-type'), false, 'unknown types keep the raw JSON fallback')
  } finally {
    await vite.close()
  }
})

test('advisory answer-integrity check flags an unmapped item using the exact plugin rule', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/visual-editor/registry.js')
  try {
    const { checkAnswerIntegrity } = mod
    const tpl = authorable(buildQuestionTemplate('drag-drop'))
    // only item_1 mapped → item_2 unmapped
    const errors = checkAnswerIntegrity('drag-drop', tpl.payload, {
      mappings: [{ itemId: 'item_1', zoneId: 'zone_1' }],
    })
    assert.ok(errors.length > 0)
    assert.ok(errors.some((e) => (e.ruleId ?? '').includes('mappings-cover-items')), JSON.stringify(errors))
    assert.equal(checkAnswerIntegrity('drag-drop', tpl.payload, { mappings: [] }).length > 0, true)
  } finally {
    await vite.close()
  }
})

test('editor keeps raw JSON only for unknown activity types, never for the ten production types', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionEditor.jsx')
  try {
    // unknown type → raw payload JSON fallback
    const unknown = buildQuestionTemplate('fill-complete')
    const html = renderEditor(mod, {
      questionId: 5,
      seeded: {
        '5': {
          ...unknown,
          id: 5,
          activityType: 'not-a-real-type',
          prompt: 'A sufficiently long prompt.',
          explanation: 'A sufficiently long explanation.',
          correctAnswer: { answers: [] },
        },
      },
    })
    assert.ok(html.includes('Payload (JSON)'), 'raw payload JSON shown for unknown types')
  } finally {
    await vite.close()
  }
})

test('editor renders the visual form (no raw JSON) for every production type', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionEditor.jsx')
  try {
    const slugs = ['drag-drop', 'matching', 'ordering', 'sorting', 'fill-complete', 'find-word', 'pattern', 'memory', 'scenario-challenge', 'number-logic']
    for (const slug of slugs) {
      const tpl = buildQuestionTemplate(slug)
      const html = renderEditor(mod, {
        questionId: 7,
        seeded: { '7': { ...tpl, id: 7, activityType: slug, prompt: 'A sufficiently long prompt.', explanation: 'A sufficiently long explanation.' } },
      })
      assert.ok(html.includes('The correct answer is derived from the visual form'), `${slug}: visual form shown`)
      assert.ok(!html.includes('Payload (JSON)'), `${slug}: no raw payload JSON`)
    }
  } finally {
    await vite.close()
  }
})

test('published questions render read-only with no save action', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionEditor.jsx')
  try {
    const tpl = buildQuestionTemplate('drag-drop')
    const published = {
      ...tpl,
      id: 3,
      status: 'published',
      version: 2,
      prompt: 'A sufficiently long prompt.',
      explanation: 'A sufficiently long explanation.',
      correctAnswer: { mappings: [{ itemId: 'item_1', zoneId: 'zone_1' }, { itemId: 'item_2', zoneId: 'zone_2' }] },
    }
    const html = renderEditor(mod, { questionId: 3, seeded: { '3': published } })
    assert.ok(html.includes('Published and archived questions are read-only'))
    assert.ok(!html.includes('Save changes'), 'no save action for published')
    assert.ok(!html.includes('Create question'), 'no create action for published')
    assert.ok(/disabled/g.test(html), 'form controls disabled')
  } finally {
    await vite.close()
  }
})

test('editing an existing draft renders its values into the visual form (ids preserved)', async () => {
  const { vite, mod } = await loadComponent('/src/features/admin-questions/components/QuestionEditor.jsx')
  try {
    const tpl = buildQuestionTemplate('matching')
    const existing = {
      ...tpl,
      id: 9,
      status: 'draft',
      prompt: 'A sufficiently long prompt.',
      explanation: 'A sufficiently long explanation.',
      payload: {
        ...tpl.payload,
        leftItems: [
          { id: 'left_1', text: 'Nucleus' },
          { id: 'left_2', text: 'Membrane' },
        ],
        rightItems: [
          { id: 'right_1', text: 'Controls the cell' },
          { id: 'right_2', text: 'Boundary' },
        ],
      },
      correctAnswer: {
        pairs: [
          { leftId: 'left_1', rightId: 'right_1' },
          { leftId: 'left_2', rightId: 'right_2' },
        ],
      },
    }
    const html = renderEditor(mod, { questionId: 9, seeded: { '9': existing } })
    assert.ok(html.includes('Nucleus'))
    assert.ok(html.includes('Boundary'))
    assert.ok(html.includes('left_1'), 'existing id preserved')
    assert.ok(html.includes('right_2'), 'existing id preserved')
  } finally {
    await vite.close()
  }
})

export default { tests: true }