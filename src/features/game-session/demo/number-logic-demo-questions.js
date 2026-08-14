/**
 * Game Session — number-logic demo questions (Task 4.13).
 *
 * Dev-server-only number/logic content for the browser demo, built directly
 * from the Task 3.2 schema example fixtures (no new production question
 * content is authored). Correct answers are inline demo values that match the
 * fixtures and are self-consistent with each payload's answerFormat
 * (integer → exact, fraction → fraction, decimal parts → exact/tolerance).
 * This module is never imported by the React client bundle (correct answers
 * stay server-side with the demo API).
 */

import minimalPayload from '../../../../schemas/examples/number-logic/minimal-valid-payload.json' with { type: 'json' }
import grade6to7Payload from '../../../../schemas/examples/number-logic/valid-payload-grade6-7.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/number-logic/valid-payload-grade9-11.json' with { type: 'json' }
import grade6to7Answer from '../../../../schemas/examples/number-logic/valid-correct-answer.json' with { type: 'json' }
import partialCreditAnswer from '../../../../schemas/examples/number-logic/partial-credit.json' with { type: 'json' }

const NUMBER_LOGIC_ACTIVITY_TYPE_ID = 10
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function numberLogicQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: NUMBER_LOGIC_ACTIVITY_TYPE_ID,
    activityType: 'number-logic',
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

/** 3 published number-logic questions (id 53..55) for Science · Level 1. */
export function demoNumberLogicQuestions() {
  return [
    numberLogicQuestion(53, {
      prompt: 'Solve the equation.',
      instructions: 'Work out x and type the whole number. Show your working in the scratch area.',
      payload: minimalPayload,
      correctAnswer: { type: 'exact', value: 4 },
      hints: [
        { level: 1, text: '3x = 12 means three times some number equals twelve.' },
        { level: 2, text: 'Divide both sides by 3: x = 12 ÷ 3.' },
      ],
      basePoints: 100,
    }),
    numberLogicQuestion(54, {
      prompt: 'What fraction of the pizza is left?',
      instructions: 'Enter the fraction as a numerator and a denominator, in lowest terms.',
      payload: grade6to7Payload,
      correctAnswer: grade6to7Answer,
      hints: [
        { level: 1, text: '8 slices in total; you ate 2, so 6 slices remain.' },
        { level: 2, text: '6/8 can be reduced — divide the top and bottom by 2.' },
      ],
      basePoints: 100,
    }),
    numberLogicQuestion(55, {
      prompt: 'How far does the car travel?',
      instructions: 'Complete each step of the kinematic calculation. Each step is scored separately.',
      payload: grade9to11Payload,
      correctAnswer: partialCreditAnswer,
      hints: [
        { level: 1, text: 'The car starts from rest, so the initial velocity is zero.' },
        { level: 2, text: 'Use d = (1/2) a t^2 with a = 4 and t = 3.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoNumberLogicQuestions }