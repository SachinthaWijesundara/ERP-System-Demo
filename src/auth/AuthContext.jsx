import { createContext, useContext, useEffect, useState } from 'react'
import { useData } from '../data/DataContext.jsx'
import { roleAllows } from './permissions.js'
import { hashPassword } from './password.js'
import { roleOf } from '../staff/staffFields.js'
import { branches, ALL_BRANCHES } from '../modules.js'

// Who is signed in, and what their role lets them see and do. The session is
// kept in sessionStorage, so it lasts until the browser tab is closed.
const AuthContext = createContext(null)
const SESSION_KEY = 'immense-home-session'

export function AuthProvider({ children }) {
  const data = useData()
  const [userId, setUserId] = useState(() => sessionStorage.getItem(SESSION_KEY) ?? '')

  const user = data.staff.find((p) => p.id === userId && p.status === 'Active' && p.username)
  const role = roleOf(data.roles, user)
  const signedIn = !!(user && role?.canLogin)

  // Records the system makes on its own are put down to this person.
  useEffect(() => {
    data.setActor(signedIn ? user.id : '')
  })

  // A deactivated account, or one whose role lost its login, is signed out.
  useEffect(() => {
    if (userId && !signedIn) {
      sessionStorage.removeItem(SESSION_KEY)
      setUserId('')
    }
  }, [userId, signedIn])

  // `can('quotes.edit')` -> true/false. Limits come back as numbers.
  const can = (key) => (signedIn ? roleAllows(role, key) : false)

  const value = {
    user: signedIn ? user : null,
    role: signedIn ? role : null,
    isAdmin: signedIn && !!role.locked,
    can,
    limit: (key) => Number(can(key)) || 0,

    // The branches this person may look at: both, or only their own.
    allowedBranches: !signedIn
      ? []
      : can('branches.all') || user.branch === ALL_BRANCHES
        ? [ALL_BRANCHES, ...branches]
        : [user.branch],

    async login(username, password) {
      const name = username.trim().toLowerCase()
      const person = data.staff.find((p) => p.username === name)
      const personRole = roleOf(data.roles, person)
      const hash = await hashPassword(name, password)
      if (!person || person.passwordHash !== hash) return 'That username and password don’t match.'
      if (person.status !== 'Active') return 'This account has been turned off. Ask the admin.'
      if (!personRole?.canLogin) return 'This role can’t sign in. Ask the admin.'
      sessionStorage.setItem(SESSION_KEY, person.id)
      setUserId(person.id)
      return null
    },

    logout() {
      sessionStorage.removeItem(SESSION_KEY)
      setUserId('')
    },

    // Everyone can change their own password; only the admin manages others.
    async changeOwnPassword(current, next) {
      if (user.passwordHash !== (await hashPassword(user.username, current))) return 'Your current password isn’t right.'
      data.updateStaff({ ...user, passwordHash: await hashPassword(user.username, next) })
      return null
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
