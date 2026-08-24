/**
 * Game Session — ordering demo questions (Task 5.3).
 *
 * Dev-server-only ordering content for the browser demo, built from the Task
 * 3.2 schema example fixtures (no new production-question content is
 * authored). This module is never imported by the React client bundle
 * (correct answers stay server-side with the demo API). Ordering completes
 * the ten-type demo pool so every renderer can be exercised in the demo.
 */

import grade6to7Payload from '../../../../schemas/examples/ordering/valid-payload-grade6-7.json' with { type: 'json' }
import grade6to7Answer from '../../../../schemas/examples/ordering/valid-correct-answer.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/ordering/valid-payload-grade9-11.json' with { type: 'json' }
import grade9to11Answer from '../../../../schemas/examples/ordering/grade9-11-correct-answer.json' with { type: 'json' }

const ORDERING_ACTIVITY_TYPE_ID = 3
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function orderingQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: ORDERING_ACTIVITY_TYPE_ID,
    activityType: 'ordering',
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

/** 3 published ordering questions (id 14..16) for Science · Level 1. */
export function demoOrderingQuestions() {
  return [
    orderingQuestion(14, {
      prompt: 'Put the plant life cycle in order, from seed to fruit.',
      instructions: 'Arrange the cards in the correct order. Items already anchored cannot move.',
      payload: grade6to7Payload,
      correctAnswer: grade6to7Answer,
      hints: [
        { level: 1, text: 'Think about which stage comes first when a plant grows.' },
        { level: 2, text: 'The seed grows into a sprout before it ever flowers.' },
      ],
      basePoints: 100,
    }),
    orderingQuestion(15, {
      prompt: 'Order the steps of a scientific investigation.',
      instructions: 'Arrange the steps in the order a scientist would follow them.',
      payload: grade9to11Payload,
      correctAnswer: grade9to11Answer,
      hints: [
        { level: 1, text: 'A hypothesis comes before any experiment.' },
        { level: 2, text: 'You analyse your results before writing a conclusion.' },
      ],
      basePoints: 100,
    }),
    orderingQuestion(16, {
      prompt: 'Order the plant life cycle again to check your memory.',
      instructions: 'Arrange the cards in the correct order. Items already anchored cannot move.',
      payload: grade6to7Payload,
      correctAnswer: { ...grade6to7Answer },
      hints: [
        { level: 1, text: 'Start from the seed and finish with the fruit.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoOrderingQuestions }