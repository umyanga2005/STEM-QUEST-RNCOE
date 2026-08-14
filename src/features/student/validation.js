/**
 * Student — registration field validation (Task 5.1).
 *
 * Pure, dependency-free validation shared by the authoritative server service
 * and the friendly client-side inline checks. Server-side validation is
 * authoritative; the client never bypasses it.
 *
 * The DB constraint set (0001 migration) is the hard floor:
 *   students.initials  text CHECK char_length BETWEEN 1 AND 5
 *   students.grade     smallint CHECK BETWEEN 6 AND 11
 *   students.school_id bigint  NOT NULL (resolved from the school name)
 *   students.full_name text    NOT NULL
 *
 * Names and schools must support Unicode (Sri Lankan names are not ASCII).
 */

/** Only these fields may appear in a registration request (strict gate). */
export const ALLOWED_REGISTRATION_FIELDS = Object.freeze(['initials', 'name', 'school', 'grade'])

export const GRADE_OPTIONS = Object.freeze([6, 7, 8, 9, 10, 11])
export const MIN_GRADE = 6
export const MAX_GRADE = 11
export const MAX_NAME_LENGTH = 100
export const MAX_SCHOOL_LENGTH = 120
export const MAX_INITIALS_LENGTH = 5

function clean(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isBlank(value) {
  return clean(value).length === 0
}

function isReasonableLength(value, max) {
  return value.length <= max
}

/**
 * @param {unknown} body - parsed JSON request body.
 * @returns {{ ok: true, value: { initials: string, name: string, school: string, grade: number } }}
 *        | { ok: false, errors: Record<string, string>, unexpected?: string }
 */
export function validateRegistrationInput(body) {
  const errors = {}
  const raw = body && typeof body === 'object' ? body : {}

  const unexpected = Object.keys(raw).find((key) => !ALLOWED_REGISTRATION_FIELDS.includes(key))
  if (unexpected !== undefined) {
    return { ok: false, errors: {}, unexpected }
  }

  const initials = clean(raw.initials)
  const name = clean(raw.name)
  const school = clean(raw.school)
  const gradeRaw = raw.grade

  if (isBlank(initials)) {
    errors.initials = 'Please enter your initials.'
  } else if (!isReasonableLength(initials, MAX_INITIALS_LENGTH)) {
    errors.initials = 'Initials must be 5 characters or fewer.'
  }

  if (isBlank(name)) {
    errors.name = 'Please enter your name.'
  } else if (!isReasonableLength(name, MAX_NAME_LENGTH)) {
    errors.name = 'Name is too long.'
  }

  if (isBlank(school)) {
    errors.school = 'Please enter your school.'
  } else if (!isReasonableLength(school, MAX_SCHOOL_LENGTH)) {
    errors.school = 'School name is too long.'
  }

  const grade = parseGrade(gradeRaw)
  if (grade === null) {
    errors.grade = 'Grade must be a whole number from 6 to 11.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, value: { initials, name, school, grade } }
}

/**
 * Grade must be an integer in [6, 11]. Accepts a JS number or an integer
 * numeric string ('7', '07'). Rejects 5, 12, 6.5, 'abc', ''.
 * @returns {number|null}
 */
export function parseGrade(value) {
  if (value === null || value === undefined || value === '') return null
  let n = NaN
  if (typeof value === 'number') {
    n = value
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!/^\d+$/.test(trimmed)) return null
    n = Number(trimmed)
  } else {
    return null
  }
  if (!Number.isInteger(n)) return null
  if (n < MIN_GRADE || n > MAX_GRADE) return null
  return n
}

export default {
  ALLOWED_REGISTRATION_FIELDS,
  GRADE_OPTIONS,
  MIN_GRADE,
  MAX_GRADE,
  MAX_NAME_LENGTH,
  MAX_SCHOOL_LENGTH,
  MAX_INITIALS_LENGTH,
  validateRegistrationInput,
  parseGrade,
}