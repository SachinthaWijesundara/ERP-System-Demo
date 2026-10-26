import { useState } from 'react'
import { ShieldCheck, Database } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import StaffAccounts from '../settings/StaffAccounts.jsx'
import RolesEditor from '../settings/RolesEditor.jsx'

const TABS = { staff: 'Staff accounts', roles: 'Roles and permissions', data: 'Demo data' }

function DemoData() {
  const data = useData()
  const auth = useAuth()
  const [confirm, setConfirm] = useState(false)
  return (
    <section className="card settings-card">
      <header className="card-head">
        <Database size={16} strokeWidth={1.75} />
        <h2>Demo data</h2>
      </header>
      <div className="card-body">
        <p>
          Everything you change in this demo is kept in this browser, so it’s still there after a refresh. Resetting
          goes back to the original sample data: staff accounts, roles and permissions, clients, quotations, projects,
          sales, stock and invoices. You’ll be signed out.
        </p>
        {confirm ? (
          <div className="cancel-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                data.resetDemoData()
                auth.logout()
              }}
            >
              Yes, reset everything
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Keep my changes
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-danger-ghost btn-ghost" onClick={() => setConfirm(true)}>
            Reset demo data
          </button>
        )}
      </div>
    </section>
  )
}

// User settings: the admin's own page. Nobody else can open it.
// `openId` opens that staff member's account straight away (from their
// Staff page).
export default function Settings({ openId, onOpenRecord }) {
  const auth = useAuth()
  const [tab, setTab] = useState('staff')
  if (!auth.isAdmin) return null

  return (
    <>
      <PageHeader title="User settings" subtitle="Staff accounts and what each role can see and do. Only the admin sees this page." />
      <div className="admin-note">
        <ShieldCheck size={16} strokeWidth={1.75} />
        <span>
          Changes here apply straight away. Anyone signed in with a changed role sees the new version as soon as they open
          another page.
        </span>
      </div>
      <div className="page-tabs" role="tablist">
        {Object.entries(TABS).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'staff' && <StaffAccounts openId={openId} onOpenRecord={onOpenRecord} />}
      {tab === 'roles' && <RolesEditor />}
      {tab === 'data' && <DemoData />}
    </>
  )
}
