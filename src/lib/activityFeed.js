const DEFAULT_LIMIT = 5

function validDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeActivity(item) {
  if (!item?.id || !item?.type || !item?.occurredAt || !item?.title) return null
  const occurredAt = validDate(item.occurredAt)
  if (!occurredAt) return null
  return {
    id: String(item.id),
    type: String(item.type),
    occurredAt,
    title: String(item.title),
    detail: item.detail ? String(item.detail) : '',
    route: item.route || null,
    clientId: item.clientId || null,
    sourceId: item.sourceId || null,
    metadata: item.metadata || {}
  }
}

export function formatActivityDuration(startedAt, endedAt) {
  const start = validDate(startedAt)
  const end = validDate(endedAt)
  if (!start || !end || end < start) return ''
  const totalMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return `${minutes} min`
  if (!minutes) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

export function sessionActivitySource({ sessions = [], clients = [] } = {}) {
  const clientNames = new Map(clients.map(client => [String(client.id), client.display_name || client.name || 'Client']))
  return sessions.flatMap(session => {
    if (!session?.id || !session?.clientId) return []
    const clientName = clientNames.get(String(session.clientId)) || 'Client'
    const route = `/clients/${session.clientId}/sessions/${session.id}`
    const items = []

    if (session.status === 'completed' && (session.endedAt || session.completedAt)) {
      const end = session.endedAt || session.completedAt
      const duration = formatActivityDuration(session.startedAt, end)
      items.push({
        id: `session-completed:${session.id}`,
        type: 'session.completed',
        occurredAt: end,
        title: `Session completed · ${clientName}`,
        detail: duration,
        route,
        clientId: session.clientId,
        sourceId: session.id,
        metadata: { duration, workflowStatus: session.workflowStatus }
      })
    }

    if (session.status === 'completed' && session.workflowStatus === 'approved') {
      items.push({
        id: `clinical-record-approved:${session.id}`,
        type: 'clinical_record.approved',
        occurredAt: session.updatedAt || session.completedAt || session.endedAt,
        title: `Clinical record approved · ${clientName}`,
        route,
        clientId: session.clientId,
        sourceId: session.id
      })
    }

    if (session.workflowStatus === 'transcript_received') {
      items.push({
        id: `transcript-received:${session.id}`,
        type: 'transcript.received',
        occurredAt: session.updatedAt || session.completedAt || session.startedAt,
        title: `Transcript received · ${clientName}`,
        route,
        clientId: session.clientId,
        sourceId: session.id
      })
    }

    return items
  })
}

export function reflectionActivitySource({ reflections = [] } = {}) {
  return reflections.flatMap(reflection => {
    if (!reflection?.id || !reflection?.included_in_supervision) return []
    return [{
      id: `reflection-supervision:${reflection.id}`,
      type: 'reflection.supervision_selected',
      occurredAt: reflection.updated_at || reflection.created_at,
      title: 'Reflection added to supervision',
      detail: 'Private professional development',
      route: '/supervision',
      sourceId: reflection.id
    }]
  })
}

/**
 * Build a single reverse-chronological activity feed from canonical domain records.
 *
 * Source adapters deliberately return the same small activity contract. New product
 * modules can participate by adding an adapter here or passing additional adapters
 * from a higher-level composition point; Overview never needs source-specific UI.
 * The feed is derived from durable source records, so it cannot become a second,
 * independently mutable source of truth.
 */
export function buildRecentActivity(context = {}, { limit = DEFAULT_LIMIT, sources } = {}) {
  const adapters = sources || [sessionActivitySource, reflectionActivitySource]
  const deduped = new Map()
  for (const source of adapters) {
    for (const rawItem of source(context) || []) {
      const item = normalizeActivity(rawItem)
      if (!item) continue
      const existing = deduped.get(item.id)
      if (!existing || existing.occurredAt < item.occurredAt) deduped.set(item.id, item)
    }
  }
  return [...deduped.values()]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, Math.max(0, limit))
}
