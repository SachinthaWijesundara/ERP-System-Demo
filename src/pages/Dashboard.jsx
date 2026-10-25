// Empty layout only. Each slot will hold a widget once the other modules exist
// and the dashboard is connected to them. The grey bars are placeholders that
// show where a widget's title and content will sit.

function StatSlot() {
  return (
    <div className="slot slot-stat">
      <div className="ph ph-label" />
      <div className="ph ph-value" />
      <div className="ph ph-note" />
    </div>
  )
}

function PanelSlot({ className = '' }) {
  return (
    <div className={`slot slot-panel ${className}`}>
      <div className="slot-head">
        <div className="ph ph-title" />
        <div className="ph ph-action" />
      </div>
      <div className="slot-body" />
    </div>
  )
}

export default function Dashboard() {
  return (
    <div className="dashboard">
      <section className="row row-stats">
        <StatSlot />
        <StatSlot />
        <StatSlot />
        <StatSlot />
      </section>

      <section className="row row-split">
        <PanelSlot className="slot-large" />
        <PanelSlot className="slot-large" />
      </section>

      <section className="row">
        <PanelSlot className="slot-wide" />
      </section>
    </div>
  )
}
