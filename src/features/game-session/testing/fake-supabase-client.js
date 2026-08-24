/**
 * Fake Supabase client for repository contract tests (Task 5.4).
 *
 * Implements exactly the PostgREST surface the three Supabase repository sets
 * use (game-session, student, mission) over in-memory tables seeded with the
 * live 0001/0002 schema shapes. Deterministic and DB-free: `npm test` stays
 * green without a live project while still validating column mapping, filter
 * semantics (eq/ilike/in/or), embedded `activity_types(slug)` joins, ordering,
 * single/maybe-single, inserts, updates, deletes and Storage upload/signed-url.
 *
 * Only the query features the repositories actually call are implemented; a
 * call outside that surface throws loudly so a silent mapping bug can never
 * hide behind a permissive fake.
 */

const STREAM_SEED = [
  { id: 1, slug: 'science', name: 'Science', description: 'Discover how the world works.', display_order: 1, theme_color: '#22d3ee', is_active: true },
  { id: 2, slug: 'technology', name: 'Technology', description: 'Build with code and circuits.', display_order: 2, theme_color: '#a78bfa', is_active: true },
  { id: 3, slug: 'engineering', name: 'Engineering', description: 'Design and construct.', display_order: 3, theme_color: '#fbbf24', is_active: true },
  { id: 4, slug: 'mathematics', name: 'Mathematics', description: 'Patterns, logic and numbers.', display_order: 4, theme_color: '#34d399', is_active: true },
]

const LEVEL_TIMERS = [
  { number: 1, name: 'Beginner', default_time_seconds: 90, overtime_penalty_per_second: 1 },
  { number: 2, name: 'Easy', default_time_seconds: 75, overtime_penalty_per_second: 2 },
  { number: 3, name: 'Intermediate', default_time_seconds: 60, overtime_penalty_per_second: 3 },
  { number: 4, name: 'Advanced', default_time_seconds: 50, overtime_penalty_per_second: 4 },
  { number: 5, name: 'Hard', default_time_seconds: 45, overtime_penalty_per_second: 5 },
]

const ACTIVITY_TYPE_SEED = [
  ['drag-drop', 'Drag & Drop'],
  ['matching', 'Matching'],
  ['ordering', 'Ordering'],
  ['sorting', 'Sorting'],
  ['fill-complete', 'Fill / Complete'],
  ['image-interaction', 'Image Interaction'],
  ['pattern', 'Pattern'],
  ['memory', 'Memory'],
  ['scenario-challenge', 'Scenario Challenge'],
  ['number-logic', 'Number / Logic Challenge'],
].map(([slug, name], i) => ({
  id: i + 1,
  slug,
  name,
  description: null,
  is_active: true,
}))

const SETTINGS_SEED = [
  { key: 'auth.session_ttl_seconds', value: 3600 },
  { key: 'scoring.hint_deduction', value: 5 },
  { key: 'scoring.attempt_deduction', value: 10 },
  { key: 'session.questions_per_session', value: 3 },
]

const BADGE_SEED = [
  { id: 1, slug: 'science-completion', name: 'Science Completion', description: 'Completed all 5 Science levels.', icon: 'science', criteria: { type: 'stream_completion', stream: 'science' }, is_active: true },
  { id: 2, slug: 'technology-completion', name: 'Technology Completion', description: 'Completed all 5 Technology levels.', icon: 'technology', criteria: { type: 'stream_completion', stream: 'technology' }, is_active: true },
  { id: 3, slug: 'engineering-completion', name: 'Engineering Completion', description: 'Completed all 5 Engineering levels.', icon: 'engineering', criteria: { type: 'stream_completion', stream: 'engineering' }, is_active: true },
  { id: 4, slug: 'mathematics-completion', name: 'Mathematics Completion', description: 'Completed all 5 Mathematics levels.', icon: 'mathematics', criteria: { type: 'stream_completion', stream: 'mathematics' }, is_active: true },
]

const BASE_TABLES = [
  'schools',
  'students',
  'student_sessions',
  'streams',
  'levels',
  'activity_types',
  'questions',
  'game_sessions',
  'session_rounds',
  'student_answers',
  'scores',
  'special_access',
  'student_progress',
  'student_level_progress',
  'game_settings',
  'leaderboard_entries',
  'badges',
  'student_badges',
  'certificates',
  'admins',
  'admin_actions',
]

/** Postgres `default` values mirrored from the 0001 migration. */
const INSERT_DEFAULTS = {
  schools: { is_active: true },
  students: { status: 'active', is_archived: false },
  game_sessions: { status: 'active', total_score: 0 },
  session_rounds: { status: 'pending', attempts: 0, hints_used: 0, overtime_seconds: 0, points_earned: 0 },
  student_answers: { points_earned: 0 },
  student_progress: { current_level: 1, completed_levels: 0, stream_completed: false },
  student_level_progress: { best_score: 0, attempts: 0, is_completed: false },
  streams: { is_active: true },
  levels: { is_active: true },
  activity_types: { is_active: true },
  special_access: { is_active: true },
}

/** Parses `*, activity_types(slug)` / `id, slug` / `*` into parts. */
function parseSelect(select) {
  if (!select) return { columns: null, embedded: [] }
  const parts = splitTopLevel(select)
  const columns = []
  const embedded = []
  let all = false
  for (const part of parts) {
    const m = /^([a-z_]+)\(([^)]*)\)$/.exec(part)
    if (m) {
      embedded.push({ resource: m[1], columns: m[2].split(',').map((c) => c.trim()).filter(Boolean) })
    } else if (part === '*') {
      all = true
    } else {
      columns.push(part)
    }
  }
  return { columns: all ? null : columns, embedded }
}

function splitTopLevel(input) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of input) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/** Compares two cell values for ordering (numbers, ISO timestamps, strings). */
function compareCell(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const ad = new Date(a).valueOf()
  const bd = new Date(b).valueOf()
  if (Number.isFinite(ad) && Number.isFinite(bd)) return ad - bd
  return String(a).localeCompare(String(b))
}

function parseOrClause(str) {
  return splitTopLevel(str).map((token) => {
    const [col, op, ...rest] = token.split('.')
    return { col, op, arg: rest.join('.') }
  })
}

/** Postgres ILIKE: `%` matches any substring, `_` any single char. */
function ilikeMatches(value, pattern) {
  const re = new RegExp(`^${pattern.replace(/[%_]/g, (m) => (m === '%' ? '.*' : '.'))}$`, 'i')
  return re.test(value)
}

class Builder {
  constructor(db, table) {
    this.db = db
    this.table = table
    this.filters = []
    this.orClauses = []
    this._limit = null
    this._order = null
    this.selectParts = { columns: null, embedded: [] }
    this.hasSelect = false
    this._single = null
    this.action = 'select'
    this.insertRows = null
    this.patch = null
  }

  select(cols) {
    this.selectParts = parseSelect(cols)
    this.hasSelect = true
    return this
  }

  eq(col, val) {
    this.filters.push({ op: 'eq', col, val })
    return this
  }

  ilike(col, val) {
    this.filters.push({ op: 'ilike', col, val })
    return this
  }

  in(col, vals) {
    this.filters.push({ op: 'in', col, vals })
    return this
  }

  or(str) {
    this.orClauses.push(parseOrClause(str))
    return this
  }

  limit(n) {
    this._limit = n
    return this
  }

  order(col, { ascending = true } = {}) {
    this._orders = this._orders ?? []
    this._orders.push({ col, ascending })
    return this
  }

  maybeSingle() {
    this._single = 'maybe'
    return this
  }

  single() {
    this._single = 'single'
    return this
  }

  insert(rows) {
    this.action = 'insert'
    this.insertRows = Array.isArray(rows) ? rows : [rows]
    return this
  }

  upsert(rows, { onConflict } = {}) {
    this.action = 'upsert'
    this.upsertRows = Array.isArray(rows) ? rows : [rows]
    this.upsertConflict = onConflict ?? null
    return this
  }

  update(patch) {
    this.action = 'update'
    this.patch = { ...patch }
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  then(resolve, reject) {
    try {
      resolve(this.#run())
    } catch (err) {
      reject(err)
    }
  }

  // ------------------------------------------------------------------

  #matches(row) {
    for (const f of this.filters) {
      if (!this.#matchFilter(row, f)) return false
    }
    for (const ors of this.orClauses) {
      const hit = ors.some((c) => this.#matchOr(row, c))
      if (!hit) return false
    }
    return true
  }

  #matchFilter(row, f) {
    const val = row[f.col]
    switch (f.op) {
      case 'eq':
        return val === f.val
      case 'ilike':
        return ilikeMatches(String(val ?? ''), String(f.val))
      case 'in':
        return (f.vals ?? []).includes(val)
      default:
        throw new Error(`fake supabase: unsupported filter op "${f.op}"`)
    }
  }

  #matchOr(row, c) {
    const val = row[c.col]
    if (c.op === 'is' && c.arg === 'null') return val === null || val === undefined
    if (c.op === 'gt') {
      if (val === null || val === undefined) return false
      return new Date(val).valueOf() > new Date(c.arg).valueOf()
    }
    throw new Error(`fake supabase: unsupported or op "${c.op}"`)
  }

  /** Applies select columns + embedded activity_types join to one row. */
  #project(row) {
    const { columns, embedded } = this.selectParts
    let out = row
    if (columns) {
      out = {}
      for (const c of columns) out[c] = row[c]
    }
    for (const emb of embedded) {
      if (emb.resource === 'activity_types') {
        const at = this.db.tables.activity_types.rows.find((a) => a.id === row.activity_type_id)
        const obj = {}
        for (const c of emb.columns) obj[c] = at ? at[c] : null
        out.activity_types = at ? obj : null
      } else if (emb.resource === 'streams') {
        const s = this.db.tables.streams.rows.find((r) => r.id === row.stream_id)
        const obj = {}
        for (const c of emb.columns) obj[c] = s ? s[c] : null
        out.streams = s ? obj : null
      } else if (emb.resource === 'levels') {
        const l = this.db.tables.levels.rows.find((r) => r.id === row.level_id)
        const obj = {}
        for (const c of emb.columns) obj[c] = l ? l[c] : null
        out.levels = l ? obj : null
      } else {
        throw new Error(`fake supabase: unsupported embedded resource "${emb.resource}"`)
      }
    }
    return out
  }

  #finalize(rows) {
    if (this._orders?.length) {
      rows = [...rows].sort((a, b) => {
        for (const o of this._orders) {
          const aNull = a[o.col] === null || a[o.col] === undefined
          const bNull = b[o.col] === null || b[o.col] === undefined
          if (aNull || bNull) {
            if (aNull && bNull) continue
            // Postgres default null ordering: NULLS LAST for ASC, NULLS FIRST for DESC.
            return aNull ? (o.ascending ? 1 : -1) : o.ascending ? -1 : 1
          }
          const cmp = compareCell(a[o.col], b[o.col])
          if (cmp !== 0) return o.ascending ? cmp : -cmp
        }
        return 0
      })
    }
    if (this._limit !== null) rows = rows.slice(0, this._limit)
    const data = rows.map((r) => this.#project(r))
    if (this._single === 'single') {
      return data.length === 1
        ? { data: data[0], error: null }
        : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } }
    }
    if (this._single === 'maybe') {
      return data.length === 0
        ? { data: null, error: null }
        : data.length === 1
          ? { data: data[0], error: null }
          : { data: null, error: { message: 'query returned more than one row', code: 'PGRST116' } }
    }
    return { data, error: null }
  }

  #run() {
    const table = this.db.tables[this.table]
    if (!table) throw new Error(`fake supabase: unknown table "${this.table}"`)

    if (this.action === 'select') {
      return this.#finalize(table.rows.filter((r) => this.#matches(r)))
    }

    if (this.action === 'insert') {
      const inserted = this.insertRows.map((row) => {
        const copy = { ...(INSERT_DEFAULTS[this.table] ?? {}), ...row }
        if (copy.id === undefined) copy.id = table.nextId++
        table.rows.push(copy)
        return copy
      })
      if (this.hasSelect) {
        return this.#finalize(inserted)
      }
      return { data: null, error: null }
    }

    if (this.action === 'upsert') {
      const conflictCols = this.upsertConflict ? this.upsertConflict.split(',').map((c) => c.trim()) : []
      const written = this.upsertRows.map((row) => {
        const copy = { ...(INSERT_DEFAULTS[this.table] ?? {}), ...row }
        if (conflictCols.length) {
          const existing = table.rows.find((r) => conflictCols.every((c) => r[c] === copy[c]))
          if (existing) {
            Object.assign(existing, { ...copy, id: existing.id })
            return existing
          }
        }
        if (copy.id === undefined) copy.id = table.nextId++
        table.rows.push(copy)
        return copy
      })
      if (this.hasSelect) {
        return this.#finalize(written)
      }
      return { data: null, error: null }
    }

    if (this.action === 'update') {
      const hits = table.rows.filter((r) => this.#matches(r))
      for (const r of hits) Object.assign(r, this.patch)
      if (this.hasSelect) {
        return this.#finalize(hits)
      }
      return { data: null, error: null }
    }

    if (this.action === 'delete') {
      const deleted = []
      const keep = []
      for (const r of table.rows) {
        if (this.#matches(r)) deleted.push(r)
        else keep.push(r)
      }
      table.rows = keep
      if (this.hasSelect) {
        return this.#finalize(deleted)
      }
      return { data: null, error: null }
    }

    throw new Error(`fake supabase: unsupported action "${this.action}"`)
  }
}

/** Creates a fake client seeded with the 0002 base catalogue + settings. */
export function createFakeSupabaseClient() {
  const db = { tables: {}, storage: {}, authUsers: {} }
  for (const name of BASE_TABLES) db.tables[name] = { rows: [], nextId: 1 }
  db.tables.streams.rows.push(...STREAM_SEED.map((r) => ({ ...r })))
  db.tables.streams.nextId = 5
  db.tables.levels.rows.push(
    ...STREAM_SEED.flatMap((s) =>
      LEVEL_TIMERS.map((t) => ({
        id: (s.id - 1) * 5 + t.number,
        stream_id: s.id,
        number: t.number,
        name: t.name,
        default_time_seconds: t.default_time_seconds,
        overtime_penalty_per_second: t.overtime_penalty_per_second,
        is_active: true,
      }))
    )
  )
  db.tables.levels.nextId = 21
  db.tables.activity_types.rows.push(...ACTIVITY_TYPE_SEED.map((r) => ({ ...r })))
  db.tables.activity_types.nextId = 11
  db.tables.game_settings.rows.push(...SETTINGS_SEED.map((r) => ({ ...r })))
  db.tables.game_settings.nextId = 5
  db.tables.badges.rows.push(...BADGE_SEED.map((r) => ({ ...r })))
  db.tables.badges.nextId = 5

  const client = {
    from(table) {
      return new Builder(db, table)
    },
    auth: {
      /** Fake Supabase Auth `getUser(jwt)`: resolves registered tokens only. */
      async getUser(token) {
        const userId = db.authUsers[token]
        if (!userId) return { data: { user: null }, error: { message: 'Invalid JWT' } }
        return { data: { user: { id: userId } }, error: null }
      },
    },
    storage: {
      from(bucket) {
        if (!db.storage[bucket]) db.storage[bucket] = {}
        return {
          async upload(path, buffer) {
            db.storage[bucket][path] = buffer
            return { data: { path }, error: null }
          },
          async createSignedUrl(path, ttlSeconds) {
            const signedUrl = `https://fake.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=fake&ttl=${ttlSeconds}`
            return { data: { signedUrl }, error: null }
          },
          async remove(paths) {
            const list = Array.isArray(paths) ? paths : [paths]
            for (const p of list) delete db.storage[bucket][p]
            return { data: list.map((p) => ({ path: p })), error: null }
          },
          async list(folder = '', { search = null } = {}) {
            const prefix = folder ? `${folder}/` : ''
            const names = Object.keys(db.storage[bucket])
              .filter((p) => p.startsWith(prefix))
              .map((p) => p.slice(prefix.length))
              .filter((name) => (search ? name.includes(search) : true))
            return { data: names.map((name) => ({ name })), error: null }
          },
        }
      },
    },
  }

  return { client, db }
}

/**
 * Registers a Supabase Auth identity on the fake client so `auth.getUser`
 * resolves `token` to `userId` (deterministic JWT stand-in). Pairs with an
 * optional `public.admins` row (Task 5.9 admin authorization).
 */
export function addFakeAuthUser(db, { token, userId }) {
  db.authUsers[token] = userId
  return db
}

/** Seeds a `public.admins` row (0001 shape) on the fake client. */
export function seedFakeAdmin(db, { authUserId, displayName = 'Console Admin', role = 'admin', isActive = true }) {
  db.tables.admins.rows.push({
    id: authUserId,
    display_name: displayName,
    role,
    is_active: isActive,
  })
  return db
}

/** Maps a domain question fixture to a 0001 `questions` row (snake_case). */
export function questionFixtureToRow(q) {
  return {
    id: q.id,
    stream_id: q.streamId,
    level_id: q.levelId,
    activity_type_id: q.activityTypeId,
    prompt: q.prompt,
    instructions: q.instructions ?? null,
    explanation: q.explanation ?? null,
    payload: q.payload,
    correct_answer: q.correctAnswer,
    hints: q.hints ?? null,
    base_points: q.basePoints,
    timer_override_seconds: q.timerOverrideSeconds ?? null,
    status: q.status ?? 'published',
    difficulty: q.difficulty,
    grade_min: q.gradeMin,
    grade_max: q.gradeMax,
  }
}

export default { createFakeSupabaseClient, questionFixtureToRow, addFakeAuthUser, seedFakeAdmin }