export default function ProgressBar({ value, showLabel = true }) {
  return (
    <div className="progress" title={`${value}% complete`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="progress-label">{value}%</span>}
    </div>
  )
}
