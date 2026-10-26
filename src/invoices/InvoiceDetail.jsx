import { useState } from 'react'
import { ArrowLeft, Printer, Download, User, Hammer, ShoppingBag, LayoutGrid, CheckCircle2, FileText } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Field from '../components/Field.jsx'
import Link from '../components/RecordLink.jsx'
import StaffLink, { staffName } from '../components/StaffLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  clientForInvoice,
  quoteForInvoice,
  saleForInvoice,
  projectForInvoice,
  invoiceBranch,
  invoiceStatus,
  amountPaid,
  invoiceBalance,
  projectBilling,
  invoicesForQuote,
} from '../data/links.js'
import { advanceDescription } from '../data/billing.js'
import { quoteTotals } from '../quotations/quoteFields.js'
import { formatMoney, todayIso } from '../utils/format.js'
import { printElement } from '../utils/printElement.js'
import { PAYMENT_METHODS, nextPaymentId, validatePayment, validateAdvance, addDays } from './invoiceFields.js'
import InvoiceDocument from './InvoiceDocument.jsx'

// The PDF library is large, so it only loads when a PDF is asked for.
async function pdf(kind, ...args) {
  const mod = await import('./invoicePdf.js')
  if (kind === 'invoice') mod.downloadInvoicePdf(...args)
  else mod.downloadPaymentReceipt(...args)
}

// A payment is put down to whoever is logged in.
function RecordPayment({ invoice }) {
  const data = useData()
  const auth = useAuth()
  const blank = () => ({
    date: todayIso(),
    amount: invoiceBalance(invoice),
    method: 'Bank transfer',
    reference: '',
    receivedById: auth.user.id,
  })
  const [form, setForm] = useState(blank)
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(null)

  const errors = validatePayment(form, invoice)
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  function save() {
    setSubmitted(true)
    if (Object.keys(errors).length) return
    const payment = {
      id: nextPaymentId(data.invoices),
      date: form.date,
      amount: Number(form.amount),
      method: form.method,
      reference: form.method === 'Cash' ? '' : form.reference.trim(),
      receivedById: auth.user.id,
    }
    data.updateInvoice({ ...invoice, payments: [...invoice.payments, payment] })
    setSaved(payment.id)
    setSubmitted(false)
    setForm({ ...blank(), amount: Math.max(0, invoiceBalance(invoice) - payment.amount) })
  }

  return (
    <Card title="Record a payment">
      <div className="form-grid">
        <Field label="Amount received" error={errorFor('amount')}>
          <input type="number" min="0" className="num" value={form.amount} onChange={(e) => patch({ amount: e.target.value })} aria-invalid={!!errorFor('amount')} />
        </Field>
        <Field label="Date" error={errorFor('date')}>
          <input type="date" value={form.date} max={todayIso()} onChange={(e) => patch({ date: e.target.value })} aria-invalid={!!errorFor('date')} />
        </Field>
      </div>
      <div className="field payment-method">
        <span className="field-label">Method</span>
        <div className="segmented segmented-full" role="group" aria-label="Payment method">
          {PAYMENT_METHODS.map((m) => (
            <button key={m} type="button" className={form.method === m ? 'is-active' : ''} onClick={() => patch({ method: m })}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="form-grid">
        {form.method !== 'Cash' && (
          <Field
            label={form.method === 'Cheque' ? 'Cheque no. and bank' : 'Reference'}
            error={errorFor('reference')}
            hint={form.method === 'Card' ? 'Optional, e.g. VISA •••• 4821' : undefined}
          >
            <input value={form.reference} onChange={(e) => patch({ reference: e.target.value })} aria-invalid={!!errorFor('reference')} />
          </Field>
        )}
        <Field label="Received by" error={errorFor('receivedBy')} hint="Whoever is logged in.">
          <div className="field-static">{auth.user.name}</div>
        </Field>
      </div>
      <div className="movement-foot">
        {saved && <span className="diff-ok">Saved as receipt {saved}.</span>}
        <button type="button" className="btn btn-primary" onClick={save}>
          Record payment
        </button>
      </div>
    </Card>
  )
}

// No advance is assumed: the studio enters what the client pays up front.
// Entering it issues the invoice; changing it later updates the invoice, and
// the project's draft final invoice takes off the new figure. Once the final
// invoice has been issued the advance stays as it was billed.
function AdvanceAmount({ invoice, quote }) {
  const data = useData()
  const [value, setValue] = useState(invoice.amount || '')
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState('')

  const quoteInvoices = invoicesForQuote(data, quote.id)
  const final = quoteInvoices.find((i) => i.type === 'Final' && !i.draft)
  const total = quoteTotals(quote).total
  // Progress invoices already issued also count against the quote.
  const billedElsewhere = quoteInvoices
    .filter((i) => i.id !== invoice.id && !i.draft && i.type !== 'Final')
    .reduce((sum, i) => sum + i.amount, 0)
  const error = validateAdvance(value, invoice, total - billedElsewhere)
  const issuing = invoice.draft

  if (final) {
    return (
      <Card title="Advance amount">
        <p className="cell-sub">The final invoice {final.id} has been issued, so the advance can’t change now.</p>
      </Card>
    )
  }

  function save() {
    setSubmitted(true)
    if (error) return
    const amount = Number(value)
    const today = todayIso()
    data.updateInvoice({
      ...invoice,
      amount,
      description: advanceDescription(quote),
      ...(issuing ? { draft: false, date: today, dueDate: addDays(today, 7) } : {}),
    })
    setSaved(issuing ? `Issued for ${formatMoney(amount)}.` : `Advance changed to ${formatMoney(amount)}.`)
    setSubmitted(false)
  }

  return (
    <Card title="Advance amount">
      <p className="card-intro">
        {issuing
          ? 'Enter the advance the client is paying. Saving it issues this invoice.'
          : 'Change it if the client pays a different advance. The project’s final invoice follows it.'}
      </p>
      <Field label="Advance (LKR)" error={submitted ? error : undefined} hint={`Quote ${quote.id} is ${formatMoney(total)}.`}>
        <input
          type="number"
          min="0"
          className="num"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved('')
          }}
          aria-invalid={submitted && !!error}
        />
      </Field>
      <div className="movement-foot">
        {saved && <span className="diff-ok">{saved}</span>}
        <button type="button" className="btn btn-primary" onClick={save}>
          {issuing ? 'Issue advance invoice' : 'Update amount'}
        </button>
      </div>
    </Card>
  )
}

// `onOpenRecord(module, id)` jumps to the client, quote, project, sale or
// staff member. Recording payments and cancelling need their own permission.
export default function InvoiceDetail({ invoiceId, justRaised, onBack, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const invoice = data.invoices.find((i) => i.id === invoiceId)
  if (!invoice) return null

  const client = clientForInvoice(data, invoice)
  const quote = quoteForInvoice(data, invoice)
  const project = projectForInvoice(data, invoice)
  const sale = saleForInvoice(data, invoice)
  const branch = invoiceBranch(data, invoice)
  const status = invoiceStatus(invoice)
  const billing = project ? projectBilling(data, project.id) : null
  // Advance, final and POS invoices are made by the system and are never
  // removed; only a hand-raised progress invoice with no payments can be.
  const automatic = invoice.type !== 'Progress'
  const canCancel = auth.can('invoices.cancel') && !automatic && !invoice.cancelled && invoice.payments.length === 0
  // An advance waiting for its amount: the quote is approved but nothing entered yet.
  const awaitingAdvance = invoice.type === 'Advance' && invoice.draft && quote?.status === 'Approved'
  const canSetAdvance =
    invoice.type === 'Advance' && !invoice.cancelled && quote?.status === 'Approved' && auth.can('invoices.raise')
  const open = (module, id) => () => onOpenRecord(module, id)

  const ctx = { client, project, branch, nameOf: (id) => staffName(data, id) }

  return (
    <>
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Invoices and payments
      </button>

      <PageHeader title={`Invoice ${invoice.id}`} subtitle={`${invoice.type} · ${client?.name ?? 'Walk-in'}`}>
        <Badge>{status}</Badge>
        <button
          type="button"
          className="btn"
          onClick={() => printElement(document.getElementById('invoice-document'), { title: invoice.id })}
        >
          <Printer size={14} strokeWidth={1.75} />
          Print invoice
        </button>
        <button type="button" className="btn" onClick={() => pdf('invoice', invoice, ctx)}>
          <Download size={14} strokeWidth={1.75} />
          Download PDF
        </button>
      </PageHeader>

      {justRaised && !invoice.cancelled && (
        <div className="success-banner">
          <CheckCircle2 size={18} strokeWidth={1.75} />
          <strong>Invoice {invoice.id} raised for {formatMoney(invoice.amount)}.</strong>
        </div>
      )}

      {invoice.draft && (
        <div className="stage-warning">
          {invoice.type === 'Final'
            ? 'Draft final invoice. It updates as the project changes (extra materials and work charged to the client) and is issued when the handover is marked done.'
            : awaitingAdvance
              ? `Draft. ${quote.id} is approved; enter the advance the client is paying to issue this invoice.`
              : `Draft. ${quote?.id ?? 'The quote'} is no longer approved, so this invoice isn’t owed. Approving the quote again re-issues it.`}
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          <InvoiceDocument
            invoice={invoice}
            onReceipt={auth.can('invoices.payments') ? (p) => pdf('receipt', invoice, p, ctx) : undefined}
            onOpenRecord={onOpenRecord}
          />
        </div>

        <aside className="detail-side">
          <Card title="Summary">
            <dl className="facts">
              <dt>Status</dt>
              <dd>
                <Badge>{status}</Badge>
              </dd>
              <dt>Amount</dt>
              <dd>{formatMoney(invoice.amount)}</dd>
              <dt>Paid</dt>
              <dd>{formatMoney(amountPaid(invoice))}</dd>
              <dt className="cell-main">Balance</dt>
              <dd className={`cell-main${invoiceBalance(invoice) > 0 ? ' is-owed' : ''}`}>{formatMoney(invoiceBalance(invoice))}</dd>
              <dt>Branch</dt>
              <dd>{branch ?? '—'}</dd>
            </dl>
          </Card>

          {canSetAdvance && <AdvanceAmount key={invoice.id} invoice={invoice} quote={quote} />}

          {auth.can('invoices.payments') && !invoice.cancelled && !invoice.draft && invoiceBalance(invoice) > 0 && (
            <RecordPayment key={`${invoice.id}-${invoice.amount}`} invoice={invoice} />
          )}

          {billing?.quote && (
            <Card title="Project billing">
              <dl className="facts">
                <dt>Quote {billing.quote.id}</dt>
                <dd>{formatMoney(billing.quoteTotal)}</dd>
                <dt>Invoiced so far</dt>
                <dd>{formatMoney(billing.invoiced)}</dd>
                <dt className="cell-main">Left to invoice</dt>
                <dd className="cell-main">{formatMoney(billing.remaining)}</dd>
              </dl>
            </Card>
          )}

          <Card title="Connections">
            <ul className="links-list">
              <li>
                <User size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Client</div>
                  {client ? (
                    <div>
                      <Link onClick={open('clients', client.id)}>
                        {client.name} · {client.id}
                      </Link>
                    </div>
                  ) : (
                    <div className="cell-sub">
                      {sale?.customer?.name ? `${sale.customer.name}, walk-in` : 'Walk-in customer'}, not a registered client.
                    </div>
                  )}
                </div>
              </li>
              {sale ? (
                // A POS invoice belongs to a counter sale, never to a quote or project.
                <li>
                  <ShoppingBag size={15} strokeWidth={1.75} />
                  <div>
                    <div className="links-title">POS sale</div>
                    <div>
                      <Link onClick={open('pos', sale.id)}>
                        {sale.id} · {sale.branch}
                      </Link>
                    </div>
                    <div className="cell-sub">
                      Paid at the counter, cashier <StaffLink id={sale.cashierId} onOpenRecord={onOpenRecord} />.
                    </div>
                  </div>
                </li>
              ) : (
                <>
                  <li>
                    <FileText size={15} strokeWidth={1.75} />
                    <div>
                      <div className="links-title">Quotation</div>
                      {quote ? (
                        <div>
                          <Link onClick={open('quotations', quote.id)}>
                            {quote.id} · {quote.title}
                          </Link>{' '}
                          <Badge>{quote.status}</Badge>
                        </div>
                      ) : (
                        <div className="cell-sub">No quotation.</div>
                      )}
                    </div>
                  </li>
                  <li>
                    <Hammer size={15} strokeWidth={1.75} />
                    <div>
                      <div className="links-title">Project</div>
                      {project ? (
                        <div>
                          <Link onClick={open('projects', project.id)}>
                            {project.id} · {project.name}
                          </Link>
                        </div>
                      ) : (
                        <div className="cell-sub">No project yet. One is started from the approved quote.</div>
                      )}
                    </div>
                  </li>
                </>
              )}
              <li>
                <LayoutGrid size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Dashboard</div>
                  <div className="cell-sub">
                    {auth.can('dashboard.view') && auth.can('dashboard.money') ? (
                      <Link onClick={() => onOpenRecord('dashboard')}>Counts in the dashboard’s money figures</Link>
                    ) : (
                      'Counts in the dashboard’s money figures.'
                    )}
                  </div>
                </div>
              </li>
            </ul>
          </Card>

          {canCancel && (
            <div className="cancel-box">
              {confirmCancel ? (
                <>
                  <p>Cancel {invoice.id}? It stays on record but no longer counts as owed.</p>
                  <div className="cancel-actions">
                    <button type="button" className="btn btn-danger" onClick={() => data.updateInvoice({ ...invoice, cancelled: true })}>
                      Yes, cancel it
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirmCancel(false)}>
                      Keep it
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="btn btn-ghost btn-danger-ghost" onClick={() => setConfirmCancel(true)}>
                  Cancel this invoice
                </button>
              )}
            </div>
          )}
          {!invoice.cancelled && (automatic || invoice.payments.length > 0) && (
            <p className="cell-sub">
              {automatic
                ? 'This invoice was made by the system and is never removed; it goes back to Draft instead.'
                : 'Invoices with payments can’t be cancelled. Refunds will be handled by an admin.'}
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
