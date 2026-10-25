import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { formatDate } from '../utils/format.js'
import { ALL_BRANCHES } from '../modules.js'
import { STAFF_ROLES, initials } from './staffFields.js'

function matches(person, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [person.id, person.name, person.role, person.branch, person.phone, person.email].some((t) => t.toLowerCase().includes(q))
}

// Read-only. Nobody adds or edits people here; an admin does that in
// User settings.
export default function StaffList({ query, branch, onOpen }) {
  const data = useData()
  const [role, setRole] = useState('All')

  // Someone working at "All branches" shows under either branch.
  const inBranch =
    branch === ALL_BRANCHES ? data.staff : data.staff.filter((p) => p.branch === branch || p.branch === ALL_BRANCHES)
  const found = inBranch.filter((p) => matches(p, query))
  const rows = role === 'All' ? found : found.filter((p) => p.role === role)
  const countFor = (r) => (r === 'All' ? found.length : found.filter((p) => p.role === r).length)

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
            {STAFF_ROLES.map((r) => (
              <div key={r.role} className="role-card">
                <div className="cell-main">{r.role}</div>
                <p>{r.about}</p>
                <div className="cell-sub">System access: {r.access}</div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <div className="tabs">
              {['All', ...STAFF_ROLES.map((r) => r.role)].map((r) => (
                <button key={r} type="button" className={`tab${role === r ? ' is-active' : ''}`} onClick={() => setRole(r)}>
                  {r}
                  <span className="tab-count">{countFor(r)}</span>
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
                  <th>Phone</th>
                  <th>Email</th>
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
                    <td>{p.role}</td>
                    <td>{p.branch}</td>
                    <td>{p.phone}</td>
                    <td>{p.email || <span className="muted">—</span>}</td>
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
