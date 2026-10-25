import { Check } from 'lucide-react'
import { STAGES } from './projectFields.js'

// The row of six stages across the top of a project. Click one to open it.
export default function StageTracker({ project, selected, onSelect }) {
  return (
    <ol className="stepper">
      {STAGES.map((stage, i) => {
        const status = project.stages[stage.key].status
        const tone = status === 'Done' ? 'is-done' : status === 'In progress' ? 'is-current' : ''
        return (
          <li key={stage.key} className={`step ${tone}${selected === stage.key ? ' is-selected' : ''}`}>
            <button type="button" onClick={() => onSelect(stage.key)}>
              <span className="step-dot">{status === 'Done' ? <Check size={13} strokeWidth={2.5} /> : i + 1}</span>
              <span className="step-text">
                <span className="step-label">{stage.label}</span>
                <span className="step-status">{status}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
