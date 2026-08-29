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

/** No demo questions seeded — questions are authored in Supabase DB / Admin Question Builder. */
export function demoMatchingQuestions() {
  return []
}

export default { demoMatchingQuestions }