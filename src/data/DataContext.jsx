import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { reservationsFromProjects, stockMovementsForSale, invoiceForSale } from './links.js'
import { onQuoteSaved, onProjectAdded, onProjectSaved, onSaleCompleted, liveFinalInvoice } from './billing.js'
import { nextMovementId, movementDelta } from '../inventory/inventoryFields.js'
import { nowTime } from '../pos/posFields.js'
import { todayIso } from '../utils/format.js'
import { DEFAULT_ROLES } from '../auth/permissions.js'
import clientsSeed from './clients.json'
import quotationsSeed from './quotations.json'
import projectsSeed from './projects.json'
import invoicesSeed from './invoices.json'
import salesSeed from './sales.json'
import cashUpsSeed from './cashups.json'
import inventorySeed from './inventory.json'
import movementsSeed from './movements.json'
import staffSeed from './staff.json'

// One shared store for every module. The JSON files are the starting data.
// Changes are kept in this browser (localStorage), so new staff accounts,
// sales and edits survive a page refresh; "Reset demo data" in User settings
// goes back to the JSON files.
const DataContext = createContext(null)

const STORAGE_KEY = 'immense-home-demo'
const STORAGE_VERSION = 4

const SEEDS = {
  clients: clientsSeed,
  quotations: quotationsSeed,
  projects: projectsSeed,
  invoices: invoicesSeed,
  sales: salesSeed,
  cashUps: cashUpsSeed,
  inventory: inventorySeed,
  movements: movementsSeed,
  staff: staffSeed,
  roles: DEFAULT_ROLES,
  notifications: [],
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved?.version === STORAGE_VERSION ? saved.data : null
  } catch {
    return null
  }
}

// Files picked from the computer only live in this page's memory, so their
// links can't be saved; the file record stays, without the picture.
const withoutBlobs = (value) =>
  JSON.parse(JSON.stringify(value, (key, v) => (key === 'url' && typeof v === 'string' && v.startsWith('blob:') ? null : v)))

export function DataProvider({ children }) {
  const [saved] = useState(loadSaved)
  const start = (key) => saved?.[key] ?? SEEDS[key]

  const [clients, setClients] = useState(() => start('clients'))
  const [quotations, setQuotations] = useState(() => start('quotations'))
  const [projects, setProjects] = useState(() => start('projects'))
  const [invoices, setInvoices] = useState(() => start('invoices'))
  const [sales, setSales] = useState(() => start('sales'))
  const [cashUps, setCashUps] = useState(() => start('cashUps'))
  const [inventory, setInventory] = useState(() => start('inventory'))
  const [movements, setMovements] = useState(() => start('movements'))
  const [staff, setStaff] = useState(() => start('staff'))
  const [roles, setRoles] = useState(() => start('roles'))
  const [notifications, setNotifications] = useState(() => start('notifications'))

  // The staff member signed in right now. Records the system makes on its own
  // (stock movements, invoices) are put down to them. Set by the sign-in.
  const actor = useRef('')

  // Save everything after each change.
  useEffect(() => {
    try {
      const data = { clients, quotations, projects, invoices, sales, cashUps, inventory, movements, staff, roles, notifications }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, data: withoutBlobs(data) }))
    } catch {
      // Storage full or blocked: the demo still works, it just won't remember.
    }
  }, [clients, quotations, projects, invoices, sales, cashUps, inventory, movements, staff, roles, notifications])

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
  // A movement without a person is put down to whoever is signed in.
  function recordMovements(list) {
    if (!list.length) return
    let ids = movements
    const withIds = list.map((m) => {
      const movement = { ...m, byId: m.byId || actor.current, id: nextMovementId(ids) }
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
    roles,
    inventory: inventoryView,
    movements,
    clients,
    quotations,
    projects,
    invoices: invoicesView,
    sales,
    cashUps,
    notifications,

    setActor(staffId) {
      actor.current = staffId
    },

    // --- Clients ---
    addClient(client) {
      setClients((list) => [client, ...list])
    },
    updateClient(client) {
      setClients((list) => list.map((c) => (c.id === client.id ? client : c)))
    },
    deleteClient(clientId) {
      setClients((list) => list.filter((c) => c.id !== clientId))
    },

    // --- Quotations ---
    addQuotation(quote) {
      setQuotations((list) => [quote, ...list])
      applyBilling(onQuoteSaved(snapshot(), null, quote))
    },
    updateQuotation(quote) {
      const before = quotations.find((q) => q.id === quote.id)
      setQuotations((list) => list.map((q) => (q.id === quote.id ? quote : q)))
      applyBilling(onQuoteSaved(snapshot({ quotations: quotations.map((q) => (q.id === quote.id ? quote : q)) }), before, quote))
    },
    deleteQuotation(quoteId) {
      setQuotations((list) => list.filter((q) => q.id !== quoteId))
    },

    // --- Projects ---
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

    // --- POS ---
    // A finished counter sale: save it, take the items out of stock, and
    // create its paid invoice.
    completeSale(sale) {
      setSales((list) => [sale, ...list])
      recordMovements(stockMovementsForSale(sale))
      applyBilling(onSaleCompleted(snapshot(), sale))
    },
    // Voiding a sale puts its items back in stock and cancels its invoice
    // (the money is handed back). The sale stays on record, marked void.
    voidSale(saleId, reason) {
      const sale = sales.find((s) => s.id === saleId)
      if (!sale || sale.voided) return
      const today = todayIso()
      setSales((list) =>
        list.map((s) => (s.id === saleId ? { ...s, voided: { on: today, byId: actor.current, reason } } : s)),
      )
      recordMovements(
        stockMovementsForSale(sale).map((m) => ({ ...m, type: 'In', date: today, byId: '', reference: `Void of sale ${sale.id}` })),
      )
      const invoice = invoiceForSale({ invoices }, sale)
      if (invoice) setInvoices((list) => list.map((i) => (i.id === invoice.id ? { ...i, cancelled: true } : i)))
    },
    addCashUp(cashUp) {
      setCashUps((list) => [cashUp, ...list])
    },

    // --- Invoices ---
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

    // --- Inventory ---
    addItem(item) {
      setInventory((list) => [...list, stored(item)])
    },
    updateItem(item) {
      setInventory((list) => list.map((i) => (i.sku === item.sku ? stored(item) : i)))
    },
    deleteItem(sku) {
      setInventory((list) => list.filter((i) => i.sku !== sku))
    },
    recordMovements,
    // Logs one stock movement and changes that branch's on-hand figure.
    recordMovement(movement) {
      recordMovements([movement])
    },

    // --- Staff and roles (User settings, admin only) ---
    addStaff(person) {
      setStaff((list) => [...list, person])
    },
    updateStaff(person) {
      setStaff((list) => list.map((p) => (p.id === person.id ? person : p)))
    },
    saveRole(role) {
      setRoles((list) => (list.some((r) => r.id === role.id) ? list.map((r) => (r.id === role.id ? role : r)) : [...list, role]))
    },
    deleteRole(roleId) {
      setRoles((list) => list.filter((r) => r.id !== roleId || r.locked))
    },

    // Back to the JSON files: every change made in the app is lost.
    resetDemoData() {
      localStorage.removeItem(STORAGE_KEY)
      setClients(SEEDS.clients)
      setQuotations(SEEDS.quotations)
      setProjects(SEEDS.projects)
      setInvoices(SEEDS.invoices)
      setSales(SEEDS.sales)
      setCashUps(SEEDS.cashUps)
      setInventory(SEEDS.inventory)
      setMovements(SEEDS.movements)
      setStaff(SEEDS.staff)
      setRoles(SEEDS.roles)
      setNotifications([])
    },
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
