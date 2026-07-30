// We use a dynamic import or require-style check to avoid top-level side effects during testing
// if supabase is not initialized.
let supabase;

export async function createSupervisionReflection({
  supabaseClient,
  clientId,
  sessionId,
  body,
  supervisionQuestion,
  theme = '',
  urgency = 'normal'
}) {
  if (!supabaseClient && !supabase) {
    const module = await import('./supabase.js');
    supabase = module.supabase;
  }
  
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');

  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('private_reflections')
    .insert({
      user_id: user.id,
      client_id: clientId,
      session_ref: sessionId,
      body,
      supervision_question: supervisionQuestion,
      theme,
      urgency,
      included_in_supervision: true
    })
    .select()
    .single();

  if (error) {
    console.error('[Reflections] Create error:', error);
    throw new Error(error.message || 'Could not create supervision reflection');
  }

  return data;
}

export async function getPrivateReflection({
  supabaseClient,
  clientId,
  sessionId
}) {
  if (!supabaseClient && !supabase) {
    const module = await import('./supabase.js');
    supabase = module.supabase;
  }
  
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');

  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('private_reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('client_id', clientId)
    .eq('session_ref', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Reflections] Fetch error:', error);
    throw new Error(error.message || 'Could not fetch private reflection');
  }

  return data;
}

export async function upsertPrivateReflection({
  supabaseClient,
  clientId,
  sessionId,
  body
}) {
  if (!supabaseClient && !supabase) {
    const module = await import('./supabase.js');
    supabase = module.supabase;
  }
  
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');

  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try to find existing record for this session
  const existing = await getPrivateReflection({ supabaseClient, clientId, sessionId });

  if (existing) {
    const { data, error } = await client
      .from('private_reflections')
      .update({ body, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[Reflections] Update error:', error);
      throw new Error(error.message || 'Could not update private reflection');
    }
    return data;
  } else {
    const { data, error } = await client
      .from('private_reflections')
      .insert({
        user_id: user.id,
        client_id: clientId,
        session_ref: sessionId,
        body
      })
      .select()
      .single();

    if (error) {
      console.error('[Reflections] Insert error:', error);
      throw new Error(error.message || 'Could not create private reflection');
    }
    return data;
  }
}

export async function getAllPrivateReflections({
  supabaseClient
}) {
  if (!supabaseClient && !supabase) {
    const module = await import('./supabase.js');
    supabase = module.supabase;
  }
  
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');

  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await client
    .from('private_reflections')
    .select(`
      *,
      clients (
        id,
        full_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Reflections] Fetch all error:', error);
    throw new Error(error.message || 'Could not fetch all reflections');
  }

  return data;
}
