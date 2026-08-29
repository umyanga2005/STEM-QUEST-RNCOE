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

function numberLogicQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: NUMBER_LOGIC_ACTIVITY_TYPE_ID,
    activityType: 'number-logic',
    prompt,
    instructions,
    payload,
    correctAnswer,
    hints,
    basePoints,
    timerOverrideSeconds: null,
    difficulty,
    gradeMin: 6,
    gradeMax: 11,
    status: 'published',
  }
}

/** No demo questions seeded — questions are authored in Supabase DB / Admin Question Builder. */
export function demoNumberLogicQuestions() {
  return []
}

export default { demoNumberLogicQuestions }