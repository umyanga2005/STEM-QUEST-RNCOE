import { useState, useMemo } from 'react'
import RoundActivity from '../features/game-session/activity/activity-renderer.jsx'
import { getClientEngine } from '../features/admin-questions/validation/validate-draft.js'
import './admin.css'
import './admin-modal.css'

function OfficialCorrectAnswerView({ question }) {
  if (!question || !question.correctAnswer) {
    return (
      <div className="adm-answer-card">
        <h4>🎯 Official Correct Answer (Admin View)</h4>
        <p className="adm-answer-empty">No explicit correct answer specified on this question object.</p>
      </div>
    )
  }

  const { activityType, payload = {}, correctAnswer = {} } = question

  const formatAnswerDetails = () => {
    try {
      if (activityType === 'drag-drop') {
        const mappings = correctAnswer.mappings || []
        const itemMap = new Map((payload.items || []).map((i) => [i.id, i.label]))
        const zoneMap = new Map((payload.zones || []).map((z) => [z.id, z.label]))
        if (mappings.length > 0) {
          return (
            <ul className="adm-answer-list">
              {mappings.map((m, idx) => (
                <li key={idx}>
                  <strong className="adm-answer-item">{itemMap.get(m.itemId) || m.itemId}</strong>
                  <span className="adm-answer-arrow"> ➔ </span>
                  <span className="adm-answer-target">{zoneMap.get(m.zoneId) || m.zoneId}</span>
                </li>
              ))}
            </ul>
          )
        }
      }

      if (activityType === 'matching') {
        const pairs = correctAnswer.pairs || []
        const leftMap = new Map((payload.leftCards || payload.items || []).map((c) => [c.id, c.text || c.label]))
        const rightMap = new Map((payload.rightTargets || payload.targets || []).map((t) => [t.id, t.text || t.label]))
        if (pairs.length > 0) {
          return (
            <ul className="adm-answer-list">
              {pairs.map((p, idx) => (
                <li key={idx}>
                  <strong className="adm-answer-item">{leftMap.get(p.leftId) || p.leftId}</strong>
                  <span className="adm-answer-arrow"> ➔ </span>
                  <span className="adm-answer-target">{rightMap.get(p.rightId) || p.rightId}</span>
                </li>
              ))}
            </ul>
          )
        }
      }

      if (activityType === 'ordering') {
        const seq = correctAnswer.sequence || correctAnswer.order || []
        const itemMap = new Map((payload.items || []).map((i) => [i.id, i.label || i.text]))
        if (seq.length > 0) {
          return (
            <ol className="adm-answer-ol">
              {seq.map((id, idx) => (
                <li key={idx}>
                  <strong>{itemMap.get(id) || id}</strong>
                </li>
              ))}
            </ol>
          )
        }
      }

      if (activityType === 'sorting') {
        const buckets = correctAnswer.buckets || correctAnswer.categories || {}
        const catMap = new Map((payload.categories || []).map((c) => [c.id, c.label]))
        const itemMap = new Map((payload.items || []).map((i) => [i.id, i.label]))
        const entries = Object.entries(buckets)
        if (entries.length > 0) {
          return (
            <div className="adm-answer-group">
              {entries.map(([catId, itemIds]) => (
                <div key={catId} className="adm-answer-bucket">
                  <span className="adm-answer-bucket-title">{catMap.get(catId) || catId}:</span>
                  <span className="adm-answer-bucket-items">
                    {(Array.isArray(itemIds) ? itemIds : [itemIds])
                      .map((id) => itemMap.get(id) || id)
                      .join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )
        }
      }

      if (activityType === 'fill-complete') {
        const blanks = correctAnswer.blanks || correctAnswer.answers || {}
        const entries = typeof blanks === 'object' ? Object.entries(blanks) : []
        if (entries.length > 0) {
          return (
            <ul className="adm-answer-list">
              {entries.map(([key, val]) => (
                <li key={key}>
                  <strong className="adm-answer-item">Blank [{key}]:</strong>
                  <span className="adm-answer-target">{Array.isArray(val) ? val.join(' / ') : String(val)}</span>
                </li>
              ))}
            </ul>
          )
        }
      }

      if (activityType === 'pattern') {
        const nextVal = correctAnswer.nextValue ?? correctAnswer.targetValue ?? correctAnswer.answer
        const rule = correctAnswer.rule || payload.rule
        return (
          <div className="adm-answer-simple">
            Target Value: <strong>{String(nextVal)}</strong>
            {rule ? <span> (Rule: {rule})</span> : null}
          </div>
        )
      }

      if (activityType === 'memory') {
        const pairs = correctAnswer.pairs || correctAnswer.groups || []
        const cardMap = new Map((payload.cards || []).map((c) => [c.id, c.text || c.label]))
        if (pairs.length > 0) {
          return (
            <ul className="adm-answer-list">
              {pairs.map((p, idx) => (
                <li key={idx}>
                  Pair {idx + 1}: <strong>{cardMap.get(p[0]) || p[0]}</strong> ↔ <strong>{cardMap.get(p[1]) || p[1]}</strong>
                </li>
              ))}
            </ul>
          )
        }
      }

      if (activityType === 'scenario-challenge') {
        // FIX: P1-004 — real payload shape is decisions[].options[], and the
        // real correct-answer shape is optimalPath[].{decisionId,optionId}
        // (verified against live data), not a flat options[]/correctOptionId.
        const decisions = payload.decisions || []
        const optimalPath = correctAnswer.optimalPath || []
        return (
          <div className="adm-answer-simple">
            {optimalPath.length > 0 ? (
              <ol className="adm-answer-list">
                {optimalPath.map((step, i) => {
                  const decision = decisions.find((d) => d.id === step.decisionId)
                  const opt = decision?.options?.find((o) => o.id === step.optionId)
                  return (
                    <li key={step.decisionId ?? i}>
                      {decision?.text ? `${decision.text} → ` : ''}
                      <strong>{opt?.text || opt?.label || step.optionId}</strong>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <span>No optimal path specified on this question object.</span>
            )}
          </div>
        )
      }

      if (activityType === 'number-logic') {
        const targetVal = correctAnswer.targetValue ?? correctAnswer.answer ?? correctAnswer.value
        return (
          <div className="adm-answer-simple">
            Numeric Solution: <strong>{String(targetVal)}</strong>
          </div>
        )
      }
    } catch {
      // Fall through to JSON rendering
    }

    return <pre className="adm-preview-json">{JSON.stringify(correctAnswer, null, 2)}</pre>
  }

  return (
    <div className="adm-answer-card">
      <h4>🎯 Official Correct Answer (Admin View)</h4>
      {formatAnswerDetails()}
    </div>
  )
}

export default function AdminActivityPreviewModal({ question, onClose }) {
  const [submitted, setSubmitted] = useState(false)
  const [userResponse, setUserResponse] = useState(null)

  const roundDescriptor = useMemo(() => {
    if (!question) return null
    try {
      const engine = getClientEngine()
      const renderDescriptor = engine.has(question.activityType)
        ? engine.render(question.activityType, {
          question: {
            prompt: question.prompt || '',
            instructions: question.instructions || '',
            payload: question.payload || {},
          },
        })
        : {
          activityType: question.activityType,
          prompt: question.prompt || '',
          instructions: question.instructions || '',
          payload: question.payload || {},
        }

      return {
        activityType: question.activityType,
        prompt: question.prompt,
        hints: question.hints || [],
        activity: renderDescriptor,
      }
    } catch (err) {
      console.warn('Failed to build render descriptor for preview:', err)
      return {
        activityType: question.activityType,
        prompt: question.prompt,
        hints: question.hints || [],
        activity: {
          activityType: question.activityType,
          prompt: question.prompt || '',
          instructions: question.instructions || '',
          payload: question.payload || {},
        },
      }
    }
  }, [question])

  if (!question) return null

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
            {roundDescriptor ? (
              <RoundActivity
                round={roundDescriptor}
                disabled={submitted}
                submitted={submitted}
                onSubmit={handleTestSubmit}
              />
            ) : (
              <p className="aq-preview__empty">Could not load preview descriptor for this question.</p>
            )}
          </div>

          <OfficialCorrectAnswerView question={question} />

          {submitted ? (
            <div className="adm-preview-feedback">
              <p>✔️ Test response captured:</p>
              <pre className="adm-preview-json">{JSON.stringify(userResponse, null, 2)}</pre>
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
