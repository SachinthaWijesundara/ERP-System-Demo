import { createContext, useContext, useState } from 'react'
import clientsSeed from './clients.json'
import quotationsSeed from './quotations.json'
import projectsSeed from './projects.json'
import invoicesSeed from './invoices.json'

// One shared store for every module. The JSON files are the starting data;
// changes made in the app live in memory and reset when the page reloads.
const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [clients, setClients] = useState(clientsSeed)
  const [quotations, setQuotations] = useState(quotationsSeed)
  const [projects] = useState(projectsSeed)
  const [invoices] = useState(invoicesSeed)

  const value = {
    clients,
    quotations,
    projects,
    invoices,

    addClient(client) {
      setClients((list) => [client, ...list])
    },
    updateClient(client) {
      setClients((list) => list.map((c) => (c.id === client.id ? client : c)))
    },

    addQuotation(quote) {
      setQuotations((list) => [quote, ...list])
    },
    updateQuotation(quote) {
      setQuotations((list) => list.map((q) => (q.id === quote.id ? quote : q)))
    },
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
