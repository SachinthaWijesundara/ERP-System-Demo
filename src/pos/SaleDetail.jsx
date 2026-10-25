import { ArrowLeft, Printer, Download, User, Package, Receipt as ReceiptIcon, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Link from '../components/RecordLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { clientForSale, invoiceForSale, invoiceStatus } from '../data/links.js'
import { formatDate, formatMoney } from '../utils/format.js'
import { saleTotals, findCashUp } from './posFields.js'
import Receipt from './Receipt.jsx'
import { printElement } from '../utils/printElement.js'

// The PDF library is large, so it only loads when someone downloads a receipt.
async function downloadPdf(sale) {
  const { downloadReceiptPdf } = await import('./receiptPdf.js')
  downloadReceiptPdf(sale)
}

export default function SaleDetail({ saleId, justCompleted, onBack, onNewSale, onOpenRecord }) {
  const data = useData()
  const sale = data.sales.find((s) => s.id === saleId)
  if (!sale) return null

  const t = saleTotals(sale)
  const cashUp = findCashUp(data.cashUps, sale.branch, sale.date)
  const client = clientForSale(data, sale)
  const invoice = invoiceForSale(data, sale)

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Sales
      </button>

      <PageHeader title={`Sale ${sale.id}`} subtitle={`${formatDate(sale.date)}, ${sale.time} · ${sale.branch}`}>
        <button
          type="button"
          className="btn"
          onClick={() => printElement(document.getElementById('receipt'), { page: '80mm auto', margin: '4mm', title: sale.id })}
        >
          <Printer size={14} strokeWidth={1.75} />
          Print receipt
        </button>
        <button type="button" className="btn" onClick={() => downloadPdf(sale)}>
          <Download size={14} strokeWidth={1.75} />
          Download PDF
        </button>
        {justCompleted && (
          <button type="button" className="btn btn-primary" onClick={onNewSale}>
            Next sale
          </button>
        )}
      </PageHeader>

      {justCompleted && (
        <div className="success-banner">
          <CheckCircle2 size={18} strokeWidth={1.75} />
          <div>
            <strong>Sale complete · {formatMoney(t.total)}</strong>
            {sale.payment.method === 'Cash' && t.change > 0 && <div>Give change: {formatMoney(t.change)}</div>}
            {invoice && <div>Invoice {invoice.id} created and paid. Stock taken out of the {sale.branch} store.</div>}
          </div>
        </div>
      )}

      <div className="detail-grid sale-grid">
        <div className="receipt-stage">
          <Receipt sale={sale} />
        </div>

        <aside className="detail-side">
          <Card title="Summary">
            <dl className="facts">
              <dt>Total</dt>
              <dd className="cell-main">{formatMoney(t.total)}</dd>
              <dt>Payment</dt>
              <dd>
                <Badge>{sale.payment.method}</Badge>
              </dd>
              <dt>Cashier</dt>
              <dd>{sale.cashier}</dd>
              <dt>Customer</dt>
              <dd>{sale.customer?.name || 'Walk-in'}</dd>
              {sale.customer?.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>{sale.customer.phone}</dd>
                </>
              )}
              <dt>Day</dt>
              <dd>{cashUp ? `Closed by ${cashUp.closedBy}` : 'Open'}</dd>
            </dl>
          </Card>

          <Card title="Connections">
            <ul className="links-list">
              <li>
                <User size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Client</div>
                  {client ? (
                    <div>
                      <Link onClick={() => onOpenRecord('clients', client.id)}>
                        {client.name} · {client.id}
                      </Link>
                    </div>
                  ) : (
                    <div className="cell-sub">Walk-in customer, not a registered client.</div>
                  )}
                </div>
              </li>
              <li>
                <Package size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Inventory</div>
                  {sale.items
                    .filter((line) => line.sku)
                    .map((line) => (
                      <div key={line.sku}>
                        <Link onClick={() => onOpenRecord('inventory', line.sku)}>{line.name}</Link>{' '}
                        <span className="cell-sub">
                          −{line.qty} {line.unit}
                        </span>
                      </div>
                    ))}
                  <div className="cell-sub">Sold items leave the {sale.branch} store as “Out” movements.</div>
                </div>
              </li>
              <li>
                <ReceiptIcon size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Invoices and payments</div>
                  {invoice ? (
                    <div>
                      <Link onClick={() => onOpenRecord('invoices', invoice.id)}>
                        {invoice.id} · {formatMoney(invoice.amount)}
                      </Link>{' '}
                      <Badge>{invoiceStatus(invoice)}</Badge>
                    </div>
                  ) : (
                    <div className="cell-sub">No invoice found for this sale.</div>
                  )}
                </div>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}
