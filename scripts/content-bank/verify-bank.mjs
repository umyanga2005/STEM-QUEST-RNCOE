/**
 * Content Bank — verify the live bank (Task 5.14 §10 verification).
 * Reads the published/draft rows back from Supabase and reports counts by
 * stream/level/activity/topic/difficulty, lifecycle status, media refs in
 * storage, and the machine-readable verification line.
 * Run: node --env-file=.env scripts/content-bank/verify-bank.mjs [--json <out.json>]
 */
import { writeFile } from 'node:fs/promises'
import { createDb, fetchBankRows, AUTHOR_SOURCE } from './lib.mjs'

const db = createDb()
const rows = (await fetchBankRows(db)).filter((r) => (r.meta?.authoring?.authorSource ?? '').startsWith(AUTHOR_SOURCE))
const args = process.argv.slice(2)
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null

const byStatus = {}
const byStream = {}
const byLevel = {}
const byActivity = {}
const byTopic = {}
const byDifficulty = {}
for (const r of rows) {
  const tags = Array.isArray(r.tags) ? r.tags : []
  const topic = tags.find((t) => t.startsWith('topic:'))?.slice('topic:'.length) ?? '?'
  const subtopic = tags.find((t) => t.startsWith('subtopic:'))?.slice('subtopic:'.length) ?? '?'
  byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  byStream[r.streams?.slug ?? '?'] = (byStream[r.streams?.slug ?? '?'] ?? 0) + 1
  byLevel[r.levels?.number ?? '?'] = (byLevel[r.levels?.number ?? '?'] ?? 0) + 1
  byActivity[r.activity_types?.slug ?? '?'] = (byActivity[r.activity_types?.slug ?? '?'] ?? 0) + 1
  byTopic[`${topic}/${subtopic}`] = (byTopic[`${topic}/${subtopic}`] ?? 0) + 1
  byDifficulty[r.difficulty ?? '?'] = (byDifficulty[r.difficulty ?? '?'] ?? 0) + 1
}

// Media integrity: every ref referenced by the bank must resolve in storage.
const refs = new Set()
for (const r of rows) {
  const collect = (v) => {
    if (Array.isArray(v)) { for (const x of v) collect(x); return }
    if (v && typeof v === 'object') {
      if (typeof v.ref === 'string' && v.ref.startsWith('question-media/')) refs.add(v.ref)
      for (const x of Object.values(v)) collect(x)
    }
  }
  collect(r.payload)
  collect(r.meta?.media ?? null)
}
const mediaStatus = {}
for (const ref of [...refs].sort()) {
  const { data } = await db.storage.from('question-media').createSignedUrl(ref, 60)
  mediaStatus[ref] = Boolean(data?.signedUrl)
}
const mediaMissing = Object.entries(mediaStatus).filter(([, ok]) => !ok).map(([ref]) => ref)

// Lifecycle: every non-draft row must have completed the sanctioned trail.
const lifecycleErrors = []
for (const r of rows) {
  if (r.status === 'published' && r.meta?.review?.state !== 'approved') {
    lifecycleErrors.push(`#${r.id} published but review.state=${r.meta?.review?.state}`)
  }
  if (r.status === 'draft' && r.meta?.review?.state === 'approved') {
    lifecycleErrors.push(`#${r.id} draft with approved review (not yet published)`)
  }
}

const verification = {
  total: rows.length,
  byStatus,
  byStream,
  byLevel,
  byActivity,
  byTopic,
  byDifficulty,
  media: { referenced: refs.size, missing: mediaMissing },
  lifecycleErrors,
  authorSource: AUTHOR_SOURCE,
}
const ok = verification.total > 0 && byStatus.published === rows.length && mediaMissing.length === 0 && lifecycleErrors.length === 0

const line = [
  `BANK:${verification.total}`,
  `STATUS:${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(',')}`,
  `STREAM:${Object.entries(byStream).map(([k, v]) => `${k}=${v}`).join(',')}`,
  `LEVEL:${Object.entries(byLevel).map(([k, v]) => `L${k}=${v}`).join(',')}`,
  `ACTIVITY:${Object.entries(byActivity).map(([k, v]) => `${k}=${v}`).join(',')}`,
  `TOPIC:${Object.entries(byTopic).map(([k, v]) => `${k}=${v}`).join(',')}`,
  `DIFFICULTY:${Object.entries(byDifficulty).map(([k, v]) => `D${k}=${v}`).join(',')}`,
  `MEDIA_MISSING:${mediaMissing.length}`,
  `LIFECYCLE_ERRORS:${lifecycleErrors.length}`,
].join(' ')

console.log(line)
console.log(`RESULT: ${ok ? 'VERIFIED_OK' : 'VERIFY_FAILED'}`)
for (const ref of mediaMissing) console.error('MEDIA_MISSING', ref)
for (const e of lifecycleErrors) console.error('LIFECYCLE_ERROR', e)

if (jsonOut) await writeFile(jsonOut, JSON.stringify(verification, null, 2) + '\n')
process.exitCode = ok ? 0 : 1