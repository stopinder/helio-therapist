import { canonicalJSON, validateReflectionSnapshot, reflectionText } from '../quiz/therapist/snapshot.js'
import { buildFallbackReport } from '../quiz/therapist/buildResult.js'

export const STANCE_SOURCE = 'therapeutic_stance_exercise'
export function isStanceReflection(record) {
  return record?.workspace_content?.captureSource === STANCE_SOURCE
}

/** Same owner-scoped table and user client as the reflection library. Never service-role. */
export async function saveStanceReflection({ snapshot, supabaseClient }) {
  const clean = validateReflectionSnapshot(snapshot)
  // The native route deliberately ships with authored reflections only. A later
  // authenticated AI adapter must preserve verified model/prompt provenance.
  if (clean.narrative.mode !== 'fallback' || canonicalJSON(clean.narrative.report) !== canonicalJSON(buildFallbackReport(clean.interpretation))) {
    throw new Error('This version saves the authored practice reflection only.')
  }
  const body = reflectionText(clean)
  if (body.length > 20000 || new TextEncoder().encode(JSON.stringify(clean)).length > 100000) {
    throw new Error('The reflection is too large to save intact. Download the text instead.')
  }
  const client = supabaseClient || (await import('./supabase.js')).supabase
  if (!client) throw new Error('Please sign in before saving.')
  const { data: auth, error: authError } = await client.auth.getUser()
  if (authError || !auth?.user?.id) throw new Error('Please sign in before saving.')
  const userId = auth.user.id
  const row = {
    id: clean.id, user_id: userId, body, theme: 'Therapeutic stance',
    client_id: null, session_ref: null, included_in_supervision: false,
    workspace_content: { captureSource: STANCE_SOURCE, stanceSnapshot: clean }
  }
  const { data, error } = await client.from('private_reflections').insert(row).select().single()
  if (!error) {
    if (data?.id !== clean.id || data?.user_id !== userId) throw new Error('Save was not confirmed.')
    return data
  }
  // An uncertain network response may follow a successful insert. A stable ID
  // makes retry atomic at the existing primary key; never upsert/overwrite.
  if (error.code !== '23505') throw new Error('The reflection could not be saved. Please retry.')
  const { data: existing, error: readError } = await client.from('private_reflections')
    .select('*').eq('id', clean.id).eq('user_id', userId).maybeSingle()
  if (readError || existing?.user_id !== userId || !isStanceReflection(existing) ||
      existing.body !== body || canonicalJSON(existing.workspace_content.stanceSnapshot) !== canonicalJSON(clean)) {
    throw new Error('A matching saved reflection could not be confirmed. No existing record was overwritten.')
  }
  return existing
}
