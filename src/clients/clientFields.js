import { branches } from '../modules.js'

export const LEAD_SOURCES =['Walk-in', 'Facebook', 'Instagram', 'Referral', 'Website', 'Phone call', 'Other']

// Lead: enquiring, no job yet. Active: has work going on. Past: work finished.
export const STATUSES = ['Lead', 'Active', 'Past']

export const SITE_LABELS = ['Home', 'Apartment', 'Villa', 'Office', 'Shop', 'Other']

const CLIENT_ID = /^CL-\d{4}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// A blank client for the New client form. It starts in the branch the
// switcher is set to, or the first branch when showing all of them.
export function emptyClient(id, branch) {
  return {
    id,
    name: '',
    branch: branches.includes(branch) ? branch : branches[0],
    phone: '',
    email: '',
    sites: [{ label: 'Home', address: '', city: '' }],
    leadSource: 'Walk-in',
    status: 'Lead',
    followUp: '',
    notes: '',
  }
}

// Next free ID after the highest one in use, e.g. CL-0023 -> CL-0024.
export function nextClientId(clients) {
  const highest = clients.reduce((max, c) => Math.max(max, Number(c.id.slice(3)) || 0), 0)
  return `CL-${String(highest + 1).padStart(4, '0')}`
}

// Accepts Sri Lankan mobile and landline numbers in any common spelling
// (0771234567, 077 123 4567, +94 77 123 4567) and returns 10 digits, or null.
function phoneDigits(value) {
  let digits = value.replace(/[\s\-()]/g, '')
  if (digits.startsWith('+94')) digits = '0' + digits.slice(3)
  else if (digits.startsWith('94') && digits.length === 11) digits = '0' + digits.slice(2)
  return /^0\d{9}$/.test(digits) ? digits : null
}

export function isValidPhone(value) {
  return phoneDigits(value) !== null
}

// '0771234567' -> '077 123 4567'
export function formatPhone(value) {
  const digits = phoneDigits(value)
  return digits ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : value
}

// Returns { fieldName: message } for every problem. Site address errors use
// keys like 'sites.0.city'. An empty object means the client is valid.
export function validateClient(client, clients, isNew) {
  const errors = {}
  const id = client.id.trim()

  if (!CLIENT_ID.test(id)) {
    errors.id = 'Use the format CL-0000, e.g. CL-0024.'
  } else if (isNew && clients.some((c) => c.id === id)) {
    errors.id = `${id} is already used by another client.`
  }

  if (client.name.trim().length < 2) {
    errors.name = 'Enter the client’s name.'
  }

  if (!branches.includes(client.branch)) {
    errors.branch = 'Choose the branch that handles this client.'
  }

  if (!client.phone.trim()) {
    errors.phone = 'Enter a phone number.'
  } else if (!phoneDigits(client.phone)) {
    errors.phone = 'Enter a 10-digit Sri Lankan number, e.g. 077 123 4567.'
  }

  if (client.email.trim() && !EMAIL.test(client.email.trim())) {
    errors.email = 'Enter a valid email address, e.g. name@gmail.com.'
  }

  client.sites.forEach((site, i) => {
    if (!site.address.trim()) errors[`sites.${i}.address`] = 'Enter the street address.'
    if (!site.city.trim()) errors[`sites.${i}.city`] = 'Enter the town or city.'
  })

  return errors
}

// Tidies a valid form before saving: trims text and writes the phone one way.
export function cleanClient(client) {
  return {
    ...client,
    id: client.id.trim(),
    name: client.name.trim(),
    phone: formatPhone(client.phone.trim()),
    email: client.email.trim().toLowerCase(),
    sites: client.sites.map((s) => ({
      label: s.label,
      address: s.address.trim(),
      city: s.city.trim(),
    })),
    notes: client.notes.trim(),
  }
}
