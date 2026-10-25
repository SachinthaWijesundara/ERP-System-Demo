import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { todayIso } from '../utils/format.js'
import { branches, ALL_BRANCHES } from '../modules.js'
import ItemList from '../inventory/ItemList.jsx'
import ItemDetail from '../inventory/ItemDetail.jsx'
import ItemForm from '../inventory/ItemForm.jsx'
import MovementLog from '../inventory/MovementLog.jsx'
import { emptyItem, nextMovementId, worstStatus } from '../inventory/inventoryFields.js'

const TABS = { items: 'Items', movements: 'Movement log' }

export default function Inventory({ query, branch }) {
  const data = useData()
  const [view, setView] = useState({ mode: 'items' })

  // Typing in the search bar or switching branch goes back to the open tab.
  useEffect(() => {
    setView((v) => (v.mode === 'movements' ? v : { mode: 'items' }))
  }, [query, branch])

  if (view.mode === 'detail') {
    return (
      <ItemDetail
        sku={view.sku}
        branch={branch}
        onBack={() => setView({ mode: 'items' })}
        onEdit={() => setView({ mode: 'edit', sku: view.sku })}
      />
    )
  }

  if (view.mode === 'edit' || view.mode === 'new') {
    const isNew = view.mode === 'new'
    return (
      <ItemForm
        initial={isNew ? emptyItem() : data.inventory.find((i) => i.sku === view.sku)}
        isNew={isNew}
        onCancel={() => setView(isNew ? { mode: 'items' } : { mode: 'detail', sku: view.sku })}
        onSave={(item) => {
          if (isNew) {
            // The item starts at zero; opening stock goes in as logged movements.
            data.addItem({ ...item, stock: Object.fromEntries(branches.map((b) => [b, 0])) })
            let ids = data.movements
            branches.forEach((b) => {
              if (!item.stock[b]) return
              const movement = {
                id: nextMovementId(ids),
                date: todayIso(),
                sku: item.sku,
                branch: b,
                type: 'In',
                qty: item.stock[b],
                reference: 'Opening stock',
                by: 'Studio',
                note: '',
              }
              ids = [movement, ...ids]
              data.recordMovement(movement, item.stock[b])
            })
          } else {
            data.updateItem(item)
          }
          setView({ mode: 'detail', sku: item.sku })
        }}
      />
    )
  }

  const alerts = data.inventory.filter((i) => worstStatus(i, branch).status !== 'In stock').length
  const where = branch === ALL_BRANCHES ? 'across both branches' : `at ${branch}`

  return (
    <>
      <PageHeader title="Inventory" subtitle={`${data.inventory.length} items · ${alerts} low or out of stock ${where}`}>
        <button type="button" className="btn btn-primary" onClick={() => setView({ mode: 'new' })}>
          <Plus size={15} strokeWidth={2} />
          New item
        </button>
      </PageHeader>

      <div className="page-tabs" role="tablist">
        {Object.entries(TABS).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={view.mode === mode}
            className={view.mode === mode ? 'is-active' : ''}
            onClick={() => setView({ mode })}
          >
            {label}
          </button>
        ))}
      </div>

      {view.mode === 'movements' ? (
        <MovementLog query={query} branch={branch} />
      ) : (
        <ItemList query={query} branch={branch} onOpen={(sku) => setView({ mode: 'detail', sku })} />
      )}
    </>
  )
}
