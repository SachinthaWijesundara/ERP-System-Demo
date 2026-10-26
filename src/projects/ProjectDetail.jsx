import { useState } from 'react'
import { ArrowLeft, Pencil, MapPin, Phone, FileText, Package, Receipt, Users, Lock } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import Card from '../components/Card.jsx'
import Link from '../components/RecordLink.jsx'
import StaffLink from '../components/StaffLink.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { canSeeProject } from '../auth/visibility.js'
import {
  clientForProject,
  quoteForProject,
  invoicesForProject,
  amountPaid,
  invoiceStatus,
  projectMaterialsCost,
  projectExtrasCharged,
  materialInfo,
} from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { quoteTotals } from '../quotations/quoteFields.js'
import {
  STAGES,
  currentStage,
  currentStageLabel,
  isCompleted,
  progressOf,
  installationCost,
} from './projectFields.js'
import StageTracker from './StageTracker.jsx'
import StagePanel from './StagePanel.jsx'
import WarrantyStatus from './WarrantyStatus.jsx'
import { MaterialsCard, MeasurementsCard, PhotosCard, NotesCard } from './ProjectRecords.jsx'

function Fact({ label, children, tone }) {
  return (
    <div className="fact">
      <div className="fact-label">{label}</div>
      <div className={`fact-value ${tone ?? ''}`}>{children}</div>
    </div>
  )
}

// `onOpenRecord(module, id, filter)` jumps to the client, quote, invoice,
// inventory item or staff member. What shows follows the person's role:
// money only with "see quote total, invoices and balance", costs and profit
// only with "see material cost…", contact details and design files only when
// allowed, and stage details can only be changed by roles that move stages.
export default function ProjectDetail({ projectId, onBack, onEdit, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const project = data.projects.find((p) => p.id === projectId)
  const [selected, setSelected] = useState(() => (project ? (currentStage(project) ?? STAGES[STAGES.length - 1]).key : null))
  if (!project) return null
  if (!canSeeProject(auth, project)) {
    return (
      <>
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={15} strokeWidth={1.75} />
          Projects
        </button>
        <div className="no-access">
          <Lock size={20} strokeWidth={1.5} />
          <p>{project.id} isn’t one of your projects. Your role only shows the projects you’re assigned to.</p>
        </div>
      </>
    )
  }

  const can = auth.can
  const client = clientForProject(data, project)
  const quote = quoteForProject(data, project)
  const invoices = invoicesForProject(data, project.id)
  const save = (next, movements) => data.updateProject(next, movements)
  const openClient = () => onOpenRecord('clients', client.id)
  const openQuote = () => onOpenRecord('quotations', project.quoteId)

  const done = isCompleted(project)
  const late = !done && project.dueDate < todayIso()

  // Money: what the client pays (quote, extras, invoices) against what it costs.
  const quoteTotal = quote ? quoteTotals(quote).total : 0
  const extras = projectExtrasCharged(data, project)
  const issued = invoices.filter((i) => !i.draft)
  const invoiced = issued.reduce((s, i) => s + i.amount, 0)
  const paid = issued.reduce((s, i) => s + amountPaid(i), 0)
  const materialsCost = projectMaterialsCost(data, project)
  const profit = quoteTotal + extras - materialsCost - installationCost(project)
  const advance = issued.find((i) => i.type === 'Advance')
  const final = invoices.find((i) => i.type === 'Final')
  const advancePaid = advance ? (invoiceStatus(advance) === 'Paid' ? 'Yes' : 'Not yet') : 'Not invoiced'

  const people = [project.designerId, ...project.teamIds].filter(Boolean)
  const stockSkus = project.materials.filter((m) => m.sku).map((m) => m.sku)

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Projects
      </button>

      <PageHeader title={project.name} subtitle={`${project.id} · from quote ${project.quoteId}`}>
        <Badge>{currentStageLabel(project)}</Badge>
        {(can('projects.edit') || can('projects.team')) && (
          <button type="button" className="btn" onClick={onEdit}>
            <Pencil size={14} strokeWidth={1.75} />
            Edit project
          </button>
        )}
      </PageHeader>

      <section className="project-summary">
        <div className="facts-row">
          <Fact label="Progress">
            <ProgressBar value={progressOf(project)} />
          </Fact>
          <Fact label="Start">{formatDate(project.startDate)}</Fact>
          <Fact label="Due" tone={late ? 'is-overdue' : ''}>
            {formatDate(project.dueDate)}
            {late && ' · late'}
          </Fact>
          <Fact label="Designer">
            <StaffLink id={project.designerId} onOpenRecord={onOpenRecord} />
          </Fact>
          <Fact label="Installation team">
            {project.teamIds.length
              ? project.teamIds.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ', '}
                    <StaffLink id={id} onOpenRecord={onOpenRecord} />
                  </span>
                ))
              : '—'}
          </Fact>
        </div>
        <StageTracker project={project} selected={selected} onSelect={setSelected} />
      </section>

      <WarrantyStatus project={project} />

      <div className="detail-grid">
        <div className="detail-main">
          <StagePanel key={selected} project={project} stageKey={selected} client={client} onChange={save} onOpenRecord={onOpenRecord} />
          <MaterialsCard project={project} onChange={save} onOpenRecord={onOpenRecord} />
          <MeasurementsCard project={project} onChange={save} />
          {can('projects.designs') && <PhotosCard project={project} onChange={save} />}
          <NotesCard project={project} onChange={save} onOpenRecord={onOpenRecord} />
        </div>

        <aside className="detail-side">
          <Card title={can('projects.contact') ? 'Client and site' : 'Client'}>
            <div className="side-block">
              <div className="cell-main">{client ? <Link onClick={openClient}>{client.name}</Link> : 'Client not found'}</div>
              <div className="cell-sub">{client && `${client.id} · ${client.branch} · through quote ${project.quoteId}`}</div>
            </div>
            {client && can('projects.contact') && (
              <div className="side-line">
                <Phone size={14} strokeWidth={1.75} />
                {client.phone}
              </div>
            )}
            {project.site && can('projects.contact') && (
              <div className="side-line">
                <MapPin size={14} strokeWidth={1.75} />
                <span>
                  {project.site.label}: {project.site.address}, {project.site.city}
                </span>
              </div>
            )}
          </Card>

          {can('projects.billing') || can('projects.costs') ? (
            <Card title="Money">
              {can('projects.billing') && (
                <dl className="facts">
                  <dt>Quote total</dt>
                  <dd>{quote ? formatMoney(quoteTotal) : '—'}</dd>
                  <dt>Extras charged</dt>
                  <dd>{formatMoney(extras)}</dd>
                  <dt>Invoiced (issued)</dt>
                  <dd>{formatMoney(invoiced)}</dd>
                  <dt>Paid</dt>
                  <dd>{formatMoney(paid)}</dd>
                  <dt>Balance</dt>
                  <dd className={invoiced - paid > 0 ? 'is-owed' : ''}>{formatMoney(invoiced - paid)}</dd>
                  <dt>Advance paid</dt>
                  <dd>{advancePaid}</dd>
                  {final && (
                    <>
                      <dt>Final invoice</dt>
                      <dd>
                        <Link onClick={() => onOpenRecord('invoices', final.id)}>{formatMoney(final.amount)}</Link>
                        <div className="cell-sub">{final.draft ? 'Draft, issued at handover' : invoiceStatus(final)}</div>
                      </dd>
                    </>
                  )}
                </dl>
              )}
              {can('projects.costs') && (
                <dl className={`facts${can('projects.billing') ? ' facts-split' : ''}`}>
                  <dt>Materials cost</dt>
                  <dd>{formatMoney(materialsCost)}</dd>
                  <dt>Installation cost</dt>
                  <dd>{formatMoney(installationCost(project))}</dd>
                  <dt className="cell-main">Profit</dt>
                  <dd className="cell-main">
                    {quote ? formatMoney(profit) : '—'}
                    {quote && quoteTotal > 0 && <span className="cell-sub"> ({Math.round((profit / quoteTotal) * 100)}%)</span>}
                  </dd>
                </dl>
              )}
            </Card>
          ) : (
            <Card title="Payment">
              <dl className="facts">
                <dt>Advance paid</dt>
                <dd>{advancePaid}</dd>
              </dl>
              <p className="cell-sub hidden-note">Money figures are hidden for your role.</p>
            </Card>
          )}

          <Card title="Connections">
            <ul className="links-list">
              <li>
                <FileText size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Source quote</div>
                  {quote ? (
                    <div>
                      <Link onClick={openQuote}>
                        {quote.id} · {quote.title}
                      </Link>{' '}
                      <Badge>{quote.status}</Badge>
                    </div>
                  ) : (
                    <div className="cell-sub">{project.quoteId} not found</div>
                  )}
                </div>
              </li>
              {can('projects.billing') && (
                <li>
                  <Receipt size={15} strokeWidth={1.75} />
                  <div>
                    <div className="links-title">Invoices</div>
                    {invoices.length ? (
                      invoices.map((i) => (
                        <div key={i.id}>
                          <Link onClick={() => onOpenRecord('invoices', i.id)}>
                            {i.id} · {i.type} · {formatMoney(i.amount)}
                          </Link>{' '}
                          <Badge>{invoiceStatus(i)}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="cell-sub">None yet.</div>
                    )}
                  </div>
                </li>
              )}
              <li>
                <Package size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">
                    {stockSkus.length ? (
                      <Link
                        onClick={() => onOpenRecord('inventory', null, { skus: stockSkus, label: `${project.id} · ${project.name}` })}
                      >
                        Inventory · {stockSkus.length} {stockSkus.length === 1 ? 'item' : 'items'}
                      </Link>
                    ) : (
                      'Inventory'
                    )}
                  </div>
                  {project.materials.length ? (
                    project.materials.map((m, i) => {
                      const info = materialInfo(data, m)
                      return (
                        <div key={`${m.sku}-${i}`}>
                          {info.item ? <Link onClick={() => onOpenRecord('inventory', m.sku)}>{info.name}</Link> : `${info.name} (custom)`}{' '}
                          <span className="cell-sub">{m.status}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="cell-sub">No materials yet.</div>
                  )}
                </div>
              </li>
              <li>
                <Users size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Staff</div>
                  {people.length ? (
                    people.map((id, i) => (
                      <div key={id}>
                        <StaffLink id={id} onOpenRecord={onOpenRecord} />{' '}
                        <span className="cell-sub">{i === 0 && id === project.designerId ? 'Designer' : 'Installation team'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="cell-sub">No designer or team set.</div>
                  )}
                </div>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}
