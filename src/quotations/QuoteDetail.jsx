import { ArrowLeft, Pencil, Download, Package, Hammer, User, Receipt, Trash2, Lock } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import Card, { CardEmpty } from '../components/Card.jsx'
import Link from '../components/RecordLink.jsx'
import StaffLink from '../components/StaffLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { canSeeQuote } from '../auth/visibility.js'
import {
  clientForQuote,
  projectsForQuote,
  canConvertToProject,
  inventoryItemForLine,
  inventorySkusForQuote,
  invoicesForQuote,
  invoiceStatus,
  costPriceFor,
} from '../data/links.js'
import { formatDate, formatMoney } from '../utils/format.js'
import { itemTotal, labourTotal, quoteTotals } from './quoteFields.js'
import { currentStageLabel } from '../projects/projectFields.js'
import QuoteTotals from './QuoteTotals.jsx'

// The PDF library is large, so it only loads when someone downloads a PDF.
async function downloadPdf(quote, client) {
  const { downloadQuotePdf } = await import('./quotePdf.js')
  downloadQuotePdf(quote, client)
}

// `onOpenRecord(module, id, filter)` jumps to a client, project, invoice,
// inventory item or staff member. Buttons and figures follow the person's
// role: editing, deleting drafts, cost and margin, invoices, and converting
// to a project each need their own permission.
export default function QuoteDetail({ quoteId, onBack, onEdit, onDeleted, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const quote = data.quotations.find((q) => q.id === quoteId)
  if (!quote) return null
  if (!canSeeQuote(data, auth, quote)) {
    return (
      <>
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={15} strokeWidth={1.75} />
          Quotations
        </button>
        <div className="no-access">
          <Lock size={20} strokeWidth={1.5} />
          <p>{quote.id} isn’t one of your quotations. Your role only shows the quotes you prepared and those behind your projects.</p>
        </div>
      </>
    )
  }
  const can = auth.can

  const client = clientForQuote(data, quote)
  const projects = projectsForQuote(data, quote.id)
  const skus = inventorySkusForQuote(data, quote)
  const invoices = invoicesForQuote(data, quote.id)
  const openClient = () => onOpenRecord('clients', quote.clientId)
  const stockLink = (sku, label) => (can('inventory.view') ? <Link onClick={() => onOpenRecord('inventory', sku)}>{label}</Link> : label)

  // Only an unsent draft with nothing hanging off it can be deleted.
  const deletable = can('quotes.delete') && quote.status === 'Draft' && invoices.length === 0 && projects.length === 0
  function remove() {
    if (!window.confirm(`Delete ${quote.id} · ${quote.title}? This can’t be undone.`)) return
    data.deleteQuotation(quote.id)
    onDeleted()
  }

  // Cost and margin: Inventory lines at Inventory's cost price. Custom-made
  // lines and labour have no cost price on file.
  const stockLines = quote.items.filter((i) => i.sku && costPriceFor(data, i.sku) !== null)
  const stockRevenue = stockLines.reduce((s, i) => s + itemTotal(i), 0)
  const stockCost = stockLines.reduce((s, i) => s + i.qty * costPriceFor(data, i.sku), 0)

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Quotations
      </button>

      <PageHeader title={quote.title} subtitle={quote.id}>
        <Badge>{quote.status}</Badge>
        <button type="button" className="btn" onClick={() => downloadPdf(quote, client)}>
          <Download size={14} strokeWidth={1.75} />
          Download PDF
        </button>
        {deletable && (
          <button type="button" className="btn" onClick={remove}>
            <Trash2 size={14} strokeWidth={1.75} />
            Delete
          </button>
        )}
        {can('quotes.edit') && (
          <button type="button" className="btn" onClick={onEdit}>
            <Pencil size={14} strokeWidth={1.75} />
            Edit
          </button>
        )}
      </PageHeader>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="doc">
            <div className="doc-parties">
              <div>
                <div className="doc-label">Quotation for</div>
                <div className="doc-strong">
                  {client ? <Link onClick={openClient}>{client.name}</Link> : 'Unknown client'}
                </div>
                <div>{quote.clientId}</div>
                {client && <div>{client.phone}</div>}
                {client?.email && <div>{client.email}</div>}
              </div>
              <div>
                <div className="doc-label">Site</div>
                {quote.site ? (
                  <>
                    <div className="doc-strong">{quote.site.label}</div>
                    <div>{quote.site.address}</div>
                    <div>{quote.site.city}</div>
                  </>
                ) : (
                  <div className="muted">No site chosen</div>
                )}
              </div>
              <dl className="doc-dates">
                <dt>Quote no.</dt>
                <dd>{quote.id}</dd>
                <dt>Date</dt>
                <dd>{formatDate(quote.date)}</dd>
                <dt>Valid until</dt>
                <dd>{formatDate(quote.validUntil)}</dd>
              </dl>
            </div>

            <h3 className="doc-heading">Products and materials</h3>
            {quote.items.length === 0 ? (
              <p className="card-empty">No products on this quote.</p>
            ) : (
              <table className="table table-compact doc-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Qty</th>
                    <th>Unit</th>
                    <th className="num">Unit price</th>
                    <th className="num">Disc.</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, i) => {
                    const stock = inventoryItemForLine(data, item)
                    return (
                      <tr key={i}>
                        <td className="wrap">
                          <div className="cell-main">
                            {stock ? stockLink(stock.sku, item.product) : item.product}
                          </div>
                          {item.description && <div className="cell-sub">{item.description}</div>}
                        </td>
                        <td className="num">{item.qty.toLocaleString('en-LK')}</td>
                        <td>{item.unit}</td>
                        <td className="num">{formatMoney(item.price)}</td>
                        <td className="num">{item.discount ? `${item.discount}%` : '—'}</td>
                        <td className="num">{formatMoney(itemTotal(item))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <h3 className="doc-heading">Labour and installation</h3>
            {quote.labour.length === 0 ? (
              <p className="card-empty">No labour on this quote.</p>
            ) : (
              <table className="table table-compact doc-table">
                <thead>
                  <tr>
                    <th>Work</th>
                    <th className="num">Qty</th>
                    <th>Unit</th>
                    <th className="num">Rate</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.labour.map((line, i) => (
                    <tr key={i}>
                      <td className="wrap cell-main">{line.description}</td>
                      <td className="num">{line.qty.toLocaleString('en-LK')}</td>
                      <td>{line.unit}</td>
                      <td className="num">{formatMoney(line.price)}</td>
                      <td className="num">{formatMoney(labourTotal(line))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="doc-foot">
              <div className="doc-text">
                {quote.notes && (
                  <>
                    <div className="doc-label">Notes</div>
                    <p>{quote.notes}</p>
                  </>
                )}
                {quote.terms && (
                  <>
                    <div className="doc-label">Terms</div>
                    <p>{quote.terms}</p>
                  </>
                )}
              </div>
              <QuoteTotals quote={quote} />
            </div>
          </section>
        </div>

        <aside className="detail-side">
          <Card title="Connections">
            <ul className="links-list">
              <li>
                <User size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Client</div>
                  <div>
                    {client ? (
                      <Link onClick={openClient}>
                        {client.name} · {client.id}
                      </Link>
                    ) : (
                      quote.clientId
                    )}
                  </div>
                  <div className="cell-sub">Name, phone and site come from the client’s record.</div>
                </div>
              </li>
              <li>
                <Package size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">
                    {skus.length > 0 && can('inventory.view') ? (
                      <Link
                        onClick={() => onOpenRecord('inventory', null, { skus, label: `${quote.id} · ${quote.title}` })}
                      >
                        Inventory · {skus.length} {skus.length === 1 ? 'item' : 'items'}
                      </Link>
                    ) : (
                      'Inventory'
                    )}
                  </div>
                  {skus.length > 0 ? (
                    skus.map((sku) => {
                      const stock = data.inventory.find((i) => i.sku === sku)
                      return (
                        <div key={sku}>
                          {stockLink(sku, stock.name)}{' '}
                          <span className="cell-sub">{sku}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="cell-sub">No stock items on this quote; every line is custom-made.</div>
                  )}
                </div>
              </li>
              {can('invoices.view') && (
                <li>
                  <Receipt size={15} strokeWidth={1.75} />
                  <div>
                    <div className="links-title">Invoices</div>
                    {invoices.length ? (
                      invoices.map((i) => (
                        <div key={i.id}>
                          <Link onClick={() => onOpenRecord('invoices', i.id)}>
                            {i.id} · {i.type} · {formatMoney(i.amount)}
                          </Link>{' '}
                          <Badge>{invoiceStatus(i)}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="cell-sub">Approving this quote opens its advance invoice; the advance amount is entered there.</div>
                    )}
                  </div>
                </li>
              )}
              <li>
                <Hammer size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Project</div>
                  {projects.length > 0 ? (
                    projects.map((p) => (
                      <div key={p.id}>
                        <Link onClick={() => onOpenRecord('projects', p.id)}>
                          {p.id} · {p.name}
                        </Link>{' '}
                        <span className="cell-sub">({currentStageLabel(p)})</span>
                      </div>
                    ))
                  ) : canConvertToProject(data, quote) && can('projects.create') ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => onOpenRecord('projects', null, { fromQuote: quote.id })}
                      >
                        Convert to project
                      </button>
                      <div className="cell-sub">
                        Opens a new project with this quote’s client, site and inventory items filled in.
                      </div>
                    </>
                  ) : (
                    <div className="cell-sub">
                      {canConvertToProject(data, quote)
                        ? 'Approved and waiting for someone who can start projects.'
                        : 'Becomes a project once the client approves this quote.'}
                    </div>
                  )}
                </div>
              </li>
            </ul>
          </Card>

          <Card title="Summary">
            <dl className="facts">
              <dt>Status</dt>
              <dd>{quote.status}</dd>
              <dt>Branch</dt>
              <dd>{client?.branch ?? '—'}</dd>
              <dt>Prepared by</dt>
              <dd>
                <StaffLink id={quote.preparedById} onOpenRecord={onOpenRecord} />
              </dd>
              <dt>Total</dt>
              <dd className="cell-main">{formatMoney(quoteTotals(quote).total)}</dd>
            </dl>
          </Card>

          {can('quotes.costs') && (
            <Card title="Cost and margin">
              {stockLines.length ? (
                <>
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        <th>Inventory line</th>
                        <th className="num">Cost</th>
                        <th className="num">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockLines.map((item, i) => {
                        const cost = item.qty * costPriceFor(data, item.sku)
                        const margin = itemTotal(item) - cost
                        return (
                          <tr key={i}>
                            <td className="wrap">{item.product}</td>
                            <td className="num">{formatMoney(cost)}</td>
                            <td className={`num${margin < 0 ? ' is-overdue' : ''}`}>
                              {itemTotal(item) > 0 ? `${Math.round((margin / itemTotal(item)) * 100)}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <dl className="facts facts-split">
                    <dt>Inventory lines sell for</dt>
                    <dd>{formatMoney(stockRevenue)}</dd>
                    <dt>Inventory cost</dt>
                    <dd>{formatMoney(stockCost)}</dd>
                    <dt className="cell-main">Margin on stock</dt>
                    <dd className="cell-main">{formatMoney(stockRevenue - stockCost)}</dd>
                  </dl>
                </>
              ) : (
                <CardEmpty>No Inventory lines, so no cost prices on file.</CardEmpty>
              )}
              <p className="cell-sub hidden-note">Custom-made lines and labour have no cost price in Inventory.</p>
            </Card>
          )}

          {client === undefined && (
            <Card title="Client missing">
              <CardEmpty>The client {quote.clientId} could not be found.</CardEmpty>
            </Card>
          )}
        </aside>
      </div>
    </>
  )
}

