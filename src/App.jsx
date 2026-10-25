import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { modules } from './modules.js'

export default function App() {
  const [active, setActive] = useState('dashboard')
  const current = modules.find((m) => m.id === active)

  return (
    <div className="app">
      <Sidebar active={active} onSelect={setActive} />
      <div className="main">
        <Topbar title={current.label} />
        <main className="content">
          {active === 'dashboard' ? <Dashboard /> : <div className="canvas" />}
        </main>
      </div>
    </div>
  )
}
