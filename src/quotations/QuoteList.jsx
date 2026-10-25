import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import { clientForQuote, quoteBranch } from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { QUOTE_STATUSES, quoteTotals } from './quoteFields.js'
import { ALL_BRANCHES } from '../modules.js'

// True when the search text appears in the quote number or title, or in the
// client's name or ID.
function matches(data, quote, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const client = clientForQuote(data, quote)
  return (
    quote.id.toLowerCase().includes(q) ||
    quote.title.toLowerCase().includes(q) ||
    quote.clientId.toLowerCase().includes(q) ||
    (client?.name.toLowerCase().includes(q) ?? false)
  )
}

export default function QuoteList({ query, branch, onOpen, onNew }) {
  const data = useData()
  const [status, setStatus] = useState('All')
  const today = todayIso()

  const allBranches = branch === ALL_BRANCHES
  const inBranch = allBranches ? data.quotations : data.quotations.filter((q) => quoteBranch(data, q) === branch)
  const found = inBranch.filter((q) => matches(data, q, query))
  const rows = status === 'All' ? found : found.filter((q) => q.status === status)
  const countFor = (s) => (s === 'All' ? found.length : found.filter((q) => q.status === s).length)

  const subtitle = `${inBranch.length} quotations ${allBranches ? 'across both branches' : `at ${branch}`}`

  return (
    <>
      <PageHeader title="Quotations" subtitle={subtitle}>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <Plus size={15} strokeWidth={2} />
          New quotation
        </button>
      </PageHeader>

      <div className="toolbar">
        <div className="tabs">
          {['All', ...QUOTE_STATUSES].map((s) => (
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
        {query.trim() && <span className="toolbar-note">Results for “{query.trim()}”</span>}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Quotation</th>
              <th>Client</th>
              {allBranches && <th>Branch</th>}
              <th>Site</th>
              <th>Date</th>
              <th>Valid until</th>
              <th>Status</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => {
              const client = clientForQuote(data, q)
              // A sent quote past its date has expired without an answer.
              const expired = q.status === 'Sent' && q.validUntil < today
              return (
                <tr key={q.id} onClick={() => onOpen(q.id)}>
                  <td>
                    <div className="cell-main">{q.id}</div>
                    <div className="cell-sub">{q.title}</div>
                  </td>
                  <td>
                    <div>{client?.name ?? 'Unknown client'}</div>
                    <div className="cell-sub">{q.clientId}</div>
                  </td>
                  {allBranches && <td>{client?.branch}</td>}
                  <td>{q.site?.city}</td>
                  <td>{formatDate(q.date)}</td>
                  <td className={expired ? 'is-overdue' : ''}>{formatDate(q.validUntil)}</td>
                  <td>
                    <Badge>{q.status}</Badge>
                  </td>
                  <td className="num">{formatMoney(quoteTotals(q).total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="empty">
            {query.trim()
              ? `No quotations match “${query.trim()}”${allBranches ? '' : ` at ${branch}`}.`
              : 'No quotations here yet.'}
          </div>
        )}
      </div>
    </>
  )
}
