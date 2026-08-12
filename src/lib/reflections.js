// We use a dynamic import or require-style check to avoid top-level side effects during testing
// if supabase is not initialized.
let supabase;

const EMPTY_WORKSPACE_REFLECTION = Object.freeze({
  stoodOut: '',
  emotionalResponse: '',
  countertransference: '',
  uncertainties: '',
  supervisionQuestions: '',
  nextSession: ''
});

async function getClient(supabaseClient) {
  if (!supabaseClient && !supabase) {
    const module = await import('./supabase.js');
    supabase = module.supabase;
  }
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');
  return client;
}

export function emptyWorkspaceReflection() {
  return { ...EMPTY_WORKSPACE_REFLECTION };
}

export function normalizeWorkspaceReflection(content) {
  const source = content && typeof content === 'object' && !Array.isArray(content) ? content : {};
  return Object.fromEntries(
    Object.keys(EMPTY_WORKSPACE_REFLECTION).map(key => [key, typeof source[key] === 'string' ? source[key] : ''])
  );
}

export function workspaceReflectionBody(content) {
  const reflection = normalizeWorkspaceReflection(content);
  return Object.values(reflection).map(value => value.trim()).filter(Boolean).join('\n\n');
}

export async function createSupervisionReflection({ supabaseClient, clientId, sessionId, body, supervisionQuestion, theme = '', urgency = 'normal' }) {
  const client = await getClient(supabaseClient);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await client.from('private_reflections').insert({ user_id: user.id, client_id: clientId, session_ref: sessionId, body, supervision_question: supervisionQuestion, theme, urgency, included_in_supervision: true }).select().single();
  if (error) { console.error('[Reflections] Create error:', error); throw new Error(error.message || 'Could not create supervision reflection'); }
  return data;
}

export async function getPrivateReflection({ supabaseClient, clientId, sessionId }) {
  const client = await getClient(supabaseClient);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await client.from('private_reflections').select('*').eq('user_id', user.id).eq('client_id', clientId).eq('session_ref', sessionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) { console.error('[Reflections] Fetch error:', error); throw new Error(error.message || 'Could not fetch private reflection'); }
  return data;
}

export async function upsertPrivateReflection({ supabaseClient, clientId, sessionId, body, workspaceContent }) {
  const client = await getClient(supabaseClient);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const existing = await getPrivateReflection({ supabaseClient: client, clientId, sessionId });
  const normalizedWorkspaceContent = workspaceContent === undefined ? undefined : normalizeWorkspaceReflection(workspaceContent);
  if (existing) {
    const updates = { body, updated_at: new Date().toISOString() };
    if (normalizedWorkspaceContent !== undefined) updates.workspace_content = normalizedWorkspaceContent;
    const { data, error } = await client.from('private_reflections').update(updates).eq('id', existing.id).eq('user_id', user.id).select().single();
    if (error) { console.error('[Reflections] Update error:', error); throw new Error(error.message || 'Could not update private reflection'); }
    return data;
  }
  const insert = { user_id: user.id, client_id: clientId, session_ref: sessionId, body };
  if (normalizedWorkspaceContent !== undefined) insert.workspace_content = normalizedWorkspaceContent;
  const { data, error } = await client.from('private_reflections').insert(insert).select().single();
  if (error) { console.error('[Reflections] Insert error:', error); throw new Error(error.message || 'Could not create private reflection'); }
  return data;
}

export async function getAllPrivateReflections({ supabaseClient, offset = 0, limit = 20 }) {
  const client = await getClient(supabaseClient);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await client.from('private_reflections').select(`*, clients ( id, display_name )`).eq('user_id', user.id).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error('[Reflections] Fetch all error:', error); throw new Error('Could not fetch reflections'); }
  return data;
}

export async function setReflectionSupervisionSelection({ supabaseClient, reflectionId, included }) {
  const client = await getClient(supabaseClient);
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await client.from('private_reflections').update({ included_in_supervision: included }).eq('id', reflectionId).eq('user_id', user.id).select().single();
  if (error) { console.error('[Reflections] Selection update error:', error); throw new Error('Could not update supervision selection'); }
  return data;
}
