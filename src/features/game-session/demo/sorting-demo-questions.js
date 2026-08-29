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

function sortingQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: SORTING_ACTIVITY_TYPE_ID,
    activityType: 'sorting',
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
export function demoSortingQuestions() {
  return []
}

export default { demoSortingQuestions }
