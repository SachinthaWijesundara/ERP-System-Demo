import { useEffect, useRef } from 'react'
import { Search, Bell, ChevronRight } from 'lucide-react'

export default function Topbar({ title, query, onSearch }) {
  const searchRef = useRef(null)

  // Ctrl+K (Cmd+K on Mac) jumps to the search bar.
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
          <input
            ref={searchRef}
            type="search"
            placeholder="Search clients, IDs, projects"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
          />
          {!query && <kbd>Ctrl K</kbd>}
        </label>
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={16} strokeWidth={1.75} />
        </button>
        <div className="avatar" aria-hidden="true" />
      </div>
    </header>
  )
}
