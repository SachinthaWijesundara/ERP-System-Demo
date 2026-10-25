import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { projectsForClient, invoicesForClient, balanceDue } from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { STATUSES } from './clientFields.js'
import { ALL_BRANCHES } from '../modules.js'

// True when the search text appears in the client's name, ID, phone or email,
// or in the number or name of one of their projects.
function matches(data, client, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const qDigits = q.replace(/\D/g, '')
  const projects = projectsForClient(data, client.id)
  return (
    client.name.toLowerCase().includes(q) ||
    client.id.toLowerCase().includes(q) ||
    client.email.toLowerCase().includes(q) ||
    (qDigits.length >= 3 && client.phone.replace(/\D/g, '').includes(qDigits)) ||
    projects.some((p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
  )
}

export default function ClientList({ query, branch, onOpen, onNew }) {
  const data = useData()
  const [status, setStatus] = useState('All')
  const today = todayIso()

  const allBranches = branch === ALL_BRANCHES
  const inBranch = allBranches ? data.clients : data.clients.filter((c) => c.branch === branch)
  const found = inBranch.filter((c) => matches(data, c, query))
  const rows = status === 'All' ? found : found.filter((c) => c.status === status)
  const countFor = (s) => (s === 'All' ? found.length : found.filter((c) => c.status === s).length)

  const subtitle = `${inBranch.length} clients and leads ${allBranches ? 'across both branches' : `at ${branch}`}`

  return (
    <>
      <PageHeader title="Clients" subtitle={subtitle}>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <Plus size={15} strokeWidth={2} />
          New client
        </button>
      </PageHeader>

      <div className="toolbar">
        <div className="tabs">
          {['All', ...STATUSES].map((s) => (
            <button
              key={s}
              type="button"
              className={`tab${status === s ? ' is-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s}
              <span className="tab-count">{countFor(s)}</span>
            </button>
          ))}
        </div>
        {query.trim() && (
          <span className="toolbar-note">
            Results for “{query.trim()}”
          </span>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Client</th>
              {allBranches && <th>Branch</th>}
              <th>Phone</th>
              <th>Site</th>
              <th>Lead source</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th className="num">Balance due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const balance = balanceDue(data, c.id)
              const hasInvoices = invoicesForClient(data, c.id).length > 0
              const overdue = c.followUp && c.followUp < today
              return (
                <tr key={c.id} onClick={() => onOpen(c.id)}>
                  <td>
                    <div className="cell-main">{c.name}</div>
                    <div className="cell-sub">{c.id}</div>
                  </td>
                  {allBranches && <td>{c.branch}</td>}
                  <td>{c.phone}</td>
                  <td>
                    {c.sites[0]?.city}
                    {c.sites.length > 1 && <span className="cell-sub"> +{c.sites.length - 1}</span>}
                  </td>
                  <td>{c.leadSource}</td>
                  <td>
                    <Badge>{c.status}</Badge>
                  </td>
                  <td className={overdue ? 'is-overdue' : ''}>{c.followUp ? formatDate(c.followUp) : '—'}</td>
                  <td className="num">{hasInvoices ? formatMoney(balance) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="empty">
            {query.trim()
              ? `No clients match “${query.trim()}”${allBranches ? '' : ` at ${branch}`}.`
              : 'No clients here yet.'}
          </div>
        )}
      </div>
    </>
  )
}
