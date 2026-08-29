/**
 * Game Session — image-interaction demo questions (Task 4.9).
 *
 * Dev-server-only image-interaction content for the browser demo, built
 * directly from the Task 3.2 schema example fixtures (no new production
 * question content is authored). Correct answers are inline demo values that
 * match the fixtures. This module is never imported by the React client bundle
 * (correct answers stay server-side with the demo API). The fixture image files
 * are storage references, not real assets — the demo renderer falls back to a
 * labelled region and the hotspot interaction surface stays fully usable.
 */

import grade6to7Payload from '../../../../schemas/examples/image-interaction/valid-payload-grade6-7.json' with { type: 'json' }
import grade6to7Answer from '../../../../schemas/examples/image-interaction/valid-correct-answer.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/image-interaction/valid-payload-grade9-11.json' with { type: 'json' }
import grade9to11Answer from '../../../../schemas/examples/image-interaction/partial-credit.json' with { type: 'json' }
import minimalPayload from '../../../../schemas/examples/image-interaction/minimal-valid-payload.json' with { type: 'json' }

const IMAGE_INTERACTION_ACTIVITY_TYPE_ID = 6
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function imageInteractionQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: IMAGE_INTERACTION_ACTIVITY_TYPE_ID,
    activityType: 'image-interaction',
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
export function demoImageInteractionQuestions() {
  return []
}

export default { demoImageInteractionQuestions }