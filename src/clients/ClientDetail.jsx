import { ArrowLeft, Pencil, Phone, Mail, MapPin, ChevronRight, Trash2, Lock } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import Card, { CardEmpty as Empty } from '../components/Card.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { canSeeClient, canSeeProject, canSeeQuote } from '../auth/visibility.js'
import {
  quotationsForClient,
  projectsForClient,
  invoicesForClient,
  amountPaid,
  invoiceBalance,
  invoiceStatus,
  balanceDue,
} from '../data/links.js'
import { quoteTotals } from '../quotations/quoteFields.js'
import { currentStageLabel } from '../projects/projectFields.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'

// `onOpenRecord(module, id)` jumps to that quote, project or invoice. The
// quotes and projects listed are the ones the person's role lets them open;
// invoices and the balance need "see balances and payment history".
export default function ClientDetail({ clientId, onBack, onEdit, onDeleted, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const client = data.clients.find((c) => c.id === clientId)
  if (!client) return null
  if (!canSeeClient(data, auth, client)) {
    return (
      <>
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={15} strokeWidth={1.75} />
          Clients
        </button>
        <div className="no-access">
          <Lock size={20} strokeWidth={1.5} />
          <p>{client.id} isn’t one of your clients. Your role only shows clients from your own projects and quotations.</p>
        </div>
      </>
    )
  }

  const allQuotes = quotationsForClient(data, client.id)
  const quotes = auth.can('quotes.view') ? allQuotes.filter((q) => canSeeQuote(data, auth, q)) : []
  const projects = projectsForClient(data, client.id).filter((p) => canSeeProject(auth, p))
  const invoices = invoicesForClient(data, client.id)
  const balance = balanceDue(data, client.id)
  const overdue = client.followUp && client.followUp < todayIso()
  const showBalance = auth.can('clients.balances')

  // A client with quotes, counter sales or invoices is part of the books.
  const deletable =
    auth.can('clients.delete') &&
    allQuotes.length === 0 &&
    invoices.length === 0 &&
    !data.sales.some((s) => s.clientId === client.id)
  function remove() {
    if (!window.confirm(`Delete ${client.id} · ${client.name}? This can’t be undone.`)) return
    data.deleteClient(client.id)
    onDeleted()
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Clients
      </button>

      <PageHeader title={client.name} subtitle={client.id}>
        <Badge>{client.status}</Badge>
        {deletable && (
          <button type="button" className="btn" onClick={remove}>
            <Trash2 size={14} strokeWidth={1.75} />
            Delete
          </button>
        )}
        {auth.can('clients.edit') && (
          <button type="button" className="btn" onClick={onEdit}>
            <Pencil size={14} strokeWidth={1.75} />
            Edit
          </button>
        )}
      </PageHeader>

      <div className="detail-grid">
        <div className="detail-main">
          <Card title="Contact">
            <ul className="contact-list">
              <li>
                <Phone size={15} strokeWidth={1.75} />
                {client.phone}
              </li>
              <li>
                <Mail size={15} strokeWidth={1.75} />
                {client.email || <span className="muted">No email</span>}
              </li>
            </ul>
          </Card>

          <Card title="Site addresses" count={client.sites.length}>
            <ul className="site-list">
              {client.sites.map((s, i) => (
                <li key={i}>
                  <MapPin size={15} strokeWidth={1.75} />
                  <div>
                    <div className="site-label">{s.label}</div>
                    <div>
                      {s.address}, {s.city}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {auth.can('quotes.view') && (
          <Card title="Quotations" count={quotes.length}>
            {quotes.length === 0 ? (
              <Empty>No quotations for this client yet.</Empty>
            ) : (
              <table className="table table-compact table-links">
                <thead>
                  <tr>
                    <th>Quote no.</th>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} onClick={() => onOpenRecord('quotations', q.id)} title={`Open ${q.id}`}>
                      <td className="cell-main">{q.id}</td>
                      <td>{q.title}</td>
                      <td>{formatDate(q.date)}</td>
                      <td>
                        <Badge>{q.status}</Badge>
                      </td>
                      <td className="num">{formatMoney(quoteTotals(q).total)}</td>
                      <td className="link-arrow">
                        <ChevronRight size={15} strokeWidth={1.75} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          )}

          {auth.can('projects.view') && (
          <Card title="Projects" count={projects.length}>
            {projects.length === 0 ? (
              <Empty>No projects yet. A project appears here when one of this client’s quotes is approved.</Empty>
            ) : (
              <table className="table table-compact table-links">
                <thead>
                  <tr>
                    <th>Project no.</th>
                    <th>Name</th>
                    <th>From quote</th>
                    <th>Stage</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} onClick={() => onOpenRecord('projects', p.id)} title={`Open ${p.id}`}>
                      <td className="cell-main">{p.id}</td>
                      <td>{p.name}</td>
                      <td>
                        {/* The source quote opens on its own, without opening the project. */}
                        <button
                          type="button"
                          className="inline-link"
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenRecord('quotations', p.quoteId)
                          }}
                        >
                          {p.quoteId}
                        </button>
                      </td>
                      <td>
                        <Badge>{currentStageLabel(p)}</Badge>
                      </td>
                      <td className="link-arrow">
                        <ChevronRight size={15} strokeWidth={1.75} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          )}

          {showBalance && (
          <Card title="Invoices and payments" count={invoices.length}>
            {invoices.length === 0 ? (
              <Empty>No invoices for this client yet.</Empty>
            ) : (
              <table className="table table-compact table-links">
                <thead>
                  <tr>
                    <th>Invoice no.</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="num">Amount</th>
                    <th className="num">Paid</th>
                    <th className="num">Balance</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => auth.can('invoices.view') && onOpenRecord('invoices', inv.id)}
                      title={auth.can('invoices.view') ? `Open ${inv.id}` : undefined}
                    >
                      <td className="cell-main">{inv.id}</td>
                      <td>{inv.type}</td>
                      <td>{formatDate(inv.date)}</td>
                      <td>
                        <Badge>{invoiceStatus(inv)}</Badge>
                      </td>
                      <td className="num">{formatMoney(inv.amount)}</td>
                      <td className="num">{formatMoney(amountPaid(inv))}</td>
                      <td className="num">{formatMoney(invoiceBalance(inv))}</td>
                      <td className="link-arrow">
                        <ChevronRight size={15} strokeWidth={1.75} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          )}
        </div>

        <aside className="detail-side">
          <Card title="Summary">
            <dl className="facts">
              {showBalance && (
                <>
                  <dt>Balance due</dt>
                  <dd className={balance > 0 ? 'is-owed' : ''}>{invoices.length ? formatMoney(balance) : '—'}</dd>
                </>
              )}
              <dt>Branch</dt>
              <dd>{client.branch}</dd>
              <dt>Status</dt>
              <dd>{client.status}</dd>
              <dt>Lead source</dt>
              <dd>{client.leadSource}</dd>
              <dt>Follow-up date</dt>
              <dd className={overdue ? 'is-overdue' : ''}>
                {client.followUp ? formatDate(client.followUp) : '—'}
              </dd>
            </dl>
          </Card>

          <Card title="Notes">
            {client.notes ? <p className="notes">{client.notes}</p> : <Empty>No notes.</Empty>}
          </Card>
        </aside>
      </div>
    </>
  )
}
