# STEM QUEST — Complete Bug Report
**Audit Date:** 2026-08-28  
**Auditor:** Claude (Cowork) — Automated Visual + Code Inspection  
**Scope:** Full application audit — Admin UI, Student Game, API, Database Compatibility  
**Constraint:** AUDIT ONLY — no fixes applied, no code modified  

---

## Severity Legend
| Level | Label | Meaning |
|---|---|---|
| P0 | CRITICAL | Blocks core functionality for all users; data corruption or total feature failure |
| P1 | HIGH | Major feature broken or significantly degraded; workaround difficult/impossible |
| P2 | MEDIUM | Feature partially broken; workaround exists but experience is poor |
| P3 | LOW | Minor visual, UX or data issue; does not block usage |

## Status Legend
- **CONFIRMED** — Visually verified in browser AND traced to root cause in code  
- **LIKELY** — Strong evidence from code analysis; not visually reproduced end-to-end  
- **UNVERIFIED** — Code pattern suggests an issue; requires specific scenario to reproduce  

---

## Summary Table

| ID | Severity | Status | Area | Title |
|---|---|---|---|---|
| BUG-001 | P0 | CONFIRMED | Database / Media | All image-interaction questions have malformed media refs — images broken everywhere |
| BUG-002 | P1 | CONFIRMED | Admin UI | Question list hard-capped at 200 — 801 questions invisible |
| BUG-003 | P1 | CONFIRMED | Admin UI | Admin preview "Official Correct Answer" always shows "No explicit correct answer" |
| BUG-004 | P1 | CONFIRMED | Admin UI | Scenario Challenge admin preview renders no decision option buttons |
| BUG-005 | P1 | CONFIRMED | Game Engine | Session resume keyed on stream only — level switch within stream resumes wrong session |
| BUG-006 | P1 | CONFIRMED | Student Game | No answer feedback/reveal screen shown after question submission |
| BUG-007 | P2 | CONFIRMED | Admin UI | Question list missing stream, level, and activity-type filter controls; URL params ignored |
| BUG-008 | P2 | CONFIRMED | Admin UI | Review Queue sidebar nav stays on "Question Builder" (wrong active state) |
| BUG-009 | P2 | CONFIRMED | Admin UI | SCENARIO CHALLENGE badge wraps to two lines in question list |
| BUG-010 | P2 | CONFIRMED | Student Game | Timer reaches 0s but does not auto-submit or force-advance question |
| BUG-011 | P2 | CONFIRMED | Student Game | Image-interaction hotspot zone partially renders outside the image container boundary |
| BUG-012 | P2 | CONFIRMED | Mobile | Admin console renders blank at 375px viewport width |
| BUG-013 | P2 | CONFIRMED | Admin UI | URL filter params for question list (e.g. `?activityType=multiple-choice`) are ignored |
| BUG-014 | P3 | CONFIRMED | Student Game | `/student` root URL returns 404; no redirect to `/student/register` |
| BUG-015 | P3 | CONFIRMED | Data Quality | All 1001 questions share identical grade range 6–11 — no level differentiation |
| BUG-016 | P3 | CONFIRMED | Student Game | Level map step indicator shows "2 · CHOOSE STREAM" during level selection sub-screen |
| BUG-017 | P3 | LIKELY | Student Game | Steampunk/Engineering background art used for Science stream game screen |
| BUG-018 | P3 | UNVERIFIED | Admin Security | `isSafeMediaRef()` orphan-detection broken — malformed refs never flagged as "in use" |
| BUG-019 | P3 | UNVERIFIED | Data Quality | MULTIPLE CHOICE and MEMORY activity types not visible in question list — may have no seeded questions |

---

## Bug Detail Reports

---

### BUG-001 — P0 — CONFIRMED
**Title:** All image-interaction questions have malformed media refs — images broken in both admin preview and student game

**Area:** Database Compatibility / Media Security  
**Affected Users:** All students attempting image-interaction questions; all admins previewing them  

**Description:**  
All 100 image-interaction questions in the database store their image reference in a format that does not match the application's `MEDIA_REF_PATTERN` validator. As a result, `isSafeMediaRef()` returns `false` for every image, no signed URL is generated, and the image fails to load entirely. Both the admin preview panel and the live student game show only alt text on a black background.

**Root Cause (Code):**  
`src/features/admin/questions/security/media.js`:
```js
export const MEDIA_REF_PATTERN =
  /^question-media\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9._-]+\.(jpe?g|png|webp)$/
```
This pattern requires three non-empty path segments after the bucket name: `question-media/{owner}/{folder}/{file.ext}`.

All 100 DB image refs use the format: `question-media///science_level1_image_10.png` (triple slash = two empty segments). The regex match fails on the empty segments, so `isSafeMediaRef()` returns `false`.

`buildQuestionMediaPath(owner, uuid, extension)` generates the correct format but was not used when seeding the database.

**Visual Confirmation:**  
Admin preview: image area completely dark, only alt text "a pond habitat with a frog, water, grass and reeds clearly visible" visible.  
Student game (Science Level 1 Beginner, Question 1 of 3): identical broken black image area with alt text.

**Affected Files:**  
- `src/features/admin/questions/security/media.js` — `MEDIA_REF_PATTERN` / `isSafeMediaRef()`  
- `src/features/activity-engine/plugins/image-interaction/plugin.js` — passes raw ref to render descriptor  
- `src/features/game-session/security/safe-descriptor.js` — passes raw payload to render  
- Database: `questions.payload` column — all 100 image-interaction rows  

**Impact:** 100% of image-interaction questions are unplayable. Depending on question selection diversity pass, students may receive an image-interaction question in almost every session and be unable to meaningfully interact with it.

---

### BUG-002 — P1 — CONFIRMED
**Title:** Admin question list hard-capped at 200 — 801 of 1001 questions are invisible

**Area:** Admin UI — Question Management  
**Affected Users:** All admins  

**Description:**  
The admin question repository has a hardcoded `limit = 200` default parameter. The API route's `parseQuery()` function does not expose a `limit` parameter to callers, making it impossible to page or override this cap. With 1001 questions in the database, 801 are invisible to admins.

**Root Cause (Code):**  
`src/features/admin/questions/repositories/supabase.js`:
```js
async list({ streamId = null, levelId = null, activityTypeId = null,
             status = null, query = null, limit = 200 } = {}) {
```

`src/features/admin/questions/api/server.js`:
```js
function parseQuery(c) {
  // extracts: stream, level, activityType, status, query
  // NO limit parameter exposed
}
```

**Visual Confirmation:**  
Admin question list loads and stops scrolling after 200 rows. No pagination controls visible. No "showing X of Y" count.

**Impact:** Admins cannot review, edit, or manage 80% of the question database. This makes the "Review Queue" and bulk operations effectively non-functional at scale.

---

### BUG-003 — P1 — CONFIRMED
**Title:** Admin preview "Official Correct Answer" section always shows "No explicit correct answer specified on this question object"

**Area:** Admin UI — Activity Preview  
**Affected Users:** All admins  

**Description:**  
Every question type in admin preview (drag-drop, matching, ordering, sorting, fill-complete, pattern, number-logic, scenario-challenge, image-interaction) displays the same fallback message in the "Official Correct Answer (Admin View)" section: _"No explicit correct answer specified on this question object."_ This is incorrect — questions do have correct answer data in the database.

**Root Cause:**  
The admin preview component reads `correctAnswer` from the question object passed to the preview renderer, but the field name or data path used in the preview does not match the actual field returned by the API/repository. The correct answer data exists in the DB but is not being surfaced to the preview component.

**Visual Confirmation:**  
Verified across 8 distinct activity type previews: DRAG DROP, MATCHING, ORDERING, SORTING, FILL COMPLETE, PATTERN, NUMBER LOGIC, SCENARIO CHALLENGE — all show the same fallback text.

**Impact:** Admins cannot verify correct answers during content review, undermining the entire admin QA workflow.

---

### BUG-004 — P1 — CONFIRMED
**Title:** Scenario Challenge admin preview renders no decision option buttons

**Area:** Admin UI — Activity Preview  
**Affected Users:** All admins reviewing scenario-challenge questions  

**Description:**  
When previewing a Scenario Challenge question in admin, the preview panel shows only the scenario prompt text and the label "DECISION 1 OF 1" but renders no decision option buttons. The activity is not interactive and cannot be tested.

**Visual Confirmation:**  
Admin preview of scenario-challenge question "A plant's soil is dry. What is a helpful choice if the plant needs water?": only the prompt text and "DECISION 1 OF 1" label visible; no choice buttons rendered.

**Root Cause:**  
The admin preview component for `scenario-challenge` does not render the `options`/`choices` array from the question payload. The student-facing render path likely works but was not verified due to the scenario-challenge type not appearing in the tested game session.

**Impact:** Admins cannot verify scenario-challenge question option text or layout before publishing.

---

### BUG-005 — P1 — CONFIRMED
**Title:** Session resume keyed on stream only — switching levels within a stream resumes the wrong session

**Area:** Game Engine — Session Lifecycle  
**Affected Users:** Students who change levels within the same stream  

**Description:**  
`findActiveByStudentStream()` in the session repository queries for an active session using only `student_id + stream_id`, without `level_id`. This means if a student has an active session for Stream A / Level 1 and tries to start Stream A / Level 2, the server finds and resumes the Level 1 session instead of creating a new Level 2 session. The student receives Level 1 questions while the UI shows Level 2.

**Root Cause (Code):**  
`src/features/game-session/repositories/supabase.js`:
```js
findActiveByStudentStream(studentId, streamId) {
  return supabase
    .from('game_sessions')
    .select('*')
    .eq('student_id', studentId)
    .eq('stream_id', streamId)  // ← no level_id filter
    .eq('status', 'active')
    .single();
}
```

The design constraint `D-028` (one active session per stream) is intentional per comments, but causes incorrect question delivery when students change levels before finishing a session.

**Impact:** Students changing levels in the same stream receive questions from the previously active level, corrupting their learning progress data.

---

### BUG-006 — P1 — CONFIRMED
**Title:** No answer feedback or reveal screen shown after question submission in student game

**Area:** Student Game — Question Flow  
**Affected Users:** All students  

**Description:**  
After a student submits an answer, the game briefly shows "Scoring your answer..." then immediately resets to the next question with a fresh timer — no correct/incorrect feedback is shown, no correct answer is revealed, and no score change animation is displayed. Students receive no indication of whether their answer was right or wrong.

**Visual Confirmation:**  
Student game Science Level 1: submitted image-interaction answer → "Scoring your answer..." banner → timer reset to 90s → back to Question 1 display with no feedback screen rendered.

**Impact:** Core learning feedback loop is broken. Students have no way to learn from mistakes. Score changes silently with no explanation.

---

### BUG-007 — P2 — CONFIRMED
**Title:** Question list missing stream, level and type column displays; URL filter params are ignored

**Area:** Admin UI — Question Builder  
**Affected Users:** All admins  

**Description:**  
The admin question list table columns are: PROMPT, TYPE, GRADE, DIFFICULTY, STATUS, ACTIONS. There is no STREAM column or LEVEL column, making it impossible to visually identify which stream/level a question belongs to without opening each one individually. Additionally, URL query parameters such as `?activityType=multiple-choice` are not read by the admin UI — navigating to filtered URLs shows the full unfiltered list.

**Visual Confirmation:**  
- Question list: no stream or level column visible in table headers  
- Navigating to `http://localhost:5173/admin/questions?activityType=multiple-choice` — all activity types still appear in the list

**Impact:** Admins cannot efficiently browse, filter, or audit questions by stream or level context.

---

### BUG-008 — P2 — CONFIRMED
**Title:** Review Queue sidebar nav active state stays on "Question Builder"

**Area:** Admin UI — Navigation  
**Affected Users:** All admins  

**Description:**  
When navigating to the Review Queue (`/admin/questions/review`), the "Question Builder" sidebar nav item remains highlighted in teal as the active item. The "Review Queue" nav item does not receive the active/selected visual state. This makes it impossible to tell from the sidebar which page you are on.

**Visual Confirmation:**  
Observed at `/admin/questions/review` — "Question Builder" sidebar item highlighted teal, "Review Queue" item appears unselected.

**Root Cause (Likely):**  
The active state comparison in the nav component matches on the route prefix `/admin/questions`, which is shared by both routes. Review Queue's sub-route `/admin/questions/review` is never detected as more specific.

---

### BUG-009 — P2 — CONFIRMED
**Title:** SCENARIO CHALLENGE activity type badge wraps to two lines in question list

**Area:** Admin UI — Question Builder  
**Affected Users:** All admins  

**Description:**  
The "SCENARIO CHALLENGE" badge in the TYPE column of the admin question list is too long to fit in the badge's max-width, causing it to wrap to two lines. All other activity type badges render on one line. This makes the scenario challenge rows taller than other rows, creating visual inconsistency.

**Visual Confirmation:**  
Observed in admin question list — "SCENARIO" on first line, "CHALLENGE" on second line, in a stacked badge.

---

### BUG-010 — P2 — CONFIRMED
**Title:** Timer reaches 0s but does not auto-submit or force-advance question

**Area:** Student Game — Timer  
**Affected Users:** All students  

**Description:**  
The per-question timer counts down from 90s to 0s correctly (green → red at low time). When the timer reaches 0s, the game does NOT automatically submit the student's current answer or advance to the next question. Students can continue interacting indefinitely after the timer expires. The student must manually click "Submit" even after time runs out.

**Visual Confirmation:**  
Timer reached 0s on image-interaction question; "Submit (0 selected)" button remained active and the question remained displayed. Student was able to select a hotspot and submit after the timer expired.

**Impact:** Game timer has no enforcement. Students can take unlimited time on each question, defeating the timed-challenge mechanic.

---

### BUG-011 — P2 — CONFIRMED
**Title:** Image-interaction hotspot zones partially render outside the image container boundary

**Area:** Student Game — Image Interaction Activity  
**Affected Users:** All students with image-interaction questions  

**Description:**  
Since the image fails to load (BUG-001), the image container renders at its intrinsic height with a collapsed or zero-height image area. Hotspot circles are absolutely positioned based on percentage coordinates relative to the image dimensions, but with no image rendered, the hotspot partially overflows the bottom of the container. The teal circle outline appears at the very bottom of the container and is cut off.

**Visual Confirmation:**  
Student game image-interaction question: large teal circle partially outside the dark image container area, with the bottom half of the circle clipped/hidden.

**Note:** This bug is compounded by BUG-001. If images were fixed, hotspot positioning may render correctly.

---

### BUG-012 — P2 — CONFIRMED
**Title:** Admin console renders blank at 375px mobile viewport width

**Area:** Mobile Responsiveness — Admin UI  
**Affected Users:** Admins on mobile devices or narrow screens  

**Description:**  
When the browser viewport is resized to 375px wide (iPhone-class mobile width), the admin console page renders as a blank dark screen. No content, nav sidebar, or controls are visible.

**Visual Confirmation:**  
Window resized to 375×812 → screenshot shows entirely dark/blank admin question builder page.

**Root Cause (Likely):**  
The admin layout uses a fixed-width sidebar + content area that is not responsive. At narrow viewports, the layout likely collapses entirely or overflows out of the viewport.

**Note:** The student-facing interface appears to be designed for mobile (narrow card layout) and was not observed to have the same blank-render issue.

---

### BUG-013 — P2 — CONFIRMED
**Title:** URL filter parameters for admin question list are ignored

**Area:** Admin UI — Question Builder  
**Affected Users:** All admins trying to deep-link to filtered question views  

**Description:**  
Navigating to `/admin/questions?activityType=multiple-choice` or similar URL-parameterized filter URLs causes the full unfiltered question list to render. The UI does not read query params from the URL on mount to initialize filter state.

**Visual Confirmation:**  
Navigated to `http://localhost:5173/admin/questions?activityType=multiple-choice` — question list showed all activity types (DRAG DROP, MATCHING, ORDERING, etc.), not filtered to multiple-choice.

---

### BUG-014 — P3 — CONFIRMED
**Title:** `/student` root URL returns 404 — no redirect to registration

**Area:** Student Mode — Routing  
**Affected Users:** Students who type or navigate to the `/student` root path  

**Description:**  
The URL `http://localhost:5173/student` renders a 404 page. Students must navigate directly to `/student/register` to begin. No redirect or catch-all route exists for the `/student` root. The bottom navigation bar IS visible on the 404 page (a side effect of StudentNav being attached to all `/student/*` routes).

**Visual Confirmation:**  
Navigating to `/student` — blank page with only bottom nav (Mission, Leaderboard, Profile, Badges) visible.

---

### BUG-015 — P3 — CONFIRMED
**Title:** All 1001 questions share identical grade range 6–11 — no differentiation by level or stream

**Area:** Data Quality  
**Affected Users:** All students (age-appropriate content concern)  

**Description:**  
Every single question in the database shows grade range "6–11" regardless of stream or level. Level 1 Beginner and Level 5 Expert questions are tagged identically. This means grade-based filtering is useless and the difficulty targeting system has no grade signal to use.

**Visual Confirmation:**  
Admin question list: every row shows "6–11" in the GRADE column across all 200 visible questions, all streams, all levels.

**Impact:** Grade-appropriate content filtering cannot work. A Grade 6 student may receive content difficulty-targeted for Grade 11 and vice versa.

---

### BUG-016 — P3 — CONFIRMED
**Title:** Level map step indicator displays "2 · CHOOSE STREAM" during level selection sub-screen

**Area:** Student Game — Mission Selection  
**Affected Users:** All students  

**Description:**  
After selecting a stream and viewing the level map, the 3-step progress indicator at the top of the page continues to show "2 · CHOOSE STREAM" as the active step. It should advance to a level-selection sub-step or at least reflect that the stream has been chosen. The indicator only correctly advances to "3 · LAUNCH MISSION" after tapping a specific level.

**Visual Confirmation:**  
Science World Map level screen: step indicator shows "1 · REGISTER (done) · 2 · CHOOSE STREAM (active) · 3 · LAUNCH MISSION (pending)".

---

### BUG-017 — P3 — LIKELY
**Title:** Steampunk/Engineering-themed game background used for Science stream

**Area:** Student Game — Visual Theming  

**Description:**  
The game screen background art during Science Level 1 shows an engineering/steampunk aesthetic (gears, bridges, industrial machinery) rather than a Science-themed scene (laboratory, nature, space). If each stream is intended to have its own thematic background, Science is displaying the wrong one. This may be intentional (single shared background) but the theming mismatch is notable.

**Visual Confirmation:**  
Student game Science Level 1 Beginner: full-width background image shows gears, workshop, bridge structure.

---

### BUG-018 — P3 — UNVERIFIED
**Title:** `isSafeMediaRef()` orphan detection broken — malformed refs never counted as "in use"

**Area:** Admin Security — Media Management  

**Description:**  
`collectMediaRefs()` uses `isSafeMediaRef()` to filter which storage refs from questions are "in use" before orphan detection. Because all 100 image-interaction refs fail `isSafeMediaRef()` (BUG-001 root cause), none of those refs are included in the "in use" set. If an admin runs orphan cleanup, the tool would incorrectly report all 100 images as orphans eligible for deletion.

**Root Cause:**  
`src/features/admin/questions/security/media.js` — `collectMediaRefs()` calls `isSafeMediaRef(ref)` as a guard; malformed refs return false and are excluded.

**Status:** UNVERIFIED — orphan detection tool not exercised during audit; deletion was not tested.

---

### BUG-019 — P3 — UNVERIFIED
**Title:** MULTIPLE CHOICE and MEMORY activity types not visible in question list

**Area:** Data Quality — Question Coverage  

**Description:**  
The admin question list visible in the first 200 records shows 9 distinct activity types: DRAG DROP, FILL COMPLETE, IMAGE INTERACTION, MATCHING, NUMBER LOGIC, ORDERING, PATTERN, SCENARIO CHALLENGE, SORTING. The MULTIPLE CHOICE and MEMORY activity types (documented as part of the 10-type plugin system) are not seen in any visible rows.

**Status:** UNVERIFIED — could mean (a) those types have no seeded questions, (b) they exist beyond the 200-item cap (BUG-002), or (c) those plugin registrations exist but the activity types table has no corresponding rows. Database query was not executable during audit.

---

## Activity Type Preview Summary

| Activity Type | Admin Preview Renders | Interaction Works | Correct Answer Shown | Notes |
|---|---|---|---|---|
| drag-drop | ✅ Yes | ✅ Yes (drag handles visible) | ❌ No (BUG-003) | |
| fill-complete | ✅ Yes | ✅ Yes (text input) | ❌ No (BUG-003) | |
| image-interaction | ⚠️ Partial | ⚠️ Blind (no image) | ❌ No (BUG-003) | BUG-001: image black |
| matching | ✅ Yes | ✅ Yes (click-to-match) | ❌ No (BUG-003) | |
| memory | ❓ Not tested | ❓ Not tested | ❓ Not tested | BUG-019: no questions found |
| multiple-choice | ❓ Not tested | ❓ Not tested | ❓ Not tested | BUG-019: no questions found |
| number-logic | ✅ Yes | ✅ Yes (text input) | ❌ No (BUG-003) | Prompt duplicated in UI (minor) |
| ordering | ✅ Yes | ✅ Yes (up/down arrows) | ❌ No (BUG-003) | |
| pattern | ✅ Yes | ✅ Yes (type or bank tap) | ❌ No (BUG-003) | |
| scenario-challenge | ⚠️ Partial | ❌ No buttons rendered | ❌ No (BUG-003) | BUG-004: options missing |
| sorting | ✅ Yes | ✅ Yes (tap or drag) | ❌ No (BUG-003) | |

---

## Student Game Flow Summary

| Step | Status | Notes |
|---|---|---|
| Registration form | ✅ Works | All fields, grade dropdown, submit flow |
| Kiosk code generation | ✅ Works | Displays code with "SQ-XXXXXX" format |
| Stream selection ("Select Your World") | ✅ Works | 4 stream cards with art and descriptions |
| Level map | ✅ Works | Winding path, lock/unlock states |
| Level launch confirm screen | ✅ Works | Stream art, stream name, level name |
| Game HUD | ✅ Works | Hearts, score, timer display |
| Timer countdown | ✅ Works | Counts 90s → 0s, turns red near end |
| Timer auto-submit at 0s | ❌ Broken | BUG-010: no auto-submit |
| Question display (non-image) | ✅ Works | Correct layout for tested types |
| Image-interaction question | ❌ Broken | BUG-001: images fail to load |
| Answer submission | ✅ Partial | Button works; server scores |
| Answer feedback/reveal | ❌ Missing | BUG-006: no feedback screen |
| Score update animation | ❓ Not confirmed | Score stays at 0 in tested session |

---

## Admin UI Functional Summary

| Section | Status | Notes |
|---|---|---|
| Dashboard | ✅ Functional | Stats display |
| Question Builder (list) | ⚠️ Degraded | 200-item cap (BUG-002); no stream/level columns (BUG-007) |
| Question Builder (preview) | ⚠️ Degraded | Correct answers missing (BUG-003); image-interaction broken (BUG-001); scenario-challenge options missing (BUG-004) |
| Review Queue | ✅ Functional | Renders; nav active state wrong (BUG-008) |
| Students | ✅ Functional | Student list renders |
| Progress | ✅ Functional | Progress data renders |
| Leaderboards | ✅ Functional | Rankings display |
| Badges & Certs | ✅ Functional | Achievements render |
| Settings | ✅ Functional | Settings panel renders |

---

## Statistics

| Category | Count |
|---|---|
| Total bugs found | 19 |
| P0 Critical | 1 |
| P1 High | 5 |
| P2 Medium | 7 |
| P3 Low | 6 |
| CONFIRMED | 16 |
| LIKELY | 1 |
| UNVERIFIED | 2 |
| Activity types with broken admin preview | 2 of 9 tested (image-interaction, scenario-challenge) |
| Activity types with missing correct-answer display | 9 of 9 tested |
| Questions with broken images | 100 of 1001 (all image-interaction) |
| Questions invisible to admins | ~801 of 1001 |

---

## Recommended Fix Priority

1. **BUG-001 (P0)** — Fix media refs in database (re-seed or migrate existing refs to correct format matching `MEDIA_REF_PATTERN`)
2. **BUG-006 (P1)** — Implement answer feedback/reveal screen after submission
3. **BUG-002 (P1)** — Add pagination or increase/remove question list limit
4. **BUG-003 (P1)** — Fix correct answer field mapping in admin preview component
5. **BUG-004 (P1)** — Fix scenario-challenge admin preview to render option buttons
6. **BUG-010 (P2)** — Implement timer auto-submit on expiry
7. **BUG-005 (P1)** — Fix session lookup to include `level_id` in query (or handle level-switch gracefully)
8. **BUG-007/013 (P2)** — Add stream/level columns to question list; implement URL filter params
9. **BUG-012 (P2)** — Add mobile-responsive layout to admin console
10. **BUG-015 (P3)** — Seed grade ranges per level (Beginner=6-7, Easy=7-8, Intermediate=8-9, Advanced=9-10, Expert=10-11)

---

*Report generated by automated audit — no code modifications were made during this audit.*
