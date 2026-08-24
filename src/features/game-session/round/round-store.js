/**
 * Game Session — ephemeral round store (Task 5.3).
 *
 * Minimal Zustand store for the in-play round lifecycle ONLY (D-016: global
 * stores hold no server data). It wraps the pure reducer in
 * `round-lifecycle.js`; every payload stored here was returned by the server
 * (safe descriptor + results). No correct answers, no scoring logic, no
 * derivation of correctness ever happens on the client.
 *
 * Server-owned catalogue data (streams/levels) stays in TanStack Query — the
 * store never holds it.
 */

import { create } from 'zustand'
import {
  createInitialRoundState,
  beginStart,
  sessionStarted,
  beginSubmit,
  roundSubmitted,
  continueToNext,
  beginFinish,
  onFinished,
  failRound,
} from './round-lifecycle.js'

export const useRoundStore = create((set) => ({
  ...createInitialRoundState(),

  startRequested() {
    set((state) => beginStart(state))
  },
  sessionStarted(payload) {
    set((state) => sessionStarted(state, payload))
  },
  submitRequested() {
    set((state) => beginSubmit(state))
  },
  roundSubmitted(payload) {
    set((state) => roundSubmitted(state, payload))
  },
  next() {
    set((state) => continueToNext(state))
  },
  finishRequested() {
    set((state) => beginFinish(state))
  },
  finished(payload) {
    set((state) => onFinished(state, payload))
  },
  failed(error) {
    set((state) => failRound(state, error))
  },
  reset() {
    set(createInitialRoundState())
  },
}))

export default useRoundStore