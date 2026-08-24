import { useState } from 'react'
import RoundActivity from '../features/game-session/activity/activity-renderer.jsx'
import './admin.css'

export default function AdminActivityPreviewModal({ question, onClose }) {
  const [submitted, setSubmitted] = useState(false)
  const [userResponse, setUserResponse] = useState(null)

  if (!question) return null

  // Build client-safe round descriptor for the renderer
  const roundDescriptor = {
    activityType: question.activityType,
    prompt: question.prompt,
    hints: question.hints || [],
    activity: {
      activityType: question.activityType,
      prompt: question.prompt,
      instructions: question.instructions || '',
      payload: question.payload || {},
    },
  }

  const handleTestSubmit = (res) => {
    setUserResponse(res)
    setSubmitted(true)
  }

  return (
    <div className="adm-modal-backdrop" onClick={onClose}>
      <div className="adm-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="adm-modal-header">
          <div>
            <div className="adm-modal-tags">
              <span className="aq-type">{question.activityType?.replace(/-/g, ' ')}</span>
              <span className="aq-status aq-status--published">{question.status}</span>
              <span className="adm-tag">Grade {question.gradeMin}–{question.gradeMax}</span>
              <span className="adm-tag">★ {question.difficulty}</span>
            </div>
            <h3 className="adm-modal-title">{question.prompt || 'Activity Live Preview'}</h3>
          </div>
          <button type="button" className="adm-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        <div className="adm-modal-body">
          <div className="adm-preview-box">
            <RoundActivity
              round={roundDescriptor}
              disabled={submitted}
              submitted={submitted}
              onSubmit={handleTestSubmit}
            />
          </div>

          {submitted ? (
            <div className="adm-preview-feedback">
              <p>✔️ Test response captured: <code>{JSON.stringify(userResponse)}</code></p>
              <button
                type="button"
                className="aq-btn aq-btn--primary"
                onClick={() => {
                  setSubmitted(false)
                  setUserResponse(null)
                }}
              >
                Reset Activity Test
              </button>
            </div>
          ) : null}
        </div>

        <footer className="adm-modal-footer">
          <span className="adm-footnote">Admin Activity Sandbox Preview Mode</span>
          <button type="button" className="aq-btn" onClick={onClose}>
            Close Preview
          </button>
        </footer>
      </div>
    </div>
  )
}
