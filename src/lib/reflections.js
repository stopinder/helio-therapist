// We use a dynamic import to avoid top-level side effects during testing.
let supabase;

async function getClient(supabaseClient) {
  if (!supabaseClient && !supabase) {
    const module = await import('./supabase.js');
    supabase = module.supabase;
  }
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');
  return client;
}

async function getAuthenticatedUser(client) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Not authenticated');
  return user;
}

export async function createSupervisionReflection({ supabaseClient, clientId, sessionId, body, supervisionQuestion, theme = '', urgency = 'normal' }) {
  const client = await getClient(supabaseClient);
  const user = await getAuthenticatedUser(client);
  const { data, error } = await client.from('private_reflections').insert({
    user_id: user.id, client_id: clientId, session_ref: sessionId, body,
    supervision_question: supervisionQuestion, theme, urgency, included_in_supervision: true
  }).select().single();
  if (error) throw new Error(error.message || 'Could not create supervision reflection');
  return data;
}

export async function getPrivateReflection({ supabaseClient, clientId, sessionId }) {
  const client = await getClient(supabaseClient);
  const user = await getAuthenticatedUser(client);
  const { data, error } = await client.from('private_reflections').select('*')
    .eq('user_id', user.id).eq('client_id', clientId).eq('session_ref', sessionId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message || 'Could not fetch private reflection');
  return data;
}

export async function getPrivateReflectionsForClient({ supabaseClient, clientId }) {
  const client = await getClient(supabaseClient);
  const user = await getAuthenticatedUser(client);
  const { data, error } = await client.from('private_reflections')
    .select('id,client_id,session_ref,body,theme,created_at,updated_at,included_in_supervision')
    .eq('user_id', user.id).eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Could not fetch client reflections');
  return data || [];
}

export async function upsertPrivateReflection({ supabaseClient, clientId, sessionId, body }) {
  const client = await getClient(supabaseClient);
  const user = await getAuthenticatedUser(client);
  const existing = await getPrivateReflection({ supabaseClient: client, clientId, sessionId });
  if (existing) {
    const { data, error } = await client.from('private_reflections')
      .update({ body, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('user_id', user.id).select().single();
    if (error) throw new Error(error.message || 'Could not update private reflection');
    return data;
  }
  const { data, error } = await client.from('private_reflections')
    .insert({ user_id: user.id, client_id: clientId, session_ref: sessionId, body }).select().single();
  if (error) throw new Error(error.message || 'Could not create private reflection');
  return data;
}

export async function getAllPrivateReflections({ supabaseClient, offset = 0, limit = 20 }) {
  const client = await getClient(supabaseClient);
  const user = await getAuthenticatedUser(client);
  const { data, error } = await client.from('private_reflections').select(`*, clients ( id, display_name )`)
    .eq('user_id', user.id).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw new Error('Could not fetch reflections');
  return data;
}

export async function setReflectionSupervisionSelection({ supabaseClient, reflectionId, included }) {
  const client = await getClient(supabaseClient);
  const user = await getAuthenticatedUser(client);
  const { data, error } = await client.from('private_reflections').update({ included_in_supervision: included })
    .eq('id', reflectionId).eq('user_id', user.id).select().single();
  if (error) throw new Error('Could not update supervision selection');
  return data;
}
