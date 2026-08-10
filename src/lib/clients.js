import { supabase } from './supabase.js'
import { withSessionRecovery } from './api.js'

export async function getClient({ clientId }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').select('id, user_id, display_name, reference, current_focus, archived, created_at, updated_at').eq('id', clientId).single())
  if (error) throw new Error(error.message || 'Client not found')
  return { ...data, name: data.display_name, note: data.current_focus }
}

export async function getCurrentTherapistLabel() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: { user }, error } = await withSessionRecovery(() => supabase.auth.getUser())
  if (error || !user) return 'Current therapist'
  const metadata = user.user_metadata || {}
  return metadata.full_name || metadata.name || user.email || 'Current therapist'
}

export async function getTimelineEvents({ clientId }) {
  const { authenticatedFetch } = await import('./api.js')
  const fetchResponse = await authenticatedFetch(`/api/client-timeline?clientId=${encodeURIComponent(clientId)}`)
  const data = await fetchResponse.json()
  if (!fetchResponse.ok) throw new Error(data.error || 'Failed to load timeline')
  return data.events || []
}

export async function updateClient({ clientId, ...updates }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: { user }, error: authError } = await withSessionRecovery(() => supabase.auth.getUser())
  if (authError || !user) throw new Error('You must be signed in to update a client')
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').update({ display_name: updates.name, current_focus: updates.note, updated_at: new Date().toISOString() }).eq('id', clientId).eq('user_id', user.id).select().single())
  if (error) throw new Error(error.message || 'Failed to update client')
  return { ...data, name: data.display_name, note: data.current_focus }
}

export async function listClients() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').select('id, user_id, display_name, reference, current_focus, archived, created_at, updated_at').eq('archived', false).order('display_name', { ascending: true }))
  if (error) throw new Error(error.message || 'Failed to load clients')
  return (data || []).map(client => ({ ...client, name: client.display_name }))
}

export async function createClient({ name, email = null, note = '' }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: { user }, error: authError } = await withSessionRecovery(() => supabase.auth.getUser())
  if (authError || !user) throw new Error('You must be signed in to add a client')
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').insert({ user_id: user.id, display_name: name, reference: email || null, current_focus: note || '' }).select().single())
  if (error) throw new Error(error.message || 'Failed to create client')
  return { ...data, name: data.display_name, note: data.current_focus }
}
