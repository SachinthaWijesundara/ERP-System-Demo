import { createContext, useContext, useState } from 'react'
import clientsSeed from './clients.json'
import quotationsSeed from './quotations.json'
import projectsSeed from './projects.json'
import invoicesSeed from './invoices.json'
import salesSeed from './sales.json'
import cashUpsSeed from './cashups.json'
import posProducts from './posProducts.json'
import inventorySeed from './inventory.json'
import movementsSeed from './movements.json'
import staffSeed from './staff.json'

// One shared store for every module. The JSON files are the starting data;
// changes made in the app live in memory and reset when the page reloads.
const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [clients, setClients] = useState(clientsSeed)
  const [quotations, setQuotations] = useState(quotationsSeed)
  const [projects, setProjects] = useState(projectsSeed)
  const [invoices, setInvoices] = useState(invoicesSeed)
  const [sales, setSales] = useState(salesSeed)
  const [cashUps, setCashUps] = useState(cashUpsSeed)
  const [inventory, setInventory] = useState(inventorySeed)
  const [movements, setMovements] = useState(movementsSeed)
  const [staff, setStaff] = useState(staffSeed)

  const value = {
    staff,
    inventory,
    movements,
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
    // Staff are added and changed only by an admin, from User settings.
    // The Staff page itself is read-only.
    addStaff(person) {
      setStaff((list) => [...list, person])
    },
    updateStaff(person) {
      setStaff((list) => list.map((p) => (p.id === person.id ? person : p)))
    },

    addInvoice(invoice) {
      setInvoices((list) => [invoice, ...list])
    },
    updateInvoice(invoice) {
      setInvoices((list) => list.map((i) => (i.id === invoice.id ? invoice : i)))
    },

    addCashUp(cashUp) {
      setCashUps((list) => [cashUp, ...list])
    },

    addItem(item) {
      setInventory((list) => [...list, item])
    },
    updateItem(item) {
      setInventory((list) => list.map((i) => (i.sku === item.sku ? item : i)))
    },
    // Logs a stock movement and changes that branch's on-hand figure to match.
    recordMovement(movement, delta) {
      setMovements((list) => [movement, ...list])
      setInventory((list) =>
        list.map((i) =>
          i.sku === movement.sku
            ? { ...i, stock: { ...i.stock, [movement.branch]: (i.stock[movement.branch] ?? 0) + delta } }
            : i,
        ),
      )
    },
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
