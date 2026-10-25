import { useState } from 'react'
import { useOnChange } from '../utils/useOnChange.js'
import { useData } from '../data/DataContext.jsx'
import ProjectList from '../projects/ProjectList.jsx'
import ProjectDetail from '../projects/ProjectDetail.jsx'
import ProjectForm from '../projects/ProjectForm.jsx'
import { emptyProject, nextProjectId } from '../projects/projectFields.js'
import { canConvertToProject, projectFromQuote } from '../data/links.js'
import { todayIso } from '../utils/format.js'

// Switches between the project list, one project, and the add/edit form.
export default function Projects({ query, branch, openId, openFilter, onOpenRecord }) {
  const data = useData()
  // `openId` opens one project straight away, e.g. when clicked on a client page.
  // `openFilter.fromQuote` opens the new-project form started from that quote,
  // from the quote's Convert to project button.
  const [view, setView] = useState(() => {
    if (openId) return { mode: 'detail', id: openId }
    if (openFilter?.fromQuote) return { mode: 'new', quoteId: openFilter.fromQuote }
    return { mode: 'list' }
  })

  // Typing in the search bar or switching branch always brings the list back.
  useOnChange([query, branch], () => setView({ mode: 'list' }))

  if (view.mode === 'detail') {
    return (
      <ProjectDetail
        projectId={view.id}
        onBack={() => setView({ mode: 'list' })}
        onEdit={() => setView({ mode: 'edit', id: view.id })}
        onOpenRecord={onOpenRecord}
      />
    )
  }

  if (view.mode === 'edit') {
    return (
      <ProjectForm
        initial={data.projects.find((p) => p.id === view.id)}
        isNew={false}
        onCancel={() => setView({ mode: 'detail', id: view.id })}
        onSave={(saved) => {
          data.updateProject(saved)
          setView({ mode: 'detail', id: saved.id })
        }}
      />
    )
  }

  if (view.mode === 'new') {
    const blank = emptyProject(nextProjectId(data.projects), todayIso())
    const quote = data.quotations.find((q) => q.id === view.quoteId)
    return (
      <ProjectForm
        initial={quote && canConvertToProject(data, quote) ? projectFromQuote(blank, quote) : blank}
        isNew
        onCancel={() => setView({ mode: 'list' })}
        onSave={(saved) => {
          // Handover is planned for the due date unless set otherwise later.
          const handover = { ...saved.stages.handover, plannedDate: saved.dueDate }
          data.addProject({ ...saved, stages: { ...saved.stages, handover } })
          setView({ mode: 'detail', id: saved.id })
        }}
      />
    )
  }

  return (
    <ProjectList
      query={query}
      branch={branch}
      onOpen={(id) => setView({ mode: 'detail', id })}
      onNew={() => setView({ mode: 'new' })}
    />
  )
}
