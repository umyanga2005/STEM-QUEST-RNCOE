/**
 * Leaderboard — Realtime tests (Task 5.7).
 *
 * The refcounted Realtime controller with an injected fake socket: exactly
 * one channel/client however many components subscribe, clean teardown when
 * the last subscriber leaves, postgres_changes events fanning out to every
 * listener, status forwarding, and graceful degradation when the public
 * VITE env values are absent (no crash, explicit UNAVAILABLE). No network.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  createLeaderboardRealtimeController,
  LEADERBOARD_REALTIME_CHANNEL,
  LEADERBOARD_REALTIME_TABLE,
  REALTIME_STATUS,
  realtimeConfig,
} from '../realtime/realtime.js'
import { liveStatusOf } from '../queries/queries.js'

function makeFake() {
  const calls = { channels: [], statusHandlers: [], events: [], disconnectCount: 0, unsubscribed: false, channel: null }
  const client = {
    channel(name) {
      calls.channels.push(name)
      const channel = {
        on(event, filter, cb) {
          calls.events.push({ event, filter, handler: cb })
          return channel
        },
        subscribe(cb) {
          calls.statusHandlers.push(cb)
          return channel
        },
        unsubscribe() {
          calls.unsubscribed = true
        },
      }
      calls.channel = channel
      return channel
    },
    disconnect() {
      calls.disconnectCount += 1
    },
  }
  return { client, calls }
}

test('first subscriber opens exactly one channel over one client', () => {
  const fake = makeFake()
  const controller = createLeaderboardRealtimeController({ createClient: () => fake.client })
  const unsub = controller.subscribe({ onEvent: () => {}, onStatus: () => {} })

  assert.deepEqual(fake.calls.channels, [LEADERBOARD_REALTIME_CHANNEL])
  assert.equal(fake.calls.statusHandlers.length, 1)
  assert.equal(fake.calls.events[0].event, 'postgres_changes')
  assert.equal(fake.calls.events[0].filter.table, LEADERBOARD_REALTIME_TABLE)
  assert.equal(fake.calls.events[0].filter.event, '*')
  unsub()
})

test('duplicate subscriptions share one socket and tear down on the last unsubscribe', () => {
  const fake = makeFake()
  const controller = createLeaderboardRealtimeController({ createClient: () => fake.client })
  const unsubA = controller.subscribe({ onEvent: () => {} })
  const unsubB = controller.subscribe({ onEvent: () => {} })

  assert.equal(fake.calls.channels.length, 1, 'one channel for two subscribers')
  assert.equal(fake.calls.disconnectCount, 0)

  unsubA()
  assert.equal(fake.calls.disconnectCount, 0, 'socket stays while a subscriber remains')

  unsubB()
  assert.equal(fake.calls.disconnectCount, 1, 'socket disconnects when the last subscriber leaves')
  assert.equal(fake.calls.unsubscribed, true)
})

test('postgres_changes events reach every listener (cache invalidation fan-out)', () => {
  const fake = makeFake()
  const controller = createLeaderboardRealtimeController({ createClient: () => fake.client })
  const seenA = []
  const seenB = []
  controller.subscribe({ onEvent: (p) => seenA.push(p) })
  controller.subscribe({ onEvent: (p) => seenB.push(p) })

  assert.equal(fake.calls.events.length, 1, 'one channel subscription for two listeners')
  assert.equal(fake.calls.events[0].event, 'postgres_changes')
  assert.equal(fake.calls.events[0].filter.table, LEADERBOARD_REALTIME_TABLE)

  const payload = { eventType: 'INSERT', table: 'leaderboard_entries', new: { stream_id: 1 } }
  fake.calls.events[0].handler(payload)
  assert.deepEqual(seenA, [payload])
  assert.deepEqual(seenB, [payload], 'every listener receives the event')
})

test('status callbacks forward realtime statuses and map to UI states', () => {
  const fake = makeFake()
  const controller = createLeaderboardRealtimeController({ createClient: () => fake.client })
  const statuses = []
  controller.subscribe({ onStatus: (s) => statuses.push(s) })

  const handler = fake.calls.statusHandlers[0]
  handler('SUBSCRIBED')
  handler('CHANNEL_ERROR')
  handler('TIMED_OUT')
  assert.deepEqual(statuses, ['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT'])
  assert.equal(liveStatusOf('SUBSCRIBED'), 'live')
  assert.equal(liveStatusOf('CHANNEL_ERROR'), 'reconnecting')
  assert.equal(liveStatusOf('UNAVAILABLE'), 'unavailable')
  assert.equal(liveStatusOf('unknown'), 'connecting')
})

test('a client that cannot be created degrades to UNAVAILABLE once and stays silent', () => {
  let attempts = 0
  const controller = createLeaderboardRealtimeController({
    createClient: () => {
      attempts += 1
      throw new Error('Realtime is not configured')
    },
  })
  const statuses = []
  controller.subscribe({ onStatus: (s) => statuses.push(s) })
  controller.subscribe({ onStatus: (s) => statuses.push(s) })

  assert.deepEqual(statuses, [REALTIME_STATUS.UNAVAILABLE], 'emitted once for the first subscriber')
  assert.equal(attempts, 1, 'no retry attempt after a known configuration failure')
})

test('realtimeConfig returns null when the public VITE env values are absent (node/SSR)', () => {
  assert.equal(realtimeConfig(), null)
})

export default { tests: true }