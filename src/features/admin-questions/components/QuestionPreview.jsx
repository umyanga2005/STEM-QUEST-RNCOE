import { useMemo } from 'react'
import RoundActivity from '../../game-session/activity/activity-renderer.jsx'
import { getClientEngine } from '../validation/validate-draft.js'

/**
 * Admin Question Builder — Live Interactive Activity Preview (Task 5.10).
 *
 * Renders the actual student-visible activity component through RoundActivity.
 * Uses the client-safe engine descriptor — correctAnswer is NEVER exposed.
 */
export default function QuestionPreview({ draft }) {
  const roundDescriptor = useMemo(() => {
    if (!draft || !draft.activityType) return null
    try {
      const engine = getClientEngine()
      if (!engine.has(draft.activityType)) return null
      const renderDescriptor = engine.render(draft.activityType, {
        question: {
          prompt: draft.prompt || '',
          instructions: draft.instructions || '',
          payload: draft.payload || {},
        },
      })
      return {
        activityType: draft.activityType,
        prompt: draft.prompt,
        hints: draft.hints || [],
        activity: renderDescriptor,
      }
    } catch {
      return null
    }
  }, [draft])

  if (!roundDescriptor) {
    return <p className="aq-preview__empty">Choose an activity type and complete required fields to see live interactive preview.</p>
  }

  return (
    <div className="aq-preview" style={{ background: 'rgba(5, 10, 24, 0.7)', borderRadius: 16, padding: '1rem', border: '1px solid rgba(79, 139, 255, 0.2)' }}>
      <RoundActivity round={roundDescriptor} disabled={false} onSubmit={() => {}} />
    </div>
  )
}
