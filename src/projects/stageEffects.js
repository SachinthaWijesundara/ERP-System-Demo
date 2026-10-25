import { checkMaterialStatus } from '../data/links.js'

// What finishing a stage does to the project's materials and the stock:
//   Approval done  -> materials still Pending are Reserved, so the stock is
//                     held for this job (if there's enough free).
//   Materials done -> materials not yet Issued are Issued: the stock leaves
//                     the store as "Out" movements. If any item is short, the
//                     stage can't be finished until stock arrives.
// Returns { project, movements, warnings, blocked }.
export function applyStageEffects(data, before, after) {
  const became = (key) => before.stages[key].status !== 'Done' && after.stages[key].status === 'Done'
  let project = after
  const movements = []
  const warnings = []

  const move = (fromStatuses, to) => {
    const materials = project.materials.map((m) => {
      if (!fromStatuses.includes(m.status)) return m
      const check = checkMaterialStatus(data, project, m, to)
      if (!check.ok) {
        warnings.push(check.message)
        return m
      }
      if (check.movement) movements.push(check.movement)
      return { ...m, status: to }
    })
    project = { ...project, materials }
  }

  if (became('approval')) move(['Pending'], 'Reserved')
  if (became('materials')) {
    move(['Pending', 'Reserved'], 'Issued')
    if (warnings.length) {
      return {
        project: before,
        movements: [],
        warnings: [...new Set(warnings)],
        blocked: 'Materials can’t be marked done until every item can be issued.',
      }
    }
  }
  return { project, movements, warnings: [...new Set(warnings)], blocked: null }
}
