/**
 * Game Session — pattern demo questions (Task 4.10).
 *
 * Dev-server-only pattern content for the browser demo, built directly from
 * the Task 3.2 schema example fixtures (no new production question content is
 * authored). Correct answers are inline demo values that match the fixtures.
 * This module is never imported by the React client bundle (correct answers
 * stay server-side with the demo API).
 *
 * NOTE on the fill-missing fixture: `valid-payload-grade9-11.json` hides the
 * element at `missingAt: 2`, i.e. the THIRD element (9) of 1, 4, 9 — the
 * square numbers. The fixture's authored "partial-credit" answer (16) is the
 * NEXT term after the hidden slot, which does not match the hidden element;
 * the self-consistent demo answer below uses the hidden element's value (9).
 * See reports/08 for the discussion.
 */

import grade6to7Payload from '../../../../schemas/examples/pattern/valid-payload-grade6-7.json' with { type: 'json' }
import grade9to11Payload from '../../../../schemas/examples/pattern/valid-payload-grade9-11.json' with { type: 'json' }
import minimalPayload from '../../../../schemas/examples/pattern/minimal-valid-payload.json' with { type: 'json' }
import validCorrectAnswer from '../../../../schemas/examples/pattern/valid-correct-answer.json' with { type: 'json' }

const PATTERN_ACTIVITY_TYPE_ID = 7
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function patternQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: PATTERN_ACTIVITY_TYPE_ID,
    activityType: 'pattern',
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
export function demoPatternQuestions() {
  return []
}

export default { demoPatternQuestions }