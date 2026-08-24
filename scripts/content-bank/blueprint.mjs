/**
 * Content Bank — authoritative blueprints (Task 5.14).
 *
 * Machine-readable encoding of reports/07-task-3.1-content-model.md:
 *   - §3   controlled topic/subtopic vocabulary (per stream)
 *   - §4   typical grade band per level (D-045: level != grade)
 *   - §5.3 in-level difficulty distribution per level
 *   - §6   activity-type distribution per stream x level
 *   - §7   topic counts per stream x level
 *
 * Every authored question must be attributable to exactly one
 * (stream, level, activityType, topic, subtopic, difficulty) cell; the
 * content validator checks that the bank's per-level counts never exceed the
 * blueprint and that the internal distribution tracks the blueprint ratios.
 */

/** Activity slugs in the DB activity_types catalogue (D-043). */
export const ACTIVITY_TYPES = Object.freeze([
  'drag-drop', 'matching', 'ordering', 'sorting', 'fill-complete',
  'image-interaction', 'pattern', 'memory', 'scenario-challenge', 'number-logic',
])

export const STREAMS = Object.freeze(['science', 'technology', 'engineering', 'mathematics'])
export const LEVELS = Object.freeze([1, 2, 3, 4, 5])
export const DIFFICULTIES = Object.freeze([1, 2, 3, 4, 5])

/** Report 07 §4 — typical grade suitability band per level (D-045). */
export const GRADE_BANDS = Object.freeze({
  1: { min: 6, max: 7, note: 'predominantly grades 6–7' },
  2: { min: 6, max: 8, note: 'grades 6–8' },
  3: { min: 7, max: 9, note: 'grades 7–9' },
  4: { min: 8, max: 11, note: 'grades 8–11' },
  5: { min: 9, max: 11, note: 'grades 9–11' },
})

/** Report 07 §5.3 — in-level item difficulty distribution (percent of 100). */
export const DIFFICULTY_DISTRIBUTION = Object.freeze({
  1: { 1: 70, 2: 25, 3: 5, 4: 0, 5: 0 },
  2: { 1: 35, 2: 40, 3: 20, 4: 5, 5: 0 },
  3: { 1: 30, 2: 40, 3: 25, 4: 5, 5: 0 },
  4: { 1: 0, 2: 25, 3: 45, 4: 30, 5: 0 },
  5: { 1: 0, 2: 0, 3: 40, 4: 60, 5: 0 },
})

/** Report 07 §6 — activity distribution (percent of 100) per stream x level. */
export const ACTIVITY_DISTRIBUTION = Object.freeze({
  science: {
    1: { 'drag-drop': 25, matching: 15, ordering: 5, sorting: 20, 'fill-complete': 10, 'image-interaction': 5, pattern: 5, memory: 10, 'scenario-challenge': 0, 'number-logic': 5 },
    2: { 'drag-drop': 20, matching: 15, ordering: 10, sorting: 10, 'fill-complete': 15, 'image-interaction': 10, pattern: 5, memory: 10, 'scenario-challenge': 0, 'number-logic': 5 },
    3: { 'drag-drop': 15, matching: 10, ordering: 10, sorting: 10, 'fill-complete': 15, 'image-interaction': 15, pattern: 5, memory: 10, 'scenario-challenge': 5, 'number-logic': 5 },
    4: { 'drag-drop': 10, matching: 5, ordering: 10, sorting: 5, 'fill-complete': 15, 'image-interaction': 20, pattern: 10, memory: 5, 'scenario-challenge': 15, 'number-logic': 5 },
    5: { 'drag-drop': 5, matching: 5, ordering: 5, sorting: 5, 'fill-complete': 15, 'image-interaction': 20, pattern: 10, memory: 5, 'scenario-challenge': 25, 'number-logic': 5 },
  },
  technology: {
    1: { 'drag-drop': 20, matching: 15, ordering: 5, sorting: 15, 'fill-complete': 15, 'image-interaction': 5, pattern: 10, memory: 10, 'scenario-challenge': 0, 'number-logic': 5 },
    2: { 'drag-drop': 15, matching: 15, ordering: 10, sorting: 10, 'fill-complete': 15, 'image-interaction': 10, pattern: 10, memory: 10, 'scenario-challenge': 0, 'number-logic': 5 },
    3: { 'drag-drop': 10, matching: 10, ordering: 10, sorting: 5, 'fill-complete': 15, 'image-interaction': 10, pattern: 15, memory: 10, 'scenario-challenge': 5, 'number-logic': 10 },
    4: { 'drag-drop': 5, matching: 5, ordering: 10, sorting: 5, 'fill-complete': 15, 'image-interaction': 10, pattern: 15, memory: 5, 'scenario-challenge': 15, 'number-logic': 15 },
    5: { 'drag-drop': 5, matching: 5, ordering: 5, sorting: 0, 'fill-complete': 15, 'image-interaction': 10, pattern: 15, memory: 5, 'scenario-challenge': 20, 'number-logic': 20 },
  },
  engineering: {
    1: { 'drag-drop': 20, matching: 15, ordering: 10, sorting: 15, 'fill-complete': 10, 'image-interaction': 5, pattern: 5, memory: 10, 'scenario-challenge': 5, 'number-logic': 5 },
    2: { 'drag-drop': 15, matching: 15, ordering: 10, sorting: 10, 'fill-complete': 15, 'image-interaction': 10, pattern: 5, memory: 10, 'scenario-challenge': 5, 'number-logic': 5 },
    3: { 'drag-drop': 10, matching: 10, ordering: 10, sorting: 5, 'fill-complete': 15, 'image-interaction': 15, pattern: 5, memory: 5, 'scenario-challenge': 20, 'number-logic': 5 },
    4: { 'drag-drop': 5, matching: 5, ordering: 10, sorting: 5, 'fill-complete': 15, 'image-interaction': 15, pattern: 5, memory: 5, 'scenario-challenge': 25, 'number-logic': 10 },
    5: { 'drag-drop': 5, matching: 5, ordering: 5, sorting: 0, 'fill-complete': 10, 'image-interaction': 10, pattern: 5, memory: 5, 'scenario-challenge': 30, 'number-logic': 25 },
  },
  mathematics: {
    1: { 'drag-drop': 15, matching: 10, ordering: 5, sorting: 15, 'fill-complete': 15, 'image-interaction': 0, pattern: 15, memory: 10, 'scenario-challenge': 0, 'number-logic': 15 },
    2: { 'drag-drop': 10, matching: 10, ordering: 5, sorting: 10, 'fill-complete': 20, 'image-interaction': 5, pattern: 15, memory: 10, 'scenario-challenge': 0, 'number-logic': 15 },
    3: { 'drag-drop': 5, matching: 10, ordering: 5, sorting: 5, 'fill-complete': 20, 'image-interaction': 5, pattern: 15, memory: 5, 'scenario-challenge': 5, 'number-logic': 25 },
    4: { 'drag-drop': 0, matching: 5, ordering: 5, sorting: 0, 'fill-complete': 25, 'image-interaction': 10, pattern: 15, memory: 5, 'scenario-challenge': 10, 'number-logic': 25 },
    5: { 'drag-drop': 0, matching: 5, ordering: 5, sorting: 0, 'fill-complete': 25, 'image-interaction': 5, pattern: 15, memory: 5, 'scenario-challenge': 10, 'number-logic': 30 },
  },
})

/**
 * Report 07 §7 — topic counts per stream x level (sum = 100).
 * Values are blueprint maxima; the bank must reach exactly these at 100/level.
 */
export const TOPIC_DISTRIBUTION = Object.freeze({
  science: {
    1: { physics: 25, chemistry: 20, life: 25, 'earth-space': 20, inquiry: 10 },
    2: { physics: 25, chemistry: 20, life: 25, 'earth-space': 20, inquiry: 10 },
    3: { physics: 25, chemistry: 20, life: 25, 'earth-space': 20, inquiry: 10 },
    4: { physics: 30, chemistry: 25, life: 20, 'earth-space': 15, inquiry: 10 },
    5: { physics: 30, chemistry: 25, life: 20, 'earth-space': 15, inquiry: 10 },
  },
  technology: {
    1: { computing: 25, programming: 25, 'digital-literacy': 20, 'data-ai': 10, 'digital-tools': 20 },
    2: { computing: 25, programming: 30, 'digital-literacy': 15, 'data-ai': 10, 'digital-tools': 20 },
    3: { computing: 20, programming: 35, 'digital-literacy': 10, 'data-ai': 15, 'digital-tools': 20 },
    4: { computing: 15, programming: 40, 'digital-literacy': 5, 'data-ai': 25, 'digital-tools': 15 },
    5: { computing: 15, programming: 45, 'digital-literacy': 5, 'data-ai': 25, 'digital-tools': 10 },
  },
  engineering: {
    1: { 'design-process': 20, 'materials-structures': 25, 'mechanisms-machines': 25, 'electronics-circuits': 20, 'systems-society': 10 },
    2: { 'design-process': 20, 'materials-structures': 25, 'mechanisms-machines': 25, 'electronics-circuits': 20, 'systems-society': 10 },
    3: { 'design-process': 30, 'materials-structures': 20, 'mechanisms-machines': 20, 'electronics-circuits': 15, 'systems-society': 15 },
    4: { 'design-process': 30, 'materials-structures': 15, 'mechanisms-machines': 15, 'electronics-circuits': 20, 'systems-society': 20 },
    5: { 'design-process': 30, 'materials-structures': 10, 'mechanisms-machines': 10, 'electronics-circuits': 20, 'systems-society': 30 },
  },
  mathematics: {
    1: { 'number-operations': 30, algebra: 15, 'geometry-measurement': 15, 'data-statistics': 10, 'reasoning-problem-solving': 30 },
    2: { 'number-operations': 25, algebra: 20, 'geometry-measurement': 20, 'data-statistics': 15, 'reasoning-problem-solving': 20 },
    3: { 'number-operations': 20, algebra: 25, 'geometry-measurement': 20, 'data-statistics': 15, 'reasoning-problem-solving': 20 },
    4: { 'number-operations': 15, algebra: 30, 'geometry-measurement': 20, 'data-statistics': 15, 'reasoning-problem-solving': 20 },
    5: { 'number-operations': 10, algebra: 35, 'geometry-measurement': 20, 'data-statistics': 15, 'reasoning-problem-solving': 20 },
  },
})

/**
 * Report 07 §3 — controlled topic/subtopic vocabulary per stream.
 * Subtopic slugs are unique within a topic; each question carries exactly one
 * topic and one subtopic.
 */
export const TOPIC_VOCABULARY = Object.freeze({
  science: {
    physics: ['forces-motion', 'energy', 'matter', 'electricity-magnetism', 'waves-light-sound'],
    chemistry: ['matter-particles', 'elements-compounds', 'reactions-changes', 'acids-bases', 'periodic-table'],
    life: ['cells-organisms', 'body-systems', 'genetics-heredity', 'evolution-ecosystems', 'plants-animals'],
    'earth-space': ['earth-structure', 'weather-climate', 'solar-system', 'rock-cycle', 'natural-resources'],
    inquiry: ['scientific-method', 'measurement-units', 'data-graphing', 'lab-safety'],
  },
  technology: {
    computing: ['hardware', 'operating-systems', 'networks-internet', 'data-representation'],
    programming: ['algorithms', 'control-flow', 'variables-data', 'debugging'],
    'digital-literacy': ['files-formats', 'information-literacy', 'online-safety-ethics'],
    'data-ai': ['data-collection', 'data-representation', 'patterns', 'ai-ml-basics'],
    'digital-tools': ['documents', 'spreadsheets', 'presentation', 'search', 'collaboration'],
  },
  engineering: {
    'design-process': ['define-problem', 'research', 'design-solutions', 'prototype-build', 'test-evaluate', 'iterate-communicate'],
    'materials-structures': ['material-properties', 'structures-stability', 'forces-in-structures'],
    'mechanisms-machines': ['simple-machines', 'levers-pulleys-gears', 'linkages', 'motion-mechanisms'],
    'electronics-circuits': ['basic-circuits', 'components', 'sensors-actuators', 'robotics-intro'],
    'systems-society': ['systems-thinking', 'energy-systems', 'sustainable-design', 'engineering-impact'],
  },
  mathematics: {
    'number-operations': ['whole-numbers', 'fractions-decimals-percent', 'integers', 'rational-irrational', 'exponents-roots'],
    algebra: ['expressions-equations', 'patterns-functions', 'inequalities', 'linear-relationships', 'quadratics-intro'],
    'geometry-measurement': ['shapes-properties', 'angles', 'perimeter-area-volume', 'transformations', 'coordinate-geometry'],
    'data-statistics': ['data-display', 'measures-center', 'probability', 'sampling-inference-intro'],
    'reasoning-problem-solving': ['logic-puzzles', 'estimation-mental-math', 'multi-step-reasoning'],
  },
})

/** Total bank size required by the spec (4 × 5 × 100). */
export const BLUEPRINT_TOTAL = 2000
export const PER_LEVEL = 100
export const BUFFER_RECOMMENDED = 0.05

export default {
  ACTIVITY_TYPES, STREAMS, LEVELS, DIFFICULTIES,
  GRADE_BANDS, DIFFICULTY_DISTRIBUTION, ACTIVITY_DISTRIBUTION,
  TOPIC_DISTRIBUTION, TOPIC_VOCABULARY,
  BLUEPRINT_TOTAL, PER_LEVEL, BUFFER_RECOMMENDED,
}