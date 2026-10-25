import { useRef } from 'react'
import { FileText, Image as ImageIcon, Upload, X } from 'lucide-react'
import { formatDate, todayIso } from '../utils/format.js'

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

// Turns files picked from the computer into records the app can show. The
// files stay in the browser's memory, so they disappear on page refresh.
export function filesToRecords(fileList, extra = {}) {
  return [...fileList].map((file) => ({
    id: newId(),
    name: file.name,
    caption: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
    addedOn: todayIso(),
    type: file.type,
    url: URL.createObjectURL(file),
    ...extra,
  }))
}

export function UploadButton({ label = 'Upload', accept, multiple = true, onFiles }) {
  const input = useRef(null)
  return (
    <>
      <button type="button" className="btn btn-small" onClick={() => input.current?.click()}>
        <Upload size={14} strokeWidth={1.75} />
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          if (e.target.files.length) onFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </>
  )
}

function FileTile({ file, onRemove }) {
  const isImage = file.url && (file.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(file.name))
  const looksLikeImage = /\.(jpe?g|png|gif|webp)$/i.test(file.name)
  const Icon = looksLikeImage ? ImageIcon : FileText

  return (
    <figure className="tile">
      <button
        type="button"
        className="tile-preview"
        onClick={() => file.url && window.open(file.url, '_blank')}
        title={file.url ? 'Open' : 'Sample file in the demo data (no actual file attached)'}
      >
        {isImage ? <img src={file.url} alt={file.caption ?? file.name} /> : <Icon size={26} strokeWidth={1.25} />}
        {file.kind && <span className="tile-kind">{file.kind}</span>}
      </button>
      <figcaption>
        <div className="tile-name">{file.caption ?? file.name}</div>
        <div className="cell-sub">{formatDate(file.addedOn)}</div>
      </figcaption>
      {onRemove && (
        <button type="button" className="tile-remove" onClick={() => onRemove(file.id)} aria-label={`Remove ${file.name}`}>
          <X size={13} strokeWidth={2} />
        </button>
      )}
    </figure>
  )
}

export default function FileGallery({ files, onRemove, empty }) {
  if (files.length === 0) return <p className="card-empty">{empty}</p>
  return (
    <div className="gallery">
      {files.map((f) => (
        <FileTile key={f.id} file={f} onRemove={onRemove} />
      ))}
    </div>
  )
}
