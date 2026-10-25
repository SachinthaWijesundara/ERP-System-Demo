import { useState } from 'react'
import { CheckCircle2, Plus, X } from 'lucide-react'
import Field from '../components/Field.jsx'
import FileGallery, { UploadButton, filesToRecords } from '../components/FileGallery.jsx'
import { useData } from '../data/DataContext.jsx'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { applyStageEffects } from './stageEffects.js'
import {
  STAGES,
  STAGE_STATUSES,
  DESIGN_FILE_KINDS,
  completeStage,
  installationCost,
  warrantyInfo,
} from './projectFields.js'

const APPROVAL_METHODS = [
  'Signed approval letter',
  'Approved by email',
  'Approved on WhatsApp',
  'Approved on site',
  'Approved at the showroom',
]

// --- One component per stage. Each gets the stage's data and `set`, which
// merges changes into that stage. Changes save as they're made. ---

function SiteVisit({ stage, set }) {
  return (
    <div className="form-grid">
      <Field label="Visit date">
        <input type="date" value={stage.date} onChange={(e) => set({ date: e.target.value })} />
      </Field>
      <Field label="Visited by">
        <input value={stage.visitedBy} onChange={(e) => set({ visitedBy: e.target.value })} placeholder="Designer’s name" />
      </Field>
      <Field label="What was found" wide hint="Measurements and site photos go in their own sections below.">
        <textarea
          rows={3}
          value={stage.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Condition of the site, access, anything that affects the design."
        />
      </Field>
    </div>
  )
}

function Design({ stage, set }) {
  const [kind, setKind] = useState(DESIGN_FILE_KINDS[0])
  return (
    <>
      <div className="stage-toolbar">
        <span className="field-label">Plans, renders and photos</span>
        <div className="stage-toolbar-actions">
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type of file">
            {DESIGN_FILE_KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <UploadButton
            label="Add files"
            accept="image/*,.pdf,.dwg,.skp"
            onFiles={(files) => set({ files: [...stage.files, ...filesToRecords(files, { kind })] })}
          />
        </div>
      </div>
      <FileGallery
        files={stage.files}
        onRemove={(id) => set({ files: stage.files.filter((f) => f.id !== id) })}
        empty="No design files yet. Pick a type, then add plans, 3D renders or photos."
      />
      <div className="form-grid stage-fields">
        <Field label="Design finished on">
          <input type="date" value={stage.completedOn} onChange={(e) => set({ completedOn: e.target.value })} />
        </Field>
        <Field label="Design notes" wide>
          <textarea rows={3} value={stage.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Finishes, colours, layout decisions." />
        </Field>
      </div>
    </>
  )
}

function Approval({ stage, set, client, onApprove }) {
  const approved = stage.status === 'Done'
  return (
    <>
      <div className={`approval-banner${approved ? ' is-approved' : ''}`}>
        {approved ? (
          <>
            <CheckCircle2 size={18} strokeWidth={1.75} />
            <div>
              <strong>Design approved</strong>
              <div className="cell-sub">
                {[stage.approvedBy, stage.method, formatDate(stage.approvedOn)].filter(Boolean).join(' · ')}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <strong>Waiting for the client’s approval</strong>
              <div className="cell-sub">Record how they approved, attach the letter if there is one, then mark it approved.</div>
            </div>
            <button type="button" className="btn btn-primary" onClick={onApprove}>
              <CheckCircle2 size={15} strokeWidth={1.75} />
              Mark as approved
            </button>
          </>
        )}
      </div>

      <div className="form-grid stage-fields">
        <Field label="Approved by">
          <input value={stage.approvedBy} onChange={(e) => set({ approvedBy: e.target.value })} placeholder={client?.name ?? 'Client’s name'} />
        </Field>
        <Field label="How it was approved">
          <select value={stage.method} onChange={(e) => set({ method: e.target.value })}>
            <option value="">Choose…</option>
            {APPROVAL_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Approved on">
          <input type="date" value={stage.approvedOn} onChange={(e) => set({ approvedOn: e.target.value })} />
        </Field>
      </div>

      <div className="stage-toolbar">
        <span className="field-label">Approval letter</span>
        <UploadButton
          label={stage.letter ? 'Replace letter' : 'Attach letter'}
          accept="image/*,.pdf"
          multiple={false}
          onFiles={(files) => set({ letter: filesToRecords(files, { kind: 'Approval letter' })[0] })}
        />
      </div>
      <FileGallery
        files={stage.letter ? [stage.letter] : []}
        onRemove={() => set({ letter: null })}
        empty="No letter attached. A scan or photo of the signed letter can go here."
      />

      <Field label="Notes" wide className="stage-fields">
        <textarea rows={2} value={stage.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Changes the client asked for, conditions." />
      </Field>
    </>
  )
}

function Materials({ stage, set, project }) {
  const count = (s) => project.materials.filter((m) => m.status === s).length
  return (
    <>
      <div className="stat-row">
        <div>
          <div className="stat-value">{count('Pending')}</div>
          <div className="cell-sub">Pending</div>
        </div>
        <div>
          <div className="stat-value">{count('Reserved')}</div>
          <div className="cell-sub">Reserved in store</div>
        </div>
        <div>
          <div className="stat-value">{count('Issued')}</div>
          <div className="cell-sub">Issued to site</div>
        </div>
      </div>
      <div className="form-grid stage-fields">
        <Field label="Needed on site by">
          <input type="date" value={stage.neededBy} onChange={(e) => set({ neededBy: e.target.value })} />
        </Field>
        <Field label="Notes" wide hint="The full list, with reserve and issue status, is in Materials below.">
          <textarea rows={2} value={stage.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Supplier dates, substitutions." />
        </Field>
      </div>
    </>
  )
}

function Installation({ stage, set, project }) {
  const setCost = (i, patch) => set({ costs: stage.costs.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  return (
    <>
      <div className="form-grid">
        <Field label="Installation starts">
          <input type="date" value={stage.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </Field>
        <Field label="Installation ends">
          <input type="date" value={stage.endDate} onChange={(e) => set({ endDate: e.target.value })} />
        </Field>
      </div>

      <div className="team-chips">
        <span className="field-label">Team on site</span>
        {project.team.length ? (
          project.team.map((name) => (
            <span key={name} className="chip">
              {name}
            </span>
          ))
        ) : (
          <span className="cell-sub">No team set. Add people with Edit project.</span>
        )}
      </div>

      <div className="stage-toolbar">
        <span className="field-label">Installation costs</span>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => set({ costs: [...stage.costs, { description: '', amount: 0, billable: false }] })}
        >
          <Plus size={14} strokeWidth={1.75} />
          Add cost
        </button>
      </div>
      {stage.costs.length === 0 ? (
        <p className="card-empty">No costs yet, e.g. wages, transport, hired tools.</p>
      ) : (
        <div className="cost-list">
          <p className="cell-sub cost-help">
            Tick “Charge client” for extra work the client pays for; it’s added to the project’s final invoice.
          </p>
          {stage.costs.map((c, i) => (
            <div key={i} className="cost-row">
              <input value={c.description} onChange={(e) => setCost(i, { description: e.target.value })} placeholder="e.g. Installer wages" aria-label="Cost" />
              <input
                type="number"
                min="0"
                className="num"
                value={c.amount}
                onChange={(e) => setCost(i, { amount: e.target.value })}
                aria-label="Amount in LKR"
              />
              <label className="charge-toggle">
                <input type="checkbox" checked={!!c.billable} onChange={(e) => setCost(i, { billable: e.target.checked })} />
                Charge client
              </label>
              <button type="button" className="icon-button" aria-label="Remove cost" onClick={() => set({ costs: stage.costs.filter((_, j) => j !== i) })}>
                <X size={15} strokeWidth={1.75} />
              </button>
            </div>
          ))}
          <div className="cost-total">
            <span>Total installation cost</span>
            <strong>{formatMoney(installationCost(project))}</strong>
          </div>
        </div>
      )}

      <Field label="Notes" wide className="stage-fields">
        <textarea rows={2} value={stage.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Daily progress, problems on site." />
      </Field>
    </>
  )
}

// Under the warranty field: when it ends, once the handover is done and dated.
function warrantyHint(project) {
  const w = warrantyInfo(project, todayIso())
  if (!w) return 'Starts on the actual handover date.'
  if (!w.expires) return 'No warranty.'
  return `${w.active ? 'Active, ends' : 'Expired on'} ${formatDate(w.expires)}.`
}

function Handover({ stage, set, client, project, onComplete }) {
  const setItem = (i, patch) => set({ checklist: stage.checklist.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const doneCount = stage.checklist.filter((c) => c.done).length
  return (
    <>
      <div className="form-grid form-grid-4">
        <Field label="Planned handover">
          <input type="date" value={stage.plannedDate} onChange={(e) => set({ plannedDate: e.target.value })} />
        </Field>
        <Field label="Actual handover">
          <input type="date" value={stage.actualDate} onChange={(e) => set({ actualDate: e.target.value })} />
        </Field>
        <Field label="Received by">
          <input value={stage.receivedBy} onChange={(e) => set({ receivedBy: e.target.value })} placeholder={client?.name ?? 'Client’s name'} />
        </Field>
        <Field label="Warranty (months)" hint={warrantyHint(project)}>
          <input type="number" min="0" className="num" value={stage.warrantyMonths} onChange={(e) => set({ warrantyMonths: e.target.value })} />
        </Field>
      </div>

      <div className="stage-toolbar">
        <span className="field-label">
          Handover checklist <span className="cell-sub">· {doneCount} of {stage.checklist.length} done</span>
        </span>
        <button type="button" className="btn btn-small" onClick={() => set({ checklist: [...stage.checklist, { item: '', done: false }] })}>
          <Plus size={14} strokeWidth={1.75} />
          Add item
        </button>
      </div>
      <ul className="checklist">
        {stage.checklist.map((c, i) => (
          <li key={i} className={c.done ? 'is-done' : ''}>
            <input type="checkbox" checked={c.done} onChange={(e) => setItem(i, { done: e.target.checked })} aria-label="Done" />
            <input value={c.item} onChange={(e) => setItem(i, { item: e.target.value })} placeholder="Checklist item" aria-label="Checklist item" />
            <button type="button" className="icon-button" aria-label="Remove item" onClick={() => set({ checklist: stage.checklist.filter((_, j) => j !== i) })}>
              <X size={15} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>

      <Field label="Notes" wide className="stage-fields">
        <textarea rows={2} value={stage.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything left to finish, client feedback." />
      </Field>

      {stage.status !== 'Done' && (
        <div className="stage-foot">
          <button type="button" className="btn btn-primary" onClick={onComplete}>
            <CheckCircle2 size={15} strokeWidth={1.75} />
            Complete handover
          </button>
        </div>
      )}
    </>
  )
}

const BODIES = {
  siteVisit: SiteVisit,
  design: Design,
  approval: Approval,
  materials: Materials,
  installation: Installation,
  handover: Handover,
}

// The open stage: its status, a button to finish it, and its own details.
// `onChange(project, movements)` saves the project and any stock moves.
export default function StagePanel({ project, stageKey, client, onChange }) {
  const data = useData()
  const [message, setMessage] = useState(null)
  const meta = STAGES.find((s) => s.key === stageKey)
  const index = STAGES.indexOf(meta)
  const stage = project.stages[stageKey]
  const Body = BODIES[stageKey]
  const today = todayIso()

  const set = (patch) => onChange({ ...project, stages: { ...project.stages, [stageKey]: { ...stage, ...patch } } })

  // Finishing a stage can reserve or issue the project's materials too.
  const finish = (patch = {}) => {
    const withPatch = { ...project, stages: { ...project.stages, [stageKey]: { ...stage, ...patch } } }
    const effects = applyStageEffects(data, project, completeStage(withPatch, stageKey, today))
    if (effects.blocked) {
      setMessage({ tone: 'error', text: effects.blocked, details: effects.warnings })
      return
    }
    setMessage(effects.warnings.length ? { tone: 'warn', text: 'Some materials couldn’t be reserved:', details: effects.warnings } : null)
    onChange(effects.project, effects.movements)
  }

  return (
    <section className="card stage-panel">
      <header className="card-head stage-head">
        <div>
          <div className="cell-sub">
            Stage {index + 1} of {STAGES.length}
          </div>
          <h2>{meta.label}</h2>
        </div>
        <div className="card-actions">
          <div className="segmented" role="group" aria-label="Stage status">
            {STAGE_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={stage.status === s ? 'is-active' : ''}
                onClick={() => (s === 'Done' ? finish() : set({ status: s }))}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="card-body stage-body">
        {message && (
          <div className={message.tone === 'error' ? 'form-alert' : 'stage-warning'}>
            {message.text}
            <ul>
              {message.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}
        {(stageKey === 'approval' || stageKey === 'materials') && stage.status !== 'Done' && (
          <p className="cell-sub stage-stock-note">
            {stageKey === 'approval'
              ? 'Approving reserves this project’s pending materials in Inventory.'
              : 'Marking this stage done issues every material: the stock leaves the store.'}
          </p>
        )}
        <Body
          stage={stage}
          set={set}
          project={project}
          client={client}
          onApprove={() =>
            finish({
              approvedOn: stage.approvedOn || today,
              approvedBy: stage.approvedBy || client?.name || '',
            })
          }
          onComplete={() =>
            finish({
              actualDate: stage.actualDate || today,
              receivedBy: stage.receivedBy || client?.name || '',
            })
          }
        />
        <p className="autosave-note">Changes save as you type.</p>
      </div>
    </section>
  )
}
