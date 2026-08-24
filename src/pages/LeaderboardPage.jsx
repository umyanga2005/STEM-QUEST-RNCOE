import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import { useLeaderboards, useLiveLeaderboard } from '../features/leaderboard/queries/queries.js'
import tokenStorage from '../features/student/session/token-storage.js'
import StreamIcon, { STREAM_ASSETS } from './stream-icons.jsx'
import './leaderboard.css'

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

function AnimatedScore({ score, reduceMotion }) {
  const [displayed, setDisplayed] = useState(0)
  const prevScore = useRef(0)

  useEffect(() => {
    const from = prevScore.current
    prevScore.current = score
    if (reduceMotion || from === score) {
      setDisplayed(score)
      return
    }
    const duration = 800
    const startTime = performance.now()
    let raf

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + (score - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [score, reduceMotion])

  return <span className="lb-score">{displayed} pts</span>
}

export function QuadrantBoard({ stream, entries }) {
  const topScore = entries && entries.length > 0 ? Math.max(...entries.map((e) => e.score)) : 100
  const reduceMotion = useReducedMotion()
  const streamAsset = STREAM_ASSETS[stream.slug] || {}

  return (
    <div
      className="lb-quadrant"
      style={
        streamAsset.bg
          ? {
              backgroundImage: `linear-gradient(rgba(7,16,33,0.83), rgba(7,16,33,0.96)), url(${streamAsset.bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <header className="lb-quadrant__head">
        <div className="lb-quadrant__icon">
          {streamAsset.bg ? (
            <img
              src={streamAsset.bg}
              alt=""
              style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 8 }}
            />
          ) : (
            <StreamIcon slug={stream.slug} />
          )}
        </div>
        <div>
          <h3 className="lb-quadrant__title">{stream.name}</h3>
          <span className="lb-quadrant__sub">Live Top 5 Ranking</span>
        </div>
      </header>

      {!entries || entries.length === 0 ? (
        <div className="lb-quadrant__empty">
          <p>No scores logged yet.</p>
          <span className="lb-quadrant__hint">Be the first to complete a mission!</span>
        </div>
      ) : (
        <div className="lb-quadrant__list">
          {entries.slice(0, 5).map((entry, idx) => {
            const pct = Math.min(100, Math.max(10, Math.round((entry.score / (topScore || 1)) * 100)))
            const isFirst = entry.rank === 1
            return (
              <motion.div
                key={entry.rank}
                className={`lb-quad-row${entry.self ? ' lb-quad-row--self' : ''}${isFirst ? ' lb-quad-row--first' : ''}`}
                initial={reduceMotion ? false : { opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.38, delay: idx * 0.08, ease: 'easeOut' }}
              >
                <span className={`lb-rank__n lb-rank__n--${entry.rank}`}>
                  {isFirst ? <span className="lb-crown" aria-label="1st place">👑</span> : entry.rank}
                </span>
                <div className="lb-quad-row__body">
                  <div className="lb-quad-row__info">
                    <span className={`lb-name${isFirst ? ' lb-name--first' : ''}`}>
                      {entry.displayName}
                    </span>
                    <AnimatedScore score={entry.score} reduceMotion={reduceMotion} />
                  </div>
                  <div className="lb-bar-bg">
                    <motion.div
                      className={`lb-bar-fill${isFirst ? ' lb-bar-fill--first' : ''}`}
                      initial={{ width: '0%' }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.85, delay: idx * 0.08 + 0.15, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const [token] = useState(() => tokenStorage.read())
  const leaderboardsQuery = useLeaderboards(token)
  const live = useLiveLeaderboard({ enabled: true })
  const leaderboards = useMemo(() => leaderboardsQuery.data?.leaderboards ?? [], [leaderboardsQuery.data])

  return (
    <main className="lb-page lb-page--fullscreen">
      <div className="lb-glow" aria-hidden="true" />

      <header className="lb-fullscreen-header">
        <div className="lb-header__row">
          <h1>STEM QUEST — LIVE LEADERBOARD ARENA</h1>
          <LiveBadge live={live} />
        </div>
        <div className="lb-header__actions">
          <Link className="lb-link" to={token ? '/student/mission' : '/student/register'}>
            {token ? 'Back to your mission' : 'Join the quest'}
          </Link>
        </div>
      </header>

      {leaderboardsQuery.isLoading ? (
        <div className="lb-quad-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="lb-quadrant lb-skeleton">
              <p>Loading leaderboard stats…</p>
            </div>
          ))}
        </div>
      ) : leaderboards.length > 0 ? (
        <div className="lb-quad-grid">
          {leaderboards.map((board) => (
            <QuadrantBoard
              key={board.stream.id}
              stream={board.stream}
              entries={board.entries}
            />
          ))}
        </div>
      ) : (
        <div className="lb-empty">
          <p>No leaderboards available right now.</p>
        </div>
      )}
    </main>
  )
}