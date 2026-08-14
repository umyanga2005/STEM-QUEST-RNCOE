/**
 * Activity Engine — memory plugin tests (Task 4.11).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import {
  memoryPlugin,
  registerMemory,
  validateMemoryAnswer,
} from '../plugins/memory/plugin.js'
import {
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
} from '../plugins/memory/memory-controller.js'

import minimalPayload from '../../../../schemas/examples/memory/minimal-valid-payload.json' with { type: 'json' }
import grade67Payload from '../../../../schemas/examples/memory/valid-payload-grade6-7.json' with { type: 'json' }
import grade911Payload from '../../../../schemas/examples/memory/valid-payload-grade9-11.json' with { type: 'json' }
import validCorrectAnswer from '../../../../schemas/examples/memory/valid-correct-answer.json' with { type: 'json' }
import invalidCorrectAnswer from '../../../../schemas/examples/memory/invalid-correct-answer.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/memory/invalid-payload.json' with { type: 'json' }

// minimalPayload: pairs deck, cards c1 H2O, c2 Water, c3 CO2, c4 Carbon dioxide.
// grade67Payload: pairs deck, c1 Lion, c2 Carnivore, c3 Rabbit, c4 Herbivore.
// grade911Payload: pairs deck, c1..c6 expressions; validCorrectAnswer has 3 groups (c1c2, c3c4, c5c6).

// Self-consistent 2-group pairs answer for the 4-card fixtures.
const pairsAnswer = {
  groups: [
    { groupId: 'g1', cardIds: ['c1', 'c2'] },
    { groupId: 'g2', cardIds: ['c3', 'c4'] },
  ],
}

// A sets deck (groups of 3–4) with a self-consistent answer.
const setsPayload = {
  schemaVersion: '1.0',
  cards: [
    { id: 'c1', text: 'Solid' },
    { id: 'c2', text: 'Liquid' },
    { id: 'c3', text: 'Gas' },
    { id: 'c4', text: 'Rock' },
    { id: 'c5', text: 'Water' },
    { id: 'c6', text: 'Air' },
  ],
  revealSeconds: 15,
  recallPrompt: 'Group each state of matter with an example.',
  deckType: 'sets',
  shuffle: true,
  maxAttempts: 2,
}
const setsAnswer = {
  groups: [
    { groupId: 'g1', cardIds: ['c1', 'c2', 'c3'] },
    { groupId: 'g2', cardIds: ['c4', 'c5', 'c6'] },
  ],
}

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(memoryPlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(memoryPlugin)
  return engine
}

function runAnswer(engine, response, { payload = minimalPayload, correctAnswer = pairsAnswer } = {}) {
  return engine.validateAnswer('memory', {
    submission: { questionId: 'q-mem-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

function scoringCtx(response) {
  return { submission: { response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
}

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('memory: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('memory'), true)
  const listed = engine.list().find((p) => p.type === 'memory')
  assert.equal(listed.name, 'Memory')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof memoryPlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('memory: registerMemory helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerMemory(engine)
  assert.equal(engine.has('memory'), true)
})

test('memory: coexists with other plugins; duplicate registration rejected', () => {
  const engine = createServerActivityEngine()
  registerMemory(engine)
  assert.throws(() => registerMemory(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

test('memory: engine resolves the correct schema version', () => {
  const engine = serverEngine()
  assert.equal(engine.getSchemaVersion('memory'), '1.0')
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('memory: render is a safe descriptor with no answer data', () => {
  const engine = clientEngine()
  const descriptor = engine.render('memory', {
    question: {
      prompt: 'Remember the pairs.',
      instructions: 'Study the cards, then rebuild the pairs.',
      payload: minimalPayload,
    },
  })
  assert.equal(descriptor.kind, 'memory')
  assert.equal(descriptor.deckType, 'pairs')
  assert.equal(descriptor.revealSeconds, 10)
  assert.equal(descriptor.maxAttempts, null)
  assert.equal(descriptor.shuffle, true)
  assert.equal(descriptor.prompt, 'Remember the pairs.')
  assert.equal(descriptor.recallPrompt, 'Match each formula to its name.')
  assert.equal(descriptor.cards.length, 4)
  const ids = descriptor.cards.map((c) => c.id).sort()
  assert.deepEqual(ids, ['c1', 'c2', 'c3', 'c4'])
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('correctAnswer'))
  assert.ok(!raw.includes('groups'))
  assert.ok(!raw.includes('groupId'))
  assert.ok(!raw.includes('"correct"'))
  for (const key of ['correctAnswer', 'groups', 'groupId', 'cardIds', 'expected', 'answerKey']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('memory: render exposes only public deck metadata and the deck itself', () => {
  const engine = clientEngine()
  const descriptor = engine.render('memory', { question: { payload: setsPayload } })
  assert.equal(descriptor.deckType, 'sets')
  assert.equal(descriptor.maxAttempts, 2)
  assert.equal(descriptor.revealSeconds, 15)
  assert.equal(descriptor.cards.length, 6)
  for (const card of descriptor.cards) {
    assert.equal(typeof card.text, 'string')
    assert.equal(card.imageRef, null)
  }
  const raw = JSON.stringify(descriptor)
  assert.ok(!raw.includes('groupId'))
  assert.ok(!raw.includes('"groups"'))
  assert.ok(!raw.includes('correctAnswer'))
})

test('memory: render maps image refs and keeps aria labels', () => {
  const engine = clientEngine()
  const payload = {
    ...minimalPayload,
    cards: [
      { id: 'c1', image: { ref: 'question-media/demo/memory/water.png' }, ariaLabel: 'A water molecule' },
      { id: 'c2', text: 'Water' },
      { id: 'c3', text: 'CO2' },
      { id: 'c4', text: 'Carbon dioxide' },
    ],
  }
  const descriptor = engine.render('memory', { question: { payload } })
  const c1 = descriptor.cards.find((card) => card.id === 'c1')
  const c2 = descriptor.cards.find((card) => card.id === 'c2')
  assert.equal(c1.imageRef, 'question-media/demo/memory/water.png')
  assert.equal(c1.ariaLabel, 'A water molecule')
  assert.equal(c2.text, 'Water')
})

test('memory: default maxAttempts and revealSeconds fall back safely', () => {
  const engine = clientEngine()
  const payload = { ...minimalPayload }
  delete payload.maxAttempts
  const descriptor = engine.render('memory', { question: { payload } })
  assert.equal(descriptor.maxAttempts, null)
  assert.equal(descriptor.revealSeconds, 10)
})

// --------------------------------------------------------------------------
// 3. Payload validation (schema + semantic)
// --------------------------------------------------------------------------

test('memory: valid payloads in both deck types pass', () => {
  const engine = serverEngine()
  for (const payload of [minimalPayload, grade67Payload, grade911Payload, setsPayload]) {
    const result = engine.validatePayload('memory', payload)
    assert.equal(result.valid, true, JSON.stringify(result.errors))
  }
})

test('memory: schema-invalid payloads are rejected', () => {
  const engine = serverEngine()
  const result = engine.validatePayload('memory', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

test('memory: duplicate card ids are a semantic error (uniqueItems is shallow)', () => {
  const engine = serverEngine()
  const dupCards = {
    ...minimalPayload,
    cards: [
      { id: 'c1', text: 'H2O' },
      { id: 'c1', text: 'Water' },
      { id: 'c3', text: 'CO2' },
      { id: 'c4', text: 'Carbon dioxide' },
    ],
  }
  const result = engine.validatePayload('memory', dupCards)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'memory.card-ids-unique'))
})

test('memory: a pairs deck with an odd card count is a semantic error', () => {
  const engine = serverEngine()
  const oddDeck = {
    ...minimalPayload,
    cards: [
      { id: 'c1', text: 'H2O' },
      { id: 'c2', text: 'Water' },
      { id: 'c3', text: 'CO2' },
      { id: 'c4', text: 'Carbon dioxide' },
      { id: 'c5', text: 'O2' },
    ],
  }
  const result = engine.validatePayload('memory', oddDeck)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'memory.deck-size-consistent'))
})

test('memory: a sets deck too small to split into 3–4 groups is a semantic error', () => {
  const engine = serverEngine()
  const smallSets = {
    ...setsPayload,
    cards: [
      { id: 'c1', text: 'Solid' },
      { id: 'c2', text: 'Liquid' },
      { id: 'c3', text: 'Gas' },
      { id: 'c4', text: 'Rock' },
    ],
  }
  const result = engine.validatePayload('memory', smallSets)
  assert.equal(result.valid, false)
  assert.ok(result.errors[0].details.errors.some((e) => e.ruleId === 'memory.deck-size-consistent'))
})

test('memory: a 12-card pairs deck (schema boundary) is valid', () => {
  const engine = serverEngine()
  const cards = Array.from({ length: 12 }, (_, i) => ({ id: `c${i + 1}`, text: `Card ${i + 1}` }))
  const result = engine.validatePayload('memory', { ...minimalPayload, cards })
  assert.equal(result.valid, true)
})

// --------------------------------------------------------------------------
// 4. Cross-document integrity (validateMemoryAnswer)
// --------------------------------------------------------------------------

test('memory: consistent payload/answer pairs have no integrity errors', () => {
  assert.deepEqual(validateMemoryAnswer(minimalPayload, pairsAnswer), [])
  assert.deepEqual(validateMemoryAnswer(grade67Payload, pairsAnswer), [])
  assert.deepEqual(validateMemoryAnswer(grade911Payload, validCorrectAnswer), [])
  assert.deepEqual(validateMemoryAnswer(setsPayload, setsAnswer), [])
})

test('memory: groups must cover every card exactly once', () => {
  const missing = validateMemoryAnswer(minimalPayload, { groups: [{ groupId: 'g1', cardIds: ['c1', 'c2'] }] })
  assert.ok(missing.some((e) => e.ruleId === 'memory.groups-cover-cards' && e.message.includes('c3')))
  const duplicate = validateMemoryAnswer(minimalPayload, {
    groups: [
      { groupId: 'g1', cardIds: ['c1', 'c2'] },
      { groupId: 'g2', cardIds: ['c1', 'c4'] },
    ],
  })
  assert.ok(duplicate.some((e) => e.ruleId === 'memory.groups-cover-cards' && e.message.includes('more than one')))
})

test('memory: groups must reference known cards', () => {
  const unknown = validateMemoryAnswer(minimalPayload, {
    groups: [
      { groupId: 'g1', cardIds: ['c1', 'c2'] },
      { groupId: 'g2', cardIds: ['c3', 'zzz'] },
    ],
  })
  assert.ok(unknown.some((e) => e.ruleId === 'memory.groups-cover-cards' && e.message.includes('zzz')))
})

test('memory: group sizes must match the deck type', () => {
  const pairs3 = validateMemoryAnswer(minimalPayload, {
    groups: [
      { groupId: 'g1', cardIds: ['c1', 'c2', 'c3'] },
      { groupId: 'g2', cardIds: ['c4'] },
    ],
  })
  assert.ok(pairs3.some((e) => e.ruleId === 'memory.group-size-matches-deck'))
  const sets2 = validateMemoryAnswer(setsPayload, {
    groups: [
      { groupId: 'g1', cardIds: ['c1', 'c2'] },
      { groupId: 'g2', cardIds: ['c3', 'c4'] },
      { groupId: 'g3', cardIds: ['c5', 'c6'] },
    ],
  })
  assert.ok(sets2.some((e) => e.ruleId === 'memory.group-size-matches-deck'))
})

test('memory: an inconsistent authoring pair throws before student scoring', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }] }, { payload: minimalPayload, correctAnswer: invalidCorrectAnswer }),
    (err) => err.code === ERROR_CODES.ENGINE_INTERNAL
  )
  assert.throws(
    () =>
      runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }] }, {
        payload: grade911Payload,
        correctAnswer: { groups: [{ groupId: 'g1', cardIds: ['c1', 'c2'] }, { groupId: 'g2', cardIds: ['c3', 'c4'] }] },
      }),
    (err) => err.code === ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID
  )
})

// --------------------------------------------------------------------------
// 5. Controller: phases + reveal handling
// --------------------------------------------------------------------------

const pairState = createMemoryState({ cards: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }], deckType: 'pairs' })
const setState = createMemoryState({ cards: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c5' }, { id: 'c6' }], deckType: 'sets', maxAttempts: 2 })

test('memory controller: initial state is the memorize phase with no recall', () => {
  assert.equal(isMemorizing(pairState), true)
  assert.equal(isRecalling(pairState), false)
  assert.deepEqual(selectedIds(pairState), [])
  assert.deepEqual(pairState.groups, [])
  assert.equal(pairState.revealsUsed, 1)
  assert.equal(placedCardIds(pairState).length, 0)
  assert.equal(remainingCardIds(pairState).length, 4)
  assert.equal(minGroupSize(pairState), 2)
  assert.equal(maxGroupSize(pairState), 2)
  assert.equal(minGroupSize(setState), 3)
  assert.equal(maxGroupSize(setState), 4)
})

test('memory controller: group sizes follow the deck type', () => {
  assert.deepEqual(groupSizeRange('pairs'), [2, 2])
  assert.deepEqual(groupSizeRange('sets'), [3, 4])
})

test('memory controller: interactions are no-ops before recall starts', () => {
  assert.equal(toggleCard(pairState, 'c1'), pairState)
  assert.equal(canPlaceGroup(pairState), false)
  assert.equal(placeGroup(pairState), pairState)
  assert.equal(isComplete(pairState), false)
})

test('memory controller: startRecall moves to recall and re-shuffles the deck', () => {
  const recalled = startRecall(pairState)
  assert.equal(isRecalling(recalled), true)
  assert.equal(isMemorizing(recalled), false)
  assert.equal(recalled.cards.length, 4)
  assert.deepEqual(recalled.cards.map((c) => c.id).sort(), ['c1', 'c2', 'c3', 'c4'], 'recall is a permutation')
  assert.equal(startRecall(recalled), recalled, 'already recalling is a no-op')
})

test('memory controller: review again re-enters memorize up to maxAttempts', () => {
  let s = setState
  assert.equal(canReviewAgain(s), true)
  s = startRecall(s)
  s = reviewAgain(s)
  assert.equal(isMemorizing(s), true)
  assert.equal(s.revealsUsed, 2)
  s = startRecall(s)
  assert.equal(canReviewAgain(s), false, 'maxAttempts 2 exhausted after two reveals')
  assert.equal(reviewAgain(s), s, 'no re-review past the limit')
})

test('memory controller: unlimited re-reviews without maxAttempts', () => {
  let s = pairState
  for (let i = 0; i < 5; i += 1) {
    assert.equal(canReviewAgain(s), true)
    s = startRecall(s)
    s = reviewAgain(s)
  }
  assert.equal(isMemorizing(s), true)
})

test('memory controller: shuffleList is a permutation', () => {
  const input = ['a', 'b', 'c', 'd', 'e']
  const out = shuffleList(input)
  assert.equal(out.length, input.length)
  assert.deepEqual([...out].sort(), [...input].sort())
  assert.deepEqual(input, ['a', 'b', 'c', 'd', 'e'], 'input is never mutated')
})

// --------------------------------------------------------------------------
// 6. Controller: selection, grouping, completion, serialization
// --------------------------------------------------------------------------

test('memory controller: toggle builds a selection capped at the group max', () => {
  let s = startRecall(pairState)
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  assert.deepEqual(selectedIds(s), ['c1', 'c2'])
  s = toggleCard(s, 'c3')
  assert.deepEqual(selectedIds(s), ['c1', 'c2'], 'a pairs selection caps at 2')
  s = toggleCard(s, 'c1')
  assert.deepEqual(selectedIds(s), ['c2'], 're-selecting toggles off')
})

test('memory controller: unknown and placed cards are protected', () => {
  let s = startRecall(pairState)
  assert.equal(toggleCard(s, 'zzz'), s, 'unknown id is a no-op')
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  s = placeGroup(s)
  assert.equal(toggleCard(s, 'c1'), s, 'placed cards cannot be re-selected')
})

test('memory controller: placeGroup requires a valid-size selection', () => {
  let s = startRecall(pairState)
  assert.equal(canPlaceGroup(toggleCard(s, 'c1')), false)
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  assert.equal(canPlaceGroup(s), true)
  s = placeGroup(s)
  assert.deepEqual(s.groups, [['c1', 'c2']])
  assert.deepEqual(selectedIds(s), [])
})

test('memory controller: sets groups require 3–4 cards', () => {
  let s = startRecall(setState)
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  assert.equal(canPlaceGroup(s), false, 'a 2-card set is not placeable')
  s = toggleCard(s, 'c3')
  assert.equal(canPlaceGroup(s), true)
  s = placeGroup(s)
  assert.deepEqual(s.groups, [['c1', 'c2', 'c3']])
})

test('memory controller: removeGroup returns cards to the pool', () => {
  let s = startRecall(pairState)
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  s = placeGroup(s)
  assert.equal(placedCardIds(s).length, 2)
  assert.equal(remainingCardIds(s).length, 2)
  s = removeGroup(s, 0)
  assert.deepEqual(s.groups, [])
  assert.equal(remainingCardIds(s).length, 4)
  assert.equal(removeGroup(s, 5), s, 'out-of-range index is a no-op')
})

test('memory controller: clear, clearSelection and reset', () => {
  let s = startRecall(pairState)
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  s = placeGroup(s)
  s = toggleCard(s, 'c3')
  assert.equal(clearSelection(s).selected.length, 0, 'clearSelection keeps placed groups')
  s = clear(s)
  assert.deepEqual(s.groups, [])
  assert.deepEqual(s.selected, [])
  s = reset(s)
  assert.equal(isMemorizing(s), true)
  assert.equal(s.revealsUsed, 1)
})

test('memory controller: completion needs every card placed in valid-size groups', () => {
  let s = startRecall(pairState)
  assert.equal(isComplete(s), false)
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  s = placeGroup(s)
  assert.equal(isComplete(s), false, 'half the deck is not complete')
  s = toggleCard(s, 'c3')
  s = toggleCard(s, 'c4')
  assert.equal(canPlaceGroup(s), true)
  s = placeGroup(s)
  assert.equal(isComplete(s), true)
})

test('memory controller: a full but invalid-size arrangement is never complete', () => {
  let s = startRecall({ cards: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }], deckType: 'sets' })
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  s = toggleCard(s, 'c3')
  s = placeGroup(s)
  assert.equal(isComplete(s), false, 'one card remains unplaced and size 1 is invalid')
})

test('memory controller: buildResponse serializes the groups', () => {
  let s = startRecall(pairState)
  s = toggleCard(s, 'c1')
  s = toggleCard(s, 'c2')
  s = placeGroup(s)
  s = toggleCard(s, 'c4')
  s = toggleCard(s, 'c3')
  s = placeGroup(s)
  const response = buildResponse(s)
  assert.equal(response.groups.length, 2)
  const sets = response.groups.map((g) => new Set(g.cardIds))
  assert.ok(sets.some((set) => set.has('c1') && set.has('c2')))
  assert.ok(sets.some((set) => set.has('c3') && set.has('c4')))
})

// --------------------------------------------------------------------------
// 7. Answer validation — correctness
// --------------------------------------------------------------------------

test('memory answer: a fully correct pairs recall is correct', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }] })
  assert.equal(v.correct, true)
  assert.equal(v.detail.mode, 'pairs')
  assert.equal(v.detail.total, 2)
  assert.equal(v.detail.correctCount, 2)
  assert.equal(v.detail.submitted.length, 2)
})

test('memory answer: group order and in-group order do not matter', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { groups: [{ cardIds: ['c4', 'c3'] }, { cardIds: ['c2', 'c1'] }] })
  assert.equal(v.correct, true)
  assert.equal(v.detail.correctCount, 2)
})

test('memory answer: a wrong grouping is a zero-credit submission', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c3'] }, { cardIds: ['c2', 'c4'] }] })
  assert.equal(v.correct, false)
  assert.equal(v.detail.correctCount, 0)
})

test('memory answer: partial credit counts correct groups', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c5'] }, { cardIds: ['c4', 'c6'] }] }, { payload: grade911Payload, correctAnswer: validCorrectAnswer })
  assert.equal(v.correct, false)
  assert.equal(v.detail.total, 3)
  assert.equal(v.detail.correctCount, 1)
})

test('memory answer: sets decks score the same way', () => {
  const engine = serverEngine()
  const ok = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2', 'c3'] }, { cardIds: ['c4', 'c5', 'c6'] }] }, { payload: setsPayload, correctAnswer: setsAnswer })
  assert.equal(ok.correct, true)
  const partial = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2', 'c3'] }, { cardIds: ['c4', 'c6', 'c5'] }] }, { payload: setsPayload, correctAnswer: setsAnswer })
  assert.equal(partial.correct, true, 'in-group order is irrelevant')
  const wrong = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c3', 'c5'] }, { cardIds: ['c2', 'c4', 'c6'] }] }, { payload: setsPayload, correctAnswer: setsAnswer })
  assert.equal(wrong.correct, false)
  assert.equal(wrong.detail.correctCount, 0)
})

test('memory answer: a 4-group submission against a 3-group answer cannot exceed full credit', () => {
  const engine = serverEngine()
  const payload = { ...setsPayload, cards: [...setsPayload.cards, { id: 'c7', text: 'Plasma' }, { id: 'c8', text: 'Plasma example' }, { id: 'c9', text: 'Vacuum' }, { id: 'c10', text: 'Vacuum example' }, { id: 'c11', text: 'Neutron star' }, { id: 'c12', text: 'Extreme' }] }
  const answer = {
    groups: [
      { groupId: 'g1', cardIds: ['c1', 'c2', 'c3', 'c4'] },
      { groupId: 'g2', cardIds: ['c5', 'c6', 'c7', 'c8'] },
      { groupId: 'g3', cardIds: ['c9', 'c10', 'c11', 'c12'] },
    ],
  }
  const v = runAnswer(
    engine,
    { groups: [{ cardIds: ['c1', 'c2', 'c3', 'c4'] }, { cardIds: ['c5', 'c6', 'c7', 'c8'] }, { cardIds: ['c9', 'c10', 'c11', 'c12'] }] },
    { payload, correctAnswer: answer }
  )
  assert.equal(v.correct, true)
  assert.equal(v.detail.correctCount, 3)
})

// --------------------------------------------------------------------------
// 8. Answer validation — shape gate, references, completeness, forgery
// --------------------------------------------------------------------------

test('memory answer: response shape is strictly one groups field', () => {
  const engine = serverEngine()
  const correct = { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }] }
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: correct.groups, extra: 1 }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: 'nope' }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: [] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID, 'a single group cannot cover a 4-card pairs deck')
  assert.throws(() => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'], groupId: 'g1' }, { cardIds: ['c3', 'c4'] }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID, 'groupId is never part of a response')
})

test('memory answer: malformed group entries are rejected', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, { groups: [null, { cardIds: ['c3', 'c4'] }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, ['c3', 'c4']] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: 'c3c4' }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3'] }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID, 'a 1-card group is malformed')
  assert.throws(() => runAnswer(engine, { groups: [{ cardIds: [1, 2] }, { cardIds: ['c3', 'c4'] }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(() => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c1'] }, { cardIds: ['c3', 'c4'] }] }), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID, 'intra-group duplicates are rejected')
})

test('memory answer: unknown card ids are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'zzz'] }, { cardIds: ['c3', 'c4'] }] }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('memory answer: missing and duplicate placements are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c2'] }] }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID,
    'card c2 placed twice'
  )
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c1'] }] }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

test('memory answer: an incomplete recall (missing cards) is rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }] }, { payload: grade911Payload, correctAnswer: validCorrectAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID,
    'a 6-card deck requires all six cards placed'
  )
})

test('memory answer: deck-type size violations are rejected', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2', 'c3'] }, { cardIds: ['c4'] }] }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID,
    'a pairs group cannot hold 3'
  )
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }, { cardIds: ['c5', 'c6'] }] }, { payload: setsPayload, correctAnswer: setsAnswer }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID,
    'a sets group cannot hold 2'
  )
})

test('memory answer: forged correctness fields are rejected, never believed', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, { groups: [{ cardIds: ['c1', 'c3'] }, { cardIds: ['c2', 'c4'] }], correctnessFraction: 1, score: 999, correct: true, correctCount: 2 }),
    (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID
  )
})

// --------------------------------------------------------------------------
// 9. Scoring
// --------------------------------------------------------------------------

test('memory scoring: full credit is 1.0 with correct scorableUnits', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }] })
  const scoring = engine.scoringInputs('memory', scoringCtx({ groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c4'] }] }), v)
  assert.equal(scoring.correctnessFraction, 1)
  assert.equal(scoring.scorableUnits, 2)
  assert.equal(scoring.correctUnits, 2)
})

test('memory scoring: partial credit is a correct fraction', () => {
  const engine = serverEngine()
  const response = { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c5'] }, { cardIds: ['c4', 'c6'] }] }
  const v = runAnswer(engine, response, { payload: grade911Payload, correctAnswer: validCorrectAnswer })
  const scoring = engine.scoringInputs('memory', scoringCtx(response), v)
  assert.equal(scoring.correctnessFraction, 1 / 3)
  assert.equal(scoring.scorableUnits, 3)
  assert.equal(scoring.correctUnits, 1)
})

test('memory scoring: zero credit is 0.0', () => {
  const engine = serverEngine()
  const v = runAnswer(engine, { groups: [{ cardIds: ['c1', 'c3'] }, { cardIds: ['c2', 'c4'] }] })
  const scoring = engine.scoringInputs('memory', scoringCtx({ groups: [{ cardIds: ['c1', 'c3'] }, { cardIds: ['c2', 'c4'] }] }), v)
  assert.equal(scoring.correctnessFraction, 0)
})

test('memory scoring: evidence carries submitted groups only, never the expected grouping', () => {
  const engine = serverEngine()
  const response = { groups: [{ cardIds: ['c1', 'c2'] }, { cardIds: ['c3', 'c5'] }, { cardIds: ['c4', 'c6'] }] }
  const v = runAnswer(engine, response, { payload: grade911Payload, correctAnswer: validCorrectAnswer })
  const scoring = engine.scoringInputs('memory', scoringCtx(response), v)
  assert.deepEqual(scoring.evidence, [
    { cardIds: ['c1', 'c2'], correct: true },
    { cardIds: ['c3', 'c5'], correct: false },
    { cardIds: ['c4', 'c6'], correct: false },
  ])
  const raw = JSON.stringify(scoring)
  assert.ok(!raw.includes('groupId'))
  assert.ok(!raw.includes('expected'))
})

// --------------------------------------------------------------------------
// 10. Hints
// --------------------------------------------------------------------------

test('memory: hints are authored and never reveal the answer', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('memory', {
    hints: [{ level: 1, text: 'Think about the relationship between the cards you saw.' }],
  })
  assert.equal(hints.length, 1)
  assert.equal(hints[0].text, 'Think about the relationship between the cards you saw.')
  assert.ok(!JSON.stringify(hints).includes('c1'))
})

test('memory: no hints when none are authored', () => {
  const engine = clientEngine()
  assert.deepEqual(engine.buildHints('memory', { hints: null }), [])
})

// --------------------------------------------------------------------------
// 11. Feedback
// --------------------------------------------------------------------------

test('memory feedback: correct / partial / incorrect / timeout', () => {
  const engine = serverEngine()
  const ok = { submission: { state: 'submitted' }, interactionMetrics: { attemptsUsed: 1 } }
  const full = { detail: { mode: 'pairs', total: 2, correctCount: 2 } }
  const partial = { detail: { mode: 'pairs', total: 3, correctCount: 1 } }
  const zero = { detail: { mode: 'pairs', total: 2, correctCount: 0 } }
  assert.equal(engine.feedback('memory', ok, full).state, 'correct')
  assert.ok(engine.feedback('memory', ok, partial).message.includes('1 of 3'))
  assert.equal(engine.feedback('memory', ok, zero).state, 'incorrect')
  const timeout = engine.feedback('memory', { submission: { state: 'timeout' } }, zero)
  assert.equal(timeout.state, 'timeout')
})

test('memory feedback: never leaks the expected grouping', () => {
  const engine = serverEngine()
  const raw = JSON.stringify(engine.feedback('memory', { submission: { state: 'submitted' } }, { detail: { mode: 'pairs', total: 2, correctCount: 1 } }))
  assert.ok(!raw.includes('groupId'))
  assert.ok(!raw.includes('cardIds'))
  assert.ok(!raw.includes('c1'))
})

// --------------------------------------------------------------------------
// 12. Availability
// --------------------------------------------------------------------------

test('memory: available by default and when the flag opts in', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('memory', {}), true)
  assert.equal(engine.availableOn('memory', { featureFlags: { 'memory': true } }), true)
})

test('memory: availability flag can opt out', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('memory', { featureFlags: { 'memory': false } }), false)
})

// --------------------------------------------------------------------------
// 13. Client facade boundary
// --------------------------------------------------------------------------

test('memory: the client facade exposes no server-only methods', () => {
  const engine = clientEngine()
  const listed = engine.list().find((p) => p.type === 'memory')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.ok(!(method in listed), `client facade must not expose "${method}"`)
  }
  assert.equal(engine.scoringInputs, undefined)
})

test('memory: the client engine has no validateAnswer/scoringInputs/feedback/getCorrectAnswerSchema', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(engine[method], undefined)
  }
})

// --------------------------------------------------------------------------
// 14. Accessibility contract surface
// --------------------------------------------------------------------------

test('memory: the descriptor carries the metadata needed for accessible controls', () => {
  const engine = clientEngine()
  const descriptor = engine.render('memory', { question: { payload: setsPayload } })
  assert.equal(descriptor.deckType, 'sets')
  assert.equal(descriptor.revealSeconds, 15)
  assert.equal(descriptor.maxAttempts, 2)
  assert.equal(descriptor.recallPrompt, 'Group each state of matter with an example.')
  for (const card of descriptor.cards) {
    assert.equal(typeof card.id, 'string')
    assert.equal(typeof card.ariaLabel, 'string')
  }
})

test('memory: reduced-motion styling and real controls are present in the stylesheet', () => {
  const css = String(readFileSync(new URL('../plugins/memory/memory.css', import.meta.url)))
  assert.ok(css.includes('prefers-reduced-motion'))
  assert.ok(css.includes('transition: none'))
  assert.ok(css.includes(':focus-visible'))
  assert.ok(css.includes('memory-deck'))
  assert.ok(css.includes('min-height: 44px'))
})
