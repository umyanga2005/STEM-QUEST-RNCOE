# 11 – Task 4.3: Game Engine Core

- **Stage:** Stage 4 – Game Engine / session flow
- **Date:** 2026-08-12
- **Status:** COMPLETED
- **Scope:** Seeded 3-of-100 question selection (D-022, design §8) + session
  lifecycle state machine + student-safe error model. Pure, dependency-free,
  testable core. **No** repository adapters, UI, answer validation/scoring,
  or database changes in this task.

---

## 1. Deliverables

| Module | Purpose |
| --- | --- |
| `core/errors.js` | `GameEngineError`, `GAME_ERROR_CODES`, categories, `toPublic()`/`toJSON()` |
| `core/prng.js` | ≥ 64-bit crypto session seed, mulberry32, seeded rng, shuffle, pickOne |
| `core/selection.js` | D-022 §8 algorithm — exact port |
| `core/session.js` | Pure session lifecycle state machine |
| `index.js` | Single import entry |
| `testing/selection.test.js` | 15 tests |
| `testing/session.test.js` | 11 tests |

## 2. Design constraints honored

- **Server-side only:** selection and session logic are pure over plain
  objects; no Activity Engine import, no I/O. Integration (Activity Engine
  `validateAnswer`/`scoringInputs`, Central Scoring Service, Supabase
  repository) is deliberately deferred to Task 4.4.
- **Exactly 3 questions** per session (`QUESTIONS_PER_SESSION = 3`), enforced
  in both selection (`GAME_INSUFFICIENT_POOL` when pool < 3) and session
  creation (`GAME_INVALID_INPUT` otherwise).
- **Strict diversity:** when the pool has ≥ 3 distinct activity types, the 3
  rounds are always different types. The design's "prefer" is implemented as
  strict (design §8 Controls), matching the engine's diversity guarantee.
- **Controlled randomization:** same seed + same pool + same constraints ⇒
  identical selection (determinism is a tested property).
- **No immediate repetition:** last-5-sessions ids are excluded while that
  leaves enough candidates; the full group is the fallback so repeat avoidance
  never blocks a playable level (tested with an all-recent 3-question pool).
- **Edge cases (design §8):** pool < 3 blocked; 1–2 types ⇒ fill pass repeats;
  session stores `questionIds` (not live references) so a retired question
  cannot corrupt a running session.

## 3. Error model

Stable machine-readable codes (`GAME_SESSION_*`, `GAME_ROUND_*`,
`GAME_INSUFFICIENT_POOL`, `GAME_INVALID_INPUT`, `GAME_INTERNAL`, …) mapped to
student-safe categories (`AVAILABILITY`, `SECURITY`, `STUDENT_ANSWER`,
`INTERNAL`). `toPublic()` never leaks server internals or answer data —
mirrors the Activity Engine error model (D-048).

## 4. Session lifecycle rules

| Transition | Guard | Code on failure |
| --- | --- | --- |
| `createGameSession` | exactly 3 unique questionIds, core fields present | `GAME_INVALID_INPUT` |
| `guardSessionForStudent` | session exists, belongs to student | `GAME_SESSION_NOT_FOUND` / `GAME_SESSION_WRONG_STUDENT` |
| `submitRound` | session started, round exists, is current, not already submitted | `GAME_SESSION_NOT_ACTIVE` / `GAME_ROUND_NOT_FOUND` / `GAME_ROUND_NOT_CURRENT` / `GAME_ROUND_ALREADY_SUBMITTED` |
| auto-complete | last pending round submitted ⇒ status `completed` | — |
| `finishSession` | all rounds submitted, total in [0, 300] | `GAME_SESSION_INVALID_STATE` / `GAME_INVALID_INPUT` |

All updates are immutable (return a new session object; original untouched —
tested).

## 5. Test summary

```
npm test    → 115 pass  (activity-engine 89 + game-engine 26)
npm run lint → clean
npm run build → passes (Vite 8)
```

Selection tests cover: exactly-3 / no-duplicates over many seeds; determinism;
cross-seed variance; strict diversity over 50 runs (5-type pool); recent-5
mechanism; all-recent fallback; fill-pass repeats (2-type and 1-type pools);
insufficient/empty pool errors; stream/level scoping; seeded rng range +
reproducibility; seed format/uniqueness. Session tests cover: creation
validations; ordered submission; unknown/double submission; auto-complete;
non-started guard; finish validations; immutability; student-safe public
errors.

## 6. Decisions recorded

- **D-052** — pure, dependency-free Game Engine core; repository/scoring
  injected later.
- **D-053** — ≥ 64-bit crypto session seed stored for reproducibility.

## 7. Next steps (Task 4.4)

- Session service integrating the Game Engine with the Activity Engine client
  facade: `startSession` returns renderable round descriptors with **no**
  `correctAnswer`; `submitRound` routes `validateAnswer` → `scoringInputs` →
  Central Scoring Service (D-023/D-041); `finishSession` sums 0–300.
- Supabase repository adapter over `game_sessions` / `session_rounds`.
