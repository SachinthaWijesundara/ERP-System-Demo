import { formatMoney } from '../utils/format.js'
import { quoteTotals } from './quoteFields.js'

// The totals block at the foot of a quote. Lines that are zero are left out.
export default function QuoteTotals({ quote }) {
  const t = quoteTotals(quote)
  const discountLabel =
    quote.discount.type === 'percent' ? `Discount (${Number(quote.discount.value) || 0}%)` : 'Discount'

  return (
    <dl className="totals">
      <dt>Products and materials</dt>
      <dd>{formatMoney(t.materials)}</dd>
      {t.lineDiscounts > 0 && (
        <>
          <dt className="totals-note">includes line discounts of</dt>
          <dd className="totals-note">−{formatMoney(t.lineDiscounts)}</dd>
        </>
      )}
      <dt>Labour and installation</dt>
      <dd>{formatMoney(t.labour)}</dd>
      <dt className="totals-rule">Subtotal</dt>
      <dd className="totals-rule">{formatMoney(t.subtotal)}</dd>
      {t.discount > 0 && (
        <>
          <dt>{discountLabel}</dt>
          <dd>−{formatMoney(t.discount)}</dd>
        </>
      )}
      {t.tax > 0 && (
        <>
          <dt>VAT ({Number(quote.taxRate)}%)</dt>
          <dd>{formatMoney(t.tax)}</dd>
        </>
      )}
      <dt className="totals-grand">Total</dt>
      <dd className="totals-grand">{formatMoney(t.total)}</dd>
    </dl>
  )
}
