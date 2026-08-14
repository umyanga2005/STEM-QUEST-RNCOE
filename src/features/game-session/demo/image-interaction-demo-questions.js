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

function imageInteractionQuestion(id, { prompt, instructions, payload, correctAnswer, hints, basePoints = 100 }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
    activityTypeId: IMAGE_INTERACTION_ACTIVITY_TYPE_ID,
    activityType: 'image-interaction',
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

/** 3 published image-interaction questions (id 41..43) for Science · Level 1. */
export function demoImageInteractionQuestions() {
  return [
    imageInteractionQuestion(41, {
      prompt: 'Tap the three stages of the water cycle shown in the diagram.',
      instructions: 'Press each region you can identify in the diagram. You can press a region again to remove it. Subtle markers show where you can tap.',
      payload: grade6to7Payload,
      correctAnswer: grade6to7Answer,
      hints: [
        { level: 1, text: 'Rain and snow falling back to the ground is called precipitation.' },
        { level: 2, text: 'Water turns into vapour (evaporation) and gathers into clouds (condensation) before it falls again.' },
      ],
      basePoints: 100,
    }),
    imageInteractionQuestion(42, {
      prompt: 'Place each label on the correct part of the cell diagram.',
      instructions: 'Press a label to select it, then press the region where it belongs. A label already placed can be selected again to move it, or removed with its ✕ button.',
      payload: grade9to11Payload,
      correctAnswer: grade9to11Answer,
      hints: [
        { level: 1, text: 'The nucleus controls the cell and holds its genetic material.' },
        { level: 2, text: 'Mitochondria release energy; the cell wall gives a plant cell its rigid shape.' },
      ],
      basePoints: 100,
    }),
    imageInteractionQuestion(43, {
      prompt: 'Tap the two chambers of the heart shown in the diagram.',
      instructions: 'Press each chamber you can identify. Press a region again to remove it before submitting.',
      payload: minimalPayload,
      correctAnswer: { mode: 'tap', requiredHotspots: ['h1', 'h2'] },
      hints: [
        { level: 1, text: 'The heart has two chambers shown in this diagram: one pumps blood out, the other receives it.' },
      ],
      basePoints: 100,
    }),
  ]
}

export default { demoImageInteractionQuestions }