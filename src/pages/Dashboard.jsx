import { AlertTriangle, XCircle, LayoutDashboard } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Badge from '../components/Badge.jsx'
import Link from '../components/RecordLink.jsx'
import StaffLink from '../components/StaffLink.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { formatDate, formatMoney, todayIso, todayLong } from '../utils/format.js'
import { ALL_BRANCHES } from '../modules.js'
import { quoteTotals } from '../quotations/quoteFields.js'
import { invoiceBalance } from '../data/links.js'
import { progressOf, currentStageLabel } from '../projects/projectFields.js'
import { ChartCard, ColumnChart, BarList, StatTile, Meter, Legend, compact } from '../dashboard/charts.jsx'
import { salesSection, moneySection, projectsSection, stockSection } from '../dashboard/dashboardData.js'

const SERIES_1 = 'var(--series-1)'
const SERIES_2 = 'var(--series-2)'

function ListCard({ title, subtitle, count, empty, children }) {
  return (
    <section className="card viz-card">
      <header className="card-head viz-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="cell-sub">{subtitle}</div>}
        </div>
        {count !== undefined && <span className="card-count">{count}</span>}
      </header>
      <div className="card-body">{count === 0 ? <p className="card-empty">{empty}</p> : children}</div>
    </section>
  )
}

function SectionTitle({ children, note }) {
  return (
    <div className="dash-section-title">
      <h2>{children}</h2>
      {note && <span className="cell-sub">{note}</span>}
    </div>
  )
}

// --- Sales: the counter, quotes waiting for an answer, money to chase -----

function SalesBlock({ s, open, canOpen, onOpenRecord }) {
  const statusRows = s.byStatus.map((r) => ({ key: r.status, label: r.status, sub: formatMoney(r.value), value: r.count }))
  return (
    <>
      <SectionTitle note="Counter sales, quotations and payments to follow up">Sales</SectionTitle>
      <div className="dash-grid">
        <ChartCard
          className="dash-span-2"
          title="Counter sales, last 14 days"
          subtitle={`${formatMoney(s.fortnight)} in total · LKR per day`}
          table={{ columns: ['Day', 'Sales (LKR)'], rows: s.days.map((d, i) => [d.label, formatMoney(s.byDay[i])]) }}
        >
          <ColumnChart
            points={s.days.map((d) => ({ key: d.iso, label: d.label.split(' ')[0], title: formatDate(d.iso) }))}
            series={[{ name: 'Counter sales', color: SERIES_1, values: s.byDay }]}
            format={formatMoney}
            labelEvery={2}
          />
        </ChartCard>
        <ChartCard
          title="Quotations by status"
          subtitle="Number of quotes"
          table={{ columns: ['Status', 'Quotes', 'Value'], rows: s.byStatus.map((r) => [r.status, r.count, formatMoney(r.value)]) }}
        >
          <BarList rows={statusRows} format={(v) => String(v)} />
        </ChartCard>
      </div>
      <div className="dash-grid dash-grid-2">
        <ListCard
          title="Waiting for the client’s answer"
          subtitle={`${s.waiting.length} sent ${s.waiting.length === 1 ? 'quote' : 'quotes'} worth ${formatMoney(s.waitingValue)}`}
          count={s.waiting.length}
          empty="No quotes waiting for a reply."
        >
          <ul className="dash-list">
            {s.waiting.slice(0, 6).map((q) => (
              <li key={q.id}>
                <div>
                  <Link onClick={open('quotations', q.id)}>
                    {q.id} · {q.title}
                  </Link>
                  <div className="cell-sub">
                    Prepared by <StaffLink id={q.preparedById} onOpenRecord={onOpenRecord} /> · valid until {formatDate(q.validUntil)}
                  </div>
                </div>
                <span className="dash-list-value">{formatMoney(quoteTotals(q).total)}</span>
              </li>
            ))}
          </ul>
        </ListCard>
        <ListCard
          title="Payments to chase"
          subtitle="Issued invoices with money still owed, overdue first"
          count={s.toChase.length}
          empty="Nothing owed. Every issued invoice is paid."
        >
          <ul className="dash-list">
            {s.toChase.slice(0, 6).map(({ invoice, client, status }) => (
              <li key={invoice.id}>
                <div>
                  {canOpen('invoices') ? (
                    <Link onClick={open('invoices', invoice.id)}>
                      {invoice.id} · {client?.name ?? 'Walk-in'}
                    </Link>
                  ) : (
                    `${invoice.id} · ${client?.name ?? 'Walk-in'}`
                  )}
                  <div className="cell-sub">
                    {invoice.type} · due {formatDate(invoice.dueDate)}
                  </div>
                </div>
                <span className="dash-list-value">
                  {formatMoney(invoiceBalance(invoice))}
                  <Badge>{status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </ListCard>
      </div>
    </>
  )
}

// --- Money: revenue, received, profit per project ------------------------

function MoneyBlock({ m, open }) {
  const series = [
    { name: 'Invoiced', color: SERIES_1, values: m.invoiced },
    { name: 'Received', color: SERIES_2, values: m.received },
  ]
  return (
    <>
      <SectionTitle note="Invoices issued and money received, and what each project earns">Money</SectionTitle>
      <div className="dash-grid">
        <ChartCard
          className="dash-span-2"
          title="Invoiced and received, last 6 months"
          subtitle="LKR per month"
          legend={<Legend series={series} />}
          table={{
            columns: ['Month', 'Invoiced', 'Received'],
            rows: m.months.map((mo, i) => [mo.label, formatMoney(m.invoiced[i]), formatMoney(m.received[i])]),
          }}
        >
          <ColumnChart
            points={m.months.map((mo) => ({ key: mo.key, label: mo.label, title: `${mo.label} ${mo.key.slice(0, 4)}` }))}
            series={series}
            format={formatMoney}
          />
        </ChartCard>
        <ChartCard
          title="Profit per project"
          subtitle="Quote and extras less materials and installation"
          table={{
            columns: ['Project', 'Income', 'Profit', 'Margin'],
            rows: m.profits.map((p) => [`${p.project.id} ${p.project.name}`, formatMoney(p.income), formatMoney(p.profit), `${p.margin}%`]),
          }}
        >
          {m.profits.length ? (
            <BarList
              rows={m.profits.slice(0, 7).map((p) => ({
                key: p.project.id,
                label: p.project.name,
                sub: `${p.margin}% margin`,
                value: p.profit,
                onClick: open('projects', p.project.id),
              }))}
              format={(v) => (v < 0 ? `−${compact(-v)}` : compact(v))}
            />
          ) : (
            <p className="card-empty">No projects yet.</p>
          )}
        </ChartCard>
      </div>
    </>
  )
}

// --- Projects: where every job is and what's due --------------------------

function ProjectsBlock({ p, own, open, onOpenRecord }) {
  const stageRows = p.byStage.map((s) => ({ key: s.key, label: s.label, sub: s.projects.map((x) => x.id).join(', ') || 'None', value: s.projects.length }))
  return (
    <>
      <SectionTitle note={own ? 'Only the projects you’re on' : 'Every live project'}>{own ? 'My projects' : 'Projects'}</SectionTitle>
      <div className="dash-grid">
        <ChartCard
          title="Live projects by stage"
          subtitle="Number of projects at each stage"
          table={{ columns: ['Stage', 'Projects', 'Which'], rows: p.byStage.map((s) => [s.label, s.projects.length, s.projects.map((x) => x.id).join(', ') || '—']) }}
        >
          <BarList rows={stageRows} format={(v) => String(v)} />
        </ChartCard>
        <ListCard
          title="Due this week or late"
          subtitle="Handover due in the next 7 days"
          count={p.deadlines.length}
          empty="Nothing due in the next 7 days."
        >
          <ul className="dash-list">
            {p.deadlines.map(({ project, late, client }) => (
              <li key={project.id}>
                <div>
                  <Link onClick={open('projects', project.id)}>
                    {project.id} · {project.name}
                  </Link>
                  <div className="cell-sub">
                    {client?.name} · <StaffLink id={project.designerId} onOpenRecord={onOpenRecord} />
                  </div>
                </div>
                <span className={`dash-list-value${late ? ' is-overdue' : ''}`}>
                  {late && <AlertTriangle size={13} strokeWidth={2} />}
                  {late ? 'Late · ' : ''}
                  {formatDate(project.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        </ListCard>
        <ListCard title="Progress" subtitle="Live projects, furthest along first" count={p.active.length} empty="No live projects.">
          <ul className="dash-list">
            {[...p.active]
              .sort((a, b) => progressOf(b) - progressOf(a))
              .slice(0, 6)
              .map((project) => (
                <li key={project.id} className="dash-progress">
                  <div>
                    <Link onClick={open('projects', project.id)}>{project.name}</Link>
                    <div className="cell-sub">{currentStageLabel(project)}</div>
                  </div>
                  <ProgressBar value={progressOf(project)} />
                </li>
              ))}
          </ul>
        </ListCard>
      </div>
    </>
  )
}

// --- Stock: what's running out and what to get ready ----------------------

function StockBlock({ st, open, branch }) {
  const series = [
    { name: 'Stock in', color: SERIES_1, values: st.ins },
    { name: 'Stock out', color: SERIES_2, values: st.outs },
  ]
  return (
    <>
      <SectionTitle note="Low stock, materials for projects and stock movements">Stock</SectionTitle>
      <div className="dash-grid dash-grid-2">
        <ListCard
          title="Low or out of stock"
          subtitle="Available after project reservations, against the alert level"
          count={st.low.length}
          empty="Everything is above its alert level."
        >
          <ul className="dash-list">
            {st.low.slice(0, 7).map(({ item, worst, stock }) => {
              const out = worst.status === 'Out of stock'
              return (
                <li key={item.sku} className="dash-stock">
                  <div>
                    <Link onClick={open('inventory', item.sku)}>{item.name}</Link>
                    <div className="cell-sub">
                      {item.sku}
                      {branch === ALL_BRANCHES && ` · at ${worst.branch}`}
                    </div>
                  </div>
                  <div className="dash-stock-meter">
                    <Meter value={Math.max(0, stock.available)} max={item.lowStockLevel} tone={out ? 'critical' : 'warning'} />
                    <span className={`dash-stock-state${out ? ' is-out' : ''}`}>
                      {out ? <XCircle size={13} strokeWidth={2} /> : <AlertTriangle size={13} strokeWidth={2} />}
                      {Math.max(0, stock.available)} of {item.lowStockLevel} {item.unit}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </ListCard>
        <ListCard
          title="Materials to prepare"
          subtitle="Not issued yet, earliest needed first"
          count={st.toPrepare.length}
          empty="No materials waiting for live projects."
        >
          <ul className="dash-list">
            {st.toPrepare.slice(0, 7).map(({ project, material, info, neededBy }, i) => (
              <li key={`${project.id}-${i}`}>
                <div>
                  {info.item ? <Link onClick={open('inventory', material.sku)}>{info.name}</Link> : `${info.name} (custom)`}
                  <div className="cell-sub">
                    {material.qty} {info.unit} for <Link onClick={open('projects', project.id)}>{project.id}</Link> · {material.status}
                  </div>
                </div>
                <span className="dash-list-value">{neededBy ? formatDate(neededBy) : '—'}</span>
              </li>
            ))}
          </ul>
        </ListCard>
      </div>
      <div className="dash-grid">
        <ChartCard
          className="dash-span-3"
          title="Stock movements, last 14 days"
          subtitle="Number of movements per day"
          legend={<Legend series={series} />}
          table={{ columns: ['Day', 'In', 'Out'], rows: st.days.map((d, i) => [d.label, st.ins[i], st.outs[i]]) }}
        >
          <ColumnChart
            points={st.days.map((d) => ({ key: d.iso, label: d.label.split(' ')[0], title: formatDate(d.iso) }))}
            series={series}
            format={(v) => `${v} ${v === 1 ? 'movement' : 'movements'}`}
            height={170}
            labelEvery={2}
          />
        </ChartCard>
      </div>
    </>
  )
}

// The dashboard shows only the sections the person's role has (set in User
// settings): Sales, Money, Projects and Stock. Everything follows the branch
// picked in the sidebar, and a designer's projects are only their own.
export default function Dashboard({ branch, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const today = todayIso()
  const show = {
    sales: auth.can('dashboard.sales'),
    money: auth.can('dashboard.money'),
    projects: auth.can('dashboard.projects'),
    stock: auth.can('dashboard.stock'),
  }
  const open = (module, id) => () => onOpenRecord(module, id)
  const canOpen = (module) => auth.can(`${module}.view`)

  const s = show.sales ? salesSection(data, auth, branch, today) : null
  const m = show.money ? moneySection(data, auth, branch, today) : null
  const p = show.projects ? projectsSection(data, auth, branch, today) : null
  const st = show.stock ? stockSection(data, auth, branch, today) : null
  const own = !auth.can('projects.all')
  const where = branch === ALL_BRANCHES ? 'Both branches' : branch

  const tiles = [
    s && { label: 'Counter sales today', value: formatMoney(s.todayTotal), note: `${s.todayCount} ${s.todayCount === 1 ? 'sale' : 'sales'}`, onClick: canOpen('pos') ? open('pos') : null },
    s && { label: 'Quotes waiting for a reply', value: String(s.waiting.length), note: formatMoney(s.waitingValue), onClick: open('quotations') },
    m && { label: 'Received this month', value: formatMoney(m.totals.receivedThisMonth), note: `${formatMoney(m.totals.invoicedThisMonth)} invoiced`, onClick: open('invoices') },
    m && {
      label: 'Outstanding',
      value: formatMoney(m.totals.outstanding),
      note: m.totals.overdue ? `${formatMoney(m.totals.overdue)} overdue` : 'Nothing overdue',
      tone: m.totals.overdue ? 'owed' : null,
      onClick: open('invoices'),
    },
    p && { label: own ? 'My live projects' : 'Live projects', value: String(p.active.length), note: `${p.completed} completed`, onClick: open('projects') },
    p && {
      label: 'Due this week',
      value: String(p.deadlines.length),
      note: p.late ? `${p.late} late` : 'None late',
      tone: p.late ? 'owed' : null,
      onClick: open('projects'),
    },
    st && { label: 'Low or out of stock', value: String(st.low.length), note: `${st.low.filter((r) => r.worst.status === 'Out of stock').length} out of stock`, onClick: open('inventory') },
    st && { label: 'Materials to prepare', value: String(st.toPrepare.length), note: `for ${new Set(st.toPrepare.map((r) => r.project.id)).size} projects`, onClick: canOpen('projects') ? open('projects') : null },
  ].filter(Boolean)

  const nothing = !show.sales && !show.money && !show.projects && !show.stock

  return (
    <>
      <PageHeader title={`Good day, ${auth.user.name.split(' ')[0]}`} subtitle={`${todayLong()} · ${where}`} />

      {nothing ? (
        <div className="no-access">
          <LayoutDashboard size={20} strokeWidth={1.5} />
          <p>Your role has no dashboard sections yet. The admin can turn them on in User settings.</p>
        </div>
      ) : (
        <div className="dashboard">
          <section className="dash-tiles">
            {tiles.map((t) => (
              <StatTile key={t.label} {...t} />
            ))}
          </section>
          {s && <SalesBlock s={s} open={open} canOpen={canOpen} onOpenRecord={onOpenRecord} />}
          {m && <MoneyBlock m={m} open={open} />}
          {p && <ProjectsBlock p={p} own={own} open={open} onOpenRecord={onOpenRecord} />}
          {st && <StockBlock st={st} open={open} branch={branch} />}
        </div>
      )}
    </>
  )
}
