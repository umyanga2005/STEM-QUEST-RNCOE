/**
 * Game Session — scenario-challenge demo questions (Task 4.12).
 *
 * Dev-server-only scenario content for the browser demo, built directly from
 * the Task 3.2 schema example fixtures (no new production question content is
 * authored). Correct answers are inline demo values that match the fixtures.
 * This module is never imported by the React client bundle (correct answers
 * stay server-side with the demo API).
 *
 * Self-consistency: each demo correct answer is a traversable optimal path
 * (starts at the entry decision, follows real nextDecision transitions, ends
 * at a terminal option) with acceptable alternatives limited to options that
 * actually exist at their authored decision node.
 */

import minimalPayload from '../../../../schemas/examples/scenario/minimal-valid-payload.json' with { type: 'json' }
import grade6to7Payload from '../../../../schemas/examples/scenario/valid-payload-grade6-7.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/scenario/valid-payload-grade9-11.json' with { type: 'json' }
import validCorrectAnswer from '../../../../schemas/examples/scenario/valid-correct-answer.json' with { type: 'json' }

const SCENARIO_ACTIVITY_TYPE_ID = 9
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function scenarioQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: SCENARIO_ACTIVITY_TYPE_ID,
    activityType: 'scenario-challenge',
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
export function demoScenarioQuestions() {
  return []
}

export default { demoScenarioQuestions }