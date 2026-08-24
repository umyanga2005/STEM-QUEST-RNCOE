# 31 – Task 5.10: Admin Question Builder (Foundation)

## 1. Task status

**COMPLETED — code/UI/tests done; final live builder smoke awaits the
`questions.meta` migration (documented below, user-approved, not yet applied).**

2026-08-17. The Admin Question Builder foundation now supports the full
catalogue surface: `GET /api/admin/questions`, `/catalogue`, `/` + `POST`,
`PUT /:id`, `DELETE /:id` behind `requireAdmin` (D-082), backed by a
server-authoritative `QuestionService` with three-layer validation against the
Task 3.2 JSON Schema contracts, an authoring workflow with server-managed
`version` and write-protected published rows (D-044), server-only
`correct_answer` handling (D-051/D-052/D-073 — never leaves the editor
surface), and a browser feature (`src/features/admin-questions/`) with a real
list, a new/edit editor, and a per-type live preview rendered through the
client activity engine.

The one deliberate exception to "no schema change" is the `questions.meta`
JSONB column. It is **required** by this builder (authoring metadata has no
column in the 0001 schema — see §13). Migration `0004_add_questions_meta.sql`
is written, validated, idempotent, RLS-neutral and **approved** (D-043
pre-authorized it at builder build time). The user chose to apply it via the
Supabase SQL editor; it is **pending**. Until it is applied, the live smoke's
builder section stays blocked on `column questions.meta does not exist`
(the offline/production-stack verification in §22 proves the code is correct).

## 2. Scope

- **Server feature** `src/features/admin/questions/`: `QuestionService`
  (catalogue, authoring lifecycle, validation, read surface) +
  `QuestionApiClient`/Hono app mounted under `requireAdmin`, memory and
  service-role Supabase repositories.
- **Browser feature** `src/features/admin-questions/`: TanStack Query hooks,
  `QuestionList`, `QuestionEditor` (new/edit), `QuestionPreview` (10 activity
  kinds), `client.js` API wrapper, template registry (`templates.js`).
- **Routes**: `/admin/questions`, `/admin/questions/new`,
  `/admin/questions/:id/edit`.
- **Engine**: `createDefaultClientActivityEngine()` — the client engine now
  registers all 10 plugins (payload-only), matching the server engine's
  plugin registry, so the preview and the draft validator use the *real*
  activity semantics.
- **Validation**: three layers (envelope + payload + correct-answer + meta
  JSON Schema; plugin `validatePayload` semantic rules; cross-document plugin
  rules) on both the server and in the browser (advisory UX checks; server
  stays authoritative).
- **Smoke**: production smoke extended to 106 checks (91 from 5.9 + meta
  column probe + 14 builder checks).
- **DB change**: migration `0004` (adds `questions.meta jsonb`), approved.

Out of scope (per plan): the 2,000-question catalogue, AI authoring, bulk
import, per-type visual authoring forms, media upload integration, review
workflow, published-question editing.

## 3. Architecture

```
/student API ──► createStackedApp ──► adminApp (createQuestionApiClient)
                                        │  requireAdmin (D-082, Bearer)
                                        ▼
                                  QuestionApiClient (Hono)
                                        │
                                        ▼
                                  QuestionService
                     (validate → enforce lifecycle → delegate)
                       │                    │
                validateDraft (3 layers)    ▼
                     │            QuestionRepository (memory | supabase)
                     ▼                        │
       schemas/ (JSON Schema)          questions + joins
```

- `createStackedApp({ adminApp })` mounts the admin app **before**
  `/api/student/*` (from Task 5.9); the production server builds the
  service-role repos + service + admin app; the demo server keeps
  `adminApp = null`.
- Everything crosses the admin boundary with the **access token**
  (`requireAdmin`), never with the anon key.
- `QuestionService` is the single write/read authority; repositories stay
  dumb. `row-mapper.js` maps between DB rows and DTOs in both directions
  (incl. `meta`); the supabase repository forces `QUESTION_SELECT` (joins
  `streams`, `levels`, `activity_types` via their slug/domain columns).

## 4. API surface

| Method | Path (mounted under `/api/admin`) | Behavior |
| --- | --- | --- |
| GET | `/questions/catalogue` | 4 streams × 5 level bands, each with the available `activityTypes` (from the activity_types domain) |
| GET | `/questions` | preview list — student-visible fields only; `correctAnswer`/`meta` stripped |
| GET | `/questions/:id` | full admin surface for editing (incl. `correctAnswer`, `meta`) |
| POST | `/questions` | validate 3 layers → insert **draft v1** (never published at create); 201 |
| PUT | `/questions/:id` | update in place; **version preserved**; draft/archived writable, published 409 (D-044) |
| DELETE | `/questions/:id` | draft only; published/archived 409 |
| — | unknown id | 404 `QUESTION_NOT_FOUND` |

Errors are machine-readable: `{ error: { code, message, fields? } }`.
Draft validation failure → `QUESTION_VALIDATION_FAILED` with per-field errors.

## 5. Validation — three layers

1. **Schema layer** (AJV, server): envelope (`question.schema.json`, incl.
   the `envelope-version` + `grade-min/max` 6..11 bounds and the
   `^[a-z][a-z0-9_]{0,31}$` identifier rule), `payload.schema.json`,
   `correct-answer.schema.json`, `meta.schema.json`
   (`additionalProperties:false`; no `hints` key — hints live at the
   envelope top level).
2. **Plugin semantic rules**: the resolved activity plugin's
   `validatePayload(payload)` (e.g. drag-drop hotspots within the scene,
   pattern sequence reachability, memory deck-size consistency, etc.).
3. **Cross-document plugin rules**: `validateDraft` additionally proves the
   correct-answer document against the payload via the plugin contract
   (e.g. pattern `acceptableIds` exist in the payload and are schema-key
   aliased, memory `groups` cover the deck's cards, ordering has no
   duplicates, fill-complete blanks resolve to accepted values, scenario
   entry/next references are valid).

The **browser** runs layers 1+2 as advisory UX checks through the same
schemas (bundled) and `createDefaultClientActivityEngine`; the server always
re-validates authoritatively (client checks never gate persistence).

## 6. Envelope → schema mapping

`validate-draft.js` derives `activitySchemaVersion` (server-managed) and maps
`kind` → `{ activitySchemaKey, activityType, payloadSchemaKey,
correctAnswerSchemaKey }` via the engine's schema registry. A `meta`-only
create/update is permitted (metadata can be written independently of content).
Stream/level are validated against the seeded domains (4 streams, 5 level
bands).

## 7. Service — create/update/delete semantics

- **Create** (`createDraft`): validates; normalizes; forces
  `status:'draft'`, `version:1`, sets `activitySchemaVersion` + provenance
  (`tags` gain nothing unless supplied); inserts; returns the created DTO.
- **Update** (`updateDraft`): validates the full draft; **preserves the
  `version` number** (snapshot semantics — see §9); rejects `published`
  targets with 409 `QUESTION_READONLY_PUBLISHED`; archived targets 409.
- **Remove** (`removeDraft`): draft only; published/archived 409
  `QUESTION_READONLY_PUBLISHED`.
- **List / catalogue**: preview rows only — `correctAnswer` and `meta` are
  never projected into list or catalogue responses (D-052).

## 8. Draft lifecycle

```
new → [client validate] → POST → draft v1 ──update──► draft (version kept)
                                   │  DELETE (draft only)
                                   └─► archived (read-only, version kept)
   published rows (seeded catalogue) → GET full surface (edit read-only),
        PUT/DELETE → 409 QUESTION_READONLY_PUBLISHED (D-044)
```

Publishing is deliberately **not** implemented in this foundation (see §26);
the write-protection rule is enforced regardless so future publishing can't
be bypassed.

## 9. Versioning

`version` is **server-managed** and `number`-typed. Create fixes `version:1`;
update keeps the same version (an in-place save, not a new snapshot).
Published rows are immutable once write-protected; the smoke proves a PUT to a
seeded published question is rejected and the row is byte-identical after.

## 10. `correct_answer` — server-only (D-051/D-052/D-073)

- `correctAnswer` exists **only** on the admin editor surface
  (`GET /questions/:id`) and in the DB (`questions.correct_answer`).
- The engine's `createRenderContext` **throws
  `SECURITY_CORRECT_ANSWER_EXPOSED`** if a question object that carries
  `correctAnswer`/`correct_answer`/`answerKey` is passed to `render` — the
  renderer can never leak it. `QuestionPreview` therefore builds a
  **student-visible snapshot** (prompt / instructions / payload only) before
  rendering (§19), and the bundle probe confirms no correct-answer schema
  `$id`s ship to the client.
- The client engine registers **payload-only** schemas; correct-answer
  schemas are never registered client-side.

## 11. Meta / authoring metadata

`questions.meta` (new column, §13) carries D-043's authoring metadata:
objective/outcome targets, per-wrong-answer feedback templates, presentational
media refs (image/audio/alt), authoring provenance, and review bookkeeping —
validated against `schemas/common/meta.schema.json`
(`additionalProperties:false`, no `hints`). Topic/subtopic authoring inputs
fold into `tags[]` as `topic:<slug>` / `subtopic:<slug>`. The game engine
never reads `meta`; it is never exposed via any student-facing API.

## 12. Templates

`templates.js` defines a **schema-valid starter payload for each of the 10
activity types** (drag-drop, matching, ordering, sorting, fill-complete,
image-interaction, pattern, memory, scenario-challenge, number-logic). Every
template passes the full three-layer validation (envelope + payload + answer)
and uses valid identifiers per `^[a-z][a-z0-9_]{0,31}$` (e.g. `item_1`,
`zone_1` — no hyphens). Creating a question seeds the type's template with a
placeholder `prompt` and `explanation` so an author can start from a valid
draft immediately.

## 13. DB change — `questions.meta` (migration 0004)

**Required — STOP/DOCUMENT resolution.** The 0001 schema has no column for
authoring metadata, and neither envelope (2001) nor payload/correct-answer
2003-era columns can host it without violating D-044/D-052 boundaries (the
payload must stay exactly what the engine evaluates; `correct_answer` is
frozen by the answers write-path; there is no existing JSONB column on
`questions` — payload/correct_answer/hints are constrained columns, not
arbitrary JSONB). `meta` is the single sanctioned JSONB sink (D-026 already
sanctions JSONB for authoring data; D-043 explicitly pre-authorized this
migration at builder build time).

```sql
alter table public.questions add column if not exists meta jsonb;
comment on column public.questions.meta is 'Admin authoring metadata (D-043 OD-2): objective, feedback templates, presentational media refs, authoring provenance, review bookkeeping. Validated against schemas/common/meta.schema.json. Never read by the game engine; never exposed via questions_public.';
```

- **Why existing schema can't support the builder**: enumerated above — no
  authoring-metadata column; constrained content columns; D-044 snapshot
  safety on published rows; correct_answer must remain server-only.
- **RLS**: unchanged — the column inherits the existing `questions` policies;
  the admin server writes via service-role, students never select it.
- **Free Tier**: negligible (one nullable JSONB column; JSONB is already in
  use; no new tables/indexes).

**Status: APPROVED** (user chose to apply it in the Supabase SQL editor;
migration file is idempotent and pre-validated). The live builder smoke
cannot create/update rows until it is applied.

## 14. Client engine registration

`createDefaultClientActivityEngine()` (added to
`src/features/activity-engine/index.js`) registers **all 10 plugins** in the
same order/registry as `createDefaultServerActivityEngine()`, but with
payload-only schema keys and without correct-answer registration. This makes
the client preview + draft UX validation semantically identical to the
server's for payloads, and is what fixed the original SSR/preview failures
(the client engine previously registered no plugins).

## 15. Browser client + TanStack Query hooks

`client.js` wraps the admin API with Bearer-token auth and typed
`QuestionApiError` (code/message/fields). `queries.js` exposes
`useQuestionCatalogue`, `useQuestionList`, `useQuestion(id)`,
`useCreateQuestion`, `useUpdateQuestion`, `useDeleteQuestion` with
`['admin','questions',…]` invalidation (catalogue refresh on writes).
`useDeleteQuestion` gated on draft-only rows in the UI.

## 16. Routes & pages

- `/admin/questions` → `AdminQuestionsPage` (list + "New question" CTA).
- `/admin/questions/new` → `AdminQuestionEditorPage` (create; editor reads the
  absence of an `:id`).
- `/admin/questions/:id/edit` → `AdminQuestionEditorPage` (edit).

All live inside the protected admin shell (`AdminShell` nav item "Questions",
Task 5.9).

## 17. QuestionEditor

Loads the catalogue (for stream/level/type pickers) or an existing full
draft; **lazy-initializes** the draft from the selected template when creating
new (fixing SSR — effects don't run under `renderToStaticMarkup`). UI:
stream/level/type selects, prompt/explanation fields, tags, JSON editors for
payload and a **collapsed correct-answer block**, client three-layer
validation with per-field errors, live `QuestionPreview`, and a save path
that surfaces server validation errors (`fields[]`) inline. Saving always goes
through the server (authoritative).

## 18. QuestionList

Preview table of the catalogue: prompt, type, grade band, difficulty, status
pill, edit link, and **delete for drafts only** (published/archived rows have
no delete button). Renders only student-visible fields — `correctAnswer`/`meta`
never appear (D-052).

## 19. QuestionPreview

Builds a **student-visible snapshot** (prompt / instructions / payload) and
renders it through `engine.render` (client engine, §14) as a playable
preview, with per-`kind` descriptors covering all 10 activity types
(drag-drop zones, matching columns, ordering items, sorting buckets,
fill-complete blanks, image-interaction hotspots, pattern sequence,
memory deck, scenario decision walk, number-logic). The snapshot has no
`correctAnswer` key by construction — the render context would throw
`SECURITY_CORRECT_ANSWER_EXPOSED` otherwise. Empty drafts render a neutral
"select a type" state.

## 20. Security model

- **Authn/Authz**: every admin route behind `requireAdmin` (Task 5.9, D-082);
  student tokens never grant admin; missing/bogus → 401, non-admin → 403.
- **Field allow-list**: create/update accept only the sanctioned envelope
  fields; `activitySchemaVersion`/`version`/`status` are server-controlled.
- **Read surface**: list/catalogue project preview rows only (no
  correctAnswer/meta). Full surface is a single explicit `GET /:id`.
- **Render guard**: `createRenderContext` throws on `correctAnswer` keys.
- **No secret keys**: the client bundle never contains service-role keys or
  admin authorization identifiers (§23).

## 21. Tests

- **Backend** (+46): `question-service.test.js`,
  `question-api.test.js` (production stack — memory + fake Supabase repos),
  and a validation suite covering all 10 types (valid drafts pass; each
  layer's rejection paths: bad envelope, bad payload, bad correct-answer,
  meta violations, identifier violations, out-of-range grades, cross-doc
  inconsistencies, published-write protection, 404s, 401/403).
- **Frontend** (+13): `frontend-admin-questions.test.js` — editor
  (create-from-template, load-existing, SSR smoke via
  `renderToStaticMarkup`, save with server-error fields), list (rows, draft
  delete button vs published), template validity (every one of the 10
  templates passes the real three-layer validation with prompt + explanation).
- **Engine**: `createDefaultClientActivityEngine` plugin registration test.
- **Total**: `npm test` → **1202/1202 pass** (baseline 1143 + 59 new),
  lint clean, build clean, schema validator PASS.

## 22. Live smoke (production, 106 checks)

Extended `scripts/smoke-production.mjs`:

- **Check 4**: `questions.meta` column probe (0004 applied?).
- **Builder section** (after the general/student/admin sections): catalogue
  (4 streams × 10 types), list = 6 seeded published questions, POST create
  (forces `draft`, `version:1`, meta persisted), GET full surface,
  list previews only (no correctAnswer/meta), PUT update in place
  (**version preserved**; body `status:'draft'` — the service rejects
  `published` targets), invalid draft → 400 `QUESTION_VALIDATION_FAILED`
  with 3 field errors and **not persisted** (pool stays 7 incl. the valid
  draft), unknown id → 404, DELETE draft, list back to 6, 401 without token,
  no secret keys leak.

Trailing-slash gotcha (found + fixed): the admin app is mounted via
`app.use('/api/admin/*')`, so POST/GET to `/api/admin/questions/` (trailing
slash) returns 404 `ADMIN_UNAVAILABLE`; the smoke uses exact paths.

**Live status**: all builder checks verified offline against the production
stack with a fake Supabase client (create → 201 with the full DTO; invalid →
400 with 3 fields; full HTTP round-trip via node `http` server). On the live
project the builder checks are **BLOCKED on `questions.meta`** until the user
applies migration 0004; the smoke's meta probe (check 4) is the gate.

## 23. Bundle security probe

- Credential strings / service-role key patterns: **0 files**.
- `correct-answer.schema.json` `$id` identifiers: **0 files**.
- `public.admins` / `is_admin()` identifiers: **0 files**.
- `correctAnswer`/`correct_answer` strings appear only as (a) the admin
  editor chunk's legitimate handling of the admin API response and (b)
  server-only method *signatures* in shared plugin source plus the
  `correctAnswerExposed` security guard — consistent with the D-051/D-052
  baseline (method source ships; data never does). `acceptableIds` appears
  only in the pattern cross-document rule code.

## 24. Live database state

- Baseline after 5.9 was fully restored and re-verified this session:
  `questions=0`, `students=0`, `schools=0`, `game_sessions=0`, `scores=0`,
  `admins=0`, Auth users `0` (one earlier `| head` pipe killed a smoke run via
  SIGPIPE before cleanup, orphaning 6 smoke-test questions + their sessions;
  removed in FK-safe order to restore the exact baseline).
- **Pending**: migration `0004` (questions.meta) — user-approved, not yet
  applied. After it is applied the smoke's create/update/delete checks run
  live and the run restores the baseline (incl. deleting its own seeded
  smoke-test rows).

## 25. Known limitations

- Payload/correct-answer edited as validated JSON text (no per-type visual
  forms yet — the intended 5.11 follow-up).
- Media refs are presentational placeholders; no Storage upload integration
  (question-media bucket policy exists from 0003; D-044/D-048 constrain what
  ships).
- Publishing is not implemented; the lifecycle is draft/archived + write-
  protected published.
- Client validation is advisory; the server re-validates everything.
- Preview uses public scene geometry only (no correct-answer overlay).

## 26. Next recommended task

Task 5.11 — per-activity-type visual authoring forms + media upload
integration over this foundation (metadata media refs → question-media
bucket), followed by a publish/review workflow. Not started (per the stop
rule after 5.10).

## 27. Verification evidence

```
npm test                 → 1202/1202 pass (2 runs)
npm run lint             → clean
npm run build            → passes (admin editor chunk present in dist)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
prod-stack offline smoke → create 201 / invalid 400 (3 fields) / full HTTP ok
live smoke              → 106 checks defined; builder section BLOCKED on 0004
bundle probe            → 0 files for credentials, correct-answer $ids, admins
DB baseline             → all tables 0, Auth users 0
```

## 28. Revision history

- 2026-08-17 — Initial report. Migration 0004 approved; live builder smoke
  pending column application.
