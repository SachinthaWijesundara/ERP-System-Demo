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
