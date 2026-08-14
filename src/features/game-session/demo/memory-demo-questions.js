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

function memoryQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: MEMORY_ACTIVITY_TYPE_ID,
    activityType: 'memory',
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

/** 3 published memory questions (id 47..49) for Science · Level 1. */
export function demoMemoryQuestions() {
  return [
    memoryQuestion(47, {
      prompt: 'Memorize the science formula pairs, then rebuild them from memory.',
      instructions: 'Study the four cards while the timer counts down. When the timer ends you will rebuild the two pairs.',
      payload: minimalPayload,
      correctAnswer: { groups: [{ groupId: 'g1', cardIds: ['c1', 'c2'] }, { groupId: 'g2', cardIds: ['c3', 'c4'] }] },
      hints: [
        { level: 1, text: 'Each formula is paired with the name of the substance it represents.' },
        { level: 2, text: 'H2O is water, and CO2 is carbon dioxide.' },
      ],
      basePoints: 100,
    }),
    memoryQuestion(48, {
      prompt: 'Memorize the animal–food-type pairs, then rebuild them from memory.',
      instructions: 'Study the four cards while the timer counts down, then pair each animal with what it eats.',
      payload: grade6to7Payload,
      correctAnswer: { groups: [{ groupId: 'g1', cardIds: ['c1', 'c2'] }, { groupId: 'g2', cardIds: ['c3', 'c4'] }] },
      hints: [
        { level: 1, text: 'Each animal is paired with the kind of food it eats.' },
        { level: 2, text: 'A lion is a carnivore and a rabbit is a herbivore.' },
      ],
      basePoints: 100,
    }),
    memoryQuestion(49, {
      prompt: 'Memorize the equivalent expression pairs, then rebuild them from memory.',
      instructions: 'Study the six cards while the timer counts down, then rebuild the three pairs of equivalent expressions.',
      payload: grade9to11Payload,
      correctAnswer: validCorrectAnswer,
      hints: [
        { level: 1, text: 'Each pair contains two expressions that simplify to the same value.' },
        { level: 2, text: '2x + 4 is the same as 2(x + 2).' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoMemoryQuestions }