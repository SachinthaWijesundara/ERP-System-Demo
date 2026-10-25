// Empty layout only. Each slot will hold a widget once the other modules exist
// and the dashboard is connected to them.
export default function Dashboard() {
  return (
    <div className="dashboard">
      <section className="row row-stats">
        <div className="slot slot-stat" />
        <div className="slot slot-stat" />
        <div className="slot slot-stat" />
        <div className="slot slot-stat" />
      </section>

      <section className="row row-split">
        <div className="slot slot-large" />
        <div className="slot slot-large" />
      </section>

      <section className="row">
        <div className="slot slot-wide" />
      </section>
    </div>
  )
}
