import { branches } from '../modules.js'

export const INVENTORY_UNITS = ['sqft', 'sqm', 'm', 'ft', 'box', 'roll', 'litre', 'piece', 'set']

// In: stock arrives (goods received, returns). Out: stock leaves (sold,
// issued to a project, used). Adjustment: a correction after a count, damage.
export const MOVEMENT_TYPES = ['In', 'Out', 'Adjustment']

// Storekeepers at each branch, until there's a Staff module and logins.
export const DEMO_STOREKEEPERS = {
  Matara: 'Pradeep Wijeratne',
  Nugegoda: 'Roshan Jayalath',
}

const SKU = /^[A-Z0-9]+(-[A-Z0-9]+)+$/

// --- Stock -------------------------------------------------------------

export function reservedAt(item, branch) {
  return item.reservations.filter((r) => r.branch === branch).reduce((sum, r) => sum + r.qty, 0)
}

// On hand: physically in the store. Reserved: set aside for projects.
// Available: what's left for anyone else, including POS.
export function stockAt(item, branch) {
  const onHand = item.stock[branch] ?? 0
  const reserved = reservedAt(item, branch)
  return { onHand, reserved, available: onHand - reserved }
}

// Adds up every branch, or returns one branch's figures.
export function stockFor(item, branch) {
  if (branches.includes(branch)) return stockAt(item, branch)
  return branches.reduce(
    (sum, b) => {
      const s = stockAt(item, b)
      return { onHand: sum.onHand + s.onHand, reserved: sum.reserved + s.reserved, available: sum.available + s.available }
    },
    { onHand: 0, reserved: 0, available: 0 },
  )
}

// 'Out of stock' when nothing is available, 'Low stock' at or below the
// alert level, otherwise 'In stock'. Judged on available, not on hand,
// because reserved stock can't be sold.
export function stockStatus(item, branch) {
  const { available } = stockAt(item, branch)
  if (available <= 0) return 'Out of stock'
  if (available <= item.lowStockLevel) return 'Low stock'
  return 'In stock'
}

// The worst status across the branches being looked at, with where it is.
export function worstStatus(item, branch) {
  const list = branches.includes(branch) ? [branch] : branches
  const order = ['Out of stock', 'Low stock', 'In stock']
  const found = list.map((b) => ({ status: stockStatus(item, b), branch: b }))
  found.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  return found[0]
}

export function margin(item) {
  if (!item.sellingPrice) return 0
  return Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100)
}

// THE RESERVATION RULE. Can `qty` leave the store at `branch` without
// touching stock reserved for projects? Used for POS sales and for "Out"
// movements. Returns { ok, available, reserved, message }.
export function canTakeOut(item, branch, qty) {
  const { onHand, reserved, available } = stockAt(item, branch)
  const wanted = Number(qty) || 0
  if (wanted <= available) return { ok: true, available, reserved, onHand, message: `Yes. ${available} ${item.unit} available.` }
  const message =
    reserved > 0
      ? `No. Only ${Math.max(0, available)} ${item.unit} available; ${reserved} more are reserved for projects and can’t be sold.`
      : `No. Only ${Math.max(0, available)} ${item.unit} in stock at ${branch}.`
  return { ok: false, available, reserved, onHand, message }
}

// --- Movements ---------------------------------------------------------

export function nextMovementId(movements) {
  const highest = movements.reduce((max, m) => Math.max(max, Number(m.id.slice(3)) || 0), 0)
  return `MV-${String(highest + 1).padStart(4, '0')}`
}

// How a movement changes the on-hand figure.
export function movementDelta(movement) {
  if (movement.type === 'In') return Math.abs(movement.qty)
  if (movement.type === 'Out') return -Math.abs(movement.qty)
  return movement.qty
}

export function validateMovement(movement, item) {
  const errors = {}
  const qty = Number(movement.qty)
  if (!movement.branch) errors.branch = 'Choose the branch.'
  if (movement.qty === '' || Number.isNaN(qty) || qty === 0) {
    errors.qty = movement.type === 'Adjustment' ? 'Enter a change, e.g. -2 or 5.' : 'Enter a quantity.'
  } else if (movement.type !== 'Adjustment' && qty < 0) {
    errors.qty = 'Enter a positive number.'
  } else if (movement.type === 'Out') {
    const check = canTakeOut(item, movement.branch, qty)
    if (!check.ok) errors.qty = check.message
  } else if (movement.type === 'Adjustment') {
    const { onHand, reserved } = stockAt(item, movement.branch)
    if (onHand + qty < 0) errors.qty = `That would leave less than zero. On hand is ${onHand}.`
    else if (onHand + qty < reserved) errors.qty = `That would leave less than the ${reserved} reserved for projects.`
  }
  if (!movement.reference.trim()) errors.reference = 'Say what it was, e.g. GRN-1043 or Stock count.'
  if (!movement.by.trim()) errors.by = 'Enter who did it.'
  return errors
}

// --- Items -------------------------------------------------------------

export function emptyItem() {
  return {
    sku: '',
    name: '',
    category: '',
    unit: 'piece',
    description: '',
    costPrice: '',
    sellingPrice: '',
    lowStockLevel: 10,
    stock: Object.fromEntries(branches.map((b) => [b, 0])),
    reservations: [],
  }
}

export function validateItem(item, inventory, isNew) {
  const errors = {}
  const sku = item.sku.trim().toUpperCase()
  if (!SKU.test(sku)) errors.sku = 'Capital letters and numbers in parts joined by dashes, e.g. VNL-OAK-01.'
  else if (isNew && inventory.some((i) => i.sku === sku)) errors.sku = `${sku} is already used.`
  if (item.name.trim().length < 2) errors.name = 'Enter the item’s name.'
  if (!item.category.trim()) errors.category = 'Choose or type a category.'
  if (item.costPrice === '' || Number(item.costPrice) < 0) errors.costPrice = 'Enter what the studio pays.'
  if (item.sellingPrice === '' || Number(item.sellingPrice) < 0) errors.sellingPrice = 'Enter the selling price.'
  else if (Number(item.sellingPrice) < Number(item.costPrice)) errors.sellingPrice = 'Selling price is below the cost price.'
  if (item.lowStockLevel === '' || Number(item.lowStockLevel) < 0) errors.lowStockLevel = '0 or more.'
  if (isNew) {
    branches.forEach((b) => {
      if (Number(item.stock[b]) < 0) errors[`stock.${b}`] = '0 or more.'
    })
  }
  return errors
}

export function cleanItem(item) {
  return {
    ...item,
    sku: item.sku.trim().toUpperCase(),
    name: item.name.trim(),
    category: item.category.trim(),
    description: item.description.trim(),
    costPrice: Number(item.costPrice),
    sellingPrice: Number(item.sellingPrice),
    lowStockLevel: Number(item.lowStockLevel),
    stock: Object.fromEntries(Object.entries(item.stock).map(([b, q]) => [b, Number(q) || 0])),
  }
}
