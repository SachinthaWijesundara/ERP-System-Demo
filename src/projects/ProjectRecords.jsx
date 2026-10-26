import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import Card from '../components/Card.jsx'
import FileGallery, { UploadButton, filesToRecords } from '../components/FileGallery.jsx'
import StaffLink from '../components/StaffLink.jsx'
import { useData } from '../data/DataContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { materialInfo, projectMaterialsCost, checkMaterialStatus, clientForProject } from '../data/links.js'
import { formatDate, formatMoney, todayIso } from '../utils/format.js'
import { UNITS } from '../quotations/quoteFields.js'
import { stockAt } from '../inventory/inventoryFields.js'
import { MATERIAL_STATUSES } from './projectFields.js'

// The sections under the stage panel: materials, measurements, photos and
// notes. Each gets the project and `onChange` for saving a new version of it.

// Materials are mostly Inventory items: each line stores the item's SKU, the
// quantity and its status, and the name, unit and cost price come from
// Inventory. Changing a status reserves or uses real stock at the project's
// branch. Something made or bought only for this job can be added as a
// custom material: it carries its own name, unit and prices and never
// touches stock.
// Editing needs "edit materials"; cost columns need "see material cost…";
// "Charge client" needs "see quote total, invoices and balance".
export function MaterialsCard({ project, onChange, onOpenRecord }) {
  const data = useData()
  const auth = useAuth()
  const canEdit = auth.can('projects.materials')
  const showCosts = auth.can('projects.costs')
  const canBill = auth.can('projects.billing')
  const canOpenStock = auth.can('inventory.view')
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
    onChange(
      { ...project, materials: project.materials.map((m, j) => (j === i ? { ...m, status } : m)) },
      check.movement ? [check.movement] : [],
    )
  }

  const setBillable = (i, billable) =>
    onChange({ ...project, materials: project.materials.map((m, j) => (j === i ? { ...m, billable } : m)) })

  // Items not already on the project, for the add picker.
  const stockSkus = project.materials.filter((m) => m.sku).map((m) => m.sku)
  const choices = data.inventory.filter((i) => !stockSkus.includes(i.sku))
  const draftItem = draft?.kind === 'stock' && data.inventory.find((i) => i.sku === draft.sku)

  function addDraft() {
    if (!(Number(draft.qty) > 0)) {
      setProblem('Enter a quantity above 0.')
      return
    }
    let material
    if (draft.kind === 'stock') {
      if (!draft.sku) {
        setProblem('Pick an inventory item.')
        return
      }
      material = { sku: draft.sku, qty: Number(draft.qty), status: 'Pending', billable: draft.billable }
    } else {
      if (draft.name.trim().length < 2) {
        setProblem('Name the custom material, e.g. Teak handrail, made to measure.')
        return
      }
      material = {
        sku: '',
        name: draft.name.trim(),
        unit: draft.unit,
        unitCost: Number(draft.unitCost) || 0,
        price: Number(draft.price) || 0,
        qty: Number(draft.qty),
        status: 'Pending',
        billable: draft.billable,
      }
    }
    setProblem('')
    onChange({ ...project, materials: [...project.materials, material] })
    setDraft(null)
  }

  const startDraft = (kind) =>
    setDraft({ kind, sku: '', name: '', unit: 'piece', unitCost: '', price: '', qty: 1, billable: canBill })

  return (
    <Card
      title="Materials"
      count={project.materials.length}
      actions={
        <>
          {stockSkus.length > 0 && canOpenStock && (
            <button
              type="button"
              className="btn btn-small"
              onClick={() => onOpenRecord('inventory', null, { skus: stockSkus, label: `${project.id} · ${project.name}` })}
            >
              Show in Inventory
            </button>
          )}
          {!draft && canEdit && (
            <>
              <button type="button" className="btn btn-small" onClick={() => startDraft('stock')}>
                <Plus size={14} strokeWidth={1.75} />
                Add from Inventory
              </button>
              <button type="button" className="btn btn-small" onClick={() => startDraft('custom')}>
                <Plus size={14} strokeWidth={1.75} />
                Custom material
              </button>
            </>
          )}
        </>
      }
    >
      <p className="card-intro">
        <strong>Reserved</strong> holds Inventory stock at {branch ?? 'the branch'} for this project so nobody else can
        sell it; <strong>Issued</strong> takes it out of the store to site. Approving the design reserves materials, and
        finishing the Materials stage issues them. Custom materials are made or bought for this job and don’t touch
        stock.
        {canBill && (
          <>
            {' '}
            Tick <strong>Charge client</strong> for materials not on the quote; they’re added to the final invoice.
          </>
        )}
        {!canEdit && ' Your role can view the materials but not change them.'}
      </p>

      {problem && <div className="form-alert">{problem}</div>}

      {project.materials.length > 0 && (
        <table className="table table-compact">
          <thead>
            <tr>
              <th>Material</th>
              <th className="num">Qty</th>
              {showCosts && <th className="num">Unit cost</th>}
              {showCosts && <th className="num">Cost</th>}
              {canBill && <th>Charge client</th>}
              <th>Status</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {project.materials.map((m, i) => {
              const info = materialInfo(data, m)
              return (
                <tr key={m.sku || `custom-${i}`}>
                  <td className="wrap">
                    <div className="cell-main">
                      {info.item && canOpenStock ? (
                        <button type="button" className="inline-link" onClick={() => onOpenRecord('inventory', m.sku)}>
                          {info.name}
                        </button>
                      ) : (
                        info.name
                      )}
                    </div>
                    <div className="cell-sub">{info.item ? m.sku : 'Custom · not in Inventory'}</div>
                  </td>
                  <td className="num">
                    {Number(m.qty).toLocaleString('en-LK')} {info.unit}
                  </td>
                  {showCosts && <td className="num">{formatMoney(info.cost)}</td>}
                  {showCosts && <td className="num">{formatMoney(m.qty * info.cost)}</td>}
                  {canBill && (
                    <td>
                      <label className="charge-toggle" title="Bill this to the client on the final invoice">
                        <input
                          type="checkbox"
                          checked={!!m.billable}
                          onChange={(e) => setBillable(i, e.target.checked)}
                          disabled={!canEdit}
                          aria-label={`Charge client for ${info.name}`}
                        />
                        {m.billable ? formatMoney(m.qty * info.price) : ''}
                      </label>
                    </td>
                  )}
                  <td>
                    <select
                      className={`status-select status-${m.status.toLowerCase()}`}
                      value={m.status}
                      onChange={(e) => setStatus(i, e.target.value)}
                      disabled={!canEdit}
                      aria-label={`Status of ${info.name}`}
                    >
                      {MATERIAL_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  {canEdit && (
                    <td className="num">
                      {/* Issued stock has been used on site, so it stays on the record. */}
                      {m.status !== 'Issued' && (
                        <button
                          type="button"
                          className="icon-button icon-button-quiet"
                          aria-label={`Remove ${info.name}`}
                          onClick={() => onChange({ ...project, materials: project.materials.filter((_, j) => j !== i) })}
                        >
                          <X size={14} strokeWidth={1.75} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          {showCosts && (
            <tfoot>
              <tr>
                <td colSpan={3}>Materials cost</td>
                <td className="num cell-main">{formatMoney(projectMaterialsCost(data, project))}</td>
                <td colSpan={(canBill ? 1 : 0) + 1 + (canEdit ? 1 : 0)} />
              </tr>
            </tfoot>
          )}
        </table>
      )}

      {draft?.kind === 'stock' && (
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
          {canBill && (
            <label className="charge-toggle">
              <input type="checkbox" checked={draft.billable} onChange={(e) => setDraft({ ...draft, billable: e.target.checked })} />
              Charge client
            </label>
          )}
          <button type="button" className="btn btn-primary btn-small" onClick={addDraft}>
            Add
          </button>
          <button type="button" className="btn btn-small" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      )}

      {draft?.kind === 'custom' && (
        <div className="inline-add inline-add-custom">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Custom material, e.g. Teak handrail, made to measure"
            aria-label="Custom material"
            autoFocus
          />
          <input type="number" min="1" className="num" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} aria-label="Quantity" />
          <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} aria-label="Unit">
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
          {showCosts && (
            <input
              type="number"
              min="0"
              className="num"
              value={draft.unitCost}
              onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })}
              placeholder="Unit cost"
              aria-label="Unit cost in LKR"
            />
          )}
          {canBill && (
            <>
              <input
                type="number"
                min="0"
                className="num"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                placeholder="Unit price"
                aria-label="Unit price to the client in LKR"
              />
              <label className="charge-toggle">
                <input type="checkbox" checked={draft.billable} onChange={(e) => setDraft({ ...draft, billable: e.target.checked })} />
                Charge client
              </label>
            </>
          )}
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

// Measurements, photos and notes need "add measurements, photos and notes".
export function MeasurementsCard({ project, onChange }) {
  const auth = useAuth()
  const canEdit = auth.can('projects.records')
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
      {project.measurements.length === 0 && !canEdit && <p className="card-empty">No measurements yet.</p>}
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
                  {canEdit && (
                    <button
                      type="button"
                      className="icon-button icon-button-quiet"
                      aria-label={`Remove ${m.area}`}
                      onClick={() => onChange({ ...project, measurements: project.measurements.filter((_, j) => j !== i) })}
                    >
                      <X size={14} strokeWidth={1.75} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canEdit && (
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
      )}
    </Card>
  )
}

export function PhotosCard({ project, onChange }) {
  const auth = useAuth()
  const canEdit = auth.can('projects.records')
  return (
    <Card
      title="Photos"
      count={project.photos.length}
      actions={
        canEdit && (
          <UploadButton
            label="Add photos"
            accept="image/*"
            onFiles={(files) => onChange({ ...project, photos: [...project.photos, ...filesToRecords(files)] })}
          />
        )
      }
    >
      <FileGallery
        files={project.photos}
        onRemove={canEdit ? (id) => onChange({ ...project, photos: project.photos.filter((p) => p.id !== id) }) : undefined}
        empty="No photos yet. Add before, during and after photos from the site."
      />
    </Card>
  )
}

// Notes are signed by whoever is logged in; the name links to their staff
// page. Anyone who works on the project's records or materials can add one.
export function NotesCard({ project, onChange, onOpenRecord }) {
  const auth = useAuth()
  const canAdd = auth.can('projects.records') || auth.can('projects.materials')
  const [text, setText] = useState('')

  function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    const note = { date: todayIso(), authorId: auth.user.id, text: text.trim() }
    onChange({ ...project, notes: [note, ...project.notes] })
    setText('')
  }

  return (
    <Card title="Notes" count={project.notes.length}>
      {canAdd && (
        <form className="note-form" onSubmit={add}>
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note for the team…" aria-label="Note" />
          <div className="note-form-row">
            <span className="cell-sub">Signed as {auth.user.name}</span>
            <button type="submit" className="btn btn-small">
              Add note
            </button>
          </div>
        </form>
      )}
      {project.notes.length === 0 && !canAdd && <p className="card-empty">No notes yet.</p>}
      {project.notes.length > 0 && (
        <ul className="note-list">
          {project.notes.map((n, i) => (
            <li key={i}>
              <div className="note-meta">
                <span className="cell-main">
                  <StaffLink id={n.authorId} onOpenRecord={onOpenRecord} />
                </span>
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
