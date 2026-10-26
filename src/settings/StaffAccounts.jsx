import { useState } from 'react'
import { UserPlus, Pencil } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import Link from '../components/RecordLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { formatDate, todayIso } from '../utils/format.js'
import { roleOf, emptyStaff, nextStaffId, initials } from '../staff/staffFields.js'
import StaffForm from './StaffForm.jsx'

// Registering staff and their sign-ins. This is the only place people are
// added to the system.
export default function StaffAccounts({ openId, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const [editing, setEditing] = useState(openId ?? null)
  const [saved, setSaved] = useState('')

  if (editing) {
    const isNew = editing === 'new'
    return (
      <StaffForm
        initial={isNew ? emptyStaff(nextStaffId(data.staff), todayIso()) : data.staff.find((p) => p.id === editing)}
        isNew={isNew}
        onCancel={() => setEditing(null)}
        onSave={(person) => {
          if (isNew) data.addStaff(person)
          else data.updateStaff(person)
          setSaved(`${person.name} ${isNew ? 'registered' : 'saved'}.`)
          setEditing(null)
        }}
      />
    )
  }

  return (
    <>
      <div className="settings-toolbar">
        <p className="cell-sub">
          {data.staff.length} people · {data.staff.filter((p) => p.username && p.status === 'Active').length} can sign in
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          <UserPlus size={15} strokeWidth={1.75} />
          Register staff
        </button>
      </div>
      {saved && <div className="success-banner">{saved}</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Username</th>
              <th>Joined</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.staff.map((p) => {
              const role = roleOf(data.roles, p)
              return (
                <tr key={p.id} onClick={() => setEditing(p.id)} className={p.status === 'Inactive' ? 'is-cancelled' : ''}>
                  <td>
                    <div className="person">
                      <span className="person-mark">{initials(p.name)}</span>
                      <div>
                        <div className="cell-main">
                          {p.name} {p.id === auth.user.id && <span className="you-tag">You</span>}
                        </div>
                        <div className="cell-sub">
                          <Link
                            onClick={(e) => {
                              e?.stopPropagation?.()
                              onOpenRecord('staff', p.id)
                            }}
                          >
                            {p.id}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{role?.label ?? '—'}</td>
                  <td>{p.branch}</td>
                  <td>{p.username ? `@${p.username}` : <span className="muted">No sign-in</span>}</td>
                  <td>{formatDate(p.joinedOn)}</td>
                  <td>
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="num">
                    <span className="icon-button icon-button-quiet" aria-hidden="true">
                      <Pencil size={14} strokeWidth={1.75} />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Click a person to change their details, role, branch or password, or to turn their account off. Designers,
        installers and anyone else named on a project, sale or stock record must be registered here first.
      </p>
    </>
  )
}
