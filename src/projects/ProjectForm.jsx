import { useState } from 'react'
import { ArrowLeft, Plus, X } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Field from '../components/Field.jsx'
import { useData } from '../data/DataContext.jsx'
import {
  quotesReadyForProject,
  projectFromQuote,
  staffForProjects,
  clientForProject,
  clientForQuote,
} from '../data/links.js'
import { validateProject, cleanProject } from './projectFields.js'

const sameSite = (a, b) => a && b && a.address === b.address && a.city === b.city

// The main details of a project: who, where, which quote, who's on it, dates.
// Stage details, materials, photos and notes are edited on the project page.
export default function ProjectForm({ initial, isNew, onCancel, onSave }) {
  const data = useData()
  // `clientId` is only for the form's client picker. A saved project keeps
  // just its quote; its client is always the quote's client.
  const [form, setForm] = useState(() => ({
    ...initial,
    clientId: initial.clientId || clientForProject(data, initial)?.id || '',
    team: initial.team.length ? initial.team : [''],
  }))
  const [submitted, setSubmitted] = useState(false)

  const errors = validateProject(form, data.projects, isNew)
  const errorFor = (key) => (submitted ? errors[key] : undefined)
  const invalid = (key) => !!errorFor(key)

  const client = data.clients.find((c) => c.id === form.clientId)
  // Before a client is chosen, every approved quote without a project is
  // listed; picking one fills in its client.
  const readyQuotes = form.clientId
    ? quotesReadyForProject(data, form.clientId, initial.id)
    : data.clients.flatMap((c) => quotesReadyForProject(data, c.id))
  // A project always comes from an approved quote, so a new one can only be
  // for a registered client who has one. Editing keeps the saved client.
  const pickableClients = isNew
    ? data.clients.filter((c) => quotesReadyForProject(data, c.id).length > 0)
    : data.clients.filter((c) => c.id === form.clientId)
  const staff = staffForProjects(data)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  // Clears what the current quote filled in, keeping a name the user typed.
  function withoutQuote(f) {
    const quoteTitle = data.quotations.find((q) => q.id === f.quoteId)?.title
    return { ...f, quoteId: '', materials: [], name: f.name === quoteTitle ? '' : f.name }
  }

  // A client with only one approved quote waiting has nothing to choose
  // between, so that quote is picked straight away.
  function chooseClient(e) {
    const clientId = e.target.value
    const next = { ...withoutQuote(form), clientId, site: null }
    const waiting = clientId ? quotesReadyForProject(data, clientId) : []
    setForm(waiting.length === 1 ? projectFromQuote(next, waiting[0]) : next)
  }

  // Picking the source quote (only possible on a new project) fills in its
  // client and site, and its inventory lines as the starting materials list.
  function chooseQuote(e) {
    const quote = data.quotations.find((q) => q.id === e.target.value)
    const next = withoutQuote(form)
    setForm(quote ? projectFromQuote(next, quote) : next)
  }

  const siteIndex = client ? client.sites.findIndex((s) => sameSite(s, form.site)) : -1
  const keepsOldSite = form.site && siteIndex === -1

  const setTeam = (index) => (e) => setForm({ ...form, team: form.team.map((t, i) => (i === index ? e.target.value : t)) })

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(errors).length === 0) onSave(cleanProject(form))
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onCancel}>
        <ArrowLeft size={15} strokeWidth={1.75} />
        {isNew ? 'Projects' : initial.name}
      </button>

      <PageHeader title={isNew ? 'New project' : 'Edit project'} subtitle={isNew ? undefined : initial.id}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" form="project-form" className="btn btn-primary">
          {isNew ? 'Create project' : 'Save changes'}
        </button>
      </PageHeader>

      {submitted && Object.keys(errors).length > 0 && (
        <div className="form-alert">Some details need fixing before this can be saved.</div>
      )}

      <form id="project-form" className="form" onSubmit={handleSubmit} noValidate>
        <section className="form-section">
          <h2>Project</h2>
          <div className="form-grid">
            <Field
              label="Project no."
              error={errorFor('id')}
              hint={isNew ? 'Format PRJ-0000. The next free number is filled in.' : 'Can’t be changed once saved.'}
            >
              <input value={form.id} onChange={set('id')} readOnly={!isNew} aria-invalid={invalid('id')} />
            </Field>
            <Field label="Project name" error={errorFor('name')}>
              <input
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Perera residence"
                aria-invalid={invalid('name')}
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h2>Client, quote and site</h2>
          <div className="form-grid">
            <Field
              label="Client"
              error={errorFor('clientId')}
              hint={isNew ? 'Only clients with an approved quote waiting are listed.' : undefined}
            >
              <select value={form.clientId} onChange={chooseClient} disabled={!isNew} aria-invalid={invalid('clientId')}>
                <option value="">Choose a client…</option>
                {pickableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.name} ({c.branch})
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Source quote"
              error={errorFor('quoteId')}
              hint={
                client && readyQuotes.length === 0
                  ? 'This client has no approved quote without a project yet.'
                  : 'Only approved quotes without a project are listed.'
              }
            >
              <select value={form.quoteId} onChange={chooseQuote} disabled={!isNew} aria-invalid={invalid('quoteId')}>
                <option value="">Choose a quote…</option>
                {readyQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id} · {q.title}
                    {client ? '' : ` (${clientForQuote(data, q)?.name})`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Site" error={errorFor('site')} hint="Filled in from the quote. Change it if the work moved.">
              <select
                value={keepsOldSite ? 'saved' : siteIndex}
                onChange={(e) => e.target.value !== 'saved' && setForm({ ...form, site: client.sites[Number(e.target.value)] })}
                disabled={!client}
                aria-invalid={invalid('site')}
              >
                {!form.site && <option value={-1}>Choose a site…</option>}
                {keepsOldSite && (
                  <option value="saved">
                    {form.site.label}: {form.site.address}, {form.site.city}
                  </option>
                )}
                {client?.sites.map((s, i) => (
                  <option key={i} value={i}>
                    {s.label}: {s.address}, {s.city}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {isNew && form.materials.length > 0 && (
            <p className="form-help form-help-after">
              {form.materials.length === 1 ? '1 inventory item' : `${form.materials.length} inventory items`} on the quote
              will be copied into the project’s materials. Custom-made lines aren’t copied; add their boards and fittings
              from Inventory on the project page.
            </p>
          )}
        </section>

        <section className="form-section">
          <h2>People</h2>
          <p className="form-help">Typed in for now. These will be picked from a Staff list once that exists.</p>
          <div className="form-grid">
            <Field label="Designer">
              <input value={form.designer} onChange={set('designer')} list="staff-list" placeholder="e.g. Nimali Jayasinghe" />
            </Field>
            <div className="field">
              <span className="field-label">Installation team</span>
              {form.team.map((name, i) => (
                <div key={i} className="team-row">
                  <input value={name} onChange={setTeam(i)} list="staff-list" placeholder="Team member’s name" />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove team member"
                    onClick={() => setForm({ ...form, team: form.team.filter((_, j) => j !== i) })}
                  >
                    <X size={15} strokeWidth={1.75} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-start"
                onClick={() => setForm({ ...form, team: [...form.team, ''] })}
              >
                <Plus size={15} strokeWidth={1.75} />
                Add team member
              </button>
            </div>
          </div>
          <datalist id="staff-list">
            {staff.map((s) => (
              <option key={s.name} value={s.name} />
            ))}
          </datalist>
        </section>

        <section className="form-section">
          <h2>Dates</h2>
          <div className="form-grid">
            <Field label="Start date" error={errorFor('startDate')}>
              <input type="date" value={form.startDate} onChange={set('startDate')} aria-invalid={invalid('startDate')} />
            </Field>
            <Field label="Due date" error={errorFor('dueDate')} hint="When the client expects handover.">
              <input type="date" value={form.dueDate} onChange={set('dueDate')} aria-invalid={invalid('dueDate')} />
            </Field>
          </div>
        </section>
      </form>
    </>
  )
}
