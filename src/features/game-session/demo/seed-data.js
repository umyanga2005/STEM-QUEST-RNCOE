/**
 * Game Session — demo seed data (Task 4.4).
 *
 * In-memory base data for the local demo API and repository tests. Only
 * drag-drop questions are seeded (the ONLY integrated plugin — Task 4.2);
 * the 3-of-100 selection therefore exercises the D-022 fill pass (same-type
 * repeats), which is correct: diversity becomes strict once the remaining
 * activity plugins ship.
 *
 * Correct answers live here server-side only — they never reach the client.
 */

export const DEMO_STUDENT_ID = 1
export const DEMO_STREAM_ID = 1 // science
export const DEMO_LEVEL_ID = 1  // science · level 1

/** The 10 activity types, ids matching the live seed order (0002). */
export const DEMO_ACTIVITY_TYPES = [
  { id: 1, slug: 'drag-drop', name: 'Drag & Drop', isActive: true },
  { id: 2, slug: 'matching', name: 'Matching', isActive: true },
  { id: 3, slug: 'ordering', name: 'Ordering', isActive: true },
  { id: 4, slug: 'sorting', name: 'Sorting', isActive: true },
  { id: 5, slug: 'fill-complete', name: 'Fill / Complete', isActive: true },
  { id: 7, slug: 'pattern', name: 'Pattern', isActive: true },
  { id: 8, slug: 'memory', name: 'Memory', isActive: true },
  { id: 9, slug: 'scenario-challenge', name: 'Scenario Challenge', isActive: true },
  { id: 10, slug: 'number-logic', name: 'Number / Logic Challenge', isActive: true },
]

/** 4 streams (ids 1..4). */
export const DEMO_STREAMS = [
  { id: 1, slug: 'science', name: 'Science', displayOrder: 1, isActive: true },
  { id: 2, slug: 'technology', name: 'Technology', displayOrder: 2, isActive: true },
  { id: 3, slug: 'engineering', name: 'Engineering', displayOrder: 3, isActive: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', displayOrder: 4, isActive: true },
]

/** 5 levels per stream; timers/overtime per D-034 (stream id X => 1..5). */
export function demoLevelsForStream(streamId) {
  const TIMERS = [
    { number: 1, name: 'Beginner', defaultTimeSeconds: 90, overtimePenaltyPerSecond: 1 },
    { number: 2, name: 'Easy', defaultTimeSeconds: 75, overtimePenaltyPerSecond: 2 },
    { number: 3, name: 'Intermediate', defaultTimeSeconds: 60, overtimePenaltyPerSecond: 3 },
    { number: 4, name: 'Advanced', defaultTimeSeconds: 50, overtimePenaltyPerSecond: 4 },
    { number: 5, name: 'Hard', defaultTimeSeconds: 45, overtimePenaltyPerSecond: 5 },
  ]
  return TIMERS.map((t) => ({
    id: (streamId - 1) * 5 + t.number,
    streamId,
    number: t.number,
    name: t.name,
    defaultTimeSeconds: t.defaultTimeSeconds,
    overtimePenaltyPerSecond: t.overtimePenaltyPerSecond,
    isActive: true,
  }))
}

export const DEMO_LEVELS = [
  ...demoLevelsForStream(1),
  ...demoLevelsForStream(2),
  ...demoLevelsForStream(3),
  ...demoLevelsForStream(4),
]

const DRAG_DROP_ACTIVITY_TYPE_ID = 1
const SCIENCE_STREAM_ID = 1
const LEVEL_1 = 1

function dragDropQuestion(id, { prompt, instructions, items, zones, mappings, hints, basePoints = 100, timerOverrideSeconds = null, streamId = 1, levelId = 1, difficulty = 1 }) {
  return {
    id,
    streamId,
    levelId,
    activityTypeId: DRAG_DROP_ACTIVITY_TYPE_ID,
    activityType: 'drag-drop',
    prompt,
    instructions,
    payload: {
      schemaVersion: '1.0',
      mode: 'multi-target',
      randomizeItems: true,
      allowRetry: true,
      items,
      zones,
    },
    correctAnswer: { mappings },
    hints,
    basePoints,
    timerOverrideSeconds,
    difficulty,
    gradeMin: 6,
    gradeMax: 8,
    status: 'published',
  }
}

/** No demo questions seeded — questions are authored in Supabase DB / Admin Question Builder. */
export function demoQuestions() {
  return []
}

/** Convenience: a fully-populated in-memory store for the demo/API server. */
export function demoBaseData() {
  return {
    students: [
      {
        id: DEMO_STUDENT_ID,
        initials: 'QA',
        fullName: 'Quest Admin Demo',
        schoolId: 1,
        grade: 7,
        status: 'active',
      },
    ],
    streams: DEMO_STREAMS,
    levels: DEMO_LEVELS,
    activityTypes: DEMO_ACTIVITY_TYPES,
    questions: demoQuestions(),
    settings: [
      { key: 'session.questions_per_session', value: 3 },
      { key: 'scoring.hint_deduction', value: 5 },
      { key: 'scoring.attempt_deduction', value: 10 },
    ],
    specialAccess: [],
  }
}

/** Loads demo base data into any empty in-memory store. */
export function seedStoreFromBaseData(store, baseData) {
  const { students, streams, levels, activityTypes, questions, settings, specialAccess } = baseData
  store.students.push(...students)
  store.streams.push(...streams)
  store.levels.push(...levels)
  store.activityTypes.push(...activityTypes)
  store.questions.push(...questions)
  store.settings.push(...settings)
  if (specialAccess) store.specialAccess.push(...specialAccess)
  return store
}

export default {
  DEMO_STUDENT_ID,
  DEMO_STREAM_ID,
  DEMO_LEVEL_ID,
  demoBaseData,
  demoQuestions,
  demoLevelsForStream,
  seedStoreFromBaseData,
}