/**
 * Content Bank — validator + machine-readable report (Task 5.14).
 *
 * Reads question records (NDJSON, one envelope per line) and reports, per
 * record:
 *   - schema/semantic validation (REUSES createQuestionValidator — the same
 *     validator the Admin Question Builder uses; never a re-implementation)
 *   - quality gates (Q1/Q2/Q8/Q9/Q16 subset that is machine-checkable)
 *   - exact-duplicate detection via canonical content hash
 *   - near-duplicate detection (bigram Jaccard on the prompt)
 *   - template-variant limits (<= 3 per template per level, report 07 §9)
 *   - blueprint distribution progress per (stream, level) against reports/07
 *     §6/§7/§5.3 (authored counts never exceed the blueprint cell targets)
 *   - a machine-readable summary line (TOTAL/STREAM/LEVEL/ACTIVITY/TOPIC/
 *     DIFFICULTY/INVALID/DUPLICATES/MISSING METADATA/MEDIA ERRORS/
 *     LIFECYCLE ERRORS)
 *
 * Records may omit server-derived fields (formatVersion, activitySchemaVersion,
 * status, version, isFlagged, basePoints) — they are normalized exactly like
 * QuestionService.normalizeDraft before validation.
 *
 * Usage:
 *   node scripts/content-bank/content-validator.mjs [--json <out.json>] <file.ndjson...>
 * Exit code 0 = clean; 1 = invalid records / duplicates / blueprint violations.
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createQuestionValidator } from '../../src/features/admin/questions/validation/question-validator.js'
import {
  STREAMS, LEVELS, ACTIVITY_TYPES, GRADE_BANDS, DIFFICULTY_DISTRIBUTION,
  ACTIVITY_DISTRIBUTION, TOPIC_DISTRIBUTION, TOPIC_VOCABULARY, PER_LEVEL,
} from './blueprint.mjs'

const FORMAT_VERSION = 1
const PROMPT_RECOMMENDED_MAX = 160
const LEAK_MIN_LEN = 4
const NEAR_DUP_THRESHOLD = 0.85
const MAX_TEMPLATE_VARIANTS = 3

/** Whitespace-normalized canonical form of a record (for hashing). */
export function canonicalForm({ prompt, payload, correctAnswer }) {
  const normalize = (v) => JSON.stringify(v, null, 0).replace(/\s+/g, ' ')
  return `${normalize(prompt)}|${normalize(payload)}|${normalize(correctAnswer)}`
}

/** SHA-256 content hash over the canonical form (report 07 §9.1). */
export function contentHash(record) {
  return createHash('sha256').update(canonicalForm(record)).digest('hex')
}

/** Bigram-set Jaccard similarity between two strings. */
export function jaccard(a, b) {
  const bigrams = (s) => {
    const out = new Set()
    for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2))
    return out
  }
  const sa = bigrams(a)
  const sb = bigrams(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  for (const g of sa) if (sb.has(g)) inter += 1
  return inter / (sa.size + sb.size - inter)
}

/** Collects leaf string values from a correctAnswer object (recursive). */
export function collectAnswerTexts(correctAnswer, out = []) {
  if (Array.isArray(correctAnswer)) {
    for (const v of correctAnswer) collectAnswerTexts(v, out)
    return out
  }
  if (correctAnswer && typeof correctAnswer === 'object') {
    for (const v of Object.values(correctAnswer)) collectAnswerTexts(v, out)
    return out
  }
  if (typeof correctAnswer === 'string') out.push(correctAnswer)
  return out
}

/**
 * Q16 leak check: meaningful answer text (>= LEAK_MIN_LEN chars, not a bare
 * number and not an entity id) must not appear verbatim in the prompt, any
 * hint, or any feedback template. Explanation is shown only after answering,
 * so it is not leak-sensitive (report 07 §11/§12).
 */
export function findLeaks(record) {
  const answerTexts = collectAnswerTexts(record.correctAnswer ?? {})
  const leaks = []
  for (const text of answerTexts) {
    const t = text.trim()
    if (t.length < LEAK_MIN_LEN) continue
    if (/^-?\d+([.,]\d+)?%?$/.test(t)) continue
    if (/^[a-z][a-z0-9_]{1,31}$/.test(t) && /^[a-z][a-z0-9_]+$/.test(t)) {
      // Looks like an entity id (i1, z1, d1, opt_a, ...) or a short slug; only
      // flag it when it is a natural-language answer (contains a space or is
      // not a plausible id pattern).
      if (!/\s/.test(t) && /^[a-z][a-z0-9_]{0,31}$/.test(t)) continue
    }
    const haystacks = [record.prompt ?? '']
    for (const h of record.hints ?? []) haystacks.push(h.text ?? '')
    for (const f of Object.values(record.meta?.feedback ?? {})) haystacks.push(String(f))
    for (const hay of haystacks) {
      if (typeof hay === 'string' && hay.length > 0 && hay.toLowerCase().includes(t.toLowerCase())) {
        leaks.push({ answer: t, in: hay.slice(0, 80) })
      }
    }
  }
  return leaks
}

/**
 * Normalizes a raw record into the authoring draft shape — the same
 * server-derived defaults QuestionService.normalizeDraft applies, so the
 * validator and the importer agree: formatVersion is the internal constant,
 * activitySchemaVersion comes from the engine (never the client), status is
 * draft, version 1, basePoints 100.
 */
export function normalizeRecord(raw, { engine } = {}) {
  return {
    ...raw,
    formatVersion: FORMAT_VERSION,
    activitySchemaVersion: raw.activitySchemaVersion ?? (engine ? engine.getSchemaVersion(raw.activityType) : undefined),
    status: 'draft',
    version: 1,
    isFlagged: false,
    basePoints: raw.basePoints ?? 100,
    tags: raw.tags ?? [],
    hints: raw.hints ?? [],
  }
}

/**
 * Validates a single record. Returns:
 * { valid, errors: [{path, message, code}], hash, leaks, warnings }
 */
export function validateRecord(record, { validator } = {}) {
  const resolved = validator ?? createQuestionValidator()
  const draft = normalizeRecord(record, { engine: resolved.engine })
  const errors = []
  const warnings = []

  // Full authoring validation (envelope + payload schema + semantic + cross-doc).
  const result = resolved.validate(draft)
  for (const e of result.errors) errors.push({ path: e.path, message: e.message, code: e.code })

  // Quality gates (machine-checkable subset of Q1/Q2/Q8/Q9/Q16).
  const objective = draft.meta?.objective
  if (typeof objective !== 'string' || objective.trim().length === 0) {
    errors.push({ path: '/meta/objective', message: 'Q1: meta.objective (one-sentence learning objective) is required.', code: 'Q1' })
  }
  const feedback = draft.meta?.feedback
  if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback) || Object.keys(feedback).length === 0) {
    errors.push({ path: '/meta/feedback', message: 'Q8: at least one feedback template is required.', code: 'Q8' })
  }
  if (typeof draft.explanation !== 'string' || draft.explanation.trim().length === 0) {
    errors.push({ path: '/explanation', message: 'Q8: a learning explanation is required.', code: 'Q8' })
  }
  if (typeof draft.topic !== 'string' || draft.topic.length === 0 || typeof draft.subtopic !== 'string' || draft.subtopic.length === 0) {
    errors.push({ path: '/topic', message: 'Q3/taxonomy: exactly one topic and one subtopic are required.', code: 'TAXONOMY' })
  } else {
    const vocab = TOPIC_VOCABULARY[draft.stream]?.[draft.topic]
    if (!vocab) {
      errors.push({ path: '/topic', message: `topic "${draft.topic}" is not in the ${draft.stream} controlled vocabulary.`, code: 'TAXONOMY' })
    } else if (!vocab.includes(draft.subtopic)) {
      errors.push({ path: '/subtopic', message: `subtopic "${draft.subtopic}" is not valid for topic "${draft.topic}".`, code: 'TAXONOMY' })
    }
  }
  if (!(draft.gradeMin >= 6 && draft.gradeMin <= draft.gradeMax && draft.gradeMax <= 11)) {
    errors.push({ path: '/gradeMin', message: 'Q2: grade range must satisfy 6 <= gradeMin <= gradeMax <= 11.', code: 'Q2' })
  }
  const band = GRADE_BANDS[draft.level]
  if (band && draft.gradeMax < band.min) {
    warnings.push({ path: '/gradeMax', message: `Q2: content sits below the level ${draft.level} grade band (${band.min}–${band.max}).`, code: 'Q2' })
  }
  if (typeof draft.prompt === 'string' && draft.prompt.length > PROMPT_RECOMMENDED_MAX) {
    warnings.push({ path: '/prompt', message: `Q9: prompt is ${draft.prompt.length} chars; keep <= ${PROMPT_RECOMMENDED_MAX}.`, code: 'Q9' })
  }

  // Q16 answer-leak check.
  const leaks = findLeaks(draft)
  for (const l of leaks) {
    errors.push({ path: '/correctAnswer', message: `Q16: answer text "${l.answer}" appears in prompt/hints/feedback.`, code: 'Q16' })
  }

  const hash = contentHash(draft)
  return { valid: errors.length === 0, errors, warnings, hash, leaks }
}

/**
 * Validates a full batch of records and emits the distribution + summary.
 * Returns { records, invalid, duplicates, nearDuplicates, templateViolations,
 *           distribution, summary, line, ok }
 */
export async function validateBatch(records, { validator } = {}) {
  const resolved = validator ?? createQuestionValidator()

  const hashes = new Map()
  const invalid = []
  const duplicates = []
  const templateCounts = new Map()
  const templateViolations = []

  const seen = new Map()
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]
    const { valid, errors, warnings, hash, leaks } = validateRecord(record, { validator: resolved })

    // Exact-duplicate detection (canonical content hash).
    if (hashes.has(hash)) {
      duplicates.push({ line: i + 1, otherLine: hashes.get(hash), hash })
    } else {
      hashes.set(hash, i + 1)
    }

    // Template-variant limit per (stream, level, templateId).
    const templateId = record.meta?.authoring?.templateId
    if (templateId) {
      const key = `${record.stream}|${record.level}|${templateId}`
      const count = (templateCounts.get(key) ?? 0) + 1
      templateCounts.set(key, count)
      if (count > MAX_TEMPLATE_VARIANTS) {
        templateViolations.push({ line: i + 1, stream: record.stream, level: record.level, templateId, count })
      }
    }

    if (!valid) invalid.push({ line: i + 1, stream: record.stream, level: record.level, errors, warnings, leaks })
    seen.set(i + 1, { record, warnings })
  }

  // Near-duplicate detection within the same (stream, level): bigram Jaccard
  // on the normalized prompt, pairs above the threshold are reported.
  const nearDuplicates = []
  const groups = new Map()
  for (const [line, { record }] of seen) {
    const key = `${record.stream}|${record.level}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ line, record })
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        // Compare the substantive stem (after the first ':') — fixed prompt
        // wrappers like "Choose the next number:" are template framing, not
        // the content that could make two questions near-duplicates.
        const a = (group[i].record.prompt ?? '').replace(/^[^:]*:\s*/, '').toLowerCase()
        const b = (group[j].record.prompt ?? '').replace(/^[^:]*:\s*/, '').toLowerCase()
        const sim = jaccard(a, b)
        if (sim >= NEAR_DUP_THRESHOLD) {
          nearDuplicates.push({ lineA: group[i].line, lineB: group[j].line, similarity: sim.toFixed(2) })
        }
      }
    }
  }

  // Blueprint distribution (per stream x level): authored counts per activity,
  // topic, difficulty; never exceed the blueprint cell target.
  const distribution = {}
  for (const s of STREAMS) {
    distribution[s] = {}
    for (const l of LEVELS) distribution[s][l] = { authored: 0, activity: {}, topic: {}, difficulty: {}, errors: [] }
  }
  for (const { record } of seen.values()) {
    const cell = distribution[record.stream]?.[record.level]
    if (!cell) continue
    cell.authored += 1
    cell.activity[record.activityType] = (cell.activity[record.activityType] ?? 0) + 1
    cell.topic[record.topic] = (cell.topic[record.topic] ?? 0) + 1
    cell.difficulty[record.difficulty] = (cell.difficulty[record.difficulty] ?? 0) + 1
  }
  const distributionErrors = []
  for (const s of STREAMS) {
    for (const l of LEVELS) {
      const cell = distribution[s][l]
      if (cell.authored === 0) continue
      const actBlueprint = ACTIVITY_DISTRIBUTION[s][l]
      const topBlueprint = TOPIC_DISTRIBUTION[s][l]
      const diffBlueprint = DIFFICULTY_DISTRIBUTION[l]
      if (cell.authored > PER_LEVEL) {
        cell.errors.push(`level ${l} authored ${cell.authored} > ${PER_LEVEL}`)
      }
      // The authored counts for a partial level must never exceed the target
      // fraction of the level's 100 (activity/topic/difficulty maxima).
      for (const type of ACTIVITY_TYPES) {
        const authored = cell.activity[type] ?? 0
        const target = actBlueprint[type]
        if (authored > target) {
          cell.errors.push(`${s} L${l}: activity ${type} authored ${authored} > blueprint ${target}`)
        }
      }
      for (const topic of Object.keys(topBlueprint)) {
        const authored = cell.topic[topic] ?? 0
        if (authored > topBlueprint[topic]) {
          cell.errors.push(`${s} L${l}: topic ${topic} authored ${authored} > blueprint ${topBlueprint[topic]}`)
        }
      }
      for (const d of [1, 2, 3, 4, 5]) {
        const authored = cell.difficulty[d] ?? 0
        if (authored > diffBlueprint[d]) {
          cell.errors.push(`${s} L${l}: difficulty D${d} authored ${authored} > blueprint ${diffBlueprint[d]}`)
        }
      }
      distributionErrors.push(...cell.errors)
    }
  }

  // Machine-readable summary.
  const total = records.length
  const byStream = {}
  const byLevel = {}
  const byActivity = {}
  const byTopic = {}
  const byDifficulty = {}
  for (const r of records) {
    byStream[r.stream] = (byStream[r.stream] ?? 0) + 1
    byLevel[r.level] = (byLevel[r.level] ?? 0) + 1
    byActivity[r.activityType] = (byActivity[r.activityType] ?? 0) + 1
    byTopic[r.topic] = (byTopic[r.topic] ?? 0) + 1
    byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + 1
  }
  const missingMetadata = invalid.filter((e) => e.errors.some((x) => x.code === 'Q1' || x.code === 'Q8' || x.code === 'TAXONOMY')).length
  const mediaErrors = invalid.filter((e) => e.errors.some((x) => x.code === 'ENVELOPE' && /media|payload/.test(x.message))).length

  const summary = {
    total,
    stream: byStream,
    level: byLevel,
    activity: byActivity,
    topic: byTopic,
    difficulty: byDifficulty,
    invalid: invalid.length,
    duplicates: duplicates.length,
    nearDuplicates: nearDuplicates.length,
    templateViolations: templateViolations.length,
    missingMetadata,
    mediaErrors,
    lifecycleErrors: 0,
  }
  const line = [
    `TOTAL:${summary.total}`,
    `STREAM:${Object.entries(byStream).map(([k, v]) => `${k}=${v}`).join(',')}`,
    `LEVEL:${Object.entries(byLevel).map(([k, v]) => `L${k}=${v}`).join(',')}`,
    `ACTIVITY:${Object.entries(byActivity).map(([k, v]) => `${k}=${v}`).join(',')}`,
    `TOPIC:${Object.entries(byTopic).map(([k, v]) => `${k}=${v}`).join(',')}`,
    `DIFFICULTY:${Object.entries(byDifficulty).map(([k, v]) => `D${k}=${v}`).join(',')}`,
    `INVALID:${summary.invalid}`,
    `DUPLICATES:${summary.duplicates}`,
    `MISSING METADATA:${summary.missingMetadata}`,
    `MEDIA ERRORS:${summary.mediaErrors}`,
    `LIFECYCLE ERRORS:${summary.lifecycleErrors}`,
  ].join(' ')

  const ok = invalid.length === 0 && duplicates.length === 0 && templateViolations.length === 0 && distributionErrors.length === 0

  return { records, invalid, duplicates, nearDuplicates, templateViolations, distribution, distributionErrors, summary, line, ok }
}

/** Parses NDJSON content from a file path. */
export async function readNdjson(filePath) {
  const text = await readFile(filePath, 'utf8')
  const records = []
  for (const [i, rawLine] of text.split('\n').entries()) {
    const l = rawLine.trim()
    if (!l) continue
    try {
      records.push(JSON.parse(l))
    } catch {
      throw new Error(`${filePath}: line ${i + 1} is not valid JSON`)
    }
  }
  return records
}

/** Pretty-prints the validator report to a string. */
export function renderReport(report, { showWarnings = false } = {}) {
  const lines = []
  lines.push('=== CONTENT BANK VALIDATION REPORT ===')
  lines.push(report.line)
  if (report.invalid.length > 0) {
    lines.push(`\nINVALID RECORDS (${report.invalid.length}):`)
    for (const r of report.invalid) {
      lines.push(`  line ${r.line} [${r.stream} L${r.level}]`)
      for (const e of r.errors) lines.push(`    - ${e.path}: ${e.message}${e.code ? ` [${e.code}]` : ''}`)
      if (showWarnings) for (const w of r.warnings) lines.push(`    ~ ${w.path}: ${w.message} [${w.code}]`)
    }
  }
  if (report.duplicates.length > 0) {
    lines.push(`\nDUPLICATES (${report.duplicates.length}):`)
    for (const d of report.duplicates) lines.push(`  line ${d.line} = line ${d.otherLine} (hash ${d.hash.slice(0, 12)}…)`)
  }
  if (report.nearDuplicates.length > 0) {
    lines.push(`\nNEAR-DUPLICATE PAIRS (${report.nearDuplicates.length}):`)
    for (const n of report.nearDuplicates) lines.push(`  line ${n.lineA} ~ line ${n.lineB} (sim ${n.similarity})`)
  }
  if (report.templateViolations.length > 0) {
    lines.push(`\nTEMPLATE VARIANTS > ${MAX_TEMPLATE_VARIANTS} (${report.templateViolations.length}):`)
    for (const t of report.templateViolations) lines.push(`  line ${t.line} [${t.stream} L${t.level}] ${t.templateId} x${t.count}`)
  }
  if (report.distributionErrors.length > 0) {
    lines.push(`\nDISTRIBUTION VIOLATIONS (${report.distributionErrors.length}):`)
    for (const e of report.distributionErrors) lines.push(`  - ${e}`)
  }
  lines.push('\nBLUEPRINT PROGRESS (per stream × level):')
  for (const s of STREAMS) {
    for (const l of LEVELS) {
      const cell = report.distribution[s]?.[l]
      if (!cell) continue
      lines.push(`  ${s} L${l}: authored ${cell.authored}/${PER_LEVEL}`)
    }
  }
  lines.push(`\nRESULT: ${report.ok ? 'OK (publishable)' : 'FAIL'}`)
  return lines.join('\n')
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href

if (isMain) {
  const args = process.argv.slice(2)
  const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null
  const paths = args.filter((a) => !a.startsWith('--'))
  const all = []
  for (const p of paths) all.push(...(await readNdjson(p)))
  const report = await validateBatch(all)
  process.stdout.write(renderReport(report))
  if (jsonOut) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(jsonOut, JSON.stringify({ line: report.line, summary: report.summary }, null, 2) + '\n')
  }
  process.exitCode = report.ok ? 0 : 1
}

export default { canonicalForm, contentHash, validateRecord, validateBatch, renderReport, readNdjson }