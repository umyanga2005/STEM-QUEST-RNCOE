/**
 * Mission — access resolver tests (Task 5.2).
 *
 * Pure unit coverage of the selection access/status model: level 1 open,
 * levels 2..5 gated by stream-wide / level-specific grants (mirroring
 * ProgressionService.assertLevelUnlocked), progression status derivation, and
 * stream summaries. No DOM, no I/O.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  LEVEL_ACCESS,
  LEVEL_STATUS,
  resolveLevelAccess,
  resolveLevelStatus,
  selectableAccess,
  buildLevelContext,
  buildStreamSummary,
} from '../access/access-resolver.js'

function level(number, id) {
  return { id, streamId: 3, number, name: `Level ${number}`, isActive: true }
}

test('level 1 is always available regardless of grants', () => {
  assert.equal(resolveLevelAccess({ level: level(1, 101), grants: [] }), LEVEL_ACCESS.AVAILABLE)
  assert.equal(resolveLevelAccess({ level: level(1, 101), grants: null }), LEVEL_ACCESS.AVAILABLE)
})

test('levels 2..5 are locked without any active grant', () => {
  for (const number of [2, 3, 4, 5]) {
    assert.equal(resolveLevelAccess({ level: level(number, 100 + number), grants: [] }), LEVEL_ACCESS.LOCKED)
  }
})

test('a stream-wide grant unlocks every level in that stream', () => {
  const grants = [{ id: 9, studentId: 1, streamId: 3, levelId: null, isActive: true }]
  for (const number of [2, 3, 4, 5]) {
    assert.equal(resolveLevelAccess({ level: level(number, 100 + number), grants }), LEVEL_ACCESS.SPECIAL)
  }
})

test('a level-specific grant still covers the stream-wide rule (stream OR level, mirroring assertLevelUnlocked)', () => {
  // The current backend rule treats ANY grant whose stream_id matches as
  // covering the whole stream (ProgressionService.assertLevelUnlocked). The
  // composite FK D-039 means a level_id is always paired with its stream_id,
  // so level-specific-only coverage is future backend refinement.
  const grants = [{ id: 9, studentId: 1, streamId: 3, levelId: 103, isActive: true }]
  assert.equal(resolveLevelAccess({ level: level(3, 103), grants }), LEVEL_ACCESS.SPECIAL)
  assert.equal(resolveLevelAccess({ level: level(4, 104), grants }), LEVEL_ACCESS.SPECIAL)
})

test('grants from a different stream never unlock this stream (D-039 composite)', () => {
  const grants = [{ id: 9, studentId: 1, streamId: 2, levelId: null, isActive: true }]
  assert.equal(resolveLevelAccess({ level: level(4, 104), grants }), LEVEL_ACCESS.LOCKED)
})

test('level status derives from the progress row (not-started / in-progress / completed)', () => {
  assert.equal(resolveLevelStatus({ levelProgress: null }), LEVEL_STATUS.NOT_STARTED)
  assert.equal(resolveLevelStatus({ levelProgress: { isCompleted: false, attempts: 0 } }), LEVEL_STATUS.NOT_STARTED)
  assert.equal(resolveLevelStatus({ levelProgress: { isCompleted: false, attempts: 3 } }), LEVEL_STATUS.IN_PROGRESS)
  assert.equal(resolveLevelStatus({ levelProgress: { isCompleted: true, attempts: 0 } }), LEVEL_STATUS.COMPLETED)
})

test('only non-locked access is selectable', () => {
  assert.equal(selectableAccess(LEVEL_ACCESS.AVAILABLE), true)
  assert.equal(selectableAccess(LEVEL_ACCESS.SPECIAL), true)
  assert.equal(selectableAccess(LEVEL_ACCESS.LOCKED), false)
})

test('buildLevelContext combines access, status and flags', () => {
  const progressByLevel = new Map([[104, { isCompleted: true, attempts: 2 }]])
  const ctx = buildLevelContext({ level: level(4, 104), grants: [], progressByLevel })
  assert.deepEqual(ctx, {
    id: 104,
    number: 4,
    name: 'Level 4',
    access: LEVEL_ACCESS.LOCKED,
    status: LEVEL_STATUS.COMPLETED,
    selectable: false,
    replayable: true,
  })

  const open = buildLevelContext({ level: level(1, 101), grants: [], progressByLevel: null })
  assert.equal(open.access, LEVEL_ACCESS.AVAILABLE)
  assert.equal(open.selectable, true)
  assert.equal(open.replayable, false)
})

test('buildStreamSummary reports level counts and progress', () => {
  const levels = [1, 2, 3, 4, 5].map((n) => level(n, 100 + n))
  const contexts = levels.map((l) => buildLevelContext({ level: l, grants: [], progressByLevel: null }))
  const summary = buildStreamSummary({ stream: { id: 3, slug: 'science', name: 'Science', description: 'D', themeColor: null }, levelContexts: contexts })
  assert.equal(summary.levelCount, 5)
  assert.equal(summary.unlockedCount, 1)
  assert.equal(summary.completedCount, 0)
  assert.equal(summary.description, 'D')
})

test('grade is never part of access resolution (suitability only)', () => {
  const ctx = buildLevelContext({ level: level(2, 102), grants: [], progressByLevel: null })
  assert.equal('grade' in ctx, false)
  assert.equal(ctx.access, LEVEL_ACCESS.LOCKED)
})