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
    siteVisit: { status: 'In progress', date: '', visitedById: '', notes: '' },
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
    // Registered staff only, by staff ID.
    designerId: '',
    teamIds: [],
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

// --- Warranty ----------------------------------------------------------

// '2026-03-19' plus 24 months -> '2028-03-19'.
function addMonths(iso, months) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1 + months, d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The warranty on a handed-over project: it starts on the actual handover
// date and runs for the warranty months set at handover. Null until the
// handover is done and dated.
export function warrantyInfo(project, today) {
  const handover = project.stages.handover
  if (handover.status !== 'Done' || !handover.actualDate) return null
  const months = Number(handover.warrantyMonths) || 0
  if (months <= 0) return { months: 0, start: handover.actualDate, expires: null, active: false, daysLeft: 0 }
  const expires = addMonths(handover.actualDate, months)
  const daysLeft = Math.round((new Date(expires) - new Date(today)) / 86400000)
  return { months, start: handover.actualDate, expires, active: today <= expires, daysLeft }
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
  if (!project.designerId) errors.designerId = 'Choose the designer.'

  if (!project.startDate) errors.startDate = 'Enter the start date.'
  if (!project.dueDate) errors.dueDate = 'Enter the due date.'
  else if (project.startDate && project.dueDate < project.startDate) errors.dueDate = 'Must be on or after the start date.'

  return errors
}

// Tidies the form before saving. The form's client picker isn't saved: the
// project's client is its quote's client.
export function cleanProject(form) {
  // eslint-disable-next-line no-unused-vars
  const { clientId, ...project } = form
  return {
    ...project,
    id: project.id.trim(),
    name: project.name.trim(),
    teamIds: [...new Set(project.teamIds.filter(Boolean))],
  }
}
