import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Link, Navigate, useNavigate } from 'react-router'
import tokenStorage from '../features/student/session/token-storage.js'
import { isExpiredSession } from '../features/mission/session-guard.js'
import { validateRegistrationInput, GRADE_OPTIONS } from '../features/student/validation.js'
import { validateAvatarFile, AVATAR_MAX_BYTES, AVATAR_ALLOWED_MIME } from '../features/student/security/avatar.js'
import {
  useStudentMe,
  useStudentProgress,
  useUpdateProfile,
  useUploadAvatar,
} from '../features/student/api/queries.js'
import StreamIcon from './stream-icons.jsx'
import './student-profile.css'

const STATUS_LABEL = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'Not started',
}

function PhotoHalo({ student }) {
  if (student.avatarUrl) {
    return (
      <span className="pf-photo" aria-hidden="true">
        <img src={student.avatarUrl} alt="" />
      </span>
    )
  }
  return <span className="pf-photo pf-photo--initials" aria-hidden="true">{student.initials}</span>
}

export default function StudentProfilePage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [token, setToken] = useState(() => tokenStorage.read())

  const me = useStudentMe(token)
  const progress = useStudentProgress(token)
  const updateProfile = useUpdateProfile(token)
  const uploadAvatar = useUploadAvatar(token)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ initials: '', name: '', school: '', grade: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [photoFile, setPhotoFile] = useState(null)
  const [photoNotice, setPhotoNotice] = useState(null)
  const photoInputRef = useRef(null)

  const expired =
    isExpiredSession(me, token) || isExpiredSession(progress, token)

  useEffect(() => {
    if (expired) {
      tokenStorage.clear()
      setToken(null)
    }
  }, [expired])

  const student = me.data?.student ?? null

  const startEditing = () => {
    if (!student) return
    setForm({
      initials: student.initials ?? '',
      name: student.name ?? '',
      school: student.school ?? '',
      grade: String(student.grade ?? ''),
    })
    setFieldErrors({})
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setFieldErrors({})
    setForm({ initials: '', name: '', school: '', grade: '' })
  }

  const saveProfile = () => {
    const check = validateRegistrationInput(form)
    if (!check.ok) {
      setFieldErrors(check.errors ?? {})
      return
    }
    updateProfile.mutate(check.value, {
      onSuccess: () => {
        setEditing(false)
        setFieldErrors({})
      },
    })
  }

  const onPickPhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const checked = validateAvatarFile({ size: file.size, mimeType: file.type })
    if (!checked.ok) {
      setPhotoFile(null)
      setPhotoNotice(checked.reason)
      if (photoInputRef.current) photoInputRef.current.value = ''
      return
    }
    setPhotoFile(file)
    setPhotoNotice(null)
    uploadAvatar.mutate({ file }, {
      onSuccess: () => setPhotoNotice('Photo updated.'),
      onError: () => setPhotoNotice('We couldn’t upload that photo. Please try again.'),
    })
  }

  if (!token) {
    return <Navigate to="/student/register" replace />
  }

  const saving = updateProfile.isPending
  const uploadingPhoto = uploadAvatar.isPending

  return (
    <main className="pf-page">
      <div className="pf-glow" aria-hidden="true" />
      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-header__top">
            <span className="pf-brand">STEM QUEST</span>
            {student ? <span className="pf-greeting">Hi {student.name}</span> : null}
          </div>
          <Link className="pf-back" to="/student/mission">
            ← Back to mission
          </Link>
        </header>

        {me.isLoading || (token && progress.isLoading) ? (
          <p className="pf-status" role="status">
            Loading your profile…
          </p>
        ) : me.isError || progress.isError ? (
          <div className="pf-error" role="alert">
            <p>We couldn’t load your profile right now.</p>
            <button
              type="button"
              className="pf-button pf-button--ghost"
              onClick={() => {
                me.refetch()
                progress.refetch()
              }}
            >
              Try again
            </button>
          </div>
        ) : student && progress.data ? (
          <motion.div
            className="pf-stack"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <section className="pf-card" aria-labelledby="pf-profile-title">
              <h2 className="pf-title" id="pf-profile-title">Your profile</h2>
              <div className="pf-identity">
                <PhotoHalo student={student} />
                <div className="pf-identity__body">
                  <p className="pf-identity__name">{student.name}</p>
                  <p className="pf-identity__meta">
                    {student.school} · Grade {student.grade} · {student.initials}
                  </p>
                  <div className="pf-photo-controls">
                    <label className="pf-button pf-button--ghost pf-button--small">
                      {uploadingPhoto ? 'Uploading…' : photoFile ? 'Change photo' : 'Add a photo'}
                      <input
                        ref={photoInputRef}
                        id="pf-photo"
                        type="file"
                        accept={AVATAR_ALLOWED_MIME.join(',')}
                        onChange={onPickPhoto}
                        disabled={uploadingPhoto}
                        hidden
                      />
                    </label>
                    <span className="pf-photo-hint">
                      Optional · JPEG, PNG or WebP · max {Math.round(AVATAR_MAX_BYTES / 1024)} KB
                    </span>
                  </div>
                  <p className="pf-photo-status" role="status" aria-live="polite">
                    {photoNotice}
                  </p>
                </div>
                {!editing ? (
                  <button type="button" className="pf-button pf-button--primary" onClick={startEditing}>
                    Edit profile
                  </button>
                ) : null}
              </div>

              {editing ? (
                <ProfileEditForm
                  form={form}
                  fieldErrors={fieldErrors}
                  saving={saving}
                  onChange={(next) => setForm(next)}
                  onSubmit={saveProfile}
                  onCancel={cancelEditing}
                />
              ) : null}
            </section>

            <section className="pf-card" aria-labelledby="pf-progress-title">
              <h2 className="pf-title" id="pf-progress-title">Your progress</h2>
              <ProgressOverview progress={progress.data} onPlayLevel={playLevel(navigate)} />
            </section>

            <section className="pf-card" aria-labelledby="pf-stats-title">
              <h2 className="pf-title" id="pf-stats-title">Statistics</h2>
              <Statistics progress={progress.data} />
            </section>

            <div className="pf-actions">
              <button type="button" className="pf-button pf-button--primary" onClick={() => navigate('/student/mission')}>
                Continue mission
              </button>
            </div>
          </motion.div>
        ) : null}
      </div>
    </main>
  )
}

function playLevel(navigate) {
  return (streamId, levelId) => {
    if (levelId == null) {
      navigate('/student/mission')
      return
    }
    navigate('/student/game', { state: { streamId, levelId } })
  }
}

function ProgressOverview({ progress, onPlayLevel }) {
  const { overall, streams } = progress
  return (
    <div className="pf-overview">
      <div className="pf-overall">
        <p className="pf-overall__label">Overall completion</p>
        <div
          className="pf-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={overall.totalLevels}
          aria-valuenow={overall.completedLevels}
          aria-label={`${overall.completedLevels} of ${overall.totalLevels} levels completed`}
        >
          <span className="pf-bar__fill" style={{ width: `${pct(overall.completedLevels, overall.totalLevels)}%` }} />
        </div>
        <p className="pf-overall__meta">
          {overall.completedLevels} of {overall.totalLevels} levels completed
          {overall.completedStreams > 0 ? ` · ${overall.completedStreams} stream${overall.completedStreams === 1 ? '' : 's'} completed` : ''}
        </p>
      </div>

      <div className="pf-streams">
        {streams.map((stream) => (
          <StreamCard key={stream.id} stream={stream} onPlayLevel={onPlayLevel} />
        ))}
      </div>
    </div>
  )
}

function StreamCard({ stream, onPlayLevel }) {
  const playableNext = !stream.completed && stream.nextLevel != null
  return (
    <article className={`pf-stream${stream.completed ? ' pf-stream--done' : ''}`}>
      <div className="pf-stream__head">
        <span className="pf-stream__icon" aria-hidden="true">
          <StreamIcon slug={stream.slug} />
        </span>
        <div className="pf-stream__titles">
          <h3 className="pf-stream__name">{stream.name}</h3>
          <p className="pf-stream__meta">
            {stream.completedLevels} of {stream.totalLevels} levels completed
          </p>
        </div>
        <span className={`pf-stream__state pf-stream__state--${stream.completed ? 'completed' : stream.inProgress ? 'in-progress' : 'not-started'}`}>
          {stream.completed ? 'Completed' : stream.inProgress ? 'In progress' : 'Not started'}
        </span>
      </div>

      <div
        className="pf-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={stream.totalLevels}
        aria-valuenow={stream.completedLevels}
        aria-label={`${stream.name}: ${stream.completedLevels} of ${stream.totalLevels} levels completed`}
      >
        <span className="pf-bar__fill" style={{ width: `${stream.completionPercent}%` }} />
      </div>

      <div className="pf-pips" aria-label={`${stream.name} levels`}>
        {stream.levels.map((level) => (
          <span
            key={level.id}
            className={`pf-pip pf-pip--${level.status}`}
            aria-label={`Level ${level.number} ${STATUS_LABEL[level.status]}`}
            title={`Level ${level.number} · ${level.name}`}
          >
            {level.number}
          </span>
        ))}
      </div>

      <div className="pf-stream__foot">
        {stream.nextLevel && !stream.completed ? (
          <p className="pf-stream__next">
            Next: Level {stream.nextLevel.number} · {stream.nextLevel.name}
          </p>
        ) : stream.completed ? (
          <p className="pf-stream__next">All {stream.totalLevels} levels completed — well done!</p>
        ) : (
          <p className="pf-stream__next">No level is open yet.</p>
        )}
        {playableNext ? (
          <button
            type="button"
            className="pf-button pf-button--primary pf-button--small"
            onClick={() => onPlayLevel(stream.id, stream.nextLevel.id)}
          >
            Play Level {stream.nextLevel.number}
          </button>
        ) : (
          <button
            type="button"
            className="pf-button pf-button--ghost pf-button--small"
            onClick={() => onPlayLevel(stream.id, null)}
          >
            View stream
          </button>
        )}
      </div>
    </article>
  )
}

function Statistics({ progress }) {
  const { overall } = progress
  return (
    <dl className="pf-stats">
      <div>
        <dt>Levels completed</dt>
        <dd>{overall.completedLevels}</dd>
      </div>
      <div>
        <dt>Streams completed</dt>
        <dd>{overall.completedStreams}</dd>
      </div>
      <div>
        <dt>Total attempts</dt>
        <dd>{overall.totalAttempts}</dd>
      </div>
      <div>
        <dt>Best score</dt>
        <dd>{overall.bestScore == null ? '—' : `${overall.bestScore} / 300`}</dd>
      </div>
    </dl>
  )
}

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function ProfileEditForm({ form, fieldErrors, saving, onChange, onSubmit, onCancel }) {
  return (
    <form
      className="pf-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="pf-field">
        <label htmlFor="pf-field-initials">Initials</label>
        <input
          id="pf-field-initials"
          name="initials"
          maxLength={5}
          value={form.initials}
          onChange={(e) => onChange({ ...form, initials: e.target.value })}
          aria-invalid={Boolean(fieldErrors.initials)}
        />
        {fieldErrors.initials ? (
          <p className="pf-field__error" role="alert">{fieldErrors.initials}</p>
        ) : null}
      </div>
      <div className="pf-field">
        <label htmlFor="pf-field-name">Name</label>
        <input
          id="pf-field-name"
          name="name"
          maxLength={100}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name ? (
          <p className="pf-field__error" role="alert">{fieldErrors.name}</p>
        ) : null}
      </div>
      <div className="pf-field">
        <label htmlFor="pf-field-school">School</label>
        <input
          id="pf-field-school"
          name="school"
          maxLength={120}
          value={form.school}
          onChange={(e) => onChange({ ...form, school: e.target.value })}
          aria-invalid={Boolean(fieldErrors.school)}
        />
        {fieldErrors.school ? (
          <p className="pf-field__error" role="alert">{fieldErrors.school}</p>
        ) : null}
      </div>
      <div className="pf-field">
        <label htmlFor="pf-field-grade">Grade</label>
        <select
          id="pf-field-grade"
          name="grade"
          value={form.grade}
          onChange={(e) => onChange({ ...form, grade: e.target.value })}
          aria-invalid={Boolean(fieldErrors.grade)}
        >
          <option value="" disabled>
            Choose a grade
          </option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {fieldErrors.grade ? (
          <p className="pf-field__error" role="alert">{fieldErrors.grade}</p>
        ) : null}
      </div>
      <div className="pf-form__actions">
        <button type="submit" className="pf-button pf-button--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="pf-button pf-button--ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export { ProgressOverview, StreamCard, Statistics, PhotoHalo, ProfileEditForm }