import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import Card from '../components/Card.jsx'
import FileGallery, { UploadButton, filesToRecords } from '../components/FileGallery.jsx'
import { useData } from '../data/DataContext.jsx'
import { itemForMaterial, projectMaterialsCost, checkMaterialStatus, clientForProject } from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { UNITS } from '../quotations/quoteFields.js'
import { stockAt, nextMovementId, movementDelta } from '../inventory/inventoryFields.js'
import { MATERIAL_STATUSES } from './projectFields.js'

// The sections under the stage panel: materials, measurements, photos and
// notes. Each gets the project and `onChange` for saving a new version of it.

// Materials are Inventory items only. Each line stores the item's SKU, the
// quantity and its status; the name, unit and cost price come from Inventory.
// Changing a status reserves or uses real stock at the project's branch.
export function MaterialsCard({ project, onChange, onOpenRecord }) {
  const data = useData()
  const [draft, setDraft] = useState(null)
  const [problem, setProblem] = useState('')
  const branch = clientForProject(data, project)?.branch

  function setStatus(i, status) {
    const material = project.materials[i]
    const check = checkMaterialStatus(data, project, material, status)
    if (!check.ok) {
      setProblem(check.message)
      return
    }
    setProblem('')
    if (check.movement) {
      const movement = { ...check.movement, id: nextMovementId(data.movements) }
      data.recordMovement(movement, movementDelta(movement))
    }
    onChange({ ...project, materials: project.materials.map((m, j) => (j === i ? { ...m, status } : m)) })
  }

  // Items not already on the project, for the add picker.
  const onProject = new Set(project.materials.map((m) => m.sku))
  const choices = data.inventory.filter((i) => !onProject.has(i.sku))
  const draftItem = draft && data.inventory.find((i) => i.sku === draft.sku)

  function addDraft() {
    if (!draft.sku || !(Number(draft.qty) > 0)) {
      setProblem('Pick an inventory item and a quantity above 0.')
      return
    }
    setProblem('')
    onChange({ ...project, materials: [...project.materials, { sku: draft.sku, qty: Number(draft.qty), status: 'Pending' }] })
    setDraft(null)
  }

  return (
    <Card
      title="Materials"
      count={project.materials.length}
      actions={
        <>
          {project.materials.length > 0 && (
            <button
              type="button"
              className="btn btn-small"
              onClick={() =>
                onOpenRecord('inventory', null, {
                  skus: project.materials.map((m) => m.sku),
                  label: `${project.id} · ${project.name}`,
                })
              }
            >
              Show in Inventory
            </button>
          )}
          {!draft && (
            <button type="button" className="btn btn-small" onClick={() => setDraft({ sku: '', qty: 1 })}>
              <Plus size={14} strokeWidth={1.75} />
              Add material
            </button>
          )}
        </>
      }
    >
      <p className="card-intro">
        Every material is an Inventory item. <strong>Reserved</strong> holds the stock at {branch ?? 'the branch'} for this
        project so nobody else can sell it; <strong>Issued</strong> takes it out of the store to site.
      </p>

      {problem && <div className="form-alert">{problem}</div>}

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
            {project.materials.map((m, i) => {
              const item = itemForMaterial(data, m)
              return (
                <tr key={m.sku}>
                  <td className="wrap">
                    <div className="cell-main">
                      {item ? (
                        <button type="button" className="inline-link" onClick={() => onOpenRecord('inventory', item.sku)}>
                          {item.name}
                        </button>
                      ) : (
                        `${m.sku} (not in Inventory)`
                      )}
                    </div>
                    <div className="cell-sub">{m.sku}</div>
                  </td>
                  <td className="num">
                    {Number(m.qty).toLocaleString('en-LK')} {item?.unit}
                  </td>
                  <td className="num">{item ? formatMoney(item.costPrice) : '—'}</td>
                  <td className="num">{item ? formatMoney(m.qty * item.costPrice) : '—'}</td>
                  <td>
                    <select
                      className={`status-select status-${m.status.toLowerCase()}`}
                      value={m.status}
                      onChange={(e) => setStatus(i, e.target.value)}
                      aria-label={`Status of ${item?.name ?? m.sku}`}
                    >
                      {MATERIAL_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="num">
                    {/* Issued stock has been used on site, so it stays on the record. */}
                    {m.status !== 'Issued' && (
                      <button
                        type="button"
                        className="icon-button icon-button-quiet"
                        aria-label={`Remove ${item?.name ?? m.sku}`}
                        onClick={() => onChange({ ...project, materials: project.materials.filter((_, j) => j !== i) })}
                      >
                        <X size={14} strokeWidth={1.75} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Materials cost (Inventory cost prices)</td>
              <td className="num cell-main">{formatMoney(projectMaterialsCost(data, project))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      )}

      {draft && (
        <div className="inline-add inline-add-pick">
          <select value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} aria-label="Inventory item" autoFocus>
            <option value="">Pick an inventory item…</option>
            {choices.map((i) => (
              <option key={i.sku} value={i.sku}>
                {i.name} · {i.sku}
              </option>
            ))}
          </select>
          <input type="number" min="1" className="num" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} aria-label="Quantity" />
          <span className="cell-sub inline-unit">
            {draftItem
              ? `${draftItem.unit} · ${branch ? `${stockAt(draftItem, branch).available} available at ${branch}` : ''}`
              : ''}
          </span>
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
