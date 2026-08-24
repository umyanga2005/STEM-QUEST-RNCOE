/**
 * Content Bank — persistent admin identities (Task 5.14).
 * Creates (or reuses) the two admins that run the batch-1 pipeline:
 *   - author: role `content_editor`, creates drafts + submits for review
 *   - approver: role `admin`, approves + publishes
 * Run: node --env-file=.env scripts/content-bank/setup-admin.mjs
 */
import { createDb, resolveAdmin, AUTHOR_EMAIL, APPROVER_EMAIL } from './lib.mjs'

const db = createDb()
const author = await resolveAdmin(db, db, { email: AUTHOR_EMAIL, displayName: 'Question Bank Author', role: 'content_editor' })
const approver = await resolveAdmin(db, db, { email: APPROVER_EMAIL, displayName: 'Question Bank Approver', role: 'admin' })

const out = {
  author: { id: author.id, email: author.email, displayName: author.displayName, role: author.role },
  approver: { id: approver.id, email: approver.email, displayName: approver.displayName, role: approver.role },
}
if (author.password) out.author.newPassword = author.password
if (approver.password) out.approver.newPassword = approver.password

console.log('ADMIN_SETUP_OK')
console.log(JSON.stringify(out, null, 2))
if (author.password || approver.password) {
  console.log('NOTE: "newPassword" values are generated once and are not stored anywhere. Save them if you need to sign in.')
}