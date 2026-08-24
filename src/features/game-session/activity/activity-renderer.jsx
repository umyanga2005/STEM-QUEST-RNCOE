/**
 * Game Session — activity render boundary (Task 5.3).
 *
 * Renders one round's activity through the plugin registry
 * (`activity-registry.js`). Consumes ONLY the server-built client-safe
 * descriptor (`buildSafeRoundDescriptor`); correct answers and scoring
 * internals never cross the API boundary (D-021). `submitted` is display-only
 * (locks the surface while the server scores); correctness and points are
 * decided server-side.
 */

import { activityComponentFor } from './activity-registry.js'

export function RoundActivity({ round, disabled = false, reducedMotion = false, submitted = false, onSubmit }) {
  const Component = activityComponentFor(round.activityType)
  if (!Component) {
    return (
      <div className="game-activity-unsupported" role="alert">
        This activity type ({round.activityType}) is not available right now.
      </div>
    )
  }
  return (
    <Component
      descriptor={round.activity}
      hints={round.hints}
      disabled={disabled}
      reducedMotion={reducedMotion}
      submitted={submitted}
      onSubmit={onSubmit}
    />
  )
}

export default RoundActivity