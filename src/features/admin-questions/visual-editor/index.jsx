import { VISUAL_FORMS } from './registry.js'

/**
 * Renders the visual authoring form for an activity type, or `null` when the
 * type has no visual form yet (the caller falls back to the raw JSON editors).
 */
export default function VisualFormFor({ activityType, ...props }) {
  const Form = VISUAL_FORMS[activityType] ?? null
  if (!Form) return null
  return <Form {...props} />
}