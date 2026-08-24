/**
 * Admin Question Builder — service contract tests (Task 5.10).
 *
 * Covers the authoring boundary: catalogue resolution, server-managed
 * versioning/activitySchemaVersion, taxonomy round-trip (topic/subtopic ⇄
 * tags[]), lifecycle (draft create, published edit block, archived block),
 * validation-before-persist, correctAnswer server-only surface, and previews
 * that never leak correctAnswer/meta.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { QuestionService } from '../service/question-service.js'
import { createQuestionValidator } from '../validation/question-validator.js'
import {
  createQuestionMemoryStore,
  createQuestionMemoryRepositories,
  seedQuestionStore,
} from '../repositories/memory.js'
import { rowToQuestionDto } from '../repositories/row-mapper.js'
import { QUESTION_ERROR_CODES } from '../errors.js'
import { makeDragDropDraft, seedQuestionCatalogue } from './fixtures.js'

function buildService(extraQuestions = []) {
  const store = createQuestionMemoryStore()
  const catalogue = seedQuestionCatalogue(store)
  seedQuestionStore(store, catalogue)
  const repos = createQuestionMemoryRepositories(store)
  const service = new QuestionService({
    questionRepository: repos.questionRepository,
    catalogueRepository: repos.catalogueRepository,
    validator: createQuestionValidator(),
  })
  if (extraQuestions.length) seedQuestionStore(store, { questions: extraQuestions })
  return { store, repos, service }
}

/** Inserts a published row directly (bypasses the builder's draft-only create). */
async function insertPublishedRow(store, overrides = {}) {
  const draft = makeDragDropDraft({ prompt: 'Published question', status: 'published', version: 4 })
  const now = new Date().toISOString()
  store.questions.push({
    id: store.nextId++,
    stream_id: 1,
    level_id: 1,
    activity_type_id: 1,
    prompt: draft.prompt,
    instructions: null,
    explanation: draft.explanation,
    payload: draft.payload,
    correct_answer: draft.correctAnswer,
    hints: null,
    tags: ['topic:biology', 'subtopic:cells'],
    grade_min: draft.gradeMin,
    grade_max: draft.gradeMax,
    difficulty: draft.difficulty,
    base_points: draft.basePoints,
    timer_override_seconds: null,
    status: 'published',
    is_flagged: false,
    version: 4,
    meta: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  })
  return store.questions[store.questions.length - 1]
}

test('create persists a validated draft as version 1 with server-derived fields', async () => {
  const { service } = buildService()
  const { question } = await service.create(makeDragDropDraft())

  assert.ok(question.id >= 1)
  assert.equal(question.status, 'draft')
  assert.equal(question.version, 1)
  assert.equal(question.activitySchemaVersion, '1.0')
  assert.equal(question.stream, 'science')
  assert.equal(question.level, 1)
  assert.equal(question.activityType, 'drag-drop')
  assert.equal(question.correctAnswer.mappings.length, 2)
})

test('create resolves catalogue slugs to the right ids', async () => {
  const { service, repos } = buildService()
  const { question } = await service.create(makeDragDropDraft())
  const row = await repos.questionRepository.findById(question.id)
  assert.equal(row.stream_id, 1)
  assert.equal(row.level_id, 1)
  assert.equal(row.activity_type_id, 1)
})

test('create folds topic/subtopic into tags[] and preserves free tags', async () => {
  const { service, repos } = buildService()
  const { question } = await service.create(makeDragDropDraft())
  const row = await repos.questionRepository.findById(question.id)
  assert.deepEqual(row.tags, ['topic:biology', 'subtopic:cells', 'cells-basic'])
  assert.equal(question.topic, 'biology')
  assert.equal(question.subtopic, 'cells')
  assert.deepEqual(question.tags, ['cells-basic'])
})

test('create rejects an unknown stream with CATALOG_UNKNOWN', async () => {
  const { service } = buildService()
  await assert.rejects(
    () => service.create(makeDragDropDraft({ stream: 'history' })),
    (err) => err.code === QUESTION_ERROR_CODES.CATALOG_UNKNOWN
  )
})

test('create rejects an unknown activityType with CATALOG_UNKNOWN', async () => {
  const { service } = buildService()
  await assert.rejects(
    () => service.create(makeDragDropDraft({ activityType: 'quiz' })),
    (err) => err.code === QUESTION_ERROR_CODES.CATALOG_UNKNOWN
  )
})

test('create rejects an invalid draft with VALIDATION and field errors (not persisted)', async () => {
  const { service, repos } = buildService()
  const draft = makeDragDropDraft()
  draft.correctAnswer.mappings = [{ itemId: 'nucleus', zoneId: 'control' }]
  await assert.rejects(
    () => service.create(draft),
    (err) => err.code === QUESTION_ERROR_CODES.VALIDATION && Array.isArray(err.fields) && err.fields.length > 0
  )
  assert.equal(repos.store.questions.length, 0, 'invalid draft must not persist')
})

test('create rejects an unexpected/forged field with UNEXPECTED_FIELD', async () => {
  const { service } = buildService()
  await assert.rejects(
    () => service.create({ ...makeDragDropDraft(), studentId: 999 }),
    (err) => err.code === QUESTION_ERROR_CODES.UNEXPECTED_FIELD
  )
})

test('create ignores a forged activitySchemaVersion (server-derived)', async () => {
  const { service } = buildService()
  const { question } = await service.create(makeDragDropDraft({ activitySchemaVersion: '9.9' }))
  assert.equal(question.activitySchemaVersion, '1.0')
})

test('create forces status draft even if the client asks for published', async () => {
  const { service } = buildService()
  const { question } = await service.create(makeDragDropDraft({ status: 'published' }))
  assert.equal(question.status, 'draft')
  assert.equal(question.version, 1)
})

test('list returns previews without correctAnswer or meta', async () => {
  const { service } = buildService()
  const created = (await service.create(makeDragDropDraft())).question
  const { questions } = await service.list()
  assert.equal(questions.length, 1)
  assert.equal(questions[0].id, created.id)
  assert.equal('correctAnswer' in questions[0], false, 'previews must not carry correctAnswer')
  assert.equal('meta' in questions[0], false, 'previews must not carry meta')
  assert.ok(questions[0].payload, 'previews keep the student-visible payload')
})

test('list filters by status, stream and activityType', async () => {
  const { service } = buildService()
  await service.create(makeDragDropDraft({ prompt: 'Science draft' }))
  await service.create(makeDragDropDraft({ prompt: 'Tech draft', stream: 'technology' }))

  const drafts = await service.list({ status: 'draft' })
  assert.equal(drafts.questions.length, 2)

  const science = await service.list({ stream: 'science' })
  assert.equal(science.questions.length, 1)
  assert.equal(science.questions[0].stream, 'science')

  const tech = await service.list({ stream: 'technology' })
  assert.equal(tech.questions.length, 1)
  assert.equal(tech.questions[0].stream, 'technology')

  const dd = await service.list({ activityType: 'drag-drop' })
  assert.equal(dd.questions.length, 2)
})

test('getById returns the full server-only surface (correctAnswer + meta)', async () => {
  const { service } = buildService()
  const created = (await service.create(makeDragDropDraft({ meta: { objective: 'Learn cell roles.' } }))).question
  const { question } = await service.getById(created.id)
  assert.deepEqual(question.correctAnswer, makeDragDropDraft().correctAnswer)
  assert.equal(question.meta.objective, 'Learn cell roles.')
})

test('getById on an unknown id throws NOT_FOUND', async () => {
  const { service } = buildService()
  await assert.rejects(
    () => service.getById(999999),
    (err) => err.code === QUESTION_ERROR_CODES.NOT_FOUND
  )
})

test('update edits a draft and preserves version', async () => {
  const { service } = buildService()
  const created = (await service.create(makeDragDropDraft())).question
  const { question } = await service.update(created.id, makeDragDropDraft({ prompt: 'Edited prompt' }))
  assert.equal(question.prompt, 'Edited prompt')
  assert.equal(question.version, 1, 'draft edits preserve version')
})

test('update blocks editing a published question (STATUS_BLOCKED)', async () => {
  const { store, service } = buildService()
  const row = await insertPublishedRow(store)
  await assert.rejects(
    () => service.update(row.id, makeDragDropDraft({ prompt: 'tamper' })),
    (err) => err.code === QUESTION_ERROR_CODES.STATUS_BLOCKED
  )
})

test('remove deletes a draft only', async () => {
  const { service } = buildService()
  const created = (await service.create(makeDragDropDraft())).question
  const { removed } = await service.remove(created.id)
  assert.equal(removed, true)
  const { questions } = await service.list()
  assert.equal(questions.length, 0)
})

test('catalogue returns stream + activity-type options for the editor', async () => {
  const { service } = buildService()
  const { streams, activityTypes } = await service.catalogue()
  assert.equal(streams.length, 4)
  assert.equal(activityTypes.length, 10)
  assert.ok(activityTypes.some((a) => a.slug === 'scenario-challenge'))
})

test('rowToQuestionDto round-trips taxonomy through tags[]', () => {
  const dto = rowToQuestionDto({
    id: 1,
    streams: { slug: 'science' },
    levels: { number: 2 },
    activity_types: { slug: 'matching' },
    prompt: 'p',
    payload: {},
    correct_answer: {},
    tags: ['topic:physics', 'subtopic:forces', 'free'],
    grade_min: 6,
    grade_max: 8,
    difficulty: 1,
    base_points: 100,
    status: 'draft',
    is_flagged: false,
    version: 1,
  })
  assert.equal(dto.topic, 'physics')
  assert.equal(dto.subtopic, 'forces')
  assert.deepEqual(dto.tags, ['free'])
})

export default { tests: true }