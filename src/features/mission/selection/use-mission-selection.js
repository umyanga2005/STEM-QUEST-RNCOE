/**
 * Mission — useMissionSelection hook (Task 5.2).
 *
 * Composes the pure selection state with the server queries for one screen.
 * React owns ephemeral UI state only (Zustand/global stores hold NO server
 * data here, D-016); stream + level catalogue comes from TanStack Query.
 *
 * Expiry/unauthorized detection is deliberately NOT swallowed here — the
 * page routes on `isExpiredSession(streamsQuery, token)`.
 */

import { useEffect, useMemo, useState } from 'react'
import { useMissionStreams, useMissionLevels } from '../api/queries.js'
import {
  createInitialSelectionState,
  selectStream,
  selectLevel,
  backToStreams,
  backToLevels,
  canBegin,
} from './selection-state.js'

const EMPTY_STREAMS = Object.freeze([])

export function useMissionSelection(token) {
  const [state, setState] = useState(createInitialSelectionState)

  const streamsQuery = useMissionStreams(token)
  const streams = streamsQuery.data?.streams ?? EMPTY_STREAMS

  const selectedStreamId = state.selectedStreamId
  const levelsQuery = useMissionLevels(token, selectedStreamId)

  const selectedStream = useMemo(
    () => streams.find((s) => Number(s.id) === Number(selectedStreamId)) ?? null,
    [streams, selectedStreamId]
  )

  // If the chosen stream disappears (refetch/refresh), fall back to the picker.
  useEffect(() => {
    if (selectedStreamId != null && !selectedStream) {
      setState(createInitialSelectionState())
    }
  }, [selectedStream, selectedStreamId])

  const actions = useMemo(
    () => ({
      chooseStream(stream) {
        setState((prev) => selectStream(prev, stream))
      },
      chooseLevel(level) {
        setState((prev) => selectLevel(prev, level))
      },
      goBackToStreams() {
        setState((prev) => backToStreams(prev))
      },
      goBackToLevels() {
        setState((prev) => backToLevels(prev))
      },
    }),
    []
  )

  return {
    state,
    streamsQuery,
    streams,
    selectedStream,
    selectedLevelId: state.selectedLevelId,
    levelsQuery,
    canBegin: canBegin(state),
    ...actions,
  }
}

export default { useMissionSelection }