import { ArrowLeft, Phone, Mail, MapPin, ShieldCheck, Pencil } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card, { CardEmpty } from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Link from '../components/RecordLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { canSeeProject, canSeeQuote } from '../auth/visibility.js'
import { workForStaff } from '../data/links.js'
import { formatDate, formatMoney } from '../utils/format.js'
import { saleTotals } from '../pos/posFields.js'
import { currentStageLabel } from '../projects/projectFields.js'
import { roleOf, initials } from './staffFields.js'

function WorkRow({ label, count, children }) {
  return (
    <li className="work-row">
      <div className="work-row-head">
        <span>{label}</span>
        <span className="cell-main">{count}</span>
      </div>
      {count > 0 && children && <div className="cell-sub work-links">{children}</div>}
    </li>
  )
}

// A list of links, separated by dots, for one row of work.
function Links({ items }) {
  return items.map((item, i) => (
    <span key={item.key}>
      {i > 0 && ' · '}
      {item.onClick ? <Link onClick={item.onClick}>{item.label}</Link> : item.label}
    </span>
  ))
}

// One person's profile: contact, role, and what they've worked on across
// the system. Every record stores staff IDs, so this lists exactly what this
// person did, and each item opens where the viewer's role allows.
// View-only; changes are made by the admin in User settings.
export default function StaffDetail({ staffId, onBack, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const person = data.staff.find((p) => p.id === staffId)
  if (!person) return null

  const role = roleOf(data.roles, person)
  const me = auth.user?.id === person.id
  const showContact = me || auth.can('staff.contact')
  const work = workForStaff(data, person)
  const liveSales = work.sales.filter((s) => !s.voided)
  const salesTotal = liveSales.reduce((sum, s) => sum + saleTotals(s).total, 0)
  const paymentsTotal = work.payments.reduce((sum, p) => sum + p.amount, 0)
  const nothing = Object.values(work).every((list) => list.length === 0)
  const open = (module, id) => () => onOpenRecord(module, id)
  const projectItem = (p, label) => ({ key: p.id, label, onClick: canSeeProject(auth, p) ? open('projects', p.id) : null })
  const canMoney = auth.can('invoices.view')
  const canPos = auth.can('pos.view')

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Staff
      </button>

      <div className="profile-head">
        <span className="person-mark person-mark-large">{initials(person.name)}</span>
        <PageHeader title={person.name} subtitle={`${person.id} · ${role?.label ?? 'No role'} · ${person.branch}`}>
          <Badge>{person.status}</Badge>
          {auth.isAdmin && (
            <button type="button" className="btn" onClick={open('settings', person.id)}>
              <Pencil size={14} strokeWidth={1.75} />
              Edit in User settings
            </button>
          )}
        </PageHeader>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <Card title="Work in the system">
            {nothing ? (
              <CardEmpty>Nothing recorded for {person.name} yet.</CardEmpty>
            ) : (
              <ul className="work-list">
                <WorkRow label="Projects as designer" count={work.designing.length}>
                  <Links items={work.designing.map((p) => projectItem(p, `${p.id} ${p.name} (${currentStageLabel(p)})`))} />
                </WorkRow>
                <WorkRow label="Projects on the installation team" count={work.installing.length}>
                  <Links items={work.installing.map((p) => projectItem(p, `${p.id} ${p.name}`))} />
                </WorkRow>
                <WorkRow label="Quotations prepared" count={work.quotes.length}>
                  <Links
                    items={work.quotes.map((q) => ({
                      key: q.id,
                      label: `${q.id} ${q.title}`,
                      onClick: canSeeQuote(data, auth, q) ? open('quotations', q.id) : null,
                    }))}
                  />
                </WorkRow>
                <WorkRow label="Project notes written" count={work.notes.length}>
                  <Links
                    items={[...new Set(work.notes.map((n) => n.projectId))].map((id) => {
                      const p = data.projects.find((x) => x.id === id)
                      return projectItem(p, `${id} (${work.notes.filter((n) => n.projectId === id).length})`)
                    })}
                  />
                </WorkRow>
                <WorkRow label="Counter sales" count={liveSales.length}>
                  {canPos ? (
                    <>
                      {formatMoney(salesTotal)} in total · latest{' '}
                      <Links
                        items={liveSales.slice(0, 5).map((s) => ({ key: s.id, label: s.id, onClick: open('pos', s.id) }))}
                      />
                    </>
                  ) : (
                    `${formatMoney(salesTotal)} in total`
                  )}
                </WorkRow>
                <WorkRow label="Payments received" count={work.payments.length}>
                  {formatMoney(paymentsTotal)} across {new Set(work.payments.map((p) => p.invoiceId)).size} invoices
                  {canMoney && (
                    <>
                      {' '}
                      · latest{' '}
                      <Links
                        items={[...new Set(work.payments.map((p) => p.invoiceId))].slice(0, 5).map((id) => ({
                          key: id,
                          label: id,
                          onClick: open('invoices', id),
                        }))}
                      />
                    </>
                  )}
                </WorkRow>
                <WorkRow label="Days closed (cash-ups)" count={work.cashUps.length}>
                  {work.cashUps
                    .slice(0, 5)
                    .map((c) => `${c.branch} ${formatDate(c.date)}`)
                    .join(' · ')}
                </WorkRow>
                <WorkRow label="Stock movements recorded" count={work.movements.length}>
                  {auth.can('inventory.view') ? (
                    <Links
                      items={[...new Set(work.movements.map((m) => m.sku))].slice(0, 8).map((sku) => ({
                        key: sku,
                        label: data.inventory.find((i) => i.sku === sku)?.name ?? sku,
                        onClick: open('inventory', sku),
                      }))}
                    />
                  ) : null}
                </WorkRow>
              </ul>
            )}
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
              {showContact && (
                <>
                  <li>
                    <Phone size={15} strokeWidth={1.75} />
                    {person.phone}
                  </li>
                  <li>
                    <Mail size={15} strokeWidth={1.75} />
                    {person.email || <span className="muted">No email</span>}
                  </li>
                </>
              )}
              <li>
                <MapPin size={15} strokeWidth={1.75} />
                {person.branch === 'All branches' ? 'Works at both branches' : `${person.branch} branch`}
              </li>
            </ul>
            {!showContact && <p className="cell-sub hidden-note">Phone and email are hidden for your role.</p>}
          </Card>

          <Card title="Role">
            <dl className="facts">
              <dt>Role</dt>
              <dd>{role?.label ?? '—'}</dd>
              <dt>Signs in</dt>
              <dd>{role?.canLogin && person.username ? `Yes, as ${person.username}` : 'No'}</dd>
              <dt>Joined</dt>
              <dd>{formatDate(person.joinedOn)}</dd>
              <dt>Status</dt>
              <dd>{person.status}</dd>
            </dl>
            {role?.about && <p className="card-intro role-about">{role.about}</p>}
          </Card>

          <div className="admin-note admin-note-small">
            <ShieldCheck size={15} strokeWidth={1.75} />
            <span>Only the admin can change these details, in User settings.</span>
          </div>
        </aside>
      </div>
    </>
  )
}
