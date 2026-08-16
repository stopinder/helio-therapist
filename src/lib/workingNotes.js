import { supabase } from './supabase.js'

const EMPTY_NOTES = Object.freeze({
  observations: '',
  interventions: '',
  themes: '',
  followUp: ''
})

function requireSupabase(client = supabase) {
  if (!client) throw new Error('Supabase is not configured')
  return client
}

export function emptyWorkingNotes() {
  return { ...EMPTY_NOTES }
}

export function normalizeWorkingNotes(content) {
  const source = content && typeof content === 'object' && !Array.isArray(content) ? content : {}
  return Object.fromEntries(
    Object.keys(EMPTY_NOTES).map(key => [key, typeof source[key] === 'string' ? source[key] : ''])
  )
}

export async function getSessionWorkingNotes({ sessionId, clientId, supabaseClient } = {}) {
  const client = requireSupabase(supabaseClient)
  const { data, error } = await client
    .from('session_working_notes')
    .select('session_id,client_id,content,updated_at,version')
    .eq('session_id', sessionId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) throw error
  return data ? { ...data, content: normalizeWorkingNotes(data.content) } : null
}

export async function saveSessionWorkingNotes({ sessionId, clientId, content, expectedVersion = 0, supabaseClient } = {}) {
  const client = requireSupabase(supabaseClient)
  const { data, error } = await client.rpc('save_session_working_notes', {
    p_session_id: sessionId,
    p_client_id: clientId,
    p_content: normalizeWorkingNotes(content),
    p_expected_version: expectedVersion
  })

  if (error) {
    if (error.code === 'P0001' && error.message?.includes('WORKING_NOTES_CONFLICT')) {
      const conflict = new Error('Working notes were updated in another tab')
      conflict.code = 'WORKING_NOTES_CONFLICT'
      throw conflict
    }
    throw error
  }

  return { ...data, content: normalizeWorkingNotes(data.content) }
}
