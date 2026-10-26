import { ChevronsUpDown } from 'lucide-react'
import { sections } from '../modules.js'

function NavItem({ item, active, onSelect }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      className={`nav-item${active ? ' is-active' : ''}`}
      onClick={() => onSelect(item.id)}
      title={item.label}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{item.label}</span>
    </button>
  )
}

// A module the person's role can't open isn't shown at all (the menu level of
// access). A section with nothing left in it disappears too.
function NavSection({ section, active, onSelect, canOpen }) {
  const items = section.items.filter((item) => canOpen(item.id))
  if (!items.length) return null
  return (
    <div className={`nav-section${section.pinned ? ' is-pinned' : ''}`}>
      <div className="nav-label">{section.label}</div>
      {items.map((item) => (
        <NavItem key={item.id} item={item} active={active === item.id} onSelect={onSelect} />
      ))}
    </div>
  )
}

// `branches` are the ones this person may switch between; someone kept to one
// branch sees it fixed instead of a menu.
export default function Sidebar({ active, onSelect, branch, branches, onBranchChange, canOpen }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">IH</div>
        <div className="brand-text">
          <strong>Immense Home</strong>
          <span>Interior studio</span>
        </div>
      </div>

      {branches.length > 1 ? (
        <label className="branch">
          <span className="branch-label">Branch</span>
          <select value={branch} onChange={(e) => onBranchChange(e.target.value)}>
            {branches.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <ChevronsUpDown size={14} strokeWidth={1.75} />
        </label>
      ) : (
        <div className="branch branch-fixed" title="Your role sees only your own branch">
          <span className="branch-label">Branch</span>
          <strong>{branch}</strong>
        </div>
      )}

      <nav className="nav">
        {sections.map((section) => (
          <NavSection key={section.label} section={section} active={active} onSelect={onSelect} canOpen={canOpen} />
        ))}
      </nav>
    </aside>
  )
}
