// A text link that opens another record (a client, quote, item, person…).
export default function RecordLink({ onClick, children }) {
  return (
    <button type="button" className="inline-link" onClick={onClick}>
      {children}
    </button>
  )
}
