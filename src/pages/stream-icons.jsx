import scienceBg from '../assets/streams/science-bg.png'
import scienceLoop from '../assets/streams/science-loop.mp4'
import techBg from '../assets/streams/tech-bg.png'
import techLoop from '../assets/streams/tech-loop.mp4'
import engineeringBg from '../assets/streams/engineering-bg.png'
import engineeringLoop from '../assets/streams/engineering-loop.mp4'
import mathsBg from '../assets/streams/maths-bg.png'
import mathsLoop from '../assets/streams/maths-loop.mp4'

// Round themed logo badges — used as stream card icons
import scienceLogo from '../assets/streams/Science-Rectangular-Stream-Images-with-Round-Themed-Logos.png'
import techLogo from '../assets/streams/Technology-Rectangular-Stream-Images-with-Round-Themed-Logos.png'
import engineeringLogo from '../assets/streams/Engineer-Rectangular-Stream-Images-with-Round-Themed-Logos.png'
import mathsLogo from '../assets/streams/Mathematics-Rectangular-Stream-Images-with-Round-Themed-Logos.png'

import levelLockedImg from '../assets/game/level-locked.png'
import levelAvailableImg from '../assets/game/level-available.png'
import levelCompleteImg from '../assets/game/level-complete.png'
import victoryBg from '../assets/game/victory-bg.png'
import gameOverBg from '../assets/game/gameover-bg.png'
import gameHudLoop from '../assets/game/game-hud-bg.mp4'

export const STREAM_ASSETS = {
  science: { bg: scienceBg, loop: scienceLoop, logo: scienceLogo, color: '#38bdf8' },
  technology: { bg: techBg, loop: techLoop, logo: techLogo, color: '#a855f7' },
  engineering: { bg: engineeringBg, loop: engineeringLoop, logo: engineeringLogo, color: '#f59e0b' },
  mathematics: { bg: mathsBg, loop: mathsLoop, logo: mathsLogo, color: '#fbbf24' },
}

export const GAME_ASSETS = {
  levelLocked: levelLockedImg,
  levelAvailable: levelAvailableImg,
  levelComplete: levelCompleteImg,
  victoryBg: victoryBg,
  gameOverBg: gameOverBg,
  gameHudLoop: gameHudLoop,
}

const PATHS = {
  science: (
    <>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
    </>
  ),
  technology: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </>
  ),
  engineering: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="8.5" strokeDasharray="2.4 3" />
    </>
  ),
  mathematics: (
    <>
      <path d="M5 4h14M5 4l14 16M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 12h9" />
    </>
  ),
}

const FALLBACK = <path d="M12 12h.01" strokeLinecap="round" />

export function StreamIcon({ slug, size = 44, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[slug] ?? FALLBACK}
    </svg>
  )
}

export default StreamIcon