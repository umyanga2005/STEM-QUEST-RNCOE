/**
 * Game Session — memory demo questions (Task 4.11).
 *
 * Dev-server-only memory content for the browser demo, built directly from the
 * Task 3.2 schema example fixtures (no new production question content is
 * authored). Correct answers are inline demo values that match the fixtures.
 * This module is never imported by the React client bundle (correct answers
 * stay server-side with the demo API).
 *
 * Self-consistency: each demo correct answer covers exactly the cards of its
 * payload once, with group sizes matching the deck type (pairs = 2, sets = 3–4).
 */

import minimalPayload from '../../../../schemas/examples/memory/minimal-valid-payload.json' with { type: 'json' }
import grade6to7Payload from '../../../../schemas/examples/memory/valid-payload-grade6-7.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/memory/valid-payload-grade9-11.json' with { type: 'json' }
import validCorrectAnswer from '../../../../schemas/examples/memory/valid-correct-answer.json' with { type: 'json' }

const MEMORY_ACTIVITY_TYPE_ID = 8
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function memoryQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: MEMORY_ACTIVITY_TYPE_ID,
    activityType: 'memory',
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
export function demoMemoryQuestions() {
  return []
}

export default { demoMemoryQuestions }