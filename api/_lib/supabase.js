import { createClient } from '@supabase/supabase-js';

/**
 * Creates and returns a Supabase client using environment variables.
 * Throws an error if required variables are missing.
 */
export function getSupabaseClient() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServiceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    ''
  ).trim();

  // Diagnostics
  console.log(`[Supabase Diagnostics]
    SUPABASE_URL exists: ${!!supabaseUrl} (length: ${supabaseUrl.length})
    SUPABASE_SERVICE_ROLE_KEY exists: ${!!supabaseServiceKey} (length: ${supabaseServiceKey.length})
    VERCEL_ENV: ${process.env.VERCEL_ENV || 'not set'}
    VERCEL_GIT_COMMIT_SHA: ${process.env.VERCEL_GIT_COMMIT_SHA || 'not set'}
  `.trim());

  if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    
    const error = new Error(`Supabase configuration missing: ${missing.join(', ')}`);
    error.status = 500;
    error.code = 'SUPABASE_CONFIG_MISSING';
    throw error;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
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
    const authError = new Error('Session is invalid or expired');
    authError.status = 401;
    authError.code = 'AUTH_INVALID';
    throw authError;
  }

  return { supabase, user: data.user };
}
