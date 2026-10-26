import { isValidPhone, formatPhone } from '../clients/clientFields.js'
import { branches, ALL_BRANCHES } from '../modules.js'

// A staff record:
//   { id, name, roleId, branch, phone, email, joinedOn, status, notes,
//     username, passwordHash }
// `roleId` points at one of the roles in User settings (Admin, Sales / front
// desk, Designer…); the role decides what the person can see and do. People
// whose role has no login (installers) have no username or password.

export const STAFF_STATUSES = ['Active', 'Inactive']

// Where someone works: one branch, or both (owners and managers often do).
export const STAFF_BRANCHES = [...branches, ALL_BRANCHES]

const STAFF_ID = /^ST-\d{4}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME = /^[a-z][a-z0-9._-]{2,23}$/

export function roleOf(roles, person) {
  return roles.find((r) => r.id === person?.roleId)
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
    roleId: 'sales',
    branch: branches[0],
    phone: '',
    email: '',
    joinedOn: today,
    status: 'Active',
    notes: '',
    username: '',
    passwordHash: '',
  }
}

// For the admin's add/edit form. `password` is the new password typed in
// the form (empty when editing and not changing it).
export function validateStaff(person, { staff, roles, isNew, password }) {
  const errors = {}
  const role = roleOf(roles, person)
  if (!STAFF_ID.test(person.id)) errors.id = 'Use the format ST-0000.'
  else if (isNew && staff.some((p) => p.id === person.id)) errors.id = `${person.id} is already used.`
  if (person.name.trim().length < 2) errors.name = 'Enter the person’s name.'
  if (!role) errors.roleId = 'Choose a role.'
  else if (role.locked && staff.some((p) => p.id !== person.id && roleOf(roles, p)?.locked)) {
    errors.roleId = 'There is only one admin account.'
  }
  if (!STAFF_BRANCHES.includes(person.branch)) errors.branch = 'Choose a branch.'
  if (!person.phone.trim()) errors.phone = 'Enter a phone number.'
  else if (!isValidPhone(person.phone)) errors.phone = 'Enter a 10-digit Sri Lankan number.'
  if (person.email.trim() && !EMAIL.test(person.email.trim())) errors.email = 'Enter a valid email address.'
  if (!person.joinedOn) errors.joinedOn = 'Enter the date they joined.'

  // Everyone whose role logs in needs a unique username and a password.
  if (role?.canLogin) {
    const username = person.username.trim().toLowerCase()
    if (!USERNAME.test(username)) {
      errors.username = 'Lowercase letters and numbers, 3 to 24 long, starting with a letter.'
    } else if (staff.some((p) => p.id !== person.id && p.username === username)) {
      errors.username = `“${username}” is already used.`
    }
    if (!person.passwordHash && !password) errors.password = 'Set a password for their first sign-in.'
  }
  return errors
}

export function cleanStaff(person, roles) {
  const role = roleOf(roles, person)
  return {
    ...person,
    name: person.name.trim(),
    phone: formatPhone(person.phone.trim()),
    email: person.email.trim().toLowerCase(),
    notes: person.notes.trim(),
    // A role without a login keeps no account details.
    username: role?.canLogin ? person.username.trim().toLowerCase() : '',
    passwordHash: role?.canLogin ? person.passwordHash : '',
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
