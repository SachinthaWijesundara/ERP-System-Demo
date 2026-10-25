import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import Card from '../components/Card.jsx'
import FileGallery, { UploadButton, filesToRecords } from '../components/FileGallery.jsx'
import { useData } from '../data/DataContext.jsx'
import { materialStatusChanged } from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { UNITS } from '../quotations/quoteFields.js'
import { MATERIAL_STATUSES, materialsCost } from './projectFields.js'

// The sections under the stage panel: materials, measurements, photos and
// notes. Each gets the project and `onChange` for saving a new version of it.

export function MaterialsCard({ project, onChange }) {
  const data = useData()
  const [draft, setDraft] = useState(null)

  const setStatus = (i, status) => {
    materialStatusChanged(data, project, project.materials[i], status)
    onChange({ ...project, materials: project.materials.map((m, j) => (j === i ? { ...m, status } : m)) })
  }

  function addDraft() {
    if (!draft.product.trim() || !(Number(draft.qty) > 0)) return
    const material = { ...draft, product: draft.product.trim(), qty: Number(draft.qty), unitCost: Number(draft.unitCost) || 0 }
    onChange({ ...project, materials: [...project.materials, material] })
    setDraft(null)
  }

  return (
    <Card
      title="Materials"
      count={project.materials.length}
      actions={
        !draft && (
          <button
            type="button"
            className="btn btn-small"
            onClick={() => setDraft({ product: '', description: '', qty: 1, unit: 'sqft', unitCost: 0, status: 'Pending' })}
          >
            <Plus size={14} strokeWidth={1.75} />
            Add material
          </button>
        )
      }
    >
      <p className="card-intro">
        Copied from the quote. <strong>Reserved</strong> means set aside in the store; <strong>Issued</strong> means taken to
        site and used. Inventory will follow these changes once it’s connected.
      </p>

      {project.materials.length > 0 && (
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Material</th>
              <th className="num">Qty</th>
              <th className="num">Unit cost</th>
              <th className="num">Cost</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {project.materials.map((m, i) => (
              <tr key={i}>
                <td className="wrap">
                  <div className="cell-main">{m.product}</div>
                  {m.description && <div className="cell-sub">{m.description}</div>}
                </td>
                <td className="num">
                  {Number(m.qty).toLocaleString('en-LK')} {m.unit}
                </td>
                <td className="num">{m.unitCost ? formatMoney(m.unitCost) : '—'}</td>
                <td className="num">{m.unitCost ? formatMoney(m.qty * m.unitCost) : '—'}</td>
                <td>
                  <select
                    className={`status-select status-${m.status.toLowerCase()}`}
                    value={m.status}
                    onChange={(e) => setStatus(i, e.target.value)}
                    aria-label={`Status of ${m.product}`}
                  >
                    {MATERIAL_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="num">
                  <button
                    type="button"
                    className="icon-button icon-button-quiet"
                    aria-label={`Remove ${m.product}`}
                    onClick={() => onChange({ ...project, materials: project.materials.filter((_, j) => j !== i) })}
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Materials cost</td>
              <td className="num cell-main">{formatMoney(materialsCost(project))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      )}

      {draft && (
        <div className="inline-add inline-add-material">
          <input value={draft.product} onChange={(e) => setDraft({ ...draft, product: e.target.value })} placeholder="Material" aria-label="Material" autoFocus />
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" aria-label="Description" />
          <input type="number" min="0" className="num" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} aria-label="Quantity" />
          <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} aria-label="Unit">
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          <input type="number" min="0" className="num" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} aria-label="Unit cost" />
          <button type="button" className="btn btn-primary btn-small" onClick={addDraft}>
            Add
          </button>
          <button type="button" className="btn btn-small" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      )}
    </Card>
  )
}

export function MeasurementsCard({ project, onChange }) {
  const blank = { area: '', dimensions: '', value: '', unit: 'sqft' }
  const [draft, setDraft] = useState(blank)

  function add(e) {
    e.preventDefault()
    if (!draft.area.trim()) return
    onChange({ ...project, measurements: [...project.measurements, { ...draft, area: draft.area.trim(), value: Number(draft.value) || 0 }] })
    setDraft(blank)
  }

  return (
    <Card title="Measurements" count={project.measurements.length}>
      {project.measurements.length > 0 && (
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Area</th>
              <th>Dimensions</th>
              <th className="num">Size</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {project.measurements.map((m, i) => (
              <tr key={i}>
                <td className="cell-main">{m.area}</td>
                <td className="wrap">{m.dimensions}</td>
                <td className="num">
                  {m.value ? `${Number(m.value).toLocaleString('en-LK')} ${m.unit}` : '—'}
                </td>
                <td className="num">
                  <button
                    type="button"
                    className="icon-button icon-button-quiet"
                    aria-label={`Remove ${m.area}`}
                    onClick={() => onChange({ ...project, measurements: project.measurements.filter((_, j) => j !== i) })}
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="inline-add inline-add-measure" onSubmit={add}>
        <input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder="Area, e.g. Living room" aria-label="Area" />
        <input value={draft.dimensions} onChange={(e) => setDraft({ ...draft, dimensions: e.target.value })} placeholder="e.g. 25 ft × 18 ft" aria-label="Dimensions" />
        <input type="number" min="0" className="num" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="Size" aria-label="Size" />
        <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} aria-label="Unit">
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-small">
          <Plus size={14} strokeWidth={1.75} />
          Add
        </button>
      </form>
    </Card>
  )
}

export function PhotosCard({ project, onChange }) {
  return (
    <Card
      title="Photos"
      count={project.photos.length}
      actions={
        <UploadButton
          label="Add photos"
          accept="image/*"
          onFiles={(files) => onChange({ ...project, photos: [...project.photos, ...filesToRecords(files)] })}
        />
      }
    >
      <FileGallery
        files={project.photos}
        onRemove={(id) => onChange({ ...project, photos: project.photos.filter((p) => p.id !== id) })}
        empty="No photos yet. Add before, during and after photos from the site."
      />
    </Card>
  )
}

export function NotesCard({ project, onChange }) {
  const [author, setAuthor] = useState(project.designer)
  const [text, setText] = useState('')

  function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    const note = { date: todayIso(), author: author.trim() || 'Studio', text: text.trim() }
    onChange({ ...project, notes: [note, ...project.notes] })
    setText('')
  }

  return (
    <Card title="Notes" count={project.notes.length}>
      <form className="note-form" onSubmit={add}>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for the team…" aria-label="Note" />
        <div className="note-form-row">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" aria-label="Written by" />
          <button type="submit" className="btn btn-small">
            Add note
          </button>
        </div>
      </form>
      {project.notes.length > 0 && (
        <ul className="note-list">
          {project.notes.map((n, i) => (
            <li key={i}>
              <div className="note-meta">
                <span className="cell-main">{n.author}</span>
                <span className="cell-sub">{formatDate(n.date)}</span>
              </div>
              <p>{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
