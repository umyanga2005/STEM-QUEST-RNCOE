# Checkup: Science L1 Bank Reconciliation

Date: 2026-08-18
Task: 5.14 Question Bank — bring science L1 from 96 to 100/100 with exact blueprint match.

## Current Snapshot (science L1, 96 records)

- COUNT: 96 (target 100)
- TOPIC: physics 18, chemistry 15, life 35, earth-space 15, inquiry 13
- ACT: drag-drop 27, sorting 21, matching 13, fill-complete 10, pattern 5, memory 7, ordering 5, number-logic 3, image-interaction 5
- DIFF: D1 62, D2 34, D3 0, D4 0

## Blueprint Targets (science L1, grade 6-7)

- TOPIC: physics 25, chemistry 20, life 25, earth-space 20, inquiry 10
- ACT: dd 25, so 20, mt 15, fc 10, me 10, ii 5, pa 5, or 5, nl 5 (sc 0)
- DIFF: D1 70, D2 25, D3 5, D4 0

## Deltas

- TOPIC: ph +7, ch +5, li -10, es +5, in -3
- ACT: dd -2, so -1, mt +2, me +3, nl +2 (or/pa/fc/ii at target)
- DIFF: D1 +8, D2 -9, D3 +5 (note: D2 over by 9, must move 9 out)

## Reconciliation Plan

Difficulty math check: current D1 62 / D2 34 / D3 0; add 4 new records.
Let a = D2->D1, b = D2->D3, c = D1->D3, nD1 = new D1 count, nD3 = new D3 count.
Constraints: 62 + a - c + nD1 = 70; 34 - a - b = 25; c + b + nD3 = 5; nD1 + nD3 = 4.
From D2: a + b = 9. From D3: c + b + nD3 = 5. From D1: a - c + nD1 = 8.
Pick b = 5 (D3 from D2), then a = 4, c + nD3 = 0 -> c = 0, nD3 = 0, nD1 = 4.
D1: 62 + 4 - 0 + 4 = 70 OK. D2: 34 - 4 - 5 = 25 OK. D3: 0 + 5 + 0 = 5 OK.
=> SOLUTION: 4 records D2->D1, 5 records D2->D3, add 4 new D1 records.

## Record Edits (13 conversions + 4 additions)

### Activity-changing conversions
- R28 (li dd D1) -> ph me D1          [dd-1, me+1, li-1, ph+1]
- R32 (li dd D1) -> ch me D1          [dd-1, me+1, li-1, ch+1]
- R43 (li so D2) -> es me D2          [so-1, me+1, li-1, es+1]

### Topic-only conversions (li -> ph/ch/es)
- R17 (li dd D1) -> ph dd D1
- R18 (li dd D2) -> ph dd D2
- R31 (li dd D2) -> ph dd D2
- R36 (li dd D1) -> ch dd D1
- R40 (li dd D1) -> ch dd D1
- R42 (li so D1) -> ph so D1
- R46 (li so D1) -> ch so D1

### Topic-only conversions (in -> ph/ch/es)
- R54 (in so D2) -> es so D2
- R57 (in so D1) -> es so D1
- R69 (in mt D2) -> ph mt D2

### Difficulty edits (D2->D1 and D2->D3; topic/activity unchanged for the extra ones)
D2->D1 (4): R18, R31, R54, R69
D2->D3 (5): R43, plus 4 additional D2 records that are NOT topic-converted: R47 (ch so D2), R53 (ph so D2), R60 (li mt D2), R66 (li mt D2)

Note: R57 is D1 (stays D1), R28/R32/R36/R40/R42/R46 are D1, R17 is D1.

### New records (+4, all D1)
- 1 ph matching (mt) D1  - "Match each form of energy to its source."
- 1 ch matching (mt) D1  - "Match each material to what it is good for."
- 2 es number-logic (nl) D1 - Moon orbits / satellite orbits

Note: 13 replaced records get NEW content in target topics (not just re-tagged), to keep content-topic fit.

## Final Predicted Cross-tab (100 records) -> validate with refresh.mjs
- TOPIC: ph 25, ch 20, li 25, es 20, in 10
- ACT: dd 25, so 20, mt 15, fc 10, me 10, ii 5, pa 5, or 5, nl 5
- DIFF: D1 70, D2 25, D3 5, D4 0
- Run: node --env-file=.env scripts/content-bank/refresh.mjs
- Expect: science L1 = 100/100, INVALID:0, no distribution violations, no near-dups.

## Status
- science L1 currently: 96/100 authored; validator FAILED on distribution only.
- Next: apply edits, re-run refresh, iterate until clean.
