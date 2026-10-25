import { modules } from '../modules.js'

function NavItem({ item, active, onSelect }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      className={`nav-item${active ? ' is-active' : ''}`}
      onClick={() => onSelect(item.id)}
      title={item.label}
    >
      <Icon size={18} strokeWidth={1.75} />
      <span>{item.label}</span>
    </button>
  )
}

export default function Sidebar({ active, onSelect }) {
  const top = modules.filter((m) => m.group !== 'bottom')
  const bottom = modules.filter((m) => m.group === 'bottom')

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">IH</div>
        <div className="brand-text">
          <strong>Immense Home</strong>
          <span>Interior studio</span>
        </div>
      </div>

      <nav className="nav">
        {top.map((item) => (
          <NavItem key={item.id} item={item} active={active === item.id} onSelect={onSelect} />
        ))}
      </nav>

      <nav className="nav nav-bottom">
        {bottom.map((item) => (
          <NavItem key={item.id} item={item} active={active === item.id} onSelect={onSelect} />
        ))}
      </nav>
    </aside>
  )
}
