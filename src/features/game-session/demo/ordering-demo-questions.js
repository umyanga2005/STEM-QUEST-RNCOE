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

function orderingQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: ORDERING_ACTIVITY_TYPE_ID,
    activityType: 'ordering',
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
export function demoOrderingQuestions() {
  return []
}

export default { demoOrderingQuestions }