import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Topbar from './components/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { modules } from './modules.js'

const today = new Date().toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export default function App() {
  const [active, setActive] = useState('dashboard')
  const current = modules.find((m) => m.id === active)

  return (
    <div className="app">
      <Sidebar active={active} onSelect={setActive} />
      <div className="main">
        <Topbar title={current.label} />
        <main className="content">
          <div className="page-header">
            <h1>{current.label}</h1>
            <p>{today}</p>
          </div>
          {active === 'dashboard' ? <Dashboard /> : <div className="canvas" />}
        </main>
      </div>
    </div>
  )
}
