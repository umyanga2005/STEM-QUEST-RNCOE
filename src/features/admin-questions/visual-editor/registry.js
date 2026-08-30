/**
 * Admin Question Builder — visual authoring registry (Task 5.11A + 5.11B).
 *
 * Maps an activity type to its visual authoring form. All ten production
 * activity types ship visual forms; the raw JSON editors remain only as the
 * intentional fallback for unknown/future activity types.
 *
 * Advisory answer-integrity: the plugins’ exported cross-document rules are
 * reused verbatim to flag payload↔correctAnswer inconsistencies in the editor.
 * They are pure functions over both documents and are already shipped to the
 * browser by the client engine — no correct-answer schema is imported, so the
 * security boundary is unchanged. The server stays authoritative.
 */

import DragDropForm from './drag-drop-form.jsx'
import MatchingForm from './matching-form.jsx'
import OrderingForm from './ordering-form.jsx'
import SortingForm from './sorting-form.jsx'
import FillCompleteForm from './fill-complete-form.jsx'
import FindWordForm from './find-word-form.jsx'
import PatternForm from './pattern-form.jsx'
import MemoryForm from './memory-form.jsx'
import ScenarioChallengeForm from './scenario-challenge-form.jsx'
import NumberLogicForm from './number-logic-form.jsx'

import { validateMappings } from '../../activity-engine/plugins/drag-drop/plugin.js'
import { validatePairs } from '../../activity-engine/plugins/matching/plugin.js'
import { validateSequence } from '../../activity-engine/plugins/ordering/plugin.js'
import { validateAssignments } from '../../activity-engine/plugins/sorting/plugin.js'
import { validateBlankAnswers } from '../../activity-engine/plugins/fill-complete/plugin.js'
import { validateFindWordAnswer } from '../../activity-engine/plugins/find-word/find-word-controller.js'
import { validatePatternAnswer } from '../../activity-engine/plugins/pattern/plugin.js'
import { validateMemoryAnswer } from '../../activity-engine/plugins/memory/plugin.js'
import { validateScenarioAnswer } from '../../activity-engine/plugins/scenario-challenge/plugin.js'
import { validateNumberLogicAnswer } from '../../activity-engine/plugins/number-logic/plugin.js'

/** activityType → visual form component (absent = raw JSON fallback). */
export const VISUAL_FORMS = Object.freeze({
  'drag-drop': DragDropForm,
  matching: MatchingForm,
  ordering: OrderingForm,
  sorting: SortingForm,
  'fill-complete': FillCompleteForm,
  'find-word': FindWordForm,
  pattern: PatternForm,
  memory: MemoryForm,
  'scenario-challenge': ScenarioChallengeForm,
  'number-logic': NumberLogicForm,
})

/** activityType → cross-document integrity rule (client-safe, advisory). */
const INTEGRITY_RULES = Object.freeze({
  'drag-drop': validateMappings,
  matching: validatePairs,
  ordering: validateSequence,
  sorting: validateAssignments,
  'fill-complete': validateBlankAnswers,
  'find-word': validateFindWordAnswer,
  pattern: validatePatternAnswer,
  memory: validateMemoryAnswer,
  'scenario-challenge': validateScenarioAnswer,
  'number-logic': validateNumberLogicAnswer,
})

/** True when a visual authoring form exists for the activity type. */
export function hasVisualForm(activityType) {
  return Object.prototype.hasOwnProperty.call(VISUAL_FORMS, activityType)
}

/**
 * Advisory payload↔correctAnswer integrity check. Reuses the exact plugin
 * rules; never duplicates them. Returns `[{ path, message, ruleId }]` (empty
 * when fine or not applicable).
 */
export function checkAnswerIntegrity(activityType, payload, correctAnswer) {
  const rule = INTEGRITY_RULES[activityType]
  if (!rule || !payload || !correctAnswer) return []
  return rule(payload, correctAnswer)
}