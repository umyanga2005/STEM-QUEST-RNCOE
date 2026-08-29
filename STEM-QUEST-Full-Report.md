# STEM QUEST — RNCOE  
## Full System Scan · Bug Report · Complete Implementation Plan

---

# PART 1 — SYSTEM DESCRIPTION

## What STEM QUEST Is

STEM QUEST is a **web-based educational gaming platform** built for Grade 6–11 students, targeting STEM subjects (Science, Technology, Engineering, Mathematics). It is explicitly **not an LMS** — the design intention is a premium, game-like experience. Students earn scores, unlock levels, collect badges, and receive certificates. It is mobile-first and fully responsive.

## Tech Stack (Verified from package.json & README)

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8, React Router v7 |
| State | Zustand v5, TanStack Query v5 |
| Styling | Tailwind CSS v4, Motion v13 |
| Backend API | Hono v4 (Node.js) |
| Database | Supabase PostgreSQL (Free Tier) |
| Auth (Admin only) | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Linting | oxlint |
| Testing | Node.js built-in test runner (1,056 tests) |

## Content Structure

- **4 Streams:** Science, Technology, Engineering, Mathematics
- **5 Levels per Stream:** Beginner → Easy → Intermediate → Advanced → Hard
- **≥ 100 Questions per Level** (2,000 question minimum total)
- **Each session:** 3 randomly selected questions, max score 300 (100 per question)

## 10 Interactive Activity Types (No Traditional MCQ)

1. Drag & Drop
2. Matching
3. Ordering
4. Sorting
5. Fill / Complete
6. Image Interaction
7. Pattern (sequence reasoning)
8. Memory (two-phase memorize/recall)
9. Scenario Challenge (consequence-driven decisions)
10. Number / Logic Challenge (constructed entry, 6 answer formats)

## What Is Already Built (Stages 0–5, Partially Complete)

| Feature | Status |
|---|---|
| All 10 activity engine plugins (logic only) | ✅ Complete |
| Game engine (3-of-100 seeded selection) | ✅ Complete |
| Game session service (start/submit/finish) | ✅ Complete |
| Student registration (/student/register) | ✅ Complete |
| Stream & level selection UI (/student/mission) | ✅ Complete |
| Student game UI (/student/game) | ✅ Complete |
| Student progression backend | ✅ Complete |
| Student profile + progress dashboard | ✅ Complete |
| Live stream leaderboards (top 10 per stream) | ✅ Complete |
| Badges & certificates (PDF, public code verify) | ✅ Complete |
| Production Supabase integration | ✅ Complete |
| Admin panel (UI + backend) | ⚠️ Foundation only — no question management UI |
| Gaming UI / visual game experience | ❌ NOT DONE — functional but looks like a web form |
| Activity type visual renderers (game look) | ❌ NOT DONE — logic exists, no game-quality UI |
| Admin quiz/activity preview | ❌ NOT DONE |

## Already Created Assets (from complete_build_plan.md.resolved)

The user has already created AI-generated image and video assets:

**PNG Images (8 files ready, 1 missing):**
- `science-bg.png` — Blue science theme (atoms, DNA, telescopes)
- `tech-bg.png` — Purple/neon circuit board theme
- `engineering-bg.png` — Orange/red gears and cranes
- `maths-bg.png` — Gold mathematical symbols (Σ π √ ∞)
- `level-locked.png` — Red glow padlock icon
- `level-available.png` — Green glow star icon
- `level-complete.png` — Gold badge with checkmark
- `victory-bg.png` — Confetti explosion
- `gameover-bg.png` — ⚠️ MISSING — needs to be generated

**MP4 Video Loops (5 files ready):**
- `science-loop.mp4` — Animated science portal loop
- `tech-loop.mp4` — Animated tech portal loop
- `engineering-loop.mp4` — Animated engineering portal loop
- `maths-loop.mp4` — Animated maths portal loop
- `game-hud-bg.mp4` — Game HUD background loop

---

# PART 2 — BUGS, RESOLUTIONS & GAMING ARCHITECTURE PLAN

## 🟢 Recently Resolved & Fixed (Latest Release)

### ✅ RESOLVED — Kiosk Code Login & Token Synchronization
- **Problem:** Students logging in via Kiosk Code (e.g. `SQ-8A2F`) received a synthetic token (`kiosk-session-SQ-8A2F`), causing 401 Unauthorized errors when attempting to start stream missions.
- **Fix:** Implemented native backend Kiosk Login API endpoint (`POST /api/student/kiosk-login`), added `loginByKioskCode` method to `StudentService`, and connected `studentApiClient.kioskLogin`. Returning students now receive a real, server-authenticated session token and can launch stream missions immediately.

### ✅ RESOLVED — Admin Question Catalogue Layout & Action Buttons
- **Problem:** catalogue list rows crushed button layout due to a fixed `120px` action column width.
- **Fix:** Updated `.aq-list__row` grid column sizing to `auto`, styled `.aq-btn--bare` with glassmorphic blue pill design, and set `white-space: nowrap` across action button wrappers.

### ✅ RESOLVED — Admin Activity Live Sandbox & Editor Preview
- **Problem:** Admin Question Preview modal and Editor side panel previously rendered raw un-transformed payloads or plain text bullet lists, causing `TypeError` crashes or non-visual text displays.
- **Fix:** Updated `AdminActivityPreviewModal.jsx` and `QuestionPreview.jsx` to compile client-safe render descriptors using `getClientEngine().render()` and render full interactive `<RoundActivity />` components live.

---

## 🔴 Critical Bugs / Blockers

### BUG-001 — gameover-bg.png is Missing
**Where:** `src/assets/game/`  
**Impact:** If any component imports or references this asset, it will throw a build error or render blank.  
**Fix:** Generate using ChatGPT prompt: *"Dark space background, cracked purple energy field, encouraging mood, no text, 1920×1080"* and name `gameover-bg.png`.

### BUG-002 — Assets Not Yet Copied Into src/assets/
**Where:** `src/assets/streams/` and `src/assets/game/`  
**Impact:** The build plan describes the rename commands but the files appear to still be in the home directory at `/home/gmhc26/Documents/RNCOE/STEM QUEST/src/assets`. The `complete_build_plan.md.resolved` contains the bash commands to copy them. Until those commands are run, any component importing `science-bg.png` etc. will fail with "cannot find module."  
**Fix:** Run the provided `cp` commands in the terminal exactly as written in `complete_build_plan.md.resolved`.

---

# PART 3 — COMPLETE UI/UX & BACKEND GAMING LEVEL UP PLAN

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      STEM QUEST LEVEL-UP ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
 ┌─────────────────────────────────┴─────────────────────────────────┐
 │                                                                   │
 ▼                                                                   ▼
[ STUDENT GAMING FLOW ]                                   [ ADMIN MANAGEMENT FLOW ]
 1. Kiosk Login (Code: SQ-XXXX)                             1. Auth & Session Management
    ↓                                                          ↓
 2. World Selection Portal                                  2. Question Catalogue & Filtering
    (Video loops & animated cards)                             ↓
    ↓                                                       3. Interactive Question Builder
 3. Candy-Crush Level Node Map                              4. Live Interactive Preview Sandbox
    (Locked/Available/Complete nodes)                          ↓
    ↓                                                       5. Server-Side Scoring & Publishing
 4. Ready Launch Countdown (3→2→1)
    ↓
 5. Video HUD Game Session
    (Hearts, score, timer, 10 interactive activities)
    ↓
 6. Server-Side Scoring & Victory Screen
    (Leaderboard update, Star Badges, Certificates)
```

## 🎮 Student Gaming UX Level Up Roadmap

1. **Immersive World Portals (`StudentMissionPage.jsx`)**:
   - Stream cards equipped with video background loops (`science-loop.mp4`, `tech-loop.mp4`, etc.).
   - Hover particle acceleration and neon glow accents for active streams.

2. **Candy-Crush Style Path-Based Level Map (`LevelStep`)**:
   - Interactive path connecting level nodes 1 through 5.
   - Distinct visual state icons (`level-locked.png`, `level-available.png`, `level-complete.png`).
   - Star rating indicators (1-3 stars based on score) on completed nodes.

3. **Cinematic Ready Launch Sequence (`ReadyPanel`)**:
   - Animated 3→2→1 countdown modal before entering game session.
   - Stream icon floating pulse animation and ambient sound cues.

4. **In-Game HUD & Interactive Activity Engine (`StudentGamePage.jsx`)**:
   - Fixed video background HUD (`game-hud-bg.mp4`).
   - Hearts/Lives display (3 hearts), real-time running score counter, dynamic countdown timer.
   - Seamless slide-in transitions between the 10 interactive activity plugin components.

5. **Victory & Game Over Experience (`SessionCompletePanel`)**:
   - High-impact victory screen utilizing `victory-bg.png` and confetti animations.
   - Performance statistics breakdown (attempts, time taken, hints used).
   - Instant badge unlock notifications and live leaderboard position update.

---

## 🟡 Medium Priority Issues

### BUG-009 — No Victory / Game Over Screen
**Where:** After session finish in `/student/game`  
**What:** Session completion shows a panel with a score but there is no victory screen using `victory-bg.png`, no game-over screen using `gameover-bg.png`, no confetti, no score reveal animation, no "Play Again" or "Next Level" cinematic.  
**Fix:** Add `StudentGameResultsPage` component per Implementation Plan Phase 2.

### BUG-010 — No Countdown 3→2→1 Before Mission Starts
**Where:** The "Begin Mission" button in `/student/mission`  
**What:** Clicking Begin Mission immediately navigates to /student/game. A cinematic countdown with the stream's floating icon and animated 3→2→1 would dramatically improve the game feel.  
**Fix:** Per Implementation Plan Phase 1, ReadyPanel component.

### BUG-011 — Level Nodes Are Not World-Map Style
**Where:** `/student/mission` level selection  
**What:** Levels are shown as a list or simple grid. The build plan specifically calls for world-map path nodes using `level-locked.png`, `level-available.png`, and `level-complete.png` assets.  
**Fix:** Per Implementation Plan Phase 1, LevelStep redesign.

### BUG-012 — No Audio Feedback
**Where:** All activity types  
**What:** There is no sound on correct/incorrect answer, no level-up sound, no victory jingle. For a game platform targeting students, audio is a major engagement driver.  
**Fix:** Per Implementation Plan Phase 5 (audio layer using Web Audio API or small sound files).

### BUG-013 — Profile/Progress Dashboard Has No Visual Polish
**Where:** `/student/profile`  
**What:** The progress overview exists (per-stream cards, level pips, best score) but is plain. Stream icons should use the theme assets, and level pips should be animated.  
**Fix:** Per Implementation Plan Phase 4.

### BUG-014 — Badges Page Has No Animation on Award
**Where:** `/student/achievements`  
**What:** Awarded badges are shown but there is no "reveal" animation, no glow effect on first-time badge award, and the certificate download flow has no visual celebration.  
**Fix:** Per Implementation Plan Phase 4.

## 🟢 Low Priority / Future

### BUG-015 — No Special Access Grant UI in Admin
The backend supports "special access grants" to unlock levels, but there is no admin UI to grant them.

### BUG-016 — No Admin Dashboard Overview
No summary stats (total students, sessions today, top stream, etc.) exist on the admin dashboard.

### BUG-017 — PDF Certificate Has No Visual Polish
The certificate PDF is generated dependency-free (hand-rolled). It is functional but likely plain. A richer PDF design would make the certificate feel more meaningful.

### BUG-018 — No Offline / Error State UI
No friendly error states exist for when the API is unreachable or Supabase is down. Users see raw errors.

---

# PART 3 — COMPLETE IMPLEMENTATION PLAN

## Overview: 5 Phases

| Phase | Area | Priority | Estimated Effort |
|---|---|---|---|
| Phase 1 | Stream Select + Level Select → FULL GAME | 🔴 Critical | Large |
| Phase 2 | In-Game Experience → WOW Activity UIs | 🔴 Critical | Very Large |
| Phase 3 | Admin Panel → Question Management + Preview | 🔴 Critical | Large |
| Phase 4 | Polish Pass (Leaderboard, Profile, Badges) | 🟠 High | Medium |
| Phase 5 | Audio, Final QA, Accessibility | 🟡 Medium | Medium |

---

## PHASE 1 — Stream Select + Level Select → FULL GAME EXPERIENCE

**Goal:** After student logs in, the stream selection and level selection must feel like entering a video game world, NOT a website page.

### Step 1.1 — Fix Asset Placement (Prerequisite)

Run in terminal:
```bash
cd "/home/gmhc26/Documents/RNCOE/STEM QUEST/src/assets"

# Stream backgrounds
cp "ChatGPT Image Aug 24, 2026, 10_35_36 AM.png" streams/science-bg.png
cp "ChatGPT Image Aug 24, 2026, 10_35_40 AM.png" streams/tech-bg.png
cp "ChatGPT Image Aug 24, 2026, 10_35_47 AM.png" streams/engineering-bg.png
cp "ChatGPT Image Aug 24, 2026, 10_36_47 AM.png" streams/maths-bg.png

# Level icons
cp "ChatGPT Image Aug 24, 2026, 10_39_16 AM.png" game/level-locked.png
cp "ChatGPT Image Aug 24, 2026, 10_40_57 AM.png" game/level-available.png
cp "ChatGPT Image Aug 24, 2026, 10_43_11 AM.png" game/level-complete.png
cp "ChatGPT Image Aug 24, 2026, 10_44_09 AM.png" game/victory-bg.png

# Videos
cp "Animation_Prompt__Animate_the.mp4"    streams/science-loop.mp4
cp "Animation_Prompt__Animate_the(1).mp4" streams/tech-loop.mp4
cp "Animation_Prompt__Animate_the(2).mp4" streams/engineering-loop.mp4
cp "Animation_Prompt__Animate_the(3).mp4" streams/maths-loop.mp4
cp "Animation_Prompt___Animate.mp4"       game/game-hud-bg.mp4
```

Also generate `gameover-bg.png` and add to `game/`.

### Step 1.2 — Create `stream-icons.jsx` Component

**File:** `src/pages/stream-icons.jsx`

```jsx
import scienceBg from '../assets/streams/science-bg.png';
import techBg    from '../assets/streams/tech-bg.png';
import engBg     from '../assets/streams/engineering-bg.png';
import mathsBg   from '../assets/streams/maths-bg.png';

const STREAM_ASSETS = {
  science:     { bg: scienceBg, color: '#3B8BD4', glow: '#60a5fa' },
  technology:  { bg: techBg,    color: '#7C3AED', glow: '#a78bfa' },
  engineering: { bg: engBg,     color: '#EA580C', glow: '#fb923c' },
  mathematics: { bg: mathsBg,   color: '#CA8A04', glow: '#fbbf24' },
};

export function StreamPortalIcon({ slug, size = 80 }) {
  const asset = STREAM_ASSETS[slug?.toLowerCase()];
  if (!asset) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden',
      boxShadow: `0 0 24px ${asset.glow}88`,
      border: `2px solid ${asset.glow}66`,
      animation: 'float 3s ease-in-out infinite',
    }}>
      <img src={asset.bg} alt={slug} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

export { STREAM_ASSETS };
```

### Step 1.3 — Redesign `StudentMissionPage.jsx` — Portal Card Layout

**Design spec for stream selection:**

Each of the 4 streams renders as a full Portal Card:
- Full-bleed `<video autoPlay loop muted playsInline>` using the corresponding `*-loop.mp4` as the card background
- The PNG `*-bg.png` as the video `poster` attribute (fallback if video fails to load)
- Stream name in large bold font with the stream's glow color
- A "ENTER PORTAL" button that glows with the stream's color
- Card has a pulsing border animation in the stream's color
- On hover: video brightens, border glows stronger, card scales up slightly (Motion)
- Selected stream: card expands slightly, non-selected cards fade to 40% opacity

**Design spec for level selection (after stream is chosen):**

Replaces list/grid with a **world-map path** visual:
- Curved SVG path connecting 5 level nodes, styled like a game world map
- Each node uses the correct PNG asset: `level-locked.png`, `level-available.png`, `level-complete.png`
- Completed nodes show a golden checkmark and the best score
- Available nodes pulse with a green glow animation
- Locked nodes have a padlock and are visually dimmed
- Level names appear below each node: Beginner → Easy → Intermediate → Advanced → Hard
- Clicking an available node shows a popup with level stats and a "BEGIN MISSION" button

**CSS animations needed in `student-mission.css`:**
```css
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes portalPulse { 0%,100%{box-shadow:0 0 16px var(--stream-glow)} 50%{box-shadow:0 0 40px var(--stream-glow)} }
@keyframes nodePulse { 0%,100%{filter:drop-shadow(0 0 8px #22c55e)} 50%{filter:drop-shadow(0 0 20px #22c55e)} }
.video-bg { position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.6; }
```

### Step 1.4 — ReadyPanel Component (Countdown Before Mission)

After clicking "BEGIN MISSION", before navigating to `/student/game`:

1. Full-screen overlay appears with the stream's background video
2. The stream's `StreamPortalIcon` floats in the center, bouncing with Motion
3. A countdown animates: **3 → 2 → 1 → GO!** (each number animates scale-in and fades out)
4. After "GO!" the panel fades out and navigation to `/student/game` fires
5. The `{ streamId, levelId }` data is passed as before

```jsx
// Pseudocode structure
function ReadyPanel({ stream, level, onComplete }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setCount(c => c - 1), 900);
    if (count === 0) { clearInterval(id); onComplete(); }
    return () => clearInterval(id);
  }, [count]);
  
  return (
    <motion.div className="ready-overlay" initial={{opacity:0}} animate={{opacity:1}}>
      <video autoPlay loop muted playsInline src={streamVideo} className="video-bg" />
      <StreamPortalIcon slug={stream.slug} size={120} />
      <motion.div className="countdown" key={count}
        initial={{scale:2,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.5,opacity:0}}>
        {count > 0 ? count : 'GO!'}
      </motion.div>
    </motion.div>
  );
}
```

---

## PHASE 2 — IN-GAME EXPERIENCE → WOW ACTIVITY UIs

**Goal:** Every activity type must feel like a distinct, visually rich game mechanic — not a quiz form.

### Step 2.1 — Game HUD Chrome in `StudentGamePage.jsx`

Add a persistent HUD bar at the top of the game screen:

```
[Stream Icon] | Level Name | [⏱️ Timer] | [❤️❤️❤️ Hearts] | [🏆 Score: 240]
```

- Stream icon is the circular portal icon (40px)
- Timer counts down from e.g. 60 seconds (display-only as designed, never enforced)
- Hearts: 3 hearts visible; incorrect answers animate a heart breaking and fading
- Score counter uses a tick-up animation (animates from previous to new score)
- Background: `<video autoPlay loop muted playsInline src={gameHudBg} />` at low opacity behind the whole game screen

**CSS for HUD:**
```css
.game-hud {
  position: sticky; top: 0; z-index: 100;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; gap: 16px;
  padding: 8px 20px;
}
.hud-score { font-size: 1.2rem; font-weight: 700; color: #fbbf24; }
.heart { font-size: 1.4rem; transition: all 0.3s; }
.heart.lost { filter: grayscale(1); opacity: 0.3; }
```

### Step 2.2 — Between-Question Slide Animation

Between each of the 3 rounds:
- Current activity slides out LEFT with Motion (x: -100%, opacity: 0)
- Brief "loading next question" flash with the stream's color
- Next activity slides IN from RIGHT (x: 100% → 0, opacity: 0 → 1)
- Round result panel (Correct! ✓ / Incorrect ✗ + score earned) shows briefly before transitioning

### Step 2.3 — Victory / Game Over Screen (`StudentGameResultsPage`)

**Victory (score > 0):**
- Full-screen `victory-bg.png` background
- Animated confetti using CSS keyframes or canvas
- Score revealed with tick-up animation
- Stars earned: 0–3 stars based on score (0–100 = 1 star, 101–200 = 2 stars, 201–300 = 3 stars)
- Buttons: "PLAY AGAIN", "NEXT LEVEL" (if unlocked), "LEADERBOARD"
- If stream completed: badge award animation (badge drops in from top with glow)

**Game Over (edge case — future: if timer expires):**
- `gameover-bg.png` background
- Encouraging message: "Almost there! Try again?"
- Score shown with dimmed styling
- "TRY AGAIN" button

### Step 2.4 — Activity-Type WOW UI Designs

Below is the visual design spec for each of the 10 activity types:

#### Activity 1: Drag & Drop
- Draggable items: rounded cards with a subtle gradient matching the stream color, icon on left
- Drop zones: dashed border rectangles that glow green when an item is dragged over them
- On correct drop: particle burst from the drop zone, green flash, item "locks" in place with a satisfying scale animation
- On incorrect: item shakes and bounces back to origin, red flash on drop zone

#### Activity 2: Matching
- Left column: source items as stream-colored cards
- Right column: target items as cards
- Connecting line: animated dashed line that draws itself when matched (SVG path animation)
- Correct match: line turns solid green with glow, both cards turn green
- Incorrect: line flashes red and dissolves, cards shake

#### Activity 3: Ordering
- Items rendered as large numbered cards in a scrambled order
- Drag to reorder, or tap to select then tap target position
- Ghost placeholder shows where item will land
- Final correct order: cards flip sequentially with a satisfying "click" animation
- Progress indicator: "X of Y items in correct position"

#### Activity 4: Sorting
- Items appear as colored chips floating in the center
- Category buckets on left and right (or top and bottom)
- Tap item then tap bucket, or drag item to bucket
- Bucket fills up visually with sorted items (stacked inside)
- Correct sort: bucket flashes the stream color and increments a counter

#### Activity 5: Fill / Complete
- Blank spaces rendered as glowing underlines in the stream color
- Text fields styled as glowing input cards (not plain HTML inputs)
- Correct fill: field turns green, check mark appears with scale animation
- Word bank (if present): draggable chips that snap into blanks

#### Activity 6: Image Interaction
- Image rendered large and sharp with a glow border
- Tap zones: invisible until tapped — then reveal as glowing circles or highlighted regions
- Incorrect tap: ripple effect at tap location, red flash
- Correct tap: ripple turns green, labeled annotation appears

#### Activity 7: Pattern
- Sequence items displayed as large cards in a horizontal row with a gap for the missing element
- "?" card pulses gently to draw attention
- Answer bank below: cards that can be selected/dragged
- On selection: card slots into the gap with a satisfying animation
- If construct-next: blank card at end of sequence, animated cursor in the answer field

#### Activity 8: Memory
- Phase 1 (Memorize): items flash on screen with a countdown timer overlay
- Items displayed with a warm amber glow — "memorize now" feel
- Phase 2 (Recall): a flip animation reveals blank cards
- Student types or selects recalled items
- Correct recall: card flips back to reveal the item with a green glow
- Progressive reveal budget: an indicator shows "you can reveal X more"

#### Activity 9: Scenario Challenge
- Decision tree rendered step by step
- Each decision step has an atmospheric illustration prompt (text-described)
- Choices shown as large interactive buttons with consequence previews on hover
- "Story scroll" animation: text and choices slide up as the scenario progresses
- Good choices: screen brightens, positive music cue indicator
- Bad choices: screen dims briefly, warning animation

#### Activity 10: Number / Logic Challenge
- Clean math-focused interface: white card on dark background
- Large formula/equation display with stream-colored highlights on the unknowns
- Answer fields styled as answer boxes (like a calculator display)
- Unit picker rendered as a horizontal chip selector
- "Check answer" button with a glow effect
- Correct: equation "solves itself" with an animation (values fill in)
- Incorrect: equation shakes, hint tooltip appears

---

## PHASE 3 — ADMIN PANEL: QUESTION MANAGEMENT + PREVIEW

**Goal:** Admin can add all 10 activity types through a form, and preview them exactly as a student would see them — with the full WOW game UI.

### Step 3.1 — Admin Question Management Page Structure

Route: `/admin/questions`

**Page layout:**
- Left sidebar: filter by Stream, Level, Activity Type
- Main area: paginated list of existing questions
- "ADD NEW QUESTION" button → opens the Add Question flow

**Question list row:**
- Activity type badge (color-coded chip)
- Stream badge
- Level badge
- First 60 chars of the prompt
- Status (Published / Draft)
- Action buttons: Edit, Preview, Delete

### Step 3.2 — Add/Edit Question Form

**Normal form — this is acceptable per your requirement:**
- Step 1: Choose Stream + Level + Activity Type
- Step 2: Fill in the activity-specific fields

Each activity type has its own form section:
- **Drag & Drop:** prompt text + list of items + correct targets (drag-and-drop field builder)
- **Matching:** source items list + target items list (pair builder)
- **Ordering:** items list with "correct order" drag-to-sort preview
- **Sorting:** items list + categories definition
- **Fill/Complete:** rich text editor with [BLANK] markers
- **Image Interaction:** image uploader + coordinate tap-zone markers
- **Pattern:** sequence items + position of missing element + correct answer
- **Memory:** items to memorize + recall prompt
- **Scenario Challenge:** multi-step builder — each step has prompt + choices + consequences
- **Number / Logic Challenge:** equation prompt + answer format selector + correct answer(s)

### Step 3.3 — Activity Preview Modal (WOW LOOK REQUIRED)

**This is the key "wow" feature for the admin side.**

When admin clicks "PREVIEW", open a full-screen modal:

**Modal structure:**
```
┌────────────────────────────────────────────────────┐
│  [✕ Close]    ACTIVITY PREVIEW     [Science · L2]  │
│  ─────────────────────────────────────────────────  │
│                                                    │
│    [Full game-quality activity renderer here]      │
│    (exactly what students see)                     │
│                                                    │
│  ─────────────────────────────────────────────────  │
│  Type: Drag & Drop  |  Max Score: 100  |  [DRAFT]  │
└────────────────────────────────────────────────────┘
```

**CSS for modal:**
```css
.preview-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(20px);
  display: flex; align-items: center; justify-content: center;
}
.preview-modal {
  background: linear-gradient(135deg, #0f172a, #1e1b4b);
  border: 1px solid rgba(139,92,246,0.3);
  border-radius: 20px;
  width: min(90vw, 800px);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 60px rgba(139,92,246,0.2);
}
```

**Important:** The exact same React activity renderer component used in `/student/game` is reused inside this preview modal — **DRY principle**. The admin preview IS the student view, just wrapped in the modal frame. This ensures 100% accuracy.

**Admin-only overlays inside the preview:**
- Top-right badge: "PREVIEW MODE" in amber
- Bottom bar: metadata (activity type, stream, level, max score, status)
- Interaction is fully enabled — admin can actually try the activity

### Step 3.4 — Admin Quiz Adding UX (Keeping Forms, Improving Hints)

The form itself stays as a normal form (per your requirement — "Normal Form type ok for Quiz adding"). Improvements:
- Add live character counters on text fields
- Add a "PREVIEW" button next to each form section that opens a mini-preview of just that component
- Add an activity type selector with visual cards (icon + name + brief description) instead of a plain dropdown
- Add a "SAVE AS DRAFT" and "PUBLISH" distinction
- Add bulk import via CSV for Number/Logic and Fill/Complete types

---

## PHASE 4 — POLISH PASS

### Leaderboard Page
- Rank #1 entry: animated crown emoji + gold row background
- Score values: animate (tick up) when the page loads or when live update fires
- New live entries: slide in from top, push existing entries down
- Live indicator: pulsing green dot with "LIVE" text
- Self-highlight: user's own row has stream-colored left border

### Student Profile + Progress Dashboard
- Per-stream progress cards: use stream background images as subtle card backgrounds (low opacity)
- Level pips: animate on page load (fill left to right with the stream color)
- Best score: render as a glowing number in the stream color
- "Next level" indicator: animated arrow pointing right with the next level name

### Badges & Achievements Page
- Locked badges: grayscale + padlock icon overlay
- Awarded badges: full color + subtle pulse glow animation
- First-time badge award: overlay animation — badge flies in from top, bursts, settles
- Certificate section: card with gold border, certificate code in monospace
- Download button: animated download icon

---

## PHASE 5 — AUDIO + FINAL QA

### Audio Design
Add lightweight sound effects using the Web Audio API (zero dependencies):
- Correct answer: short pleasant chime (440Hz → 880Hz, 0.3s)
- Incorrect answer: low buzz (200Hz, 0.2s)
- Level complete: ascending melody (4 tones)
- Badge awarded: fanfare (3 tones + sustain)
- Countdown: tick sounds (3, 2, 1) + GO! jingle

Implementation: create `src/lib/audio.js` with a lazy-initialized AudioContext and helper functions (`playCorrect()`, `playIncorrect()`, `playVictory()`, etc.). Keep all audio optional — respect `prefers-reduced-motion` and add a settings toggle.

### Final QA Checklist
- [ ] All 10 activity types work on mobile (touch events)
- [ ] Video backgrounds degrade gracefully (PNG poster shown if video fails)
- [ ] Supabase Realtime leaderboard updates in real time
- [ ] Certificate PDF downloads correctly and verifies at public endpoint
- [ ] Admin can add all 10 activity types without errors
- [ ] Admin preview shows activity exactly as student sees it
- [ ] Level progression unlock rules are enforced server-side (confirmed already done)
- [ ] Grade never gates a level (confirmed in rules)
- [ ] No secrets in VITE_* env vars (confirmed in rules)
- [ ] All images have alt text
- [ ] Focus rings visible for keyboard navigation

---

# PART 4 — FILE-BY-FILE IMPLEMENTATION CHECKLIST

## New Files to Create

| File | Purpose |
|---|---|
| `src/pages/stream-icons.jsx` | StreamPortalIcon component + STREAM_ASSETS map |
| `src/components/ReadyPanel.jsx` | 3→2→1 countdown overlay before mission |
| `src/components/GameHUD.jsx` | Sticky HUD bar (icon, timer, hearts, score) |
| `src/components/StudentGameResultsPage.jsx` | Victory / Game Over screen |
| `src/components/ActivityPreviewModal.jsx` | Admin preview modal wrapper |
| `src/lib/audio.js` | Web Audio API sound effects helper |
| `src/features/admin/pages/AdminQuestionsPage.jsx` | Question list + add/edit forms |
| `src/assets/streams/science-bg.png` | (copy from local) |
| `src/assets/streams/tech-bg.png` | (copy from local) |
| `src/assets/streams/engineering-bg.png` | (copy from local) |
| `src/assets/streams/maths-bg.png` | (copy from local) |
| `src/assets/streams/science-loop.mp4` | (copy from local) |
| `src/assets/streams/tech-loop.mp4` | (copy from local) |
| `src/assets/streams/engineering-loop.mp4` | (copy from local) |
| `src/assets/streams/maths-loop.mp4` | (copy from local) |
| `src/assets/game/level-locked.png` | (copy from local) |
| `src/assets/game/level-available.png` | (copy from local) |
| `src/assets/game/level-complete.png` | (copy from local) |
| `src/assets/game/victory-bg.png` | (copy from local) |
| `src/assets/game/gameover-bg.png` | ⚠️ GENERATE FIRST |
| `src/assets/game/game-hud-bg.mp4` | (copy from local) |

## Files to Modify

| File | Changes Needed |
|---|---|
| `src/pages/StudentMissionPage.jsx` | Full redesign → portal cards + world-map levels |
| `src/pages/StudentGamePage.jsx` | Add GameHUD, video bg, slide animations, ReadyPanel, Results |
| `src/pages/LeaderboardPage.jsx` | Crown on #1, tick animations, slide-in for live entries |
| `src/pages/StudentProfilePage.jsx` | Polish: stream card BGs, animated pips, glow scores |
| `src/pages/AchievementsPage.jsx` | Badge reveal animations, award overlay |
| `student-mission.css` | Add video-bg rules, portal animations, world-map styles |
| `student-game.css` | Add HUD styles, video bg, slide animations |
| All 10 activity renderer components | Replace plain form styling with game-quality WOW UI |

---

# PART 5 — DEVELOPMENT SEQUENCE (DO IN THIS ORDER)

1. **First:** Generate `gameover-bg.png` (blocks everything else)
2. **Second:** Run the asset copy commands (BUG-001, BUG-002 fix)
3. **Phase 1 Step 1.2:** Create `stream-icons.jsx`
4. **Phase 1 Step 1.3:** Redesign `StudentMissionPage.jsx` with portal cards
5. **Phase 1 Step 1.4:** Add `ReadyPanel` countdown component
6. **Phase 2 Step 2.1:** Add `GameHUD` component to `StudentGamePage.jsx`
7. **Phase 2 Step 2.3:** Add `StudentGameResultsPage` (victory/gameover)
8. **Phase 2 Step 2.2:** Add between-question slide animations
9. **Phase 2 Step 2.4:** Redesign each activity type renderer (10 components, do one at a time — start with Drag & Drop as it is the most iconic)
10. **Phase 3 Step 3.1–3.3:** Build admin question management + WOW preview modal
11. **Phase 4:** Leaderboard, profile, badge polish
12. **Phase 5:** Audio, QA

---

*Report generated: August 24, 2026*  
*Repository: https://github.com/umyanga2005/STEM-QUEST-RNCOE*
