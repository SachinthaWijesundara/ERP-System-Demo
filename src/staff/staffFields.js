import { isValidPhone, formatPhone } from '../clients/clientFields.js'
import { branches, ALL_BRANCHES } from '../modules.js'

// Job roles at the studio, with what each person does. `access` is the
// permission role they'll get once logins and permissions are set up.
export const STAFF_ROLES = [
  { role: 'Admin / owner', access: 'Admin', about: 'Runs the business. Sees money, profit and staff settings.' },
  { role: 'Manager', access: 'Admin', about: 'Runs a branch day to day and approves discounts.' },
  { role: 'Sales officer', access: 'Front desk', about: 'Talks to customers, makes quotes, runs the counter, takes payments.' },
  { role: 'Designer', access: 'Designer', about: 'Visits sites, measures, designs and moves projects forward.' },
  { role: 'Storekeeper', access: 'Storekeeper', about: 'Receives stock, keeps counts right, prepares materials for jobs.' },
  { role: 'Installer', access: 'None', about: 'Fits the work on site. Usually no login.' },
]

export const STAFF_STATUSES = ['Active', 'Inactive']

// Where someone works: one branch, or both (owners and managers often do).
export const STAFF_BRANCHES = [...branches, ALL_BRANCHES]

const STAFF_ID = /^ST-\d{4}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function roleInfo(role) {
  return STAFF_ROLES.find((r) => r.role === role)
}

export function nextStaffId(staff) {
  const highest = staff.reduce((max, p) => Math.max(max, Number(p.id.slice(3)) || 0), 0)
  return `ST-${String(highest + 1).padStart(4, '0')}`
}

// A blank person for the admin's form in User settings.
export function emptyStaff(id, today) {
  return {
    id,
    name: '',
    role: 'Sales officer',
    branch: branches[0],
    phone: '',
    email: '',
    joinedOn: today,
    status: 'Active',
    notes: '',
  }
}

// For the admin's add/edit form in User settings.
export function validateStaff(person, staff, isNew) {
  const errors = {}
  if (!STAFF_ID.test(person.id)) errors.id = 'Use the format ST-0000.'
  else if (isNew && staff.some((p) => p.id === person.id)) errors.id = `${person.id} is already used.`
  if (person.name.trim().length < 2) errors.name = 'Enter the person’s name.'
  if (!roleInfo(person.role)) errors.role = 'Choose a role.'
  if (!STAFF_BRANCHES.includes(person.branch)) errors.branch = 'Choose a branch.'
  if (!person.phone.trim()) errors.phone = 'Enter a phone number.'
  else if (!isValidPhone(person.phone)) errors.phone = 'Enter a 10-digit Sri Lankan number.'
  if (person.email.trim() && !EMAIL.test(person.email.trim())) errors.email = 'Enter a valid email address.'
  if (!person.joinedOn) errors.joinedOn = 'Enter the date they joined.'
  return errors
}

export function cleanStaff(person) {
  return {
    ...person,
    name: person.name.trim(),
    phone: formatPhone(person.phone.trim()),
    email: person.email.trim().toLowerCase(),
    notes: person.notes.trim(),
  }
}

// Initials for the avatar square, e.g. "Nimali Jayasinghe" -> "NJ".
export function initials(name) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(mr|mrs|ms|dr)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
