// Which records someone can see, on top of which modules they can open.
// "Own" access (a designer seeing only their projects) is worked out here so
// every list, link and dashboard uses the same rule.

import { clientForProject, quoteForProject } from '../data/links.js'

// The staff member is the project's designer or on its installation team.
export function isOnProject(project, staffId) {
  return !!staffId && (project.designerId === staffId || project.teamIds.includes(staffId))
}

export function canSeeProject(auth, project) {
  return auth.can('projects.view') && (auth.can('projects.all') || isOnProject(project, auth.user?.id))
}

export function visibleProjects(data, auth) {
  return data.projects.filter((p) => canSeeProject(auth, p))
}

// Without "see every client", someone sees the clients of their own projects
// and of the quotations they prepared.
export function canSeeClient(data, auth, client) {
  if (!auth.can('clients.view')) return false
  if (auth.can('clients.all')) return true
  const me = auth.user?.id
  return (
    visibleProjects(data, auth).some((p) => clientForProject(data, p)?.id === client.id) ||
    data.quotations.some((q) => q.clientId === client.id && q.preparedById === me)
  )
}

export function visibleClients(data, auth) {
  return data.clients.filter((c) => canSeeClient(data, auth, c))
}

// Without "see every quotation", someone sees the quotes they prepared and
// the quotes behind their own projects.
export function canSeeQuote(data, auth, quote) {
  if (!auth.can('quotes.view')) return false
  if (auth.can('quotes.all')) return true
  return (
    quote.preparedById === auth.user?.id || visibleProjects(data, auth).some((p) => quoteForProject(data, p)?.id === quote.id)
  )
}

export function visibleQuotes(data, auth) {
  return data.quotations.filter((q) => canSeeQuote(data, auth, q))
}
