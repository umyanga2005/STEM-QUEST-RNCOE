/**
 * Admin Question Builder — row ⇄ DTO mapper (Task 5.10).
 *
 * One place that maps between the DB `questions` row (snake_case, 0001 + 0004)
 * and the authoring DTO (camelCase envelope minus `formatVersion`). The DTO is
 * the shape both the API and the editor work with.
 *
 * Taxonomy (D-043): the relational store has no `topic`/`subtopic` columns —
 * they live in `tags[]` as `topic:<slug>` / `subtopic:<slug>`. The DTO keeps
 * them as first-class `topic` / `subtopic` fields; the mapper folds them into
 * `tags[]` on write and splits them back out on read. Free tags are the
 * remaining entries.
 */

const TOPIC_PREFIX = 'topic:'
const SUBTOPIC_PREFIX = 'subtopic:'

/** Extracts topic/subtopic + free tags from a raw tags[] array. */
export function splitTaxonomyTags(tags = []) {
  const topic = tags.find((t) => t.startsWith(TOPIC_PREFIX))?.slice(TOPIC_PREFIX.length) ?? null
  const subtopic = tags.find((t) => t.startsWith(SUBTOPIC_PREFIX))?.slice(SUBTOPIC_PREFIX.length) ?? null
  const freeTags = tags.filter(
    (t) => !t.startsWith(TOPIC_PREFIX) && !t.startsWith(SUBTOPIC_PREFIX)
  )
  return { topic, subtopic, freeTags }
}

/** Builds the combined tags[] for the store from a DTO. */
export function combineTaxonomyTags({ topic = null, subtopic = null, tags = [] } = {}) {
  const out = []
  if (topic) out.push(`${TOPIC_PREFIX}${topic}`)
  if (subtopic) out.push(`${SUBTOPIC_PREFIX}${subtopic}`)
  out.push(...tags)
  return out
}

/**
 * Maps a DB row (with catalogue embeds) to the authoring DTO.
 * `activitySchemaVersion` is injected by the service from the engine; rows do
 * not carry it.
 */
export function rowToQuestionDto(row, { activitySchemaVersion = '1.0' } = {}) {
  if (!row) return null
  const { topic, subtopic, freeTags } = splitTaxonomyTags(row.tags ?? [])
  return {
    id: row.id,
    stream: row.streams?.slug ?? row.stream ?? 'science',
    level: row.levels?.number ?? row.level ?? 1,
    activityType: row.activity_types?.slug ?? row.activityType ?? 'drag-drop',
    activitySchemaVersion,
    prompt: row.prompt,
    instructions: row.instructions ?? null,
    explanation: row.explanation ?? null,
    payload: row.payload,
    correctAnswer: row.correct_answer ?? row.correctAnswer ?? {},
    hints: row.hints ?? null,
    topic,
    subtopic,
    tags: freeTags,
    gradeMin: row.grade_min ?? row.gradeMin ?? 6,
    gradeMax: row.grade_max ?? row.gradeMax ?? 8,
    difficulty: row.difficulty ?? 1,
    basePoints: row.base_points ?? row.basePoints ?? 100,
    timerOverrideSeconds: row.timer_override_seconds ?? row.timerOverrideSeconds ?? null,
    status: row.status ?? 'published',
    isFlagged: row.is_flagged === true || row.isFlagged === true,
    version: row.version ?? 1,
    meta: row.meta ?? null,
    createdAt: row.created_at ?? row.createdAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  }
}

/**
 * Maps an authoring DTO (with resolved catalogue ids) to a DB insert row.
 * `created_at`/`updated_at` are written explicitly by the backend (D-037: no
 * DB trigger; the service role writes them).
 */
export function questionDtoToRow(dto, { streamId, levelId, activityTypeId, createdAt, updatedAt }) {
  return {
    stream_id: streamId,
    level_id: levelId,
    activity_type_id: activityTypeId,
    prompt: dto.prompt,
    instructions: dto.instructions ?? null,
    explanation: dto.explanation ?? null,
    payload: dto.payload,
    correct_answer: dto.correctAnswer,
    hints: dto.hints ?? null,
    tags: combineTaxonomyTags(dto),
    grade_min: dto.gradeMin,
    grade_max: dto.gradeMax,
    difficulty: dto.difficulty,
    base_points: dto.basePoints,
    timer_override_seconds: dto.timerOverrideSeconds ?? null,
    status: dto.status,
    is_flagged: dto.isFlagged === true,
    version: dto.version,
    meta: dto.meta ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export default {
  splitTaxonomyTags,
  combineTaxonomyTags,
  rowToQuestionDto,
  questionDtoToRow,
}