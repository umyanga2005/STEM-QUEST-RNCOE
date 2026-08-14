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
  { id: 6, slug: 'image-interaction', name: 'Image Interaction', isActive: true },
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

function dragDropQuestion(id, { prompt, instructions, items, zones, mappings, hints, basePoints = 100, timerOverrideSeconds = null }) {
  return {
    id,
    streamId: SCIENCE_STREAM_ID,
    levelId: LEVEL_1,
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
    difficulty: 1,
    gradeMin: 6,
    gradeMax: 8,
    status: 'published',
  }
}

/** 6 published drag-drop questions for Science · Level 1. */
export function demoQuestions() {
  return [
    dragDropQuestion(1, {
      prompt: 'Classify each energy source as renewable or non-renewable.',
      instructions: 'Drag every item into the zone it belongs to, or tap an item then tap a zone. Everything must be placed before you can submit.',
      items: [
        { id: 'i1', label: 'Sunlight' },
        { id: 'i2', label: 'Wind' },
        { id: 'i3', label: 'Coal' },
        { id: 'i4', label: 'Natural gas' },
      ],
      zones: [
        { id: 'z1', label: 'Renewable' },
        { id: 'z2', label: 'Non-renewable' },
      ],
      mappings: [
        { itemId: 'i1', zoneId: 'z1' },
        { itemId: 'i2', zoneId: 'z1' },
        { itemId: 'i3', zoneId: 'z2' },
        { itemId: 'i4', zoneId: 'z2' },
      ],
      hints: [
        { level: 1, text: 'Renewable sources are naturally replenished (sunlight, wind).' },
        { level: 2, text: 'Fossil fuels formed over millions of years from living matter.' },
      ],
    }),
    dragDropQuestion(2, {
      prompt: 'Sort each material into its state of matter at room temperature.',
      instructions: 'Move every item to the correct state (solid, liquid or gas).',
      items: [
        { id: 'a1', label: 'Oxygen' },
        { id: 'a2', label: 'Table salt' },
        { id: 'a3', label: 'Water' },
        { id: 'a4', label: 'Iron' },
      ],
      zones: [
        { id: 's1', label: 'Solid' },
        { id: 's2', label: 'Liquid' },
        { id: 's3', label: 'Gas' },
      ],
      mappings: [
        { itemId: 'a1', zoneId: 's3' },
        { itemId: 'a2', zoneId: 's1' },
        { itemId: 'a3', zoneId: 's2' },
        { itemId: 'a4', zoneId: 's1' },
      ],
      hints: [{ level: 1, text: 'A solid keeps its shape; a gas fills its container.' }],
    }),
    dragDropQuestion(3, {
      prompt: 'Which organisms are producers, consumers or decomposers?',
      instructions: 'Drag each living thing into its food-web role.',
      items: [
        { id: 'p1', label: 'Grass' },
        { id: 'p2', label: 'Rabbit' },
        { id: 'p3', label: 'Mushroom' },
        { id: 'p4', label: 'Frog' },
      ],
      zones: [
        { id: 'pro', label: 'Producer' },
        { id: 'con', label: 'Consumer' },
        { id: 'dec', label: 'Decomposer' },
      ],
      mappings: [
        { itemId: 'p1', zoneId: 'pro' },
        { itemId: 'p2', zoneId: 'con' },
        { itemId: 'p3', zoneId: 'dec' },
        { itemId: 'p4', zoneId: 'con' },
      ],
      hints: [
        { level: 1, text: 'Producers make food from sunlight; consumers eat other organisms.' },
      ],
    }),
    dragDropQuestion(4, {
      prompt: 'Match each measurement to its base unit.',
      instructions: 'Drag each quantity to the unit you would measure it in.',
      items: [
        { id: 'm1', label: 'Length' },
        { id: 'm2', label: 'Mass' },
        { id: 'm3', label: 'Time' },
      ],
      zones: [
        { id: 't1', label: 'Metre' },
        { id: 't2', label: 'Kilogram' },
        { id: 't3', label: 'Second' },
      ],
      mappings: [
        { itemId: 'm1', zoneId: 't1' },
        { itemId: 'm2', zoneId: 't2' },
        { itemId: 'm3', zoneId: 't3' },
      ],
      hints: [],
      basePoints: 80,
      timerOverrideSeconds: 45,
    }),
    dragDropQuestion(5, {
      prompt: 'Classify these changes as physical or chemical.',
      instructions: 'Drag each change into the correct group.',
      items: [
        { id: 'c1', label: 'Melting ice' },
        { id: 'c2', label: 'Rusting iron' },
        { id: 'c3', label: 'Burning wood' },
      ],
      zones: [
        { id: 'phys', label: 'Physical change' },
        { id: 'chem', label: 'Chemical change' },
      ],
      mappings: [
        { itemId: 'c1', zoneId: 'phys' },
        { itemId: 'c2', zoneId: 'chem' },
        { itemId: 'c3', zoneId: 'chem' },
      ],
      hints: [],
    }),
    dragDropQuestion(6, {
      prompt: 'Sort these into living or non-living things.',
      instructions: 'Drag each item into the group that best describes it.',
      items: [
        { id: 'l1', label: 'Bacteria' },
        { id: 'l2', label: 'Rock' },
        { id: 'l3', label: 'Tree' },
      ],
      zones: [
        { id: 'live', label: 'Living' },
        { id: 'now', label: 'Non-living' },
      ],
      mappings: [
        { itemId: 'l1', zoneId: 'live' },
        { itemId: 'l2', zoneId: 'now' },
        { itemId: 'l3', zoneId: 'live' },
      ],
      hints: [],
    }),
  ]
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