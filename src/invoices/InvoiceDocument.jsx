import Link from '../components/RecordLink.jsx'
import { useData } from '../data/DataContext.jsx'
import {
  clientForInvoice,
  projectForInvoice,
  saleForInvoice,
  invoiceBranch,
  invoiceStatus,
  amountPaid,
  invoiceBalance,
} from '../data/links.js'
import { formatDate, formatMoney } from '../utils/format.js'

// The invoice as the client sees it, on screen and when printed. The
// "Receipt" buttons in the payments table are marked no-print; the client,
// project and sale names open those records on screen.
export default function InvoiceDocument({ invoice, onReceipt, onOpenRecord }) {
  const data = useData()
  const client = clientForInvoice(data, invoice)
  const project = projectForInvoice(data, invoice)
  const sale = saleForInvoice(data, invoice)
  const status = invoiceStatus(invoice)
  const open = (module, id) => () => onOpenRecord(module, id)
  // Final invoices carry a breakdown; the others are one line.
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
          <div className="doc-label">{project ? 'Project' : 'Sale'}</div>
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
          <dt>Invoice amount</dt>
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
