import { supabase } from './supabase.js'

const FIELD_KEYS = Object.freeze([
  'presentingConcerns', 'sessionThemes', 'interventionsUsed', 'clientResponse',
  'riskSafeguarding', 'progressGoals', 'planNextSession'
])

function requireSupabase(client = supabase) {
  if (!client) throw new Error('Supabase is not configured')
  return client
}

export function normalizeCaptureContent(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(FIELD_KEYS.map(key => [key, typeof source[key] === 'string' ? source[key] : '']))
}

export async function getSessionCapture({ sessionId, clientId, supabaseClient } = {}) {
  const client = requireSupabase(supabaseClient)
  const { data, error } = await client.from('session_capture_drafts')
    .select('session_id,client_id,transcript_id,speaker_identities,generated_content,content,evidence,therapist_guidance,dismissed_fields,previous_versions,status,version,reviewed_at,updated_at')
    .eq('session_id', sessionId).eq('client_id', clientId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { ...data, generated_content: normalizeCaptureContent(data.generated_content), content: normalizeCaptureContent(data.content) }
}

export async function saveSessionCapture({ sessionId, clientId, transcriptId, speakerIdentities, generatedContent, content, evidence = {}, therapistGuidance = '', dismissedFields = [], previousVersions = [], status = 'working', expectedVersion = 0, supabaseClient } = {}) {
  const client = requireSupabase(supabaseClient)
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Please sign in again')
  const now = new Date().toISOString()
  const payload = {
    session_id: sessionId, user_id: user.id, client_id: clientId, transcript_id: transcriptId,
    speaker_identities: speakerIdentities || {}, generated_content: normalizeCaptureContent(generatedContent),
    content: normalizeCaptureContent(content), evidence: evidence || {}, therapist_guidance: String(therapistGuidance || '').slice(0, 20000),
    dismissed_fields: dismissedFields, previous_versions: previousVersions.slice(-10), status,
    reviewed_at: status === 'reviewed' ? now : null, updated_at: now
  }
  let query
  if (expectedVersion > 0) {
    query = client.from('session_capture_drafts').update({ ...payload, version: expectedVersion + 1 })
      .eq('session_id', sessionId).eq('client_id', clientId).eq('version', expectedVersion)
  } else {
    query = client.from('session_capture_drafts').insert({ ...payload, version: 1 })
  }
  const { data, error } = await query.select().maybeSingle()
  if (error) throw error
  if (!data) {
    const conflict = new Error('Session Capture was updated in another tab')
    conflict.code = 'SESSION_CAPTURE_CONFLICT'
    throw conflict
  }
  return data
}
