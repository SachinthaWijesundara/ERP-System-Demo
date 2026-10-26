import Link from '../components/RecordLink.jsx'
import StaffLink from '../components/StaffLink.jsx'
import { useData } from '../data/DataContext.jsx'
import {
  clientForInvoice,
  projectForInvoice,
  quoteForInvoice,
  saleForInvoice,
  invoiceBranch,
  invoiceStatus,
  amountPaid,
  invoiceBalance,
  invoicesForQuote,
} from '../data/links.js'
import { extraChargeLines } from '../data/billing.js'
import { quoteTotals, itemTotal, labourTotal } from '../quotations/quoteFields.js'
import { formatDate, formatMoney } from '../utils/format.js'

const rate = (qty, unit, price) => `${Number(qty).toLocaleString('en-LK')} ${unit} × ${formatMoney(price)}`

// An advance invoice carries the whole job it belongs to: every line of the
// quotation, any extras charged on the project so far (these update as the
// project changes), and how the job is billed: this advance, any progress
// invoices, and the rest, which goes on the final invoice at handover.
function AdvanceBreakdown({ data, invoice, quote, project }) {
  const t = quoteTotals(quote)
  const extras = project ? extraChargeLines(data, project) : []
  const jobTotal = t.total + extras.reduce((sum, l) => sum + l.amount, 0)
  const others = invoicesForQuote(data, quote.id).filter((i) => i.id !== invoice.id && !i.draft && i.type !== 'Final')
  const billedSoFar = invoice.amount + others.reduce((sum, i) => sum + i.amount, 0)

  return (
    <>
      <table className="table table-compact doc-table">
        <thead>
          <tr>
            <th>
              Quotation {quote.id}: {quote.title}
            </th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, i) => (
            <tr key={`item-${i}`}>
              <td className="wrap">
                {item.product}
                <div className="cell-sub">
                  {rate(item.qty, item.unit, item.price)}
                  {item.discount ? ` · ${item.discount}% off` : ''}
                </div>
              </td>
              <td className="num">{formatMoney(itemTotal(item))}</td>
            </tr>
          ))}
          {quote.labour.map((line, i) => (
            <tr key={`labour-${i}`}>
              <td className="wrap">
                {line.description}
                <div className="cell-sub">{rate(line.qty, line.unit, line.price)}</div>
              </td>
              <td className="num">{formatMoney(labourTotal(line))}</td>
            </tr>
          ))}
          {t.discount > 0 && (
            <tr>
              <td>Discount</td>
              <td className="num qty-out">−{formatMoney(t.discount)}</td>
            </tr>
          )}
          {t.tax > 0 && (
            <tr>
              <td>VAT {quote.taxRate}%</td>
              <td className="num">{formatMoney(t.tax)}</td>
            </tr>
          )}
          <tr className="doc-subtotal">
            <td>Quotation total</td>
            <td className="num">{formatMoney(t.total)}</td>
          </tr>
          {extras.map((line, i) => (
            <tr key={`extra-${i}`}>
              <td className="wrap">{line.description}</td>
              <td className="num">{formatMoney(line.amount)}</td>
            </tr>
          ))}
          {extras.length > 0 && (
            <tr className="doc-subtotal">
              <td>Job total, with extras charged on {project.id}</td>
              <td className="num">{formatMoney(jobTotal)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="table table-compact doc-table doc-billing">
        <thead>
          <tr>
            <th>How this job is billed</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Advance payment: this invoice</td>
            <td className="num">{invoice.amount > 0 ? formatMoney(invoice.amount) : 'Not set yet'}</td>
          </tr>
          {others.map((i) => (
            <tr key={i.id}>
              <td>
                {i.type} invoice {i.id}
              </td>
              <td className="num">{formatMoney(i.amount)}</td>
            </tr>
          ))}
          <tr className="doc-subtotal">
            <td>Rest of the job, billed on the final invoice at handover</td>
            <td className="num">{formatMoney(jobTotal - billedSoFar)}</td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

// The invoice as the client sees it, on screen and when printed. The
// "Receipt" buttons in the payments table are marked no-print; the client,
// project and sale names open those records on screen.
export default function InvoiceDocument({ invoice, onReceipt, onOpenRecord }) {
  const data = useData()
  const client = clientForInvoice(data, invoice)
  const project = projectForInvoice(data, invoice)
  const sale = saleForInvoice(data, invoice)
  const quote = quoteForInvoice(data, invoice)
  const status = invoiceStatus(invoice)
  const open = (module, id) => () => onOpenRecord(module, id)
  const isAdvance = invoice.type === 'Advance' && !!quote
  // Final invoices carry a breakdown; advance invoices show the whole job;
  // the others are one line.
  const lines = invoice.lines?.length
    ? invoice.lines
    : [{ description: `${invoice.type} invoice: ${invoice.description}`, amount: invoice.amount }]

  return (
    <article className="doc invoice-doc" id="invoice-document">
      <header className="invoice-head">
        <div>
          <div className="invoice-brand">IMMENSE HOME</div>
          <div className="cell-sub">Interior studio · {invoiceBranch(data, invoice)} branch</div>
        </div>
        <div className="invoice-title">
          <div className="invoice-word">
            {invoice.cancelled ? 'CANCELLED INVOICE' : invoice.draft ? 'DRAFT INVOICE' : 'INVOICE'}
          </div>
          <dl className="doc-dates">
            <dt>Invoice no.</dt>
            <dd>{invoice.id}</dd>
            <dt>Date</dt>
            <dd>{formatDate(invoice.date)}</dd>
            <dt>Due</dt>
            <dd>{formatDate(invoice.dueDate)}</dd>
          </dl>
        </div>
      </header>

      <div className="doc-parties invoice-parties">
        <div>
          <div className="doc-label">Bill to</div>
          {client ? (
            <>
              <div className="doc-strong">
                <Link onClick={open('clients', client.id)}>{client.name}</Link>
              </div>
              <div>{client.id}</div>
              <div>{client.phone}</div>
              {client.email && <div>{client.email}</div>}
            </>
          ) : (
            <div className="doc-strong">{sale?.customer?.name || 'Walk-in customer'}</div>
          )}
        </div>
        <div>
          <div className="doc-label">{project ? 'Project' : sale ? 'Sale' : 'Quotation'}</div>
          {project ? (
            <>
              <div className="doc-strong">
                <Link onClick={open('projects', project.id)}>{project.name}</Link>
              </div>
              <div>
                {project.id} · quote <Link onClick={open('quotations', project.quoteId)}>{project.quoteId}</Link>
              </div>
              {project.site && (
                <div>
                  {project.site.address}, {project.site.city}
                </div>
              )}
            </>
          ) : sale ? (
            <div className="doc-strong">
              Counter sale <Link onClick={open('pos', sale.id)}>{sale.id}</Link>
            </div>
          ) : invoice.quoteId ? (
            <div>
              Quotation <Link onClick={open('quotations', invoice.quoteId)}>{invoice.quoteId}</Link>
            </div>
          ) : (
            <div>—</div>
          )}
        </div>
      </div>

      {isAdvance ? (
        <AdvanceBreakdown data={data} invoice={invoice} quote={quote} project={project} />
      ) : (
        <table className="table table-compact doc-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="wrap">{line.description}</td>
                <td className={`num${line.amount < 0 ? ' qty-out' : ''}`}>{formatMoney(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="doc-foot invoice-foot">
        <div className="doc-text">
          {invoice.payments.length > 0 && (
            <>
              <div className="doc-label">Payments received</div>
              <table className="table table-compact table-static payments-table">
                <tbody>
                  {invoice.payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-main">{p.id}</div>
                        <div className="cell-sub">{formatDate(p.date)}</div>
                      </td>
                      <td>
                        {p.method}
                        {p.reference && <div className="cell-sub">{p.reference}</div>}
                        <div className="cell-sub">
                          Received by <StaffLink id={p.receivedById} onOpenRecord={onOpenRecord} />
                        </div>
                      </td>
                      <td className="num">{formatMoney(p.amount)}</td>
                      {onReceipt && (
                        <td className="num no-print">
                          <button type="button" className="btn btn-small" onClick={() => onReceipt(p)}>
                            Receipt
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="invoice-note">
            Please quote <strong>{invoice.id}</strong> with your payment. Thank you for choosing Immense Home.
          </p>
        </div>
        <dl className="totals">
          <dt>{isAdvance ? 'Advance payment' : 'Invoice amount'}</dt>
          <dd>{formatMoney(invoice.amount)}</dd>
          <dt>Paid to date</dt>
          <dd>−{formatMoney(amountPaid(invoice))}</dd>
          <dt className="totals-grand">
            {invoice.draft ? 'Draft total (not owed yet)' : status === 'Paid' ? 'Paid in full' : 'Balance due'}
          </dt>
          <dd className="totals-grand">{formatMoney(invoice.draft ? invoice.amount : invoiceBalance(invoice))}</dd>
        </dl>
      </div>
    </article>
  )
}
