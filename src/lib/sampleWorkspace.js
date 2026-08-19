import { supabase } from './supabase.js'
import { withSessionRecovery } from './api.js'

export async function createSampleWorkspace() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await withSessionRecovery(() => supabase.rpc('create_sample_workspace'))
  if (error) throw new Error(error.message || 'Could not create the sample workspace.')
  return data
}

export function isSampleClient(client) {
  return typeof client?.reference === 'string' && client.reference.startsWith('SAMPLE-')
}

export async function deleteSampleClient(clientId) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await withSessionRecovery(() => supabase.rpc('delete_sample_client', { p_client_id: clientId }))
  if (error) throw new Error(error.message || 'Could not remove this sample client.')
}
