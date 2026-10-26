import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { hashPassword, passwordProblem } from '../auth/password.js'
import { STAFF_STATUSES, STAFF_BRANCHES, validateStaff, cleanStaff, roleOf } from '../staff/staffFields.js'

// The admin's form for registering a staff member and their sign-in, or
// changing one. Only people registered here appear anywhere in the system.
export default function StaffForm({ initial, isNew, onCancel, onSave }) {
  const data = useData()
  const auth = useAuth()
  const [form, setForm] = useState(initial)
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  const role = roleOf(data.roles, form)
  const isTheAdmin = !!roleOf(data.roles, initial)?.locked && !isNew
  const errors = validateStaff(form, { staff: data.staff, roles: data.roles, isNew, password })
  if (password && passwordProblem(password)) errors.password = passwordProblem(password)
  if (isTheAdmin && form.status !== 'Active') errors.status = 'The admin account can’t be turned off.'
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  // The admin role belongs to one account; it isn't offered for anyone else.
  const roleChoices = data.roles.filter((r) => !r.locked || isTheAdmin)

  async function submit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length) return
    setSaving(true)
    const clean = cleanStaff(form, data.roles)
    const passwordHash = role?.canLogin && password ? await hashPassword(clean.username, password) : clean.passwordHash
    setSaving(false)
    onSave({ ...clean, passwordHash })
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Staff accounts
      </button>
      <PageHeader title={isNew ? 'Register a staff member' : `Edit ${initial.name}`} subtitle={form.id}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" form="staff-form" className="btn btn-primary" disabled={saving}>
          {isNew ? 'Register' : 'Save changes'}
        </button>
      </PageHeader>

      {submitted && Object.keys(errors).length > 0 && (
        <div className="form-alert">Some details need fixing before this can be saved.</div>
      )}

      <form id="staff-form" className="form" onSubmit={submit} noValidate>
        <section className="form-section">
          <h2>Person</h2>
          <div className="form-grid">
            <Field label="Staff ID" hint="Filled in for you.">
              <input value={form.id} readOnly />
            </Field>
            <Field label="Full name" error={errorFor('name')}>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Nimali Jayasinghe" aria-invalid={!!errorFor('name')} />
            </Field>
            <Field label="Phone" error={errorFor('phone')}>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="077 123 4567" aria-invalid={!!errorFor('phone')} />
            </Field>
            <Field label="Email (optional)" error={errorFor('email')}>
              <input type="email" value={form.email} onChange={set('email')} aria-invalid={!!errorFor('email')} />
            </Field>
            <Field label="Joined on" error={errorFor('joinedOn')}>
              <input type="date" value={form.joinedOn} onChange={set('joinedOn')} aria-invalid={!!errorFor('joinedOn')} />
            </Field>
            <Field label="Notes (optional)" wide>
              <input value={form.notes} onChange={set('notes')} />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Role and branch</h2>
          <div className="form-grid">
            <Field label="Role" error={errorFor('roleId')} hint={role?.about}>
              <select value={form.roleId} onChange={set('roleId')} disabled={isTheAdmin} aria-invalid={!!errorFor('roleId')}>
                {roleChoices.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Branch" error={errorFor('branch')} hint="People at one branch only see that branch, unless their role sees both.">
              <select value={form.branch} onChange={set('branch')}>
                {STAFF_BRANCHES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Status" error={errorFor('status')} hint="Inactive people can’t sign in, and aren’t offered for new work.">
              <select value={form.status} onChange={set('status')} disabled={isTheAdmin}>
                {STAFF_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Sign-in</h2>
          {role?.canLogin ? (
            <div className="form-grid">
              <Field label="Username" error={errorFor('username')} hint="What they type to sign in.">
                <input
                  value={form.username}
                  onChange={set('username')}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={!!errorFor('username')}
                />
              </Field>
              <Field
                label={form.passwordHash ? 'New password (leave empty to keep the current one)' : 'Password'}
                error={errorFor('password')}
                hint="At least 8 characters, with letters and a number. Tell them in person."
              >
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" aria-invalid={!!errorFor('password')} />
              </Field>
            </div>
          ) : (
            <p className="form-help">
              The {role?.label ?? 'chosen'} role has no sign-in, so this person doesn’t get an account. They can still be
              put on project teams.
            </p>
          )}
          {isTheAdmin && auth.user?.id === form.id && (
            <p className="form-help form-help-after">This is your own account. You can also change your password from the menu at the top right.</p>
          )}
        </section>
      </form>
    </>
  )
}
