import { useState } from 'react'
import { ArrowLeft, Pencil, CheckCircle2, XCircle, FileText, ShoppingBag, Hammer, Truck } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { CardEmpty } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import { reservationsForItem } from '../data/links.js'
import { formatMoney, todayIso } from '../utils/format.js'
import { branches, ALL_BRANCHES } from '../modules.js'
import {
  MOVEMENT_TYPES,
  DEMO_STOREKEEPERS,
  stockAt,
  stockStatus,
  margin,
  canTakeOut,
  nextMovementId,
  movementDelta,
  validateMovement,
} from './inventoryFields.js'
import MovementTable from './MovementTable.jsx'

// "Can the counter sell this?" Shows the reservation rule in action. POS
// will run the same check (canTakeOut) once it's connected to Inventory.
function SellCheck({ item, startBranch }) {
  const [branch, setBranch] = useState(startBranch)
  const [qty, setQty] = useState('')
  const result = qty !== '' && Number(qty) > 0 ? canTakeOut(item, branch, qty) : null
  return (
    <Card title="Can the counter sell this?">
      <div className="sell-check">
        <Field label="Branch">
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label={`Customer wants (${item.unit})`}>
          <input type="number" min="1" className="num" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 15" />
        </Field>
      </div>
      {result ? (
        <div className={`check-result ${result.ok ? 'is-ok' : 'is-no'}`}>
          {result.ok ? <CheckCircle2 size={16} strokeWidth={1.75} /> : <XCircle size={16} strokeWidth={1.75} />}
          <span>{result.message}</span>
        </div>
      ) : (
        <p className="cell-sub">
          Reserved stock is held for projects, so a sale can only use what’s available. POS will apply this rule once
          it’s connected.
        </p>
      )}
    </Card>
  )
}

function RecordMovement({ item, startBranch }) {
  const data = useData()
  const blank = (b) => ({ type: 'In', branch: b, qty: '', reference: '', by: DEMO_STOREKEEPERS[b] ?? '', note: '' })
  const [form, setForm] = useState(blank(startBranch))
  const [submitted, setSubmitted] = useState(false)
  const [done, setDone] = useState(null)

  const errors = validateMovement(form, item)
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  function save() {
    setSubmitted(true)
    if (Object.keys(errors).length) return
    const movement = {
      id: nextMovementId(data.movements),
      date: todayIso(),
      sku: item.sku,
      branch: form.branch,
      type: form.type,
      qty: Number(form.qty),
      reference: form.reference.trim(),
      by: form.by.trim(),
      note: form.note.trim(),
    }
    data.recordMovement(movement, movementDelta(movement))
    setDone(movement.id)
    setForm(blank(form.branch))
    setSubmitted(false)
  }

  const hints = {
    In: 'Stock arriving, e.g. GRN-1043 from a supplier, or a customer return.',
    Out: 'Stock leaving, e.g. issued to a project or used in the showroom. Reserved stock can’t be taken.',
    Adjustment: 'A correction after counting, or damage. Use a minus for less, e.g. -2.',
  }

  return (
    <Card title="Record a movement">
      <div className="segmented segmented-full" role="group" aria-label="Movement type">
        {MOVEMENT_TYPES.map((t) => (
          <button key={t} type="button" className={form.type === t ? 'is-active' : ''} onClick={() => patch({ type: t })}>
            {t}
          </button>
        ))}
      </div>
      <p className="cell-sub movement-hint">{hints[form.type]}</p>
      <div className="form-grid">
        <Field label="Branch" error={errorFor('branch')}>
          <select
            value={form.branch}
            onChange={(e) => {
              const b = e.target.value
              // Swap in the new branch's storekeeper unless someone else was typed.
              setForm((f) => ({ ...f, branch: b, by: f.by === DEMO_STOREKEEPERS[f.branch] ? DEMO_STOREKEEPERS[b] : f.by }))
            }}
          >
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label={`Quantity (${item.unit})`} error={errorFor('qty')}>
          <input type="number" className="num" value={form.qty} onChange={(e) => patch({ qty: e.target.value })} aria-invalid={!!errorFor('qty')} />
        </Field>
        <Field label="Reference" error={errorFor('reference')}>
          <input value={form.reference} onChange={(e) => patch({ reference: e.target.value })} placeholder="GRN-1043, Issued to PRJ-0008…" aria-invalid={!!errorFor('reference')} />
        </Field>
        <Field label="By" error={errorFor('by')}>
          <input value={form.by} onChange={(e) => patch({ by: e.target.value })} aria-invalid={!!errorFor('by')} />
        </Field>
        <Field label="Note (optional)" wide>
          <input value={form.note} onChange={(e) => patch({ note: e.target.value })} />
        </Field>
      </div>
      <div className="movement-foot">
        {done && <span className="diff-ok">Saved as {done}.</span>}
        <button type="button" className="btn btn-primary" onClick={save}>
          Record {form.type.toLowerCase()}
        </button>
      </div>
    </Card>
  )
}

export default function ItemDetail({ sku, branch, onBack, onEdit }) {
  const data = useData()
  const item = data.inventory.find((i) => i.sku === sku)
  if (!item) return null

  const startBranch = branch === ALL_BRANCHES ? branches[0] : branch
  const reservations = reservationsForItem(data, item)
  const movements = data.movements.filter((m) => m.sku === item.sku)

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Inventory
      </button>

      <PageHeader title={item.name} subtitle={`${item.sku} · ${item.category}`}>
        <button type="button" className="btn" onClick={onEdit}>
          <Pencil size={14} strokeWidth={1.75} />
          Edit item
        </button>
      </PageHeader>

      <section className="facts-row item-facts">
        <div className="fact">
          <div className="fact-label">Unit</div>
          <div className="fact-value">{item.unit}</div>
        </div>
        <div className="fact">
          <div className="fact-label">Cost price</div>
          <div className="fact-value">{formatMoney(item.costPrice)}</div>
        </div>
        <div className="fact">
          <div className="fact-label">Selling price</div>
          <div className="fact-value">{formatMoney(item.sellingPrice)}</div>
        </div>
        <div className="fact">
          <div className="fact-label">Margin</div>
          <div className="fact-value">{margin(item)}%</div>
        </div>
        <div className="fact">
          <div className="fact-label">Low-stock alert at</div>
          <div className="fact-value">
            {item.lowStockLevel} {item.unit}
          </div>
        </div>
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <Card title="Stock by branch">
            <table className="table table-compact table-static">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th className="num">On hand</th>
                  <th className="num">Reserved for projects</th>
                  <th className="num">Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => {
                  const s = stockAt(item, b)
                  return (
                    <tr key={b}>
                      <td className="cell-main">{b}</td>
                      <td className="num">
                        {s.onHand.toLocaleString('en-LK')} {item.unit}
                      </td>
                      <td className="num">{s.reserved ? s.reserved.toLocaleString('en-LK') : '—'}</td>
                      <td className="num cell-main">{s.available.toLocaleString('en-LK')}</td>
                      <td>
                        <Badge>{stockStatus(item, b)}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {item.description && <p className="card-intro item-desc">{item.description}</p>}
          </Card>

          <Card title="Reserved for projects" count={reservations.length}>
            {reservations.length === 0 ? (
              <CardEmpty>Nothing reserved. All stock on hand is available.</CardEmpty>
            ) : (
              <table className="table table-compact table-static">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Branch</th>
                    <th className="num">Reserved</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <div className="cell-main">{r.project?.name ?? r.projectId}</div>
                        <div className="cell-sub">{r.projectId}</div>
                      </td>
                      <td>{r.branch}</td>
                      <td className="num cell-main">
                        {r.qty} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="cell-sub reserve-note">
              These come straight from the projects: marking a material Reserved on a project holds it here, and
              marking it Issued takes it out of stock with an “Out” movement.
            </p>
          </Card>

          <Card title="Movement log" count={movements.length}>
            <MovementTable movements={movements} compact />
          </Card>
        </div>

        <aside className="detail-side">
          <SellCheck item={item} startBranch={startBranch} />
          <RecordMovement key={item.sku} item={item} startBranch={startBranch} />
          <Card title="Connections">
            <ul className="links-list">
              <li>
                <FileText size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Quotations</div>
                  <div className="cell-sub">Connected. Quote lines pick this item with its unit and selling price.</div>
                </div>
              </li>
              <li>
                <ShoppingBag size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">POS</div>
                  <div className="cell-sub">Not connected yet. Sales will reduce stock and can’t use reserved stock.</div>
                </div>
              </li>
              <li>
                <Hammer size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Projects</div>
                  <div className="cell-sub">Connected. Projects reserve this item and then use it.</div>
                </div>
              </li>
              <li>
                <Truck size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Suppliers</div>
                  <div className="cell-sub">Phase 2. Goods received from suppliers will be recorded as stock in.</div>
                </div>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}
