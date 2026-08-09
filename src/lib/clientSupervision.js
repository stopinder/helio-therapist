import { supabase } from './supabase.js';

export async function getPrivateReflectionsForClient({ supabaseClient, clientId }) {
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');

  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('private_reflections')
    .select('id,client_id,session_ref,body,theme,created_at,updated_at,included_in_supervision')
    .eq('user_id', user.id)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ClientSupervision] Fetch reflections error:', error);
    throw new Error(error.message || 'Could not fetch client reflections');
  }

  return data || [];
}
