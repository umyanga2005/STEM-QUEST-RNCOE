import { Link } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  useQuestionList,
  useQuestionDetail,
  useQuestionCatalogue,
  useDeleteQuestion,
  useCreateQuestionVersion,
} from '../queries/queries.js'
import AdminActivityPreviewModal from '../../../pages/AdminActivityPreviewModal.jsx'

/**
 * Admin Question Builder — list (Task 5.10, versioned editing 5.13).
 *
 * Preview table of the question catalogue. Only student-visible fields are
 * rendered (payload preview, prompt, grade, difficulty, status); correctAnswer
 * and meta are server-only and never leave the `GET /:id` editor surface.
 * Draft rows can be deleted from here; published rows are protected and can
 * only be edited through a new version (clone-on-edit, Task 5.13).
 */

const STATUS_LABELS = { draft: 'Draft', archived: 'Archived', published: 'Published' }
const PAGE_SIZE = 50
const LEVEL_OPTIONS = [1, 2, 3, 4, 5]

function StatusPill({ status }) {
  return <span className={`aq-status aq-status--${status}`}>{STATUS_LABELS[status] ?? status}</span>
}

function ActivityType({ activityType }) {
  const label = activityType.replace(/-/g, ' ')
  return <span className="aq-type" title={label}>{label}</span> // FIX: P2-006 — title tooltip keeps full label when badge truncates
}

// FIX: P2-003 — filter state initialized from URL params on mount, and kept
// in sync with the URL so filtered views are shareable/deep-linkable.
const EMPTY_FILTERS = { stream: '', level: '', activityType: '', status: '', q: '' }

function readFiltersFromUrl() {
  if (typeof window === 'undefined') return EMPTY_FILTERS // FIX: SSR safety
  const params = new URLSearchParams(window.location.search)
  return {
    stream: params.get('stream') ?? '',
    level: params.get('level') ?? '',
    activityType: params.get('activityType') ?? '',
    status: params.get('status') ?? '',
    q: params.get('q') ?? '',
  }
}

function writeFiltersToUrl(filters) {
  if (typeof window === 'undefined') return // FIX: SSR safety
  const params = new URLSearchParams()
  if (filters.stream) params.set('stream', filters.stream)
  if (filters.level) params.set('level', filters.level)
  if (filters.activityType) params.set('activityType', filters.activityType)
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)
  const qs = params.toString()
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`
  window.history.replaceState(null, '', url)
}

export default function QuestionList({ onDeleted, onRetry }) {
  const [filters, setFilters] = useState(readFiltersFromUrl)
  const [page, setPage] = useState(0)
  const catalogue = useQuestionCatalogue()
  const queryFilters = useMemo(() => {
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    return { ...active, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
  }, [filters, page])
  const { data, isLoading, isError, refetch } = useQuestionList(queryFilters)
  const deleteMutation = useDeleteQuestion()
  const versionMutation = useCreateQuestionVersion()
  const [versionError, setVersionError] = useState(null)
  const [previewId, setPreviewId] = useState(null) // FIX: P1-004 — list rows omit correctAnswer; fetch the full detail for preview
  const previewDetail = useQuestionDetail(previewId, { enabled: previewId != null })
  const questions = data?.questions ?? []
  const total = data?.total ?? questions.length

  useEffect(() => {
    writeFiltersToUrl(filters)
  }, [filters])

  const updateFilter = (key, value) => {
    setPage(0)
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync(id)
    onDeleted?.()
    refetch()
  }

  const handleCreateVersion = async (id) => {
    setVersionError(null)
    try {
      const { question } = await versionMutation.mutateAsync(id)
      window.location.assign(`/admin/questions/${question.id}/edit`)
    } catch (err) {
      setVersionError(err.message ?? 'The question could not be versioned.')
    }
  }

  const filterBar = (
    <div className="aq-filters">
      <select
        className="aq-select"
        value={filters.stream}
        onChange={(e) => updateFilter('stream', e.target.value)}
        aria-label="Filter by stream"
      >
        <option value="">All streams</option>
        {(catalogue.data?.streams ?? []).map((s) => (
          <option key={s.slug} value={s.slug}>{s.name}</option>
        ))}
      </select>
      <select
        className="aq-select"
        value={filters.level}
        onChange={(e) => updateFilter('level', e.target.value)}
        aria-label="Filter by level"
      >
        <option value="">All levels</option>
        {LEVEL_OPTIONS.map((n) => (
          <option key={n} value={n}>Level {n}</option>
        ))}
      </select>
      <select
        className="aq-select"
        value={filters.activityType}
        onChange={(e) => updateFilter('activityType', e.target.value)}
        aria-label="Filter by activity type"
      >
        <option value="">All types</option>
        {(catalogue.data?.activityTypes ?? []).map((t) => (
          <option key={t.slug} value={t.slug}>{t.name}</option>
        ))}
      </select>
      <select
        className="aq-select"
        value={filters.status}
        onChange={(e) => updateFilter('status', e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <input
        className="aq-search"
        type="search"
        placeholder="Search prompt…"
        value={filters.q}
        onChange={(e) => updateFilter('q', e.target.value)}
        aria-label="Search prompt text"
      />
    </div>
  )

  if (isLoading) {
    return (
      <div className="aq-list">
        {filterBar}
        <p className="aq-note">Loading questions…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="aq-error" role="alert">
        <p>We couldn’t load the question catalogue.</p>
        <button type="button" className="aq-btn" onClick={onRetry ?? (() => refetch())}>
          Try again
        </button>
      </div>
    )
  }

  if (questions.length === 0) {
    const filtersActive = Object.values(filters).some(Boolean)
    return (
      <div className="aq-list">
        {filterBar}
        <div className="aq-empty">
          <p>
            {filtersActive
              ? 'No questions match these filters.'
              : 'No questions yet. Create the first one to start building the catalogue.'}
          </p>
        </div>
      </div>
    )
  }

  const rangeStart = page * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE + questions.length, total)
  const hasPrev = page > 0
  const hasNext = rangeEnd < total

  return (
    <div className="aq-list">
      {filterBar}
      <div className="aq-list__row aq-list__head" aria-hidden="true">
        <span>Prompt</span>
        <span>Type</span>
        <span>Stream</span>
        <span>Level</span>
        <span>Grade</span>
        <span>Difficulty</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="aq-list__row">
          <Link className="aq-list__prompt" to={`/admin/questions/${q.id}/edit`}>
            {q.prompt || '(untitled)'}
          </Link>
          <span>
            <ActivityType activityType={q.activityType} />
          </span>
          <span className="aq-list__stream">{q.stream}</span>
          <span className="aq-list__level">L{q.level}</span>
          <span className="aq-list__grade">
            {q.gradeMin}–{q.gradeMax}
          </span>
          <span className="aq-list__diff">★ {q.difficulty}</span>
          <span>
            <StatusPill status={q.status} />
          </span>
          <span className="aq-list__actions">
            <button
              type="button"
              className="aq-btn aq-btn--bare"
              onClick={() => setPreviewId(q.id)}
              title="Preview Activity"
            >
              👁 Preview
            </button>
            <Link className="aq-btn" to={`/admin/questions/${q.id}/edit`}>
              Edit
            </Link>
            {q.status === 'published' ? (
              <button
                type="button"
                className="aq-btn aq-btn--submit"
                disabled={versionMutation.isPending}
                onClick={() => handleCreateVersion(q.id)}
              >
                New version
              </button>
            ) : null}
            {q.status === 'draft' ? (
              <button
                type="button"
                className="aq-btn aq-btn--danger"
                disabled={deleteMutation.isPending}
                onClick={() => handleDelete(q.id)}
              >
                Delete
              </button>
            ) : null}
          </span>
        </div>
      ))}
      {deleteMutation.isError ? <p className="aq-note aq-note--error">{deleteMutation.error?.message}</p> : null}
      {versionError ? <p className="aq-note aq-note--error">{versionError}</p> : null}

      {/* FIX: P1-003 — pagination controls; the list was hard-capped at 200 with no way to reach the rest */}
      <div className="aq-pagination">
        <span className="aq-pagination__label">
          Showing {rangeStart}–{rangeEnd} of {total} questions
        </span>
        <div className="aq-pagination__controls">
          <button type="button" className="aq-btn" disabled={!hasPrev} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </button>
          <button type="button" className="aq-btn" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      </div>

      {previewId != null ? (
        <AdminActivityPreviewModal
          question={previewDetail.data?.question ?? null}
          onClose={() => setPreviewId(null)}
        />
      ) : null}
    </div>
  )
}
