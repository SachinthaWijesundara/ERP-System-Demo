import { useEffect, useRef, useState } from 'react'
import { Bell, Receipt } from 'lucide-react'
import { useData } from '../data/DataContext.jsx'
import { formatDate } from '../utils/format.js'

// The bell in the top bar. Invoices created or changed automatically (quote
// approved, project handed over, POS sale) show up here; clicking one opens it.
export default function Notifications({ onOpenRecord }) {
  const data = useData()
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const unread = data.notifications.filter((n) => !n.read).length

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return
    const close = (e) => !box.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function toggle() {
    if (open) data.markNotificationsRead()
    setOpen(!open)
  }

  return (
    <div className="notify" ref={box}>
      <button type="button" className="icon-button" aria-label={`Notifications${unread ? `, ${unread} new` : ''}`} onClick={toggle}>
        <Bell size={16} strokeWidth={1.75} />
        {unread > 0 && <span className="notify-count">{unread}</span>}
      </button>
      {open && (
        <div className="notify-panel" role="dialog" aria-label="Notifications">
          <div className="notify-head">
            <strong>Notifications</strong>
            {data.notifications.length > 0 && (
              <button type="button" className="inline-link" onClick={data.markNotificationsRead}>
                Mark all read
              </button>
            )}
          </div>
          {data.notifications.length === 0 ? (
            <p className="notify-empty">Nothing new. Invoices made by quotes, projects and the POS will show here.</p>
          ) : (
            <ul className="notify-list">
              {data.notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notify-item${n.read ? '' : ' is-unread'}`}
                    onClick={() => {
                      data.markNotificationsRead()
                      setOpen(false)
                      onOpenRecord(n.module, n.recordId)
                    }}
                  >
                    <Receipt size={15} strokeWidth={1.75} />
                    <span>
                      <span className="notify-text">{n.text}</span>
                      <span className="cell-sub">
                        Invoices and payments · {formatDate(n.at.slice(0, 10))}, {n.at.slice(11)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
