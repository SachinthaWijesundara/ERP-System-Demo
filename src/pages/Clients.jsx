import { useState } from 'react'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { useOnChange } from '../utils/useOnChange.js'
import ClientList from '../clients/ClientList.jsx'
import ClientDetail from '../clients/ClientDetail.jsx'
import ClientForm from '../clients/ClientForm.jsx'
import { emptyClient, nextClientId } from '../clients/clientFields.js'

// Switches between the client list, one client's page, and the add/edit form.
export default function Clients({ query, branch, openId, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  // `openId` opens one client straight away, e.g. when clicked on a quote.
  const [view, setView] = useState(openId ? { mode: 'detail', id: openId } : { mode: 'list' })

  // Typing in the search bar or switching branch always brings the list back.
  useOnChange([query, branch], () => setView({ mode: 'list' }))

  if (view.mode === 'detail') {
    return (
      <ClientDetail
        clientId={view.id}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'edit', id: view.id })}
        onDeleted={() => setView({ mode: 'list' })}
        onOpenRecord={onOpenRecord}
      />
    )
  }

  if (view.mode === 'edit' && auth.can('clients.edit')) {
    const client = data.clients.find((c) => c.id === view.id)
    return (
      <ClientForm
        initial={client}
        isNew={false}
        onCancel={() => setView({ mode: 'detail', id: view.id })}
        onSave={(saved) => {
          data.updateClient(saved)
          setView({ mode: 'detail', id: saved.id })
        }}
      />
    )
  }

  if (view.mode === 'new' && auth.can('clients.create')) {
    return (
      <ClientForm
        initial={emptyClient(nextClientId(data.clients), branch)}
        isNew
        onCancel={() => setView({ mode: 'list' })}
        onSave={(saved) => {
          data.addClient(saved)
          setView({ mode: 'detail', id: saved.id })
        }}
      />
    )
  }

  return (
    <ClientList
      query={query}
      branch={branch}
      onOpen={(id) => setView({ mode: 'detail', id })}
      onNew={() => setView({ mode: 'new' })}
    />
  )
}
