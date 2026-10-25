import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { todayIso } from '../utils/format.js'
import InvoiceList from '../invoices/InvoiceList.jsx'
import InvoiceDetail from '../invoices/InvoiceDetail.jsx'
import InvoiceForm from '../invoices/InvoiceForm.jsx'
import { emptyInvoice, nextInvoiceId } from '../invoices/invoiceFields.js'

export default function Invoices({ query, branch }) {
  const data = useData()
  const [view, setView] = useState({ mode: 'list' })

  // Typing in the search bar or switching branch always brings the list back.
  useEffect(() => {
    setView({ mode: 'list' })
  }, [query, branch])

  if (view.mode === 'detail') {
    return <InvoiceDetail invoiceId={view.id} justRaised={view.justRaised} onBack={() => setView({ mode: 'list' })} />
  }

  if (view.mode === 'new') {
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
        <button type="button" className="btn btn-primary" onClick={() => setView({ mode: 'new' })}>
          <Plus size={15} strokeWidth={2} />
          Raise invoice
        </button>
      </PageHeader>
      <InvoiceList query={query} branch={branch} onOpen={(id) => setView({ mode: 'detail', id })} />
    </>
  )
}
