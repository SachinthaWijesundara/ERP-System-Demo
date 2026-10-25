export default function Card({ title, count, actions, children }) {
  return (
    <section className="card">
      <header className="card-head">
        <h2>{title}</h2>
        {count !== undefined && <span className="card-count">{count}</span>}
        {actions && <div className="card-actions">{actions}</div>}
      </header>
      <div className="card-body">{children}</div>
    </section>
  )
}

export function CardEmpty({ children }) {
  return <p className="card-empty">{children}</p>
}
