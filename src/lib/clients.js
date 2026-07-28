import { supabase } from './supabase.js'

export async function getClient({ clientId }) {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (error) {
    throw new Error(error.message || 'Client not found')
  }

  return {
    ...data,
    name: data.display_name,
    note: data.current_focus
  }
}

export async function listClients() {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .neq('status', 'archived')
    .order('display_name', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to load clients')
  }

  return (data || []).map(client => ({
    ...client,
    name: client.display_name
  }))
}
