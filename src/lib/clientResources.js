import { authenticatedFetch } from './api.js'
import { assignmentStatusLabel } from './clinicalExchange.js'

function one(value) {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

export function normalizeClientResources(assignments = []) {
  const active = []
  const completed = []

  const activeStatuses = ['sent', 'opened', 'in_progress', 'awaiting_review']
  const completedStatuses = ['completed', 'reviewed']

  for (const assignment of assignments) {
    const version = one(assignment.resource_versions)
    const resource = one(version?.resource_library_items)
    const request = one(assignment.client_requests)

    if (!version || !resource) continue

    const entry = {
      id: assignment.id,
      title: version.client_title || resource.title || 'Untitled resource',
      kind: resource.resource_kind,
      status: assignment.status,
      statusLabel: assignmentStatusLabel(assignment.status),
      sentAt: assignment.sent_at,
      dueAt: request?.due_at || null,
      completedAt: assignment.completed_at || null,
      reviewedAt: assignment.reviewed_at || null,
      reviewNote: assignment.review_note || null
    }

    if (activeStatuses.includes(assignment.status)) {
      active.push(entry)
    } else if (completedStatuses.includes(assignment.status)) {
      completed.push(entry)
    }
  }

  // Active: order newest sent first
  active.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))

  // Completed: order newest completion/review first
  completed.sort((a, b) => {
    const dateA = new Date(a.reviewedAt || a.completedAt || 0)
    const dateB = new Date(b.reviewedAt || b.completedAt || 0)
    return dateB - dateA
  })

  return { active, completed }
}

export async function listClientResources(clientId) {
  const response = await authenticatedFetch(`/api/resource-assignments?clientId=${encodeURIComponent(clientId)}`)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Resources could not be loaded.')
  return normalizeClientResources(data.assignments || [])
}
