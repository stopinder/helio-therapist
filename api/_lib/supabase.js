import { createClient } from '@supabase/supabase-js';

function configuredSupabaseUrl() {
  return (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
}

function configuredAnonKey() {
  return (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
}

function getSupabaseHost() {
  try {
    return new URL(configuredSupabaseUrl()).host || 'missing';
  } catch {
    return 'invalid';
  }
}

function warnOnProjectDrift() {
  const browserUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  const serverUrl = (process.env.SUPABASE_URL || '').trim();
  if (!browserUrl || !serverUrl || browserUrl === serverUrl) return;
  let browserHost = 'invalid';
  let serverHost = 'invalid';
  try { browserHost = new URL(browserUrl).host; } catch {}
  try { serverHost = new URL(serverUrl).host; } catch {}
  console.warn('[Supabase Config] Browser/server project mismatch detected; using VITE_SUPABASE_URL as canonical project.', { browserHost, serverHost });
}

/**
 * Creates a privileged Supabase client. The browser-facing project URL is canonical
 * so server functions validate and store data in the same project the user signed into.
 */
export function getSupabaseClient() {
  warnOnProjectDrift();
  const supabaseUrl = configuredSupabaseUrl();
  const supabaseServiceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('VITE_SUPABASE_URL/SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    const error = new Error(`Supabase configuration missing: ${missing.join(', ')}`);
    error.status = 500;
    error.code = 'SUPABASE_CONFIG_MISSING';
    throw error;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/** Creates a Supabase client authenticated with the user's token so RLS is applied. */
export function getSupabaseUserClient(req) {
  warnOnProjectDrift();
  const supabaseUrl = configuredSupabaseUrl();
  const supabaseAnonKey = configuredAnonKey();
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error('Supabase configuration missing');
    error.status = 500;
    throw error;
  }

  const options = token
    ? { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }
    : { auth: { persistSession: false, autoRefreshToken: false } };

  return createClient(supabaseUrl, supabaseAnonKey, options);
}

export async function requireAuthenticatedUser(req) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const error = new Error('Authentication required');
    error.status = 401;
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser(match[1]);

  if (error || !data?.user) {
    console.error('[Supabase Server Auth]', {
      host: getSupabaseHost(),
      status: error?.status || null,
      code: error?.code || null,
      message: error?.message || 'No user returned'
    });
    const authError = new Error('Session is invalid or expired');
    authError.status = 401;
    authError.code = 'AUTH_INVALID';
    throw authError;
  }

  return { supabase, user: data.user };
}
