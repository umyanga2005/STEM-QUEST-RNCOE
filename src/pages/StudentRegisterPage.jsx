import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router'
import { createRegistrationController } from '../features/student/registration/controller.js'
import {
  REGISTRATION_FIELDS,
  PROFILE_PHOTO,
  GRADE_OPTIONS_UI,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
} from '../features/student/registration/registration-fields.js'
import { studentApiClient } from '../features/student/api/client.js'
import tokenStorage from '../features/student/session/token-storage.js'
import { useStudentMe } from '../features/student/api/queries.js'
import './student-register.css'

function PhotoPicker({ file, onChange }) {
  const inputRef = useRef(null)
  const preview = file ? URL.createObjectURL(file) : null

  return (
    <div className="sr-photo">
      <div className="sr-photo__preview" aria-hidden="true">
        {preview ? <img src={preview} alt="" /> : <span>No photo</span>}
      </div>
      <div className="sr-photo__actions">
        <input
          ref={inputRef}
          id="sr-photo-input"
          type="file"
          accept={PROFILE_PHOTO.accept}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="sr-photo__input"
        />
        <button type="button" className="sr-photo__button" onClick={() => inputRef.current?.click()}>
          {PROFILE_PHOTO.chooseLabel}
        </button>
        {file ? (
          <button
            type="button"
            className="sr-photo__button sr-photo__button--remove"
            onClick={() => onChange(null)}
          >
            {PROFILE_PHOTO.removeLabel}
          </button>
        ) : null}
      </div>
      {file ? (
        <p className="sr-photo__hint">
          {Math.round(file.size / 1024)} KB · {(file.type.split('/')[1] ?? '').toUpperCase()}
        </p>
      ) : null}
    </div>
  )
}

function Field({ field, error, children }) {
  const id = `sr-field-${field.name}`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const invalid = Boolean(error)
  const describedBy = [field.hint ? hintId : null, invalid ? errorId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="sr-field">
      <label className="sr-field__label" htmlFor={id}>
        {field.label}
        {field.required ? <span className="sr-field__req"> *</span> : null}
      </label>
      {field.hint ? (
        <p className="sr-field__hint" id={hintId}>
          {field.hint}
        </p>
      ) : null}
      {children({
        id,
        'aria-invalid': invalid,
        'aria-describedby': describedBy || undefined,
        className: `sr-field__control${invalid ? ' sr-field__control--invalid' : ''}`,
      })}
      {invalid ? (
        <p className="sr-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default function StudentRegisterPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [values, setValues] = useState({ initials: '', name: '', school: '', grade: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [photo, setPhoto] = useState(null)
  const [phase, setPhase] = useState('form') // form | submitting | avatar-upload | success
  const [serverMessage, setServerMessage] = useState(null)
  const [session, setSession] = useState(null)
  const [avatarWarning, setAvatarWarning] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [returning, setReturning] = useState(() => tokenStorage.read())
  const me = useStudentMe(returning)

  const controller = useMemo(
    () => createRegistrationController({ api: studentApiClient, storage: tokenStorage }),
    []
  )

  const submitting = phase === 'submitting' || phase === 'avatar-upload'

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const emit = (state) => {
    if (state.phase === 'field-error') {
      setFieldErrors(state.fieldErrors)
      setPhase('form')
    } else if (state.phase === 'error') {
      setPhase('form')
      setServerMessage(state.message)
    } else if (state.phase === 'submitting') {
      setServerMessage(null)
      setPhase('submitting')
    } else if (state.phase === 'avatar-upload') {
      setSession((prev) => ({ ...prev, ...state }))
      setPhase('avatar-upload')
    } else if (state.phase === 'success') {
      setAvatarUrl(state.avatarUrl)
      setAvatarWarning(state.avatarWarning)
      setPhase('success')
    }
  }

  async function onSubmit(event) {
    event.preventDefault()
    const result = await controller.submit(
      { initials: values.initials, name: values.name, school: values.school, grade: values.grade },
      emit
    )
    if (result.ok) {
      if (photo) {
        await controller.uploadAvatar(result.result.token, photo, emit)
      } else {
        emit({ phase: 'success', avatarUrl: null, avatarWarning: false })
      }
    }
  }

  const startMission = () => {
    navigate(controller.nextStep())
  }

  const clearReturning = () => {
    tokenStorage.clear()
    setReturning(null)
  }

  if (me.isError && me.error?.status === 401 && returning) {
    clearReturning()
  }

  return (
    <main className="sr-page">
      <div className="sr-glow" aria-hidden="true" />
      {returning && me.data ? (
        <motion.div
          className="sr-returning"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>
            <strong>Welcome back, {me.data.student.name}!</strong> Your session is ready.
          </p>
          <div className="sr-returning__actions">
            <button type="button" className="sr-button sr-button--ghost" onClick={startMission}>
              Continue your mission
            </button>
            <button type="button" className="sr-button sr-button--link" onClick={() => navigate('/student/profile')}>
              View your profile
            </button>
            <button type="button" className="sr-button sr-button--link" onClick={clearReturning}>
              Start a new registration
            </button>
          </div>
        </motion.div>
      ) : null}

      {phase === 'success' && session ? (
        <SuccessPanel
          reduceMotion={reduceMotion}
          session={session}
          avatarUrl={avatarUrl}
          avatarWarning={avatarWarning}
          onStart={startMission}
          onViewProfile={() => navigate('/student/profile')}
        />
      ) : (
        <motion.section
          className="sr-card"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          aria-labelledby="sr-title"
        >
          <header className="sr-header">
            <h1 id="sr-title">STEM QUEST</h1>
            <p className="sr-tagline">Student Registration</p>
          </header>

          <div className="sr-progress" role="presentation">
            <span className="sr-progress__step sr-progress__step--active">1 · Register</span>
            <span className="sr-progress__divider" aria-hidden="true" />
            <span className="sr-progress__step">2 · Choose your stream</span>
            <span className="sr-progress__divider" aria-hidden="true" />
            <span className="sr-progress__step">3 · Begin the mission</span>
          </div>

          <form className="sr-form" onSubmit={onSubmit} noValidate>
            {REGISTRATION_FIELDS.map((field) => (
              <Field key={field.name} field={field} error={fieldErrors[field.name]}>
                {(props) =>
                  field.name === 'grade' ? (
                    <select
                      {...props}
                      id="sr-field-grade"
                      value={values.grade}
                      onChange={(e) => setField('grade', e.target.value)}
                    >
                      <option value="" disabled>
                        Choose your grade
                      </option>
                      {GRADE_OPTIONS_UI.map((g) => (
                        <option key={g} value={g}>
                          Grade {g}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...props}
                      id={`sr-field-${field.name}`}
                      type="text"
                      value={values[field.name]}
                      maxLength={field.maxLength}
                      autoComplete={field.autoComplete}
                      inputMode={field.inputMode}
                      onChange={(e) => setField(field.name, e.target.value)}
                    />
                  )
                }
              </Field>
            ))}

            <div className="sr-photo-block">
              <p className="sr-photo-block__label">{PROFILE_PHOTO.optionalLabel}</p>
              <PhotoPicker file={photo} onChange={setPhoto} />
            </div>

            <div className="sr-status" aria-live="polite" role="status">
              {serverMessage ? <p className="sr-error">{serverMessage}</p> : null}
              {submitting ? <p className="sr-info">Registering…</p> : null}
            </div>

            <button type="submit" className="sr-button sr-button--primary" disabled={submitting}>
              {submitting ? SUBMITTING_LABEL : SUBMIT_LABEL}
            </button>
            <p className="sr-footnote">No email or password needed. Your details stay private.</p>
          </form>
        </motion.section>
      )}
    </main>
  )
}

function SuccessPanel({ reduceMotion, session, avatarUrl, avatarWarning, onStart, onViewProfile }) {
  return (
    <motion.section
      className="sr-card sr-card--success"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      aria-labelledby="sr-success-title"
    >
      <header className="sr-header">
        <h1 id="sr-success-title">You're ready!</h1>
        <p className="sr-tagline">Registration complete — welcome to STEM QUEST</p>
      </header>

      <div className="sr-success-body">
        <p className="sr-success-name">
          <strong>{session.student.name}</strong> · Grade {session.student.grade}
        </p>

        <div className="sr-login-code">
          <span className="sr-login-code__label">Your kiosk login code</span>
          <strong className="sr-login-code__value" aria-label={`Login code ${session.loginCode}`}>
            {session.loginCode}
          </strong>
          <p className="sr-login-code__hint">
            Keep this code to rejoin at a kiosk on a later visit. Your profile photo
            {avatarUrl
              ? ' was added.'
              : avatarWarning
                ? ' could not be added — it is optional and was skipped.'
                : ' is optional — you can skip it.'}
          </p>
        </div>

        {avatarUrl ? (
          <div className="sr-success-photo">
            <img src={avatarUrl} alt="Your profile photo" />
          </div>
        ) : null}

        <div className="sr-status" aria-live="polite" role="status">
          {avatarWarning ? (
            <p className="sr-warn">We couldn't add your photo, but your registration is complete.</p>
          ) : null}
        </div>
      </div>

      <button type="button" className="sr-button sr-button--primary" onClick={onStart}>
        Continue to your mission
      </button>
      <button type="button" className="sr-button sr-button--ghost" onClick={onViewProfile}>
        View your profile
      </button>
      <p className="sr-footnote">Next: choose your STEM stream and level.</p>
    </motion.section>
  )
}