import { useEffect, useRef, useState } from 'react'
import { Table2, BarChart3 } from 'lucide-react'

// Small chart pieces for the dashboard, drawn as plain SVG and HTML.
// Colours come from the --series-* tokens in styles.css (a validated palette:
// slot 1 blue, slot 2 orange; red only for a loss). Marks are thin, gridlines
// are hairlines, every chart has a hover/focus tooltip and a table view, and
// text always uses the text colours, never a series colour.

// "LKR 1,250,000" -> "1.3M"; for axis ticks and tight labels.
export function compact(n) {
  const abs = Math.abs(n)
  if (abs >= 1e6) return `${(n / 1e6).toFixed(abs >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`
  if (abs >= 1e3) return `${Math.round(n / 1e3)}K`
  return String(Math.round(n))
}

// A round top for the y axis and 4 even steps up to it.
function niceScale(max) {
  if (max <= 0) return { top: 4, ticks: [0, 1, 2, 3, 4] }
  const rough = max / 4
  const mag = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough)
  return { top: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) }
}

// The width a chart has to draw in, kept up to date as the page resizes.
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// A column with a 4px round top and a square foot on the baseline.
function columnPath(x, y, w, h) {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

// The tooltip: the values lead, the names follow, each keyed by a short line
// in the series colour.
function Tooltip({ tip }) {
  if (!tip) return null
  return (
    <div className="viz-tooltip" style={{ left: tip.x, top: tip.y }} role="status">
      <div className="viz-tooltip-title">{tip.title}</div>
      {tip.rows.map((r) => (
        <div key={r.name} className="viz-tooltip-row">
          {r.color && <span className="viz-key-line" style={{ background: r.color }} />}
          <strong>{r.value}</strong>
          <span>{r.name}</span>
        </div>
      ))}
    </div>
  )
}

export function Legend({ series }) {
  if (series.length < 2) return null
  return (
    <div className="viz-legend">
      {series.map((s) => (
        <span key={s.name} className="viz-legend-item">
          <span className="viz-swatch" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  )
}

// A dashboard card holding one chart, with a switch to see the same numbers
// as a table.
export function ChartCard({ title, subtitle, table, legend, children, className = '' }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <section className={`card viz-card ${className}`}>
      <header className="card-head viz-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="cell-sub">{subtitle}</div>}
        </div>
        {table && (
          <button
            type="button"
            className="icon-button viz-toggle"
            onClick={() => setAsTable((v) => !v)}
            aria-label={asTable ? 'Show as chart' : 'Show as table'}
            title={asTable ? 'Show as chart' : 'Show as table'}
          >
            {asTable ? <BarChart3 size={15} strokeWidth={1.75} /> : <Table2 size={15} strokeWidth={1.75} />}
          </button>
        )}
      </header>
      <div className="card-body">
        {legend}
        {asTable && table ? (
          <table className="table table-compact table-static viz-table">
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th key={c} className={i ? 'num' : ''}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} className={i ? 'num' : ''}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

// Columns over time, one or two series side by side.
// points: [{ key, label, title }], series: [{ name, color, values: [] }].
// `format` turns a value into text for the tooltip and the direct label.
export function ColumnChart({ points, series, format, height = 190, labelEvery = 1 }) {
  const [ref, width] = useWidth()
  const [tip, setTip] = useState(null)
  const [hover, setHover] = useState(-1)
  const M = { top: 18, right: 4, bottom: 26, left: 40 }
  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = height - M.top - M.bottom
  const max = Math.max(0, ...series.flatMap((s) => s.values))
  const { top, ticks } = niceScale(max)
  const band = points.length ? plotW / points.length : 0
  const n = series.length
  const barW = Math.max(3, Math.min(24, (band * 0.62 - (n - 1) * 2) / n))
  const groupW = n * barW + (n - 1) * 2
  const y = (v) => M.top + plotH - (v / top) * plotH
  // One direct label: the highest column of the first series.
  const peak = series[0].values.indexOf(Math.max(...series[0].values))

  function show(i, e) {
    const box = ref.current.getBoundingClientRect()
    const cx = e?.clientX !== undefined ? e.clientX - box.left : M.left + band * i + band / 2
    setHover(i)
    setTip({
      x: Math.min(Math.max(cx, 70), width - 70),
      y: M.top,
      title: points[i].title ?? points[i].label,
      rows: series.map((s) => ({ name: s.name, color: s.color, value: format(s.values[i]) })),
    })
  }
  const hide = () => {
    setHover(-1)
    setTip(null)
  }

  return (
    <div className="viz" ref={ref} style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.name).join(' and ')}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-baseline' : 'viz-grid'} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz-tick">
                {compact(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const x0 = M.left + band * i + (band - groupW) / 2
            return (
              <g key={p.key}>
                {hover === i && <rect x={M.left + band * i} y={M.top} width={band} height={plotH} className="viz-hover-band" />}
                {series.map((s, si) => {
                  const v = s.values[i]
                  const yy = y(v)
                  return <path key={s.name} d={columnPath(x0 + si * (barW + 2), yy, barW, M.top + plotH - yy)} fill={s.color} />
                })}
                {i === peak && series[0].values[i] > 0 && (
                  <text x={x0 + barW / 2} y={y(series[0].values[i]) - 6} textAnchor="middle" className="viz-value">
                    {compact(series[0].values[i])}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text x={M.left + band * i + band / 2} y={height - 8} textAnchor="middle" className="viz-tick">
                    {p.label}
                  </text>
                )}
                {/* The whole column slot is the hover and focus target. */}
                <rect
                  x={M.left + band * i}
                  y={M.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${p.title ?? p.label}: ${series.map((s) => `${s.name} ${format(s.values[i])}`).join(', ')}`}
                  onPointerMove={(e) => show(i, e)}
                  onPointerLeave={hide}
                  onFocus={() => show(i)}
                  onBlur={hide}
                />
              </g>
            )
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

// Horizontal bars, one series. Values below zero grow left from a centre
// line (a loss shows in red, with a minus sign in its label).
// rows: [{ key, label, sub, value, onClick }].
export function BarList({ rows, format, color = 'var(--series-1)', negativeColor = 'var(--series-negative)' }) {
  const [tip, setTip] = useState(null)
  const ref = useRef(null)
  const max = Math.max(0, ...rows.map((r) => r.value))
  const min = Math.min(0, ...rows.map((r) => r.value))
  const span = max - min || 1
  const zero = (-min / span) * 100

  function show(r, e) {
    const box = ref.current.getBoundingClientRect()
    const target = e.currentTarget.getBoundingClientRect()
    setTip({
      x: Math.min(Math.max((e.clientX ?? target.left + target.width / 2) - box.left, 70), box.width - 70),
      y: target.top - box.top,
      title: r.label,
      rows: [{ name: r.sub ?? '', value: format(r.value), color: r.value < 0 ? negativeColor : color }],
    })
  }

  return (
    <div className="viz viz-bars" ref={ref}>
      {rows.map((r) => {
        const width = (Math.abs(r.value) / span) * 100
        const left = r.value < 0 ? zero - width : zero
        const Label = r.onClick ? 'button' : 'span'
        return (
          <div
            key={r.key}
            className="viz-bar-row"
            tabIndex={0}
            onPointerMove={(e) => show(r, e)}
            onPointerLeave={() => setTip(null)}
            onFocus={(e) => show(r, e)}
            onBlur={() => setTip(null)}
          >
            <Label type={r.onClick ? 'button' : undefined} className={`viz-bar-label${r.onClick ? ' inline-link' : ''}`} onClick={r.onClick}>
              {r.label}
            </Label>
            <div className="viz-bar-track">
              {min < 0 && <span className="viz-bar-zero" style={{ left: `${zero}%` }} />}
              <span
                className={`viz-bar${r.value < 0 ? ' is-negative' : ''}`}
                style={{ left: `${left}%`, width: `${Math.max(width, r.value ? 0.8 : 0)}%`, background: r.value < 0 ? negativeColor : color }}
              />
            </div>
            <span className="viz-bar-value">{format(r.value)}</span>
          </div>
        )
      })}
      <Tooltip tip={tip} />
    </div>
  )
}

// A big number with a label and a short note under it.
export function StatTile({ label, value, note, tone, onClick }) {
  const body = (
    <>
      <div className="stat-label">{label}</div>
      <div className={`stat-figure${tone ? ` is-${tone}` : ''}`}>{value}</div>
      {note && <div className="cell-sub">{note}</div>}
    </>
  )
  return onClick ? (
    <button type="button" className="stat-tile is-link" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="stat-tile">{body}</div>
  )
}

// How much is left against a limit. The track is a lighter step of the fill's
// own colour; the state is also written next to it, never colour alone.
export function Meter({ value, max, tone = 'warning' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <span className={`meter meter-${tone}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <span className="meter-fill" style={{ width: `${pct}%` }} />
    </span>
  )
}
