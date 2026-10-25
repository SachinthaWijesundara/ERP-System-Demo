import { useEffect, useState } from 'react'
import { useData } from '../data/DataContext.jsx'
import ClientList from '../clients/ClientList.jsx'
import ClientDetail from '../clients/ClientDetail.jsx'
import ClientForm from '../clients/ClientForm.jsx'
import { emptyClient, nextClientId } from '../clients/clientFields.js'

// Switches between the client list, one client's page, and the add/edit form.
export default function Clients({ query }) {
  const data = useData()
  const [view, setView] = useState({ mode: 'list' })

  // Typing in the search bar always brings the list back.
  useEffect(() => {
    setView({ mode: 'list' })
  }, [query])

  if (view.mode === 'detail') {
    return (
      <ClientDetail
        clientId={view.id}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'edit', id: view.id })}
      />
    )
  }

  if (view.mode === 'edit') {
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

  if (view.mode === 'new') {
    return (
      <ClientForm
        initial={emptyClient(nextClientId(data.clients))}
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
      onOpen={(id) => setView({ mode: 'detail', id })}
      onNew={() => setView({ mode: 'new' })}
    />
  )
}
