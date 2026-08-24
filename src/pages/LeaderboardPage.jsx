import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { useLeaderboards, useLiveLeaderboard } from '../features/leaderboard/queries/queries.js'
import tokenStorage from '../features/student/session/token-storage.js'
import StreamIcon from './stream-icons.jsx'
import './leaderboard.css'

/**
 * Task 5.7 — Live Stream Leaderboard.
 *
 * Public top-10 boards for the four STEM streams, refreshed live over the
 * approved Realtime channel (D-080). The page works with or without a
 * session: a valid token adds the server-derived "you" highlight on the
 * caller's own entry. Presentation only — scores/ranks/display names are
 * always decided and served by the backend; the client renders, never writes.
 */

export function LiveBadge({ live }) {
  const status = live.status ?? 'connecting'
  const label =
    status === 'live' ? 'Live' : status === 'reconnecting' ? 'Reconnecting…' : 'Live updates off'
  const tone =
    status === 'live' ? 'lb-live--on' : status === 'reconnecting' ? 'lb-live--pending' : 'lb-live--off'
  return (
    <span className={`lb-live ${tone}`} role="status">
      <span className="lb-live__dot" aria-hidden="true" />
      {label}
    </span>
  )
}

export function LeaderboardTable({ stream, entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="lb-empty">
        <StreamIcon slug={stream.slug} />
        <p>No scores yet on the {stream.name} board.</p>
        <p className="lb-empty__hint">Complete a mission to appear here!</p>
      </div>
    )
  }
  return (
    <table className="lb-table" aria-label={`${stream.name} leaderboard — Top 10`}>
      <caption className="lb-caption">
        {stream.name} · Top 10
      </caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Student</th>
          <th scope="col" className="lb-table__score">
            Score
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr
            key={entry.rank}
            className={`lb-row${entry.self ? ' lb-row--self' : ''}`}
            data-self={entry.self ? 'true' : 'false'}
            aria-label={entry.self ? `${entry.rank}. ${entry.displayName}, ${entry.score} points — you` : undefined}
          >
            <td className="lb-rank" aria-label={`Rank ${entry.rank}`}>
              <span className={`lb-rank__n lb-rank__n--${entry.rank}`}>{entry.rank}</span>
            </td>
            <td className="lb-name">
              <span>{entry.displayName}</span>
              {entry.self ? <span className="lb-self">you</span> : null}
            </td>
            <td className="lb-score">{entry.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function LeaderboardSkeleton({ stream }) {
  return (
    <div className="lb-skeleton" aria-hidden="true">
      <p className="lb-skeleton__title">{stream.name} · Top 10</p>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
        <div key={i} className="lb-skeleton__row">
          <span className="lb-skeleton__cell" style={{ width: 18 }} />
          <span className="lb-skeleton__cell" style={{ width: '38%' }} />
          <span className="lb-skeleton__cell" style={{ width: 40 }} />
        </div>
      ))}
    </div>
  )
}

export function LeaderboardError({ message, onRetry }) {
  return (
    <div className="lb-error" role="alert">
      <p>{message}</p>
      <button type="button" className="lb-retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

/** Loading / error / empty status gate shared by the page (and future screens). */
export function LeaderboardStatus({ isLoading, isError, isEmpty, message, stream, onRetry }) {
  if (isLoading) return <LeaderboardSkeleton stream={stream} />
  if (isError || isEmpty) {
    return (
      <LeaderboardError
        message={message ?? (isEmpty ? 'No leaderboards are available right now.' : 'We couldn’t load the leaderboards right now.')}
        onRetry={onRetry}
      />
    )
  }
  return null
}

export function LeaderboardBoard({ leaderboards, selectedStreamId, onSelectStream, reduceMotion }) {
  const selected =
    leaderboards.find((board) => Number(board.stream.id) === Number(selectedStreamId)) ?? leaderboards[0] ?? null

  return (
    <div className="lb-board">
      <div className="lb-tabs" role="tablist" aria-label="Choose a stream leaderboard">
        {leaderboards.map((board) => {
          const active = selected ? Number(board.stream.id) === Number(selected.stream.id) : false
          return (
            <button
              key={board.stream.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`lb-tab${active ? ' lb-tab--active' : ''}`}
              onClick={() => onSelectStream(board.stream.id)}
              aria-label={`${board.stream.name} leaderboard`}
            >
              <span className="lb-tab__icon" aria-hidden="true">
                <StreamIcon slug={board.stream.slug} />
              </span>
              <span className="lb-tab__name">{board.stream.name}</span>
            </button>
          )
        })}
      </div>

      {selected ? (
        <motion.div
          key={selected.stream.id}
          className="lb-board__panel"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <LeaderboardTable stream={selected.stream} entries={selected.entries} />
        </motion.div>
      ) : null}
    </div>
  )
}

export default function LeaderboardPage() {
  const reduceMotion = useReducedMotion()
  const [token] = useState(() => tokenStorage.read())
  const leaderboardsQuery = useLeaderboards(token)
  const live = useLiveLeaderboard({ enabled: true })
  const [selectedStreamId, setSelectedStreamId] = useState(null)

  const leaderboards = useMemo(() => leaderboardsQuery.data?.leaderboards ?? [], [leaderboardsQuery.data])

  useEffect(() => {
    if (selectedStreamId == null && leaderboards.length > 0) {
      setSelectedStreamId(leaderboards[0].stream.id)
    }
  }, [selectedStreamId, leaderboards])

  const selected =
    leaderboards.find((board) => Number(board.stream.id) === Number(selectedStreamId)) ?? leaderboards[0] ?? null

  return (
    <main className="lb-page">
      <div className="lb-glow" aria-hidden="true" />
      <div className="lb-card">
        <header className="lb-header">
          <div className="lb-header__row">
            <h1>STEM QUEST</h1>
            <LiveBadge live={live} />
          </div>
          <p className="lb-subtitle">Live leaderboards across all four STEM streams.</p>
          <Link className="lb-link" to={token ? '/student/mission' : '/student/register'}>
            {token ? 'Back to your mission' : 'Join the quest'}
          </Link>
        </header>

        <LeaderboardStatus
          isLoading={leaderboardsQuery.isLoading}
          isError={leaderboardsQuery.isError}
          isEmpty={!leaderboardsQuery.isLoading && !leaderboardsQuery.isError && leaderboards.length === 0}
          stream={{ name: 'Loading' }}
          onRetry={() => leaderboardsQuery.refetch()}
        />

        {!leaderboardsQuery.isLoading && !leaderboardsQuery.isError && leaderboards.length > 0 ? (
          <LeaderboardBoard
            leaderboards={leaderboards}
            selectedStreamId={selected?.stream.id ?? null}
            onSelectStream={setSelectedStreamId}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </div>
    </main>
  )
}