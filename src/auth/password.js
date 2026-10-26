// Passwords are never kept as typed: each account stores a SHA-256 hash of
// "username:password". This is a front-end demo with no server, so it only
// keeps passwords out of plain sight in the data; a real system checks them
// on a server.
export async function hashPassword(username, password) {
  const bytes = new TextEncoder().encode(`${username.trim().toLowerCase()}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// At least 8 characters with a letter and a number.
export function passwordProblem(password) {
  if (password.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letters and at least one number.'
  return null
}
