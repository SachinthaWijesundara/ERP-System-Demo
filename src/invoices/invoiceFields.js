import { invoiceBalance } from '../data/links.js'

// Advance: up-front share of the quote, made when the quote is approved.
// Progress: part-way through the job, raised by hand. Final: the rest of the
// quote plus extras, a draft until handover. POS sale: made by the counter.
// Only Progress invoices are raised by hand (see billing.js for the rest).
export const INVOICE_TYPES = ['Advance', 'Progress', 'Final', 'POS sale']
export const RAISED_TYPES = ['Progress']

export const INVOICE_STATUSES = ['Draft', 'Unpaid', 'Partly paid', 'Overdue', 'Paid', 'Cancelled']

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer', 'Cheque']

// Share of the quote asked for up front, as in the quote terms.
export const ADVANCE_SHARE = 0.5

const INVOICE_ID = /^INV-\d{4}$/

const nextId = (prefix, ids) => {
  const highest = ids.reduce((max, id) => Math.max(max, Number(id.split('-')[1]) || 0), 0)
  return `${prefix}-${String(highest + 1).padStart(4, '0')}`
}

export const nextInvoiceId = (invoices) => nextId('INV', invoices.map((i) => i.id))

// Receipt numbers run across every invoice.
export const nextPaymentId = (invoices) => nextId('PAY', invoices.flatMap((i) => i.payments.map((p) => p.id)))

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// A blank progress invoice. `projectId` is only for the form's project
// picker; the saved invoice keeps the project's quoteId instead.
export function emptyInvoice(id, today) {
  return {
    id,
    type: 'Progress',
    projectId: '',
    quoteId: '',
    saleId: '',
    date: today,
    dueDate: addDays(today, 7),
    description: '',
    amount: '',
    draft: false,
    cancelled: false,
    payments: [],
  }
}

// What to charge by default for each type, from the project's billing.
export function suggestedAmount(type, billing) {
  if (!billing.quote) return ''
  if (type === 'Advance') return Math.round(billing.quoteTotal * ADVANCE_SHARE)
  if (type === 'Final') return Math.max(0, billing.remaining)
  return ''
}

export function suggestedDescription(type, billing) {
  if (!billing.quote) return ''
  const ref = `quotation ${billing.quote.id} (LKR ${billing.quoteTotal.toLocaleString('en-LK')})`
  if (type === 'Advance') return `Advance payment: ${ADVANCE_SHARE * 100}% of ${ref}`
  if (type === 'Final') return `Final payment: balance of ${ref}`
  return `Progress payment towards ${ref}`
}

export function validateInvoice(invoice, invoices, billing) {
  const errors = {}
  if (!INVOICE_ID.test(invoice.id) || invoices.some((i) => i.id === invoice.id)) errors.id = 'Invoice number is not valid.'
  if (!invoice.projectId) errors.projectId = 'Choose the project this invoice is for.'
  if (!invoice.description.trim()) errors.description = 'Say what the invoice is for.'
  if (!invoice.date) errors.date = 'Enter the invoice date.'
  if (!invoice.dueDate) errors.dueDate = 'Enter the due date.'
  else if (invoice.date && invoice.dueDate < invoice.date) errors.dueDate = 'Must be on or after the invoice date.'

  const amount = Number(invoice.amount)
  if (invoice.amount === '' || !(amount > 0)) errors.amount = 'Enter an amount above 0.'
  else if (billing.quote && amount > billing.remaining) {
    errors.amount = `Only LKR ${Math.max(0, billing.remaining).toLocaleString('en-LK')} of the quote is left to invoice.`
  }
  return errors
}

export function validatePayment(payment, invoice) {
  const errors = {}
  const amount = Number(payment.amount)
  const balance = invoiceBalance(invoice)
  if (payment.amount === '' || !(amount > 0)) errors.amount = 'Enter the amount received.'
  else if (amount > balance) errors.amount = `Only LKR ${balance.toLocaleString('en-LK')} is owed on this invoice.`
  if (!payment.date) errors.date = 'Enter the date it was received.'
  else if (payment.date < invoice.date) errors.date = 'Can’t be before the invoice date.'
  if ((payment.method === 'Bank transfer' || payment.method === 'Cheque') && !payment.reference.trim()) {
    errors.reference = payment.method === 'Cheque' ? 'Enter the cheque number and bank.' : 'Enter the transfer reference.'
  }
  if (!payment.receivedBy.trim()) errors.receivedBy = 'Enter who took the payment.'
  return errors
}
