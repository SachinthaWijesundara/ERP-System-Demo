import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import PageHeader from './components/PageHeader.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clients from './pages/Clients.jsx'
import Quotations from './pages/Quotations.jsx'
import Projects from './pages/Projects.jsx'
import Pos from './pages/Pos.jsx'
import Inventory from './pages/Inventory.jsx'
import Invoices from './pages/Invoices.jsx'
import Staff from './pages/Staff.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { MODULE_VIEW_KEY } from './auth/permissions.js'
import { modules } from './modules.js'

// Whether the signed-in person can open a module. User settings is the
// admin's alone; everything else follows their role's menu permissions.
export function canOpenModule(auth, id) {
  if (id === 'settings') return auth.isAdmin
  return auth.can(MODULE_VIEW_KEY[id])
}

export default function App() {
  const auth = useAuth()
  if (!auth.user) return <Login />
  // Keyed by person, so signing in as someone else starts everything afresh.
  return <Workspace key={auth.user.id} />
}

function Workspace() {
  const auth = useAuth()
  const open = modules.filter((m) => canOpenModule(auth, m.id))
  const [active, setActive] = useState(open[0]?.id ?? 'dashboard')
  const [query, setQuery] = useState('')
  // People who only work at one branch are kept to it.
  const [branch, setBranch] = useState(auth.allowedBranches[0])
  // Bumped on every sidebar click so the page starts fresh, even when
  // clicking the module that is already open.
  const [visit, setVisit] = useState(0)
  // A record to open straight away when a page loads, e.g. a quote clicked
  // on a client's page: { module: 'quotations', id: 'QT-0012' }. It can carry
  // a filter instead, e.g. Inventory showing only the items on one quote, or
  // Projects opening a new project from a quote ({ fromQuote: 'QT-0016' }).
  const [target, setTarget] = useState(null)
  // A short message, e.g. when a link leads somewhere this role can't go.
  const [notice, setNotice] = useState('')
  const current = modules.find((m) => m.id === active)
  const allowed = canOpenModule(auth, active)

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 3500)
    return () => clearTimeout(t)
  }, [notice])

  function openModule(id) {
    setActive(id)
    setQuery('')
    setTarget(null)
    setVisit((v) => v + 1)
  }

  // Jumps to another module and opens one of its records, or its list with
  // a filter applied (pass id as null and a filter). Links to a module this
  // role can't open do nothing but say so.
  function openRecord(module, id, filter) {
    if (!canOpenModule(auth, module)) {
      setNotice(`Your role doesn’t have access to ${modules.find((m) => m.id === module)?.label ?? module}.`)
      return
    }
    setActive(module)
    setQuery('')
    setTarget({ module, id, filter })
    setVisit((v) => v + 1)
    window.scrollTo(0, 0)
  }

  const here = target?.module === active ? target : null
  const openId = here?.id ?? undefined
  const openFilter = here?.filter

  // Pages that have their own search. Typing anywhere else searches the first
  // of these the person can open.
  const searchable = {
    clients: 'Search clients, IDs, projects',
    quotations: 'Search quotes, titles, clients',
    projects: 'Search projects, clients, designers',
    pos: 'Search sales, items, customers',
    inventory: 'Search SKUs, items, categories',
    invoices: 'Search invoices, receipts, clients',
    staff: 'Search staff, roles, phone numbers',
  }
  const searchHome = Object.keys(searchable).find((id) => canOpenModule(auth, id))

  function search(text) {
    setQuery(text)
    if (!searchable[active] && searchHome) setActive(searchHome)
  }

  const props = { query, branch, openId, openFilter, onOpenRecord: openRecord }
  let page
  if (!allowed)
    page = (
      <>
        <PageHeader title={current.label} />
        <div className="no-access">
          <Lock size={20} strokeWidth={1.5} />
          <p>Your role doesn’t have access to this section.</p>
        </div>
      </>
    )
  else if (active === 'dashboard') page = <Dashboard branch={branch} onOpenRecord={openRecord} />
  else if (active === 'clients') page = <Clients {...props} />
  else if (active === 'quotations') page = <Quotations {...props} />
  else if (active === 'projects') page = <Projects {...props} />
  else if (active === 'pos') page = <Pos {...props} />
  else if (active === 'inventory') page = <Inventory {...props} />
  else if (active === 'invoices') page = <Invoices {...props} />
  else if (active === 'staff') page = <Staff {...props} />
  else if (active === 'settings') page = <Settings openId={openId} onOpenRecord={openRecord} />

  return (
    <div className="app">
      <Sidebar
        active={active}
        onSelect={openModule}
        branch={branch}
        branches={auth.allowedBranches}
        onBranchChange={setBranch}
        canOpen={(id) => canOpenModule(auth, id)}
      />
      <div className="main">
        <Topbar
          title={current.label}
          query={query}
          onSearch={search}
          showSearch={!!searchHome}
          placeholder={searchable[active] ?? searchable[searchHome]}
          onOpenRecord={openRecord}
        />
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
        <main className="content" key={`${active}-${visit}`}>
          {page}
        </main>
      </div>
    </div>
  )
}
