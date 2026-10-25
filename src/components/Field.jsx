// A labelled form field with an optional hint, or an error message in its place.
export default function Field({ label, error, hint, wide, className = '', children }) {
  return (
    <label className={`field${wide ? ' field-wide' : ''} ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
