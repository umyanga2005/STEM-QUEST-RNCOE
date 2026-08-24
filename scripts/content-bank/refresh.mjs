/**
 * Content Bank — refresh snapshot + validate (Task 5.14 authoring helper).
 * Regenerates snapshots/batch-1.ndjson from the authored content modules and
 * runs the full validator. Exit 0 = clean.
 * Run: node --env-file=.env scripts/content-bank/refresh.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateBatch, renderReport } from './content-validator.mjs'
import { loadAllRecords, stampContentHash } from './lib.mjs'

const { records, sources } = await loadAllRecords()
const report = await validateBatch(records)
process.stdout.write(renderReport(report))
const snapshotDir = join(process.cwd(), 'scripts/content-bank/snapshots')
mkdirSync(snapshotDir, { recursive: true })
writeFileSync(join(snapshotDir, 'batch-1.ndjson'), records.map((r) => JSON.stringify(stampContentHash(r))).join('\n') + '\n')
console.log(`REFRESHED total=${records.length} sources=${sources.length}`)
process.exitCode = report.ok ? 0 : 1