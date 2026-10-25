import { useState } from 'react'
import { ArrowLeft, Pencil, MapPin, Phone, FileText, Package, Receipt, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import Card from '../components/Card.jsx'
import Link from '../components/RecordLink.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { useData } from '../data/DataContext.jsx'
import {
  clientForProject,
  quoteForProject,
  invoicesForProject,
  amountPaid,
  invoiceStatus,
  projectMaterialsCost,
  itemForMaterial,
  staffByName,
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
import { MaterialsCard, MeasurementsCard, PhotosCard, NotesCard } from './ProjectRecords.jsx'

function Fact({ label, children, tone }) {
  return (
    <div className="fact">
      <div className="fact-label">{label}</div>
      <div className={`fact-value ${tone ?? ''}`}>{children}</div>
    </div>
  )
}

// A designer's or installer's name. It links to their Staff page when
// someone with that name is registered; otherwise it's plain text.
function PersonName({ name, onOpenRecord }) {
  const data = useData()
  const person = staffByName(data, name)
  if (!name) return '—'
  return person ? <Link onClick={() => onOpenRecord('staff', person.id)}>{name}</Link> : name
}

// `onOpenRecord(module, id, filter)` jumps to the client, quote, invoice,
// inventory item or staff member.
export default function ProjectDetail({ projectId, onBack, onEdit, onOpenRecord }) {
  const data = useData()
  const project = data.projects.find((p) => p.id === projectId)
  const [selected, setSelected] = useState(() => (project ? (currentStage(project) ?? STAGES[STAGES.length - 1]).key : null))
  if (!project) return null

  const client = clientForProject(data, project)
  const quote = quoteForProject(data, project)
  const invoices = invoicesForProject(data, project.id)
  const save = (next) => data.updateProject(next)
  const openClient = () => onOpenRecord('clients', project.clientId)
  const openQuote = () => onOpenRecord('quotations', project.quoteId)

  const done = isCompleted(project)
  const late = !done && project.dueDate < todayIso()

  // Money: what the client pays (quote, invoices) against what it costs.
  const quoteTotal = quote ? quoteTotals(quote).total : 0
  const invoiced = invoices.reduce((s, i) => s + i.amount, 0)
  const paid = invoices.reduce((s, i) => s + amountPaid(i), 0)
  const materialsCost = projectMaterialsCost(data, project)
  const profit = quoteTotal - materialsCost - installationCost(project)
  const advance = invoices.find((i) => i.type === 'Advance')

  const registeredStaff = [project.designer, ...project.team].filter((n) => staffByName(data, n))

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Projects
      </button>

      <PageHeader title={project.name} subtitle={`${project.id} · from quote ${project.quoteId}`}>
        <Badge>{currentStageLabel(project)}</Badge>
        <button type="button" className="btn" onClick={onEdit}>
          <Pencil size={14} strokeWidth={1.75} />
          Edit project
        </button>
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
            <PersonName name={project.designer} onOpenRecord={onOpenRecord} />
          </Fact>
          <Fact label="Installation team">
            {project.team.length
              ? project.team.map((name, i) => (
                  <span key={name}>
                    {i > 0 && ', '}
                    <PersonName name={name} onOpenRecord={onOpenRecord} />
                  </span>
                ))
              : '—'}
          </Fact>
        </div>
        <StageTracker project={project} selected={selected} onSelect={setSelected} />
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <StagePanel key={selected} project={project} stageKey={selected} client={client} onChange={save} />
          <MaterialsCard project={project} onChange={save} onOpenRecord={onOpenRecord} />
          <MeasurementsCard project={project} onChange={save} />
          <PhotosCard project={project} onChange={save} />
          <NotesCard project={project} onChange={save} />
        </div>

        <aside className="detail-side">
          <Card title="Client and site">
            <div className="side-block">
              <div className="cell-main">{client ? <Link onClick={openClient}>{client.name}</Link> : project.clientId}</div>
              <div className="cell-sub">
                {project.clientId}
                {client && ` · ${client.branch}`}
              </div>
            </div>
            {client && (
              <div className="side-line">
                <Phone size={14} strokeWidth={1.75} />
                {client.phone}
              </div>
            )}
            {project.site && (
              <div className="side-line">
                <MapPin size={14} strokeWidth={1.75} />
                <span>
                  {project.site.label}: {project.site.address}, {project.site.city}
                </span>
              </div>
            )}
          </Card>

          <Card title="Money">
            <dl className="facts">
              <dt>Quote total</dt>
              <dd>{quote ? formatMoney(quoteTotal) : '—'}</dd>
              <dt>Invoiced</dt>
              <dd>{formatMoney(invoiced)}</dd>
              <dt>Paid</dt>
              <dd>{formatMoney(paid)}</dd>
              <dt>Balance</dt>
              <dd className={invoiced - paid > 0 ? 'is-owed' : ''}>{formatMoney(invoiced - paid)}</dd>
              <dt>Advance paid</dt>
              <dd>{advance ? (invoiceStatus(advance) === 'Paid' ? 'Yes' : 'Not yet') : 'Not invoiced'}</dd>
            </dl>
            <dl className="facts facts-split">
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
          </Card>

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
                    <div className="cell-sub">None yet. Raise them from Invoices and payments.</div>
                  )}
                </div>
              </li>
              <li>
                <Package size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">
                    {project.materials.length ? (
                      <Link
                        onClick={() =>
                          onOpenRecord('inventory', null, {
                            skus: project.materials.map((m) => m.sku),
                            label: `${project.id} · ${project.name}`,
                          })
                        }
                      >
                        Inventory · {project.materials.length} {project.materials.length === 1 ? 'item' : 'items'}
                      </Link>
                    ) : (
                      'Inventory'
                    )}
                  </div>
                  {project.materials.length ? (
                    project.materials.map((m) => {
                      const item = itemForMaterial(data, m)
                      return (
                        <div key={m.sku}>
                          {item ? <Link onClick={() => onOpenRecord('inventory', item.sku)}>{item.name}</Link> : m.sku}{' '}
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
                  {registeredStaff.length ? (
                    registeredStaff.map((name) => (
                      <div key={name}>
                        <PersonName name={name} onOpenRecord={onOpenRecord} />
                      </div>
                    ))
                  ) : (
                    <div className="cell-sub">
                      {project.designer || project.team.length
                        ? 'The people on this project aren’t on the Staff list yet. Their names will link once an admin adds them.'
                        : 'No designer or team set.'}
                    </div>
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
