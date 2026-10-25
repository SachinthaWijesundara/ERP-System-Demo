import { ChevronsUpDown } from 'lucide-react'
import { sections, branches } from '../modules.js'

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

function NavSection({ section, active, onSelect }) {
  return (
    <div className={`nav-section${section.pinned ? ' is-pinned' : ''}`}>
      <div className="nav-label">{section.label}</div>
      {section.items.map((item) => (
        <NavItem key={item.id} item={item} active={active === item.id} onSelect={onSelect} />
      ))}
    </div>
  )
}

export default function Sidebar({ active, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">IH</div>
        <div className="brand-text">
          <strong>Immense Home</strong>
          <span>Interior studio</span>
        </div>
      </div>

      <label className="branch">
        <span className="branch-label">Branch</span>
        <select defaultValue={branches[0]}>
          {branches.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <ChevronsUpDown size={14} strokeWidth={1.75} />
      </label>

      <nav className="nav">
        {sections.map((section) => (
          <NavSection key={section.label} section={section} active={active} onSelect={onSelect} />
        ))}
      </nav>
    </aside>
  )
}
