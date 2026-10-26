// The figures behind each dashboard section, worked out from the same records
// every other page uses. Everything is scoped to the branch picked in the
// sidebar and to what the person's role lets them see (a designer's
// projects are only their own).

import { ALL_BRANCHES } from '../modules.js'
import { visibleProjects, visibleQuotes } from '../auth/visibility.js'
import {
  quoteBranch,
  projectBranch,
  invoiceBranch,
  invoiceStatus,
  invoiceBalance,
  quoteForProject,
  projectExtrasCharged,
  projectMaterialsCost,
  clientForProject,
  clientForInvoice,
  materialInfo,
  moneyTotals,
} from '../data/links.js'
import { addDays } from '../invoices/invoiceFields.js'
import { saleTotals } from '../pos/posFields.js'
import { quoteTotals, QUOTE_STATUSES } from '../quotations/quoteFields.js'
import { STAGES, currentStage, isCompleted, installationCost } from '../projects/projectFields.js'
import { stockAt, worstStatus } from '../inventory/inventoryFields.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The last `n` days up to today, oldest first: [{ iso, label }].
function lastDays(today, n) {
  return Array.from({ length: n }, (_, i) => {
    const iso = addDays(today, i - n + 1)
    const [, m, d] = iso.split('-').map(Number)
    return { iso, label: `${d} ${MONTHS[m - 1]}` }
  })
}

// The last `n` months up to this one, oldest first: [{ key: '2026-10', label }].
function lastMonths(today, n) {
  const [y, m] = today.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(y, m - 1 - (n - 1 - i), 1)
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: MONTHS[date.getMonth()] }
  })
}

export function salesSection(data, auth, branch, today) {
  const inBranch = (b) => branch === ALL_BRANCHES || b === branch
  const sales = data.sales.filter((s) => !s.voided && inBranch(s.branch))
  const days = lastDays(today, 14)
  const byDay = days.map((d) => sales.filter((s) => s.date === d.iso).reduce((sum, s) => sum + saleTotals(s).total, 0))
  const todays = sales.filter((s) => s.date === today)

  const quotes = visibleQuotes(data, auth).filter((q) => inBranch(quoteBranch(data, q)))
  const byStatus = QUOTE_STATUSES.map((status) => {
    const list = quotes.filter((q) => q.status === status)
    return { status, count: list.length, value: list.reduce((s, q) => s + quoteTotals(q).total, 0) }
  })
  const waiting = quotes
    .filter((q) => q.status === 'Sent')
    .sort((a, b) => a.validUntil.localeCompare(b.validUntil))

  const toChase = data.invoices
    .filter((i) => !i.cancelled && !i.draft && invoiceBalance(i) > 0 && inBranch(invoiceBranch(data, i)))
    .map((i) => ({ invoice: i, client: clientForInvoice(data, i), status: invoiceStatus(i) }))
    // Overdue first, then by due date.
    .sort((a, b) => (b.status === 'Overdue') - (a.status === 'Overdue') || a.invoice.dueDate.localeCompare(b.invoice.dueDate))

  return {
    days,
    byDay,
    todayTotal: todays.reduce((s, x) => s + saleTotals(x).total, 0),
    todayCount: todays.length,
    fortnight: byDay.reduce((a, b) => a + b, 0),
    byStatus,
    waiting,
    waitingValue: waiting.reduce((s, q) => s + quoteTotals(q).total, 0),
    toChase,
  }
}

export function moneySection(data, auth, branch, today) {
  const all = branch === ALL_BRANCHES
  const inBranch = (b) => all || b === branch
  const invoices = data.invoices.filter((i) => !i.cancelled && inBranch(invoiceBranch(data, i)))
  const months = lastMonths(today, 6)
  const invoiced = months.map((m) => invoices.filter((i) => !i.draft && i.date.startsWith(m.key)).reduce((s, i) => s + i.amount, 0))
  const received = months.map((m) =>
    invoices.reduce((s, i) => s + i.payments.filter((p) => p.date.startsWith(m.key)).reduce((t, p) => t + p.amount, 0), 0),
  )

  // Profit on each project: what the client pays (quote plus extras) less
  // materials at cost and installation costs.
  const profits = visibleProjects(data, auth)
    .filter((p) => inBranch(projectBranch(data, p)))
    .map((p) => {
      const quote = quoteForProject(data, p)
      if (!quote) return null
      const income = quoteTotals(quote).total + projectExtrasCharged(data, p)
      const profit = income - projectMaterialsCost(data, p) - installationCost(p)
      return { project: p, client: clientForProject(data, p), income, profit, margin: income ? Math.round((profit / income) * 100) : 0 }
    })
    .filter(Boolean)
    .sort((a, b) => b.profit - a.profit)

  return { months, invoiced, received, totals: moneyTotals(data, branch, all), profits }
}

export function projectsSection(data, auth, branch, today) {
  const inBranch = (b) => branch === ALL_BRANCHES || b === branch
  const projects = visibleProjects(data, auth).filter((p) => inBranch(projectBranch(data, p)))
  const active = projects.filter((p) => !isCompleted(p))
  const byStage = STAGES.map((s) => ({ ...s, projects: active.filter((p) => currentStage(p)?.key === s.key) }))
  const weekAhead = addDays(today, 7)
  const deadlines = active
    .filter((p) => p.dueDate <= weekAhead)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((p) => ({ project: p, late: p.dueDate < today, client: clientForProject(data, p) }))
  return {
    projects,
    active,
    completed: projects.length - active.length,
    byStage,
    deadlines,
    late: deadlines.filter((d) => d.late).length,
  }
}

export function stockSection(data, auth, branch, today) {
  const inBranch = (b) => branch === ALL_BRANCHES || b === branch
  const low = data.inventory
    // Shown at the branch where it's worst.
    .map((item) => {
      const worst = worstStatus(item, branch)
      return { item, worst, stock: stockAt(item, worst.branch) }
    })
    .filter((r) => r.worst.status !== 'In stock')
    // Out of stock first, then the least available.
    .sort((a, b) => (b.worst.status === 'Out of stock') - (a.worst.status === 'Out of stock') || a.stock.available - b.stock.available)

  // Materials still to be issued on live projects, earliest needed first.
  const toPrepare = data.projects
    .filter((p) => !isCompleted(p) && inBranch(projectBranch(data, p)))
    .flatMap((p) =>
      p.materials
        .filter((m) => m.status !== 'Issued')
        .map((m) => ({
          project: p,
          material: m,
          info: materialInfo(data, m),
          neededBy: p.stages.materials.neededBy || p.stages.installation.startDate || p.dueDate,
        })),
    )
    .sort((a, b) => a.neededBy.localeCompare(b.neededBy))

  const days = lastDays(today, 14)
  const moves = data.movements.filter((m) => inBranch(m.branch))
  const count = (type) => days.map((d) => moves.filter((m) => m.date === d.iso && (type === 'In' ? m.type === 'In' : m.type === 'Out')).length)

  return { low, toPrepare, days, ins: count('In'), outs: count('Out') }
}
