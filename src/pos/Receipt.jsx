import { formatDate, formatMoney } from '../utils/format.js'
import { useData } from '../data/DataContext.jsx'
import { staffName } from '../components/StaffLink.jsx'
import { lineTotal, saleTotals } from './posFields.js'

// The receipt as it prints: narrow, like a till roll. The same layout is used
// on screen, for printing, and (in receiptPdf.js) for the PDF download.
export default function Receipt({ sale }) {
  const data = useData()
  const t = saleTotals(sale)
  return (
    <div className="receipt" id="receipt">
      {sale.voided && <div className="receipt-void">VOID · {formatDate(sale.voided.on)}</div>}
      <div className="receipt-head">
        <div className="receipt-brand">IMMENSE HOME</div>
        <div>Interior studio · {sale.branch} branch</div>
      </div>

      <dl className="receipt-meta">
        <dt>Receipt</dt>
        <dd>{sale.id}</dd>
        <dt>Date</dt>
        <dd>
          {formatDate(sale.date)}, {sale.time}
        </dd>
        <dt>Cashier</dt>
        <dd>{staffName(data, sale.cashierId)}</dd>
        {sale.customer?.name && (
          <>
            <dt>Customer</dt>
            <dd>{sale.customer.name}</dd>
          </>
        )}
      </dl>

      <ul className="receipt-items">
        {sale.items.map((item, i) => (
          <li key={i}>
            <div className="receipt-item-name">{item.name}</div>
            <div className="receipt-row">
              <span>
                {item.qty} {item.unit} × {formatMoney(item.price)}
                {item.discount ? ` · ${item.discount}% off` : ''}
              </span>
              <span>{formatMoney(lineTotal(item))}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="receipt-totals">
        {t.discount > 0 && (
          <>
            <div className="receipt-row">
              <span>Subtotal</span>
              <span>{formatMoney(t.gross)}</span>
            </div>
            <div className="receipt-row">
              <span>Discount</span>
              <span>−{formatMoney(t.discount)}</span>
            </div>
          </>
        )}
        <div className="receipt-row receipt-total">
          <span>TOTAL</span>
          <span>{formatMoney(t.total)}</span>
        </div>
        <div className="receipt-row">
          <span>Paid by</span>
          <span>{sale.payment.method}</span>
        </div>
        {sale.payment.method === 'Cash' ? (
          <>
            <div className="receipt-row">
              <span>Cash received</span>
              <span>{formatMoney(sale.payment.tendered)}</span>
            </div>
            <div className="receipt-row">
              <span>Change</span>
              <span>{formatMoney(t.change)}</span>
            </div>
          </>
        ) : (
          sale.payment.reference && (
            <div className="receipt-row">
              <span>Ref.</span>
              <span>{sale.payment.reference}</span>
            </div>
          )
        )}
      </div>

      <div className="receipt-foot">
        <div>{t.itemCount} items</div>
        <div>Thank you for shopping with Immense Home.</div>
      </div>
    </div>
  )
}
