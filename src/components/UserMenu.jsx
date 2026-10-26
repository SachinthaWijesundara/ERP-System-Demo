import { useEffect, useRef, useState } from 'react'
import { LogOut, KeyRound, UserRound, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { passwordProblem } from '../auth/password.js'
import { initials } from '../staff/staffFields.js'
import Field from './Field.jsx'

// Change your own password. Everyone can do this; resetting someone else's
// password is done by the admin in User settings.
function PasswordDialog({ onClose }) {
  const auth = useAuth()
  const [form, setForm] = useState({ current: '', next: '', again: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function save(e) {
    e.preventDefault()
    const problem = passwordProblem(form.next)
    if (problem) return setError(problem)
    if (form.next !== form.again) return setError('The new passwords don’t match.')
    const failed = await auth.changeOwnPassword(form.current, form.next)
    if (failed) return setError(failed)
    setDone(true)
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label="Change your password">
      <form className="dialog" onSubmit={save}>
        <header className="dialog-head">
          <h2>Change your password</h2>
          <button type="button" className="icon-button icon-button-quiet" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={1.75} />
          </button>
        </header>
        {done ? (
          <>
            <p className="diff-ok">Password changed. Use the new one next time you sign in.</p>
            <div className="dialog-foot">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <Field label="Current password">
              <input type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} autoFocus />
            </Field>
            <Field label="New password" hint="At least 8 characters, with letters and a number.">
              <input type="password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
            </Field>
            <Field label="New password again">
              <input type="password" value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} />
            </Field>
            {error && <div className="form-alert">{error}</div>}
            <div className="dialog-foot">
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Change password
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}

// The signed-in person, top right: their role and branch, their own staff
// page, their password, and signing out.
export default function UserMenu({ onOpenRecord }) {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [changing, setChanging] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => !box.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const { user, role } = auth

  return (
    <div className="user-menu" ref={box}>
      <button
        type="button"
        className="user-button"
        onClick={() => setOpen(!open)}
        aria-label={`Signed in as ${user.name}`}
        aria-expanded={open}
      >
        <span className="avatar">{initials(user.name)}</span>
        <span className="user-button-text">
          <span className="user-name">{user.name}</span>
          <span className="cell-sub">{role.label}</span>
        </span>
      </button>
      {open && (
        <div className="user-panel" role="menu">
          <div className="user-panel-head">
            <strong>{user.name}</strong>
            <span className="cell-sub">
              {role.label} · {user.branch} · @{user.username}
            </span>
          </div>
          {auth.can('staff.view') && (
            <button
              type="button"
              className="user-panel-item"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onOpenRecord('staff', user.id)
              }}
            >
              <UserRound size={15} strokeWidth={1.75} />
              My staff page
            </button>
          )}
          <button
            type="button"
            className="user-panel-item"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setChanging(true)
            }}
          >
            <KeyRound size={15} strokeWidth={1.75} />
            Change password
          </button>
          <button type="button" className="user-panel-item" role="menuitem" onClick={auth.logout}>
            <LogOut size={15} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      )}
      {changing && <PasswordDialog onClose={() => setChanging(false)} />}
    </div>
  )
}
