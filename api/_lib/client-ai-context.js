export const CLIENT_AI_CONTEXT_VERSION = 'client-context-v1'
export const CLIENT_AI_CONTEXT_SESSION_LIMIT = 3

export function normaliseContextText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function presentApprovedSessionContext(row) {
  const notes = normaliseContextText(row?.notes)
  if (!row?.id || row.status !== 'completed' || !notes) return null
  return {
    sourceType: 'completed_session',
    sourceId: row.id,
    occurredAt: row.occurred_at,
    content: notes
  }
}

export function buildClientAIContext({ client, sessions = [] }) {
  if (!client?.id) throw new Error('Client is required')

  const currentFocus = normaliseContextText(client.current_focus)
  const approvedSessions = sessions
    .map(presentApprovedSessionContext)
    .filter(Boolean)
    .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0))
    .slice(0, CLIENT_AI_CONTEXT_SESSION_LIMIT)

  return {
    version: CLIENT_AI_CONTEXT_VERSION,
    clientId: client.id,
    currentFocus: currentFocus || null,
    sessions: approvedSessions,
    sourcePolicy: {
      includes: ['client_current_focus', 'completed_session_notes'],
      excludes: ['raw_transcripts', 'private_reflections', 'session_working_notes', 'draft_sessions']
    }
  }
}

export async function loadOwnedClientAIContext(supabase, { clientId, userId }) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id,current_focus')
    .eq('id', clientId)
    .eq('user_id', userId)
    .maybeSingle()
  if (clientError) throw clientError
  if (!client) return null

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id,occurred_at,status,notes')
    .eq('client_id', clientId)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('notes', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(CLIENT_AI_CONTEXT_SESSION_LIMIT)
  if (sessionsError) throw sessionsError

  return buildClientAIContext({ client, sessions: sessions || [] })
}
