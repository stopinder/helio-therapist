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
