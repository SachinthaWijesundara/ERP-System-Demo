import { isValidPhone, formatPhone } from '../clients/clientFields.js'

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer']

// Cash kept in the drawer at the start of each day, for giving change.
export const OPENING_FLOAT = 5000

// Front-desk staff at each branch. Typed in until there's a Staff module
// and logins; then the cashier will simply be whoever is logged in.
export const DEMO_CASHIERS = {
  Matara: 'Ishara Madushani',
  Nugegoda: 'Kavindu Silva',
}

const SALE_ID = /^SL-\d{4}$/

export function nextSaleId(sales) {
  const highest = sales.reduce((max, s) => Math.max(max, Number(s.id.slice(3)) || 0), 0)
  return `SL-${String(highest + 1).padStart(4, '0')}`
}

export function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// --- Money -------------------------------------------------------------

const num = (v) => Number(v) || 0

export function lineTotal(item) {
  return Math.round(num(item.qty) * num(item.price) * (1 - num(item.discount) / 100))
}

export function saleTotals(sale) {
  const gross = sale.items.reduce((sum, i) => sum + Math.round(num(i.qty) * num(i.price)), 0)
  const total = sale.items.reduce((sum, i) => sum + lineTotal(i), 0)
  const tendered = sale.payment.method === 'Cash' ? num(sale.payment.tendered) : 0
  return {
    gross,
    discount: gross - total,
    total,
    itemCount: sale.items.reduce((sum, i) => sum + num(i.qty), 0),
    change: sale.payment.method === 'Cash' ? Math.max(0, tendered - total) : 0,
  }
}

// --- Validation --------------------------------------------------------

// Checks a sale before it's completed. `closedDay` is true when that branch
// has already done its cash-up for the sale's date.
export function validateSale(sale, sales, closedDay) {
  const errors = {}
  if (!SALE_ID.test(sale.id) || sales.some((s) => s.id === sale.id)) errors.id = 'Sale number is not valid.'
  if (!sale.branch) errors.branch = 'Choose the branch.'
  else if (closedDay) errors.branch = `${sale.branch} has already closed the day. New sales go on tomorrow’s cash-up.`
  if (!sale.cashier.trim()) errors.cashier = 'Enter the cashier’s name.'

  if (sale.items.length === 0) errors.items = 'Add at least one item.'
  sale.items.forEach((item, i) => {
    if (!item.name.trim()) errors[`items.${i}.name`] = 'Enter the item.'
    if (!(num(item.qty) > 0)) errors[`items.${i}.qty`] = 'More than 0.'
    if (item.price === '' || num(item.price) < 0) errors[`items.${i}.price`] = '0 or more.'
    if (num(item.discount) < 0 || num(item.discount) > 100) errors[`items.${i}.discount`] = '0 to 100.'
  })

  if (sale.customer?.phone && !isValidPhone(sale.customer.phone)) {
    errors.customerPhone = 'Enter a 10-digit number, or leave it empty.'
  }

  const { total } = saleTotals(sale)
  if (sale.payment.method === 'Cash' && num(sale.payment.tendered) < total) {
    errors.tendered = 'Cash received is less than the total.'
  }
  return errors
}

// Tidies a valid sale before saving.
export function cleanSale(sale) {
  const name = sale.customer?.name.trim() ?? ''
  const phone = sale.customer?.phone.trim() ?? ''
  return {
    ...sale,
    cashier: sale.cashier.trim(),
    customer: name || phone ? { name, phone: phone ? formatPhone(phone) : '' } : null,
    items: sale.items.map((i) => ({
      sku: i.sku ?? '',
      name: i.name.trim(),
      qty: num(i.qty),
      unit: i.unit,
      price: num(i.price),
      discount: num(i.discount),
    })),
    payment: {
      method: sale.payment.method,
      tendered: sale.payment.method === 'Cash' ? num(sale.payment.tendered) : 0,
      reference: sale.payment.method === 'Cash' ? '' : sale.payment.reference.trim(),
    },
  }
}

// --- End-of-day cash-up --------------------------------------------------

export function salesForDay(sales, branch, date) {
  return sales.filter((s) => s.branch === branch && s.date === date)
}

// Totals for one branch's day. Expected cash is the opening float plus cash
// sales; the cashier counts the drawer and the difference shows any gap.
export function cashUpSummary(sales, branch, date, openingFloat, counted) {
  const day = salesForDay(sales, branch, date)
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0]))
  day.forEach((s) => {
    byMethod[s.payment.method] += saleTotals(s).total
  })
  const expected = num(openingFloat) + byMethod.Cash
  return {
    count: day.length,
    byMethod,
    total: Object.values(byMethod).reduce((a, b) => a + b, 0),
    expected,
    difference: counted === '' || counted === undefined ? null : num(counted) - expected,
  }
}

export function findCashUp(cashUps, branch, date) {
  return cashUps.find((c) => c.branch === branch && c.date === date)
}
