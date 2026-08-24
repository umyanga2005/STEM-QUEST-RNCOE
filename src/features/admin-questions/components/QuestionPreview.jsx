import { useEffect, useMemo, useState } from 'react'
import { getClientEngine } from '../validation/validate-draft.js'
import { questionApiClient, tokenFor, MEDIA_REF_CLIENT_PATTERN } from '../client/client.js'

/**
 * Admin Question Builder — live payload preview (Task 5.10).
 *
 * Renders the student-visible side of the draft using the client-safe engine
 * `render` descriptor (payload only). correctAnswer is NEVER passed to the
 * engine — the draft is reduced to its student-visible fields first — so no
 * correctness data can reach the preview (SECURITY_CORRECT_ANSWER_EXPOSED
 * would throw if a correctAnswer key ever slipped through).
 */

function studentVisibleQuestion(draft) {
  return {
    prompt: draft.prompt ?? '',
    instructions: draft.instructions ?? '',
    payload: draft.payload ?? {},
  }
}

function previewFrom(draft) {
  const engine = getClientEngine()
  if (!draft.activityType || !engine.has(draft.activityType)) return null
  try {
    return engine.render(draft.activityType, { question: studentVisibleQuestion(draft) })
  } catch {
    return null
  }
}

function textOf(value) {
  return typeof value === 'string' && value.trim() ? value : null
}

function cardText(card) {
  return textOf(card?.text) ?? textOf(card?.label) ?? (card?.image?.alt ?? null)
}

function ElementList({ items, label }) {
  if (!items?.length) return null
  return (
    <div className="aq-preview__group">
      {label ? <span className="aq-preview__group-label">{label}</span> : null}
      <ul className="aq-preview__items">
        {items.map((item) => (
          <li key={item.id} className="aq-preview__item">
            {item.image?.ref ? <PreviewImage ref={item.image.ref} alt={item.image.alt} /> : null}
            {cardText(item) ?? item.id}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Renders a real image via an admin-authenticated signed URL when one is
 * available; the ref-code placeholder otherwise. The URL comes from the admin
 * preview surface only — the student engine never sees it.
 */
function PreviewImage({ ref, alt }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    const candidate = ref && MEDIA_REF_CLIENT_PATTERN.test(ref) ? ref : null
    setUrl(null)
    if (!candidate) return undefined
    const token = tokenFor()
    if (!token) return undefined
    questionApiClient
      .mediaUrl(token, candidate)
      .then(({ url: signedUrl }) => {
        if (alive) setUrl(signedUrl)
      })
      .catch(() => {
        if (alive) setUrl(null)
      })
    return () => {
      alive = false
    }
  }, [ref])
  if (url) return <img className="aq-preview__image-img" src={url} alt={alt ?? 'Question image'} />
  return (
    <div className="aq-preview__image-box" role="img" aria-label={alt ?? ref ?? 'Question image'}>
      <code>{ref ?? 'question-media/…'}</code>
    </div>
  )
}

function ImagePlaceholder({ view }) {
  const alt = textOf(view.image?.alt)
  return (
    <figure className="aq-preview__image">
      <PreviewImage ref={view.image?.ref} alt={view.image?.alt} />
      {alt ? <figcaption>{alt}</figcaption> : null}
    </figure>
  )
}

function renderBody(view) {
  switch (view.kind) {
    case 'drag-drop':
      return (
        <>
          <ElementList items={view.items} label="Drag these" />
          <ElementList items={view.zones} label="Into these zones" />
        </>
      )
    case 'matching':
      return (
        <>
          <ElementList items={view.leftItems} label="Items" />
          <ElementList items={view.targets} label="Matches (shuffled)" />
        </>
      )
    case 'ordering':
      return <ElementList items={view.items} label="Order these" />
    case 'sorting':
      return (
        <>
          <ElementList items={view.items} label="Classify these" />
          <ElementList items={view.categories} label="Into categories" />
        </>
      )
    case 'fill-complete':
      return <p className="aq-preview__template">{view.template || 'Fill in the blanks.'}</p>
    case 'image-interaction':
      return (
        <>
          <ImagePlaceholder view={view} />
          <ElementList items={view.hotspots} label={`Hotspots (${view.hotspots?.length ?? 0})`} />
        </>
      )
    case 'pattern':
      return (
        <>
          <ElementList items={view.sequence} label="Pattern sequence" />
          {view.candidates?.length ? (
            <ElementList items={view.candidates} label="Candidate choices" />
          ) : null}
        </>
      )
    case 'memory':
      return (
        <>
          <ElementList items={view.cards} label={`Cards (${view.cards?.length ?? 0})`} />
          {view.recallPrompt ? <p className="aq-preview__hint">{view.recallPrompt}</p> : null}
        </>
      )
    case 'scenario-challenge':
      return (
        <>
          {view.scenarioText ? <p className="aq-preview__template">{view.scenarioText}</p> : null}
          {view.decisions?.length ? (
            <ElementList items={view.decisions} label="Decision tree" />
          ) : null}
        </>
      )
    case 'number-logic':
      return (
        <>
          {view.problem ? <p className="aq-preview__template">{view.problem}</p> : null}
          <p className="aq-preview__hint">
            Answer format: {view.answerFormat}
            {view.parts ? ` (${view.parts.length} parts)` : ''}
          </p>
        </>
      )
    default:
      return null
  }
}

export default function QuestionPreview({ draft }) {
  const view = useMemo(() => previewFrom(draft), [draft])

  if (!view) {
    return <p className="aq-preview__empty">Choose an activity type to preview the question.</p>
  }

  return (
    <div className="aq-preview">
      <p className="aq-preview__prompt">{view.prompt || 'Untitled question'}</p>
      {view.instructions ? <p className="aq-preview__instructions">{view.instructions}</p> : null}
      {renderBody(view)}
    </div>
  )
}
