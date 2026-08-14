/**
 * Game Session — matching demo questions (Task 4.5).
 *
 * Dev-server-only matching content for the browser demo, built from the Task
 * 3.2 schema example fixtures (no new production-question content is
 * authored). Kept separate from `demoBaseData()` so repository/engine tests
 * keep the exact 6-question drag-drop pool they assert against, and this
 * module is never imported by the React client bundle (correct answers stay
 * server-side with the demo API).
 */

import minimalPayload from '../../../../schemas/examples/matching/minimal-valid-payload.json' with { type: 'json' }
import grade6to7Payload from '../../../../schemas/examples/matching/valid-payload-grade6-7.json' with { type: 'json' }
import grade6to7Answer from '../../../../schemas/examples/matching/valid-correct-answer.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/matching/valid-payload-grade9-11.json' with { type: 'json' }
import grade9to11Answer from '../../../../schemas/examples/matching/grade9-11-correct-answer.json' with { type: 'json' }

const MATCHING_ACTIVITY_TYPE_ID = 2
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function matchingQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: MATCHING_ACTIVITY_TYPE_ID,
    activityType: 'matching',
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

/** 3 published matching questions (id 11..13) for Science · Level 1. */
export function demoMatchingQuestions() {
  return [
    matchingQuestion(11, {
      prompt: 'Match the science words to their meanings.',
      instructions: 'Select a card on the left, then tap the target on the right that fits it. You can change or clear a match before submitting.',
      payload: minimalPayload,
      correctAnswer: {
        pairs: [
          { leftId: 'l1', rightId: 'r1' },
          { leftId: 'l2', rightId: 'r2' },
        ],
      },
      hints: [
        { level: 1, text: 'Each formula on the left names one common substance.' },
        { level: 2, text: 'H2O is the everyday name for water.' },
      ],
      basePoints: 100,
    }),
    matchingQuestion(12, {
      prompt: 'Match each organ to what it does for the body.',
      instructions: 'Select a card on the left, then tap the target on the right that fits it. Everything must be matched before you can submit.',
      payload: grade6to7Payload,
      correctAnswer: grade6to7Answer,
      hints: [
        { level: 1, text: 'Every organ has one main job in the body.' },
        { level: 2, text: 'Focus on what the organ does, not where it sits.' },
      ],
      basePoints: 100,
    }),
    matchingQuestion(13, {
      prompt: 'Match each equation to the law it represents.',
      instructions: 'Select a card on the left, then tap the target on the right that fits it. One option is a decoy that matches none of these equations.',
      payload: grade9to11Payload,
      correctAnswer: grade9to11Answer,
      hints: [
        { level: 1, text: 'Each formula is a rule used in physics.' },
        { level: 2, text: 'Think about what each symbol stands for first.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoMatchingQuestions }