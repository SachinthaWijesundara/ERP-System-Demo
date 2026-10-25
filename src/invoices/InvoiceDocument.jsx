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
// "Receipt" buttons in the payments table are marked no-print.
export default function InvoiceDocument({ invoice, onReceipt }) {
  const data = useData()
  const client = clientForInvoice(data, invoice)
  const project = projectForInvoice(data, invoice)
  const sale = saleForInvoice(data, invoice)
  const status = invoiceStatus(invoice)

  return (
    <article className="doc invoice-doc" id="invoice-document">
      <header className="invoice-head">
        <div>
          <div className="invoice-brand">IMMENSE HOME</div>
          <div className="cell-sub">Interior studio · {invoiceBranch(data, invoice)} branch</div>
        </div>
        <div className="invoice-title">
          <div className="invoice-word">{invoice.cancelled ? 'CANCELLED INVOICE' : 'INVOICE'}</div>
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
              <div className="doc-strong">{client.name}</div>
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
              <div className="doc-strong">{project.name}</div>
              <div>
                {project.id} · quote {project.quoteId}
              </div>
              {project.site && (
                <div>
                  {project.site.address}, {project.site.city}
                </div>
              )}
            </>
          ) : (
            <div>{invoice.saleId ? `Counter sale ${invoice.saleId}` : '—'}</div>
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
          <tr>
            <td className="wrap">
              <div className="cell-main">{invoice.type} invoice</div>
              <div>{invoice.description}</div>
            </td>
            <td className="num cell-main">{formatMoney(invoice.amount)}</td>
          </tr>
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
          <dt className="totals-grand">{status === 'Paid' ? 'Paid in full' : 'Balance due'}</dt>
          <dd className="totals-grand">{formatMoney(invoiceBalance(invoice))}</dd>
        </dl>
      </div>
    </article>
  )
}
