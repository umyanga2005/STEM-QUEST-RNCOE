/**
 * Game Session — display-only countdown timer (Task 5.3).
 *
 * The timer is UX ONLY: backend timestamps decide overtime and scoring
 * (D-023/D-027). This hook never submits, never scores, and never derives
 * correctness — it only counts down from the descriptor's UX `timer` config
 * and reports a tone so the page can style/announce warning and critical
 * states. On expiry the student may still answer and submit; the server
 * applies the overtime penalty from its own clock.
 *
 * Pure of DOM side effects except the interval (browser-only); on a server
 * render (SSR) it reports the initial allowed seconds.
 */

import { useEffect, useState } from 'react'

const CRITICAL_SECONDS = 5
const WARNING_SECONDS = 15
const WARNING_FRACTION = 0.25

export function useCountdown({ allowedSeconds = 0, running = true, resetKey = null }) {
  const initial = Math.max(0, Number(allowedSeconds) || 0)
  const [remaining, setRemaining] = useState(initial)

  useEffect(() => {
    if (!running) return
    const total = Math.max(0, Number(allowedSeconds) || 0)
    setRemaining(total)
    if (total <= 0) return
    const deadline = Date.now() + total * 1000
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    }, 500)
    return () => clearInterval(id)
  }, [allowedSeconds, running, resetKey])

  const fraction = initial > 0 ? remaining / initial : 0
  const tone =
    remaining <= CRITICAL_SECONDS
      ? 'critical'
      : remaining <= WARNING_SECONDS || fraction <= WARNING_FRACTION
        ? 'warning'
        : 'ok'

  return {
    remaining,
    fraction,
    tone,
    expired: remaining <= 0,
  }
}

export default useCountdown