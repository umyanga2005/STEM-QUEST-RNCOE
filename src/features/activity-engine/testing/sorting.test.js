/**
 * Activity Engine — sorting plugin tests (Task 4.7).
 * Run: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createClientActivityEngine } from '../index.js'
import { createServerActivityEngine } from '../server.js'
import { ERROR_CODES } from '../errors/index.js'
import { sortingPlugin, validateAssignments, registerSorting } from '../plugins/sorting/plugin.js'
import {
  createSortState,
  selectItem,
  assignItem,
  clearAssignment,
  resetSort,
  isAssigned,
  isComplete,
  buildResponse,
} from '../plugins/sorting/sorting-controller.js'

import minimalPayload from '../../../../schemas/examples/sorting/minimal-valid-payload.json' with { type: 'json' }
import gradePayload from '../../../../schemas/examples/sorting/valid-payload-grade6-7.json' with { type: 'json' }
import gradeAnswer from '../../../../schemas/examples/sorting/valid-correct-answer.json' with { type: 'json' }
import physicsPayload from '../../../../schemas/examples/sorting/valid-payload-grade9-11.json' with { type: 'json' }
import partialCreditAnswer from '../../../../schemas/examples/sorting/partial-credit.json' with { type: 'json' }
import invalidPayload from '../../../../schemas/examples/sorting/invalid-payload.json' with { type: 'json' }
import invalidAnswer from '../../../../schemas/examples/sorting/invalid-correct-answer.json' with { type: 'json' }

// gradePayload: items i1..i6 (recycling), categories c1 (Recyclable) / c2 (Compostable).
// gradeAnswer: i1→c1, i2→c2, i3→c1, i4→c2, i5→c1, i6→c2.

function serverEngine() {
  const engine = createServerActivityEngine()
  engine.register(sortingPlugin)
  return engine
}

function clientEngine() {
  const engine = createClientActivityEngine()
  engine.register(sortingPlugin)
  return engine
}

function assignResponse(pairs) {
  return { assignments: pairs.map(([itemId, categoryId]) => ({ itemId, categoryId })) }
}

function runAnswer(engine, response, { payload = gradePayload, correctAnswer = gradeAnswer } = {}) {
  return engine.validateAnswer('sorting', {
    submission: { questionId: 'q-sorting-1', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
    payload,
    correctAnswer,
  })
}

const correctPairs = [
  ['i1', 'c1'],
  ['i2', 'c2'],
  ['i3', 'c1'],
  ['i4', 'c2'],
  ['i5', 'c1'],
  ['i6', 'c2'],
]

// --------------------------------------------------------------------------
// 1. Registration + contract
// --------------------------------------------------------------------------

test('sorting: plugin is conformant and registerable', () => {
  const engine = serverEngine()
  assert.equal(engine.has('sorting'), true)
  const listed = engine.list().find((p) => p.type === 'sorting')
  assert.equal(listed.name, 'Sorting')
  assert.equal(listed.version, '1.0.0')
  assert.equal(listed.schemaVersion, '1.0')
  for (const method of ['render', 'validatePayload', 'validateAnswer', 'scoringInputs', 'buildHints', 'feedback', 'availableOn']) {
    assert.equal(typeof sortingPlugin[method], 'function', `plugin must implement ${method}`)
  }
})

test('sorting: registerSorting helper registers on a bare engine', () => {
  const engine = createServerActivityEngine()
  registerSorting(engine)
  assert.equal(engine.has('sorting'), true)
})

test('sorting: sorting and matching coexist on one engine', () => {
  const engine = createServerActivityEngine()
  registerSorting(engine)
  assert.throws(() => registerSorting(engine), (err) => err.code === ERROR_CODES.REGISTRATION_DUPLICATE_TYPE)
})

// --------------------------------------------------------------------------
// 2. Render descriptor (client-safe)
// --------------------------------------------------------------------------

test('sorting: render produces a descriptor with no correct-answer keys', () => {
  const engine = clientEngine()
  const descriptor = engine.render('sorting', {
    question: {
      prompt: 'Sort the waste into the right groups.',
      instructions: 'Select an item, then tap the group it belongs to.',
      payload: gradePayload,
    },
  })
  assert.equal(descriptor.kind, 'sorting')
  assert.equal(descriptor.prompt, 'Sort the waste into the right groups.')
  assert.deepEqual(descriptor.items.map((item) => item.id).sort(), ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'])
  assert.deepEqual(descriptor.categories.map((c) => c.id).sort(), ['c1', 'c2'])
  for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'assignments']) {
    assert.ok(!(key in descriptor), `descriptor must not expose "${key}"`)
  }
})

test('sorting: render preserves item order when shuffle is false', () => {
  const engine = clientEngine()
  const descriptor = engine.render('sorting', {
    question: { payload: { ...gradePayload, shuffle: false } },
  })
  assert.deepEqual(descriptor.items.map((item) => item.id), ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'])
  assert.deepEqual(descriptor.categories.map((c) => c.id), ['c1', 'c2'])
  assert.equal(descriptor.shuffle, false)
})

test('sorting: render shuffles items when shuffle is true (default)', () => {
  const engine = clientEngine()
  const descriptor = engine.render('sorting', {
    question: { payload: gradePayload },
  })
  assert.equal(descriptor.shuffle, true)
  assert.equal(descriptor.items.length, 6)
})

test('sorting: item and category views carry id/label/image/ariaLabel only', () => {
  const engine = clientEngine()
  const descriptor = engine.render('sorting', {
    question: { payload: { ...gradePayload, shuffle: false } },
  })
  for (const card of [...descriptor.items, ...descriptor.categories]) {
    assert.equal(typeof card.id, 'string')
    assert.equal(typeof card.label, 'string')
    assert.equal(typeof card.ariaLabel, 'string')
    assert.ok(!('categoryId' in card) && !('expected' in card) && !('correct' in card))
  }
})

// --------------------------------------------------------------------------
// 3. validatePayload (authoring-time semantic rules)
// --------------------------------------------------------------------------

test('sorting: validatePayload accepts conformant payloads', () => {
  const engine = clientEngine()
  assert.equal(engine.validatePayload('sorting', minimalPayload).valid, true)
  assert.equal(engine.validatePayload('sorting', gradePayload).valid, true)
  assert.equal(engine.validatePayload('sorting', physicsPayload).valid, true)
})

test('sorting: validatePayload rejects duplicate item ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    items: [
      { id: 'i1', label: 'Plastic bottle' },
      { id: 'i1', label: 'Glass jar' },
      { id: 'i2', label: 'Paper' },
      { id: 'i3', label: 'Tin can' },
    ],
  }
  const result = engine.validatePayload('sorting', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'sorting.item-ids-unique')
})

test('sorting: validatePayload rejects duplicate category ids', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    categories: [
      { id: 'c1', label: 'Recyclable' },
      { id: 'c1', label: 'Compostable' },
    ],
  }
  const result = engine.validatePayload('sorting', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'sorting.category-ids-unique')
})

test('sorting: validatePayload rejects item/category id collisions', () => {
  const engine = clientEngine()
  const fixed = {
    ...gradePayload,
    items: [
      { id: 'c1', label: 'Confusing item' },
      { id: 'i2', label: 'Paper' },
      { id: 'i3', label: 'Tin can' },
      { id: 'i4', label: 'Glass jar' },
    ],
  }
  const result = engine.validatePayload('sorting', fixed)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].details.errors[0].ruleId, 'sorting.item-category-ids-disjoint')
})

test('sorting: validatePayload still fails the schema layer for malformed payloads', () => {
  const engine = clientEngine()
  const result = engine.validatePayload('sorting', invalidPayload)
  assert.equal(result.valid, false)
  assert.equal(result.errors[0].code, ERROR_CODES.ACTIVITY_PAYLOAD_INVALID)
})

// --------------------------------------------------------------------------
// 4. validateAssignments (catalog rule port: sorting.assignments-cover-items)
// --------------------------------------------------------------------------

test('sorting: validateAssignments passes a consistent payload/answer pair', () => {
  assert.deepEqual(validateAssignments(gradePayload, gradeAnswer), [])
})

test('sorting: validateAssignments catches a missing item assignment', () => {
  const answer = { assignments: correctPairs.slice(0, 5) }
  const errors = validateAssignments(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'sorting.assignments-cover-items' && e.message.includes('i6')))
})

test('sorting: validateAssignments catches a duplicate item assignment', () => {
  const answer = { assignments: [['i1', 'c1'], ['i1', 'c2'], ['i2', 'c2'], ['i3', 'c1'], ['i4', 'c2'], ['i5', 'c1']].map(([itemId, categoryId]) => ({ itemId, categoryId })) }
  const errors = validateAssignments(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'sorting.assignments-cover-items' && e.message.includes('more than once')))
})

test('sorting: validateAssignments catches an unknown item id', () => {
  const answer = assignResponse([['i9', 'c1'], ['i2', 'c2'], ['i3', 'c1'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c2']])
  const errors = validateAssignments(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'sorting.assignments-cover-items' && e.message.includes('no assignment')))
})

test('sorting: validateAssignments catches an unknown category id', () => {
  const answer = assignResponse([['i1', 'c9'], ['i2', 'c2'], ['i3', 'c1'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c2']])
  const errors = validateAssignments(gradePayload, answer)
  assert.ok(errors.some((e) => e.ruleId === 'sorting.assignments-cover-items' && e.message.includes('unknown category "c9"')))
})

// --------------------------------------------------------------------------
// 5. validateAnswer correctness + submitted-assignment behavior
// --------------------------------------------------------------------------

test('sorting: validateAnswer returns correct=true for the exact assignments', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, assignResponse(correctPairs))
  assert.equal(result.correct, true)
  assert.equal(result.detail.correctCount, 6)
  assert.equal(result.detail.total, 6)
})

test('sorting: validateAnswer returns correct=false with per-item detail', () => {
  const engine = serverEngine()
  // 4 of 6 correct (i3 and i6 wrong).
  const result = runAnswer(engine, assignResponse([['i1', 'c1'], ['i2', 'c2'], ['i3', 'c2'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c1']]))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 4)
  const wrong = result.detail.assignments.find((a) => a.itemId === 'i3')
  assert.equal(wrong.categoryId, 'c2')
  assert.equal(wrong.correct, false)
  const right = result.detail.assignments.find((a) => a.itemId === 'i1')
  assert.equal(right.correct, true)
})

test('sorting: validateAnswer returns correct=false for a fully wrong set', () => {
  const engine = serverEngine()
  const result = runAnswer(engine, assignResponse([['i1', 'c2'], ['i2', 'c1'], ['i3', 'c2'], ['i4', 'c1'], ['i5', 'c2'], ['i6', 'c1']]))
  assert.equal(result.correct, false)
  assert.equal(result.detail.correctCount, 0)
})

test('sorting: validateAnswer rejects malformed response shapes', () => {
  const engine = serverEngine()
  assert.throws(() => runAnswer(engine, {}), (err) => err.code === ERROR_CODES.ACTIVITY_ANSWER_INVALID)
  assert.throws(
    () => runAnswer(engine, { assignments: 'i1=c1,i2=c2' }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      return true
    }
  )
  assert.throws(
    () => runAnswer(engine, { assignments: [{ itemId: 'i1' }] }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /itemId.*categoryId/)
      return true
    }
  )
})

test('sorting: validateAnswer rejects an unknown item id (never silently accepted)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, assignResponse([['zzz', 'c1'], ['i2', 'c2'], ['i3', 'c1'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c2']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /unknown item id "zzz"/)
      return true
    }
  )
})

test('sorting: validateAnswer rejects an unknown category id', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, assignResponse([['i1', 'c9'], ['i2', 'c2'], ['i3', 'c1'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c2']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /unknown category id "c9"/)
      return true
    }
  )
})

test('sorting: validateAnswer rejects a duplicate submitted item', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, assignResponse([['i1', 'c1'], ['i1', 'c2'], ['i2', 'c2'], ['i3', 'c1'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c2']])),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /assigned more than once/)
      return true
    }
  )
})

test('sorting: validateAnswer rejects a submission missing an assignment', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, assignResponse(correctPairs.slice(0, 5))),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_ANSWER_INVALID)
      assert.match(err.details.reason, /missing required assignment for item "i6"/)
      return true
    }
  )
})

test('sorting: minimal example answers the whole pipeline end-to-end (server)', () => {
  const engine = serverEngine()
  const response = assignResponse([['i1', 'c1'], ['i2', 'c2'], ['i3', 'c1']])
  const validation = engine.validateAnswer('sorting', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0, timeTakenSec: 4 } },
    payload: minimalPayload,
    correctAnswer: { assignments: [{ itemId: 'i1', categoryId: 'c1' }, { itemId: 'i2', categoryId: 'c2' }, { itemId: 'i3', categoryId: 'c1' }] },
  })
  assert.equal(validation.correct, true)
  const inputs = engine.scoringInputs(
    'sorting',
    {
      submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
      payload: minimalPayload,
      correctAnswer: { assignments: [{ itemId: 'i1', categoryId: 'c1' }, { itemId: 'i2', categoryId: 'c2' }, { itemId: 'i3', categoryId: 'c1' }] },
    },
    validation
  )
  assert.equal(inputs.correctnessFraction, 1)
  const fb = engine.feedback('sorting', {
    submission: { questionId: 'q-min', response, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } },
  }, validation)
  assert.equal(fb.state, 'correct')
})

test('sorting: validateAnswer throws PAYLOAD_SEMANTIC_INVALID for an inconsistent (but schema-valid) answer document', () => {
  const engine = serverEngine()
  const inconsistent = { assignments: [['i1', 'c1'], ['i2', 'c2'], ['i3', 'c1'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c9']].map(([itemId, categoryId]) => ({ itemId, categoryId })) }
  assert.throws(
    () => runAnswer(engine, assignResponse(correctPairs), { correctAnswer: inconsistent }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ACTIVITY_PAYLOAD_SEMANTIC_INVALID)
      assert.equal(err.details.errors[0].ruleId, 'sorting.assignments-cover-items')
      return true
    }
  )
})

test('sorting: a schema-invalid answer document is stopped by the engine guard (ENGINE_INTERNAL)', () => {
  const engine = serverEngine()
  assert.throws(
    () => runAnswer(engine, assignResponse(correctPairs), { correctAnswer: invalidAnswer }),
    (err) => {
      assert.equal(err.code, ERROR_CODES.ENGINE_INTERNAL)
      return true
    }
  )
})

// --------------------------------------------------------------------------
// 6. scoringInputs (partial credit)
// --------------------------------------------------------------------------

function scoringCtx(submission) {
  return {
    submission: { questionId: 'q-sorting-1', ...submission },
    payload: gradePayload,
    correctAnswer: gradeAnswer,
  }
}

test('sorting: scoringInputs reports correctnessFraction 1 on full credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, assignResponse(correctPairs))
  const inputs = engine.scoringInputs('sorting', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  assert.equal(inputs.correctnessFraction, 1)
  assert.equal(inputs.scorableUnits, 6)
  assert.equal(inputs.correctUnits, 6)
})

test('sorting: scoringInputs reports 2/3 on a two-wrong partial', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, assignResponse([['i1', 'c1'], ['i2', 'c2'], ['i3', 'c2'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c1']]))
  const inputs = engine.scoringInputs(
    'sorting',
    scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 2, hintsUsed: 1 } }),
    validation
  )
  assert.equal(inputs.correctnessFraction, 2 / 3)
  assert.equal(inputs.scorableUnits, 6)
  assert.equal(inputs.correctUnits, 4)
  assert.equal(inputs.attemptsUsed, 2)
  assert.equal(inputs.hintsUsed, 1)
  assert.equal(inputs.evidence.length, 6)
})

test('sorting: scoringInputs reports 0 on no credit', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, assignResponse([['i1', 'c2'], ['i2', 'c1'], ['i3', 'c2'], ['i4', 'c1'], ['i5', 'c2'], ['i6', 'c1']]))
  const inputs = engine.scoringInputs('sorting', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  assert.equal(inputs.correctnessFraction, 0)
  assert.equal(inputs.scorableUnits, 6)
  assert.equal(inputs.correctUnits, 0)
})

test('sorting: scoringInputs evidence never carries the expected category', () => {
  const engine = serverEngine()
  const validation = runAnswer(engine, assignResponse([['i1', 'c1'], ['i2', 'c2'], ['i3', 'c2'], ['i4', 'c2'], ['i5', 'c1'], ['i6', 'c1']]))
  const inputs = engine.scoringInputs('sorting', scoringCtx({ response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } }), validation)
  const wrong = inputs.evidence.find((a) => a.itemId === 'i3')
  assert.equal(wrong.categoryId, 'c2', 'evidence holds the submitted category')
  assert.equal(wrong.correct, false)
  for (const key of ['expected', 'expectedCategoryId', 'correctCategoryId', 'answerKey']) {
    assert.ok(!(key in wrong), `evidence must not expose "${key}"`)
  }
  // A wrong item never carries the category that would make it right.
  assert.ok(!('expectedCategoryId' in inputs.evidence[2]))
})

// --------------------------------------------------------------------------
// 7. buildHints
// --------------------------------------------------------------------------

test('sorting: buildHints returns authored hints with levels, never assignments', () => {
  const engine = clientEngine()
  const hints = engine.buildHints('sorting', {
    hints: [
      { level: 1, text: 'Think about what the group labels have in common.' },
      { level: 2, text: 'Some items belong together because of their material.' },
    ],
  })
  assert.equal(hints.length, 2)
  assert.equal(hints[0].level, 1)
  assert.equal(hints[1].level, 2)
  for (const key of ['assignments', 'correctAnswer']) {
    assert.ok(!(key in hints[0]), `hint must not expose "${key}"`)
  }
})

// --------------------------------------------------------------------------
// 8. feedback
// --------------------------------------------------------------------------

test('sorting: feedback is correct/partial/incorrect per fraction and never leaks answers', () => {
  const engine = serverEngine()
  const ctx = { submission: { questionId: 'q-sorting-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
  const full = { detail: { total: 6, correctCount: 6 } }
  const partial = { detail: { total: 6, correctCount: 4 } }
  const none = { detail: { total: 6, correctCount: 0 } }

  const correctFb = engine.feedback('sorting', ctx, full)
  assert.equal(correctFb.state, 'correct')
  const partialFb = engine.feedback('sorting', ctx, partial)
  assert.equal(partialFb.state, 'partial')
  assert.match(partialFb.message, /4 of 6/)
  const noneFb = engine.feedback('sorting', ctx, none)
  assert.equal(noneFb.state, 'incorrect')

  for (const fb of [correctFb, partialFb, noneFb]) {
    for (const key of ['correctAnswer', 'correct_answer', 'answerKey', 'assignments']) {
      assert.ok(!(key in fb), `feedback must not expose "${key}"`)
    }
  }
})

test('sorting: feedback honours the timeout state', () => {
  const engine = serverEngine()
  const ctx = { submission: { questionId: 'q-sorting-1', response: {}, interactionMetrics: { attemptsUsed: 1, hintsUsed: 0 } } }
  const fb = engine.feedback('sorting', ctx, { detail: { total: 6, correctCount: 0 } }, 'timeout')
  assert.equal(fb.state, 'timeout')
})

// --------------------------------------------------------------------------
// 9. availability
// --------------------------------------------------------------------------

test('sorting: availableOn accepts the full context and is available by default', () => {
  const engine = clientEngine()
  assert.equal(
    engine.availableOn('sorting', {
      stream: 'science',
      level: 2,
      grade: 7,
      device: 'mobile',
      featureFlags: {},
      capabilities: { reducedMotion: false, pointerType: 'touch' },
    }),
    true
  )
  assert.equal(engine.availableOn('sorting', { grade: 6 }), true)
  // Sorting works by tapping an item then a group, so voice-only devices are
  // still offered it.
  assert.equal(engine.availableOn('sorting', { device: 'voice-only' }), true)
})

test('sorting: availableOn honours featureFlags opt-out', () => {
  const engine = clientEngine()
  assert.equal(engine.availableOn('sorting', { featureFlags: { 'sorting': false } }), false)
})

// --------------------------------------------------------------------------
// 10. Client facade security boundary
// --------------------------------------------------------------------------

test('sorting: the client facade never exposes server-only methods', () => {
  const engine = clientEngine()
  const plugin = engine.get('sorting')
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback']) {
    assert.equal(typeof plugin[method], 'undefined', `client plugin must not expose ${method}`)
  }
  for (const method of ['render', 'validatePayload', 'buildHints', 'availableOn']) {
    assert.equal(typeof plugin[method], 'function')
  }
})

test('sorting: the client engine has no validateAnswer/scoringInputs/feedback/getCorrectAnswerSchema', () => {
  const engine = clientEngine()
  for (const method of ['validateAnswer', 'scoringInputs', 'feedback', 'getCorrectAnswerSchema']) {
    assert.equal(typeof engine[method], 'undefined')
  }
})

// --------------------------------------------------------------------------
// 11. Interaction controller (renderer logic, DOM-free)
// --------------------------------------------------------------------------

test('sorting: createSortState starts with every item unassigned and nothing selected', () => {
  const s = createSortState(['i1', 'i2', 'i3'], ['c1', 'c2'])
  assert.equal(s.selectedItem, null)
  for (const id of ['i1', 'i2', 'i3']) assert.equal(isAssigned(s, id), null)
})

test('sorting: selectItem toggles the selected item', () => {
  const s0 = createSortState(['i1', 'i2'], ['c1', 'c2'])
  const s1 = selectItem(s0, 'i1')
  assert.equal(s1.selectedItem, 'i1')
  assert.equal(s1.assignment, s0.assignment, 'selection does not change assignments')
  const s2 = selectItem(s1, 'i1')
  assert.equal(s2.selectedItem, null)
  const s3 = selectItem(s2, 'i2')
  assert.equal(s3.selectedItem, 'i2', 'picking another item moves the selection')
})

test('sorting: selectItem ignores unknown item ids', () => {
  const s0 = createSortState(['i1'], ['c1'])
  assert.equal(selectItem(s0, 'zzz'), s0)
})

test('sorting: assignItem places the selected item and clears the selection', () => {
  const s0 = createSortState(['i1', 'i2'], ['c1', 'c2'])
  const s1 = assignItem(selectItem(s0, 'i1'), 'c1')
  assert.equal(isAssigned(s1, 'i1'), 'c1')
  assert.equal(s1.selectedItem, null)
  assert.equal(isAssigned(s1, 'i2'), null)
})

test('sorting: assignItem with no selection is a no-op (same reference)', () => {
  const s0 = createSortState(['i1'], ['c1'])
  assert.equal(assignItem(s0, 'c1'), s0)
})

test('sorting: assignItem ignores unknown categories', () => {
  const s0 = createSortState(['i1'], ['c1'])
  const s1 = selectItem(s0, 'i1')
  assert.equal(assignItem(s1, 'zzz'), s1)
})

test('sorting: reassignment replaces the old assignment', () => {
  let s = selectItem(createSortState(['i1', 'i2'], ['c1', 'c2']), 'i1')
  s = assignItem(s, 'c1')
  assert.equal(isAssigned(s, 'i1'), 'c1')
  s = assignItem(selectItem(s, 'i1'), 'c2')
  assert.equal(isAssigned(s, 'i1'), 'c2', 'reassigning moves the item, never duplicates it')
  assert.equal(isAssigned(s, 'i2'), null)
})

test('sorting: clearAssignment detaches a single item and keeps the rest', () => {
  let s = selectItem(createSortState(['i1', 'i2'], ['c1', 'c2']), 'i1')
  s = assignItem(s, 'c1')
  s = assignItem(selectItem(s, 'i2'), 'c2')
  const cleared = clearAssignment(s, 'i1')
  assert.equal(isAssigned(cleared, 'i1'), null)
  assert.equal(isAssigned(cleared, 'i2'), 'c2')
})

test('sorting: clearAssignment on an unassigned item is a no-op', () => {
  const s0 = createSortState(['i1'], ['c1'])
  assert.equal(clearAssignment(s0, 'i1'), s0)
})

test('sorting: resetSort returns every item to unassigned', () => {
  let s = selectItem(createSortState(['i1', 'i2'], ['c1', 'c2']), 'i1')
  s = assignItem(s, 'c1')
  s = assignItem(selectItem(s, 'i2'), 'c2')
  const r = resetSort(s)
  for (const id of ['i1', 'i2']) assert.equal(isAssigned(r, id), null)
  assert.equal(r.selectedItem, null)
})

test('sorting: isComplete reports coverage for the submit gate', () => {
  let s = createSortState(['i1', 'i2', 'i3'], ['c1', 'c2'])
  assert.equal(isComplete(s), false)
  s = assignItem(selectItem(s, 'i1'), 'c1')
  s = assignItem(selectItem(s, 'i2'), 'c2')
  assert.equal(isComplete(s), false)
  s = assignItem(selectItem(s, 'i3'), 'c1')
  assert.equal(isComplete(s), true)
  assert.equal(isComplete(clearAssignment(s, 'i2')), false, 'clearing reopens the gate')
})

test('sorting: buildResponse emits one assignment per item in order', () => {
  let s = selectItem(createSortState(['i1', 'i2', 'i3'], ['c1', 'c2']), 'i2')
  s = assignItem(s, 'c2')
  const response = buildResponse(s)
  assert.deepEqual(response.assignments, [
    { itemId: 'i1', categoryId: null },
    { itemId: 'i2', categoryId: 'c2' },
    { itemId: 'i3', categoryId: null },
  ])
})

// --------------------------------------------------------------------------
// 12. Fixtures cross-check
// --------------------------------------------------------------------------

test('sorting: the partial-credit fixture mirrors the grade6-7 answer (6 of 6 assignments)', () => {
  assert.deepEqual(partialCreditAnswer, gradeAnswer)
  assert.deepEqual(validateAssignments(gradePayload, partialCreditAnswer), [])
})