import { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { useOnChange } from '../utils/useOnChange.js'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { formatMoney, todayIso } from '../utils/format.js'
import { branches, ALL_BRANCHES } from '../modules.js'
import ItemList from '../inventory/ItemList.jsx'
import ItemDetail from '../inventory/ItemDetail.jsx'
import ItemForm from '../inventory/ItemForm.jsx'
import MovementLog from '../inventory/MovementLog.jsx'
import { emptyItem, worstStatus, stockFor } from '../inventory/inventoryFields.js'

const TABS = { items: 'Items', movements: 'Movement log' }

// `openId` opens one item straight away (a product clicked on a quote).
// `openFilter` ({ skus, label }) shows only some items, e.g. those on a quote.
// Adding products needs "add products"; editing opens for roles that can
// change details, prices or alert levels. Stock value needs "see total stock
// value".
export default function Inventory({ query, branch, openId, openFilter, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const canEdit = auth.can('inventory.items') || auth.can('inventory.prices') || auth.can('inventory.alerts')
  const [view, setView] = useState(openId ? { mode: 'detail', sku: openId } : { mode: 'items' })
  const [filter, setFilter] = useState(openFilter ?? null)

  // Typing in the search bar or switching branch goes back to the open tab.
  useOnChange([query, branch], () => setView((v) => (v.mode === 'movements' ? v : { mode: 'items' })))

  if (view.mode === 'detail') {
    return (
      <ItemDetail
        sku={view.sku}
        branch={branch}
        onBack={() => setView({ mode: 'items' })}
        onEdit={() => setView({ mode: 'edit', sku: view.sku })}
        onDeleted={() => setView({ mode: 'items' })}
        onOpenRecord={onOpenRecord}
      />
    )
  }

  if ((view.mode === 'edit' && canEdit) || (view.mode === 'new' && auth.can('inventory.items'))) {
    const isNew = view.mode === 'new'
    return (
      <ItemForm
        initial={isNew ? emptyItem() : data.inventory.find((i) => i.sku === view.sku)}
        isNew={isNew}
        onCancel={() => setView(isNew ? { mode: 'items' } : { mode: 'detail', sku: view.sku })}
        onSave={(item) => {
          if (isNew) {
            // The item starts at zero; opening stock goes in as logged movements.
            // Put down to whoever is logged in.
            data.addItem({ ...item, stock: Object.fromEntries(branches.map((b) => [b, 0])) })
            data.recordMovements(
              branches
                .filter((b) => item.stock[b])
                .map((b) => ({
                  date: todayIso(),
                  sku: item.sku,
                  branch: b,
                  type: 'In',
                  qty: item.stock[b],
                  reference: 'Opening stock',
                  byId: auth.user.id,
                  note: '',
                })),
            )
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
  const value = data.inventory.reduce((sum, i) => sum + stockFor(i, branch).onHand * i.costPrice, 0)

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${data.inventory.length} items · ${alerts} low or out of stock ${where}${auth.can('inventory.value') ? ` · stock worth ${formatMoney(value)} at cost` : ''}`}
      >
        {auth.can('inventory.items') && (
          <button type="button" className="btn btn-primary" onClick={() => setView({ mode: 'new' })}>
            <Plus size={15} strokeWidth={2} />
            New item
          </button>
        )}
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
        <MovementLog query={query} branch={branch} onOpenRecord={onOpenRecord} />
      ) : (
        <>
          {filter && (
            <div className="admin-note filter-note">
              <Filter size={15} strokeWidth={1.75} />
              <span>
                Showing only the {filter.skus.length} inventory items used on <strong>{filter.label}</strong>.
              </span>
              <button type="button" className="btn btn-small" onClick={() => setFilter(null)}>
                Show all items
              </button>
            </div>
          )}
          <ItemList
            query={query}
            branch={branch}
            onlySkus={filter?.skus}
            onOpen={(sku) => setView({ mode: 'detail', sku })}
          />
        </>
      )}
    </>
  )
}
