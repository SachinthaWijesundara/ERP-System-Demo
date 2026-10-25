import { createContext, useContext, useState } from 'react'
import clientsSeed from './clients.json'
import quotationsSeed from './quotations.json'
import projectsSeed from './projects.json'
import invoicesSeed from './invoices.json'
import salesSeed from './sales.json'
import cashUpsSeed from './cashups.json'
import posProducts from './posProducts.json'

// One shared store for every module. The JSON files are the starting data;
// changes made in the app live in memory and reset when the page reloads.
const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [clients, setClients] = useState(clientsSeed)
  const [quotations, setQuotations] = useState(quotationsSeed)
  const [projects, setProjects] = useState(projectsSeed)
  const [invoices] = useState(invoicesSeed)
  const [sales, setSales] = useState(salesSeed)
  const [cashUps, setCashUps] = useState(cashUpsSeed)

  const value = {
    clients,
    quotations,
    projects,
    invoices,
    sales,
    cashUps,
    posProducts,

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

    addProject(project) {
      setProjects((list) => [project, ...list])
    },
    updateProject(project) {
      setProjects((list) => list.map((p) => (p.id === project.id ? project : p)))
    },

    addSale(sale) {
      setSales((list) => [sale, ...list])
    },
    addCashUp(cashUp) {
      setCashUps((list) => [cashUp, ...list])
    },
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
