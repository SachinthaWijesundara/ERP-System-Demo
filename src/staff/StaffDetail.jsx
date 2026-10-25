import { ArrowLeft, Phone, Mail, MapPin, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { CardEmpty } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { workForStaff } from '../data/links.js'
import { formatDate, formatMoney } from '../utils/format.js'
import { saleTotals } from '../pos/posFields.js'
import { currentStageLabel } from '../projects/projectFields.js'
import { roleInfo, initials } from './staffFields.js'

function WorkRow({ label, count, children }) {
  return (
    <li className="work-row">
      <div className="work-row-head">
        <span>{label}</span>
        <span className="cell-main">{count}</span>
      </div>
      {count > 0 && children && <div className="cell-sub">{children}</div>}
    </li>
  )
}

// One person's profile: contact, role, and what they've worked on across
// the system. View-only; changes are made by an admin in User settings.
export default function StaffDetail({ staffId, onBack }) {
  const data = useData()
  const person = data.staff.find((p) => p.id === staffId)
  if (!person) return null

  const info = roleInfo(person.role)
  const work = workForStaff(data, person)
  const salesTotal = work.sales.reduce((sum, s) => sum + saleTotals(s).total, 0)
  const paymentsTotal = work.payments.reduce((sum, p) => sum + p.amount, 0)
  const nothing = Object.values(work).every((list) => list.length === 0)

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Staff
      </button>

      <div className="profile-head">
        <span className="person-mark person-mark-large">{initials(person.name)}</span>
        <PageHeader title={person.name} subtitle={`${person.id} · ${person.role} · ${person.branch}`}>
          <Badge>{person.status}</Badge>
        </PageHeader>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <Card title="Work in the system">
            {nothing ? (
              <CardEmpty>Nothing recorded under this name yet.</CardEmpty>
            ) : (
              <ul className="work-list">
                <WorkRow label="Projects as designer" count={work.designing.length}>
                  {work.designing.map((p) => `${p.id} ${p.name} (${currentStageLabel(p)})`).join(' · ')}
                </WorkRow>
                <WorkRow label="Projects on the installation team" count={work.installing.length}>
                  {work.installing.map((p) => `${p.id} ${p.name}`).join(' · ')}
                </WorkRow>
                <WorkRow label="Counter sales" count={work.sales.length}>
                  {formatMoney(salesTotal)} in total
                </WorkRow>
                <WorkRow label="Payments received" count={work.payments.length}>
                  {formatMoney(paymentsTotal)} across {new Set(work.payments.map((p) => p.invoiceId)).size} invoices
                </WorkRow>
                <WorkRow label="Days closed (cash-ups)" count={work.cashUps.length} />
                <WorkRow label="Stock movements recorded" count={work.movements.length} />
              </ul>
            )}
            <p className="cell-sub work-note">
              Matched by name for now. Once every module stores staff IDs, this will link exactly.
            </p>
          </Card>
          {person.notes && (
            <Card title="Notes">
              <p className="notes">{person.notes}</p>
            </Card>
          )}
        </div>

        <aside className="detail-side">
          <Card title="Contact">
            <ul className="contact-list">
              <li>
                <Phone size={15} strokeWidth={1.75} />
                {person.phone}
              </li>
              <li>
                <Mail size={15} strokeWidth={1.75} />
                {person.email || <span className="muted">No email</span>}
              </li>
              <li>
                <MapPin size={15} strokeWidth={1.75} />
                {person.branch === 'All branches' ? 'Works at both branches' : `${person.branch} branch`}
              </li>
            </ul>
          </Card>

          <Card title="Role">
            <dl className="facts">
              <dt>Role</dt>
              <dd>{person.role}</dd>
              <dt>System access</dt>
              <dd>{info?.access ?? '—'}</dd>
              <dt>Joined</dt>
              <dd>{formatDate(person.joinedOn)}</dd>
              <dt>Status</dt>
              <dd>{person.status}</dd>
            </dl>
            {info && <p className="card-intro role-about">{info.about}</p>}
          </Card>

          <div className="admin-note admin-note-small">
            <ShieldCheck size={15} strokeWidth={1.75} />
            <span>Only an admin can change these details, in User settings.</span>
          </div>
        </aside>
      </div>
    </>
  )
}
