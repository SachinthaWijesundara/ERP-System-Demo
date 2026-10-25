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

// Quotations <- Inventory (map connection 2). NOT CONNECTED YET.
// Once the Inventory module exists, return its products here, e.g.
//   return data.products
// Each product needs { name, description, unit, sellingPrice }. The quote
// editor already offers these as suggestions and fills in unit and price
// when one is picked, so nothing else has to change.
export function productsForQuotes(data) {
  return data.products ?? []
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

// Quote lines become the project's materials list. unitCost is the studio's
// cost price, which will come from Inventory once it is connected.
export function materialsFromQuote(quote) {
  return quote.items.map((i) => ({
    product: i.product,
    description: i.description,
    qty: i.qty,
    unit: i.unit,
    unitCost: 0,
    status: 'Pending',
  }))
}

// Projects -> Inventory (map connection 4). NOT CONNECTED YET.
// When a material is reserved, Inventory should hold that stock for the
// project so POS can't sell it; when issued, it should deduct it. The project
// page calls this every time a material's status changes.
export function materialStatusChanged(data, project, material, newStatus) {
  // e.g. data.reserveStock(material.product, material.qty, project.id)
  return { project, material, newStatus }
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
// Inventory is the stock list. Other modules aren't wired to it yet; each
// function below is ready to be called once they are.

// Inventory -> Quotations (map connection 2). READY, NOT CONNECTED.
// To connect, make productsForQuotes (above) return this. The quote editor
// already fills in unit and price when one of these names is picked.
export function inventoryAsQuoteProducts(data) {
  return data.inventory.map((i) => ({
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

// Projects -> Inventory (map connection 4). NOT CONNECTED YET. Today each
// item keeps its own `reservations` list. Once connected, reservations should
// come from project materials marked Reserved (they'll need a sku), and
// marking a material Issued should record an "Out" movement here.
export function reservationsForItem(data, item) {
  return item.reservations.map((r) => ({ ...r, project: data.projects.find((p) => p.id === r.projectId) }))
}

// Inventory -> Projects: cost prices for the project's materials cost.
// NOT CONNECTED YET; projects keep their own unitCost for now.
export function costPriceFor(data, sku) {
  return data.inventory.find((i) => i.sku === sku)?.costPrice ?? null
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

// Designers and installation teams. NOT CONNECTED YET. Once a Staff module
// exists, return its people here; the project form already suggests them.
export function staffForProjects(data) {
  return data.staff ?? []
}
