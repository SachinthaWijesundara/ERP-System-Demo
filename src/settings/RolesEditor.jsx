import { useState } from 'react'
import { Lock, Plus, RotateCcw, Trash2 } from 'lucide-react'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import { PERMISSION_GROUPS, DEFAULT_ROLES, roleAllows, moduleSummary } from '../auth/permissions.js'

const KIND_LABEL = { menu: 'Menu', action: 'Action', data: 'Data', limit: 'Limit' }

const OVERVIEW_MODULES = [
  ['dashboard', 'Dashboard'],
  ['clients', 'Clients'],
  ['quotations', 'Quotations'],
  ['projects', 'Projects'],
  ['pos', 'POS'],
  ['inventory', 'Inventory'],
  ['invoices', 'Invoices, payments'],
  ['staff', 'Staff'],
  ['settings', 'User settings'],
]

// "Who sees what": one word per module per role, worked out from the
// switches below so it always matches them.
function Overview({ roles, staffCount }) {
  return (
    <div className="table-wrap overview-table">
      <table className="table table-static">
        <thead>
          <tr>
            <th>Module</th>
            {roles.map((r) => (
              <th key={r.id}>
                {r.label}
                <div className="cell-sub">{staffCount(r.id)} staff</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OVERVIEW_MODULES.map(([id, label]) => (
            <tr key={id}>
              <td className="cell-main">{label}</td>
              {roles.map((r) => {
                const word = id === 'settings' ? (r.locked ? 'Full' : '—') : moduleSummary(r, id)
                return (
                  <td key={r.id} className={`access-word access-${word === 'Full' ? 'full' : word === '—' ? 'none' : 'part'}`}>
                    {word}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Switch({ checked, disabled, onChange, label }) {
  return (
    <label className={`switch${disabled ? ' is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true" />
      <span className="switch-label">{label}</span>
    </label>
  )
}

// The admin's controls for one role. Every change applies straight away to
// everyone with that role.
function RoleCard({ role, onSave, onDelete, staffCount }) {
  const locked = !!role.locked
  const defaults = DEFAULT_ROLES.find((r) => r.id === role.id)
  const set = (key, value) => onSave({ ...role, permissions: { ...role.permissions, [key]: value } })

  return (
    <section className="role-editor">
      <header className="role-editor-head">
        <div className="role-editor-title">
          {locked ? (
            <h2>
              <Lock size={15} strokeWidth={1.75} /> {role.label}
            </h2>
          ) : (
            <input
              className="role-name-input"
              value={role.label}
              onChange={(e) => onSave({ ...role, label: e.target.value })}
              aria-label="Role name"
            />
          )}
          <p className="cell-sub">
            {locked
              ? 'The admin always has every permission and is the only one who can open User settings.'
              : role.about}
          </p>
        </div>
        {!locked && (
          <div className="role-editor-actions">
            <Switch
              checked={!!role.canLogin}
              onChange={(v) => onSave({ ...role, canLogin: v })}
              label="Can sign in"
            />
            {defaults && (
              <button
                type="button"
                className="btn btn-small"
                onClick={() => onSave({ ...defaults, label: role.label })}
                title="Go back to the suggested permissions for this role"
              >
                <RotateCcw size={14} strokeWidth={1.75} />
                Suggested defaults
              </button>
            )}
            {!defaults && (
              <button
                type="button"
                className="btn btn-small btn-danger-ghost"
                disabled={staffCount > 0}
                title={staffCount > 0 ? 'Move its staff to another role first' : 'Delete this role'}
                onClick={onDelete}
              >
                <Trash2 size={14} strokeWidth={1.75} />
                Delete role
              </button>
            )}
          </div>
        )}
      </header>

      {!locked && !role.canLogin && (
        <div className="stage-warning">People with this role can’t sign in, so these permissions don’t apply until sign-in is turned on.</div>
      )}

      <div className="permission-groups">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.module} className="permission-group">
            <h3>{group.label}</h3>
            <ul>
              {group.items.map((item) => {
                const value = roleAllows(role, item.key)
                return (
                  <li key={item.key} className={`permission-item kind-${item.kind}`}>
                    <span className="kind-tag">{KIND_LABEL[item.kind]}</span>
                    {item.kind === 'limit' ? (
                      <label className="limit-field">
                        <span>{item.label}</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="num"
                          value={value}
                          disabled={locked}
                          onChange={(e) => set(item.key, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        />
                      </label>
                    ) : (
                      <Switch checked={value === true} disabled={locked} onChange={(v) => set(item.key, v)} label={item.label} />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function RolesEditor() {
  const data = useData()
  const [selected, setSelected] = useState('sales')
  const [adding, setAdding] = useState(null)
  const staffCount = (roleId) => data.staff.filter((p) => p.roleId === roleId).length
  const role = data.roles.find((r) => r.id === selected) ?? data.roles[0]

  function addRole(e) {
    e.preventDefault()
    const label = adding.label.trim()
    if (!label) return
    const base = data.roles.find((r) => r.id === adding.copyOf)
    let id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'role'
    while (data.roles.some((r) => r.id === id)) id += '-2'
    data.saveRole({
      id,
      label,
      about: `Custom role, started from ${base.label}.`,
      canLogin: base.canLogin,
      permissions: base.locked ? Object.fromEntries(Object.keys(base.permissions).map((k) => [k, base.permissions[k]])) : { ...base.permissions },
    })
    setSelected(id)
    setAdding(null)
  }

  return (
    <>
      <h2 className="section-title section-title-first">Who sees what</h2>
      <p className="cell-sub section-lede">
        A summary of the switches below. Each role changes the whole system for the people who have it: which modules
        appear in their sidebar, which buttons they get, and which figures they see.
      </p>
      <Overview roles={data.roles} staffCount={staffCount} />

      <div className="role-tabs-row">
        <div className="tabs role-tabs">
          {data.roles.map((r) => (
            <button key={r.id} type="button" className={`tab${r.id === role.id ? ' is-active' : ''}`} onClick={() => setSelected(r.id)}>
              {r.locked && <Lock size={12} strokeWidth={2} />}
              {r.label}
              <span className="tab-count">{staffCount(r.id)}</span>
            </button>
          ))}
        </div>
        {!adding && (
          <button type="button" className="btn btn-small" onClick={() => setAdding({ label: '', copyOf: 'sales' })}>
            <Plus size={14} strokeWidth={1.75} />
            Add a role
          </button>
        )}
      </div>

      {adding && (
        <form className="add-role" onSubmit={addRole}>
          <Field label="New role name">
            <input value={adding.label} onChange={(e) => setAdding({ ...adding, label: e.target.value })} placeholder="e.g. Accountant" autoFocus />
          </Field>
          <Field label="Start from">
            <select value={adding.copyOf} onChange={(e) => setAdding({ ...adding, copyOf: e.target.value })}>
              {data.roles
                .filter((r) => !r.locked)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
            </select>
          </Field>
          <div className="add-role-actions">
            <button type="button" className="btn" onClick={() => setAdding(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add role
            </button>
          </div>
        </form>
      )}

      <RoleCard
        key={role.id}
        role={role}
        staffCount={staffCount(role.id)}
        onSave={data.saveRole}
        onDelete={() => {
          data.deleteRole(role.id)
          setSelected('sales')
        }}
      />
    </>
  )
}
