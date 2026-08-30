import './StemLoader.css'

export function StemLoader({ label = 'Loading…', overlay = false }) {
  const spinner = (
    <span className="stem-loader" role="status" aria-label={label}>
      <span className="stem-loader__ring" aria-hidden="true" />
      <span className="stem-loader__ring" aria-hidden="true" />
      <span className="stem-loader__ring" aria-hidden="true" />
      <span className="stem-loader__ring" aria-hidden="true" />
    </span>
  )

  if (overlay) {
    return (
      <div className="stem-loader-overlay" role="status" aria-label={label}>
        {spinner}
        <span className="stem-loader-label">{label}</span>
      </div>
    )
  }

  return spinner
}

export default StemLoader
