import { Search, Bell } from 'lucide-react'

export default function Topbar({ title }) {
  return (
    <header className="topbar">
      <h1>{title}</h1>

      <div className="topbar-actions">
        <label className="search">
          <Search size={16} strokeWidth={1.75} />
          <input type="search" placeholder="Search" />
        </label>
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.75} />
        </button>
        <div className="avatar" aria-hidden="true" />
      </div>
    </header>
  )
}
