import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { formatDate } from '../utils/format.js'
import { ALL_BRANCHES } from '../modules.js'
import { roleOf, initials } from './staffFields.js'

function matches(person, roleLabel, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [person.id, person.name, roleLabel, person.branch, person.phone, person.email].some((t) => t.toLowerCase().includes(q))
}

// Read-only. Nobody adds or edits people here; an admin does that in
// User settings. Roles come from User settings too. Phone numbers and email
// need "see colleagues' phone numbers and email".
export default function StaffList({ query, branch, onOpen }) {
  const data = useData()
  const auth = useAuth()
  const showContact = auth.can('staff.contact')
  const [role, setRole] = useState('All')
  const label = (p) => roleOf(data.roles, p)?.label ?? 'No role'
  const roles = data.roles.filter((r) => data.staff.some((p) => p.roleId === r.id))

  // Someone working at "All branches" shows under either branch.
  const inBranch =
    branch === ALL_BRANCHES ? data.staff : data.staff.filter((p) => p.branch === branch || p.branch === ALL_BRANCHES)
  const found = inBranch.filter((p) => matches(p, label(p), query))
  const rows = role === 'All' ? found : found.filter((p) => p.roleId === role)
  const countFor = (r) => (r === 'All' ? found.length : found.filter((p) => p.roleId === r).length)

  return (
    <>
      <div className="admin-note">
        <ShieldCheck size={16} strokeWidth={1.75} />
        <span>People are added and changed only by an admin, in <strong>User settings</strong>. This list is view-only.</span>
      </div>

      {data.staff.length === 0 ? (
        <section className="staff-empty">
          <div className="staff-empty-head">
            <h2>No staff added yet</h2>
            <p>Once an admin adds people, they’ll be listed here with their role, branch and contact details.</p>
          </div>
          <div className="role-guide">
            {data.roles.map((r) => (
              <div key={r.id} className="role-card">
                <div className="cell-main">{r.label}</div>
                <p>{r.about}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <div className="tabs">
              {[{ id: 'All', label: 'All' }, ...roles].map((r) => (
                <button key={r.id} type="button" className={`tab${role === r.id ? ' is-active' : ''}`} onClick={() => setRole(r.id)}>
                  {r.label}
                  <span className="tab-count">{countFor(r.id)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Branch</th>
                  {showContact && <th>Phone</th>}
                  {showContact && <th>Email</th>}
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} onClick={() => onOpen(p.id)} className={p.status === 'Inactive' ? 'is-cancelled' : ''}>
                    <td>
                      <div className="person">
                        <span className="person-mark">{initials(p.name)}</span>
                        <div>
                          <div className="cell-main">{p.name}</div>
                          <div className="cell-sub">{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{label(p)}</td>
                    <td>{p.branch}</td>
                    {showContact && <td>{p.phone}</td>}
                    {showContact && <td>{p.email || <span className="muted">—</span>}</td>}
                    <td>{formatDate(p.joinedOn)}</td>
                    <td>
                      <Badge>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="empty">{query.trim() ? `No one matches “${query.trim()}”.` : 'No one in this group.'}</div>
            )}
          </div>
        </>
      )}
    </>
  )
}
