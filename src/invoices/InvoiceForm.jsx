import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import { projectBilling, clientForProject, invoicesForProject } from '../data/links.js'
import { formatMoney } from '../utils/format.js'
import { currentStageLabel } from '../projects/projectFields.js'
import {
  RAISED_TYPES,
  addDays,
  suggestedAmount,
  suggestedDescription,
  validateInvoice,
} from './invoiceFields.js'

// Raises an advance, progress or final invoice for a project. The project's
// quote sets the contract value, so the form suggests the amount and stops
// the studio billing more than the quote.
export default function InvoiceForm({ initial, onCancel, onSave }) {
  const data = useData()
  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)

  const billing = projectBilling(data, form.projectId)
  const client = billing.project ? clientForProject(data, billing.project) : null
  const errors = validateInvoice(form, data.invoices, billing)
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const invalid = (key) => !!errorFor(key)

  // Picking a project or a type fills in the suggested amount and wording.
  function choose(patch) {
    const next = { ...form, ...patch }
    const b = projectBilling(data, next.projectId)
    const project = b.project
    setForm({
      ...next,
      amount: suggestedAmount(next.type, b),
      description: suggestedDescription(next.type, b),
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length === 0) {
      // The invoice keeps only the quote; the project is found through it.
      // eslint-disable-next-line no-unused-vars
      const { projectId, ...invoice } = form
      onSave({
        ...invoice,
        quoteId: billing.project.quoteId,
        amount: Number(form.amount),
        description: form.description.trim(),
      })
    }
  }

  const openProjects = data.projects.filter((p) => projectBilling(data, p.id).remaining > 0)
  const raised = form.projectId ? invoicesForProject(data, form.projectId) : []

  return (
    <>
      <button type="button" className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        Invoices and payments
      </button>

      <PageHeader title="Raise invoice" subtitle={form.id}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" form="invoice-form" className="btn btn-primary">
          Raise invoice
        </button>
      </PageHeader>

      {submitted && Object.keys(errors).length > 0 && (
        <div className="form-alert">Some details need fixing before this invoice can be raised.</div>
      )}

      <form id="invoice-form" className="form" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <h2>What it’s for</h2>
          <div className="form-grid">
            <Field label="Project" error={errorFor('projectId')} hint="Only projects with part of the quote still to invoice.">
              <select value={form.projectId} onChange={(e) => choose({ projectId: e.target.value })} aria-invalid={invalid('projectId')}>
                <option value="">Choose a project…</option>
                {openProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name} ({currentStageLabel(p)})
                  </option>
                ))}
              </select>
            </Field>
            <div className="field">
              <span className="field-label">Type</span>
              <div className="segmented segmented-full" role="group" aria-label="Invoice type">
                {RAISED_TYPES.map((t) => (
                  <button key={t} type="button" className={form.type === t ? 'is-active' : ''} onClick={() => choose({ type: t })}>
                    {t}
                  </button>
                ))}
              </div>
              <span className="field-hint">
                Part-way through the job. Advance invoices are made when a quote is approved, and the final invoice is
                issued at handover, so only progress invoices are raised here.
              </span>
            </div>
          </div>

          {billing.project && (
            <div className="billing-strip">
              <div>
                <div className="fact-label">Client</div>
                <div className="fact-value">{client?.name}</div>
              </div>
              <div>
                <div className="fact-label">Quote {billing.quote?.id}</div>
                <div className="fact-value">{formatMoney(billing.quoteTotal)}</div>
              </div>
              <div>
                <div className="fact-label">Invoiced so far</div>
                <div className="fact-value">{formatMoney(billing.invoiced)}</div>
              </div>
              <div>
                <div className="fact-label">Left to invoice</div>
                <div className="fact-value">{formatMoney(billing.remaining)}</div>
              </div>
            </div>
          )}
          {raised.length > 0 && (
            <p className="form-help form-help-after">
              Already raised for this project:{' '}
              {raised.map((i) => `${i.id} (${i.type}, ${formatMoney(i.amount)})`).join(' · ')}
            </p>
          )}
        </section>

        <section className="form-section">
          <h2>Invoice</h2>
          <div className="form-grid form-grid-3">
            <Field label="Amount (LKR)" error={errorFor('amount')}>
              <input
                type="number"
                min="0"
                className="num"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                aria-invalid={invalid('amount')}
              />
            </Field>
            <Field label="Invoice date" error={errorFor('date')}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value, dueDate: addDays(e.target.value, 7) })}
                aria-invalid={invalid('date')}
              />
            </Field>
            <Field label="Due date" error={errorFor('dueDate')} hint="Seven days after the invoice by default.">
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} aria-invalid={invalid('dueDate')} />
            </Field>
            <Field label="Description" wide error={errorFor('description')} hint="Printed on the invoice.">
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-invalid={invalid('description')} />
            </Field>
          </div>
        </section>
      </form>
    </>
  )
}
