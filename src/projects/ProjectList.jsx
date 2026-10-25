import { useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { useData } from '../data/DataContext.jsx'
import { clientForProject, projectBranch, quotesReadyForProject } from '../data/links.js'
import { formatDate, todayIso } from '../utils/format.js'
import { currentStageLabel, isCompleted, progressOf, warrantyInfo } from './projectFields.js'
import { WarrantyCell } from './WarrantyStatus.jsx'
import { ALL_BRANCHES } from '../modules.js'

const FILTERS = ['All', 'Active', 'Completed', 'Under warranty']

// True when the search text appears in the project's number or name, its
// source quote, the client's name or ID, or the designer's name.
function matches(data, project, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const client = clientForProject(data, project)
  return [project.id, project.name, project.quoteId, project.clientId, project.designer, client?.name ?? '']
    .some((text) => text.toLowerCase().includes(q))
}

export default function ProjectList({ query, branch, onOpen, onNew }) {
  const data = useData()
  const [filter, setFilter] = useState('All')
  const today = todayIso()

  const allBranches = branch === ALL_BRANCHES
  const inBranch = allBranches ? data.projects : data.projects.filter((p) => projectBranch(data, p) === branch)
  const found = inBranch.filter((p) => matches(data, p, query))
  const keep = (p, f) => {
    if (f === 'All') return true
    if (f === 'Under warranty') return warrantyInfo(p, today)?.active === true
    return (f === 'Completed') === isCompleted(p)
  }
  const rows = found.filter((p) => keep(p, filter))
  const countFor = (f) => found.filter((p) => keep(p, f)).length

  const subtitle = `${inBranch.length} projects ${allBranches ? 'across both branches' : `at ${branch}`}`

  // A project can only start from an approved quote that has no project yet.
  const readyQuotes = data.clients.flatMap((c) => quotesReadyForProject(data, c.id))

  return (
    <>
      <PageHeader title="Projects" subtitle={subtitle}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNew}
          disabled={readyQuotes.length === 0}
          title={readyQuotes.length === 0 ? 'Approve a quotation first' : undefined}
        >
          <Plus size={15} strokeWidth={2} />
          New project
        </button>
      </PageHeader>

      <p className="table-note project-rule">
        {readyQuotes.length === 0
          ? 'Every approved quotation already has a project. To start a new one, a client’s quotation must be approved first.'
          : `${readyQuotes.length} approved ${readyQuotes.length === 1 ? 'quotation is' : 'quotations are'} ready to become a project: ${readyQuotes.map((q) => q.id).join(', ')}.`}
      </p>

      <div className="toolbar">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`tab${filter === f ? ' is-active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
              <span className="tab-count">{countFor(f)}</span>
            </button>
          ))}
        </div>
        {query.trim() && <span className="toolbar-note">Results for “{query.trim()}”</span>}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              {allBranches && <th>Branch</th>}
              <th>Stage</th>
              <th>Progress</th>
              <th>Designer</th>
              <th>Due</th>
              <th>Warranty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const client = clientForProject(data, p)
              const done = isCompleted(p)
              const late = !done && p.dueDate < today
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)}>
                  <td>
                    <div className="cell-main">{p.name}</div>
                    <div className="cell-sub">
                      {p.id} · from {p.quoteId}
                    </div>
                  </td>
                  <td>
                    <div>{client?.name ?? 'Unknown client'}</div>
                    <div className="cell-sub">{p.site?.city}</div>
                  </td>
                  {allBranches && <td>{client?.branch}</td>}
                  <td>
                    <Badge>{currentStageLabel(p)}</Badge>
                  </td>
                  <td className="cell-progress">
                    <ProgressBar value={progressOf(p)} />
                  </td>
                  <td>{p.designer || '—'}</td>
                  <td className={late ? 'is-overdue' : ''}>{formatDate(p.dueDate)}</td>
                  <td>
                    <WarrantyCell project={p} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="empty">
            {query.trim()
              ? `No projects match “${query.trim()}”${allBranches ? '' : ` at ${branch}`}.`
              : 'No projects here yet.'}
          </div>
        )}
      </div>
    </>
  )
}
