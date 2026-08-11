import { supabase } from './supabase.js'
import { withSessionRecovery } from './api.js'

const clientSelect = 'id, user_id, display_name, reference, current_focus, archived, archived_at, created_at, updated_at'

export async function getClient({ clientId }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').select(clientSelect).eq('id', clientId).single())
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

async function requireUser(action) {
  const { data: { user }, error } = await withSessionRecovery(() => supabase.auth.getUser())
  if (error || !user) throw new Error(`You must be signed in to ${action}`)
  return user
}

export async function updateClient({ clientId, ...updates }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const user = await requireUser('update a client')
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').update({
    display_name: updates.name,
    current_focus: updates.note,
    updated_at: new Date().toISOString()
  }).eq('id', clientId).eq('user_id', user.id).select(clientSelect).single())
  if (error) throw new Error(error.message || 'Failed to update client')
  return { ...data, name: data.display_name, note: data.current_focus }
}

export async function setClientArchived({ clientId, archived }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const user = await requireUser(archived ? 'archive a client' : 'restore a client')
  const now = new Date().toISOString()
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').update({
    archived,
    archived_at: archived ? now : null,
    updated_at: now
  }).eq('id', clientId).eq('user_id', user.id).select(clientSelect).single())
  if (error) throw new Error(error.message || (archived ? 'Failed to archive client' : 'Failed to restore client'))
  return { ...data, name: data.display_name, note: data.current_focus }
}

export async function listClients({ includeArchived = false } = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  let query = supabase.from('clients').select(clientSelect).order('display_name', { ascending: true })
  if (!includeArchived) {
    query = query.eq('archived', false)
  }
  const { data, error } = await withSessionRecovery(() => query)
  if (error) throw new Error(error.message || 'Failed to load clients')
  return (data || []).map(client => ({ ...client, name: client.display_name }))
}

export async function listUpcomingClientAppointments({ from = new Date() } = {}) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await withSessionRecovery(() => supabase.from('appointments').select('id,client_id,status,starts_at,ends_at,timezone').in('status', ['scheduled', 'rescheduled']).gte('starts_at', from.toISOString()).order('starts_at', { ascending: true }))
  if (error) throw new Error(error.message || 'Failed to load upcoming appointments')
  return data || []
}

export async function createClient({ name, email = null, note = '' }) {
  if (!supabase) throw new Error('Supabase is not configured')
  const user = await requireUser('add a client')
  const { data, error } = await withSessionRecovery(() => supabase.from('clients').insert({ user_id: user.id, display_name: name, reference: email || null, current_focus: note || '' }).select(clientSelect).single())
  if (error) throw new Error(error.message || 'Failed to create client')
  return { ...data, name: data.display_name, note: data.current_focus }
}
