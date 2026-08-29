/**
 * Admin Question Builder — starter templates per activity type (Task 5.10).
 *
 * Minimal schema-valid payload skeletons the editor pre-fills when an admin
 * creates a new question. These are CLIENT-SAFE: payload only, never
 * correctAnswer (that field is authored separately and validated server-side).
 * Each template reflects the existing payload schemas so the editor's live
 * client-side validation (payload-only) passes immediately.
 */

export const QUESTION_ACTIVITY_LABELS = {
  'drag-drop': 'Drag & Drop',
  matching: 'Matching',
  ordering: 'Ordering',
  sorting: 'Sorting',
  'fill-complete': 'Fill the Blanks',
  'image-interaction': 'Image Interaction',
  pattern: 'Pattern',
  memory: 'Memory',
  'scenario-challenge': 'Scenario Challenge',
  'number-logic': 'Number Logic',
}

/** Builds the editor template for an activity type slug. */
export function buildQuestionTemplate(activityType) {
  const payload = templates[activityType] ?? templates['drag-drop']
  return {
    formatVersion: 1,
    stream: 'science',
    level: 1,
    activityType,
    activitySchemaVersion: '1.0',
    prompt: '',
    explanation: '',
    gradeMin: 6,
    gradeMax: 8,
    difficulty: 1,
    basePoints: 100,
    topic: '',
    subtopic: '',
    tags: [],
    status: 'draft',
    payload: structuredClone(payload),
    correctAnswer: {},
    meta: {},
  }
}

const templates = {
  'drag-drop': {
    schemaVersion: '1.0',
    mode: 'multi-target',
    allowRetry: true,
    randomizeItems: true,
    items: [
      { id: 'item_1', label: 'Item 1' },
      { id: 'item_2', label: 'Item 2' },
    ],
    zones: [
      { id: 'zone_1', label: 'Zone 1' },
      { id: 'zone_2', label: 'Zone 2' },
    ],
  },

  matching: {
    schemaVersion: '1.0',
    shuffle: true,
    leftItems: [
      { id: 'left_1', text: 'Item A' },
      { id: 'left_2', text: 'Item B' },
    ],
    rightItems: [
      { id: 'right_1', text: 'Match A' },
      { id: 'right_2', text: 'Match B' },
    ],
    distractors: [],
  },

  ordering: {
    schemaVersion: '1.0',
    shuffle: true,
    items: [
      { id: 'step_1', label: 'Step 1' },
      { id: 'step_2', label: 'Step 2' },
      { id: 'step_3', label: 'Step 3' },
    ],
    anchors: [],
  },

  sorting: {
    schemaVersion: '1.0',
    shuffle: true,
    items: [
      { id: 'item_1', label: 'Item 1' },
      { id: 'item_2', label: 'Item 2' },
      { id: 'item_3', label: 'Item 3' },
    ],
    categories: [
      { id: 'category_1', label: 'Category 1' },
      { id: 'category_2', label: 'Category 2' },
    ],
  },

  'fill-complete': {
    schemaVersion: '1.0',
    template: 'The capital of France is ___. Its currency is the ___.',
    blanks: [
      { id: 'blank_1', type: 'text', label: 'Answer 1', maxLength: 24 },
      { id: 'blank_2', type: 'text', label: 'Answer 2', maxLength: 24 },
    ],
    keypad: 'default',
  },

  'image-interaction': {
    schemaVersion: '1.0',
    image: {
      ref: 'question-media/pending/pending/pending.png',
      alt: 'Question image',
    },
    imageWidth: 800,
    imageHeight: 600,
    mode: 'tap',
    hotspots: [
      { id: 'hotspot_1', x: 50, y: 50, shape: 'circle', radius: 5 },
    ],
    labels: [],
  },

  pattern: {
    schemaVersion: '1.0',
    interaction: 'construct-next',
    constructCount: 1,
    sequence: [
      { id: 'seq_1', number: 2 },
      { id: 'seq_2', number: 4 },
      { id: 'seq_3', number: 6 },
    ],
    candidates: [
      { id: 'cand_1', number: 8 },
      { id: 'cand_2', number: 9 },
    ],
  },

  memory: {
    schemaVersion: '1.0',
    deckType: 'pairs',
    revealSeconds: 10,
    recallPrompt: 'Match each card with its pair.',
    shuffle: true,
    cards: [
      { id: 'card_1', text: 'Card 1' },
      { id: 'card_2', text: 'Card 2' },
      { id: 'card_3', text: 'Card 3' },
      { id: 'card_4', text: 'Card 4' },
    ],
  },

  'scenario-challenge': {
    schemaVersion: '1.0',
    scenarioText: 'The field is drying out and water is scarce.',
    entryDecision: 'decision_1',
    decisions: [
      {
        id: 'decision_1',
        text: 'How should the farmer water the crop?',
        options: [
          { id: 'option_1', text: 'Drip irrigation', nextDecision: null, outcomeText: 'Water is saved.' },
          { id: 'option_2', text: 'Flood the field', nextDecision: null, outcomeText: 'Water is wasted.' },
        ],
      },
    ],
  },

  'number-logic': {
    schemaVersion: '1.0',
    problem: 'Solve for the missing value.',
    answerFormat: 'integer',
    inputMode: 'numeric',
    showWork: false,
  },
}

export default { buildQuestionTemplate, QUESTION_ACTIVITY_LABELS }