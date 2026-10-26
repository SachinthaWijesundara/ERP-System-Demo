import { useState } from 'react'
import { ArrowLeft, Pencil, CheckCircle2, XCircle, FileText, ShoppingBag, Hammer, Truck, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { CardEmpty } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Field from '../components/Field.jsx'
import Link from '../components/RecordLink.jsx'
import StaffLink from '../components/StaffLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { canSeeProject, canSeeQuote } from '../auth/visibility.js'
import {
  reservationsForItem,
  projectsUsingItem,
  quotationsUsingItem,
  salesOfItem,
  invoiceForSale,
  clientForProject,
  clientForQuote,
} from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { lineTotal } from '../pos/posFields.js'
import { branches, ALL_BRANCHES } from '../modules.js'
import {
  MOVEMENT_TYPES,
  stockAt,
  stockStatus,
  margin,
  canTakeOut,
  validateMovement,
} from './inventoryFields.js'
import MovementTable from './MovementTable.jsx'

// "Can the counter sell this?" Shows the reservation rule in action. POS runs
// the same check (canTakeOut) at checkout.
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
          Reserved stock is held for projects, so a sale can only use what’s available. POS checks this at the
          counter.
        </p>
      )}
    </Card>
  )
}

// The movement is put down to whoever is logged in. Someone tied to one
// branch can only move stock at that branch.
function RecordMovement({ item, startBranch, myBranches }) {
  const data = useData()
  const auth = useAuth()
  const blank = (b) => ({ type: 'In', branch: b, qty: '', reference: '', note: '' })
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
      date: todayIso(),
      sku: item.sku,
      branch: form.branch,
      type: form.type,
      qty: Number(form.qty),
      reference: form.reference.trim(),
      byId: auth.user.id,
      note: form.note.trim(),
    }
    data.recordMovement(movement)
    setDone(`${form.type} of ${Math.abs(movement.qty)} ${item.unit} at ${form.branch}`)
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
          <select value={form.branch} onChange={(e) => patch({ branch: e.target.value })} disabled={myBranches.length < 2}>
            {myBranches.map((b) => (
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
        <Field label="By" hint="Whoever is logged in.">
          <div className="field-static">{auth.user.name}</div>
        </Field>
        <Field label="Note (optional)" wide>
          <input value={form.note} onChange={(e) => patch({ note: e.target.value })} />
        </Field>
      </div>
      <div className="movement-foot">
        {done && <span className="diff-ok">Saved: {done}.</span>}
        <button type="button" className="btn btn-primary" onClick={save}>
          Record {form.type.toLowerCase()}
        </button>
      </div>
    </Card>
  )
}

// `onOpenRecord(module, id)` jumps to a project, quotation, sale, invoice or
// staff member. Costs, editing, stock movements and deleting each follow the
// person's role, and only the projects and quotes they can open are linked.
export default function ItemDetail({ sku, branch, onBack, onEdit, onDeleted, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const item = data.inventory.find((i) => i.sku === sku)
  if (!item) return null

  const can = auth.can
  const myBranches = branches.filter((b) => auth.allowedBranches.includes(b))
  const startBranch = branch === ALL_BRANCHES ? myBranches[0] : branch
  const reservations = reservationsForItem(data, item)
  const movements = data.movements.filter((m) => m.sku === item.sku)
  // Where this item is used. Each of these records points at the item by its
  // SKU; nothing is stored on the item itself.
  const inProjects = projectsUsingItem(data, item.sku)
  const inQuotes = quotationsUsingItem(data, item.sku)
  const inSales = salesOfItem(data, item.sku)
  const open = (module, id) => () => onOpenRecord(module, id)
  const projectLink = (project, label) => (canSeeProject(auth, project) ? <Link onClick={open('projects', project.id)}>{label}</Link> : label)
  const quoteLink = (quote, label) => (canSeeQuote(data, auth, quote) ? <Link onClick={open('quotations', quote.id)}>{label}</Link> : label)
  const canEdit = can('inventory.items') || can('inventory.prices') || can('inventory.alerts')

  // Only an item nothing has ever pointed at can be deleted.
  const deletable = can('inventory.delete') && !movements.length && !inProjects.length && !inQuotes.length && !inSales.length
  function remove() {
    if (!window.confirm(`Delete ${item.sku} · ${item.name}? This can’t be undone.`)) return
    data.deleteItem(item.sku)
    onDeleted()
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Inventory
      </button>

      <PageHeader title={item.name} subtitle={`${item.sku} · ${item.category}`}>
        {deletable && (
          <button type="button" className="btn" onClick={remove}>
            <Trash2 size={14} strokeWidth={1.75} />
            Delete
          </button>
        )}
        {canEdit && (
          <button type="button" className="btn" onClick={onEdit}>
            <Pencil size={14} strokeWidth={1.75} />
            Edit item
          </button>
        )}
      </PageHeader>

      <section className="facts-row item-facts">
        <div className="fact">
          <div className="fact-label">Unit</div>
          <div className="fact-value">{item.unit}</div>
        </div>
        {can('inventory.costs') && (
          <div className="fact">
            <div className="fact-label">Cost price</div>
            <div className="fact-value">{formatMoney(item.costPrice)}</div>
          </div>
        )}
        <div className="fact">
          <div className="fact-label">Selling price</div>
          <div className="fact-value">{formatMoney(item.sellingPrice)}</div>
        </div>
        {can('inventory.costs') && (
          <div className="fact">
            <div className="fact-label">Margin</div>
            <div className="fact-value">{margin(item)}%</div>
          </div>
        )}
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
                        <div className="cell-main">
                          {r.project ? projectLink(r.project, r.project.name) : r.projectId}
                        </div>
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

          <Card title="Used in projects" count={inProjects.length}>
            {inProjects.length === 0 ? (
              <CardEmpty>No project uses this item yet.</CardEmpty>
            ) : (
              <table className="table table-compact table-static">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Client</th>
                    <th className="num">Qty</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inProjects.map(({ project, material }) => (
                    <tr key={project.id}>
                      <td>
                        <div className="cell-main">{projectLink(project, project.name)}</div>
                        <div className="cell-sub">{project.id}</div>
                      </td>
                      <td>{clientForProject(data, project)?.name}</td>
                      <td className="num">
                        {material.qty} {item.unit}
                      </td>
                      <td>
                        <Badge>{material.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {can('quotes.view') && (
          <Card title="On quotations" count={inQuotes.length}>
            {inQuotes.length === 0 ? (
              <CardEmpty>No quotation has a line for this item yet.</CardEmpty>
            ) : (
              <table className="table table-compact table-static">
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Client</th>
                    <th className="num">Qty</th>
                    <th className="num">Price quoted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inQuotes.map(({ quote, line }) => (
                    <tr key={quote.id}>
                      <td>
                        <div className="cell-main">{quoteLink(quote, quote.id)}</div>
                        <div className="cell-sub">{quote.title}</div>
                      </td>
                      <td>{clientForQuote(data, quote)?.name}</td>
                      <td className="num">
                        {line.qty} {line.unit}
                      </td>
                      <td className="num">{formatMoney(line.price)}</td>
                      <td>
                        <Badge>{quote.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          )}

          {can('pos.view') && (
          <Card title="Counter sales" count={inSales.length}>
            {inSales.length === 0 ? (
              <CardEmpty>Not sold at the counter yet.</CardEmpty>
            ) : (
              <table className="table table-compact table-static">
                <thead>
                  <tr>
                    <th>Sale</th>
                    <th>Branch</th>
                    <th className="num">Qty</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inSales.map(({ sale, line }) => (
                    <tr key={sale.id}>
                      <td>
                        <div className="cell-main">
                          <Link onClick={open('pos', sale.id)}>{sale.id}</Link>
                        </div>
                        <div className="cell-sub">
                          {formatDate(sale.date)} · <StaffLink id={sale.cashierId} onOpenRecord={onOpenRecord} />
                          {sale.voided && ' · void'}
                        </div>
                      </td>
                      <td>{sale.branch}</td>
                      <td className="num">
                        {line.qty} {line.unit}
                      </td>
                      <td className="num">{formatMoney(lineTotal(line))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          )}

          <Card title="Movement log" count={movements.length}>
            <MovementTable movements={movements} compact onOpenRecord={onOpenRecord} />
          </Card>
        </div>

        <aside className="detail-side">
          <SellCheck item={item} startBranch={startBranch} />
          {can('inventory.stock') && (
            <RecordMovement key={item.sku} item={item} startBranch={startBranch} myBranches={myBranches} />
          )}
          <Card title="Connections">
            <ul className="links-list">
              {can('quotes.view') && (
              <li>
                <FileText size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Quotations · {inQuotes.length}</div>
                  {inQuotes.length ? (
                    inQuotes.map(({ quote, line }) => (
                      <div key={quote.id}>
                        {quoteLink(quote, quote.id)}{' '}
                        <span className="cell-sub">
                          {line.qty} {line.unit} · {quote.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="cell-sub">Not on any quote.</div>
                  )}
                </div>
              </li>
              )}
              <li>
                <Hammer size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Projects · {inProjects.length}</div>
                  {inProjects.length ? (
                    inProjects.map(({ project, material }) => (
                      <div key={project.id}>
                        {projectLink(project, project.id)}{' '}
                        <span className="cell-sub">
                          {material.qty} {item.unit} · {material.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="cell-sub">Not used on any project.</div>
                  )}
                </div>
              </li>
              {can('pos.view') && (
              <li>
                <ShoppingBag size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">
                    POS · {inSales.length} {inSales.length === 1 ? 'sale' : 'sales'}
                  </div>
                  {inSales.length ? (
                    inSales.map(({ sale, line }) => {
                      const invoice = invoiceForSale(data, sale)
                      return (
                        <div key={sale.id}>
                          <Link onClick={open('pos', sale.id)}>{sale.id}</Link>
                          {invoice && can('invoices.view') && (
                            <>
                              {' → '}
                              <Link onClick={open('invoices', invoice.id)}>{invoice.id}</Link>
                            </>
                          )}{' '}
                          <span className="cell-sub">
                            −{line.qty} {line.unit}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="cell-sub">Not sold at the counter yet.</div>
                  )}
                </div>
              </li>
              )}
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
