import { useState } from 'react'
import { ArrowLeft, Minus, Plus, X, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import { productsForPos } from '../data/links.js'
import { formatMoney, todayIso } from '../utils/format.js'
import { UNITS } from '../quotations/quoteFields.js'
import { branches } from '../modules.js'
import {
  PAYMENT_METHODS,
  DEMO_CASHIERS,
  nextSaleId,
  nowTime,
  lineTotal,
  saleTotals,
  validateSale,
  cleanSale,
  findCashUp,
} from './posFields.js'

// The counter screen: pick items on the left, take payment on the right.
export default function Checkout({ branch, onCancel, onComplete }) {
  const data = useData()
  const products = productsForPos(data)
  const startBranch = branches.includes(branch) ? branch : ''

  const [sale, setSale] = useState(() => ({
    id: nextSaleId(data.sales),
    date: todayIso(),
    time: nowTime(),
    branch: startBranch,
    cashier: DEMO_CASHIERS[startBranch] ?? '',
    customer: { name: '', phone: '' },
    clientId: '',
    items: [],
    payment: { method: 'Cash', tendered: '', reference: '' },
  }))
  const [filter, setFilter] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const closedDay = !!(sale.branch && findCashUp(data.cashUps, sale.branch, sale.date))
  const errors = validateSale(sale, data.sales, closedDay)
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const t = saleTotals(sale)

  const update = (patch) => setSale((s) => ({ ...s, ...patch }))
  const setItem = (i, patch) => update({ items: sale.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })
  const setPayment = (patch) => update({ payment: { ...sale.payment, ...patch } })

  // Tapping a product adds it, or adds one more if it's already in the cart.
  function addProduct(p) {
    const at = sale.items.findIndex((i) => i.sku === p.sku)
    if (at >= 0) setItem(at, { qty: Number(sale.items[at].qty) + 1 })
    else update({ items: [...sale.items, { sku: p.sku, name: p.name, qty: 1, unit: p.unit, price: p.price, discount: 0 }] })
  }

  const addCustomItem = () => update({ items: [...sale.items, { sku: '', name: '', qty: 1, unit: 'piece', price: 0, discount: 0 }] })

  function chooseBranch(e) {
    const b = e.target.value
    update({ branch: b, cashier: sale.cashier || DEMO_CASHIERS[b] || '' })
  }

  function complete() {
    setSubmitted(true)
    if (Object.keys(errors).length === 0) onComplete({ ...cleanSale(sale), time: nowTime() })
  }

  const shown = products.filter((p) =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(filter.trim().toLowerCase()),
  )

  return (
    <>
      <button type="button" className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Sales
      </button>
      <PageHeader title="New sale" subtitle={`${sale.id} · ${sale.branch || 'choose a branch'}`} />

      <div className="checkout">
        <section className="card checkout-products">
          <header className="card-head">
            <h2>Showroom items</h2>
            <label className="mini-search">
              <Search size={14} strokeWidth={1.75} />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find an item" />
            </label>
          </header>
          <div className="card-body">
            <div className="product-grid">
              {shown.map((p) => (
                <button key={p.sku} type="button" className="product-tile" onClick={() => addProduct(p)}>
                  <span className="product-cat">{p.category}</span>
                  <span className="product-name">{p.name}</span>
                  <span className="product-price">
                    {formatMoney(p.price)} <span className="cell-sub">/ {p.unit}</span>
                  </span>
                </button>
              ))}
            </div>
            {shown.length === 0 && <p className="card-empty">Nothing matches “{filter}”.</p>}
            <button type="button" className="btn btn-ghost" onClick={addCustomItem}>
              <Plus size={15} strokeWidth={1.75} />
              Item not in the list
            </button>
          </div>
        </section>

        <section className="card checkout-cart">
          <header className="card-head">
            <h2>Sale</h2>
            <span className="card-count">{t.itemCount} items</span>
          </header>
          <div className="card-body cart-body">
            <div className="form-grid">
              <Field label="Branch" error={errorFor('branch')}>
                <select value={sale.branch} onChange={chooseBranch} aria-invalid={!!errorFor('branch')}>
                  <option value="">Choose…</option>
                  {branches.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cashier" error={errorFor('cashier')}>
                <input value={sale.cashier} onChange={(e) => update({ cashier: e.target.value })} aria-invalid={!!errorFor('cashier')} />
              </Field>
            </div>

            {errorFor('items') && <p className="field-error">{errorFor('items')}</p>}
            {sale.items.length === 0 ? (
              <p className="cart-empty">Tap items on the left to add them.</p>
            ) : (
              <ul className="cart">
                {sale.items.map((item, i) => (
                  <li key={i} className="cart-line">
                    <div className="cart-line-top">
                      {item.sku ? (
                        <span className="cell-main">{item.name}</span>
                      ) : (
                        <input
                          className="cart-name"
                          value={item.name}
                          onChange={(e) => setItem(i, { name: e.target.value })}
                          placeholder="Item name"
                          aria-invalid={!!errorFor(`items.${i}.name`)}
                          autoFocus
                        />
                      )}
                      <button
                        type="button"
                        className="icon-button icon-button-quiet"
                        aria-label={`Remove ${item.name || 'item'}`}
                        onClick={() => update({ items: sale.items.filter((_, j) => j !== i) })}
                      >
                        <X size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                    <div className="cart-line-controls">
                      <div className="stepper-input">
                        <button type="button" aria-label="One less" onClick={() => setItem(i, { qty: Math.max(1, Number(item.qty) - 1) })}>
                          <Minus size={13} strokeWidth={2} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => setItem(i, { qty: e.target.value })}
                          aria-label="Quantity"
                          aria-invalid={!!errorFor(`items.${i}.qty`)}
                        />
                        <button type="button" aria-label="One more" onClick={() => setItem(i, { qty: Number(item.qty) + 1 })}>
                          <Plus size={13} strokeWidth={2} />
                        </button>
                      </div>
                      {item.sku ? (
                        <span className="cell-sub">
                          {item.unit} × {formatMoney(item.price)}
                        </span>
                      ) : (
                        <span className="cart-custom">
                          <select value={item.unit} onChange={(e) => setItem(i, { unit: e.target.value })} aria-label="Unit">
                            {UNITS.map((u) => (
                              <option key={u}>{u}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            className="num"
                            value={item.price}
                            onChange={(e) => setItem(i, { price: e.target.value })}
                            aria-label="Price"
                            aria-invalid={!!errorFor(`items.${i}.price`)}
                          />
                        </span>
                      )}
                      <label className="cart-disc">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="num"
                          value={item.discount}
                          onChange={(e) => setItem(i, { discount: e.target.value })}
                          aria-label="Discount percent"
                          aria-invalid={!!errorFor(`items.${i}.discount`)}
                        />
                        % off
                      </label>
                      <span className="cart-amount">{formatMoney(lineTotal(item))}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <dl className="totals cart-totals">
              {t.discount > 0 && (
                <>
                  <dt>Before discount</dt>
                  <dd>{formatMoney(t.gross)}</dd>
                  <dt>Discount</dt>
                  <dd>−{formatMoney(t.discount)}</dd>
                </>
              )}
              <dt className="totals-grand">Total</dt>
              <dd className="totals-grand">{formatMoney(t.total)}</dd>
            </dl>

            <div className="field">
              <span className="field-label">Payment</span>
              <div className="segmented segmented-full" role="group" aria-label="Payment method">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={sale.payment.method === m ? 'is-active' : ''}
                    onClick={() => setPayment({ method: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {sale.payment.method === 'Cash' ? (
              <div className="form-grid">
                <Field label="Cash received" error={errorFor('tendered')}>
                  <div className="input-group">
                    <input
                      type="number"
                      min="0"
                      className="num"
                      value={sale.payment.tendered}
                      onChange={(e) => setPayment({ tendered: e.target.value })}
                      aria-invalid={!!errorFor('tendered')}
                    />
                    <button type="button" className="btn btn-small input-addon" onClick={() => setPayment({ tendered: t.total })}>
                      Exact
                    </button>
                  </div>
                </Field>
                <div className="field">
                  <span className="field-label">Change</span>
                  <div className="change-due">{formatMoney(t.change)}</div>
                </div>
              </div>
            ) : (
              <Field
                label={sale.payment.method === 'Card' ? 'Card (optional)' : 'Transfer reference (optional)'}
                hint={sale.payment.method === 'Card' ? 'e.g. VISA •••• 4821' : 'e.g. BOC 25-10 / 7781'}
              >
                <input value={sale.payment.reference} onChange={(e) => setPayment({ reference: e.target.value })} />
              </Field>
            )}

            <details className="customer-box">
              <summary>Customer details (optional)</summary>
              <div className="form-grid">
                <Field label="Name">
                  <input value={sale.customer.name} onChange={(e) => update({ customer: { ...sale.customer, name: e.target.value } })} />
                </Field>
                <Field label="Phone" error={errorFor('customerPhone')}>
                  <input
                    type="tel"
                    value={sale.customer.phone}
                    onChange={(e) => update({ customer: { ...sale.customer, phone: e.target.value } })}
                    aria-invalid={!!errorFor('customerPhone')}
                  />
                </Field>
              </div>
              <p className="cell-sub">Linking a sale to a client’s record will come when POS is connected to Clients.</p>
            </details>

            {submitted && Object.keys(errors).length > 0 && (
              <div className="form-alert">Some details need fixing before this sale can be completed.</div>
            )}

            <button type="button" className="btn btn-primary btn-block" onClick={complete}>
              Complete sale · {formatMoney(t.total)}
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
