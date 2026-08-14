# DEVELOPMENT_RULES

Rules that MUST be followed for every action in this repository. These rules
exist to keep the project consistent, secure, and maintainable across all
development stages.

## 1. Stage discipline

1. Develop in **controlled stages**. Do not start implementing features that
   were not explicitly requested.
2. If a required architectural decision is not yet made, **STOP and explain**
   the decision to the user instead of making a large assumption.
3. Do not finalize database tables, create the 2,000 questions, implement the
   game engine, implement the Admin Panel, or create complex UI components
   until their stages are explicitly reached and approved.
4. Do not install packages that are not necessary for the current requested
   task.

## 2. Documentation (reporting requirement)

1. After **every significant development action**, update
   `reports/02-development-log.md` recording:
   - Date
   - Action performed
   - Files created
   - Files modified
   - Packages installed
   - Configuration changes
   - Commands executed (when relevant)
   - Result
   - Any warnings/errors
   - Next recommended action
2. Update `reports/03-decisions.md` whenever an architectural or technical
   decision is made (record rationale and status).
3. Update `reports/04-todo.md` with completed and remaining tasks.
4. Reports must be **specific and technical** — never vague (no
   "project initialized"). Another developer or AI must be able to reproduce
   exactly what happened.
5. All docs must be in English unless the project states otherwise.

## 3. Tech stack & platform

1. Frontend: **React**. Backend: **Node.js / API architecture**.
   Database: **Supabase PostgreSQL**. Admin auth: **Supabase Auth**.
   Realtime: **Supabase Realtime**.
2. The entire system must remain suitable for the **Supabase Free Tier**
   (PostgreSQL, Auth, Storage, Realtime). Design with its limits in mind
   (storage, DB size, connections, realtime listeners).

## 4. Security

1. **Never store admin passwords or secrets in frontend environment
   variables.** Only public, non-secret values belong in `VITE_*` vars.
2. Real secrets live server-side. `.env` must stay git-ignored
   (`.gitignore` already excludes `.env`, `.env.*`, except `.env.example`).
3. Never commit secrets or keys to the repository.

## 5. Game rules (fixed product requirements)

1. Each level holds a minimum of **100 questions**.
2. When a student starts a level, the system randomly selects **exactly 3
   questions** for that game session.
3. The student completes those 3 interactive activities and receives a score.
4. Traditional MCQ is **not** the main activity type. Interactive activity
   types drive the experience (Drag and Drop, Matching, Ordering, Sorting,
   Fill/Complete, Image Interaction, Pattern, Memory, Scenario Challenge,
   Number/Logic Challenge).
5. The exact activity architecture must be finalized before implementation.

## 6. Student data & privacy

1. **Students are normal application records, NOT Supabase Auth users.** Only
   the Admin uses Supabase Auth. (Decision D-005.)
2. Required registration fields: **Initials, Name, School, Grade**.
3. Profile photo is **optional** and must never be required.
4. Public surfaces (e.g., leaderboards) must be privacy-conscious: use
   initials + name or another safe display format. **No unnecessary personal
   information** in public views.
5. Leaderboards show only the **Top 10** students per stream (Science,
   Technology, Engineering, Mathematics).

## 7. UI/UX expectations

1. The platform is **not a normal LMS** — it must feel like a premium, modern,
   futuristic, game-like, educational experience for Grade 6–11 (not
   childish).
2. Mobile-first and fully responsive: phones, tablets, laptops, and exhibition
   displays.
3. Highly interactive and animation-rich, but **performance-conscious**
   (avoid heavy layout thrash; keep animations cheap on low-end devices).

## 8. Code quality

1. Follow existing code conventions in the files you touch.
2. Do not add unnecessary comments.
3. Keep the project structure professional but **not over-engineered**.
4. Verify work with the available tooling (`npm run lint`, `npm run build`).
5. Only commit changes when explicitly asked to commit.
