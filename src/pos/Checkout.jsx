import { useState } from 'react'
import { ArrowLeft, Minus, Plus, X, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { visibleClients } from '../auth/visibility.js'
import { productsForPos, checkSaleAgainstStock } from '../data/links.js'
import { formatMoney, todayIso } from '../utils/format.js'
import { branches } from '../modules.js'
import {
  PAYMENT_METHODS,
  nextSaleId,
  nowTime,
  lineTotal,
  saleTotals,
  validateSale,
  cleanSale,
  findCashUp,
} from './posFields.js'

// The counter screen: pick items on the left, take payment on the right.
// The cashier is whoever is logged in, and someone tied to one branch sells
// from that branch only. Only Inventory items are sold here: there are no
// custom items at the counter. Changing a price or giving a discount each
// need their own permission.
export default function Checkout({ branch, onCancel, onComplete }) {
  const data = useData()
  const auth = useAuth()
  const canPrice = auth.can('pos.prices')
  const canDiscount = auth.can('pos.discount')
  const myBranches = branches.filter((b) => auth.allowedBranches.includes(b))
  const startBranch = myBranches.includes(branch) ? branch : myBranches.length === 1 ? myBranches[0] : ''

  const [sale, setSale] = useState(() => ({
    id: nextSaleId(data.sales),
    date: todayIso(),
    time: nowTime(),
    branch: startBranch,
    cashierId: auth.user.id,
    customer: { name: '', phone: '' },
    clientId: '',
    items: [],
    payment: { method: 'Cash', tendered: '', reference: '' },
  }))
  const [filter, setFilter] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Showroom items are the Inventory items, with what's free at this branch.
  const products = productsForPos(data, sale.branch)
  const freeAt = (sku) => products.find((p) => p.sku === sku)?.available ?? 0

  const closedDay = !!(sale.branch && findCashUp(data.cashUps, sale.branch, sale.date))
  const errors = validateSale(sale, data.sales, closedDay)
  // The reservation rule: a line can't use stock held for a project. These
  // show straight away under the line, and block the sale.
  const stockProblems = Object.fromEntries(
    (sale.branch ? checkSaleAgainstStock(data, sale) : []).map((p) => [p.sku, p.message]),
  )
  if (Object.keys(stockProblems).length) errors.stock = 'Some items don’t have enough free stock at this branch.'
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

  const chooseBranch = (e) => update({ branch: e.target.value })

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
              {shown.map((p) => {
                const soldOut = p.available !== null && p.available <= 0
                return (
                  <button
                    key={p.sku}
                    type="button"
                    className={`product-tile${soldOut ? ' is-out' : ''}`}
                    onClick={() => addProduct(p)}
                    disabled={soldOut}
                  >
                    <span className="product-cat">{p.category}</span>
                    <span className="product-name">{p.name}</span>
                    <span className="product-price">
                      {formatMoney(p.price)} <span className="cell-sub">/ {p.unit}</span>
                    </span>
                    <span className="product-stock">
                      {p.available === null
                        ? 'Choose a branch to see stock'
                        : soldOut
                          ? 'None free at this branch'
                          : `${p.available.toLocaleString('en-LK')} ${p.unit} free`}
                    </span>
                  </button>
                )
              })}
            </div>
            {shown.length === 0 && <p className="card-empty">Nothing matches “{filter}”.</p>}
            <p className="cell-sub hidden-note">Only Inventory items can be sold at the counter. Ask the storekeeper to add a new product.</p>
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
                <select value={sale.branch} onChange={chooseBranch} disabled={myBranches.length < 2} aria-invalid={!!errorFor('branch')}>
                  {myBranches.length > 1 && <option value="">Choose…</option>}
                  {myBranches.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Cashier" error={errorFor('cashier')} hint="Whoever is logged in.">
                <div className="field-static">{auth.user.name}</div>
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
                      <span className="cell-main">{item.name}</span>
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
                      {canPrice ? (
                        <span className="cart-custom">
                          <span className="cell-sub">{item.unit} ×</span>
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
                      ) : (
                        <span className="cell-sub">
                          {item.unit} × {formatMoney(item.price)}
                        </span>
                      )}
                      {canDiscount && (
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
                      )}
                      <span className="cart-amount">{formatMoney(lineTotal(item))}</span>
                    </div>
                    {errorFor(`items.${i}.name`) && <p className="field-error cart-error">{errorFor(`items.${i}.name`)}</p>}
                    {item.sku &&
                      (stockProblems[item.sku] ? (
                        <p className="field-error cart-error">{stockProblems[item.sku]}</p>
                      ) : (
                        sale.branch && (
                          <p className="cell-sub cart-stock">
                            {freeAt(item.sku)} {item.unit} free at {sale.branch} (reserved stock not counted)
                          </p>
                        )
                      ))}
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
              <Field label="Registered client" hint="Pick one to link this sale to their client page. Leave empty for walk-ins.">
                <select
                  value={sale.clientId}
                  onChange={(e) => {
                    const c = data.clients.find((x) => x.id === e.target.value)
                    update({ clientId: e.target.value, customer: c ? { name: c.name, phone: c.phone } : sale.customer })
                  }}
                >
                  <option value="">Walk-in customer (not registered)</option>
                  {visibleClients(data, auth).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} · {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid customer-fields">
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
