/**
 * Content Bank — upload generated media to the private `question-media`
 * bucket (Task 5.14). Uploads every PNG from generated-media/ to the storage
 * path that matches its question-media ref (upsert). Then verifies each ref
 * resolves to a signed URL (what QuestionService.#assertMediaIntegrity checks
 * at release time).
 * Run: node --env-file=.env scripts/content-bank/upload-media.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createDb } from './lib.mjs'

const db = createDb()
const BUCKET = 'question-media'
const ROOT = join(process.cwd(), 'scripts/content-bank/generated-media')

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (entry.endsWith('.png')) files.push(full)
  }
}
walk(ROOT)

const uploaded = []
const stray = []
for (const file of files) {
  const ref = `question-media/${file.slice(ROOT.length + 1)}`
  const buffer = readFileSync(file)
  if (buffer.length > 1024 * 1024) throw new Error(`image too large: ${ref} (${buffer.length} bytes > 1MB)`)
  // Storage paths include the `question-media/` bucket prefix (matching how
  // QuestionMediaService builds refs and how #assertMediaIntegrity resolves
  // them via signedUrl(ref) with the full ref).
  const { error } = await db.storage.from(BUCKET).upload(ref, buffer, {
    contentType: 'image/png',
    upsert: true,
  })
  if (error) throw new Error(`upload failed for ${ref}: ${error.message}`)
  uploaded.push(ref)
  console.log('UPLOADED', ref, `${buffer.length} bytes`)
}

// Remove any earlier no-prefix uploads (from the pre-fix convention) so the
// bucket stays clean and matches the refs the bank references.
for (const ref of uploaded) {
  const strayPath = ref.slice('question-media/'.length)
  const { data: exists } = await db.storage.from(BUCKET).list(strayPath.slice(0, strayPath.lastIndexOf('/')))
  if (Array.isArray(exists) && exists.some((o) => o.name === strayPath.slice(strayPath.lastIndexOf('/') + 1))) {
    await db.storage.from(BUCKET).remove([strayPath])
    stray.push(ref)
  }
}
if (stray.length > 0) console.log('REMOVED_STRAY', stray.join(', '))

const verified = []
for (const ref of uploaded) {
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(ref, 60)
  if (error || !data?.signedUrl) throw new Error(`signed URL check failed for ${ref}`)
  verified.push(ref)
}

console.log(`MEDIA_UPLOAD_OK count=${verified.length}`)
for (const ref of verified) console.log('VERIFIED', ref)