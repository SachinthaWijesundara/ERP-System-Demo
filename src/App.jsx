import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import PageHeader from './components/PageHeader.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clients from './pages/Clients.jsx'
import { modules, ALL_BRANCHES } from './modules.js'
import { todayLong } from './utils/format.js'

export default function App() {
  const [active, setActive] = useState('dashboard')
  const [query, setQuery] = useState('')
  const [branch, setBranch] = useState(ALL_BRANCHES)
  // Bumped on every sidebar click so the page starts fresh, even when
  // clicking the module that is already open.
  const [visit, setVisit] = useState(0)
  const current = modules.find((m) => m.id === active)

  function openModule(id) {
    setActive(id)
    setQuery('')
    setVisit((v) => v + 1)
  }

  // The search bar searches clients for now, so typing opens the Clients page.
  function search(text) {
    setQuery(text)
    if (active !== 'clients') setActive('clients')
  }

  let page
  if (active === 'dashboard') page = <Dashboard />
  else if (active === 'clients') page = <Clients query={query} branch={branch} />
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
        <Topbar title={current.label} query={query} onSearch={search} />
        <main className="content" key={`${active}-${visit}`}>
          {page}
        </main>
      </div>
    </div>
  )
}
