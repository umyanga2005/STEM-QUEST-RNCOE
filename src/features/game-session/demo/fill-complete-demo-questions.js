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

function fillCompleteQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: FILL_COMPLETE_ACTIVITY_TYPE_ID,
    activityType: 'fill-complete',
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
export function demoFillCompleteQuestions() {
  return []
}

export default { demoFillCompleteQuestions }