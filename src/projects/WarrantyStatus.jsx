import { ShieldCheck, ShieldOff } from 'lucide-react'
import Badge from '../components/Badge.jsx'
import { formatDate, todayIso } from '../utils/format.js'
import { warrantyInfo } from './projectFields.js'

// Short form for tables: "Active until 19 Mar 2028" or "Expired 28 Dec 2025".
export function WarrantyCell({ project }) {
  const w = warrantyInfo(project, todayIso())
  if (!w) return <span className="muted">—</span>
  if (!w.expires) return <span className="muted">No warranty</span>
  return (
    <>
      <Badge>{w.active ? 'Warranty active' : 'Warranty expired'}</Badge>
      <div className="cell-sub">
        {w.active ? 'until' : 'ended'} {formatDate(w.expires)}
      </div>
    </>
  )
}

// The banner on a completed project's page.
export default function WarrantyStatus({ project }) {
  const w = warrantyInfo(project, todayIso())
  if (!w) return null
  const Icon = w.active ? ShieldCheck : ShieldOff
  return (
    <section className={`warranty-banner${w.active ? ' is-active' : ''}`}>
      <Icon size={18} strokeWidth={1.75} />
      <div>
        <strong>
          {!w.expires ? 'No warranty given' : w.active ? 'Warranty active' : 'Warranty expired'}
        </strong>
        {w.expires && (
          <div>
            {w.months} months from handover on {formatDate(w.start)}, {w.active ? 'ends' : 'ended'} on{' '}
            <strong>{formatDate(w.expires)}</strong>
            {w.active && ` · ${w.daysLeft} days left`}
          </div>
        )}
      </div>
    </section>
  )
}
