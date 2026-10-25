import { useState } from 'react'
import { ArrowLeft, Printer, Download, User, Hammer, ShoppingBag, LayoutGrid, CheckCircle2 } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import Badge from '../components/Badge.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import {
  clientForInvoice,
  projectForInvoice,
  invoiceBranch,
  invoiceStatus,
  amountPaid,
  invoiceBalance,
  projectBilling,
} from '../data/links.js'
import { formatMoney, todayIso } from '../utils/format.js'
import { printElement } from '../utils/printElement.js'
import { DEMO_CASHIERS } from '../pos/posFields.js'
import { PAYMENT_METHODS, nextPaymentId, validatePayment } from './invoiceFields.js'
import InvoiceDocument from './InvoiceDocument.jsx'

// The PDF library is large, so it only loads when a PDF is asked for.
async function pdf(kind, ...args) {
  const mod = await import('./invoicePdf.js')
  if (kind === 'invoice') mod.downloadInvoicePdf(...args)
  else mod.downloadPaymentReceipt(...args)
}

function RecordPayment({ invoice, branch }) {
  const data = useData()
  const blank = () => ({
    date: todayIso(),
    amount: invoiceBalance(invoice),
    method: 'Bank transfer',
    reference: '',
    receivedBy: DEMO_CASHIERS[branch] ?? '',
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
      receivedBy: form.receivedBy.trim(),
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
        <Field label="Received by" error={errorFor('receivedBy')}>
          <input value={form.receivedBy} onChange={(e) => patch({ receivedBy: e.target.value })} aria-invalid={!!errorFor('receivedBy')} />
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

export default function InvoiceDetail({ invoiceId, justRaised, onBack }) {
  const data = useData()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const invoice = data.invoices.find((i) => i.id === invoiceId)
  if (!invoice) return null

  const client = clientForInvoice(data, invoice)
  const project = projectForInvoice(data, invoice)
  const branch = invoiceBranch(data, invoice)
  const status = invoiceStatus(invoice)
  const billing = invoice.projectId ? projectBilling(data, invoice.projectId) : null
  const canCancel = !invoice.cancelled && invoice.payments.length === 0

  const ctx = { client, project, branch }

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

      <div className="detail-grid">
        <div className="detail-main">
          <InvoiceDocument invoice={invoice} onReceipt={(p) => pdf('receipt', invoice, p, ctx)} />
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

          {!invoice.cancelled && invoiceBalance(invoice) > 0 && <RecordPayment invoice={invoice} branch={branch} />}

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
                  <div className="cell-sub">
                    {client ? `${client.name} · ${client.id}. This balance shows on their client page.` : 'Walk-in sale, no client record.'}
                  </div>
                </div>
              </li>
              <li>
                <Hammer size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Project</div>
                  <div className="cell-sub">
                    {project ? `${project.name} · ${project.id}. Shows in the project’s Money box.` : 'Not for a project.'}
                  </div>
                </div>
              </li>
              <li>
                <ShoppingBag size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">POS</div>
                  <div className="cell-sub">Not connected yet. Counter sales will arrive here as paid “POS sale” invoices.</div>
                </div>
              </li>
              <li>
                <LayoutGrid size={15} strokeWidth={1.75} />
                <div>
                  <div className="links-title">Dashboard</div>
                  <div className="cell-sub">Not connected yet. Outstanding, overdue and received totals will feed the dashboard.</div>
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
          {!invoice.cancelled && invoice.payments.length > 0 && (
            <p className="cell-sub">Invoices with payments can’t be cancelled. Refunds will be handled by an admin.</p>
          )}
        </aside>
      </div>
    </>
  )
}
