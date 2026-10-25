// Small coloured label for statuses. The CSS class comes from the text,
// e.g. "Partly paid" -> badge-partly-paid.
export default function Badge({ children }) {
  const tone = String(children).toLowerCase().replace(/\s+/g, '-')
  return <span className={`badge badge-${tone}`}>{children}</span>
}
