/**
 * Mission — demo seed (Task 5.2).
 *
 * Extends the game-session demo base data with student-friendly stream
 * descriptions for the selection UI. These descriptions live ONLY in the
 * demo seed — production catalogue text is content (Task 3.x) and is never
 * authored here. Level timers/penalties come from the game-session seed
 * (D-034); this layer only surfaces stream + level for selection.
 */

export const MISSION_DEMO_STREAM_DESCRIPTIONS = Object.freeze({
  science: 'Explore how the world works — energy, matter, and living things.',
  technology: 'Discover the tools and systems behind the digital world.',
  engineering: 'Build, design, and solve real-world problems with clever ideas.',
  mathematics: 'Sharpen your numbers, patterns, and logical thinking.',
})

/** Returns demo streams enriched with their student-friendly descriptions. */
export function missionDemoStreams(baseStreams = []) {
  return baseStreams.map((s) => ({
    ...s,
    description: MISSION_DEMO_STREAM_DESCRIPTIONS[s.slug] ?? null,
    themeColor: null,
  }))
}

export default {
  MISSION_DEMO_STREAM_DESCRIPTIONS,
  missionDemoStreams,
}