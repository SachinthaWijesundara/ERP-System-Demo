import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useOnChange } from '../utils/useOnChange.js'
import SaleList from '../pos/SaleList.jsx'
import Checkout from '../pos/Checkout.jsx'
import SaleDetail from '../pos/SaleDetail.jsx'
import CashUp from '../pos/CashUp.jsx'

const TABS = { sales: 'Sales', cashup: 'End of day' }

// POS has two tabs (sales and the end-of-day cash-up), the checkout screen,
// and a receipt page for each sale.
// `openId` opens one sale's receipt straight away, e.g. from an Inventory item.
// Ringing up a sale needs "ring up sales"; the cash-up page is open to
// everyone in POS, but closing the day needs "close the day".
export default function Pos({ query, branch, openId, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const [view, setView] = useState(openId ? { mode: 'detail', id: openId } : { mode: 'sales' })

  // Typing in the search bar or switching branch brings the sales list back.
  useOnChange([query, branch], () => setView((v) => (v.mode === 'cashup' && !query ? v : { mode: 'sales' })))

  if (view.mode === 'new' && auth.can('pos.sell')) {
    return (
      <Checkout
        branch={branch}
        onCancel={() => setView({ mode: 'sales' })}
        onComplete={(sale) => {
          // Saves the sale, takes its items out of stock and creates its
          // paid invoice (see completeSale in the data store).
          data.completeSale(sale)
          setView({ mode: 'detail', id: sale.id, justCompleted: true })
        }}
      />
    )
  }

  if (view.mode === 'detail') {
    return (
      <SaleDetail
        saleId={view.id}
        justCompleted={view.justCompleted}
        onBack={() => setView({ mode: 'sales' })}
        onNewSale={auth.can('pos.sell') ? () => setView({ mode: 'new' }) : null}
        onOpenRecord={onOpenRecord}
      />
    )
  }

  return (
    <>
      <PageHeader title="POS" subtitle="Counter sales for walk-in showroom customers">
        {auth.can('pos.sell') && (
          <button type="button" className="btn btn-primary" onClick={() => setView({ mode: 'new' })}>
            <Plus size={15} strokeWidth={2} />
            New sale
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

      {view.mode === 'cashup' ? (
        <CashUp key={branch} branch={branch} onOpenRecord={onOpenRecord} />
      ) : (
        <SaleList query={query} branch={branch} onOpen={(id) => setView({ mode: 'detail', id })} onOpenRecord={onOpenRecord} />
      )}
    </>
  )
}
