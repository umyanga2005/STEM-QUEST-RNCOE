# 35 – Task 5.13: Admin Question Review, Approval & Publish Workflow

## 1. Task status

**COMPLETED.** 2026-08-17. Task 5.13 adds a full admin review → approval →
publish lifecycle on top of the Task 5.10 Question Builder, so authored drafts
can move from visual authoring to live distribution without a single
"publish" button being able to bypass a human review. The lifecycle is
**server-authoritative**: every state transition is a dedicated, audited API
action behind `requireAdmin`, drafts must pass authoring-completeness gates
(explanation, feedback templates, taxonomy) before review, approved content
publishes only when the approval matches the current version, and versioned
editing is a **clone-on-edit** flow that never mutates a published question —
publishing a v2 archives v1. All transitions are recorded in the existing
`admin_actions` table (0001 §2), forming an immutable, newest-first audit
trail per question. 26 new tests (1302/1302 total); lint, build, schema
validation and bundle probes all pass; the live production smoke ran
**141/141 checks** and restored the DB **and** storage bucket to their exact
baseline (including every `admin_actions` row created during the run).

## 2. Scope

- **Lifecycle** — `draft → pending → approved → published → archived`, with
  `rejected` as a loop back into `pending`. Status values (`draft|published|
  archived`, DB CHECK constraint) are **unchanged**; the review state lives in
  `meta.review` (`state`, `submittedAt`, `submittedByAdminId`, `reviewedAt`,
  `reviewerAdminId`, `note`, `version`).
- **Review gates** (D-081 + 5.13) — a question cannot move into (or out of)
  review without a non-empty explanation, at least one feedback template and a
  complete topic/subtopic taxonomy, plus the full three-layer envelope
  validation and media integrity when media is wired.
- **Audit trail** — every lifecycle transition writes an immutable
  `admin_actions` row (existing 0001 table, no schema change) with the acting
  admin, action, target, details and timestamp; the trail is newest-first and
  deterministic (`id` descending tie-break).
- **Versioned editing** — a published question is cloned into a new draft v2
  via `meta.sourceQuestionId`/`meta.sourceVersion`; publishing v2 archives v1
  (`QUESTION_ARCHIVED` with `supersededByVersion`); v1 content is never
  overwritten (D-044 preserved).
- **API** — `GET /questions/review`, `GET /questions/:id/audit`,
  `POST /questions/:id/submit|approve|reject|publish|archive|versions`.
- **UI** — review queue (previews only) and a review detail surface
  (admin-only correct answer, review envelope, audit trail, Approve / Reject /
  Publish / Archive); the editor gains "Submit for review" and the list gains
  "New version" for published rows.
- Explicitly **out of scope**: any `questions.status` enum change, correct
  answers on student surfaces, question-bank content, AI authoring, bulk
  import, and Task 5.14.

## 3. Design decisions

- **No DB migration.** Status semantics are unchanged; `meta.review` reuses
  the existing `questions.meta jsonb` column (0004); `admin_actions` already
  exists (0001 §2). Only the JSON Schema (`schemas/common/meta.schema.json`)
  gained the review/authoring/source fields, validated by the existing engine.
- **No role split (D-085).** Any active admin may review, approve, reject,
  publish and archive. A reviewer-role separation is deferred; the audit trail
  is what keeps the process accountable.
- **State model** — `meta.review.state ∈ {pending, approved, rejected}`;
  editing a pending/approved draft clears the review state and forces
  `status: 'draft'` (server-authoritative — a client can never set status);
  an approved draft cannot be re-submitted without editing; rejecting requires
  a non-empty note (400 `QUESTION_REVIEW_NOTE_REQUIRED`); publishing requires
  an approved review **and** `review.version === row.version` (409
  `QUESTION_APPROVAL_STALE` when stale).
- **Stale-approval guard** — the review records the version it approved;
  publishing an edited draft after approval is refused until re-approval.
- **Clone-on-edit** — `POST /:id/versions` builds a draft v2 (full envelope
  re-validated) linked through `meta.sourceQuestionId`/`sourceVersion`;
  `publish` archives any published source row instead of overwriting it.

## 4. Service — `service/question-service.js`

New lifecycle methods on `QuestionService` (constructor gains optional
`adminActionRepository` and `mediaRepository`):

- `create(input, { admin })` / `update(id, input, { admin })` — stamp
  `meta.authoring.createdByAdminId`, record `QUESTION_CREATED` /
  `QUESTION_EDITED`; `update` forces `draft`, clears review, preserves
  `sourceQuestionId`/`sourceVersion` and server chain fields (D-044), and
  blocks published/archived rows.
- `submitForReview(id, { admin })` — draft-only, not already pending/approved;
  runs `#assertReleaseReady` (gates + full validation + media integrity); sets
  `review = { state:'pending', submittedAt, submittedByAdminId, version }`.
- `approve(id, { admin, note })` — pending only; sets `reviewedAt`,
  `reviewerAdminId`, optional note.
- `reject(id, { admin, note })` — pending only; non-empty `note` mandatory;
  records reason in the review and in the audit `details`.
- `publish(id, { admin })` — draft + approved + version match; publishes,
  then archives any published source (`supersededByVersion`).
- `archive(id, { admin })` — published only.
- `createVersion(id, { admin })` — published only; clones to draft v2
  (`QUESTION_VERSION_CREATED` with `sourceId`/`sourceVersion`).
- `reviewQueue({ stream, level, activityType })` — pending drafts, newest
  first, **previews only** (prompt/type/level/version/status/difficulty/grades
  + the review envelope; never `correctAnswer`/full `meta`).
- `audit(id)` — newest-first actions via the repository.
- `#draftFromRow(row)` — rebuilds a clean, schema-valid authoring envelope
  from a stored row (`formatVersion: FORMAT_VERSION`, null-safe optional
  fields) so re-validation across the lifecycle never rejects its own data.

## 5. Errors & contracts

- `errors.js` — `QUESTION_INVALID_STATE` (409), `QUESTION_REVIEW_NOTE_REQUIRED`
  (400), `QUESTION_APPROVAL_STALE` (409) + `invalidState`/`reviewNoteRequired`/
  `approvalStale` factories, all `VALIDATION`-category, registered in
  `statusByCode`.
- `contracts.js` — `QUESTION_REVIEW_STATES = ['pending','approved','rejected']`
  and `QUESTION_LIFECYCLE_ACTIONS` (created/edited/submitted/approved/rejected/
  published/archived/version-created), both exported.
- `meta.schema.json` — `review` gains `submittedAt`, `submittedByAdminId`,
  `version`; `authoring` gains `createdByAdminId`; top-level gains
  `sourceQuestionId` + `sourceVersion` (all `additionalProperties: false`
  preserved).

## 6. Repositories

- `memory.js` — `store.adminActions = []` + `MemoryAdminActionRepository`
  (`insert`, `listByTarget` ordered `id` descending for a deterministic
  newest-first trail); wired as `adminActionRepository`.
- `supabase.js` — `SupabaseAdminActionRepository`: `insert` into
  `admin_actions` with an explicit column select, `listByTarget` with
  `order('id', { ascending: false })`; wired into
  `createSupabaseQuestionRepositories`.
- `testing/fake-supabase-client.js` — `admin_actions` added to `BASE_TABLES`.
- `production-server.js` — `QuestionService` now receives
  `adminActionRepository` + `mediaRepository`.

## 7. API wiring

All behind `requireAdmin`, registered so `GET /review` precedes `GET /:id`:

- `GET /api/admin/questions/review` — pending queue (previews only).
- `GET /api/admin/questions/:id/audit` — newest-first audit trail.
- `POST /api/admin/questions/:id/submit` — enter review.
- `POST /api/admin/questions/:id/approve` — approve (note optional).
- `POST /api/admin/questions/:id/reject` — reject (note required).
- `POST /api/admin/questions/:id/publish` — publish (approved + version match).
- `POST /api/admin/questions/:id/archive` — archive (published only).
- `POST /api/admin/questions/:id/versions` — clone to draft v2 (201).

`POST /` and `PUT /:id` now pass `c.get('admin')` so create/edit audit with
the acting admin. Status codes: 400 `VALIDATION`/`REVIEW_NOTE_REQUIRED`, 404
`NOT_FOUND`, 409 `STATUS_BLOCKED`/`INVALID_STATE`/`APPROVAL_STALE`.

## 8. Client + queries

- `client.js` — `reviewQueue`, `audit`, `submit`, `approve`, `reject`,
  `publish`, `archive`, `createVersion` (Bearer-token, JSON, error mapping).
- `queries.js` — `useReviewQueue`, `useQuestionAudit`, `useSubmitForReview`,
  `useApproveQuestion`, `useRejectQuestion`, `usePublishQuestion`,
  `useArchiveQuestion`, `useCreateQuestionVersion`; mutations invalidate the
  shared `['admin','questions']` cache.

## 9. UI

- `ReviewQueue.jsx` — pending drafts, newest first; per row: prompt, type,
  grade, difficulty, version + a "Review" link into the detail surface. Never
  renders `correctAnswer` or `meta`.
- `ReviewDetail.jsx` — admin-only surface: prompt, status badge (Pending /
  Approved / Rejected / Not in review), submitted-by + timestamp, explanation,
  **correct answer (admin-only)**, objective + feedback templates, the review
  note box, contextual actions (Approve/Reject when pending, Publish when
  approved, Archive when published), the audit trail, and editor/queue links.
- Pages + routing — `AdminReviewQueuePage`/`AdminReviewDetailPage`, routes
  `questions/review` + `questions/:id/review`, `AdminShell` nav "Review" item.
- `QuestionEditor.jsx` — "Submit for review" when the draft is release-ready
  and not already pending/approved; `QuestionList.jsx` — "New version" for
  published rows.
- `src/pages/admin.css` — `aq-status--pending/approved/rejected`, `aq-btn--
  submit`, `aq-list__version`, `aq-review*` styles.

## 10. Security boundary

- No lifecycle action is reachable without an active admin token; the browser
  never learns the service role and never sets `status` (server forces
  `draft` on edit, and only the audited publish/archive actions change it).
- The review queue and detail never leak answers to student surfaces; the
  queue omits `correctAnswer` and full `meta` even from admin payloads.
- Bundle probes confirm no server-only lifecycle identifiers
  (`QUESTION_APPROVAL_STALE`, `QUESTION_REVIEW_NOTE_REQUIRED`,
  `QUESTION_INVALID_STATE`, `admin_actions`) ship to the browser, and the
  `SECURITY_CORRECT_ANSWER_EXPOSED` render guard remains active.

## 11. Tests — `question-lifecycle.test.js` (21 new)

- **Service**: create stamps authoring + `QUESTION_CREATED`; create without an
  admin writes no audit; client-forged review state is stripped; edit clears
  review while preserving chain fields; archived edit/remove → 409
  `STATUS_BLOCKED`; submit gates (explanation/feedback/taxonomy → field
  errors); submit limited to drafts and never overwrites a pending review;
  full submit→approve→publish→archive audited end to end (newest-first);
  reject requires a note and re-submit creates a fresh pending; publish guards
  (approved-only + stale-approval 409); archive is published-only;
  `createVersion` clones v1 → draft v2 and publishing v2 archives v1;
  `createVersion` starts from a published question only.
- **Student distribution regression**: the game memory and Supabase
  repositories distribute only `published` rows (gate already present — this
  locks it in).
- **API**: review routes behind admin auth (401); full lifecycle
  create→submit→queue→approve→publish→archive; reject without a note → 400
  `REVIEW_NOTE_REQUIRED`; versioned editing (clone → publish v2 → v1 archived);
  lifecycle payloads never leak secrets.
- **Production stack**: the full workflow persists `admin_actions` rows end
  to end with the acting admin id.

## 12. Client/SSR tests (5 new)

- Client lifecycle methods hit the exact routes with the Bearer token.
- `ReviewQueue` SSR renders previews (no correctAnswer/meta/review meta) and
  the empty state.
- `ReviewDetail` SSR renders the admin-only answer, review envelope and audit
  trail for a pending question, and Archive-without-Approve/Reject for a
  published question.

## 13. Live smoke — 141/141

The production smoke gained the review phase (after the builder payload check)
plus `admin_actions` in the baseline/cleanup/restore checks:

- create a release-ready draft → submit (pending, `submittedByAdminId`,
  `version 1`); the review queue lists it as a preview only (no
  `correctAnswer`/`meta`); reject without a note → 400
  `REVIEW_NOTE_REQUIRED`; reject with a note records the reason; re-submit
  creates a fresh pending; approve flips to approved and the draft leaves the
  queue; publish succeeds; re-publishing → 409 `INVALID_STATE`; clone to draft
  v2 (`sourceQuestionId`/`sourceVersion`); archiving a draft → 409; v2
  submit→approve→publish archives v1 (content untouched); the audit trail is
  newest-first (7 actions for v1) and every `admin_actions` row persists with
  the acting admin; no secret keys leak from any review payload.
- Baseline/cleanup extended: `admin_actions` is counted, every smoke question
  id (including ones deleted mid-run) is tracked, and its audit rows are swept
  so the DB returns to its exact baseline.

Debug notes from the run: the review queue intentionally exposes
`submittedByAdminId` inside its `review` envelope (part of the preview, not a
secret), so the "previews only" smoke assertion checks for the absence of
`correctAnswer`/full `meta` rather than that field; and `admin_actions` rows
for drafts deleted mid-run must be swept from the tracked id set, not a
live `questions` query, because those rows no longer exist.

## 14. Build / lint / schema results

```
npm test                   → 1302/1302 pass (26 new: 21 lifecycle + 5 client/SSR)
npm run lint               → clean
npm run build              → passes (admin editor chunk 240.07 kB / gzip 63.61 kB)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
```

## 15. Bundle security probe

```
grep -l "service_role\|SUPABASE_SERVICE_ROLE_KEY" dist/assets/*.js                    → 0 files
grep -l "eyJ[a-zA-Z0-9_-]{20,}\.eyJ" dist/assets/*.js                                 → 0 files
grep -o "correct-answer\.schema\.json" dist/assets/*.js                               → 0 files
grep -l "public\.admins" dist/assets/*.js                                             → 0 files
grep -l "QUESTION_APPROVAL_STALE\|QUESTION_REVIEW_NOTE_REQUIRED\|QUESTION_INVALID_STATE\|admin_actions" dist/assets/*.js → 0 files
grep -l "SECURITY_CORRECT_ANSWER_EXPOSED" dist/assets/*.js                            → 1 file (guard active)
```

## 16. Supabase impact

None. No schema change, no migration, no RLS change, no new table or column.
`admin_actions` (0001 §2) is now actually written by the lifecycle; the smoke
verifies those writes and cleans them up to the exact baseline.

## 17. Files created

- `src/features/admin/questions/testing/question-lifecycle.test.js`
- `src/features/admin-questions/components/ReviewQueue.jsx`
- `src/features/admin-questions/components/ReviewDetail.jsx`
- `src/pages/AdminReviewQueuePage.jsx`
- `src/pages/AdminReviewDetailPage.jsx`

## 18. Files modified

- `src/features/admin/questions/errors.js` — 3 lifecycle codes + factories.
- `src/features/admin/questions/contracts.js` — review states + lifecycle actions.
- `src/features/admin/questions/service/question-service.js` — lifecycle methods + `#draftFromRow`/`#assertReleaseReady`/gates.
- `src/features/admin/questions/api/server.js` — review/audit routes + `statusByCode` + admin passing.
- `src/features/admin/questions/repositories/contracts.js` — admin-action repository contract.
- `src/features/admin/questions/repositories/memory.js` — admin-action store/repo (id-desc order).
- `src/features/admin/questions/repositories/supabase.js` — Supabase admin-action repo.
- `src/features/game-session/api/production-server.js` — QuestionService wiring.
- `src/features/game-session/testing/fake-supabase-client.js` — `admin_actions` BASE_TABLE.
- `schemas/common/meta.schema.json` — review/authoring/source fields.
- `src/features/admin-questions/client/client.js` — 8 lifecycle methods.
- `src/features/admin-questions/queries/queries.js` — 8 hooks + invalidate helper.
- `src/features/admin-questions/components/QuestionEditor.jsx` — Submit for review.
- `src/features/admin-questions/components/QuestionList.jsx` — New version.
- `src/router.jsx`, `src/pages/AdminShell.jsx`, `src/pages/admin.css` — routes/nav/styles.
- `src/features/admin-questions/testing/frontend-admin-questions.test.js` — 5 new tests.
- `scripts/smoke-production.mjs` — review phase + `admin_actions` baseline/cleanup.

## 19. Known limitations

- No reviewer-role separation yet (D-085): any active admin can perform the
  whole lifecycle. Accountability comes from the immutable audit trail.
- The review queue is preview-only by design; the full admin surface lives on
  the review detail route, so a large queue means one row per review.
- `meta.review` keeps the review envelope (including `approved`) on published
  rows; student surfaces never receive `meta`, so this is inert for them.
- Archived questions are read-only forever (D-044): no unarchive action yet.

## 20. Next recommended task

Task 5.14 — the question-bank content itself (the seeded/curated pool of
release-ready, review-approved questions that the workflow now exists to
produce and publish). Not started (per the stop rule after 5.13).

## Verification evidence

```
npm test                   → 1302/1302 pass (26 new: 21 lifecycle + 5 client/SSR)
npm run lint               → clean
npm run build              → passes (admin editor chunk 240.07 kB / gzip 63.61 kB)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
bundle probe               → 0 files (credentials, JWT secrets, answer $ids,
                             admin ids, server-only lifecycle identifiers);
                             SECURITY_CORRECT_ANSWER_EXPOSED guard active
npm run smoke:production   → 141/141 PASS; DB + storage restored to exact baseline
                             incl. every admin_actions row written during the run
```

## Revision history

- 2026-08-17 — Initial report. Task 5.13 complete; 5.12 and 5.11A/5.11B
  untouched; Task 5.14 not started.
