import { useState } from 'react'
import { useOnChange } from '../utils/useOnChange.js'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { todayIso } from '../utils/format.js'
import InvoiceList from '../invoices/InvoiceList.jsx'
import InvoiceDetail from '../invoices/InvoiceDetail.jsx'
import InvoiceForm from '../invoices/InvoiceForm.jsx'
import { emptyInvoice, nextInvoiceId } from '../invoices/invoiceFields.js'

// Raising a progress invoice needs "raise progress invoices".
export default function Invoices({ query, branch, openId, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  // `openId` opens one invoice straight away, e.g. when clicked on a client page.
  const [view, setView] = useState(openId ? { mode: 'detail', id: openId } : { mode: 'list' })

  // Typing in the search bar or switching branch always brings the list back.
  useOnChange([query, branch], () => setView({ mode: 'list' }))

  if (view.mode === 'detail') {
    return (
      <InvoiceDetail
        invoiceId={view.id}
        justRaised={view.justRaised}
        onBack={() => setView({ mode: 'list' })}
        onOpenRecord={onOpenRecord}
      />
    )
  }

  if (view.mode === 'new' && auth.can('invoices.raise')) {
    return (
      <InvoiceForm
        initial={emptyInvoice(nextInvoiceId(data.invoices), todayIso())}
        onCancel={() => setView({ mode: 'list' })}
        onSave={(invoice) => {
          data.addInvoice(invoice)
          setView({ mode: 'detail', id: invoice.id, justRaised: true })
        }}
      />
    )
  }

  return (
    <>
      <PageHeader title="Invoices and payments" subtitle="Every bill sent and every rupee received">
        {auth.can('invoices.raise') && (
          <button type="button" className="btn btn-primary" onClick={() => setView({ mode: 'new' })}>
            <Plus size={15} strokeWidth={2} />
            Raise progress invoice
          </button>
        )}
      </PageHeader>
      <InvoiceList query={query} branch={branch} onOpen={(id) => setView({ mode: 'detail', id })} />
    </>
  )
}
