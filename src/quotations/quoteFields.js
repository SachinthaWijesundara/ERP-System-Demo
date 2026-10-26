// Draft: being prepared. Sent: given to the client. Approved / Rejected: the client's answer.
export const QUOTE_STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected']

export const UNITS = ['sqft', 'sqm', 'ft', 'm', 'piece', 'box', 'roll', 'litre', 'set', 'lot', 'day']

export const DEFAULT_TERMS = [
  '1. 50% advance on confirmation, balance on completion.',
  '2. Prices are valid until the date shown above.',
  '3. Work starts within 7 days of receiving the advance.',
  '4. Any extra work will be quoted separately.',
].join('\n')

const QUOTE_ID = /^QT-\d{4}$/

// `sku` links the line to an Inventory item; empty for custom-made items.
export const emptyItem = () => ({ sku: '', product: '', description: '', qty: 1, unit: 'sqft', price: 0, discount: 0 })
export const emptyLabour = () => ({ description: '', qty: 1, unit: 'lot', price: 0 })

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// `preparedById` is the registered staff member who made the quote: whoever
// was logged in when it was created.
export function emptyQuote(id, today, preparedById = '') {
  return {
    id,
    clientId: '',
    preparedById,
    title: '',
    date: today,
    validUntil: addDays(today, 30),
    site: null,
    status: 'Draft',
    items: [emptyItem()],
    labour: [],
    discount: { type: 'amount', value: 0 },
    taxRate: 0,
    notes: '',
    terms: DEFAULT_TERMS,
  }
}

export function nextQuoteId(quotations) {
  const highest = quotations.reduce((max, q) => Math.max(max, Number(q.id.slice(3)) || 0), 0)
  return `QT-${String(highest + 1).padStart(4, '0')}`
}

// --- Money -------------------------------------------------------------

const num = (v) => Number(v) || 0

// Qty x price, less the line's own discount %.
export function itemTotal(item) {
  return Math.round(num(item.qty) * num(item.price) * (1 - num(item.discount) / 100))
}

export function labourTotal(line) {
  return Math.round(num(line.qty) * num(line.price))
}

// Every figure shown at the bottom of a quote, worked out from its lines.
export function quoteTotals(quote) {
  const materials = quote.items.reduce((sum, i) => sum + itemTotal(i), 0)
  const lineDiscounts = quote.items.reduce((sum, i) => sum + Math.round(num(i.qty) * num(i.price)) - itemTotal(i), 0)
  const labour = quote.labour.reduce((sum, l) => sum + labourTotal(l), 0)
  const subtotal = materials + labour

  const discount =
    quote.discount.type === 'percent'
      ? Math.round((subtotal * num(quote.discount.value)) / 100)
      : Math.round(num(quote.discount.value))

  const afterDiscount = subtotal - discount
  const tax = Math.round((afterDiscount * num(quote.taxRate)) / 100)

  return { materials, lineDiscounts, labour, subtotal, discount, afterDiscount, tax, total: afterDiscount + tax }
}

// --- Validation --------------------------------------------------------

// Returns { fieldName: message }. Line errors use keys like 'items.0.qty'.
// `maxDiscount` is the largest discount (%) the person's role may give, on a
// line or on the whole quote.
export function validateQuote(quote, quotations, isNew, maxDiscount = 100) {
  const errors = {}
  const id = quote.id.trim()

  if (!QUOTE_ID.test(id)) errors.id = 'Use the format QT-0000, e.g. QT-0017.'
  else if (isNew && quotations.some((q) => q.id === id)) errors.id = `${id} is already used.`

  if (!quote.clientId) errors.clientId = 'Choose the client this quote is for.'
  else if (!quote.site) errors.site = 'Choose which of the client’s sites the work is at.'

  if (quote.title.trim().length < 3) errors.title = 'Give the job a short title, e.g. Kitchen cabinets.'

  if (!quote.date) errors.date = 'Enter the quote date.'
  if (!quote.validUntil) errors.validUntil = 'Enter how long the prices are valid.'
  else if (quote.date && quote.validUntil < quote.date) errors.validUntil = 'Must be on or after the quote date.'

  if (quote.items.length + quote.labour.length === 0) {
    errors.lines = 'Add at least one product or labour line.'
  }

  quote.items.forEach((item, i) => {
    if (!item.product.trim()) errors[`items.${i}.product`] = 'Enter the product.'
    if (!(num(item.qty) > 0)) errors[`items.${i}.qty`] = 'More than 0.'
    if (item.price === '' || num(item.price) < 0) errors[`items.${i}.price`] = '0 or more.'
    if (num(item.discount) < 0 || num(item.discount) > 100) errors[`items.${i}.discount`] = '0 to 100.'
    else if (num(item.discount) > maxDiscount) errors[`items.${i}.discount`] = `Up to ${maxDiscount}%.`
  })

  quote.labour.forEach((line, i) => {
    if (!line.description.trim()) errors[`labour.${i}.description`] = 'Describe the work.'
    if (!(num(line.qty) > 0)) errors[`labour.${i}.qty`] = 'More than 0.'
    if (line.price === '' || num(line.price) < 0) errors[`labour.${i}.price`] = '0 or more.'
  })

  const d = num(quote.discount.value)
  if (d < 0) errors.discount = 'Can’t be negative.'
  else if (quote.discount.type === 'percent' && d > 100) errors.discount = 'A percentage can’t be more than 100.'
  else if (quote.discount.type === 'amount' && d > quoteTotals({ ...quote, discount: { type: 'amount', value: 0 } }).subtotal) {
    errors.discount = 'Can’t be more than the subtotal.'
  }

  if (!errors.discount && maxDiscount < 100) {
    const t = quoteTotals(quote)
    if (t.subtotal > 0 && (t.discount / t.subtotal) * 100 > maxDiscount + 1e-9) {
      errors.discount = `Your role can give up to ${maxDiscount}% off (${Math.floor((t.subtotal * maxDiscount) / 100).toLocaleString('en-LK')} LKR here).`
    }
  }

  if (num(quote.taxRate) < 0 || num(quote.taxRate) > 100) errors.taxRate = '0 to 100.'

  return errors
}

// Turns form text into numbers and trims text before saving.
export function cleanQuote(quote) {
  return {
    ...quote,
    id: quote.id.trim(),
    title: quote.title.trim(),
    items: quote.items.map((i) => ({
      sku: i.sku ?? '',
      product: i.product.trim(),
      description: i.description.trim(),
      qty: num(i.qty),
      unit: i.unit,
      price: num(i.price),
      discount: num(i.discount),
    })),
    labour: quote.labour.map((l) => ({
      description: l.description.trim(),
      qty: num(l.qty),
      unit: l.unit,
      price: num(l.price),
    })),
    discount: { type: quote.discount.type, value: num(quote.discount.value) },
    taxRate: num(quote.taxRate),
    notes: quote.notes.trim(),
    terms: quote.terms.trim(),
  }
}
