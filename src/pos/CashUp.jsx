import { useState } from 'react'
import { Lock, CheckCircle2 } from 'lucide-react'
import Field from '../components/Field.jsx'
import StaffLink from '../components/StaffLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { branches, ALL_BRANCHES } from '../modules.js'
import {
  PAYMENT_METHODS,
  OPENING_FLOAT,
  nowTime,
  cashUpSummary,
  findCashUp,
} from './posFields.js'

function Difference({ value }) {
  if (value === null) return <span className="muted">Count the drawer</span>
  if (value === 0) return <span className="diff-ok">Balanced</span>
  return (
    <span className={value < 0 ? 'diff-short' : 'diff-over'}>
      {value < 0 ? `Short ${formatMoney(-value)}` : `Over ${formatMoney(value)}`}
    </span>
  )
}

// End of day: totals by payment method, count the cash drawer, close the day.
// The day is closed by whoever is logged in, and only with "close the day".
// Someone tied to one branch only sees and closes that branch.
export default function CashUp({ branch: switcherBranch, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const canClose = auth.can('pos.cashup')
  const myBranches = branches.filter((b) => auth.allowedBranches.includes(b))
  const [branch, setBranch] = useState(myBranches.includes(switcherBranch) ? switcherBranch : myBranches[0])
  const [date, setDate] = useState(todayIso())
  const [form, setForm] = useState({ openingFloat: OPENING_FLOAT, counted: '', notes: '' })
  const [submitted, setSubmitted] = useState(false)

  const closed = findCashUp(data.cashUps, branch, date)
  const source = closed ?? form
  const summary = cashUpSummary(data.sales, branch, date, source.openingFloat, source.counted)

  const countError = submitted && (form.counted === '' || Number(form.counted) < 0) ? 'Enter the cash counted in the drawer.' : undefined

  function closeDay() {
    setSubmitted(true)
    if (form.counted === '' || Number(form.counted) < 0) return
    data.addCashUp({
      branch,
      date,
      openingFloat: Number(form.openingFloat) || 0,
      counted: Number(form.counted),
      closedById: auth.user.id,
      closedAt: nowTime(),
      notes: form.notes.trim(),
    })
    setForm({ openingFloat: OPENING_FLOAT, counted: '', notes: '' })
    setSubmitted(false)
  }

  const history = data.cashUps
    .filter((c) => (switcherBranch === ALL_BRANCHES ? myBranches.includes(c.branch) : c.branch === switcherBranch))
    .slice()
    .sort((a, b) => (a.date === b.date ? a.branch.localeCompare(b.branch) : b.date.localeCompare(a.date)))

  return (
    <>
      <div className="cashup-pick">
        <Field label="Branch">
          <select value={branch} onChange={(e) => setBranch(e.target.value)} disabled={myBranches.length < 2}>
            {myBranches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label="Day">
          <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className={`cashup-state${closed ? ' is-closed' : ''}`}>
          {closed ? <Lock size={15} strokeWidth={1.75} /> : null}
          {closed ? (
            <span>
              Closed by <StaffLink id={closed.closedById} onOpenRecord={onOpenRecord} /> at {closed.closedAt}
            </span>
          ) : (
            'Day open'
          )}
        </div>
      </div>

      <div className="cashup">
        <section className="card">
          <header className="card-head">
            <h2>
              {branch} · {formatDate(date)}
            </h2>
            <span className="card-count">{summary.count} sales</span>
          </header>
          <div className="card-body">
            <dl className="totals cashup-totals">
              {PAYMENT_METHODS.map((m) => (
                <div key={m} className="totals-pair">
                  <dt>{m} sales</dt>
                  <dd>{formatMoney(summary.byMethod[m])}</dd>
                </div>
              ))}
              <dt className="totals-grand">Total takings</dt>
              <dd className="totals-grand">{formatMoney(summary.total)}</dd>
            </dl>
            <p className="card-intro cashup-note">
              Card and bank transfer money goes straight to the bank. Only cash is counted in the drawer.
            </p>
          </div>
        </section>

        <section className="card">
          <header className="card-head">
            <h2>Cash drawer</h2>
          </header>
          <div className="card-body cashup-drawer">
            <div className="drawer-row">
              <span>Opening float</span>
              {closed || !canClose ? (
                <strong>{formatMoney(closed ? closed.openingFloat : form.openingFloat)}</strong>
              ) : (
                <input
                  type="number"
                  min="0"
                  className="num"
                  value={form.openingFloat}
                  onChange={(e) => setForm({ ...form, openingFloat: e.target.value })}
                  aria-label="Opening float"
                />
              )}
            </div>
            <div className="drawer-row">
              <span>+ Cash sales</span>
              <strong>{formatMoney(summary.byMethod.Cash)}</strong>
            </div>
            <div className="drawer-row drawer-expected">
              <span>Expected in drawer</span>
              <strong>{formatMoney(summary.expected)}</strong>
            </div>
            <div className="drawer-row">
              <span>Counted</span>
              {closed || !canClose ? (
                closed ? <strong>{formatMoney(closed.counted)}</strong> : <span className="muted">Not counted</span>
              ) : (
                <input
                  type="number"
                  min="0"
                  className="num"
                  value={form.counted}
                  onChange={(e) => setForm({ ...form, counted: e.target.value })}
                  placeholder="0"
                  aria-label="Cash counted"
                  aria-invalid={!!countError}
                />
              )}
            </div>
            {countError && <p className="field-error">{countError}</p>}
            <div className="drawer-row drawer-diff">
              <span>Difference</span>
              <Difference value={summary.difference} />
            </div>

            {closed ? (
              closed.notes && <p className="notes">{closed.notes}</p>
            ) : !canClose ? (
              <p className="cell-sub hidden-note">Your role can’t close the day.</p>
            ) : (
              <>
                <div className="form-grid">
                  <Field label="Closed by" hint="Whoever is logged in.">
                    <div className="field-static">{auth.user.name}</div>
                  </Field>
                  <Field label="Notes">
                    <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Explain any difference" />
                  </Field>
                </div>
                <button type="button" className="btn btn-primary btn-block" onClick={closeDay}>
                  <CheckCircle2 size={15} strokeWidth={1.75} />
                  Close the day
                </button>
                <p className="cell-sub">Once closed, no more sales can be added to this day at {branch}.</p>
              </>
            )}
          </div>
        </section>
      </div>

      <h2 className="section-title">Past cash-ups</h2>
      <div className="table-wrap">
        <table className="table table-static">
          <thead>
            <tr>
              <th>Day</th>
              <th>Branch</th>
              {PAYMENT_METHODS.map((m) => (
                <th key={m} className="num">
                  {m}
                </th>
              ))}
              <th className="num">Expected cash</th>
              <th className="num">Counted</th>
              <th>Difference</th>
              <th>Closed by</th>
            </tr>
          </thead>
          <tbody>
            {history.map((c) => {
              const s = cashUpSummary(data.sales, c.branch, c.date, c.openingFloat, c.counted)
              return (
                <tr key={`${c.branch}-${c.date}`}>
                  <td className="cell-main">{formatDate(c.date)}</td>
                  <td>{c.branch}</td>
                  {PAYMENT_METHODS.map((m) => (
                    <td key={m} className="num">
                      {formatMoney(s.byMethod[m])}
                    </td>
                  ))}
                  <td className="num">{formatMoney(s.expected)}</td>
                  <td className="num">{formatMoney(c.counted)}</td>
                  <td>
                    <Difference value={s.difference} />
                  </td>
                  <td>
                    <StaffLink id={c.closedById} onOpenRecord={onOpenRecord} />
                    <div className="cell-sub">{c.closedAt}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {history.length === 0 && <div className="empty">No days closed yet.</div>}
      </div>
    </>
  )
}
