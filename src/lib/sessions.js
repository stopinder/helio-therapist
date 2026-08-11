import { supabase } from './supabase.js'

const LEGACY_STORAGE_KEY = 'helio_sessions'
const MIGRATION_MARKER_KEY = 'helio_sessions_migrated'
const DEMO_CLINICAL_CONTENT_PATTERN = /\[DEMO\]/i

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function singleResult(data) {
  return Array.isArray(data) ? data[0] : data
}

function archivedClientError() {
  const error = new Error('Restore this client before opening a session.')
  error.code = 'CLIENT_ARCHIVED'
  return error
}

export function assertNoDemoClinicalContent(notes) {
  if (!DEMO_CLINICAL_CONTENT_PATTERN.test(String(notes || ''))) return
  const error = new Error('Demonstration content cannot be saved to a clinical session.')
  error.code = 'DEMO_CLINICAL_CONTENT'
  throw error
}

async function requireActiveOwnedClient(client, clientId, userId) {
  const { data, error } = await client
    .from('clients')
    .select('id,archived')
    .eq('id', clientId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    const notFound = new Error('Client not found')
    notFound.code = 'CLIENT_NOT_FOUND'
    throw notFound
  }
  if (data.archived) throw archivedClientError()
}

export function presentSession(row) {
  if (!row) return null
  return {
    id: row.id,
    clientId: row.client_id,
    startedAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    endedAt: row.ended_at,
    status: row.status,
    workflowStatus: row.workflow_status,
    notes: row.notes || '',
    notesStatus: row.notes_status,
    version: row.version,
    legacyRef: row.legacy_ref,
    videoState: row.zoom_state,
    videoMeetingId: row.zoom_meeting_id,
    videoError: row.zoom_error || ''
  }
}

export async function listSessions({ clientId } = {}) {
  const client = requireSupabase()
  let query = client.from('sessions').select('id,client_id,occurred_at,status,notes,created_at,updated_at,completed_at,ended_at,workflow_status,notes_status,version,legacy_ref,zoom_state,zoom_meeting_id,zoom_error').order('occurred_at', { ascending: false })
  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(presentSession)
}

export async function getSession({ clientId, sessionId }) {
  const client = requireSupabase()
  const fields = 'id,client_id,occurred_at,status,notes,created_at,updated_at,completed_at,ended_at,workflow_status,notes_status,version,legacy_ref,zoom_state,zoom_meeting_id,zoom_error'
  const { data, error } = await client.from('sessions').select(fields).eq('id', sessionId).eq('client_id', clientId).single()
  if (error) throw error
  return presentSession(data)
}

export async function createOrResumeSession(clientId) {
  const client = requireSupabase()
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Please sign in again')

  await requireActiveOwnedClient(client, clientId, auth.user.id)

  const fields = 'id,client_id,occurred_at,status,notes,created_at,updated_at,completed_at,ended_at,workflow_status,notes_status,version,legacy_ref,zoom_state,zoom_meeting_id,zoom_error'
  const { data: existing, error: existingError } = await client.from('sessions').select(fields).eq('client_id', clientId).eq('status', 'in_progress').maybeSingle()
  if (existingError) throw existingError
  if (existing) return { session: presentSession(existing), resumed: true }

  const now = new Date().toISOString()
  const { data, error } = await client.from('sessions').insert({ user_id: auth.user.id, client_id: clientId, occurred_at: now, status: 'in_progress', workflow_status: 'no_further_action', notes: '', notes_status: 'draft' }).select(fields).single()

  if (error?.code === '23505') {
    await requireActiveOwnedClient(client, clientId, auth.user.id)
    const { data: raced, error: racedError } = await client.from('sessions').select(fields).eq('client_id', clientId).eq('status', 'in_progress').single()
    if (racedError) throw racedError
    return { session: presentSession(raced), resumed: true }
  }
  if (error) throw error
  return { session: presentSession(data), resumed: false }
}

export async function saveSessionDraft(session, notes, video = {}) {
  assertNoDemoClinicalContent(notes)
  const client = requireSupabase()
  const { data, error } = await client.rpc('save_session_draft', { p_session_id: session.id, p_notes: notes || '', p_expected_version: session.version, p_zoom_state: video.state || null, p_zoom_meeting_id: video.meetingId || null, p_zoom_error: video.error ?? null })
  if (error?.code === '40001') { const conflict = new Error('This session changed in another tab. Reopen it before saving again.'); conflict.code = 'SESSION_CONFLICT'; throw conflict }
  if (error) throw error
  return presentSession(singleResult(data))
}

export async function completeSessionRecord(session, notes) {
  assertNoDemoClinicalContent(notes)
  const client = requireSupabase()
  const { data, error } = await client.rpc('complete_session', { p_session_id: session.id, p_notes: notes || '', p_expected_version: session.version })
  if (error?.code === '40001') { const conflict = new Error('This session changed in another tab. Reopen it before completing it.'); conflict.code = 'SESSION_CONFLICT'; throw conflict }
  if (error) throw error
  return presentSession(singleResult(data))
}

export async function createSessionFromTranscript(clientId, occurredAt) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('create_session_from_transcript', { p_client_id: clientId, p_occurred_at: occurredAt || new Date().toISOString() })
  if (error) throw error
  return presentSession(singleResult(data))
}

export async function migrateLegacySessions() {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) return { migrated: false, sessions: null }
  let legacySessions
  try { legacySessions = JSON.parse(raw) } catch { throw new Error('Legacy session data could not be read. It has been retained in this browser.') }
  if (!Array.isArray(legacySessions) || !legacySessions.length) { localStorage.removeItem(LEGACY_STORAGE_KEY); localStorage.setItem(MIGRATION_MARKER_KEY, JSON.stringify({ migratedAt: new Date().toISOString(), count: 0 })); return { migrated: true, sessions: [] } }
  const client = requireSupabase()
  const { data, error } = await client.rpc('import_legacy_sessions', { p_sessions: legacySessions })
  if (error) throw error
  const imported = (data || []).map(presentSession)
  const persistedReferences = new Set(imported.map(session => String(session.legacyRef || '')).filter(Boolean))
  const fullyPersisted = legacySessions.every(session => persistedReferences.has(String(session.id)))
  if (!fullyPersisted) throw new Error('Not every legacy session was confirmed in Supabase. Browser data has been retained.')
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  localStorage.setItem(MIGRATION_MARKER_KEY, JSON.stringify({ migratedAt: new Date().toISOString(), count: legacySessions.length }))
  return { migrated: true, sessions: imported }
}