// How invoices follow the work. Every rule that creates, updates or drafts an
// invoice lives here, and the data store runs them whenever a quote, project
// or sale changes, so it works the same from every page.
//
//   Quote approved      -> its Advance invoice (half the quote) is issued.
//   Quote un-approved   -> that invoice goes back to Draft (never deleted);
//                          approving again re-issues the same invoice.
//   Project created     -> its Final invoice opens as a Draft.
//   Project changes     -> the draft Final invoice updates itself: quote total
//                          + extras charged to the client - invoices already issued.
//   Handover done       -> the Final invoice is issued with today's figures.
//   Handover reopened   -> an unpaid Final invoice goes back to Draft.
//   POS sale completed  -> a paid "POS sale" invoice is created.
//
// Each function returns { invoices, notices }: the new invoice list and the
// messages for the notification bell.

import {
  quoteForProject,
  invoicesForQuote,
  materialInfo,
  posSaleAsInvoice,
  amountPaid,
} from './links.js'
import { quoteTotals } from '../quotations/quoteFields.js'
import { nextInvoiceId, nextPaymentId, addDays, ADVANCE_SHARE } from '../invoices/invoiceFields.js'
import { formatMoney, todayIso } from '../utils/format.js'

const money = (n) => formatMoney(n)

// The lines of a project's Final invoice, worked out from the project and its
// quote. While the invoice is a draft these are recalculated every time it's
// shown; when handover is done they're saved onto the invoice.
export function finalInvoiceLines(data, project) {
  const quote = quoteForProject(data, project)
  if (!quote) return []
  const lines = [{ description: `Quotation ${quote.id}: ${quote.title}`, amount: quoteTotals(quote).total }]

  project.materials
    .filter((m) => m.billable)
    .forEach((m) => {
      const info = materialInfo(data, m)
      lines.push({
        description: `Extra material: ${info.name}, ${m.qty} ${info.unit} × ${money(info.price)}`,
        amount: m.qty * info.price,
      })
    })

  project.stages.installation.costs
    .filter((c) => c.billable)
    .forEach((c) => lines.push({ description: `Extra work: ${c.description}`, amount: Number(c.amount) || 0 }))

  invoicesForQuote(data, quote.id)
    .filter((i) => i.type !== 'Final' && !i.draft)
    .forEach((i) => lines.push({ description: `Less ${i.type.toLowerCase()} invoice ${i.id}`, amount: -i.amount }))

  return lines
}

const sumLines = (lines) => lines.reduce((s, l) => s + l.amount, 0)

// A draft Final invoice as it stands right now, for display.
export function liveFinalInvoice(data, invoice) {
  const project = data.projects.find((p) => p.quoteId === invoice.quoteId)
  if (!project) return invoice
  const lines = finalInvoiceLines(data, project)
  return {
    ...invoice,
    lines,
    amount: sumLines(lines),
    description: `Final payment for ${project.id} · ${project.name} (updates until handover)`,
  }
}

const notice = (text, invoiceId) => ({ text, module: 'invoices', recordId: invoiceId })

// --- Quotes ------------------------------------------------------------

export function onQuoteSaved(data, before, quote) {
  const today = todayIso()
  const total = quoteTotals(quote).total
  const advanceAmount = Math.round(total * ADVANCE_SHARE)
  const description = `Advance payment: ${ADVANCE_SHARE * 100}% of quotation ${quote.id} (${money(total)})`
  const advance = data.invoices.find((i) => i.quoteId === quote.id && i.type === 'Advance' && !i.cancelled)
  const unpaid = advance && amountPaid(advance) === 0
  let invoices = data.invoices
  const notices = []
  const put = (inv) => (invoices = invoices.map((i) => (i.id === inv.id ? inv : i)))

  if (quote.status === 'Approved') {
    if (!advance) {
      const created = {
        id: nextInvoiceId(invoices),
        type: 'Advance',
        quoteId: quote.id,
        saleId: '',
        date: today,
        dueDate: addDays(today, 7),
        description,
        amount: advanceAmount,
        draft: false,
        cancelled: false,
        payments: [],
      }
      invoices = [created, ...invoices]
      notices.push(notice(`${quote.id} approved: advance invoice ${created.id} issued for ${money(advanceAmount)}`, created.id))
    } else if (advance.draft) {
      put({ ...advance, draft: false, date: today, dueDate: addDays(today, 7), description, amount: unpaid ? advanceAmount : advance.amount })
      notices.push(notice(`${quote.id} approved again: advance invoice ${advance.id} re-issued`, advance.id))
    } else if (unpaid && advance.amount !== advanceAmount) {
      // The quote was edited while approved; an unpaid advance follows it.
      put({ ...advance, description, amount: advanceAmount })
      notices.push(notice(`${quote.id} changed: advance invoice ${advance.id} updated to ${money(advanceAmount)}`, advance.id))
    }
  } else if (before?.status === 'Approved' && advance && !advance.draft && unpaid) {
    put({ ...advance, draft: true })
    notices.push(notice(`${quote.id} is no longer approved: advance invoice ${advance.id} moved back to draft`, advance.id))
  }
  return { invoices, notices }
}

// Why a quote can't stop being approved, or null if it can.
export function quoteApprovalLock(data, quote) {
  if (data.projects.some((p) => p.quoteId === quote.id)) return 'A project has already started from this quote.'
  const advance = data.invoices.find((i) => i.quoteId === quote.id && i.type === 'Advance' && !i.cancelled)
  if (advance && amountPaid(advance) > 0) return `The client has already paid towards ${advance.id}.`
  return null
}

// --- Projects ----------------------------------------------------------

export function onProjectAdded(data, project) {
  const exists = data.invoices.some((i) => i.quoteId === project.quoteId && i.type === 'Final' && !i.cancelled)
  if (exists) return { invoices: data.invoices, notices: [] }
  const created = {
    id: nextInvoiceId(data.invoices),
    type: 'Final',
    quoteId: project.quoteId,
    saleId: '',
    date: '',
    dueDate: '',
    description: '',
    amount: 0,
    draft: true,
    cancelled: false,
    payments: [],
  }
  return {
    invoices: [created, ...data.invoices],
    notices: [notice(`${project.id} started: final invoice ${created.id} opened as a draft`, created.id)],
  }
}

export function onProjectSaved(data, before, project) {
  const final = data.invoices.find((i) => i.quoteId === project.quoteId && i.type === 'Final' && !i.cancelled)
  const wasDone = before?.stages.handover.status === 'Done'
  const isDone = project.stages.handover.status === 'Done'
  if (!final || wasDone === isDone) return { invoices: data.invoices, notices: [] }

  const today = todayIso()
  const put = (inv) => data.invoices.map((i) => (i.id === inv.id ? inv : i))

  if (isDone && final.draft) {
    // Freeze today's figures onto the invoice and issue it.
    const lines = finalInvoiceLines({ ...data, projects: data.projects.map((p) => (p.id === project.id ? project : p)) }, project)
    const amount = sumLines(lines)
    return {
      invoices: put({
        ...final,
        draft: false,
        lines,
        amount,
        date: today,
        dueDate: addDays(today, 7),
        description: `Final payment for ${project.id} · ${project.name}`,
      }),
      notices: [notice(`${project.id} handed over: final invoice ${final.id} issued for ${money(amount)}`, final.id)],
    }
  }
  if (!isDone && !final.draft && amountPaid(final) === 0) {
    return {
      invoices: put({ ...final, draft: true, lines: undefined, date: '', dueDate: '' }),
      notices: [notice(`${project.id} handover reopened: final invoice ${final.id} back to draft`, final.id)],
    }
  }
  return { invoices: data.invoices, notices: [] }
}

// --- POS ---------------------------------------------------------------

export function onSaleCompleted(data, sale) {
  const invoice = posSaleAsInvoice(sale, nextInvoiceId(data.invoices), nextPaymentId(data.invoices))
  return {
    invoices: [invoice, ...data.invoices],
    notices: [notice(`Sale ${sale.id}: invoice ${invoice.id} created and paid (${money(invoice.amount)})`, invoice.id)],
  }
}
