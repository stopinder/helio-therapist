import { supabase } from './supabase.js'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function mapCareItem(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    kind: row.kind,
    body: row.body,
    status: row.status,
    origin: row.origin,
    provenanceSessionId: row.provenance_session_id,
    aiPromptVersion: row.ai_prompt_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listClientCareItems(clientId) {
  const db = requireSupabase()
  const { data, error } = await db.from('client_care_items').select('*').eq('client_id', clientId).order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapCareItem)
}

export async function createClientCareItem({ clientId, kind, body, origin = 'clinician', provenanceSessionId = null, aiPromptVersion = null }) {
  const db = requireSupabase()
  const { data: auth } = await db.auth.getUser()
  if (!auth?.user) throw new Error('Authentication required')
  const { data, error } = await db.from('client_care_items').insert({
    therapist_id: auth.user.id,
    client_id: clientId,
    kind,
    body: body.trim(),
    origin,
    provenance_session_id: provenanceSessionId,
    ai_prompt_version: aiPromptVersion
  }).select('*').single()
  if (error) throw error
  return mapCareItem(data)
}

export async function updateClientCareItem(itemId, changes) {
  const db = requireSupabase()
  const payload = {}
  if (changes.body !== undefined) payload.body = changes.body.trim()
  if (changes.status !== undefined) payload.status = changes.status
  if (changes.kind !== undefined) payload.kind = changes.kind
  const { data, error } = await db.from('client_care_items').update(payload).eq('id', itemId).select('*').single()
  if (error) throw error
  return mapCareItem(data)
}
