import { supabase } from './supabase.js'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

async function authenticatedHeaders() {
  const db = requireSupabase()
  const { data } = await db.auth.getSession()
  const token = data?.session?.access_token
  if (!token) {
    const e = new Error('Authentication required')
    e.code = 'UNAUTHENTICATED'
    throw e
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

function mapFollowUp(row) {
  return {
    id: row.id,
    therapistId: row.therapist_id,
    clientId: row.client_id,
    body: row.body,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listClientFollowUps(clientId) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('client_follow_ups')
    .select('*')
    .eq('client_id', clientId)
    .order('completed_at', { ascending: true, nullsFirst: true })
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapFollowUp)
}

export async function createClientFollowUp({ clientId, body }) {
  const db = requireSupabase()
  const { data: auth } = await db.auth.getUser()
  if (!auth?.user) {
    const e = new Error('Authentication required')
    e.code = 'UNAUTHENTICATED'
    throw e
  }

  const { data, error } = await db
    .from('client_follow_ups')
    .insert({
      therapist_id: auth.user.id,
      client_id: clientId,
      body: body.trim()
    })
    .select('*')
    .single()

  if (error) throw error
  return mapFollowUp(data)
}

export async function setClientFollowUpCompleted({ id, completed }) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('client_follow_ups')
    .update({
      completed_at: completed ? new Date().toISOString() : null
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return mapFollowUp(data)
}

export async function updateClientFollowUp({ id, body }) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('client_follow_ups')
    .update({ body: body.trim() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return mapFollowUp(data)
}

export async function transcribeAudio(audio) {
  const response = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: await authenticatedHeaders(),
    body: JSON.stringify({ audio })
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const e = new Error(payload?.error?.message || 'Dictation could not be transcribed')
    e.code = payload?.error?.code || 'TRANSCRIPTION_FAILED'
    throw e
  }
  return payload.text || ''
}
