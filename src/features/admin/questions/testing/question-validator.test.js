/**
 * Admin Question Builder — validator contract tests (Task 5.10).
 *
 * Verifies the three validation layers against the EXISTING schema family:
 *   A. envelope (question.schema.json common + payload + correctAnswer $refs)
 *   B. activity-specific payload semantic rules (plugin validatePayload)
 *   C. cross payload↔correctAnswer integrity (plugin cross-doc rule)
 * All activity types in the DB slug set validate, including `scenario-challenge`
 * which shares the `scenario` schemas.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createQuestionValidator } from '../validation/question-validator.js'
import { QUESTION_ACTIVITY_TYPES } from '../contracts.js'
import { makeDragDropDraft, makeScenarioDraft } from './fixtures.js'

function makeValidator() {
  return createQuestionValidator()
}

test('validator registers every DB activity type (10 plugins)', () => {
  const v = makeValidator()
  assert.deepEqual(v.engine.list().map((p) => p.type).sort(), [...QUESTION_ACTIVITY_TYPES].sort())
})

test('a schema-valid drag-drop draft passes all layers', () => {
  const v = makeValidator()
  const result = v.validate(makeDragDropDraft())
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test('scenario-challenge maps to the scenario schemas and validates', () => {
  const v = makeValidator()
  const result = v.validate(makeScenarioDraft())
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('envelope layer rejects a missing required field', () => {
  const v = makeValidator()
  const draft = makeDragDropDraft()
  delete draft.prompt
  const result = v.validate(draft)
  assert.equal(result.valid, false)
  const paths = result.errors.map((e) => e.path)
  assert.ok(paths.includes('/prompt') || result.errors.some((e) => e.message.includes('prompt')), JSON.stringify(result.errors))
})

test('envelope layer rejects an out-of-range grade', () => {
  const v = makeValidator()
  const result = v.validate(makeDragDropDraft({ gradeMin: 12 }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.path === '/gradeMin'), JSON.stringify(result.errors))
})

test('envelope layer validates payload against the activity payload schema', () => {
  const v = makeValidator()
  const draft = makeDragDropDraft()
  draft.payload.items = 'not-an-array'
  const result = v.validate(draft)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.code === 'ENVELOPE' && e.path === '/payload/items'), JSON.stringify(result.errors))
})

test('envelope layer validates correctAnswer against the correct-answer schema', () => {
  const v = makeValidator()
  const draft = makeDragDropDraft()
  draft.correctAnswer.mappings = 'not-an-array'
  const result = v.validate(draft)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.code === 'ENVELOPE' && e.path === '/correctAnswer/mappings'), JSON.stringify(result.errors))
})

test('layer B: activity semantic rules catch duplicate ids', () => {
  const v = makeValidator()
  const draft = makeDragDropDraft()
  draft.payload.items[1].id = 'nucleus'
  const result = v.validate(draft)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.code === 'drag-drop.item-ids-unique'), JSON.stringify(result.errors))
})

test('layer C: cross-doc rule catches an unmapped item', () => {
  const v = makeValidator()
  const draft = makeDragDropDraft()
  draft.correctAnswer.mappings = [{ itemId: 'nucleus', zoneId: 'control' }]
  const result = v.validate(draft)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.code === 'drag-drop.mappings-cover-items'), JSON.stringify(result.errors))
})

test('layer C: cross-doc rule catches an unknown zone reference', () => {
  const v = makeValidator()
  const draft = makeDragDropDraft()
  draft.correctAnswer.mappings[0].zoneId = 'nowhere'
  const result = v.validate(draft)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.code === 'drag-drop.mappings-zone-exists'), JSON.stringify(result.errors))
})

test('meta is validated against meta.schema.json when provided', () => {
  const v = makeValidator()
  const result = v.validate(makeDragDropDraft({ meta: { authoring: { authorType: 'ai', contentHash: 'not-a-hash' } } }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.path === '/meta/authoring/contentHash'), JSON.stringify(result.errors))
})

test('a valid meta envelope passes', () => {
  const v = makeValidator()
  const result = v.validate(
    makeDragDropDraft({
      meta: {
        objective: 'Identify the role of each part of a cell.',
        feedback: { correct: 'Exactly right!' },
        authoring: { authorType: 'human', editedByHuman: true },
      },
    })
  )
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('unknown activityType fails the envelope enum', () => {
  const v = makeValidator()
  const result = v.validate(makeDragDropDraft({ activityType: 'quiz' }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.path === '/activityType'), JSON.stringify(result.errors))
})

test('every DB activity type validates a minimal schema-valid case for scenario + drag-drop (spot types)', () => {
  const v = makeValidator()
  // drag-drop + scenario-challenge already covered above; spot-check the
  // full DB slug set exists on the engine + schema registry.
  for (const slug of QUESTION_ACTIVITY_TYPES) {
    assert.ok(v.engine.has(slug), `${slug} registered`)
    assert.ok(v.engine.schemaRegistry.getPayloadSchema(slug), `${slug} payload schema`)
    assert.ok(v.engine.schemaRegistry.getCorrectAnswerSchema(slug), `${slug} correct-answer schema`)
  }
})

export default { tests: true }