// The six stages every project moves through, in order.
export const STAGES = [
  { key: 'siteVisit', label: 'Site visit' },
  { key: 'design', label: 'Design' },
  { key: 'approval', label: 'Approval' },
  { key: 'materials', label: 'Materials' },
  { key: 'installation', label: 'Installation' },
  { key: 'handover', label: 'Handover' },
]

export const STAGE_STATUSES = ['Not started', 'In progress', 'Done']

// Pending: needed but not set aside yet. Reserved: set aside in the store.
// Issued: taken out of the store and used on site.
export const MATERIAL_STATUSES = ['Pending', 'Reserved', 'Issued']

export const DESIGN_FILE_KINDS = ['Plan', '3D render', 'Photo', 'Other']

const PROJECT_ID = /^PRJ-\d{4}$/

export function nextProjectId(projects) {
  const highest = projects.reduce((max, p) => Math.max(max, Number(p.id.slice(4)) || 0), 0)
  return `PRJ-${String(highest + 1).padStart(4, '0')}`
}

export function emptyStages(dueDate = '') {
  return {
    siteVisit: { status: 'In progress', date: '', visitedBy: '', notes: '' },
    design: { status: 'Not started', completedOn: '', notes: '', files: [] },
    approval: { status: 'Not started', approvedOn: '', approvedBy: '', method: '', letter: null, notes: '' },
    materials: { status: 'Not started', neededBy: '', notes: '' },
    installation: { status: 'Not started', startDate: '', endDate: '', costs: [], notes: '' },
    handover: {
      status: 'Not started',
      plannedDate: dueDate,
      actualDate: '',
      receivedBy: '',
      warrantyMonths: 12,
      checklist: [
        { item: 'Site cleaned', done: false },
        { item: 'Client walkthrough', done: false },
      ],
      notes: '',
    },
  }
}

export function emptyProject(id, today) {
  return {
    id,
    clientId: '',
    quoteId: '',
    name: '',
    site: null,
    designer: '',
    team: [],
    startDate: today,
    dueDate: '',
    stages: emptyStages(),
    materials: [],
    measurements: [],
    photos: [],
    notes: [],
  }
}

// --- Stage progress ----------------------------------------------------

// The stage the project has reached: the furthest one that has started.
// Returns null once every stage is done.
export function currentStage(project) {
  const allDone = STAGES.every((s) => project.stages[s.key].status === 'Done')
  if (allDone) return null
  const started = STAGES.filter((s) => project.stages[s.key].status !== 'Not started')
  return started.length ? started[started.length - 1] : STAGES[0]
}

export function currentStageLabel(project) {
  return currentStage(project)?.label ?? 'Completed'
}

export function isCompleted(project) {
  return currentStage(project) === null
}

// Done stages count fully, stages in progress count half.
export function progressOf(project) {
  const score = STAGES.reduce((sum, s) => {
    const status = project.stages[s.key].status
    return sum + (status === 'Done' ? 1 : status === 'In progress' ? 0.5 : 0)
  }, 0)
  return Math.round((score / STAGES.length) * 100)
}

// Marks one stage done, along with any earlier stage still open (a handover
// can't happen before installation finishes), and starts the next stage.
export function completeStage(project, key, today) {
  const index = STAGES.findIndex((s) => s.key === key)
  const stages = { ...project.stages }
  STAGES.slice(0, index + 1).forEach((s) => {
    stages[s.key] = { ...stages[s.key], status: 'Done' }
  })
  const next = STAGES[index + 1]
  if (next && stages[next.key].status === 'Not started') {
    stages[next.key] = { ...stages[next.key], status: 'In progress' }
  }
  if (key === 'design' && !stages.design.completedOn) stages.design = { ...stages.design, completedOn: today }
  return { ...project, stages }
}

// --- Money -------------------------------------------------------------

export function materialsCost(project) {
  return project.materials.reduce((sum, m) => sum + (Number(m.qty) || 0) * (Number(m.unitCost) || 0), 0)
}

export function installationCost(project) {
  return project.stages.installation.costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
}

// --- Validation for the main project details ------------------------------

export function validateProject(project, projects, isNew) {
  const errors = {}
  const id = project.id.trim()

  if (!PROJECT_ID.test(id)) errors.id = 'Use the format PRJ-0000, e.g. PRJ-0009.'
  else if (isNew && projects.some((p) => p.id === id)) errors.id = `${id} is already used.`

  if (project.name.trim().length < 3) errors.name = 'Give the project a short name, e.g. Perera residence.'
  if (!project.clientId) errors.clientId = 'Choose the client.'
  else if (!project.quoteId) errors.quoteId = 'Choose the approved quote this project comes from.'
  if (!project.site) errors.site = 'Choose where the work is.'

  if (!project.startDate) errors.startDate = 'Enter the start date.'
  if (!project.dueDate) errors.dueDate = 'Enter the due date.'
  else if (project.startDate && project.dueDate < project.startDate) errors.dueDate = 'Must be on or after the start date.'

  return errors
}

export function cleanProject(project) {
  return {
    ...project,
    id: project.id.trim(),
    name: project.name.trim(),
    designer: project.designer.trim(),
    team: project.team.map((t) => t.trim()).filter(Boolean),
  }
}
