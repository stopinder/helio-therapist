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
    .select('session_id,client_id,content,updated_at')
    .eq('session_id', sessionId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) throw error
  return data ? { ...data, content: normalizeWorkingNotes(data.content) } : null
}

export async function saveSessionWorkingNotes({ sessionId, clientId, content, supabaseClient } = {}) {
  const client = requireSupabase(supabaseClient)
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Please sign in again')

  const payload = {
    session_id: sessionId,
    client_id: clientId,
    user_id: auth.user.id,
    content: normalizeWorkingNotes(content),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await client
    .from('session_working_notes')
    .upsert(payload, { onConflict: 'session_id' })
    .select('session_id,client_id,content,updated_at')
    .single()

  if (error) throw error
  return { ...data, content: normalizeWorkingNotes(data.content) }
}
