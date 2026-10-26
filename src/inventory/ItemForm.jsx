import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { formatMoney } from '../utils/format.js'
import { branches } from '../modules.js'
import { INVENTORY_UNITS, validateItem, cleanItem } from './inventoryFields.js'

// Add or edit an item's details. Stock levels change only through movements,
// so a new item's opening stock is recorded as an "In" movement.
// Each part follows its own permission: product details, prices (cost price
// only shows with "see cost prices"), low-stock level, and opening stock.
export default function ItemForm({ initial, isNew, onCancel, onSave }) {
  const data = useData()
  const auth = useAuth()
  const canDetails = isNew || auth.can('inventory.items')
  const canPrices = auth.can('inventory.prices')
  const showCost = auth.can('inventory.costs')
  const canAlerts = auth.can('inventory.alerts')
  const canStock = auth.can('inventory.stock')
  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)

  const errors = validateItem(form, data.inventory, isNew)
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const invalid = (key) => !!errorFor(key)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const categories = [...new Set(data.inventory.map((i) => i.category))].sort()
  const cost = Number(form.costPrice) || 0
  const sell = Number(form.sellingPrice) || 0

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length === 0) onSave(cleanItem(form))
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        {isNew ? 'Inventory' : initial.name}
      </button>

      <PageHeader title={isNew ? 'New item' : 'Edit item'} subtitle={isNew ? undefined : initial.sku}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" form="item-form" className="btn btn-primary">
          {isNew ? 'Add item' : 'Save changes'}
        </button>
      </PageHeader>

      {submitted && Object.keys(errors).length > 0 && (
        <div className="form-alert">Some details need fixing before this can be saved.</div>
      )}

      <form id="item-form" className="form" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <h2>Item</h2>
          <div className="form-grid">
            <Field label="SKU" error={errorFor('sku')} hint={isNew ? 'Stock code, e.g. VNL-OAK-01.' : 'Can’t be changed once saved.'}>
              <input value={form.sku} onChange={set('sku')} readOnly={!isNew} placeholder="e.g. WP-GEO-03" aria-invalid={invalid('sku')} />
            </Field>
            <Field label="Name" error={errorFor('name')}>
              <input value={form.name} onChange={set('name')} readOnly={!canDetails} placeholder="e.g. Wallpaper roll, geometric" aria-invalid={invalid('name')} />
            </Field>
            <Field label="Category" error={errorFor('category')} hint="Pick one or type a new one.">
              <input value={form.category} onChange={set('category')} readOnly={!canDetails} list="item-categories" aria-invalid={invalid('category')} />
            </Field>
            <Field label="Unit" hint="How it’s counted and sold.">
              <select value={form.unit} onChange={set('unit')} disabled={!canDetails}>
                {INVENTORY_UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
            <Field label="Description (optional)" wide>
              <input value={form.description} onChange={set('description')} readOnly={!canDetails} placeholder="Size, finish, pack size…" />
            </Field>
          </div>
          <datalist id="item-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </section>

        <section className="form-section">
          <h2>Prices</h2>
          <div className="form-grid form-grid-3">
            {showCost && (
              <Field label={`Cost price (per ${form.unit})`} error={errorFor('costPrice')} hint="What the studio pays the supplier.">
                <input type="number" min="0" className="num" value={form.costPrice} onChange={set('costPrice')} readOnly={!canPrices} aria-invalid={invalid('costPrice')} />
              </Field>
            )}
            <Field
              label={`Selling price (per ${form.unit})`}
              error={errorFor('sellingPrice')}
              hint={canPrices ? 'Used on quotes and at the counter.' : 'Your role can’t change prices.'}
            >
              <input type="number" min="0" className="num" value={form.sellingPrice} onChange={set('sellingPrice')} readOnly={!canPrices} aria-invalid={invalid('sellingPrice')} />
            </Field>
            {showCost && (
              <div className="field">
                <span className="field-label">Margin</span>
                <div className="change-due">
                  {sell > 0 ? `${Math.round(((sell - cost) / sell) * 100)}% · ${formatMoney(sell - cost)}` : '—'}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="form-section">
          <h2>Stock</h2>
          <div className="form-grid form-grid-3">
            <Field label={`Low-stock alert at (${form.unit})`} error={errorFor('lowStockLevel')} hint="Flag the item when available stock drops to this.">
              <input type="number" min="0" className="num" value={form.lowStockLevel} onChange={set('lowStockLevel')} readOnly={!canAlerts} aria-invalid={invalid('lowStockLevel')} />
            </Field>
            {isNew &&
              canStock &&
              branches.map((b) => (
                <Field key={b} label={`Opening stock at ${b}`} error={errorFor(`stock.${b}`)}>
                  <input
                    type="number"
                    min="0"
                    className="num"
                    value={form.stock[b]}
                    onChange={(e) => setForm({ ...form, stock: { ...form.stock, [b]: e.target.value } })}
                    aria-invalid={invalid(`stock.${b}`)}
                  />
                </Field>
              ))}
          </div>
          <p className="form-help form-help-after">
            {isNew
              ? canStock
                ? 'Opening stock is recorded in the movement log as stock in.'
                : 'The item starts with no stock. The storekeeper records stock in on the item’s page.'
              : 'To change stock levels, record a movement on the item’s page so there’s a log of why.'}
          </p>
        </section>
      </form>
    </>
  )
}
