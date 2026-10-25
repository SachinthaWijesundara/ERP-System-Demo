import { useEffect, useRef } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import Notifications from './Notifications.jsx'

export default function Topbar({ title, query, onSearch, placeholder, onOpenRecord }) {
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
            placeholder={placeholder}
            value={query}
            onChange={(e) => onSearch(e.target.value)}
          />
          {!query && <kbd>Ctrl K</kbd>}
        </label>
        <Notifications onOpenRecord={onOpenRecord} />
        <div className="avatar" aria-hidden="true" />
      </div>
    </header>
  )
}
