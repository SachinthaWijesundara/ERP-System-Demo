import { ArrowLeft, Pencil, Phone, Mail, MapPin } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import {
  quotationsForClient,
  projectsForClient,
  invoicesForClient,
  amountPaid,
  invoiceBalance,
  invoiceStatus,
  balanceDue,
} from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'

function Card({ title, count, children }) {
  return (
    <section className="card">
      <header className="card-head">
        <h2>{title}</h2>
        {count !== undefined && <span className="card-count">{count}</span>}
      </header>
      <div className="card-body">{children}</div>
    </section>
  )
}

function Empty({ children }) {
  return <p className="card-empty">{children}</p>
}

export default function ClientDetail({ clientId, onBack, onEdit }) {
  const data = useData()
  const client = data.clients.find((c) => c.id === clientId)
  if (!client) return null

  const quotes = quotationsForClient(data, client.id)
  const projects = projectsForClient(data, client.id)
  const invoices = invoicesForClient(data, client.id)
  const balance = balanceDue(data, client.id)
  const overdue = client.followUp && client.followUp < todayIso()

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Clients
      </button>

      <PageHeader title={client.name} subtitle={client.id}>
        <Badge>{client.status}</Badge>
        <button type="button" className="btn" onClick={onEdit}>
          <Pencil size={14} strokeWidth={1.75} />
          Edit
        </button>
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

          <Card title="Quotations" count={quotes.length}>
            {quotes.length === 0 ? (
              <Empty>No quotations for this client yet.</Empty>
            ) : (
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Quote no.</th>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id}>
                      <td className="cell-main">{q.id}</td>
                      <td>{q.title}</td>
                      <td>{formatDate(q.date)}</td>
                      <td>
                        <Badge>{q.status}</Badge>
                      </td>
                      <td className="num">{formatMoney(q.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Projects" count={projects.length}>
            {projects.length === 0 ? (
              <Empty>No projects yet. A project appears here when one of this client’s quotes is approved.</Empty>
            ) : (
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Project no.</th>
                    <th>Name</th>
                    <th>From quote</th>
                    <th>Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-main">{p.id}</td>
                      <td>{p.name}</td>
                      <td>{p.quoteId}</td>
                      <td>{p.stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Invoices and payments" count={invoices.length}>
            {invoices.length === 0 ? (
              <Empty>No invoices for this client yet.</Empty>
            ) : (
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Invoice no.</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="num">Amount</th>
                    <th className="num">Paid</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="cell-main">{inv.id}</td>
                      <td>{inv.type}</td>
                      <td>{formatDate(inv.date)}</td>
                      <td>
                        <Badge>{invoiceStatus(inv)}</Badge>
                      </td>
                      <td className="num">{formatMoney(inv.amount)}</td>
                      <td className="num">{formatMoney(amountPaid(inv))}</td>
                      <td className="num">{formatMoney(invoiceBalance(inv))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <aside className="detail-side">
          <Card title="Summary">
            <dl className="facts">
              <dt>Balance due</dt>
              <dd className={balance > 0 ? 'is-owed' : ''}>
                {invoices.length ? formatMoney(balance) : '—'}
              </dd>
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
