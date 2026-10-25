import { useState } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useData } from '../data/DataContext.jsx'
import { LEAD_SOURCES, STATUSES, SITE_LABELS, validateClient, cleanClient } from './clientFields.js'
import { branches } from '../modules.js'

function Field({ label, error, hint, wide, children }) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

export default function ClientForm({ initial, isNew, onCancel, onSave }) {
  const { clients } = useData()
  const [form, setForm] = useState(initial)
  const [submitted, setSubmitted] = useState(false)

  const errors = validateClient(form, clients, isNew)
  const errorFor = (key) => (submitted ? errors[key] : undefined)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const setSite = (index, key) => (e) =>
    setForm({
      ...form,
      sites: form.sites.map((s, i) => (i === index ? { ...s, [key]: e.target.value } : s)),
    })

  const addSite = () => setForm({ ...form, sites: [...form.sites, { label: 'Home', address: '', city: '' }] })
  const removeSite = (index) => setForm({ ...form, sites: form.sites.filter((_, i) => i !== index) })

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length === 0) onSave(cleanClient(form))
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        {isNew ? 'Clients' : initial.name}
      </button>

      <PageHeader title={isNew ? 'New client' : 'Edit client'} subtitle={isNew ? undefined : initial.id}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" form="client-form" className="btn btn-primary">
          {isNew ? 'Add client' : 'Save changes'}
        </button>
      </PageHeader>

      {submitted && Object.keys(errors).length > 0 && (
        <div className="form-alert">Some details need fixing before this can be saved.</div>
      )}

      <form id="client-form" className="form" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <h2>Client</h2>
          <div className="form-grid">
            <Field
              label="Client ID"
              error={errorFor('id')}
              hint={isNew ? 'Format CL-0000. The next free number is filled in.' : 'The ID can’t be changed once saved.'}
            >
              <input value={form.id} onChange={set('id')} readOnly={!isNew} aria-invalid={!!errorFor('id')} />
            </Field>
            <Field label="Name" error={errorFor('name')}>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Mrs. Nadeeka Perera"
                aria-invalid={!!errorFor('name')}
              />
            </Field>
            <Field label="Branch" error={errorFor('branch')} hint="The branch that handles this client.">
              <select value={form.branch} onChange={set('branch')} aria-invalid={!!errorFor('branch')}>
                {branches.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Contact</h2>
          <div className="form-grid">
            <Field label="Phone" error={errorFor('phone')} hint="Mobile or landline, e.g. 077 123 4567.">
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                aria-invalid={!!errorFor('phone')}
              />
            </Field>
            <Field label="Email (optional)" error={errorFor('email')}>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="name@gmail.com"
                aria-invalid={!!errorFor('email')}
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Site addresses</h2>
          <p className="form-help">Where the work happens. A client can have more than one, e.g. a home and an office.</p>

          {form.sites.map((site, i) => (
            <div key={i} className="site-row">
              <Field label="Type">
                <select value={site.label} onChange={setSite(i, 'label')}>
                  {SITE_LABELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Street address" error={errorFor(`sites.${i}.address`)}>
                <input
                  value={site.address}
                  onChange={setSite(i, 'address')}
                  placeholder="e.g. 14 Lake Road"
                  aria-invalid={!!errorFor(`sites.${i}.address`)}
                />
              </Field>
              <Field label="Town / city" error={errorFor(`sites.${i}.city`)}>
                <input
                  value={site.city}
                  onChange={setSite(i, 'city')}
                  placeholder="e.g. Nugegoda"
                  aria-invalid={!!errorFor(`sites.${i}.city`)}
                />
              </Field>
              <button
                type="button"
                className="icon-button site-remove"
                onClick={() => removeSite(i)}
                aria-label="Remove this address"
                title="Remove this address"
              >
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>
          ))}

          <button type="button" className="btn btn-ghost" onClick={addSite}>
            <Plus size={15} strokeWidth={1.75} />
            Add another address
          </button>
        </section>

        <section className="form-section">
          <h2>Lead and status</h2>
          <div className="form-grid">
            <Field label="Lead source" hint="How the client found the studio.">
              <select value={form.leadSource} onChange={set('leadSource')}>
                {LEAD_SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Status" hint="Lead: enquiring. Active: work going on. Past: work finished.">
              <select value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Follow-up</h2>
          <div className="form-grid">
            <Field label="Follow-up date (optional)" hint="When to contact this client next.">
              <input type="date" value={form.followUp} onChange={set('followUp')} />
            </Field>
            <Field label="Notes" wide>
              <textarea
                rows={4}
                value={form.notes}
                onChange={set('notes')}
                placeholder="What they want, preferences, anything to remember."
              />
            </Field>
          </div>
        </section>
      </form>
    </>
  )
}
