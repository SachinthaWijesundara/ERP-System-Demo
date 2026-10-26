import Badge from '../components/Badge.jsx'
import StaffLink from '../components/StaffLink.jsx'
import { formatDate } from '../utils/format.js'
import { movementDelta } from './inventoryFields.js'

// A list of stock movements. `items` is passed when the item column is shown.
// "By" is the registered staff member who made the movement.
export default function MovementTable({ movements, items, compact, onOpenRecord }) {
  if (movements.length === 0) return <p className="card-empty">No movements yet.</p>
  return (
    <table className={`table table-static${compact ? ' table-compact' : ''}`}>
      <thead>
        <tr>
          <th>Date</th>
          {items && <th>Item</th>}
          <th>Branch</th>
          <th>Type</th>
          <th className="num">Change</th>
          <th>Reference</th>
          <th>By</th>
        </tr>
      </thead>
      <tbody>
        {movements.map((m) => {
          const delta = movementDelta(m)
          const item = items?.find((i) => i.sku === m.sku)
          return (
            <tr key={m.id}>
              <td>
                {formatDate(m.date)}
                <div className="cell-sub">{m.id}</div>
              </td>
              {items && (
                <td>
                  <div>{item?.name ?? m.sku}</div>
                  <div className="cell-sub">{m.sku}</div>
                </td>
              )}
              <td>{m.branch}</td>
              <td>
                <Badge>{m.type}</Badge>
              </td>
              <td className={`num cell-main ${delta < 0 ? 'qty-out' : 'qty-in'}`}>
                {delta > 0 ? '+' : ''}
                {delta.toLocaleString('en-LK')} {item?.unit ?? ''}
              </td>
              <td className="wrap">
                {m.reference}
                {m.note && <div className="cell-sub">{m.note}</div>}
              </td>
              <td>
                <StaffLink id={m.byId} onOpenRecord={onOpenRecord} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
