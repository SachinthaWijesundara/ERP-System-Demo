import { createContext, useContext, useMemo, useState } from 'react'
import { reservationsFromProjects, stockMovementsForSale } from './links.js'
import { onQuoteSaved, onProjectAdded, onProjectSaved, onSaleCompleted, liveFinalInvoice } from './billing.js'
import { nextMovementId, movementDelta } from '../inventory/inventoryFields.js'
import { nowTime } from '../pos/posFields.js'
import { todayIso } from '../utils/format.js'
import clientsSeed from './clients.json'
import quotationsSeed from './quotations.json'
import projectsSeed from './projects.json'
import invoicesSeed from './invoices.json'
import salesSeed from './sales.json'
import cashUpsSeed from './cashups.json'
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
  const [notifications, setNotifications] = useState([])

  // Each item's reservations come from project materials marked Reserved.
  // They're worked out here for every page to read, never stored on the item.
  const inventoryView = useMemo(
    () => inventory.map((i) => ({ ...i, reservations: reservationsFromProjects({ projects, quotations, clients }, i.sku) })),
    [inventory, projects, quotations, clients],
  )
  // eslint-disable-next-line no-unused-vars
  const stored = ({ reservations, ...item }) => item

  // Draft Final invoices show their figures as the project stands right now.
  const invoicesView = useMemo(() => {
    const base = { projects, quotations, invoices, inventory: inventoryView }
    return invoices.map((i) => (i.type === 'Final' && i.draft ? liveFinalInvoice(base, i) : i))
  }, [invoices, projects, quotations, inventoryView])

  // The current data, for the billing rules to read.
  const snapshot = (patch = {}) => ({ clients, quotations, projects, invoices, sales, inventory: inventoryView, ...patch })

  // Saves what a billing rule decided and rings the notification bell.
  function applyBilling({ invoices: next, notices }) {
    if (next !== invoices) setInvoices(next)
    if (notices.length) {
      const at = `${todayIso()} ${nowTime()}`
      setNotifications((list) => [
        ...notices.map((n, i) => ({ ...n, id: `${Date.now()}-${i}`, at, read: false })),
        ...list,
      ])
    }
  }

  // Logs stock movements and changes each branch's on-hand figure to match.
  function recordMovements(list) {
    if (!list.length) return
    let ids = movements
    const withIds = list.map((m) => {
      const movement = { ...m, id: nextMovementId(ids) }
      ids = [movement, ...ids]
      return movement
    })
    setMovements((all) => [...withIds.reverse(), ...all])
    setInventory((items) =>
      items.map((i) => {
        const mine = withIds.filter((m) => m.sku === i.sku)
        if (!mine.length) return i
        const stock = { ...i.stock }
        mine.forEach((m) => {
          stock[m.branch] = (stock[m.branch] ?? 0) + movementDelta(m)
        })
        return { ...i, stock }
      }),
    )
  }

  const value = {
    staff,
    inventory: inventoryView,
    movements,
    clients,
    quotations,
    projects,
    invoices: invoicesView,
    sales,
    cashUps,
    notifications,

    addClient(client) {
      setClients((list) => [client, ...list])
    },
    updateClient(client) {
      setClients((list) => list.map((c) => (c.id === client.id ? client : c)))
    },

    addQuotation(quote) {
      setQuotations((list) => [quote, ...list])
      applyBilling(onQuoteSaved(snapshot(), null, quote))
    },
    updateQuotation(quote) {
      const before = quotations.find((q) => q.id === quote.id)
      setQuotations((list) => list.map((q) => (q.id === quote.id ? quote : q)))
      applyBilling(onQuoteSaved(snapshot({ quotations: quotations.map((q) => (q.id === quote.id ? quote : q)) }), before, quote))
    },

    addProject(project) {
      setProjects((list) => [project, ...list])
      applyBilling(onProjectAdded(snapshot({ projects: [project, ...projects] }), project))
    },
    // `movementsToRecord` are stock moves the change causes (materials reserved
    // and issued by a stage being completed, for example).
    updateProject(project, movementsToRecord = []) {
      const before = projects.find((p) => p.id === project.id)
      const nextProjects = projects.map((p) => (p.id === project.id ? project : p))
      setProjects(nextProjects)
      recordMovements(movementsToRecord)
      applyBilling(onProjectSaved(snapshot({ projects: nextProjects }), before, project))
    },

    // A finished counter sale: save it, take the items out of stock, and
    // create its paid invoice.
    completeSale(sale) {
      setSales((list) => [sale, ...list])
      recordMovements(stockMovementsForSale(sale))
      applyBilling(onSaleCompleted(snapshot(), sale))
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
      // Drafts are shown with live figures; store them without those.
      // eslint-disable-next-line no-unused-vars
      const { lines, ...rest } = invoice
      setInvoices((list) => list.map((i) => (i.id === invoice.id ? (invoice.draft ? rest : invoice) : i)))
    },

    markNotificationsRead() {
      setNotifications((list) => list.map((n) => ({ ...n, read: true })))
    },

    addCashUp(cashUp) {
      setCashUps((list) => [cashUp, ...list])
    },

    addItem(item) {
      setInventory((list) => [...list, stored(item)])
    },
    updateItem(item) {
      setInventory((list) => list.map((i) => (i.sku === item.sku ? stored(item) : i)))
    },
    // Logs one stock movement and changes that branch's on-hand figure.
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
