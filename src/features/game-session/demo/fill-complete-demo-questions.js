/**
 * Game Session — fill-complete demo questions (Task 4.8).
 *
 * Dev-server-only fill-complete content for the browser demo, built from the
 * Task 3.2 schema example fixtures (no new production-question content is
 * authored). Numeric correct answers are inline demo values that match the
 * fixture payloads' educational content. This module is never imported by the
 * React client bundle (correct answers stay server-side with the demo API).
 */

import grade6to7Payload from '../../../../schemas/examples/fill-complete/valid-payload-grade6-7.json' with { type: 'json' }
import grade6to7Answer from '../../../../schemas/examples/fill-complete/valid-correct-answer.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/fill-complete/valid-payload-grade9-11.json' with { type: 'json' }
import minimalPayload from '../../../../schemas/examples/fill-complete/minimal-valid-payload.json' with { type: 'json' }

const FILL_COMPLETE_ACTIVITY_TYPE_ID = 5
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function fillCompleteQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: FILL_COMPLETE_ACTIVITY_TYPE_ID,
    activityType: 'fill-complete',
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

/** 3 published fill-complete questions (id 31..33) for Science · Level 1. */
export function demoFillCompleteQuestions() {
  return [
    fillCompleteQuestion(31, {
      prompt: 'Type the missing word into each blank.',
      instructions: 'Read the sentence and type the word that completes each blank. Every blank must be filled before you can submit.',
      payload: grade6to7Payload,
      correctAnswer: grade6to7Answer,
      hints: [
        { level: 1, text: 'Think about the part of a plant that soaks up sunlight.' },
        { level: 2, text: "The two missing words name parts of a plant's food and water systems." },
      ],
      basePoints: 100,
    }),
    fillCompleteQuestion(32, {
      prompt: 'Work out the missing value and type it into the blank.',
      instructions: 'The car travelled 150 km in 3 hours, so v = distance ÷ time. Round to a whole number of km/h.',
      payload: grade9to11Payload,
      correctAnswer: {
        numeric: [{ blankId: 'b1', value: 50, tolerance: 0.1 }],
      },
      hints: [
        { level: 1, text: 'Average speed divides the distance by the time.' },
        { level: 2, text: '150 ÷ 3 gives the speed in km/h.' },
      ],
      basePoints: 100,
    }),
    fillCompleteQuestion(33, {
      prompt: 'Type the correct temperature into the blank.',
      instructions: 'This is a well-known boiling point — fill the blank with the correct number of degrees Celsius.',
      payload: minimalPayload,
      correctAnswer: {
        numeric: [{ blankId: 'b1', value: 100, tolerance: 0 }],
      },
      hints: [
        { level: 1, text: 'At sea level, water boils at a round hundred.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoFillCompleteQuestions }