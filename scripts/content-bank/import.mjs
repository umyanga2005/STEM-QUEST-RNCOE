/**
 * Content Bank — import batch 1 (Task 5.14).
 * Validates every authored record (same validator the service uses), stamps
 * the canonical content hash, then creates each new question as a DRAFT
 * through QuestionService.create — no direct table writes, no fake approvals.
 * Idempotent: records whose canonical content hash already exists in the bank
 * (meta.authoring.contentHash) are skipped.
 * Run: node --env-file=.env scripts/content-bank/import.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBatch, renderReport } from './content-validator.mjs'
import { createDb, createQuestionService, resolveAdmin, loadAllRecords, stampContentHash, AUTHOR_EMAIL, APPROVER_EMAIL, AUTHOR_SOURCE } from './lib.mjs'

const db = createDb()
const { service: questionService } = createQuestionService(db)
const author = await resolveAdmin(db, db, { email: AUTHOR_EMAIL, displayName: 'Question Bank Author', role: 'content_editor' })
const approver = await resolveAdmin(db, db, { email: APPROVER_EMAIL, displayName: 'Question Bank Approver', role: 'admin' })

const { records, sources } = await loadAllRecords()
const report = await validateBatch(records)
process.stdout.write(renderReport(report))
if (!report.ok) {
  console.error('\nIMPORT_ABORTED: content validation failed')
  process.exit(1)
}

// Existing canonical hashes already in the bank (any author source — the
// content hash is unique to the content, so this is robust even if the
// authorSource suffix scheme changes).
const { data: existingRows, error: existingErr } = await db
  .from('questions')
  .select('id, meta')
  .not('meta->authoring->>contentHash', 'is', null)
if (existingErr) throw new Error(`questions query failed: ${existingErr.message}`)
const existingHashes = new Set((existingRows ?? []).map((r) => r.meta?.authoring?.contentHash).filter(Boolean))

const created = []
const skipped = []
for (let i = 0; i < records.length; i += 1) {
  const record = stampContentHash(records[i])
  const hash = record.meta.authoring.contentHash
  if (existingHashes.has(hash)) {
    skipped.push({ line: i + 1, source: sources[i], hash })
    continue
  }
  try {
    const { question } = await questionService.create(record, { admin: author })
    created.push({ id: question.id, source: sources[i], hash, stream: question.stream, level: question.level })
    existingHashes.add(hash)
  } catch (err) {
    console.error(`IMPORT_FAILED line ${i + 1} [${sources[i]}]:`, err?.message)
    process.exit(1)
  }
}

const snapshotDir = join(process.cwd(), 'scripts/content-bank/snapshots')
mkdirSync(snapshotDir, { recursive: true })
const manifest = {
  batch: '1',
  authorSource: AUTHOR_SOURCE,
  importedAt: new Date().toISOString(),
  counts: { total: records.length, created: created.length, skipped: skipped.length },
  author: { id: author.id, role: author.role },
  approver: { id: approver.id, role: approver.role },
  created,
}
writeFileSync(join(snapshotDir, 'import-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

// Canonical NDJSON snapshot (pure importable envelopes, one per line).
const ndjson = records.map((r) => JSON.stringify(stampContentHash(r))).join('\n') + '\n'
writeFileSync(join(snapshotDir, 'batch-1.ndjson'), ndjson)

console.log(`IMPORT_OK total=${records.length} created=${created.length} skipped=${skipped.length}`)
for (const c of created) console.log('CREATED', c.id, c.source, c.hash.slice(0, 12))