// Connectors between the modules: Clients, Quotations, Projects, POS,
// Inventory and Invoices.
//
// Linked records store the ID of the record they belong to (a quote stores
// its clientId, a project its quoteId), so nothing keeps a copy of another
// module's list. These functions look the records up instead. Connections
// marked NOT CONNECTED are ready to be switched on later.
//
// `data` is the object returned by useData().

import { stockAt, canTakeOut } from '../inventory/inventoryFields.js'
import { quoteTotals } from '../quotations/quoteFields.js'
import { saleTotals } from '../pos/posFields.js'
import { todayIso } from '../utils/format.js'

// Clients -> Quotations (map connection 1)
export function quotationsForClient(data, clientId) {
  return data.quotations.filter((q) => q.clientId === clientId)
}

// Clients -> Projects, through the approved quote (map connection 3)
export function projectsForClient(data, clientId) {
  return data.projects.filter((p) => p.clientId === clientId)
}

// Invoices and payments -> Clients (map connection 6). Cancelled invoices
// are left out. POS sales linked to a client (connection 7) will also
// arrive here as invoices of type "POS sale".
export function invoicesForClient(data, clientId) {
  return data.invoices.filter((i) => i.clientId === clientId && !i.cancelled)
}

export function amountPaid(invoice) {
  return invoice.payments.reduce((sum, p) => sum + p.amount, 0)
}

// What's still owed. A cancelled invoice owes nothing.
export function invoiceBalance(invoice) {
  return invoice.cancelled ? 0 : invoice.amount - amountPaid(invoice)
}

// Cancelled, Paid, Overdue (past the due date with money owed), Partly paid
// or Unpaid.
export function invoiceStatus(invoice) {
  if (invoice.cancelled) return 'Cancelled'
  const paid = amountPaid(invoice)
  if (paid >= invoice.amount) return 'Paid'
  if (invoice.dueDate && invoice.dueDate < todayIso()) return 'Overdue'
  if (paid > 0) return 'Partly paid'
  return 'Unpaid'
}

export function balanceDue(data, clientId) {
  return invoicesForClient(data, clientId).reduce((sum, i) => sum + invoiceBalance(i), 0)
}

// --- Quotations -------------------------------------------------------

// Quotations <- Clients (map connection 1). A quote stores only the client's
// ID; name, phone and sites are read from the client record.
export function clientForQuote(data, quote) {
  return data.clients.find((c) => c.id === quote.clientId)
}

// A quote belongs to the branch of the client it was made for.
export function quoteBranch(data, quote) {
  return clientForQuote(data, quote)?.branch
}

// Quotations <- Inventory (map connection 2). CONNECTED. The quote editor
// suggests these; picking one fills in unit and price and stores the item's
// SKU on the quote line. That SKU is the line's one link to Inventory.
export function productsForQuotes(data) {
  return inventoryAsQuoteProducts(data)
}

// The Inventory item a quote line was picked from, or undefined for a
// custom-made line (cabinets, counters) that isn't a stock item.
export function inventoryItemForLine(data, line) {
  return line.sku ? data.inventory.find((i) => i.sku === line.sku) : undefined
}

// The SKUs of every Inventory item used on a quote.
export function inventorySkusForQuote(data, quote) {
  return [...new Set(quote.items.map((line) => inventoryItemForLine(data, line)?.sku).filter(Boolean))]
}

// Quotations -> Projects (map connection 3). A project stores the ID of the
// quote it came from, so this finds the project an approved quote became.
export function projectsForQuote(data, quoteId) {
  return data.projects.filter((p) => p.quoteId === quoteId)
}

// NOT CONNECTED YET. This should create a project from an approved quote:
// client and site copied over, quote lines becoming the materials list (see
// materialsFromQuote below). The "Convert to project" button calls it.
export function canConvertToProject() {
  return false
}

// --- Projects ---------------------------------------------------------

// Projects <- Clients. A project stores the client's ID.
export function clientForProject(data, project) {
  return data.clients.find((c) => c.id === project.clientId)
}

// Projects <- Quotations (map connection 3). A project stores the ID of the
// approved quote it came from.
export function quoteForProject(data, project) {
  return data.quotations.find((q) => q.id === project.quoteId)
}

export function projectBranch(data, project) {
  return clientForProject(data, project)?.branch
}

// Approved quotes for a client that don't have a project yet.
export function quotesReadyForProject(data, clientId, exceptProjectId) {
  const taken = new Set(data.projects.filter((p) => p.id !== exceptProjectId).map((p) => p.quoteId))
  return data.quotations.filter((q) => q.clientId === clientId && q.status === 'Approved' && !taken.has(q.id))
}

// A project's materials are Inventory items. Each material stores only the
// item's SKU, the quantity and its status; name, unit and cost price are
// always read from Inventory. Custom-made quote lines (cabinets, counters)
// aren't materials; their boards and fittings are added from Inventory.
export function materialsFromQuote(quote) {
  return quote.items.filter((i) => i.sku).map((i) => ({ sku: i.sku, qty: i.qty, status: 'Pending' }))
}

// The Inventory item behind a project material.
export function itemForMaterial(data, material) {
  return data.inventory.find((i) => i.sku === material.sku)
}

// What a project's materials cost the studio, at Inventory cost prices.
export function projectMaterialsCost(data, project) {
  return project.materials.reduce((sum, m) => sum + m.qty * (itemForMaterial(data, m)?.costPrice ?? 0), 0)
}

// Inventory reservations, worked out from project materials marked Reserved.
// This is the only place a reservation exists: Inventory doesn't keep its
// own copy. A reservation is held at the branch of the project's client.
export function reservationsFromProjects(projects, clients, sku) {
  return projects.flatMap((p) =>
    p.materials
      .filter((m) => m.sku === sku && m.status === 'Reserved')
      .map((m) => ({ projectId: p.id, branch: clients.find((c) => c.id === p.clientId)?.branch, qty: m.qty })),
  )
}

// Projects -> Inventory (map connection 4). CONNECTED. Checks whether a
// material can move to a new status and says what stock movement that makes:
//   Reserved: needs that much available stock (reserved stock can't be used twice).
//   Issued:   takes the stock out of the store (an "Out" movement).
//   Back from Issued: the stock comes back in (an "In" movement).
// Returns { ok, message, movement } where movement may be null.
export function checkMaterialStatus(data, project, material, newStatus) {
  const item = itemForMaterial(data, material)
  const branch = clientForProject(data, project)?.branch
  const old = material.status
  if (!item || !branch || old === newStatus) return { ok: true, movement: null }

  const { onHand, available } = stockAt(item, branch)
  const qty = Number(material.qty)
  // Stock this material already holds as a reservation is free for it to use.
  const free = available + (old === 'Reserved' ? qty : 0)

  if ((newStatus === 'Reserved' || newStatus === 'Issued') && old !== 'Issued' && qty > free) {
    const heldElsewhere = onHand - free
    return {
      ok: false,
      message:
        heldElsewhere > 0
          ? `Only ${Math.max(0, free)} ${item.unit} of ${item.name} is free at ${branch}: ${onHand} on hand, ${heldElsewhere} reserved for other projects.`
          : `Only ${onHand} ${item.unit} of ${item.name} in stock at ${branch}, and this project needs ${qty}.`,
    }
  }

  const base = { sku: item.sku, branch, date: todayIso(), by: project.designer || 'Studio', note: '' }
  if (newStatus === 'Issued') {
    return { ok: true, movement: { ...base, type: 'Out', qty, reference: `Issued to ${project.id}` } }
  }
  if (old === 'Issued') {
    return { ok: true, movement: { ...base, type: 'In', qty, reference: `Returned from ${project.id}` } }
  }
  return { ok: true, movement: null }
}

// Projects -> Invoices and payments (map connection 5). Invoices store the
// project's ID, so this finds the advance, progress and final invoices.
export function invoicesForProject(data, projectId) {
  return data.invoices.filter((i) => i.projectId === projectId && !i.cancelled)
}

// --- POS --------------------------------------------------------------
// None of these are connected yet. Each one marks where POS will link to
// another module, and says what it should do once that module is ready.

// Items the counter can sell. For now POS has its own small showroom list
// (posProducts.json). Once Inventory exists, return its products for the
// branch, with stock on hand, so POS can't sell what's reserved for projects.
export function productsForPos(data) {
  return data.posProducts
}

// POS <- Clients (map connection 7, optional). NOT CONNECTED YET.
// A sale can carry a clientId; when connected, return the client so the sale
// shows on their profile:
//   return data.clients.find((c) => c.id === sale.clientId)
export function clientForSale() {
  return null
}

// POS -> Inventory (map connection 8). NOT CONNECTED YET.
// Called when a sale is completed. Should reduce stock at the sale's branch
// for every item sold.
export function saleReducesStock(data, sale) {
  return sale
}

// POS -> Invoices and payments (map connection 9). NOT CONNECTED YET.
// Called when a sale is completed. To connect, build the invoice with
// posSaleAsInvoice (in the Invoices section below) and save it with
// data.addInvoice, so all money is in one place.
export function invoiceForSale() {
  return null
}

// --- Inventory --------------------------------------------------------
// Inventory is the stock list. Quotations use it (above); the other
// connections below are ready to be switched on.

// Inventory -> Quotations (map connection 2). CONNECTED through
// productsForQuotes above.
export function inventoryAsQuoteProducts(data) {
  return data.inventory.map((i) => ({
    sku: i.sku,
    name: i.name,
    description: `${i.sku}${i.description ? `, ${i.description}` : ''}`,
    unit: i.unit,
    sellingPrice: i.sellingPrice,
  }))
}

// Inventory -> POS. READY, NOT CONNECTED. Items the counter can sell at a
// branch, with what's available after project reservations. To connect,
// make productsForPos (above) return this. Note POS sells vinyl by the box
// of 24 sqft while Inventory counts sqft; convert when connecting.
export function inventoryForPos(data, branch) {
  return data.inventory.map((i) => ({
    sku: i.sku,
    name: i.name,
    category: i.category,
    unit: i.unit,
    price: i.sellingPrice,
    available: stockAt(i, branch).available,
  }))
}

// POS -> Inventory, the reservation rule (map connection 8). READY, NOT
// CONNECTED. Checkout should call this before completing a sale and refuse
// any line that needs reserved stock. Returns one problem per short line.
export function checkSaleAgainstStock(data, sale) {
  return sale.items
    .map((line) => {
      const item = data.inventory.find((i) => i.sku === line.sku)
      if (!item) return null
      const check = canTakeOut(item, sale.branch, line.qty)
      return check.ok ? null : { sku: line.sku, name: line.name, ...check }
    })
    .filter(Boolean)
}

// The projects holding an item, for its Inventory page. `item.reservations`
// is filled in by the data store from reservationsFromProjects (Projects
// section), so this is a view of the projects' materials, not a second list.
export function reservationsForItem(data, item) {
  return (item.reservations ?? []).map((r) => ({ ...r, project: data.projects.find((p) => p.id === r.projectId) }))
}

// Inventory -> Projects: cost prices for the project's materials cost.
// CONNECTED through projectMaterialsCost (Projects section).
export function costPriceFor(data, sku) {
  return data.inventory.find((i) => i.sku === sku)?.costPrice ?? null
}

// Every project using an item, with how much and in what state.
export function projectsUsingItem(data, sku) {
  return data.projects.flatMap((p) => p.materials.filter((m) => m.sku === sku).map((m) => ({ project: p, material: m })))
}

// Suppliers -> Inventory (phase 2). NOT BUILT. Goods received notes (GRN)
// from suppliers and purchase orders will record "In" movements.
export function goodsReceived() {
  return null
}

// --- Invoices and payments -----------------------------------------------

export function clientForInvoice(data, invoice) {
  return data.clients.find((c) => c.id === invoice.clientId)
}

export function projectForInvoice(data, invoice) {
  return data.projects.find((p) => p.id === invoice.projectId)
}

export function saleForInvoice(data, invoice) {
  return data.sales.find((s) => s.id === invoice.saleId)
}

// An invoice belongs to the branch of its sale, or of the client.
export function invoiceBranch(data, invoice) {
  return saleForInvoice(data, invoice)?.branch ?? clientForInvoice(data, invoice)?.branch
}

// How much of a project has been billed. The quote total is the contract
// value; advance, progress and final invoices together should reach it.
export function projectBilling(data, projectId, exceptInvoiceId) {
  const project = data.projects.find((p) => p.id === projectId)
  const quote = project && data.quotations.find((q) => q.id === project.quoteId)
  const quoteTotal = quote ? quoteTotals(quote).total : 0
  const invoiced = invoicesForProject(data, projectId)
    .filter((i) => i.id !== exceptInvoiceId)
    .reduce((sum, i) => sum + i.amount, 0)
  return { project, quote, quoteTotal, invoiced, remaining: quoteTotal - invoiced }
}

// READY, NOT CONNECTED. Turns a completed POS sale into a paid "POS sale"
// invoice with one payment. invoiceForSale (POS section) should use it.
export function posSaleAsInvoice(sale, invoiceId, paymentId) {
  const total = saleTotals(sale).total
  return {
    id: invoiceId,
    type: 'POS sale',
    clientId: sale.clientId ?? '',
    projectId: '',
    saleId: sale.id,
    date: sale.date,
    dueDate: sale.date,
    description: `Counter sale ${sale.id} at ${sale.branch}`,
    amount: total,
    cancelled: false,
    payments: [
      {
        id: paymentId,
        date: sale.date,
        amount: total,
        method: sale.payment.method,
        reference: sale.payment.reference,
        receivedBy: sale.cashier,
      },
    ],
  }
}

// Invoices -> Dashboard (map connection 10). READY, NOT CONNECTED.
// Money totals for a branch (or both): what's owed, what's overdue, and
// what came in this month. The Invoices page uses it for its summary strip.
export function moneyTotals(data, branch, allBranches) {
  const month = todayIso().slice(0, 7)
  const list = data.invoices.filter((i) => allBranches || invoiceBranch(data, i) === branch)
  const live = list.filter((i) => !i.cancelled)
  const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0)
  return {
    outstanding: sum(live, invoiceBalance),
    overdue: sum(live.filter((i) => invoiceStatus(i) === 'Overdue'), invoiceBalance),
    invoicedThisMonth: sum(live.filter((i) => i.date.startsWith(month)), (i) => i.amount),
    receivedThisMonth: sum(live, (i) => sum(i.payments.filter((p) => p.date.startsWith(month)), (p) => p.amount)),
  }
}

// --- Staff -------------------------------------------------------------

// Staff -> every module. What one person has worked on. Other modules store
// people by name today (a project's designer, a sale's cashier), so this
// matches on name. Once Staff is connected, those modules should store the
// person's staff ID instead, and these checks should compare IDs.
export function workForStaff(data, person) {
  const name = person.name
  return {
    designing: data.projects.filter((p) => p.designer === name),
    installing: data.projects.filter((p) => p.team.includes(name)),
    sales: data.sales.filter((s) => s.cashier === name),
    payments: data.invoices.flatMap((i) => i.payments.filter((p) => p.receivedBy === name).map((p) => ({ ...p, invoiceId: i.id }))),
    cashUps: data.cashUps.filter((c) => c.closedBy === name),
    movements: data.movements.filter((m) => m.by === name),
  }
}

// The registered staff member with this name, if there is one. Projects
// store the designer and team by name, so this is how a name on a project
// links to that person's Staff page.
export function staffByName(data, name) {
  return name ? data.staff.find((p) => p.name === name) : undefined
}

// Designers and installation teams for the project form's name suggestions.
// Reads the Staff list, which stays empty until an admin adds people in
// User settings. Projects still store names, not staff IDs (see above).
export function staffForProjects(data) {
  return data.staff ?? []
}
