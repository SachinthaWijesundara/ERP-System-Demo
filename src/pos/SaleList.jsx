import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { PAYMENT_METHODS, saleTotals } from './posFields.js'
import { ALL_BRANCHES } from '../modules.js'

const PERIODS = ['Today', 'Last 7 days', 'All']

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// True when the search text appears in the sale number, cashier, customer
// or any item sold.
function matches(sale, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [sale.id, sale.cashier, sale.customer?.name ?? '', sale.customer?.phone ?? '', ...sale.items.map((i) => i.name)]
    .some((text) => text.toLowerCase().includes(q))
}

export default function SaleList({ query, branch, onOpen }) {
  const data = useData()
  const [period, setPeriod] = useState('Today')
  const today = todayIso()

  const allBranches = branch === ALL_BRANCHES
  const inBranch = allBranches ? data.sales : data.sales.filter((s) => s.branch === branch)
  const inPeriod = (s, p) => p === 'All' || (p === 'Today' ? s.date === today : s.date >= daysAgo(6))
  const found = inBranch.filter((s) => matches(s, query))
  const rows = found.filter((s) => inPeriod(s, period))

  // Today's figures for the strip at the top, for the chosen branch.
  const todays = inBranch.filter((s) => s.date === today)
  const sumBy = (method) =>
    todays.filter((s) => !method || s.payment.method === method).reduce((sum, s) => sum + saleTotals(s).total, 0)

  return (
    <>
      <section className="pos-strip">
        <div>
          <div className="fact-label">Today’s sales</div>
          <div className="pos-strip-value">{formatMoney(sumBy())}</div>
          <div className="cell-sub">{todays.length} sales{allBranches ? ', both branches' : ` at ${branch}`}</div>
        </div>
        {PAYMENT_METHODS.map((m) => (
          <div key={m}>
            <div className="fact-label">{m}</div>
            <div className="pos-strip-value">{formatMoney(sumBy(m))}</div>
          </div>
        ))}
      </section>

      <div className="toolbar">
        <div className="tabs">
          {PERIODS.map((p) => (
            <button key={p} type="button" className={`tab${period === p ? ' is-active' : ''}`} onClick={() => setPeriod(p)}>
              {p}
              <span className="tab-count">{found.filter((s) => inPeriod(s, p)).length}</span>
            </button>
          ))}
        </div>
        {query.trim() && <span className="toolbar-note">Results for “{query.trim()}”</span>}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Sale</th>
              {allBranches && <th>Branch</th>}
              <th>Cashier</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Payment</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const t = saleTotals(s)
              return (
                <tr key={s.id} onClick={() => onOpen(s.id)}>
                  <td>
                    <div className="cell-main">{s.id}</div>
                    <div className="cell-sub">
                      {formatDate(s.date)} · {s.time}
                    </div>
                  </td>
                  {allBranches && <td>{s.branch}</td>}
                  <td>{s.cashier}</td>
                  <td>{s.customer?.name || <span className="muted">Walk-in</span>}</td>
                  <td className="wrap cell-items">
                    {s.items.map((i) => i.name).join(' · ')}
                    <div className="cell-sub">{t.itemCount} items</div>
                  </td>
                  <td>
                    <Badge>{s.payment.method}</Badge>
                  </td>
                  <td className="num cell-main">{formatMoney(t.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="empty">
            {query.trim()
              ? `No sales match “${query.trim()}”${period === 'All' ? '' : ` in ${period.toLowerCase()}`}.`
              : period === 'Today'
                ? 'No sales yet today.'
                : 'No sales in this period.'}
          </div>
        )}
      </div>
    </>
  )
}
