import { useState } from 'react'
import { useOnChange } from '../utils/useOnChange.js'
import { useData } from '../data/DataContext.jsx'
import QuoteList from '../quotations/QuoteList.jsx'
import QuoteDetail from '../quotations/QuoteDetail.jsx'
import QuoteForm from '../quotations/QuoteForm.jsx'
import { emptyQuote, nextQuoteId } from '../quotations/quoteFields.js'
import { todayIso } from '../utils/format.js'

// Switches between the quotation list, one quotation, and the add/edit form.
export default function Quotations({ query, branch, openId }) {
  const data = useData()
  // `openId` opens one quote straight away, e.g. when clicked on a client page.
  const [view, setView] = useState(openId ? { mode: 'detail', id: openId } : { mode: 'list' })

  // Typing in the search bar or switching branch always brings the list back.
  useOnChange([query, branch], () => setView({ mode: 'list' }))

  if (view.mode === 'detail') {
    return (
      <QuoteDetail
        quoteId={view.id}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'edit', id: view.id })}
      />
    )
  }

  if (view.mode === 'edit') {
    return (
      <QuoteForm
        initial={data.quotations.find((q) => q.id === view.id)}
        isNew={false}
        onCancel={() => setView({ mode: 'detail', id: view.id })}
        onSave={(saved) => {
          data.updateQuotation(saved)
          setView({ mode: 'detail', id: saved.id })
        }}
      />
    )
  }

  if (view.mode === 'new') {
    return (
      <QuoteForm
        initial={emptyQuote(nextQuoteId(data.quotations), todayIso())}
        isNew
        onCancel={() => setView({ mode: 'list' })}
        onSave={(saved) => {
          data.addQuotation(saved)
          setView({ mode: 'detail', id: saved.id })
        }}
      />
    )
  }

  return (
    <QuoteList
      query={query}
      branch={branch}
      onOpen={(id) => setView({ mode: 'detail', id })}
      onNew={() => setView({ mode: 'new' })}
    />
  )
}
