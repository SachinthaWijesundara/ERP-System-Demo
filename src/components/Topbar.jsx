import { Search, Bell, ChevronRight } from 'lucide-react'

export default function Topbar({ title }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <span>Immense Home</span>
        <ChevronRight size={14} strokeWidth={1.75} />
        <span className="crumbs-current">{title}</span>
      </div>

      <div className="topbar-actions">
        <label className="search">
          <Search size={15} strokeWidth={1.75} />
          <input type="search" placeholder="Search" />
          <kbd>Ctrl K</kbd>
        </label>
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={16} strokeWidth={1.75} />
        </button>
        <div className="avatar" aria-hidden="true" />
      </div>
    </header>
  )
}
