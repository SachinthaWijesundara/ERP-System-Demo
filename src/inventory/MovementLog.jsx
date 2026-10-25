import { useState } from 'react'
import { useData } from '../data/DataContext.jsx'
import { ALL_BRANCHES } from '../modules.js'
import { MOVEMENT_TYPES } from './inventoryFields.js'
import MovementTable from './MovementTable.jsx'

// Every stock movement across all items, newest first.
export default function MovementLog({ query, branch }) {
  const data = useData()
  const [type, setType] = useState('All')

  const q = query.trim().toLowerCase()
  const found = data.movements.filter((m) => {
    if (branch !== ALL_BRANCHES && m.branch !== branch) return false
    if (!q) return true
    const item = data.inventory.find((i) => i.sku === m.sku)
    return [m.id, m.sku, m.reference, m.by, m.note, item?.name ?? ''].some((t) => t.toLowerCase().includes(q))
  })
  const rows = type === 'All' ? found : found.filter((m) => m.type === type)

  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {['All', ...MOVEMENT_TYPES].map((t) => (
            <button key={t} type="button" className={`tab${type === t ? ' is-active' : ''}`} onClick={() => setType(t)}>
              {t}
              <span className="tab-count">{t === 'All' ? found.length : found.filter((m) => m.type === t).length}</span>
            </button>
          ))}
        </div>
        {q && <span className="toolbar-note">Results for “{query.trim()}”</span>}
      </div>
      <div className="table-wrap">
        <MovementTable movements={rows} items={data.inventory} />
      </div>
    </>
  )
}
