# 00 – Project Overview

## STEM QUEST – The Educational Treasure Hunt

**One-line description:** A responsive, mobile-first, web-based educational
gaming platform that teaches STEM to Grade 6–11 students through interactive
activities rather than traditional MCQ quizzes.

## Vision

STEM QUEST is *not* a normal LMS. It is a premium, modern, futuristic,
game-like learning experience. The platform feels like a game while teaching
genuine STEM content. It must be:
- Premium and modern
- Futuristic and game-like
- Educational
- Suitable for Grade 6–11 (not childish)
- Highly interactive
- Animation-rich but performance-conscious
- Fully responsive (phones, tablets, laptops, exhibition displays)

## Scope

### Streams (4)
1. Science
2. Technology
3. Engineering
4. Mathematics

### Levels per stream (5)
| Level | Name |
| --- | --- |
| 1 | Beginner |
| 2 | Easy |
| 3 | Intermediate |
| 4 | Advanced |
| 5 | Hard |

### Question volume
- Minimum **100 questions per level**.
- Total: `4 streams × 5 levels × 100 questions = 2,000 questions minimum`.

## Core Game Rule

1. The database holds **100 questions** per level.
2. When a student starts a level, the system **randomly selects exactly 3
   questions** for that game session.
3. The student completes those **3 interactive activities**.
4. The student receives a **score** for the session.

## Activity Types (future activity engine)

Traditional MCQ is **not** the main activity type. The engine will later
support a pluggable set of interactive activity types, including:
- Drag and Drop
- Matching
- Ordering
- Sorting
- Fill / Complete
- Image Interaction
- Pattern
- Memory
- Scenario Challenge
- Number / Logic Challenge

The exact activity architecture will be finalized before implementation.

## Student Registration

**Required:**
- Initials
- Name
- School
- Grade

**Optional:**
- Student profile photo (must NOT be required)

## Admin Panel

Admin authentication uses **Supabase Auth**. Admin passwords must NOT be stored
in frontend environment variables.

Admins will later be able to:
- Manage students
- Manage streams
- Manage levels
- Manage questions
- Manage activity types
- Manage scores
- Manage badges
- Manage certificates
- View analytics
- Control game settings
- Give selected students special access to specific streams/levels
- Override normal level progression

## Database

**Supabase Free Tier** (constraints must always be respected).
Expected services:
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime

The system must be designed to remain suitable for the Free Tier (storage,
database size, realtime connections, monthly active users, etc.).

## Leaderboard (Live Exhibition)

- A live exhibition leaderboard.
- **Four stream leaderboards:** Science, Technology, Engineering, Mathematics.
- Each displays only the **Top 10 students**.
- Privacy-conscious display: prefer **initials + name** or another safe format.
  No unnecessary personal information in public views.

## Responsive Requirement

The entire platform must be **mobile-first** and fully responsive across:
- Mobile phones
- Tablets
- Laptops
- Exhibition displays (large screens)

## Technology Direction

| Layer | Choice |
| --- | --- |
| Frontend | React |
| Backend | Node.js / API architecture |
| Database | Supabase PostgreSQL |
| Auth (Admin) | Supabase Auth |
| Realtime | Supabase Realtime |

Exact frontend/backend libraries are decided after architecture review (see
`01-initial-architecture.md`).

## Explicitly Out of Scope (for now)

- Finalized database tables (do NOT finalize yet)
- The 2,000 questions (do NOT create yet)
- Game engine implementation
- Admin Panel implementation
- Complex UI components
- Unnecessary package installs

## Reporting Requirement

Every significant development action must be logged in `02-development-log.md`
and reflected in `03-decisions.md` and `04-todo.md`. Reports must be specific
enough for another developer or AI assistant to reproduce what happened.
