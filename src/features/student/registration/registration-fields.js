/**
 * Student — registration form model (Task 5.1).
 *
 * Dependency-free descriptors the registration page renders from. Kept in
 * plain JS so the form contract (fields, labels, grade options, optional
 * photo, submit labels) is unit-testable without a DOM or a component
 * framework. The page renders exactly these; validation reuses the shared
 * server validation module for identical client/server messages.
 */

import {
  ALLOWED_REGISTRATION_FIELDS,
  GRADE_OPTIONS,
  MAX_INITIALS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SCHOOL_LENGTH,
  validateRegistrationInput,
} from '../validation.js'

/** Inputs the student may set. Mirrors ALLOWED_REGISTRATION_FIELDS. */
export const REGISTRATION_FIELDS = Object.freeze([
  {
    name: 'initials',
    label: 'Initials',
    hint: 'Short form of your name — for example, A. Silva or JM.',
    required: true,
    maxLength: MAX_INITIALS_LENGTH,
    autoComplete: 'nickname',
    inputMode: 'text',
  },
  {
    name: 'name',
    label: 'Name',
    hint: 'Your full name.',
    required: true,
    maxLength: MAX_NAME_LENGTH,
    autoComplete: 'name',
    inputMode: 'text',
  },
  {
    name: 'school',
    label: 'School',
    hint: 'Your school name.',
    required: true,
    maxLength: MAX_SCHOOL_LENGTH,
    autoComplete: 'organization',
    inputMode: 'text',
  },
  {
    name: 'grade',
    label: 'Grade',
    required: true,
    autoComplete: 'off',
  },
])

export const PROFILE_PHOTO = Object.freeze({
  name: 'photo',
  label: 'Profile photo',
  optionalLabel: 'Profile photo (optional)',
  required: false,
  accept: 'image/jpeg,image/png,image/webp',
  maxBytes: 204800,
  chooseLabel: 'Choose Photo',
  removeLabel: 'Remove photo',
})

export const GRADE_OPTIONS_UI = GRADE_OPTIONS

export const SUBMIT_LABEL = 'Start Your STEM Quest'
export const SUBMITTING_LABEL = 'Starting your mission…'
export const NEXT_STEP_PATH = '/student/mission'

export function fieldMessageFor(errors, name) {
  return errors && errors[name] ? errors[name] : null
}

export { validateRegistrationInput, ALLOWED_REGISTRATION_FIELDS, GRADE_OPTIONS }

export default {
  REGISTRATION_FIELDS,
  PROFILE_PHOTO,
  GRADE_OPTIONS_UI,
  SUBMIT_LABEL,
  SUBMITTING_LABEL,
  NEXT_STEP_PATH,
  fieldMessageFor,
  validateRegistrationInput,
}