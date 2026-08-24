# 29 – Task 5.8: Badges & Certificates

## 1. Task status

**COMPLETED** (2026-08-16). Backend-authoritative achievements: the existing
4 stream-completion badges are awarded and stream certificates are issued
when a stream is genuinely completed, using the existing `badges`,
`student_badges` and `certificates` tables (0001 §17–§19, 0002 badge seed —
**no schema change**). A real `/student/achievements` page shows the badge
catalogue with awarded state and the student's certificates; each certificate
downloads a **hand-rolled minimal PDF** (zero new dependencies, D-081)
generated ON DEMAND — nothing is ever stored. Certificates carry a unique
public `certificate_code` verifiable at `GET /api/certificates/verify/:code`
(safe surface only, D-011/D-031), and revocation (service-role flag) makes
the PDF 410 and verification `valid:false`.

## 2. Scope

- **AchievementsService** (facade + completion hook): `awardForCompletion`
  is the single backend write path called by
  `GameSessionService.finishSession` after progression is recorded — it
  gates on the trusted `student_progress.stream_completed` read, then awards
  the badge AND issues the certificate, both idempotent and best-effort.
- **BadgeService**: read-only catalogue projection + idempotent
  `awardStreamCompletionBadge`. The badge slug is derived server-side from
  the stream slug (`STREAM_SLUG_TO_BADGE_SLUG`) — a caller can never choose
  which badge to grant.
- **CertificateService**: idempotent `issueStreamCertificate` (with
  `certificate_code`-collision retry), `getStudentCertificates` (revoked
  excluded), `getCertificatePdf` (ownership 404 / revoked 410), and public
  `verifyCertificate` (safe surface only). `certificates` rows are the source
  of truth; the PDF is generated on demand and never stored — there is no
  certificates Storage bucket.
- **Hand-rolled PDF generator** (`pdf-generator.js`): a single-page US-Letter
  PDF built from base-14 Helvetica bytes, ASCII width tables for centering,
  escaping + neutralisation of non-ASCII, and a correct cross-reference
  table. Validated by tests (xref offsets exact) and the live smoke
  (`%PDF-` header, `xref` present).
- **Certificate codes** (`certificate-code.js`): `SQ-XXXXXX-XXXXXX` via
  `crypto.randomInt`, an unambiguous alphabet (no `0/O`, `1/I/L`), matching
  the public-verification id design (D-011).
- **API** (Hono, `createAchievementsApi`): `GET /api/student/achievements`,
  `GET /api/student/certificates`, `GET /api/student/certificates/:id/pdf`
  (returns `application/pdf`), and public `GET /api/certificates/verify/:code`.
  Mounted in `createStackedApp` before the generic `/api/student/*` catch-all.
- **Frontend**: real `/student/achievements` page
  (`StudentAchievementsPage.jsx` + `student-achievements.css`) with badge
  cards, certificate rows with download, and a verify panel;
  `useAchievements`, `useCertificates`, `useDownloadCertificatePdf`,
  `useVerifyCertificate` TanStack hooks; "View your achievements" entry point
  on the mission page.
- **Repositories**: memory (dev/tests) + service-role Supabase (prod), both
  mirroring the 0001 columns and the UNIQUE constraints
  (`(student_id, badge_id)` and `(student_id, stream_id)` idempotency;
  `certificate_code` uniqueness for the collision retry).
- **Progression read**: new `getStreamProgress({ studentId, streamId })` on
  the progression repository contract + memory + Supabase implementations —
  the trusted eligibility signal for awarding.
- Tests (50 new), live smoke (84 checks), bundle probe, docs.

Out of scope (per plan): admin panel, Question Builder, question content,
further plugins, remaining polish.

## 3. Awarding rules & the trusted gate (D-011, architecture §11)

A badge/certificate is awarded **only** when `awardForCompletion` confirms
`student_progress.stream_completed === true` via `getStreamProgress` — the
same row `finishSession` writes through `ProgressionService.recordCompletion`
(D-076). The student can never claim completion: there is no client write
path to badges, certificates or progression; the service-role backend is the
authority (D-027). Both writes are idempotent:

- **Badges**: `student_badges` is UNIQUE `(student_id, badge_id)`; a repeat
  completion is a no-op.
- **Certificates**: `certificates` is UNIQUE `(student_id, stream_id)`; a
  repeat issue returns the existing row (`issued:false`).

The hook is **best-effort** like the leaderboard hook (D-077 style): a
failure is caught and logged (`console.warn`), never rolls the completed
session back and never 500s the finish. Awarding for an unknown stream or an
unknown badge is a no-op (`no-stream` / `no-badge`).

## 4. Badge catalogue

The 0002 seed defines exactly 4 stream-completion badges
(`stream_completion` criteria keyed by stream slug). The projection returned
to a student is `{ id, slug, name, description, icon, criteria, awarded,
awardedAt }` — the full active catalogue with per-student awarded state, so
the page always shows all four badges (earned and locked). No badge can be
forged: `STREAM_SLUG_TO_BADGE_SLUG` maps `science→science-completion`,
`technology→technology-completion`, etc., server-side.

## 5. Certificate design & verification (D-011/D-031)

`certificates` (0001 §19) carries `certificate_code`, `student_id`,
`stream_id`, `title`, `earned_at`, `document_path`, `generated_at`, `revoked`,
`revoked_at`. The row is the source of truth; `document_path`/`generated_at`
stay `NULL` forever (no stored PDF). Public verification by
`certificate_code` returns **only** `{ code, title, stream{name,slug},
studentName, earnedAt, revoked, revokedAt }` — never `student_id`, login
code, token/hash, score or answer data (D-027). Revocation flips the flag
(admin action via the service role); the student list drops the certificate
(`revokedCount` reflects it), the PDF route returns **410**, and verification
returns `valid:false`.

## 6. Hand-rolled PDF (D-081 — user decision)

The user chose a minimal, dependency-free PDF over pdfkit (asked + answered
during this task). `generateCertificatePdf` emits a single US-Letter page:
- base-14 **Helvetica** / **Helvetica-Bold** byte streams (no font embedding),
- ASCII **width tables** (per-style fixed advance widths) to center the
  recipient name, stream, code and date lines,
- `escapePdfString` backslash-escapes `\ ( )` and neutralises non-ASCII to
  `?` so the object stream stays valid for any name,
- a correct **xref table** with byte-exact object offsets (verified by tests
  and the live smoke reading `%PDF-` + `xref`),
- `formatAwardDate` renders the earned date as readable UTC text.

The PDF is served with `content-type: application/pdf`, an inline
`content-disposition` filename, and `cache-control: private, max-age=60`.

## 7. Certificate code generator

`makeCertificateCode` → `SQ-XXXXXX-XXXXXX` using `crypto.randomInt` over a
26-char alphabet that removes confusables (`0O1IL`). Codes are unique via the
0001 UNIQUE `certificate_code`; the service catches a collision
(repository-thrown duplicate-key error — mirrored by the memory store) and
retries with a fresh code, bounded by a safety cap.

## 8. API surface & error model

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/student/achievements` | Bearer | Badge catalogue + awarded state |
| `GET /api/student/certificates` | Bearer | Own certificates (revoked excluded) |
| `GET /api/student/certificates/:id/pdf` | Bearer | On-demand PDF (`application/pdf`) |
| `GET /api/certificates/verify/:code` | public | Safe verification surface |

Identity always comes from the token via `StudentService.getMe`; the student
id is never accepted from a query/body. Errors map through
`AchievementsError` → `400 ACHIEVEMENTS_INVALID_INPUT`,
`401 ACHIEVEMENTS_UNAUTHORIZED`, `404 ACHIEVEMENTS_NOT_FOUND`,
`410 ACHIEVEMENTS_REVOKED`, `500 ACHIEVEMENTS_PDF_FAILED/INTERNAL`.

## 9. Security & isolation

- **No client write path** to badges, certificates or progression.
- **Ownership**: `getCertificatePdf` rejects a certificate that does not
  belong to the token's student (`404`); verified by the API tests and the
  live smoke (student A fetching C's PDF → 404).
- **Safe verification surface**: no private fields in any payload (payload
  probe in tests + smoke).
- **Service-role key never in the browser** (bundle probe, §13).

## 10. Implementation notes

- `GameSessionService.finishSession` gained an optional `achievementsService`;
  the award hook runs after the leaderboard hook (same best-effort pattern).
- `createStackedApp` gained an `achievementsApp` param mounted at
  `/api/student/achievements/*`, `/api/student/certificates/*` and
  `/api/certificates/*` **before** the generic `/api/student/*` catch-all.
  Dev + production servers wire the repos/service/app; production returns
  `achievementsService` from `createProductionApi()` (used by the smoke).
- The deterministic PostgREST fake gained `badges`, `student_badges`,
  `certificates` tables + the 4-badge `BADGE_SEED`, so Supabase repo/service
  tests run against the real contracts.
- The memory certificate repo enforces `certificate_code` uniqueness (throws
  on a duplicate) so the service's collision-retry path is exercised without
  a live database.
- `package.json` test glob now includes `achievements`; new game-session hook
  tests live under the existing game-session testing directory.

## 11. Tests

50 new tests (`npm test` **1106/1106**, up from 1056):

- `achievements/testing/pdf-generator.test.js` (6) — valid single-page PDF,
  xref offsets byte-exact, escaping/neutralisation, Helvetica metrics,
  readable award date, embedded code + recipient.
- `badge-service.test.js` (6) — catalogue projection, server-side slug
  derivation, idempotent award, no-badge/no-stream no-ops, validation.
- `certificate-service.test.js` (9) — issue idempotency, code-collision
  retry, revoked exclusion, ownership 404, revoked 410, safe verify surface,
  unknown-code 404, unknown-stream no-op.
- `achievements-service.test.js` (5) — gate on `stream_completed`,
  delegates, direct issue/award exposure, invalid input.
- `achievements-repository.test.js` (8) — memory + Supabase repo contracts
  (award/issue once, idempotent no-ops, code uniqueness, mapping round-trip).
- `achievements-api.test.js` (7) — authenticated reads, PDF download
  (blob size), ownership isolation, revoked 410, public verify safe + revoked
  flag, error mapping.
- `frontend-achievements.test.js` (6) — SSR page renders badge cards /
  certificate rows / verify result and their states.
- `game-session/testing/achievements-hook.test.js` (3) — the real
  `finishSession` flow: fifth-level finish awards badge + certificate once
  via the hook, repeat finish is idempotent, uncompleted streams never award,
  and a throwing achievements service never breaks the finish.

Lint clean, build clean, schema validator PASS (24 schemas / 72 examples /
12 pair checks).

## 12. Live smoke (production, 84 checks)

Extended `scripts/smoke-production.mjs` against
`fmauqixvdpdgrghuapfs` (real Supabase, real DB), then restored to the exact
baseline (now including `student_badges` and `certificates` back to 0). New
checks (+15, 69→84): catalogue shows 4 badges uneawarded for a
non-completer; no certificates before completion; a fresh student is seeded
`stream_completed=true` via the service role and the hook
(`achievementsService.awardForCompletion`) awards the badge + issues the
certificate exactly as `finishSession` would; DB rows materialised
(`student_badges` badge_id 1, `certificates` with a valid `SQ-XXXXXX-XXXXXX`
code and `document_path`/`generated_at` NULL); the catalogue then shows the
awarded badge; the list returns the certificate; the **on-demand PDF is a
valid `application/pdf`** (`%PDF-` + `xref`); public verification returns
safe data with the recipient name; **student A cannot download C's
certificate (404 ownership)**; revoking via the service role removes it from
the list (`revokedCount 1`), makes the PDF **410**, and flips verification to
`valid:false`; unknown codes → 404; no private fields leak from any
achievements payload.

## 13. Bundle security probe

`grep` over `dist/assets` (real service-role key value, real secret names):

- **A. Credentials**: service-role key **0 files**; `SUPABASE_SERVICE_ROLE_KEY`
  **0 files**.
- **B. Certificate-generation secrets**: `generateCertificatePdf`,
  `makeCertificateCode`, `certificate_code`, `%PDF-` — all **0 files** (the
  PDF is server-generated only).
- **C. Answer/scoring data**: `correct_answer`/`correctAnswer` fixtures **0**
  (the single `correctAnswerExposed` match is the game-engine client-mode
  guard method name — a safety feature, not a leak); `hashSessionToken`,
  `student_answers`, `session_rounds` **0**.
- `loginCode` appears only in `StudentRegisterPage` — the registration
  success panel showing the freshly-created student's own login code (a
  deliberate feature, not a leak).

## 14. Warnings / errors

1. **Smoke killed by shell timeout** on the first run (no `.env`-file issue
   — the script needs `--env-file=.env`, which npm provides). The smoke is
   network-latency-bound (~3 s/check against Supabase), so it must run
   detached (e.g. `nohup`) or with a long tool timeout; the second run passed
   84/84.
2. **Smoke upsert column mismatch**: `student_progress` has no
   `best_score`/`total_attempts` columns and `current_level` is CHECKed to
   1–5; fixed the smoke to upsert only `current_level: 5,
   completed_levels: 5, stream_completed: true`.
3. **Smoke called `app.achievementsService`** but `createProductionApi()`
   returns the service as a sibling of `app`; fixed to destructure
   `achievementsService` explicitly.
4. **Test iteration**: the code-collision retry test initially failed because
   the memory certificate repo did not enforce `certificate_code` uniqueness
   (no error → no retry); added the duplicate-key guard. The xref test
   compared a 12-char slice to a 7-char expectation; fixed the slice length.
   The hook tests needed the mission store seeded with the 4 streams and the
   `register({ body })` shape (validation gate); both fixed.
5. **oxlint**: `PAGE_H` unused (removed), the control-char regex flagged by
   `no-control-regex` (rewrote `escapePdfString` char-by-char), and two
   unused `harness` variables in tests (removed). Lint clean.

## 15. Files created

- `src/features/achievements/contracts/contracts.js`
- `src/features/achievements/errors.js`
- `src/features/achievements/repositories/memory.js`, `supabase.js`, `index.js`
- `src/features/achievements/pdf/pdf-generator.js`
- `src/features/achievements/certificate-code.js`
- `src/features/achievements/service/badge-service.js`, `certificate-service.js`, `achievements-service.js`
- `src/features/achievements/api/server.js`
- `src/features/achievements/client/client.js`
- `src/features/achievements/queries/queries.js`
- `src/pages/StudentAchievementsPage.jsx`, `src/pages/student-achievements.css`
- `src/features/achievements/testing/helpers.js`, `pdf-generator.test.js`,
  `badge-service.test.js`, `certificate-service.test.js`,
  `achievements-service.test.js`, `achievements-repository.test.js`,
  `achievements-api.test.js`, `frontend-achievements.test.js`
- `src/features/game-session/testing/achievements-hook.test.js`
- `reports/29-task-5.8-badges-certificates.md` (this report)

## 16. Files modified

- `src/features/game-session/service/game-session-service.js` — optional
  `achievementsService` + best-effort finish hook.
- `src/features/game-session/api/dev-server.js` / `production-server.js` —
  achievements wiring + `createStackedApp` mount order; production returns
  `achievementsService`.
- `src/features/game-session/testing/fake-supabase-client.js` —
  `badges`/`student_badges`/`certificates` tables + `BADGE_SEED`.
- `src/features/progression/repositories/{contracts,memory,supabase}.js` —
  `getStreamProgress` read.
- `src/router.jsx` — `/student/achievements` lazy route.
- `src/pages/StudentMissionPage.jsx` — "View your achievements" entry point.
- `package.json` — test glob includes `achievements`.
- `scripts/smoke-production.mjs` — achievements flow + baseline/cleanup.
- `reports/04-todo.md`, `reports/README.md`, `reports/02-development-log.md`,
  `reports/03-decisions.md` (D-081), root `README.md`.

## 17. Live database state

Baseline + after-run (post-cleanup): all tables empty, including
`student_badges` and `certificates` restored to their exact baseline counts
(smoke §12). No smoke fixtures left behind.

## 18. Known limitations

- Certificate issuance is driven by the completion hook only; there is no
  admin-facing revoke UI yet (revocation works today via the service role,
  and the API + verification fully honour it).
- The PDF is a single US-Letter page with the base-14 fonts (no embedded
  branding artwork, no issuer signature image).
- Badges are awarded on stream completion only — no participation /
  XP-based badges yet (out of plan scope).
- No question-content work or admin panel in this task (per plan).

## 19. Next task

Task 5.9 **not started** (per plan). Backlog candidates: admin/progression
viewing, real content authoring, remaining polish.

## 20. Data flow (completion → award → view)

```
finishSession
  ├─ recordCompletion (progression authority, D-076)   student_progress.stream_completed
  ├─ leaderboard hook (best-effort, Task 5.7)
  └─ achievements hook (best-effort, Task 5.8)
       awardForCompletion
         ├─ getStreamProgress()  → stream_completed === true ? continue : no-op
         ├─ BadgeService.awardStreamCompletionBadge    → student_badges (idempotent)
         └─ CertificateService.issueStreamCertificate  → certificates (idempotent, code retry)
Student (Bearer token)   →  GET achievements / certificates / certificates/:id/pdf
Public                  →  GET certificates/verify/:code  (safe surface)
```

## 21. Frontend page

`/student/achievements` (`StudentAchievementsPage.jsx`): hero + 4 badge cards
(awarded vs locked state with `awardedAt`), the student's certificate rows
(title, stream, earned date, **Download PDF** that fetches the blob and saves
it), a verification form that calls the public verify endpoint and renders
the safe result (valid / revoked / not found), plus empty and error states
with retry. Session-expiry guard and the "View your achievements" link on the
mission page mirror the profile/leaderboard page conventions. Styling lives
in `student-achievements.css` (Tailwind v4 tokens + page-specific classes),
consistent with the existing pages.

## 22. Configuration & operational notes

- No new `.env` vars, no new packages (hand-rolled PDF; D-081).
- The service-role client already used by the production server reads/writes
  `badges`/`student_badges`/`certificates`; RLS policies from 0001 apply
  (admin/service-role access), the anon surface is read-only where allowed.
- Revocation today = flip `certificates.revoked` (+ `revoked_at`) via the
  service role; the API + verification reflect it immediately (410 / `valid:
  false`). A future admin UI can reuse this same flag (D-011).
- The PDF is deterministic and dependency-free; no certificates Storage
  bucket is created or referenced.

## 23. Verification evidence

- `npm test` **1106/1106** (2 consecutive runs), `npm run lint` clean,
  `npm run build` clean, `python3 schemas/validate.py` PASS (24/72/12/12).
- Live smoke **84/84** against the linked project; DB restored to the exact
  baseline (questions, students, schools, sessions, scores, answers,
  level/stream progress, leaderboard, student_badges, certificates all back
  to 0).
- Bundle probe: service-role key 0 files; PDF-generation secrets 0 files;
  answer fixtures 0; only the intended `loginCode` (register page) and the
  `correctAnswerExposed` client-guard name are present.

## 24. Revision history

- 2026-08-16 — created with Task 5.8 (D-081 hand-rolled PDF decision
  recorded in `03-decisions.md`).