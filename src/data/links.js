// Connectors between Clients and the other modules.
//
// Each linked record stores the ID of the client it belongs to (`clientId`),
// so a client never keeps its own copy of these lists. These functions look the
// records up instead. When the Quotations, Projects, POS and Invoices modules
// are built, their data plugs in here and the client pages pick it up as is.
//
// `data` is the object returned by useData().

// Clients -> Quotations (map connection 1)
export function quotationsForClient(data, clientId) {
  return data.quotations.filter((q) => q.clientId === clientId)
}

// Clients -> Projects, through the approved quote (map connection 3)
export function projectsForClient(data, clientId) {
  return data.projects.filter((p) => p.clientId === clientId)
}

// Invoices and payments -> Clients (map connection 6).
// POS sales linked to a client (connection 7) will also arrive here as
// invoices of type "POS sale".
export function invoicesForClient(data, clientId) {
  return data.invoices.filter((i) => i.clientId === clientId)
}

export function amountPaid(invoice) {
  return invoice.payments.reduce((sum, p) => sum + p.amount, 0)
}

export function invoiceBalance(invoice) {
  return invoice.amount - amountPaid(invoice)
}

export function invoiceStatus(invoice) {
  const paid = amountPaid(invoice)
  if (paid >= invoice.amount) return 'Paid'
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

// NOT CONNECTED YET. When the Projects module exists, this should create a
// project from an approved quote: client and site copied over, quote lines
// becoming the materials list. The "Convert to project" button calls it.
export function canConvertToProject() {
  return false
}
