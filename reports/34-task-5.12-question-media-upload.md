# 34 – Task 5.12: Secure Question-Media Upload for the Admin Question Builder

## 1. Task status

**COMPLETED.** 2026-08-17. Task 5.12 lets the admin upload images into the
private `question-media` bucket (migration `0003`) **through the backend** —
the service role never leaves the server and no client code ever talks to the
bucket. Uploaded images can be referenced by any of the ten visual authoring
forms (drag-drop items, matching cards, image-interaction images, scenario
media, etc.), previewed in the editor and in `QuestionPreview` via short-lived
signed URLs, and removed with a **non-destructive** lifecycle: an object is
deletable only when the requesting admin owns it and no question still
references it. 25 new tests (1276/1276 total); lint, build, schema validation
and bundle probes all pass; the live production smoke ran **122/122 checks**
and restored BOTH the database and the storage bucket to their exact baseline.
Task 5.11A/5.11B were not rewritten.

## 2. Scope

- **Backend upload surface** — `POST /api/admin/questions/media` (multipart
  `file`), `GET /api/admin/questions/media/url?ref=`, and
  `DELETE /api/admin/questions/media?ref=`, all behind `requireAdmin`.
- **Validation & path safety** — size (≤ 1 MB), MIME (jpeg/png/webp), magic-byte
  content sniffing, traversal-proof owner segment, server-generated `{uuid}.{ext}`
  filenames. The returned ref matches the media schema contract
  (`^question-media/...`).
- **Preview** — signed URLs (1-hour TTL) served only to authenticated admins;
  the editor and question preview render images from them with an SSR-safe
  placeholder fallback.
- **Lifecycle** — ownership embedded in the path (cross-admin delete → 403
  `QUESTION_MEDIA_FORBIDDEN`); deletion gated on `isMediaRefInUse` (referenced
  object → 409 `QUESTION_MEDIA_IN_USE`); question deletion never cascades to
  storage (D-084).
- Explicitly **out of scope**: the publish/review workflow, AI authoring, bulk
  import, a media library screen, production question content, Supabase
  schema/migration changes, new packages.

## 3. Foundation reused

- The storage bucket `question-media` already exists (0003: private, 1 MB,
  jpeg/png/webg, admin-only SELECT policy) — **no migration, no RLS change**.
- The avatar pipeline (`src/features/student/security/avatar.js` + repos) was
  the mirrored template for validated, backend-mediated uploads.
- The media schema contract (`schemas/common/media.schema.json`) defines the
  ref pattern and `{ref, alt}` shape the service must produce.
- `createAdminQuestionsApi` / `createAdminApi` / `production-server.js` wiring
  is the 5.10 chain; the media routes slot in before `DELETE /:id`.
- `MediaReferenceEditor` (5.11A) was the placeholder the editor forms use; this
  task upgrades it to real upload/replace/remove.

## 4. Security module — `security/media.js`

- `QUESTION_MEDIA_BUCKET = 'question-media'`, `QUESTION_MEDIA_MAX_BYTES =
  1048576`, `QUESTION_MEDIA_ALLOWED_MIME` (image/jpeg, image/png, image/webp),
  `QUESTION_MEDIA_URL_TTL_SECONDS = 3600`, `QUESTION_MEDIA_FOLDER = 'uploads'`.
- `MEDIA_REF_PATTERN` mirrors the schema contract; `isSafeMediaRef` gates every
  url/remove call.
- `sniffImageExtension(buffer)` — magic-byte sniffing (JPEG `ffd8ff`, PNG
  `89504e470d0a1a0a`, WebP `RIFF....WEBP`) so declared MIME cannot be spoofed.
- `sanitizeMediaSegment(segment)` — strips anything outside `[a-z0-9-]`, so
  `../evil/../../etc` collapses to `eviletc` and can never escape the bucket.
- `validateQuestionMediaFile(file)` — ordered checks with codes EMPTY /
  TOO_LARGE / MIME / CONTENT / MISMATCH; returns `{ ok, extension, mimeType }`.
- `buildQuestionMediaPath(owner, uuid, ext)` →
  `question-media/{owner}/uploads/{uuid}.{ext}` (owner = sanitized admin id).
- `collectMediaRefs(value)` — recursive collector used by `isMediaRefInUse`.

## 5. Service + errors

- `errors.js` gained `QUESTION_MEDIA_VALIDATION_FAILED` (400),
  `QUESTION_MEDIA_NOT_FOUND` (404), `QUESTION_MEDIA_IN_USE` (409),
  `QUESTION_MEDIA_FORBIDDEN` (403) + `mediaValidation`/`mediaNotFound`/
  `mediaInUse`/`mediaForbidden` factories, registered in the error categories
  and status map.
- `service/media-service.js` — `QuestionMediaService`:
  - `upload({ admin, file })` → validate → randomUUID → `mediaRepository.upload`.
  - `url({ ref })` → ref gate → `createSignedUrl`; missing → 404.
  - `remove({ admin, ref })` → ref gate → owner segment must equal the sanitized
    admin id (else 403) → `isMediaRefInUse` (else 409) → `mediaRepository.remove`.
- The contract is documented in `repositories/contracts.js` (QuestionMediaRepository
  + `isMediaRefInUse` on QuestionRepository).

## 6. Repositories

- `memory.js` — `store.media` map, `isMediaRefInUse` (payload scan),
  `MemoryQuestionMediaRepository`; both wired into `createQuestionMemoryRepositories`.
- `supabase.js` — `SupabaseQuestionMediaRepository`: storage `upload` with
  `{ upsert: true }`, `createSignedUrl(path, TTL)`, `remove(paths)` (returns
  `data.length > 0`); `isMediaRefInUse` via a `SELECT payload` scan. Wired into
  `createSupabaseQuestionRepositories`.

## 7. API wiring

- `admin/questions/api/server.js` — `POST /media` reads the multipart `file`
  with `readMediaFile`; `GET /media/url` and `DELETE /media` read `ref` from the
  query. All three are registered **before** `DELETE /:id` so `DELETE /media`
  is not shadowed. `statusByCode` extended; `createAdminQuestionsApi({ questionService,
  mediaService = null })` (backward compatible).
- `admin/api/server.js` — `createAdminApi({ adminService, questionService = null,
  mediaService = null })`.
- `production-server.js` — builds `mediaService` from the question repos and
  passes it into `createAdminApi`; the exported object also returns it.
- `testing/fake-supabase-client.js` — storage gains `remove(paths)` and
  `list(folder)` so offline/production-stack tests exercise real shapes.

## 8. Client

- `client.js` — exports `MEDIA_REF_CLIENT_PATTERN`; `requestMultipart(token, url,
  form)` (FormData, no hard-coded content-type, `Authorization: Bearer`);
  `uploadMedia(token, file)` → `{ media: { ref } }`; `mediaUrl(token, ref)` →
  `{ url }`; `removeMedia(token, ref)` → `{ removed }`.
- `visual-editor/primitives.jsx` — `MediaReferenceEditor` now offers a file
  picker, Upload / Replace / Remove controls, a busy state, an inline error
  surface (mapping the media error codes to readable messages), and a preview
  `<img>` loaded from the signed URL via a guarded effect (`tokenFor()` is
  null-safe during SSR; the placeholder text renders instead). Replacing or
  removing a previously uploaded image best-effort cleans up the old ref (a 409
  is tolerated — another question may reference it). `PENDING_REF` keeps
  templates schema-valid before any upload.
- `components/QuestionPreview.jsx` — new `PreviewImage` component used by
  `ImagePlaceholder` and the `ElementList` item thumbnails; SSR renders the
  ref-code placeholder (no window/sessionStorage access, no correct-answer
  data).
- `src/pages/admin.css` — `aq-media__preview`, `aq-media__actions`,
  `aq-media__error`, `aq-preview__image(-box/-img)`.

## 9. Security boundary

- The **service role is server-only**. The browser holds the admin's Supabase
  Auth token; every upload/signed-URL/delete goes through the Hono surface.
- Ref paths carry the sanitized owner segment; an admin can never delete (or
  even see a signed URL for) another admin's media via the API. Cross-account
  delete → 403.
- The ref pattern + magic-byte sniffing make bucket injection and MIME spoofing
  impossible at the boundary.
- Bundle probes confirm none of the server-only media code
  (`QUESTION_MEDIA_BUCKET`, `buildQuestionMediaPath`, `sanitizeMediaSegment`,
  `isSafeMediaRef`, `validateQuestionMediaFile`) ships to the browser, and no
  credentials/JWT strings appear. (The `createSignedUrl` and `sb_secret_`
  strings in `admin-auth-provider` are supabase-js library internals — the
  client uses the anon-key admin Auth client — not our server code.)

## 10. Tests — `media-api.test.js` (21 new)

- Auth matrix: missing/bogus token, student token (401), valid admin
  (production-stack 403 for non-admin identities).
- Uploads: JPEG, PNG, WebP all 201 with refs ending in the right extension;
  TOO_LARGE → 400 `TOO_LARGE`; wrong MIME → 400 `MIME`; non-image content →
  400 `CONTENT`; declared-vs-content mismatch → 400 `MISMATCH`; empty → 400
  `EMPTY`; traversal refs + bucket-injection (non-`question-media/`) refs →
  400.
- Signed URL: returns a time-limited URL for a valid ref; 404 for a missing
  object; traversal → 400.
- Delete: cross-admin ref → 403 `MEDIA_FORBIDDEN`; referenced by a draft /
  published / archived question → 409 `MEDIA_IN_USE`; unreferenced → 200
  `{ removed: true }`; unknown → 404.
- No secret leakage from any media payload.
- Full production-stack flow: upload → signed URL → create draft referencing
  media → 409 → delete draft → 200 delete → object gone.

## 11. Client/SSR tests (4 new)

- Media client contract (multipart + Bearer + FormData body, ref mapping, error
  mapping incl. 409).
- `QuestionPreview` image SSR renders the placeholder (no crash, no image src
  leak).
- `MediaReferenceEditor` SSR renders controls + placeholder without
  sessionStorage/window.

## 12. Live smoke — 122/122

The production smoke was extended with the media phase (after the builder
payload check) and the cleanup/baseline phases:

- baseline: `question-media` bucket empty (0 objects) at start.
- upload via the backend → 201 with a ref carrying the owner prefix, a `.jpg`
  extension and no client filename; object exists in the bucket.
- preview returns a signed URL for the admin; a student token cannot upload
  (401); bad content → 400; oversized → 400 `TOO_LARGE`; traversal ref → 400;
  a second admin's ref → 403 `MEDIA_FORBIDDEN`.
- a draft referencing the media saves (201); the referenced object is then
  409 `MEDIA_IN_USE`; removing the draft does NOT touch storage; the now
  unreferenced object deletes (200) and is gone from the bucket.
- no secret keys leak from any media payload.
- final baseline: DB counts exact AND `question-media` list length 0.

Debug notes from the run: the storage object path includes the bucket prefix,
so the `list()` probe must target the ref-derived folder (e.g.
`question-media/{owner}/uploads`), and a draft must keep all drag-drop items
when adding a media ref to one item (dropping an item made the draft schema-
invalid).

## 13. Build / lint / schema results

```
npm run lint                → clean
npm run build               → passes (admin editor chunk 239.52 kB / gzip 63.46 kB)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
```

## 14. Bundle security probe

```
grep -l "service_role\|SUPABASE_SERVICE_ROLE_KEY" dist/assets/*.js                    → 0 files
grep -l "eyJ[a-zA-Z0-9_-]{20,}\.eyJ" dist/assets/*.js                                 → 0 files
grep -o "correct-answer\.schema\.json" dist/assets/*.js                               → 0 files
grep -l "public\.admins" dist/assets/*.js                                             → 0 files
grep -l "QUESTION_MEDIA_BUCKET\|buildQuestionMediaPath\|sanitizeMediaSegment\|isSafeMediaRef" dist/assets/*.js → 0 files
grep -l "SECURITY_CORRECT_ANSWER_EXPOSED" dist/assets/*.js                            → 1 file (guard active)
```

## 15. Supabase impact

None. No schema change, no migration, no RLS change, no new table/column. The
`question-media` bucket (0003) is used as designed. The only storage writes are
backend-mediated uploads and explicit deletes.

## 16. Files created

- `src/features/admin/questions/security/media.js`
- `src/features/admin/questions/service/media-service.js`
- `src/features/admin/questions/testing/media-api.test.js`

## 17. Files modified

- `src/features/admin/questions/errors.js` — 4 media codes + factories.
- `src/features/admin/questions/repositories/contracts.js` — media contract + `isMediaRefInUse`.
- `src/features/admin/questions/repositories/memory.js` — media store/repo + `isMediaRefInUse`.
- `src/features/admin/questions/repositories/supabase.js` — Supabase media repo + `isMediaRefInUse`.
- `src/features/admin/questions/api/server.js` — media routes + `readMediaFile` + `statusByCode`.
- `src/features/admin/api/server.js` — `mediaService` threading.
- `src/features/game-session/api/production-server.js` — mediaService build/pass/export.
- `src/features/game-session/testing/fake-supabase-client.js` — storage `remove`/`list`.
- `src/features/admin-questions/client/client.js` — `uploadMedia`/`mediaUrl`/`removeMedia` + `requestMultipart`.
- `src/features/admin-questions/visual-editor/primitives.jsx` — MediaReferenceEditor upload/replace/remove.
- `src/features/admin-questions/components/QuestionPreview.jsx` — `PreviewImage`.
- `src/pages/admin.css` — media + preview styles.
- `src/features/admin-questions/testing/frontend-admin-questions.test.js` — 4 new tests.
- `scripts/smoke-production.mjs` — media phase + storage baseline/cleanup.

## 18. Known limitations

- Question deletion never removes media automatically (D-084); orphaned
  objects require an explicit admin delete. A future media-library screen or
  GC job would build on the same surface.
- Signed URLs are short-lived (1 h); the editor refreshes them per effect run,
  so a long-idle editor may briefly show the placeholder until the next refetch.
- No client-side image downscaling: the 1 MB bucket limit is the ceiling; the
  visual forms already use pixel dimensions for layout.
- In-editor uploads are validated again server-side; the server stays
  authoritative.

## 19. Next recommended task

Task 5.13 — the publish/review workflow so authored drafts (now with real
media) can move from visual authoring to live distribution, followed by the
question bank content itself. Not started (per the stop rule after 5.12).

## Verification evidence

```
npm test                   → 1276/1276 pass (25 new: 21 media API + 4 client/SSR)
npm run lint               → clean
npm run build              → passes (admin editor chunk 239.52 kB / gzip 63.46 kB)
python3 schemas/validate.py → PASS (24 schemas, 72 examples, 12/12 pairs)
bundle probe               → 0 files (credentials, JWT secrets, answer $ids,
                             admin ids, server-only media constants);
                             SECURITY_CORRECT_ANSWER_EXPOSED guard active
npm run smoke:production   → 122/122 PASS; DB + storage restored to exact baseline
```

## Revision history

- 2026-08-17 — Initial report. Task 5.12 complete; 5.11A/5.11B untouched.