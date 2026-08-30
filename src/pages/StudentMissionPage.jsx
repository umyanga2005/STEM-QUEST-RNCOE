import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Navigate, useNavigate } from 'react-router'
import { useMissionSelection } from '../features/mission/selection/use-mission-selection.js'
import { SELECTION_STEP } from '../features/mission/selection/selection-state.js'
import { isExpiredSession } from '../features/mission/session-guard.js'
import tokenStorage from '../features/student/session/token-storage.js'
import { useStudentMe } from '../features/student/api/queries.js'
import StreamIcon, { STREAM_ASSETS, GAME_ASSETS } from './stream-icons.jsx'
import './student-mission.css'

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STATUS_LABEL = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  'not-started': 'Available',
}

// Winding path layout constants
const MAP_W = 300          // SVG/container width in px
const NODE_R = 36          // node bubble radius in px
const VERT_STEP = 140      // px between node centres vertically
const X_LEFT = 72          // left column centre x
const X_RIGHT = MAP_W - 72 // right column centre x
const TOP_PAD = 64         // padding above first node
const BOT_PAD = 80         // padding below last node

// Portal transition timings (ms) — must stay in sync with the animation
// durations passed to Framer Motion below.
const PORTAL_ENTER_MS = 550
const PORTAL_EXIT_MS = 480
const PORTAL_ANGLES = Array.from({ length: 14 }, (_, i) => (360 / 14) * i)

/* ─── Path builder ────────────────────────────────────────────────────────
   Produces a smooth bezier path through the node centres.
   Each segment is a cubic bezier: control points keep the same x as their
   anchor, meeting at the midpoint y — this creates the classic S-curve.
────────────────────────────────────────────────────────────────────────── */
function buildPath(pts) {
  if (!pts || pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const midY = (prev.y + curr.y) / 2
    d += ` C ${prev.x} ${midY} ${curr.x} ${midY} ${curr.x} ${curr.y}`
  }
  return d
}

/* ─── LevelMap ────────────────────────────────────────────────────────────
   Candy Crush-style winding map with SVG bezier path + island node buttons.
────────────────────────────────────────────────────────────────────────── */
function LevelMap({ levels, onChooseLevel, streamColor }) {
  const accentColor = streamColor || '#2dd4bf'

  const svgH = TOP_PAD + Math.max(0, levels.length - 1) * VERT_STEP + BOT_PAD
  const containerH = svgH + 20 // a little extra for the label of the bottom node

  // Compute node centres. Levels alternate right → left (start at right so
  // Level 1 is on the right, drawing the eye to the "first step" naturally).
  // Level 1 (i=0) sits at the BOTTOM of the map, ascending toward the final
  // level at the top — matches the "climb the mission" visual metaphor.
  const nodePositions = levels.map((_, i) => ({
    x: i % 2 === 0 ? X_RIGHT : X_LEFT,
    y: svgH - BOT_PAD - i * VERT_STEP,
  }))

  // Full path (all nodes) — rendered in muted colour for locked sections
  const fullPath = buildPath(nodePositions)

  // Active path: from level 1 up to (and including) the last non-locked node
  const lastActive = (() => {
    let last = -1
    levels.forEach((lv, i) => {
      if (lv.status === 'completed' || lv.selectable) last = i
    })
    return last
  })()
  const activePath = lastActive >= 1
    ? buildPath(nodePositions.slice(0, lastActive + 1))
    : ''

  return (
    <div className="sm-map-wrap">
      <div className="sm-map" style={{ height: containerH }}>

        {/* ── SVG path lines ──────────────────────────────────────────── */}
        <svg
          className="sm-map-svg"
          width={MAP_W}
          height={svgH}
          viewBox={`0 0 ${MAP_W} ${svgH}`}
          aria-hidden="true"
        >
          {/* Dashed inactive track */}
          <path
            d={fullPath}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 14"
          />
          {/* Solid glow for active section */}
          {activePath && (
            <>
              <path
                d={activePath}
                fill="none"
                stroke={accentColor}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.22}
              />
              <path
                d={activePath}
                fill="none"
                stroke={accentColor}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
              />
            </>
          )}
        </svg>

        {/* ── Level node buttons ───────────────────────────────────────── */}
        {levels.map((level, i) => {
          const { x, y } = nodePositions[i]
          const isCompleted = level.status === 'completed'
          const isLocked = !level.selectable && !isCompleted
          const isAvailable = level.selectable && !isCompleted

          const nodeImg = isCompleted
            ? GAME_ASSETS.levelComplete
            : isLocked
            ? GAME_ASSETS.levelLocked
            : GAME_ASSETS.levelAvailable

          const stateClass = isCompleted
            ? 'sm-map-node--completed'
            : isLocked
            ? 'sm-map-node--locked'
            : 'sm-map-node--available'

          return (
            <button
              key={level.id}
              type="button"
              className={`sm-map-node ${stateClass}`}
              disabled={isLocked}
              onClick={() => onChooseLevel(level)}
              aria-label={`Level ${level.number}: ${level.name} — ${isLocked ? 'Locked' : STATUS_LABEL[level.status] || 'Available'}`}
              style={{ left: x, top: y, '--accent': accentColor }}
            >
              {/* Star badge for completed levels */}
              {isCompleted && (
                <span className="sm-map-node__stars" aria-hidden="true">⭐</span>
              )}

              {/* Bubble (the circular icon) */}
              <span className="sm-map-node__bubble" aria-hidden="true">
                {nodeImg ? (
                  <img src={nodeImg} alt="" className="sm-map-node__img" />
                ) : (
                  <span className="sm-map-node__fallback">
                    {isLocked ? '🔒' : isCompleted ? '✓' : level.number}
                  </span>
                )}
              </span>

              {/* Level number badge */}
              <span className="sm-map-node__badge" aria-hidden="true">
                {level.number}
              </span>

              {/* Name label below bubble */}
              <span className="sm-map-node__label">
                <span className="sm-map-node__name">{level.name}</span>
                <span className={`sm-map-node__status sm-map-node__status--${isLocked ? 'locked' : level.status}`}>
                  {isLocked ? 'Locked' : STATUS_LABEL[level.status] || 'Available'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── ProgressStrip ─────────────────────────────────────────────────────── */
function ProgressStrip({ active }) {
  const steps = ['Register', 'Choose stream', 'Launch mission']
  return (
    <div className="sm-progress" role="presentation">
      {steps.map((label, i) => (
        <span key={label} className="sm-progress__item">
          <span
            className={`sm-progress__dot${i + 1 === active ? ' sm-progress__dot--active' : ''}`}
            aria-hidden="true"
          />
          <span
            className={`sm-progress__label${i + 1 === active ? ' sm-progress__label--active' : ''}`}
          >
            {i + 1} · {label}
          </span>
        </span>
      ))}
    </div>
  )
}

export { ProgressStrip }

/* ─── PortalOverlay ─────────────────────────────────────────────────────────
   Full-screen "entering the world" vortex/flash played between picking a
   stream and the level map appearing. `phase` drives whether the burst is
   opening (enter) or dissolving away to reveal the map underneath (exit).
────────────────────────────────────────────────────────────────────────── */
function PortalOverlay({ stream, phase }) {
  const assets = STREAM_ASSETS[stream?.slug] || {}
  const color = assets.color || '#2dd4bf'
  const isEnter = phase === 'enter'
  const burstTransition = {
    duration: isEnter ? PORTAL_ENTER_MS / 1000 : PORTAL_EXIT_MS / 1000,
    ease: isEnter ? 'easeOut' : 'easeIn',
  }

  return (
    <motion.div
      className="sm-portal"
      style={{ '--portal-color': color }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }}
      transition={{ duration: 0.12 }}
      role="status"
      aria-label={`Entering ${stream?.name || 'world'}`}
    >
      <motion.div
        className="sm-portal__wash"
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={isEnter ? { scale: 1.9, opacity: 1 } : { scale: 3.2, opacity: 0 }}
        transition={burstTransition}
      />

      <motion.div
        className="sm-portal__ring sm-portal__ring--a"
        initial={{ rotate: 0, scale: 0.6, opacity: 0 }}
        animate={
          isEnter
            ? { rotate: 200, scale: 1, opacity: 0.85 }
            : { rotate: 340, scale: 1.5, opacity: 0 }
        }
        transition={burstTransition}
      />
      <motion.div
        className="sm-portal__ring sm-portal__ring--b"
        initial={{ rotate: 0, scale: 0.6, opacity: 0 }}
        animate={
          isEnter
            ? { rotate: -240, scale: 1, opacity: 0.65 }
            : { rotate: -380, scale: 1.5, opacity: 0 }
        }
        transition={burstTransition}
      />

      <motion.div
        className="sm-portal__flash"
        initial={{ opacity: 0 }}
        animate={isEnter ? { opacity: [0, 0, 0.85, 0] } : { opacity: 0 }}
        transition={{ duration: PORTAL_ENTER_MS / 1000, times: [0, 0.55, 0.72, 1] }}
      />

      <div className="sm-portal__particles" aria-hidden="true">
        {PORTAL_ANGLES.map((angle, i) => (
          <span key={angle} className="sm-portal__particle-slot" style={{ '--angle': `${angle}deg` }}>
            <motion.span
              className="sm-portal__particle"
              initial={{ opacity: 0, scale: 0 }}
              animate={
                isEnter
                  ? { opacity: [0, 1, 0], scale: [0, 1, 0.4] }
                  : { opacity: 0, scale: 0 }
              }
              transition={{ duration: PORTAL_ENTER_MS / 1000, delay: (i % 4) * 0.03, ease: 'easeOut' }}
            />
          </span>
        ))}
      </div>

      {assets.bg ? (
        <motion.img
          src={assets.bg}
          alt=""
          className="sm-portal__badge"
          initial={{ scale: 0.3, opacity: 0, rotate: -12 }}
          animate={
            isEnter
              ? { scale: 1.1, opacity: 1, rotate: 0 }
              : { scale: 1.6, opacity: 0, rotate: 8 }
          }
          transition={burstTransition}
        />
      ) : null}

      <motion.p
        className="sm-portal__label"
        initial={{ opacity: 0, y: 10 }}
        animate={isEnter ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.3, delay: isEnter ? 0.15 : 0 }}
        aria-hidden="true"
      >
        Entering {stream?.name}…
      </motion.p>
    </motion.div>
  )
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function StudentMissionPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [token, setToken] = useState(() => tokenStorage.read())
  const me = useStudentMe(token)
  const selection = useMissionSelection(token)
  const [portal, setPortal] = useState(null) // { stream, phase: 'enter' | 'exit' } | null

  useEffect(() => {
    if (isExpiredSession(selection.streamsQuery, token)) {
      tokenStorage.clear()
      setToken(null)
    }
  }, [selection.streamsQuery, token])

  // Drives the portal transition: burst open, swap the underlying selection
  // state at the flash's peak (hidden behind the overlay), then dissolve the
  // overlay away to reveal the level map that's now rendered underneath.
  useEffect(() => {
    if (!portal) return undefined
    if (portal.phase === 'enter') {
      const timer = setTimeout(() => {
        selection.chooseStream(portal.stream)
        setPortal((p) => (p ? { ...p, phase: 'exit' } : p))
      }, PORTAL_ENTER_MS)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => setPortal(null), PORTAL_EXIT_MS)
    return () => clearTimeout(timer)
  }, [portal, selection])

  const handleSelectStream = (stream) => {
    if (reduceMotion) {
      selection.chooseStream(stream)
      return
    }
    setPortal({ stream, phase: 'enter' })
  }

  if (!token) {
    return <Navigate to="/student/register" replace />
  }

  return (
    <main className="sm-page">
      <div className="sm-glow" aria-hidden="true" />
      <div className="sm-particles" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="sm-particle"
            style={{
              left: `${(i * 8.5) % 100}%`,
              animationDuration: `${6 + (i % 5) * 2}s`,
              animationDelay: `${(i % 3) * 1.5}s`,
            }}
          />
        ))}
      </div>

      <div className="sm-header-banner">
        <header className="sm-header">
          <div className="sm-header__brand">
            <h1>STEM QUEST</h1>
            {me.data?.student ? (
              <p className="sm-greeting">Welcome Explorer {me.data.student.name}! Choose your portal.</p>
            ) : null}
          </div>
        </header>
      </div>

      <div className="sm-card">
        {selection.streamsQuery.isLoading ? (
          <p className="sm-status" role="status">
            Initializing Gaming Portals…
          </p>
        ) : selection.streamsQuery.isError ? (
          <div className="sm-error" role="alert">
            <p>We couldn't load your mission right now.</p>
            <button
              type="button"
              className="sm-button sm-button--ghost"
              onClick={() => selection.streamsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : (
          <StepView
            reduceMotion={reduceMotion}
            selection={selection}
            onSelectStream={handleSelectStream}
            onBegin={() =>
              navigate('/student/game', {
                state: {
                  streamId: selection.selectedStreamId,
                  levelId: selection.selectedLevelId,
                },
              })
            }
          />
        )}
      </div>

      <AnimatePresence>
        {portal ? <PortalOverlay stream={portal.stream} phase={portal.phase} /> : null}
      </AnimatePresence>
    </main>
  )
}

function StepView({ reduceMotion, selection, onSelectStream, onBegin }) {
  const { state } = selection
  if (state.step === SELECTION_STEP.LEVELS || state.step === SELECTION_STEP.READY) {
    if (!selection.selectedStream) {
      return <StreamPicker reduceMotion={reduceMotion} selection={selection} onSelectStream={onSelectStream} />
    }
    return (
      <LevelStep
        reduceMotion={reduceMotion}
        selection={selection}
        onBegin={onBegin}
      />
    )
  }
  return <StreamPicker reduceMotion={reduceMotion} selection={selection} onSelectStream={onSelectStream} />
}

/* ─── StreamPicker ──────────────────────────────────────────────────────── */
export function StreamPicker({ reduceMotion, selection, onSelectStream }) {
  const selectStream = onSelectStream || selection.chooseStream
  return (
    <motion.div
      className="sm-step"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <ProgressStrip active={2} />
      <h2 className="sm-title">Select Your World</h2>
      <p className="sm-subtitle">Step into a STEM domain to unlock levels and earn star badges.</p>

      <div className="sm-streams">
        {selection.streams.map((stream) => {
          const assets = STREAM_ASSETS[stream.slug] || {}
          return (
            <button
              key={stream.id}
              type="button"
              className="sm-stream"
              data-stream={stream.slug}
              onClick={() => selectStream(stream)}
              aria-label={`${stream.name} — ${stream.unlockedCount} of ${stream.levelCount} levels open`}
            >
              <div className="sm-stream__band" />
              {assets.loop ? (
                <video
                  className="sm-stream__video-bg"
                  src={assets.loop}
                  poster={assets.bg}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.28,
                    pointerEvents: 'none',
                  }}
                />
              ) : null}

              <div className="sm-stream__body" style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="sm-stream__icon">
                    <div className="sm-stream__icon-glow" />
                    {assets.logo ? (
                      <img
                        src={assets.logo}
                        alt={stream.name}
                        className="sm-stream__icon-img"
                      />
                    ) : assets.bg ? (
                      <img
                        src={assets.bg}
                        alt={stream.name}
                        className="sm-stream__icon-img"
                      />
                    ) : (
                      <StreamIcon slug={stream.slug} />
                    )}
                  </div>
                  <div>
                    <h3 className="sm-stream__name">{stream.name}</h3>
                    <span className="sm-stream__meta">
                      {stream.unlockedCount} / {stream.levelCount} Levels Unlocked
                    </span>
                  </div>
                </div>
                {stream.description ? (
                  <p className="sm-stream__desc">{stream.description}</p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ─── LevelStep ─────────────────────────────────────────────────────────── */
export function LevelStep({ reduceMotion, selection, onBegin }) {
  const { selectedStream, levelsQuery } = selection
  if (selection.state.step === SELECTION_STEP.READY) {
    return (
      <ReadyPanel
        reduceMotion={reduceMotion}
        selection={selection}
        onBegin={onBegin}
      />
    )
  }

  const streamAssets = STREAM_ASSETS[selectedStream?.slug] || {}
  const streamColor = streamAssets.color || '#2dd4bf'

  return (
    <motion.div
      className="sm-step"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <ProgressStrip active={3} /> {/* FIX: P3-002 — was stuck on step 2 after stream chosen */}
      <div className="sm-step__head">
        <button
          type="button"
          className="sm-button sm-button--link"
          onClick={selection.goBackToStreams}
        >
          ← All Worlds
        </button>
      </div>
      <h2 className="sm-title">{selectedStream.name} World Map</h2>
      <p className="sm-subtitle">Follow the quest path — tap an open level to begin.</p>

      {levelsQuery.isLoading ? (
        <p className="sm-status" role="status">
          Loading level map…
        </p>
      ) : levelsQuery.isError ? (
        <div className="sm-error" role="alert">
          <p>We couldn't load this stream's levels.</p>
          <button
            type="button"
            className="sm-button sm-button--ghost"
            onClick={() => levelsQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        /* ── Candy Crush–style winding level map ── */
        <LevelMap
          levels={levelsQuery.data.levels}
          onChooseLevel={selection.chooseLevel}
          streamColor={streamColor}
        />
      )}
    </motion.div>
  )
}

/* ─── ReadyPanel (unchanged) ─────────────────────────────────────────────── */
export function ReadyPanel({ reduceMotion, selection, onBegin }) {
  const { selectedStream, levelsQuery } = selection
  const level =
    levelsQuery.data?.levels.find((l) => Number(l.id) === Number(selection.selectedLevelId)) ?? null

  const [countdown, setCountdown] = useState(null)
  const streamAssets = STREAM_ASSETS[selectedStream?.slug] || {}

  const handleLaunch = () => {
    setCountdown(3)
  }

  useEffect(() => {
    if (countdown === null) return
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 700)
      return () => clearTimeout(timer)
    }
    if (countdown === 0) {
      onBegin()
    }
  }, [countdown, onBegin])

  return (
    <motion.div
      className="sm-step"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <ProgressStrip active={3} />
      <h2 className="sm-title">Ready for Launch?</h2>
      <div className="sm-ready">
        {streamAssets.logo ? (
          <div className="sm-ready__icon">
            <img src={streamAssets.logo} alt="" className="sm-ready__icon-img" />
          </div>
        ) : streamAssets.bg ? (
          <div className="sm-ready__icon">
            <img src={streamAssets.bg} alt="" className="sm-ready__icon-img" />
          </div>
        ) : (
          <div className="sm-ready__icon" aria-hidden="true">
            <StreamIcon slug={selectedStream.slug} />
          </div>
        )}
        <p className="sm-ready__stream">{selectedStream.name}</p>
        <p className="sm-ready__level">
          Level {level ? level.number : ''} · {level ? level.name : ''}
        </p>

        {countdown !== null ? (
          <div className="sm-countdown">{countdown === 0 ? 'GO!' : countdown}</div>
        ) : null}
      </div>

      <div className="sm-ready__actions">
        {countdown === null ? (
          <button type="button" className="sm-button sm-button--primary" onClick={handleLaunch}>
            🚀 BEGIN MISSION
          </button>
        ) : null}
        <button type="button" className="sm-button sm-button--ghost" onClick={selection.goBackToLevels}>
          Change Level
        </button>
        <button type="button" className="sm-button sm-button--link" onClick={selection.goBackToStreams}>
          Change Stream
        </button>
      </div>
    </motion.div>
  )
}
