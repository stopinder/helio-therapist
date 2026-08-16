import { supabase } from './supabase.js'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

function presentAmendment(row) {
  if (!row) return null
  return {
    id: row.id,
    sessionId: row.session_id,
    sequenceNumber: row.sequence_number,
    reason: row.reason,
    content: row.content,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by
  }
}

export async function listClinicalRecordAmendments(sessionId) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('clinical_record_amendments')
    .select('id,session_id,sequence_number,reason,content,approved_at,approved_by')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: true })
  if (error) throw error
  return (data || []).map(presentAmendment)
}

export async function approveClinicalRecordAmendment(sessionId, { reason, content }) {
  const client = requireSupabase()
  const { data, error } = await client.rpc('approve_clinical_record_amendment', {
    p_session_id: sessionId,
    p_reason: reason,
    p_content: content
  })
  if (error) throw error
  return presentAmendment(Array.isArray(data) ? data[0] : data)
}
