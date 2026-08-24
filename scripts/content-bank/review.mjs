/**
 * Content Bank — review + publish batch 1 (Task 5.14).
 * Moves every batch-1 draft through the sanctioned Task 5.13 workflow using
 * QuestionService only: submit (author) -> approve (approver) -> publish
 * (approver). Every transition writes a real admin_actions audit row. Fully
 * idempotent: a question resumes from wherever its current review state is.
 * Run: node --env-file=.env scripts/content-bank/review.mjs
 */
import { createDb, createQuestionService, resolveAdmin, fetchBankRows, AUTHOR_EMAIL, APPROVER_EMAIL, AUTHOR_SOURCE } from './lib.mjs'

const db = createDb()
const { service: questionService, repos } = createQuestionService(db)
const author = await resolveAdmin(db, db, { email: AUTHOR_EMAIL, displayName: 'Question Bank Author', role: 'content_editor' })
const approver = await resolveAdmin(db, db, { email: APPROVER_EMAIL, displayName: 'Question Bank Approver', role: 'admin' })

const rows = (await fetchBankRows(db)).filter((r) => (r.meta?.authoring?.authorSource ?? '').startsWith(AUTHOR_SOURCE))
console.log(`REVIEW_START drafts_found=${rows.length}`)

const transitions = []
const failures = []
for (const row of rows) {
  const id = row.id
  const label = `${row.streams?.slug ?? '?'} L${row.levels?.number ?? '?'} #${id}`
  let current = row
  const steps = []
  try {
    while (current.status !== 'published') {
      if (current.status !== 'draft') {
        steps.push(`stuck:${current.status}`)
        break
      }
      const state = current.meta?.review?.state ?? null
      if (!state) {
        await questionService.submitForReview(id, { admin: author })
        steps.push('submitted')
      } else if (state === 'pending') {
        await questionService.approve(id, { admin: approver, note: 'Batch 1 content-bank question approved' })
        steps.push('approved')
      } else if (state === 'approved') {
        await questionService.publish(id, { admin: approver })
        steps.push('published')
      } else {
        steps.push(`stuck:${state}`)
        break
      }
      current = await repos.questionRepository.findById(id)
    }
    if (current.status === 'published') {
      transitions.push({ id, label, steps, status: 'published' })
      console.log('PUBLISHED', label, steps.join(' -> '))
    } else {
      failures.push({ id, label, steps, status: current.status })
      console.error('REVIEW_STUCK', label, steps.join(' -> '), `status=${current.status}`)
    }
  } catch (err) {
    failures.push({ id, label, error: err?.message })
    console.error('REVIEW_FAILED', label, err?.message)
  }
}

console.log(`REVIEW_OK published=${transitions.length} failures=${failures.length}`)
if (failures.length > 0) process.exit(1)