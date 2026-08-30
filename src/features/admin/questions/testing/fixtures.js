/**
 * Admin Question Builder — shared test fixtures (Task 5.10).
 *
 * Deterministic valid/invalid authoring drafts used across the validator,
 * service and API suites. `makeDragDropDraft` returns a schema-valid drag-drop
 * draft; callers mutate copies for the negative cases.
 */

export function makeDragDropDraft(overrides = {}) {
  return {
    formatVersion: 1,
    stream: 'science',
    level: 1,
    activityType: 'drag-drop',
    activitySchemaVersion: '1.0',
    prompt: 'Match each part of a cell to its role.',
    explanation: 'The nucleus controls the cell, and the membrane protects it.',
    gradeMin: 6,
    gradeMax: 8,
    difficulty: 2,
    basePoints: 100,
    topic: 'biology',
    subtopic: 'cells',
    tags: ['cells-basic'],
    status: 'draft',
    payload: {
      schemaVersion: '1.0',
      mode: 'multi-target',
      allowRetry: true,
      randomizeItems: true,
      items: [
        { id: 'nucleus', label: 'Nucleus' },
        { id: 'membrane', label: 'Cell membrane' },
      ],
      zones: [
        { id: 'control', label: 'Controls the cell' },
        { id: 'boundary', label: 'Outer boundary' },
      ],
    },
    correctAnswer: {
      mappings: [
        { itemId: 'nucleus', zoneId: 'control' },
        { itemId: 'membrane', zoneId: 'boundary' },
      ],
    },
    ...overrides,
  }
}

/** A schema-valid scenario-challenge draft (activityType slug mapping). */
export function makeScenarioDraft(overrides = {}) {
  return {
    formatVersion: 1,
    stream: 'science',
    level: 3,
    activityType: 'scenario-challenge',
    activitySchemaVersion: '1.0',
    prompt: 'A farmer needs to save her crop.',
    explanation: 'Choosing the water-saving method was the best decision.',
    gradeMin: 7,
    gradeMax: 9,
    difficulty: 3,
    basePoints: 100,
    topic: 'environment',
    subtopic: 'water',
    tags: [],
    status: 'draft',
    payload: {
      schemaVersion: '1.0',
      scenarioText: 'The field is drying out and water is scarce.',
      entryDecision: 'd1',
      decisions: [
        {
          id: 'd1',
          text: 'How should the farmer water the crop?',
          options: [
            { id: 'o1', text: 'Drip irrigation', nextDecision: null, outcomeText: 'Water is saved.' },
            { id: 'o2', text: 'Flood the field', nextDecision: null, outcomeText: 'Water is wasted.' },
          ],
        },
      ],
    },
    correctAnswer: {
      optimalPath: [{ decisionId: 'd1', optionId: 'o1' }],
    },
    ...overrides,
  }
}

/** Seeds a memory question store with catalogue rows (0002 shapes). */
export function seedQuestionCatalogue(_store) {
  const streams = [
    { id: 1, slug: 'science', name: 'Science' },
    { id: 2, slug: 'technology', name: 'Technology' },
    { id: 3, slug: 'engineering', name: 'Engineering' },
    { id: 4, slug: 'mathematics', name: 'Mathematics' },
  ]
  const levels = []
  for (const s of streams) {
    for (let n = 1; n <= 5; n += 1) {
      levels.push({ id: (s.id - 1) * 5 + n, stream_id: s.id, number: n, name: `Level ${n}` })
    }
  }
  const activityTypes = [
    'drag-drop', 'matching', 'ordering', 'sorting', 'fill-complete',
    'find-word', 'pattern', 'memory', 'scenario-challenge', 'number-logic',
  ].map((slug, i) => ({ id: i + 1, slug, name: slug }))
  return { streams, levels, activityTypes }
}

export default {
  makeDragDropDraft,
  makeScenarioDraft,
  seedQuestionCatalogue,
}