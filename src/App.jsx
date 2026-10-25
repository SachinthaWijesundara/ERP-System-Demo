import { useState } from 'react'
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
import { modules, ALL_BRANCHES } from './modules.js'
import { todayLong } from './utils/format.js'

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [query, setQuery] = useState('')
  const [branch, setBranch] = useState(ALL_BRANCHES)
  // Bumped on every sidebar click so the page starts fresh, even when
  // clicking the module that is already open.
  const [visit, setVisit] = useState(0)
  // A record to open straight away when a page loads, e.g. a quote clicked
  // on a client's page: { module: 'quotations', id: 'QT-0012' }. It can carry
  // a filter instead, e.g. Inventory showing only the items on one quote.
  const [target, setTarget] = useState(null)
  const current = modules.find((m) => m.id === active)

  function openModule(id) {
    setActive(id)
    setQuery('')
    setTarget(null)
    setVisit((v) => v + 1)
  }

  // Jumps to another module and opens one of its records, or its list with
  // a filter applied (pass id as null and a filter).
  function openRecord(module, id, filter) {
    setActive(module)
    setQuery('')
    setTarget({ module, id, filter })
    setVisit((v) => v + 1)
    window.scrollTo(0, 0)
  }

  const here = target?.module === active ? target : null
  const openId = here?.id ?? undefined
  const openFilter = here?.filter

  // Pages that have their own search. Typing anywhere else searches clients.
  const searchable = {
    clients: 'Search clients, IDs, projects',
    quotations: 'Search quotes, titles, clients',
    projects: 'Search projects, clients, designers',
    pos: 'Search sales, items, customers',
    inventory: 'Search SKUs, items, categories',
    invoices: 'Search invoices, receipts, clients',
    staff: 'Search staff, roles, phone numbers',
  }

  function search(text) {
    setQuery(text)
    if (!searchable[active]) setActive('clients')
  }

  let page
  if (active === 'dashboard') page = <Dashboard />
  else if (active === 'clients')
    page = <Clients query={query} branch={branch} openId={openId} onOpenRecord={openRecord} />
  else if (active === 'quotations')
    page = <Quotations query={query} branch={branch} openId={openId} onOpenRecord={openRecord} />
  else if (active === 'projects') page = <Projects query={query} branch={branch} openId={openId} />
  else if (active === 'pos') page = <Pos query={query} branch={branch} />
  else if (active === 'inventory')
    page = <Inventory query={query} branch={branch} openId={openId} openFilter={openFilter} />
  else if (active === 'invoices') page = <Invoices query={query} branch={branch} openId={openId} />
  else if (active === 'staff') page = <Staff query={query} branch={branch} />
  else
    page = (
      <>
        <PageHeader title={current.label} subtitle={todayLong()} />
        <div className="canvas" />
      </>
    )

  return (
    <div className="app">
      <Sidebar active={active} onSelect={openModule} branch={branch} onBranchChange={setBranch} />
      <div className="main">
        <Topbar
          title={current.label}
          query={query}
          onSearch={search}
          placeholder={searchable[active] ?? searchable.clients}
        />
        <main className="content" key={`${active}-${visit}`}>
          {page}
        </main>
      </div>
    </div>
  )
}
