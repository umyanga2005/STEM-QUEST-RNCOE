/**
 * Game Session — sorting demo questions (Task 4.7).
 *
 * Dev-server-only sorting content for the browser demo, built from the Task
 * 3.2 schema example fixtures (no new production-question content is
 * authored). This module is never imported by the React client bundle
 * (correct answers stay server-side with the demo API).
 */

import grade6to7Payload from '../../../../schemas/examples/sorting/valid-payload-grade6-7.json' with { type: 'json' }
import grade6to7Answer from '../../../../schemas/examples/sorting/valid-correct-answer.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/sorting/valid-payload-grade9-11.json' with { type: 'json' }

const SORTING_ACTIVITY_TYPE_ID = 4
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function sortingQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: SORTING_ACTIVITY_TYPE_ID,
    activityType: 'sorting',
    prompt,
    instructions,
    payload,
    correctAnswer,
    hints,
    basePoints,
    timerOverrideSeconds: null,
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** 3 published sorting questions (id 21..23) for Science · Level 1. */
export function demoSortingQuestions() {
  return [
    sortingQuestion(21, {
      prompt: 'Sort each material into Recyclable or Compostable.',
      instructions: 'Select an item, then tap the group it belongs to. Every item must be placed before you can submit.',
      payload: grade6to7Payload,
      correctAnswer: grade6to7Answer,
      hints: [
        { level: 1, text: 'Think about what happens to each item after it is collected.' },
        { level: 2, text: 'Some items rot; others get melted down and remade.' },
      ],
      basePoints: 100,
    }),
    sortingQuestion(22, {
      prompt: 'Sort each element into Non-metal or Metal.',
      instructions: 'Select an item, then tap the group it belongs to. You can change a placement before submitting.',
      payload: grade9to11Payload,
      correctAnswer: {
        assignments: [
          { itemId: 'i1', categoryId: 'c1' },
          { itemId: 'i2', categoryId: 'c1' },
          { itemId: 'i3', categoryId: 'c1' },
          { itemId: 'i4', categoryId: 'c1' },
          { itemId: 'i5', categoryId: 'c2' },
          { itemId: 'i6', categoryId: 'c2' },
        ],
      },
      hints: [
        { level: 1, text: 'Think about how each element conducts electricity and heat.' },
        { level: 2, text: 'Most metals are shiny solids that conduct well.' },
      ],
      basePoints: 100,
    }),
    sortingQuestion(23, {
      prompt: 'Sort the recycling items again to check your memory.',
      instructions: 'Select an item, then tap the group it belongs to. Everything must be placed before you can submit.',
      payload: grade6to7Payload,
      correctAnswer: { ...grade6to7Answer },
      hints: [
        { level: 1, text: 'Compare each item with the group labels.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoSortingQuestions }
