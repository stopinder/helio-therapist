let supabase;

const SESSION_REFLECTION_SCHEMA = 'helio.session-reflection.v1';
const SESSION_REFLECTION_FIELDS = [
  'stoodOut',
  'emotionalResponse',
  'countertransference',
  'uncertainties',
  'supervisionQuestions',
  'nextSession'
];

async function getClient(supabaseClient) {
  if (!supabaseClient && !supabase) {
    const module = await import('./supabase.js');
    supabase = module.supabase;
  }
  const client = supabaseClient || supabase;
  if (!client) throw new Error('Supabase client not initialized');
  return client;
}

async function getUser(client) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

export function emptySessionReflection() {
  return Object.fromEntries(SESSION_REFLECTION_FIELDS.map(field => [field, '']));
}

export function encodeSessionReflection(reflection = {}) {
  const fields = emptySessionReflection();
  for (const field of SESSION_REFLECTION_FIELDS) fields[field] = String(reflection[field] || '').trim();
  return JSON.stringify({ schema: SESSION_REFLECTION_SCHEMA, fields });
}

export function decodeSessionReflection(body = '') {
  if (!body) return emptySessionReflection();
  try {
    const parsed = JSON.parse(body);
    if (parsed?.schema !== SESSION_REFLECTION_SCHEMA || !parsed?.fields) {
      return { ...emptySessionReflection(), stoodOut: String(body) };
    }
    const fields = emptySessionReflection();
    for (const field of SESSION_REFLECTION_FIELDS) fields[field] = String(parsed.fields[field] || '');
    return fields;
  } catch {
    return { ...emptySessionReflection(), stoodOut: String(body) };
  }
}

export async function createSupervisionReflection({
  supabaseClient,
  clientId,
  sessionId,
  body,
  supervisionQuestion,
  theme = '',
  urgency = 'normal'
}) {
  const client = await getClient(supabaseClient);
  const user = await getUser(client);

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

export async function getPrivateReflection({ supabaseClient, clientId, sessionId }) {
  const client = await getClient(supabaseClient);
  const user = await getUser(client);

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
  body,
  reflection,
  supervisionQuestion
}) {
  const client = await getClient(supabaseClient);
  const user = await getUser(client);
  const existing = await getPrivateReflection({ supabaseClient: client, clientId, sessionId });
  const persistedBody = reflection ? encodeSessionReflection(reflection) : String(body || '');
  const persistedQuestion = supervisionQuestion !== undefined
    ? supervisionQuestion
    : reflection?.supervisionQuestions;

  if (existing) {
    const update = { body: persistedBody, updated_at: new Date().toISOString() };
    if (persistedQuestion !== undefined) update.supervision_question = persistedQuestion || null;
    const { data, error } = await client
      .from('private_reflections')
      .update(update)
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (error) {
      console.error('[Reflections] Update error:', error);
      throw new Error(error.message || 'Could not update private reflection');
    }
    return data;
  }

  const { data, error } = await client
    .from('private_reflections')
    .insert({
      user_id: user.id,
      client_id: clientId,
      session_ref: sessionId,
      body: persistedBody,
      supervision_question: persistedQuestion || null,
      included_in_supervision: false
    })
    .select()
    .single();
  if (error) {
    console.error('[Reflections] Insert error:', error);
    throw new Error(error.message || 'Could not create private reflection');
  }
  return data;
}

export async function getAllPrivateReflections({ supabaseClient, offset = 0, limit = 20 }) {
  const client = await getClient(supabaseClient);
  const user = await getUser(client);
  const { data, error } = await client
    .from('private_reflections')
    .select(`*, clients ( id, display_name )`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    console.error('[Reflections] Fetch all error:', error);
    throw new Error('Could not fetch reflections');
  }
  return data;
}

export async function setReflectionSupervisionSelection({ supabaseClient, reflectionId, included }) {
  const client = await getClient(supabaseClient);
  const user = await getUser(client);
  const { data, error } = await client
    .from('private_reflections')
    .update({ included_in_supervision: included })
    .eq('id', reflectionId)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) {
    console.error('[Reflections] Selection update error:', error);
    throw new Error('Could not update supervision selection');
  }
  return data;
}
