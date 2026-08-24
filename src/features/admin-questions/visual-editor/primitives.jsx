/**
 * Admin Question Builder — reusable authoring primitives (Task 5.11A).
 *
 * Small, accessible building blocks shared by the four visual authoring
 * forms. Deliberately thin — no unnecessary abstraction — so the remaining
 * six activity types can reuse the same pieces later.
 */

import { useEffect, useRef, useState } from 'react'
import { isValidId } from './model.js'
import { questionApiClient, tokenFor, MEDIA_REF_CLIENT_PATTERN as REF_PATTERN } from '../client/client.js'

const PENDING_REF = 'question-media/pending/pending/pending.png'

/** A labelled field with optional error/invalid styling. */
export function Field({ label, hint, invalid, children }) {
  return (
    <label className={`aq-field${invalid ? ' aq-field--invalid' : ''}`}>
      <span className="aq-field__label">{label}</span>
      {children}
      {hint ? <span className="aq-field__hint">{hint}</span> : null}
    </label>
  )
}

/** A titled authoring section (Activity editor / Correct answer / …). */
export function Section({ title, description, children }) {
  return (
    <section className="aq-section">
      <h4 className="aq-section__title">{title}</h4>
      {description ? <p className="aq-section__desc">{description}</p> : null}
      <div className="aq-section__body">{children}</div>
    </section>
  )
}

/** A row inside a list editor (label, id, media, actions). */
export function Row({ children }) {
  return <div className="aq-row">{children}</div>
}

/** A visual chip/tag (zone, category, target…). */
export function Chip({ children }) {
  return <span className="aq-chip">{children}</span>
}

/** Text input with an explicit label (used inside row editors). */
export function LabeledInput({ label, value, onChange, invalid, placeholder, disabled }) {
  return (
    <label className="aq-field aq-field--inline">
      <span className="aq-field__label">{label}</span>
      <input value={value} onChange={onChange} aria-invalid={invalid || undefined} placeholder={placeholder} disabled={disabled} />
    </label>
  )
}

/** Number input with an explicit label (values emitted as parsed numbers). */
export function NumberField({ label, value, onChange, min, max, step, disabled }) {
  return (
    <label className="aq-field aq-field--inline">
      <span className="aq-field__label">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const parsed = e.target.value === '' ? NaN : Number(e.target.value)
          onChange(Number.isFinite(parsed) ? parsed : '')
        }}
        disabled={disabled}
      />
    </label>
  )
}

/** Entity id input; flags an invalid/missing id for the author. */
export function IdInput({ value, onChange, disabled }) {
  const invalid = value !== '' && !isValidId(value)
  return (
    <LabeledInput
      label="Id"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      invalid={invalid}
      placeholder="item_1"
      disabled={disabled}
    />
  )
}

/** Media reference editor (optional image ref + alt for an item/card). */
export function MediaReferenceEditor({ media, onChange, disabled }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const inputRef = useRef(null)

  const ref = media?.ref ?? ''
  const isPending = ref === PENDING_REF

  // Admin-authenticated signed URL for the preview. Only fetched for a real,
  // well-formed ref; never for the placeholder. Safe to render during SSR
  // (the effect simply does not run there).
  useEffect(() => {
    let alive = true
    const candidate = ref && !isPending && REF_PATTERN.test(ref) ? ref : null
    setPreview(null)
    if (!candidate) return undefined
    const token = tokenFor()
    if (!token) return undefined
    questionApiClient
      .mediaUrl(token, candidate)
      .then(({ url }) => {
        if (alive) setPreview(url)
      })
      .catch(() => {
        if (alive) setPreview(null)
      })
    return () => {
      alive = false
    }
  }, [ref, isPending])

  async function uploadFile(file) {
    setError(null)
    setBusy(true)
    const token = tokenFor()
    try {
      const { media: uploaded } = await questionApiClient.uploadMedia(token, file)
      // Best-effort cleanup of the replaced object (409 when still in use).
      if (ref && !isPending && REF_PATTERN.test(ref)) {
        await questionApiClient.removeMedia(token, ref).catch(() => {})
      }
      onChange({ ...(media ?? {}), ref: uploaded.ref })
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      setError(err?.message ?? 'The image could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  async function removeImage() {
    setError(null)
    const token = tokenFor()
    if (ref && !isPending && REF_PATTERN.test(ref)) {
      await questionApiClient.removeMedia(token, ref).catch(() => {})
    }
    onChange(null)
  }

  return (
    <details className="aq-media">
      <summary>Image (optional)</summary>
      <div className="aq-media__body">
        {preview ? (
          <img className="aq-media__preview" src={preview} alt={media?.alt ?? 'Uploaded image preview'} />
        ) : null}
        <LabeledInput
          label="Storage path"
          value={ref}
          onChange={(e) => onChange({ ...(media ?? {}), ref: e.target.value })}
          placeholder="question-media/pending/pending/pending.png"
          disabled={disabled}
        />
        <LabeledInput
          label="Alt text"
          value={media?.alt ?? ''}
          onChange={(e) => onChange({ ...(media ?? {}), alt: e.target.value })}
          disabled={disabled}
        />
        <div className="aq-media__actions">
          <label className="aq-btn aq-btn--small">
            {busy ? 'Uploading…' : media ? 'Replace image' : 'Upload image'}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled || busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadFile(file)
              }}
              hidden
            />
          </label>
          {media ? (
            <button type="button" className="aq-btn aq-btn--small aq-btn--danger aq-btn--bare" onClick={removeImage} disabled={disabled || busy}>
              Remove image
            </button>
          ) : null}
        </div>
        {error ? <p className="aq-media__error" role="alert">{error}</p> : null}
      </div>
    </details>
  )
}

/** A labelled boolean toggle. */
export function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className="aq-toggle">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>{label}</span>
    </label>
  )
}

/** Select field with a label. */
export function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <label className="aq-field aq-field--inline">
      <span className="aq-field__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Add button used by every list editor. */
export function AddButton({ onClick, children, disabled }) {
  return (
    <button type="button" className="aq-btn aq-btn--small aq-btn--ghost" onClick={onClick} disabled={disabled}>
      {children ?? '+ Add'}
    </button>
  )
}

/** Remove button for a row. */
export function RemoveButton({ onClick, label, disabled }) {
  return (
    <button type="button" className="aq-btn aq-btn--small aq-btn--danger aq-btn--bare" onClick={onClick} aria-label={label} disabled={disabled}>
      Remove
    </button>
  )
}

/** Up/down reorder controls for an ordered list. */
export function ReorderControls({ onUp, onDown, canUp, canDown, disabled }) {
  return (
    <span className="aq-reorder">
      <button type="button" className="aq-btn aq-btn--small aq-btn--bare" onClick={onUp} aria-label="Move up" disabled={disabled || !canUp}>
        ↑
      </button>
      <button type="button" className="aq-btn aq-btn--small aq-btn--bare" onClick={onDown} aria-label="Move down" disabled={disabled || !canDown}>
        ↓
      </button>
    </span>
  )
}

/** General validation summary shown above the actions. */
export function ValidationSummary({ errors }) {
  if (!errors?.length) return null
  return (
    <ul className="aq-errors" aria-live="polite">
      {errors.map((err, i) => (
        <li key={i}>
          <code>{err.path}</code> — {err.message}
        </li>
      ))}
    </ul>
  )
}