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

function scenarioQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: SCENARIO_ACTIVITY_TYPE_ID,
    activityType: 'scenario-challenge',
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

/** 3 published scenario-challenge questions (id 50..52) for Science · Level 1. */
export function demoScenarioQuestions() {
  return [
    scenarioQuestion(50, {
      prompt: 'Troubleshoot the lab light.',
      instructions: 'Read the mission, then make each decision. Your choices change what happens next. The best path solves the problem safely.',
      payload: minimalPayload,
      correctAnswer: {
        optimalPath: [
          { decisionId: 'd1', optionId: 'o1' },
          { decisionId: 'd2', optionId: 'o3' },
        ],
      },
      hints: [
        { level: 1, text: 'Diagnose before you replace parts.' },
        { level: 2, text: 'The switch is fine — the next thing to check is the power source.' },
      ],
      basePoints: 100,
    }),
    scenarioQuestion(51, {
      prompt: 'Respond to a burst pipe during a Science Fair.',
      instructions: 'Read the mission, then make each decision. Your choices change what happens next. Keep everyone safe and stop the flood.',
      payload: grade6to7Payload,
      correctAnswer: {
        optimalPath: [
          { decisionId: 'd1', optionId: 'o1' },
          { decisionId: 'd2', optionId: 'o4' },
        ],
        acceptableOptions: { d1: ['o3'] },
      },
      hints: [
        { level: 1, text: 'Stop the source of the water before cleaning up.' },
        { level: 2, text: 'Turning off the valve stops the flow; a wet floor then needs warning signs.' },
      ],
      basePoints: 100,
    }),
    scenarioQuestion(52, {
      prompt: 'Repair a faulty solar array as a field engineer.',
      instructions: 'Read the mission, then make each decision. Your choices change what happens next. Restore power safely, step by step.',
      payload: grade9to11Payload,
      correctAnswer: validCorrectAnswer,
      hints: [
        { level: 1, text: 'De-energize before you diagnose, then measure before you conclude.' },
        { level: 2, text: 'A single dead string points to a fault inside that string, not the sun.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoScenarioQuestions }