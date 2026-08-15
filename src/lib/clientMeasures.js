import { authenticatedFetch } from './api.js'

function one(value) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

export function normalizeOutcomeMeasureHistory(assignments = []) {
  const groups = new Map()

  for (const assignment of assignments) {
    const version = one(assignment.resource_versions)
    const resource = one(version?.resource_library_items)
    const result = one(assignment.outcome_measure_results)

    if (resource?.resource_kind !== 'outcome_measure' || !result?.completed_at) continue

    const resourceId = version?.resource_id || resource?.id || version?.client_title || resource?.title
    if (!resourceId) continue

    const entry = {
      id: result.id || assignment.id,
      assignmentId: assignment.id,
      completedAt: result.completed_at,
      scores: result.scores || {},
      calculationVersion: result.calculation_version || '',
      title: version?.client_title || resource?.title || 'Outcome measure'
    }

    if (!groups.has(resourceId)) {
      groups.set(resourceId, {
        resourceId,
        title: entry.title,
        results: []
      })
    }
    groups.get(resourceId).results.push(entry)
  }

  return [...groups.values()]
    .map(group => ({
      ...group,
      results: group.results.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    }))
    .sort((a, b) => new Date(b.results[0]?.completedAt || 0) - new Date(a.results[0]?.completedAt || 0))
}

export async function listClientMeasureHistory(clientId) {
  const response = await authenticatedFetch(`/api/resource-assignments?clientId=${encodeURIComponent(clientId)}`)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Measures could not be loaded.')
  return normalizeOutcomeMeasureHistory(data.assignments || [])
}
