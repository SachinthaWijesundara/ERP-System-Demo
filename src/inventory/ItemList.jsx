import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { formatMoney } from '../utils/format.js'
import { ALL_BRANCHES } from '../modules.js'
import { stockFor, worstStatus, margin } from './inventoryFields.js'

const FILTERS = ['All', 'Low stock', 'Out of stock', 'Reserved']

function matches(item, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [item.sku, item.name, item.category, item.description].some((t) => t.toLowerCase().includes(q))
}

// `onlySkus`, when given, limits the list to those items (e.g. a quote's).
export default function ItemList({ query, branch, onlySkus, onOpen }) {
  const data = useData()
  const [filter, setFilter] = useState('All')
  const [category, setCategory] = useState('')
  const allBranches = branch === ALL_BRANCHES

  const pool = onlySkus ? data.inventory.filter((i) => onlySkus.includes(i.sku)) : data.inventory
  const categories = [...new Set(pool.map((i) => i.category))].sort()
  const found = pool.filter((i) => matches(i, query) && (!category || i.category === category))

  const keep = (item, f) => {
    if (f === 'All') return true
    if (f === 'Reserved') return stockFor(item, branch).reserved > 0
    const status = worstStatus(item, branch).status
    return f === 'Low stock' ? status === 'Low stock' : status === 'Out of stock'
  }
  const rows = found.filter((i) => keep(i, filter))

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`tab${filter === f ? ' is-active' : ''}`} onClick={() => setFilter(f)}>
              {f}
              <span className="tab-count">{found.filter((i) => keep(i, f)).length}</span>
            </button>
          ))}
        </div>
        <select className="toolbar-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th className="num">Cost</th>
              <th className="num">Selling</th>
              <th className="num">On hand</th>
              <th className="num">Reserved</th>
              <th className="num">Available</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const s = stockFor(item, branch)
              const worst = worstStatus(item, branch)
              return (
                <tr key={item.sku} onClick={() => onOpen(item.sku)}>
                  <td>
                    <div className="cell-main">{item.name}</div>
                    <div className="cell-sub">{item.sku}</div>
                  </td>
                  <td>{item.category}</td>
                  <td className="num">{formatMoney(item.costPrice)}</td>
                  <td className="num">
                    {formatMoney(item.sellingPrice)}
                    <div className="cell-sub">{margin(item)}% margin</div>
                  </td>
                  <td className="num">
                    {s.onHand.toLocaleString('en-LK')} <span className="cell-sub">{item.unit}</span>
                  </td>
                  <td className="num">{s.reserved ? s.reserved.toLocaleString('en-LK') : '—'}</td>
                  <td className="num cell-main">{s.available.toLocaleString('en-LK')}</td>
                  <td>
                    <Badge>{worst.status}</Badge>
                    {allBranches && worst.status !== 'In stock' && <div className="cell-sub">at {worst.branch}</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="empty">{query.trim() ? `No items match “${query.trim()}”.` : 'Nothing here.'}</div>
        )}
      </div>
      <p className="table-note">
        Available is on hand minus what’s reserved for projects. Only available stock can be sold at the counter.
        {allBranches && ' Figures are both branches added together.'}
      </p>
    </>
  )
}
