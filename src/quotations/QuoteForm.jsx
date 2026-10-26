import { useState } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Field from '../components/Field.jsx'
import StaffLink from '../components/StaffLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { visibleClients } from '../auth/visibility.js'
import { productsForQuotes } from '../data/links.js'
import { quoteApprovalLock } from '../data/billing.js'
import { formatMoney } from '../utils/format.js'
import {
  QUOTE_STATUSES,
  UNITS,
  emptyItem,
  emptyLabour,
  itemTotal,
  labourTotal,
  quoteTotals,
  validateQuote,
  cleanQuote,
} from './quoteFields.js'
import QuoteTotals from './QuoteTotals.jsx'

const sameSite = (a, b) => a && b && a.address === b.address && a.city === b.city

function UnitSelect({ value, onChange }) {
  return (
    <select value={value} onChange={onChange}>
      {UNITS.map((u) => (
        <option key={u}>{u}</option>
      ))}
    </select>
  )
}

function RemoveButton({ onClick, label }) {
  return (
    <button type="button" className="icon-button line-remove" onClick={onClick} aria-label={label} title={label}>
      <X size={15} strokeWidth={1.75} />
    </button>
  )
}

// What can be changed follows the person's role. Without "set prices and
// discounts", Inventory lines keep Inventory's selling price and no discount
// can be given; custom-made lines and labour still need a price. Without
// "send to the client", a quote stays a Draft. Discounts are capped at the
// role's limit.
export default function QuoteForm({ initial, isNew, onCancel, onSave }) {
  const data = useData()
  const auth = useAuth()
  const canPrices = auth.can('quotes.prices')
  const canSend = auth.can('quotes.send')
  const maxDiscount = canPrices ? auth.limit('quotes.maxDiscount') : 0
  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)

  // A discount someone else already gave stays allowed when this person edits
  // the quote; only going higher than their limit is stopped.
  const t0 = quoteTotals(initial)
  const given = Math.max(
    0,
    ...initial.items.map((i) => Number(i.discount) || 0),
    t0.subtotal > 0 ? Math.ceil((t0.discount / t0.subtotal) * 100) : 0,
  )
  const errors = validateQuote(form, data.quotations, isNew, Math.max(maxDiscount, given))
  // An approved quote can't be un-approved once a project or a payment depends on it.
  const lock = !isNew && initial.status === 'Approved' ? quoteApprovalLock(data, initial) : null
  if (lock && form.status !== 'Approved') errors.status = `Can’t change from Approved: ${lock}`
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const invalid = (key) => !!errorFor(key)

  const client = data.clients.find((c) => c.id === form.clientId)
  const clients = visibleClients(data, auth).concat(client && !visibleClients(data, auth).includes(client) ? [client] : [])
  const products = productsForQuotes(data)
  // Without "send", the status stays where it is (a new quote is a Draft).
  const statuses = canSend ? QUOTE_STATUSES : [initial.status]

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  // Picking a client fills in their first site; the site list then follows them.
  function chooseClient(e) {
    const next = data.clients.find((c) => c.id === e.target.value)
    setForm({ ...form, clientId: e.target.value, site: next?.sites[0] ?? null })
  }

  const siteIndex = client ? client.sites.findIndex((s) => sameSite(s, form.site)) : -1
  // A site saved on the quote that the client no longer lists stays selectable.
  const keepsOldSite = form.site && siteIndex === -1

  function chooseSite(e) {
    if (e.target.value === 'saved') return
    setForm({ ...form, site: client.sites[Number(e.target.value)] })
  }

  // --- Product lines ---
  function setItem(index, key, value) {
    let line = { ...form.items[index], [key]: value }
    // Picking an Inventory item links the line to it by SKU and fills in its
    // details. Typing anything else makes it a custom line with no link.
    if (key === 'product') {
      const match = products.find((p) => p.name === value)
      line = match
        ? { ...line, sku: match.sku, description: match.description ?? '', unit: match.unit, price: match.sellingPrice }
        : { ...line, sku: '' }
    }
    setForm({ ...form, items: form.items.map((it, i) => (i === index ? line : it)) })
  }
  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] })
  const removeItem = (index) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })

  // --- Labour lines ---
  function setLabour(index, key, value) {
    setForm({ ...form, labour: form.labour.map((l, i) => (i === index ? { ...l, [key]: value } : l)) })
  }
  const addLabour = () => setForm({ ...form, labour: [...form.labour, emptyLabour()] })
  const removeLabour = (index) => setForm({ ...form, labour: form.labour.filter((_, i) => i !== index) })

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length === 0) onSave(cleanQuote(form))
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        {isNew ? 'Quotations' : initial.id}
      </button>

      <PageHeader title={isNew ? 'New quotation' : 'Edit quotation'} subtitle={isNew ? undefined : initial.id}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" form="quote-form" className="btn btn-primary">
          {isNew ? 'Create quotation' : 'Save changes'}
        </button>
      </PageHeader>

      {submitted && Object.keys(errors).length > 0 && (
        <div className="form-alert">Some details need fixing before this can be saved.</div>
      )}

      <form id="quote-form" className="form form-wide" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <h2>Quotation</h2>
          <div className="form-grid form-grid-3">
            <Field
              label="Quote no."
              error={errorFor('id')}
              hint={isNew ? 'Format QT-0000. The next free number is filled in.' : 'Can’t be changed once saved.'}
            >
              <input value={form.id} onChange={set('id')} readOnly={!isNew} aria-invalid={invalid('id')} />
            </Field>
            <Field label="Job title" error={errorFor('title')}>
              <input
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Living room vinyl flooring"
                aria-invalid={invalid('title')}
              />
            </Field>
            <Field
              label="Status"
              error={errors.status}
              hint={
                canSend
                  ? 'Approved opens the advance invoice, where you enter the advance. Moving away from Approved puts it back to draft.'
                  : 'Your role can’t send quotes or mark them approved.'
              }
            >
              <select value={form.status} onChange={set('status')} disabled={!canSend} aria-invalid={!!errors.status}>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Date" error={errorFor('date')}>
              <input type="date" value={form.date} onChange={set('date')} aria-invalid={invalid('date')} />
            </Field>
            <Field label="Valid until" error={errorFor('validUntil')} hint="How long these prices hold.">
              <input
                type="date"
                value={form.validUntil}
                onChange={set('validUntil')}
                aria-invalid={invalid('validUntil')}
              />
            </Field>
            <Field label="Prepared by" hint="Whoever was logged in when the quote was made.">
              <div className="field-static">
                <StaffLink id={form.preparedById} />
              </div>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Client and site</h2>
          <div className="form-grid">
            <Field label="Client" error={errorFor('clientId')}>
              <select value={form.clientId} onChange={chooseClient} aria-invalid={invalid('clientId')}>
                <option value="">Choose a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.name} ({c.branch})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Site" error={errorFor('site')} hint="Which of the client’s addresses the work is at.">
              <select
                value={keepsOldSite ? 'saved' : siteIndex}
                onChange={chooseSite}
                disabled={!client}
                aria-invalid={invalid('site')}
              >
                {!client && <option value={-1}>Choose a client first</option>}
                {client && client.sites.length === 0 && !keepsOldSite && (
                  <option value={-1}>This client has no site address yet</option>
                )}
                {keepsOldSite && (
                  <option value="saved">
                    {form.site.label}: {form.site.address}, {form.site.city} (saved)
                  </option>
                )}
                {client?.sites.map((s, i) => (
                  <option key={i} value={i}>
                    {s.label}: {s.address}, {s.city}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {client && (
            <p className="form-help form-help-after">
              {client.name} · {client.phone}
              {client.email && ` · ${client.email}`}
            </p>
          )}
        </section>

        <section className="form-section">
          <h2>Products and materials</h2>
          {errorFor('lines') && <p className="field-error">{errorFor('lines')}</p>}

          {form.items.length > 0 && (
            <div className="lines">
              <div className="line line-item line-head">
                <span>Product</span>
                <span>Description / quality</span>
                <span className="num">Qty</span>
                <span>Unit</span>
                <span className="num">Unit price</span>
                <span className="num">Disc. %</span>
                <span className="num">Amount</span>
                <span />
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="line line-item">
                  <Field
                    error={errorFor(`items.${i}.product`)}
                    hint={item.sku ? `Inventory · ${item.sku}` : item.product ? 'Custom item' : 'Pick from inventory or type'}
                  >
                    <input
                      value={item.product}
                      onChange={(e) => setItem(i, 'product', e.target.value)}
                      list="inventory-products"
                      placeholder="e.g. Vinyl plank"
                      aria-label="Product"
                      aria-invalid={invalid(`items.${i}.product`)}
                    />
                  </Field>
                  <Field>
                    <input
                      value={item.description}
                      onChange={(e) => setItem(i, 'description', e.target.value)}
                      placeholder="Finish, size, grade…"
                      aria-label="Description"
                    />
                  </Field>
                  <Field error={errorFor(`items.${i}.qty`)}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="num"
                      value={item.qty}
                      onChange={(e) => setItem(i, 'qty', e.target.value)}
                      aria-label="Quantity"
                      aria-invalid={invalid(`items.${i}.qty`)}
                    />
                  </Field>
                  <Field>
                    <UnitSelect value={item.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} />
                  </Field>
                  <Field error={errorFor(`items.${i}.price`)}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="num"
                      value={item.price}
                      onChange={(e) => setItem(i, 'price', e.target.value)}
                      readOnly={!canPrices && !!item.sku}
                      title={!canPrices && item.sku ? 'Inventory’s selling price' : undefined}
                      aria-label="Unit price"
                      aria-invalid={invalid(`items.${i}.price`)}
                    />
                  </Field>
                  <Field error={errorFor(`items.${i}.discount`)}>
                    <input
                      type="number"
                      min="0"
                      max={maxDiscount}
                      step="any"
                      className="num"
                      value={item.discount}
                      onChange={(e) => setItem(i, 'discount', e.target.value)}
                      readOnly={maxDiscount === 0}
                      aria-label="Discount percent"
                      aria-invalid={invalid(`items.${i}.discount`)}
                    />
                  </Field>
                  <div className="line-amount">{formatMoney(itemTotal(item))}</div>
                  <RemoveButton onClick={() => removeItem(i)} label="Remove this product" />
                </div>
              ))}
            </div>
          )}

          {/* Suggestions from Inventory. Empty until that module is connected. */}
          <datalist id="inventory-products">
            {products.map((p) => (
              <option key={p.name} value={p.name} />
            ))}
          </datalist>

          <button type="button" className="btn btn-ghost" onClick={addItem}>
            <Plus size={15} strokeWidth={1.75} />
            Add product
          </button>
        </section>

        <section className="form-section">
          <h2>Labour and installation</h2>

          {form.labour.length > 0 && (
            <div className="lines">
              <div className="line line-labour line-head">
                <span>Work</span>
                <span className="num">Qty</span>
                <span>Unit</span>
                <span className="num">Rate</span>
                <span className="num">Amount</span>
                <span />
              </div>
              {form.labour.map((line, i) => (
                <div key={i} className="line line-labour">
                  <Field error={errorFor(`labour.${i}.description`)}>
                    <input
                      value={line.description}
                      onChange={(e) => setLabour(i, 'description', e.target.value)}
                      placeholder="e.g. Floor installation"
                      aria-label="Work"
                      aria-invalid={invalid(`labour.${i}.description`)}
                    />
                  </Field>
                  <Field error={errorFor(`labour.${i}.qty`)}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="num"
                      value={line.qty}
                      onChange={(e) => setLabour(i, 'qty', e.target.value)}
                      aria-label="Quantity"
                      aria-invalid={invalid(`labour.${i}.qty`)}
                    />
                  </Field>
                  <Field>
                    <UnitSelect value={line.unit} onChange={(e) => setLabour(i, 'unit', e.target.value)} />
                  </Field>
                  <Field error={errorFor(`labour.${i}.price`)}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="num"
                      value={line.price}
                      onChange={(e) => setLabour(i, 'price', e.target.value)}
                      aria-label="Rate"
                      aria-invalid={invalid(`labour.${i}.price`)}
                    />
                  </Field>
                  <div className="line-amount">{formatMoney(labourTotal(line))}</div>
                  <RemoveButton onClick={() => removeLabour(i)} label="Remove this labour line" />
                </div>
              ))}
            </div>
          )}

          <button type="button" className="btn btn-ghost" onClick={addLabour}>
            <Plus size={15} strokeWidth={1.75} />
            Add labour
          </button>
        </section>

        <section className="form-section">
          <h2>Discount, VAT and total</h2>
          <div className="quote-money">
            <div className="form-grid">
              <Field
                label="Quote discount"
                error={errorFor('discount')}
                hint={
                  maxDiscount === 0
                    ? 'Your role can’t give discounts.'
                    : maxDiscount < 100
                      ? `On top of any line discounts. Your role can give up to ${maxDiscount}%.`
                      : 'On top of any line discounts.'
                }
              >
                <div className="input-group">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="num"
                    value={form.discount.value}
                    onChange={(e) => setForm({ ...form, discount: { ...form.discount, value: e.target.value } })}
                    readOnly={maxDiscount === 0}
                    aria-invalid={invalid('discount')}
                  />
                  <select
                    value={form.discount.type}
                    onChange={(e) => setForm({ ...form, discount: { ...form.discount, type: e.target.value } })}
                    disabled={maxDiscount === 0}
                    aria-label="Discount type"
                  >
                    <option value="amount">LKR</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </Field>
              <Field label="VAT %" error={errorFor('taxRate')} hint="Leave at 0 if VAT isn’t charged.">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  className="num"
                  value={form.taxRate}
                  onChange={set('taxRate')}
                  aria-invalid={invalid('taxRate')}
                />
              </Field>
            </div>
            <QuoteTotals quote={form} />
          </div>
        </section>

        <section className="form-section">
          <h2>Notes and terms</h2>
          <div className="form-grid">
            <Field label="Notes" hint="Shown on the quote and the PDF.">
              <textarea rows={5} value={form.notes} onChange={set('notes')} placeholder="Anything the client should know." />
            </Field>
            <Field label="Terms">
              <textarea rows={5} value={form.terms} onChange={set('terms')} />
            </Field>
          </div>
        </section>
      </form>
    </>
  )
}
