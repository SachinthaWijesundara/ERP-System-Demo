import { ArrowLeft, Printer, Download, User, Package, Receipt as ReceiptIcon, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { formatDate, formatMoney } from '../utils/format.js'
import { saleTotals, findCashUp } from './posFields.js'
import Receipt from './Receipt.jsx'

// The PDF library is large, so it only loads when someone downloads a receipt.
async function downloadPdf(sale) {
  const { downloadReceiptPdf } = await import('./receiptPdf.js')
  downloadReceiptPdf(sale)
}

export default function SaleDetail({ saleId, justCompleted, onBack, onNewSale }) {
  const data = useData()
  const sale = data.sales.find((s) => s.id === saleId)
  if (!sale) return null

  const t = saleTotals(sale)
  const cashUp = findCashUp(data.cashUps, sale.branch, sale.date)

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Sales
      </button>

      <PageHeader title={`Sale ${sale.id}`} subtitle={`${formatDate(sale.date)}, ${sale.time} · ${sale.branch}`}>
        <button type="button" className="btn" onClick={() => window.print()}>
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
                  <div className="cell-sub">
                    {sale.clientId
                      ? `Tagged to ${sale.clientId}. Not connected yet; once it is, this sale will show in the client’s history.`
                      : 'Walk-in sale. Not connected yet; sales can be linked to a client later.'}
                  </div>
                </div>
              </li>
              <li>
                <Package size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Inventory</div>
                  <div className="cell-sub">Not connected yet. Each sale will reduce stock at the {sale.branch} branch.</div>
                </div>
              </li>
              <li>
                <ReceiptIcon size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Invoices and payments</div>
                  <div className="cell-sub">Not connected yet. Each sale will be saved as a “POS sale” invoice with its payment.</div>
                </div>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}
