import { useState } from 'react'
import Badge from '../components/Badge.jsx'
import { useData } from '../data/DataContext.jsx'
import {
  clientForInvoice,
  projectForInvoice,
  invoiceBranch,
  invoiceStatus,
  invoiceBalance,
  moneyTotals,
} from '../data/links.js'
import { formatDate, formatMoney } from '../utils/format.js'
import { ALL_BRANCHES } from '../modules.js'
import { INVOICE_STATUSES } from './invoiceFields.js'

// True when the search text appears in the invoice or receipt numbers, the
// client, the project or the description.
function matches(data, invoice, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const client = clientForInvoice(data, invoice)
  const project = projectForInvoice(data, invoice)
  return [
    invoice.id,
    invoice.description,
    invoice.clientId,
    invoice.projectId,
    invoice.saleId,
    client?.name ?? '',
    project?.name ?? '',
    ...invoice.payments.map((p) => p.id),
  ].some((t) => t.toLowerCase().includes(q))
}

export default function InvoiceList({ query, branch, onOpen }) {
  const data = useData()
  const [status, setStatus] = useState('All')

  const allBranches = branch === ALL_BRANCHES
  const inBranch = allBranches ? data.invoices : data.invoices.filter((i) => invoiceBranch(data, i) === branch)
  const found = inBranch.filter((i) => matches(data, i, query))
  const rows = status === 'All' ? found : found.filter((i) => invoiceStatus(i) === status)
  const countFor = (s) => (s === 'All' ? found.length : found.filter((i) => invoiceStatus(i) === s).length)
  const totals = moneyTotals(data, branch, allBranches)

  return (
    <>
      <section className="pos-strip">
        <div>
          <div className="fact-label">Outstanding</div>
          <div className="pos-strip-value">{formatMoney(totals.outstanding)}</div>
          <div className="cell-sub">Owed by clients{allBranches ? ', both branches' : ` at ${branch}`}</div>
        </div>
        <div>
          <div className="fact-label">Overdue</div>
          <div className={`pos-strip-value${totals.overdue ? ' is-overdue' : ''}`}>{formatMoney(totals.overdue)}</div>
          <div className="cell-sub">Past the due date</div>
        </div>
        <div>
          <div className="fact-label">Invoiced this month</div>
          <div className="pos-strip-value">{formatMoney(totals.invoicedThisMonth)}</div>
        </div>
        <div>
          <div className="fact-label">Received this month</div>
          <div className="pos-strip-value">{formatMoney(totals.receivedThisMonth)}</div>
        </div>
      </section>

      <div className="toolbar">
        <div className="tabs">
          {['All', ...INVOICE_STATUSES].map((s) => (
            <button key={s} type="button" className={`tab${status === s ? ' is-active' : ''}`} onClick={() => setStatus(s)}>
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
              <th>Invoice</th>
              <th>Client</th>
              {allBranches && <th>Branch</th>}
              <th>For</th>
              <th>Due</th>
              <th>Status</th>
              <th className="num">Amount</th>
              <th className="num">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => {
              const client = clientForInvoice(data, inv)
              const project = projectForInvoice(data, inv)
              const status = invoiceStatus(inv)
              return (
                <tr key={inv.id} onClick={() => onOpen(inv.id)} className={inv.cancelled ? 'is-cancelled' : ''}>
                  <td>
                    <div className="cell-main">{inv.id}</div>
                    <div className="cell-sub">
                      {inv.type} · {formatDate(inv.date)}
                    </div>
                  </td>
                  <td>
                    <div>{client?.name ?? 'Walk-in'}</div>
                    <div className="cell-sub">{inv.clientId}</div>
                  </td>
                  {allBranches && <td>{invoiceBranch(data, inv)}</td>}
                  <td>
                    <div>{project?.name ?? (inv.saleId ? `Sale ${inv.saleId}` : '—')}</div>
                    <div className="cell-sub">{inv.projectId}</div>
                  </td>
                  <td className={status === 'Overdue' ? 'is-overdue' : ''}>{formatDate(inv.dueDate)}</td>
                  <td>
                    <Badge>{status}</Badge>
                  </td>
                  <td className="num">{formatMoney(inv.amount)}</td>
                  <td className={`num cell-main${invoiceBalance(inv) > 0 ? ' is-owed' : ''}`}>{formatMoney(invoiceBalance(inv))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="empty">{query.trim() ? `No invoices match “${query.trim()}”.` : 'No invoices here.'}</div>
        )}
      </div>
    </>
  )
}
