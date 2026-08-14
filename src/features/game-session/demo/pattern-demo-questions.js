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

function patternQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: PATTERN_ACTIVITY_TYPE_ID,
    activityType: 'pattern',
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

/** 3 published pattern questions (id 44..46) for Science · Level 1. */
export function demoPatternQuestions() {
  return [
    patternQuestion(44, {
      prompt: 'Continue the sequence: 2, 4, 6, …',
      instructions: 'Choose the next element from the bank. The sequence grows by adding 2 each time.',
      payload: minimalPayload,
      correctAnswer: validCorrectAnswer,
      hints: [
        { level: 1, text: 'Compare consecutive elements: 2 → 4 → 6. What changes each step?' },
        { level: 2, text: 'Each element is 2 more than the one before it, so the next even number follows 6.' },
      ],
      basePoints: 100,
    }),
    patternQuestion(45, {
      prompt: 'Complete the shape pattern: circle, square, circle, square, …',
      instructions: 'Choose the next shape from the bank. The shapes alternate.',
      payload: grade6to7Payload,
      correctAnswer: { type: 'candidate', acceptableIds: ['c1'] },
      hints: [
        { level: 1, text: 'The shapes alternate between two kinds.' },
        { level: 2, text: 'The sequence is circle, square, circle, square — which shape comes after square?' },
      ],
      basePoints: 100,
    }),
    patternQuestion(46, {
      prompt: 'Find the missing element in the sequence: 1, 4, ?',
      instructions: 'Type the element that belongs in the hidden position. Hint: these are the square numbers.',
      payload: grade9to11Payload,
      correctAnswer: { type: 'numeric', value: 9, tolerance: 0 },
      hints: [
        { level: 1, text: '1, 4 and the missing value are consecutive square numbers (1², 2², …).' },
        { level: 2, text: '4 is 2 × 2. The missing element is the next square in the list.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoPatternQuestions }