/**
 * Admin Question Builder — repository contracts (Task 5.10).
 *
 * The builder reads and writes the existing `questions` table (0001) with the
 * `meta` JSONB column from migration 0004. Column names follow the migration
 * exactly; the service-role client bypasses RLS (D-027/D-028), and there is no
 * admin SELECT policy on `questions` by design — full CRUD (including
 * `correct_answer` and `meta`) runs ONLY through this service layer.
 *
 * A QuestionRepository must implement:
 *
 *   list(filters) → QuestionRow[]
 *     filters: { streamId?, levelId?, activityTypeId?, status?, query?, limit? }
 *     Rows are projected with the catalogue embeds used by the DTO:
 *     `streams(slug)`, `levels(number)`, `activity_types(slug)`.
 *     `query` is a case-insensitive substring match on prompt.
 *
 *   findById(id) → QuestionRow | null   (with the same embeds)
 *   insert(row)  → QuestionRow          (with the same embeds)
 *   update(id, patch) → QuestionRow | null
 *   delete(id)   → boolean
 *   isMediaRefInUse(ref) → boolean
 *     True when ANY question (draft, published or archived) still references
 *     `ref` from its payload. Guards media deletion so removing one draft can
 *     never destroy an image another question is still using.
 *
 * A CatalogueRepository must implement:
 *
 *   findStreamBySlug(slug) → { id, slug } | null
 *   findLevelByNumber(streamId, number) → { id, number } | null
 *   findActivityTypeBySlug(slug) → { id, slug } | null
 *   listStreams() / listActivityTypes() → catalogue rows (filter dropdowns)
 *
 * A QuestionMediaRepository must implement (Task 5.12, private question-media
 * bucket; writes run as the service role, never the browser):
 *
 *   upload({ path, buffer, mimeType }) → path
 *     Stores the object under the bucket at `path` (server-generated).
 *   signedUrl(path) → string | null
 *     A short-lived signed URL for admin-side preview, or null when the
 *     object does not exist / the call fails.
 *   remove(path) → boolean
 *     Deletes the object; false when it did not exist.
 */

/**
 * @typedef {object} QuestionRow
 * @property {number} id
 * @property {number} stream_id
 * @property {number} level_id
 * @property {number} activity_type_id
 * @property {string} prompt
 * @property {?string} instructions
 * @property {?string} explanation
 * @property {object} payload
 * @property {object} correct_answer
 * @property {?Array<{ level: number, text: string }>} hints
 * @property {?string[]} tags
 * @property {number} grade_min
 * @property {number} grade_max
 * @property {number} difficulty
 * @property {number} base_points
 * @property {?number} timer_override_seconds
 * @property {string} status
 * @property {boolean} is_flagged
 * @property {number} version
 * @property {?object} meta
 * @property {string} created_at
 * @property {string} updated_at
 * @property {{ slug: string }|null} [streams]
 * @property {{ number: number }|null} [levels]
 * @property {{ slug: string }|null} [activity_types]
 */

export default { __contract: true }